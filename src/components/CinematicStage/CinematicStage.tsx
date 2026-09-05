import { useEffect, useRef, useState } from 'react'
import { ScrollTrigger, createSmoothScroll } from '../../lib/scrollController'
import { buildTimeline, resolveProgress, activeChapterIndex, type TimelineSegment } from '../../lib/cinematicTimeline'
import { createVideoManager, type ManagedVideo, type VideoManager } from '../../lib/videoManager'
import { createVideoPreloadChain, type VideoPreloadChain } from '../../lib/videoPreloadChain'
import { createScrubMetrics, type ScrubMetrics } from '../../lib/scrubMetrics'
import { CHAPTERS, INTRO_LINES } from '../../data/chapters'
import { ChapterIndicator } from '../ChapterIndicator/ChapterIndicator'
import './CinematicStage.css'

const CLIPS = ['clip1.mp4', 'clip2.mp4', 'clip3.mp4', 'clip4.mp4', 'clip5.mp4']
/** Real frame rate of each clip — the scrub lands on this grid, nothing finer. */
const CLIP_FPS = [25, 25, 25, 24, 25]
/** How much scroll distance the whole film occupies (in viewport heights). */
const SCROLL_LENGTH_VH = 13
/** How far into a chapter the next clip gets its first frame decoded. */
const PRIME_AT = 0.85
/** URL parameter that arms the scrub metrics handle on window. */
const SCRUB_DEBUG_PARAM = 'scrub-debug'

type ScrubDebugWindow = Window & { __scrubMetrics?: ScrubMetrics }

/**
 * Arms `window.__scrubMetrics` so a real browser scroll can be measured:
 * open the site with ?scrub-debug, scroll the film, then call
 * `__scrubMetrics.format()` in the console for the gap distribution.
 * Without the parameter the window stays clean — this is a debug instrument,
 * not part of the page.
 */
function armScrubMetrics(metrics: ScrubMetrics): void {
  if (typeof window === 'undefined') return
  if (!new URLSearchParams(window.location.search).has(SCRUB_DEBUG_PARAM)) return
  ;(window as ScrubDebugWindow).__scrubMetrics = metrics
  // eslint-disable-next-line no-console
  console.info('[scrub] metrics armed — scroll the film, then call __scrubMetrics.format()')
}

function withdrawScrubMetrics(): void {
  if (typeof window === 'undefined') return
  delete (window as ScrubDebugWindow).__scrubMetrics
}

interface CinematicStageProps {
  onReady: () => void
}

/**
 * The pinned cinematic stage: five clips behave as ONE scrubbable film.
 * Scroll position → master progress → active clip + currentTime.
 * Videos never play; every visible frame comes from a seek.
 *
 * The scroll hot path touches NO React state except a chapter change —
 * overlays and the progress bar are updated by direct DOM writes.
 */
