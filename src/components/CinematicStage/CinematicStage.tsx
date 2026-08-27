import { useEffect, useRef, useState } from 'react'
import { ScrollTrigger, createSmoothScroll } from '../../lib/scrollController'
import { buildTimeline, resolveProgress, activeChapterIndex, type TimelineSegment } from '../../lib/cinematicTimeline'
import { createVideoManager, type ManagedVideo, type VideoManager } from '../../lib/videoManager'
import { CHAPTERS, INTRO_LINES } from '../../data/chapters'
import { ChapterIndicator } from '../ChapterIndicator/ChapterIndicator'
import './CinematicStage.css'

const CLIPS = ['clip1.mp4', 'clip2.mp4', 'clip3.mp4', 'clip4.mp4', 'clip5.mp4']
/** How much scroll distance the whole film occupies (in viewport heights). */
const SCROLL_LENGTH_VH = 13
/** Skip seeks smaller than one frame — the decoder is not a toy. */
const MIN_SEEK_DELTA = 1 / 30

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
  const segmentsRef = useRef<TimelineSegment[]>([])
  const activeChapterRef = useRef(0)
  const lastSeekRef = useRef({ clipIndex: -1, localTime: -1 })
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
      progressFillRef.current.style.width = `${p * 100}%`
    }
  }

  // 1) Smooth scroll + master ScrollTrigger
  useEffect(() => {
    createSmoothScroll()

    const section = sectionRef.current
    if (!section) return

    const st = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: () => `+=${window.innerHeight * SCROLL_LENGTH_VH}`,
      pin: true,
      onUpdate: (self) => {
        const p = self.progress
        const segments = segmentsRef.current
        if (segments.length === 0) return

        const pos = resolveProgress(segments, p)

        // Throttled seek: only disturb the decoder when the frame actually moved.
        const last = lastSeekRef.current
        if (
          pos.clipIndex !== last.clipIndex ||
          Math.abs(pos.localTime - last.localTime) >= MIN_SEEK_DELTA
        ) {
          lastSeekRef.current = { clipIndex: pos.clipIndex, localTime: pos.localTime }
          managerRef.current?.seekTo(pos)
          managerRef.current?.preloadNext(pos.clipIndex)
        }

        const chapter = activeChapterIndex(segments, p)
        if (chapter !== activeChapterRef.current) {
          activeChapterRef.current = chapter
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

    function attach() {
      if (cancelled) return
      const durations = videos.map((v) => (Number.isFinite(v.duration) ? v.duration : 0))
      if (durations.length === CLIPS.length && durations.every((d) => d > 0)) {
        segmentsRef.current = buildTimeline(durations)
        managerRef.current = createVideoManager(videos as unknown as ManagedVideo[])
        // The timeline now exists — paint the overlays for the current frame
        // so nothing shows a wrong default before the visitor scrolls.
        paintOverlays(lastSeenProgressRef.current)
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
            preload={i < 2 ? 'auto' : 'metadata'}
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
