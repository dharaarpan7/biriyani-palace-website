import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { render, screen, act, cleanup } from '@testing-library/react'

// jsdom has no media implementation — the stage and manager call pause().
beforeAll(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
})

type ScrollTriggerConfig = {
  onUpdate: (self: { progress: number }) => void
  anticipatePin?: number
  invalidateOnRefresh?: boolean
  [key: string]: unknown
}

const createdTriggers: { config: ScrollTriggerConfig; kill: ReturnType<typeof vi.fn> }[] = []
const scrollTriggerRefresh = vi.fn()
const scrollTriggerConfig = vi.fn()

vi.mock('../../lib/scrollController', () => ({
  createSmoothScroll: vi.fn(),
  ScrollTrigger: {
    create: (config: ScrollTriggerConfig) => {
      const kill = vi.fn()
      createdTriggers.push({ config, kill })
      return { kill }
    },
    refresh: (...args: unknown[]) => scrollTriggerRefresh(...args),
    config: (...args: unknown[]) => scrollTriggerConfig(...args),
  },
}))

import { CinematicStage } from './CinematicStage'
import { CHAPTERS } from '../../data/chapters'

// jsdom's <video> never loads media: hand the component the metadata it
// waits for by stubbing duration and firing loadedmetadata on each clip.
function loadAllClips(duration = 10): HTMLVideoElement[] {
  const videos = Array.from(
    document.querySelectorAll<HTMLVideoElement>('video.cinema__video'),
  )
  for (const video of videos) {
    Object.defineProperty(video, 'duration', { value: duration, configurable: true })
    act(() => {
      video.dispatchEvent(new Event('loadedmetadata'))
    })
  }
  return videos
}

function updateProgress(progress: number): void {
  const trigger = createdTriggers[createdTriggers.length - 1]
  expect(trigger, 'ScrollTrigger.create must have run').toBeTruthy()
  act(() => {
    trigger.config.onUpdate({ progress })
  })
}

describe('CinematicStage', () => {
  beforeEach(() => {
    createdTriggers.length = 0
    scrollTriggerRefresh.mockClear()
    scrollTriggerConfig.mockClear()
    cleanup()
  })

  it('renders five video layers that never autoplay', () => {
    render(<CinematicStage onReady={vi.fn()} />)
    const videos = document.querySelectorAll('video.cinema__video')
    expect(videos).toHaveLength(5)
    videos.forEach((v) => {
      // React renders `muted` as a DOM property, not an attribute
      expect((v as HTMLVideoElement).muted).toBe(true)
      expect(v).toHaveAttribute('playsinline')
      expect(v.getAttribute('autoplay')).toBe(null)
      expect(v.getAttribute('aria-hidden')).toBe('true')
    })
  })

  it('creates one pinned master ScrollTrigger for the film', () => {
    render(<CinematicStage onReady={vi.fn()} />)
    expect(createdTriggers).toHaveLength(1)
  })

  it('signals onReady once every clip reports its metadata', () => {
    const onReady = vi.fn()
    render(<CinematicStage onReady={onReady} />)
    expect(onReady).not.toHaveBeenCalled()

    loadAllClips()
    expect(onReady).toHaveBeenCalledTimes(1)
  })

  it('does not re-signal onReady when the parent re-renders', () => {
    const onReady = vi.fn()
    const { rerender } = render(<CinematicStage onReady={onReady} />)
    loadAllClips()
    rerender(<CinematicStage onReady={vi.fn()} />)
    expect(onReady).toHaveBeenCalledTimes(1)
  })

  it('shows the hero while the film sits at progress 0', () => {
    render(<CinematicStage onReady={vi.fn()} />)
    loadAllClips()
    updateProgress(0)

    expect(screen.getByRole('heading', { name: 'BIRYANI PALACE' })).toBeInTheDocument()
    expect(screen.getByText('The art of waiting.')).toBeInTheDocument()
    // the first clip is the visible layer before any scroll
    const videos = Array.from(
    document.querySelectorAll<HTMLVideoElement>('video.cinema__video'),
  )
    expect(videos[0]).toHaveClass('is-active')
  })

  it('scrubs the active clip to the scroll position without ever playing', () => {
    render(<CinematicStage onReady={vi.fn()} />)
    const videos = loadAllClips()
    // equal 10s clips -> clip n owns [n/5, (n+1)/5); p=0.5 -> clip 2, local 5s
    updateProgress(0.5)

    expect(videos[2].currentTime).toBeCloseTo(5, 1)
    videos.forEach((v) => expect((v as HTMLVideoElement & { paused: boolean }).paused).toBe(true))
  })

  it('swaps the visible layer and chapter copy on chapter change', () => {
    render(<CinematicStage onReady={vi.fn()} />)
    loadAllClips()
    updateProgress(0.5)

    const videos = Array.from(
    document.querySelectorAll<HTMLVideoElement>('video.cinema__video'),
  )
    expect(videos[2]).toHaveClass('is-active')

    const chapter = CHAPTERS[2]
    expect(screen.getByText(`${chapter.numeral} — ${chapter.name}`)).toBeInTheDocument()
    expect(screen.getByText(chapter.headline)).toBeInTheDocument()
  })

  it('paints label opacity by distance from the current position', () => {
    render(<CinematicStage onReady={vi.fn()} />)
    loadAllClips()
    // chapter 2 (THE CRAFT) owns [0.4, 0.6); p=0.5 -> local 0.5
    updateProgress(0.5)

    // label at 0.4 sits at local distance 0.1 -> visible; at 0.2 -> hidden
    const near = screen.getByText('AGED SPICES').closest('.cinema__label') as HTMLElement
    const far = screen.getByText('LONG-GRAIN BASMATI').closest('.cinema__label') as HTMLElement
    expect(near.style.visibility).toBe('visible')
    expect(Number(near.style.opacity)).toBeGreaterThan(0)
    expect(far.style.visibility).toBe('hidden')
  })

  it('fills the master progress bar proportionally', () => {
    render(<CinematicStage onReady={vi.fn()} />)
    loadAllClips()
    updateProgress(0.25)

    const fill = document.querySelector('.cinema__progress-fill') as HTMLElement
    // scaleX runs on the compositor; writing style.width would force the
    // browser to re-lay-out the page on every single scroll frame.
    expect(fill.style.transform).toBe('scaleX(0.25)')
    expect(fill.style.width).toBe('')
  })

  it('reaches the final chapter at the end of the film', () => {
    render(<CinematicStage onReady={vi.fn()} />)
    loadAllClips()
    updateProgress(1)

    const last = CHAPTERS[CHAPTERS.length - 1]
    expect(screen.getByText(`${last.numeral} — ${last.name}`)).toBeInTheDocument()
    expect(screen.getByText(last.headline)).toBeInTheDocument()
  })

  it('marks the active chapter in the indicator', () => {
    render(<CinematicStage onReady={vi.fn()} />)
    loadAllClips()
    updateProgress(0.3) // chapter 1 (THE REVEAL)

    const activeItem = document.querySelector('.chapter-indicator__item.is-active')
    expect(activeItem).not.toBeNull()
    expect(activeItem?.textContent).toContain(CHAPTERS[1].name)
  })

  it('kills its ScrollTrigger on unmount', () => {
    const { unmount } = render(<CinematicStage onReady={vi.fn()} />)
    const trigger = createdTriggers[0]
    unmount()
    expect(trigger.kill).toHaveBeenCalled()
  })
})