export function CinematicStage({ onReady }: CinematicStageProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const managerRef = useRef<VideoManager | null>(null)
  const preloadChainRef = useRef<VideoPreloadChain | null>(null)
  const segmentsRef = useRef<TimelineSegment[]>([])
  const activeChapterRef = useRef(0)
  const lastSeekRef = useRef({ clipIndex: -1, frame: -1 })
  const labelsRef = useRef<HTMLDivElement>(null)
  const introRef = useRef<HTMLDivElement>(null)
  const progressFillRef = useRef<HTMLSpanElement>(null)
  const lastSeenProgressRef = useRef(0)

  const [activeChapter, setActiveChapter] = useState(0)
  const readyRef = useRef(false)

  /** Direct-DOM overlay update — runs every scroll frame, zero re-renders. */
  function paintOverlays(p: number) {
    const segments = segmentsRef.current
    if (segments.length === 0) return
    const chapter = activeChapterRef.current
    const seg = segments[chapter]
    const local = (p - seg.startProgress) / (seg.endProgress - seg.startProgress)

    const paint = (container: HTMLDivElement | null) => {
      if (!container) return
      for (const child of Array.from(container.children)) {
        const el = child as HTMLElement
        const at = Number(el.dataset.at)
        if (!Number.isFinite(at)) continue
        const distance = Math.abs(local - at)
        const opacity = Math.max(0, 1 - distance * 5.5)
        el.style.opacity = String(opacity)
        el.style.transform = `translateY(${(1 - opacity) * 12}px)`
        el.style.visibility = opacity > 0.02 ? 'visible' : 'hidden'
      }
    }

    paint(labelsRef.current)
    paint(introRef.current)

    if (progressFillRef.current) {
      // scaleX is a compositor transform. Writing style.width instead would
      // force a layout pass on every scroll frame, for one pixel of bar.
      progressFillRef.current.style.transform = `scaleX(${p})`
    }
  }

  /**
   * Reveals the layer that is being scrubbed, in the SAME frame as the seek.
   * React state also tracks the chapter (for the copy and the indicator), but
   * it lands a tick later — too late for the layer showing the picture.
   */
  function paintActiveLayer(chapter: number) {
    videoRefs.current.forEach((video, i) => {
      if (!video) return
      video.className = `cinema__video${i === chapter ? ' is-active' : ''}`
    })
  }

  // 1) Smooth scroll + master ScrollTrigger
  useEffect(() => {
    createSmoothScroll()
    // Mobile browsers fire a resize when the toolbar hides. Re-measuring a
    // pinned section mid-scroll makes the stage jump under the visitor.
    ScrollTrigger.config({ ignoreMobileResize: true })

    const section = sectionRef.current
    if (!section) return

    const st = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: () => `+=${window.innerHeight * SCROLL_LENGTH_VH}`,
      pin: true,
      // Measure the pin slightly early so engaging it does not lurch.
      anticipatePin: 1,
      // The end distance is computed from the viewport, so it must be
      // recomputed whenever ScrollTrigger re-measures the page.
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const p = self.progress
        const segments = segmentsRef.current
        if (segments.length === 0) return

        const pos = resolveProgress(segments, p)

        // One seek per FRAME, not per scroll event: two positions inside the
        // same frame are the same picture, so the second is free to drop.
        const frameKey = pos.frame ?? pos.localTime
        const last = lastSeekRef.current
        if (pos.clipIndex !== last.clipIndex || frameKey !== last.frame) {
          lastSeekRef.current = { clipIndex: pos.clipIndex, frame: frameKey }
          managerRef.current?.seekTo(pos)
          // The clip on screen is the one the visitor needs now — stage it
          // even if the download chain has not reached it yet.
          preloadChainRef.current?.prioritize(pos.clipIndex)
        }

        // Near the end of a chapter, decode the next clip's first frame so the
        // crossing reveals a picture instead of a blank or frozen layer.
        const seg = segments[pos.clipIndex]
        const span = seg.endProgress - seg.startProgress
        const localFraction = span === 0 ? 0 : (p - seg.startProgress) / span
        if (localFraction > PRIME_AT) {
          managerRef.current?.primeClip(pos.clipIndex + 1)
        }

        const chapter = activeChapterIndex(segments, p)
        if (chapter !== activeChapterRef.current) {
          activeChapterRef.current = chapter
          paintActiveLayer(chapter)
          setActiveChapter(chapter)
        }

        paintOverlays(p)
        lastSeenProgressRef.current = p
      },
    })

    return () => {
      st.kill()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Repaint overlays right after a chapter switch (new label DOM).
  useEffect(() => {
    paintOverlays(lastSeenProgressRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChapter])

  // 2) Video metadata → timeline + manager (run once per mount)
  useEffect(() => {
    const videos = videoRefs.current.filter((v): v is HTMLVideoElement => v !== null)

    let cancelled = false
    // Every clip fires loadedmetadata, but the film is built exactly once —
    // a second manager would mean a second scrub loop fighting the first.
    let built = false

    function attach() {
      if (cancelled || built) return
      const durations = videos.map((v) => (Number.isFinite(v.duration) ? v.duration : 0))
      if (durations.length === CLIPS.length && durations.every((d) => d > 0)) {
        built = true
        segmentsRef.current = buildTimeline(durations, CLIP_FPS)
        // The recorder watches the manager from the outside: what the decoder
        // was asked for, what was dropped, what actually hit the screen.
        const metrics = createScrubMetrics()
        managerRef.current = createVideoManager(videos as unknown as ManagedVideo[], { metrics })
        armScrubMetrics(metrics)
        // The film is assembled — start walking the download chain so the
        // next clip begins only when the current one is entirely local.
        preloadChainRef.current = createVideoPreloadChain(videos)
        // The timeline now exists — paint the overlays for the current frame
        // so nothing shows a wrong default before the visitor scrolls.
        paintOverlays(lastSeenProgressRef.current)
        // The pinned scroll distance depends on the film, which only became
        // known just now, so make ScrollTrigger measure again.
        ScrollTrigger.refresh()
        if (!readyRef.current) {
          readyRef.current = true
          onReady()
        }
      }
    }

    videos.forEach((v) => {
      v.pause()
      if (v.readyState >= 1) attach()
      else v.addEventListener('loadedmetadata', attach, { once: true })
    })

    return () => {
      cancelled = true
      managerRef.current?.destroy()
      preloadChainRef.current?.destroy()
      preloadChainRef.current = null
      withdrawScrubMetrics()
    }
  }, [onReady])

  // 3) Which video layer is visible (opacity swap only at clip changes)
  const visibleClip = segmentsRef.current.length > 0 ? activeChapter : 0

  return (
    <section ref={sectionRef} className="cinema" aria-label="The Biryani Palace film">
      <div className="cinema__screen">
        {CLIPS.map((clip, i) => (
          <video
            key={clip}
            ref={(el) => {
              videoRefs.current[i] = el
            }}
            className={`cinema__video${i === visibleClip ? ' is-active' : ''}`}
            src={`/videos/${clip}`}
            muted
            playsInline
            // Only the opening clip asks for data at page load — the chain
            // stages the rest one at a time so the first download owns the
            // connection instead of fighting four others for it.
            preload={i === 0 ? 'auto' : 'metadata'}
            // The film never plays itself — scroll is the projector.
            autoPlay={false}
            aria-hidden="true"
            tabIndex={-1}
          />
        ))}
        <div className="cinema__vignette" aria-hidden="true" />
      </div>

      <ChapterIndicator activeIndex={activeChapter} />

      {/* Chapter copy — sparse, one meaningful line at a time */}
      <div className="cinema__overlay">
        {activeChapter === 0 && (
          <div className="cinema__hero" key="hero">
            <h1 className="cinema__hero-title">BIRYANI PALACE</h1>
            <p className="cinema__hero-sub">The art of waiting.</p>
            <p className="cinema__hero-meta">AUTHENTIC DUM BIRYANI</p>
          </div>
        )}

        {activeChapter > 0 && (
          <div className="cinema__chapter" key={`chapter-${activeChapter}`}>
            <p className="cinema__chapter-eyebrow">
              {CHAPTERS[activeChapter].numeral} — {CHAPTERS[activeChapter].name}
            </p>
            <h2 className="cinema__chapter-headline">{CHAPTERS[activeChapter].headline}</h2>
            {CHAPTERS[activeChapter].support && (
              <p className="cinema__chapter-support">{CHAPTERS[activeChapter].support}</p>
            )}
          </div>
        )}
      </div>

      {/* Opening statements inside chapter 01 — opacity painted per frame */}
      <div className="cinema__intro" ref={introRef} aria-hidden="true">
        {activeChapter === 0 &&
          INTRO_LINES.map((line) => (
            <span key={line.text} className="cinema__intro-line" data-at={line.at}>
              {line.text}
            </span>
          ))}
      </div>

      {/* Ingredient annotations — staggered by scroll position */}
      <div className="cinema__labels" ref={labelsRef} aria-hidden="true">
        {CHAPTERS[activeChapter].labels.map((label) => (
          <span key={label.text} className="cinema__label" data-at={label.at}>
            {label.text}
          </span>
        ))}
      </div>

      {/* Master progress — reflects the whole film, not one clip */}
      <div className="cinema__progress" aria-hidden="true">
        <span className="cinema__progress-track">
          <span className="cinema__progress-fill" ref={progressFillRef} />
        </span>
      </div>
    </section>
  )
}
