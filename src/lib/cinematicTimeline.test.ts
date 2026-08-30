import { describe, it, expect } from 'vitest'
import {
  buildTimeline,
  resolveProgress,
  activeChapterIndex,
  type TimelineSegment,
} from './cinematicTimeline'

// The five cinematic clips must behave as ONE master timeline.
// Scroll progress (0..1) maps onto a duration-weighted combined timeline.

describe('buildTimeline', () => {
  it('weights each clip segment by its real duration', () => {
    // 10s + 30s total 40s -> clip1 owns 25%, clip2 owns 75%
    const segments = buildTimeline([10, 30])
    expect(segments).toHaveLength(2)
    expect(segments[0].startProgress).toBe(0)
    expect(segments[0].endProgress).toBeCloseTo(0.25)
    expect(segments[1].startProgress).toBeCloseTo(0.25)
    expect(segments[1].endProgress).toBe(1)
  })

  it('gives equal-duration clips equal spans', () => {
    const segments = buildTimeline([5, 5, 5, 5, 5])
    segments.forEach((s, i) => {
      expect(s.startProgress).toBeCloseTo(i / 5)
      expect(s.endProgress).toBeCloseTo((i + 1) / 5)
    })
  })

  it('handles unequal durations across five clips (clip swap tolerance)', () => {
    const segments = buildTimeline([4, 7, 6, 5, 3])
    // total 25s: clip1 = 4/25 = 0.16, clip2 starts at 0.16 ends at 0.44
    expect(segments[1].startProgress).toBeCloseTo(0.16)
    expect(segments[1].endProgress).toBeCloseTo(0.44)
    expect(segments[4].endProgress).toBe(1)
  })

  it('throws on empty duration list', () => {
    expect(() => buildTimeline([])).toThrow()
  })

  it('throws on non-positive durations', () => {
    expect(() => buildTimeline([10, 0, 5])).toThrow()
    expect(() => buildTimeline([10, -1, 5])).toThrow()
  })

  it('throws on NaN durations', () => {
    expect(() => buildTimeline([10, NaN, 5])).toThrow()
  })

  it('resolveProgress rejects an empty timeline', () => {
    expect(() => resolveProgress([], 0.5)).toThrow('non-empty timeline')
  })

  it('activeChapterIndex rejects an empty timeline', () => {
    expect(() => activeChapterIndex([], 0.5)).toThrow('non-empty timeline')
  })

  it('holds the last chapter through the end of the film', () => {
    const segments = buildTimeline([5, 5, 5, 5, 5])
    expect(activeChapterIndex(segments, 1)).toBe(4)
    expect(activeChapterIndex(segments, 0.999)).toBe(4)
  })
})

describe('resolveProgress', () => {
  const segments: TimelineSegment[] = buildTimeline([10, 10, 10, 10, 10])

  it('maps progress 0 to the first frame of clip 1', () => {
    const pos = resolveProgress(segments, 0)
    expect(pos.clipIndex).toBe(0)
    expect(pos.localTime).toBe(0)
  })

  it('maps progress 1 to the final frame of the last clip', () => {
    const pos = resolveProgress(segments, 1)
    expect(pos.clipIndex).toBe(4)
    expect(pos.localTime).toBe(10)
  })

  it('maps mid-progress to the correct clip and proportional local time', () => {
    // 50% -> clip 3 (index 2) halfway
    const pos = resolveProgress(segments, 0.5)
    expect(pos.clipIndex).toBe(2)
    expect(pos.localTime).toBeCloseTo(5)
  })

  it('maps a quarter progress into clip 2 for unequal durations', () => {
    const unequal = buildTimeline([10, 30])
    // 25% is exactly the boundary; 30% is 5% into clip 2 (clip2 spans 0.25-1 over 30s)
    const pos = resolveProgress(unequal, 0.3)
    expect(pos.clipIndex).toBe(1)
    expect(pos.localTime).toBeCloseTo((0.3 - 0.25) * 40, 5)
  })

  it('at an exact clip boundary the next clip starts at its first frame', () => {
    const pos = resolveProgress(segments, 0.2)
    expect(pos.clipIndex).toBe(1)
    expect(pos.localTime).toBe(0)
  })

  it('works in reverse: progress just below a boundary is the end of the previous clip', () => {
    const pos = resolveProgress(segments, 0.2 - 1e-9)
    expect(pos.clipIndex).toBe(0)
    expect(pos.localTime).toBeCloseTo(10, 3)
  })

  it('clamps progress below 0 to the first frame', () => {
    const pos = resolveProgress(segments, -0.5)
    expect(pos.clipIndex).toBe(0)
    expect(pos.localTime).toBe(0)
  })

  it('clamps progress above 1 to the final frame', () => {
    const pos = resolveProgress(segments, 1.5)
    expect(pos.clipIndex).toBe(4)
    expect(pos.localTime).toBe(10)
  })
})

