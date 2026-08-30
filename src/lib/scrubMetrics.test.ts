import { describe, it, expect } from 'vitest'
import { createScrubMetrics } from './scrubMetrics'

/** Injectable clock so every timing assertion is exact, never wall-clock flaky. */
function fakeClock(start = 1_000) {
  let t = start
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms
    },
  }
}

describe('createScrubMetrics', () => {
  it('starts empty so a snapshot before any scrolling reports nothing', () => {
    const clock = fakeClock()
    const m = createScrubMetrics({ now: clock.now })
    const s = m.snapshot()
    expect(s.seeks).toBe(0)
    expect(s.presented).toBe(0)
    expect(s.superseded).toBe(0)
    expect(s.stalls).toBe(0)
    expect(s.longestGapMs).toBe(0)
  })

  it('counts every seek the scrub asks the decoder for', () => {
    const m = createScrubMetrics({ now: fakeClock().now })
    m.seekRequested()
    m.seekRequested()
    m.seekRequested()
    expect(m.snapshot().seeks).toBe(3)
  })

  it('counts superseded targets separately from seeks that reached the decoder', () => {
    // A target replaced while the gate was held never cost a decode. Counting
    // it as a seek would make the decoder look slower than it is.
    const m = createScrubMetrics({ now: fakeClock().now })
    m.seekRequested()
    m.seekSuperseded()
    m.seekSuperseded()
    const s = m.snapshot()
    expect(s.seeks).toBe(1)
    expect(s.superseded).toBe(2)
  })

  it('counts frames the browser actually put on screen', () => {
    const m = createScrubMetrics({ now: fakeClock().now })
    m.framePresented()
    m.framePresented()
    expect(m.snapshot().presented).toBe(2)
  })

  it('records no gap for the first frame — there is nothing to measure from', () => {
    const clock = fakeClock()
    const m = createScrubMetrics({ now: clock.now })
    clock.advance(500)
    m.framePresented()
    const s = m.snapshot()
    expect(s.presented).toBe(1)
    expect(s.longestGapMs).toBe(0)
  })

  it('reports the longest interval between two presented frames', () => {
    const clock = fakeClock()
    const m = createScrubMetrics({ now: clock.now })
    m.framePresented()
    clock.advance(16)
    m.framePresented()
    clock.advance(180) // the visible hitch
    m.framePresented()
    clock.advance(16)
    m.framePresented()
    expect(m.snapshot().longestGapMs).toBe(180)
  })

  it('counts a gap over the stall threshold as a stall', () => {
    const clock = fakeClock()
    const m = createScrubMetrics({ now: clock.now, stallThresholdMs: 100 })
    m.framePresented()
    clock.advance(50) // fine
    m.framePresented()
    clock.advance(140) // stall
    m.framePresented()
    clock.advance(250) // stall
    m.framePresented()
    expect(m.snapshot().stalls).toBe(2)
  })

  it('treats a gap exactly on the threshold as acceptable, not a stall', () => {
    const clock = fakeClock()
    const m = createScrubMetrics({ now: clock.now, stallThresholdMs: 100 })
    m.framePresented()
    clock.advance(100)
    m.framePresented()
    expect(m.snapshot().stalls).toBe(0)
  })

  it('reports median and 95th-percentile gaps, which is what smoothness feels like', () => {
    const clock = fakeClock()
    const m = createScrubMetrics({ now: clock.now })
    m.framePresented()
    for (const gap of [10, 20, 30, 40, 50, 60, 70, 80, 90, 200]) {
      clock.advance(gap)
      m.framePresented()
    }
    const s = m.snapshot()
    expect(s.medianGapMs).toBe(50)
    expect(s.p95GapMs).toBe(200)
  })

  it('reports presented frames per second over the measured window', () => {
    const clock = fakeClock()
    const m = createScrubMetrics({ now: clock.now })
    for (let i = 0; i < 30; i++) {
      m.framePresented()
      clock.advance(50) // 20 frames per second
    }
    const s = m.snapshot()
    expect(s.elapsedMs).toBe(1500)
    expect(s.presentedPerSecond).toBeCloseTo(20, 5)
  })

  it('reports zero rate before any time has passed instead of dividing by zero', () => {
    const m = createScrubMetrics({ now: fakeClock().now })
    m.framePresented()
    const s = m.snapshot()
    expect(s.elapsedMs).toBe(0)
    expect(s.presentedPerSecond).toBe(0)
    expect(Number.isFinite(s.presentedPerSecond)).toBe(true)
  })

  it('keeps only the most recent gap samples so a long session cannot grow forever', () => {
    const clock = fakeClock()
    const m = createScrubMetrics({ now: clock.now, maxSamples: 3 })
    m.framePresented()
    for (const gap of [500, 10, 10, 10]) {
      clock.advance(gap)
      m.framePresented()
    }
    const s = m.snapshot()
    // The 500ms gap fell out of the window; the counters still remember it.
    expect(s.longestGapMs).toBe(10)
    expect(s.presented).toBe(5)
    expect(s.worstGapEverMs).toBe(500)
  })

  it('reset clears the counters and restarts the measurement window', () => {
    const clock = fakeClock()
    const m = createScrubMetrics({ now: clock.now })
    m.seekRequested()
    m.framePresented()
    clock.advance(400)
    m.framePresented()
    clock.advance(600)

    m.reset()
    const s = m.snapshot()
    expect(s.seeks).toBe(0)
    expect(s.presented).toBe(0)
    expect(s.longestGapMs).toBe(0)
    expect(s.worstGapEverMs).toBe(0)
    expect(s.elapsedMs).toBe(0)
  })

  it('rejects a stall threshold that is not a positive number', () => {
    expect(() => createScrubMetrics({ stallThresholdMs: 0 })).toThrow()
    expect(() => createScrubMetrics({ stallThresholdMs: -5 })).toThrow()
    expect(() => createScrubMetrics({ stallThresholdMs: Number.NaN })).toThrow()
  })

  it('rejects a sample window that cannot hold a sample', () => {
    expect(() => createScrubMetrics({ maxSamples: 0 })).toThrow()
    expect(() => createScrubMetrics({ maxSamples: 1.5 })).toThrow()
  })

  it('works with no options at all, using the real clock', () => {
    const m = createScrubMetrics()
    m.seekRequested()
    m.framePresented()
    const s = m.snapshot()
    expect(s.seeks).toBe(1)
    expect(s.presented).toBe(1)
    expect(s.elapsedMs).toBeGreaterThanOrEqual(0)
  })

  it('formats a one-line summary a human can read off the console', () => {
    const clock = fakeClock()
    const m = createScrubMetrics({ now: clock.now, stallThresholdMs: 100 })
    m.seekRequested()
    m.framePresented()
    clock.advance(120)
    m.framePresented()
    const line = m.format()
    expect(line).toContain('seeks=1')
    expect(line).toContain('presented=2')
    expect(line).toContain('stalls=1')
    expect(line).toContain('worst=120ms')
  })
})