describe('pinning stability', () => {
  // A pinned section that measures itself late, or re-measures on every mobile
  // toolbar resize, jumps under the visitor. These settings are what stop the
  // stage from lurching at the moment the pin engages.
  beforeEach(() => {
    createdTriggers.length = 0
    scrollTriggerRefresh.mockClear()
    scrollTriggerConfig.mockClear()
    cleanup()
  })

  it('anticipates the pin so the stage does not lurch when it engages', () => {
    render(<CinematicStage onReady={vi.fn()} />)
    expect(createdTriggers[0].config.anticipatePin).toBe(1)
  })

  it('recalculates its own end distance whenever ScrollTrigger refreshes', () => {
    render(<CinematicStage onReady={vi.fn()} />)
    expect(createdTriggers[0].config.invalidateOnRefresh).toBe(true)
  })

  it('ignores mobile toolbar resizes instead of re-pinning mid-scroll', () => {
    render(<CinematicStage onReady={vi.fn()} />)
    expect(scrollTriggerConfig).toHaveBeenCalledWith(
      expect.objectContaining({ ignoreMobileResize: true }),
    )
  })

  it('refreshes measurements once the clip durations are known', () => {
    render(<CinematicStage onReady={vi.fn()} />)
    const before = scrollTriggerRefresh.mock.calls.length
    loadAllClips()
    // the scroll distance depends on the timeline, which only exists after
    // every clip has reported its duration
    expect(scrollTriggerRefresh.mock.calls.length).toBeGreaterThan(before)
  })
})

/** Replaces currentTime with a counting accessor so seeks can be counted. */
function countSeeks(video: HTMLVideoElement): { count: number; value: number } {
  const box = { count: 0, value: video.currentTime || 0 }
  Object.defineProperty(video, 'currentTime', {
    configurable: true,
    get: () => box.value,
    set: (next: number) => {
      box.count += 1
      box.value = next
    },
  })
  return box
}