describe('frame-aligned scrubbing', () => {
  // Video is a grid of discrete frames. A 25fps clip changes picture every
  // 0.04s, so a seek to 5.037s and a seek to 5.00s show the SAME frame —
  // asking the decoder for both is work that cannot be seen. The timeline
  // therefore lands the scrub on a real frame and names which one it is.
  const segments = buildTimeline([10, 10], [25, 25])

  it('records each clip frame rate on its segment', () => {
    expect(segments[0].fps).toBe(25)
    expect(segments[1].fps).toBe(25)
  })

  it('reports the frame index the scrub lands on', () => {
    // clip 0 owns [0, 0.5) over 10s -> p=0.25 is local 5s -> frame 125
    const pos = resolveProgress(segments, 0.25)
    expect(pos.clipIndex).toBe(0)
    expect(pos.frame).toBe(125)
  })

  it('snaps local time down to the frame currently on screen', () => {
    // local 5.037s sits inside frame 125, which starts at 5.00s
    const pos = resolveProgress(segments, 5.037 / 20)
    expect(pos.frame).toBe(125)
    expect(pos.localTime).toBeCloseTo(5, 10)
  })

  it('collapses two positions inside the same frame onto one seek target', () => {
    const a = resolveProgress(segments, 5.01 / 20)
    const b = resolveProgress(segments, 5.03 / 20)
    expect(a.frame).toBe(b.frame)
    expect(a.localTime).toBe(b.localTime)
  })

  it('advances exactly one frame for a one-frame movement', () => {
    const a = resolveProgress(segments, 5.0 / 20)
    const b = resolveProgress(segments, 5.04 / 20)
    expect(b.frame).toBe((a.frame as number) + 1)
    expect(b.localTime - a.localTime).toBeCloseTo(0.04, 10)
  })

  it('never seeks past the start of the final frame', () => {
    // a 10s 25fps clip has frames 0..249; the last one starts at 9.96s
    const pos = resolveProgress(segments, 1)
    expect(pos.clipIndex).toBe(1)
    expect(pos.frame).toBe(249)
    expect(pos.localTime).toBeCloseTo(9.96, 10)
  })

  it('honours a different frame rate per clip', () => {
    // clip 4 of the real film runs at 24fps, not 25
    const mixed = buildTimeline([10, 10], [25, 24])
    const pos = resolveProgress(mixed, 1)
    expect(pos.frame).toBe(239)
    expect(pos.localTime).toBeCloseTo(239 / 24, 10)
  })

  it('leaves the scrub continuous when no frame rate is known', () => {
    const unaligned = buildTimeline([10, 10])
    const pos = resolveProgress(unaligned, 5.037 / 20)
    expect(pos.frame).toBeUndefined()
    expect(pos.localTime).toBeCloseTo(5.037, 10)
  })

  it('rejects a frame rate list that does not match the clips', () => {
    expect(() => buildTimeline([10, 10], [25])).toThrow()
  })

  it('rejects a non-positive or non-finite frame rate', () => {
    expect(() => buildTimeline([10, 10], [25, 0])).toThrow()
    expect(() => buildTimeline([10, 10], [25, NaN])).toThrow()
  })
})

describe('activeChapterIndex', () => {
  it('returns the chapter owning the current progress', () => {
    const segments = buildTimeline([10, 10, 10, 10, 10])
    expect(activeChapterIndex(segments, 0.05)).toBe(0)
    expect(activeChapterIndex(segments, 0.25)).toBe(1)
    expect(activeChapterIndex(segments, 0.5)).toBe(2)
    expect(activeChapterIndex(segments, 0.75)).toBe(3)
    expect(activeChapterIndex(segments, 0.95)).toBe(4)
  })
})
