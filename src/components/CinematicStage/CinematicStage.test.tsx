import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { render, screen, act, cleanup } from '@testing-library/react'

// jsdom has no media implementation — the stage and manager call pause().
beforeAll(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
})

type ScrollTriggerConfig = {
  onUpdate: (self: { progress: number }) => void
}

const createdTriggers: { config: ScrollTriggerConfig; kill: ReturnType<typeof vi.fn> }[] = []

vi.mock('../../lib/scrollController', () => ({
  createSmoothScroll: vi.fn(),
  ScrollTrigger: {
    create: (config: ScrollTriggerConfig) => {
      const kill = vi.fn()
      createdTriggers.push({ config, kill })
      return { kill }
    },
  },
}))

import { CinematicStage } from './CinematicStage'
import { CHAPTERS } from '../../data/chapters'

// jsdom's <video> never loads media: hand the component the metadata it
// waits for by stubbing duration and firing loadedmetadata on each clip.
function loadAllClips(duration = 10): HTMLVideoElement[] {
  const videos = Array.from(document.querySelectorAll('video.cinema__video'))
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
    const videos = Array.from(document.querySelectorAll('video.cinema__video'))
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

    const videos = Array.from(document.querySelectorAll('video.cinema__video'))
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
    expect(fill.style.width).toBe('25%')
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