describe('frame-accurate scrubbing', () => {
  // Five 10s clips in the test fixture -> each owns 0.2 of progress, and one
  // unit of progress is 50s of film. Clip 4 (index 3) runs at 24fps, the rest
  // at 25fps, exactly as the real film does.
  beforeEach(() => {
    createdTriggers.length = 0
    scrollTriggerRefresh.mockClear()
    scrollTriggerConfig.mockClear()
    cleanup()
  })

  it('lands the scrub on a real frame instead of an arbitrary timestamp', () => {
    render(<CinematicStage onReady={vi.fn()} />)
    const videos = loadAllClips()
    // local 5.037s inside clip 3 sits within frame 125, which starts at 5.00s
    updateProgress(0.4 + 5.037 / 50)
    expect(videos[2].currentTime).toBeCloseTo(5, 10)
  })

  it('asks the decoder once for two positions inside the same frame', () => {
    render(<CinematicStage onReady={vi.fn()} />)
    const videos = loadAllClips()
    const seeks = countSeeks(videos[2])

    updateProgress(0.4 + 5.002 / 50)
    expect(seeks.count).toBe(1)

    // 35ms later in the film — past the old 1/30s throttle, but still the
    // same picture, so there is nothing new to decode
    updateProgress(0.4 + 5.037 / 50)
    expect(seeks.count).toBe(1)
    expect(seeks.value).toBeCloseTo(5, 10)
  })

  it('seeks again as soon as the film moves to the next frame', () => {
    render(<CinematicStage onReady={vi.fn()} />)
    const videos = loadAllClips()
    const seeks = countSeeks(videos[2])

    updateProgress(0.4 + 5.0 / 50)
    updateProgress(0.4 + 5.04 / 50)
    expect(seeks.count).toBe(2)
    expect(seeks.value).toBeCloseTo(5.04, 10)
  })

  it('uses each clip own frame rate, not one rate for the whole film', () => {
    render(<CinematicStage onReady={vi.fn()} />)
    const videos = loadAllClips()
    // clip 4 (index 3) is 24fps: local 5.05s is frame 121, starting at 121/24
    updateProgress(0.6 + 5.05 / 50)
    expect(videos[3].currentTime).toBeCloseTo(121 / 24, 10)
    expect(videos[3].currentTime).not.toBeCloseTo(5.04, 10)
  })
})

describe('scrub instrumentation', () => {
  // The metrics recorder exists to answer "is it ACTUALLY smooth?" with
  // numbers from a real browser. The stage arms it only when the visitor
  // asks for it via ?scrub-debug, so production windows stay clean.
  type ScrubDebugWindow = Window & { __scrubMetrics?: { snapshot: () => { seeks: number } } }

  beforeEach(() => {
    createdTriggers.length = 0
    scrollTriggerRefresh.mockClear()
    scrollTriggerConfig.mockClear()
    cleanup()
    delete (window as ScrubDebugWindow).__scrubMetrics
    window.history.replaceState(null, '', '/')
  })

  afterEach(() => {
    delete (window as ScrubDebugWindow).__scrubMetrics
    window.history.replaceState(null, '', '/')
  })

  it('exposes live scrub numbers on window when ?scrub-debug is set', () => {
    window.history.replaceState(null, '', '?scrub-debug')
    render(<CinematicStage onReady={vi.fn()} />)
    loadAllClips()
    updateProgress(0.5)

    const metrics = (window as ScrubDebugWindow).__scrubMetrics
    expect(metrics, 'window.__scrubMetrics must be armed').toBeTruthy()
    // the scroll above handed one seek to the decoder — the recorder saw it
    expect(metrics!.snapshot().seeks).toBeGreaterThan(0)
  })

  it('leaves window clean without the debug flag', () => {
    render(<CinematicStage onReady={vi.fn()} />)
    loadAllClips()
    updateProgress(0.5)

    expect((window as ScrubDebugWindow).__scrubMetrics).toBeUndefined()
  })

  it('withdraws the handle on unmount', () => {
    window.history.replaceState(null, '', '?scrub-debug')
    const { unmount } = render(<CinematicStage onReady={vi.fn()} />)
    loadAllClips()
    unmount()

    expect((window as ScrubDebugWindow).__scrubMetrics).toBeUndefined()
  })
})

describe('boundary crossings', () => {
  beforeEach(() => {
    createdTriggers.length = 0
    scrollTriggerRefresh.mockClear()
    scrollTriggerConfig.mockClear()
    cleanup()
  })

  it('primes the next clip to its first frame before the crossing', () => {
    render(<CinematicStage onReady={vi.fn()} />)
    const videos = loadAllClips()
    updateProgress(0.5)
    videos[3].currentTime = 7 // left over from an earlier pass through the film

    updateProgress(0.59) // 95% through chapter 3 — the crossing is imminent
    expect(videos[3].currentTime).toBe(0)
  })

  it('does not disturb the next clip in the middle of a chapter', () => {
    render(<CinematicStage onReady={vi.fn()} />)
    const videos = loadAllClips()
    updateProgress(0.5)
    videos[3].currentTime = 7

    updateProgress(0.55) // only 75% through — nothing to prepare yet
    expect(videos[3].currentTime).toBe(7)
  })

  it('shows the seeked clip in the same frame, without waiting for React', () => {
    // React state lands on a later tick. If the visible layer depended on it,
    // a fast scroll would show the OLD clip holding a stale frame while the
    // new one is already being scrubbed underneath.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      render(<CinematicStage onReady={vi.fn()} />)
      const videos = loadAllClips()
      const trigger = createdTriggers[createdTriggers.length - 1]

      trigger.config.onUpdate({ progress: 0.5 }) // deliberately NOT inside act()

      expect(videos[2].classList.contains('is-active')).toBe(true)
      expect(videos[0].classList.contains('is-active')).toBe(false)
    } finally {
      consoleError.mockRestore()
    }
  })
})
