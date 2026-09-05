// Scroll-scrubbed video control. The videos NEVER play on their own:
// every frame the visitor sees is the direct result of scroll position.
// The manager keeps every clip paused and coalesces seeks so the decoder
// always chases the NEWEST requested position (never a backlog). Download
// staging lives in videoPreloadChain — the manager only scrubs.

export interface ManagedVideo {
  paused: boolean
  currentTime: number
  duration: number
  preload: string
  readyState: number
  /** true while the element is decoding a requested seek */
  seeking: boolean
  pause(): void
  play(): Promise<void> | void
  /**
   * Browser hook that fires when a frame has actually been PRESENTED on
   * screen. `seeking` only tells us the request resolved; this tells us the
   * picture is visible, which is the honest moment to ask for the next one.
   */
  requestVideoFrameCallback?(callback: (now?: number) => void): number
}

export interface TimelineSeek {
  clipIndex: number
  localTime: number
}

export interface VideoManagerState {
  activeIndex: number
}

/**
 * What the manager reports as it scrubs. Structural on purpose: the real
 * scrubMetrics recorder satisfies it, and so does any test double — the
 * manager never needs to know how the numbers are kept.
 */
export interface ScrubMetricsRecorder {
  /** a seek was handed to the decoder */
  seekRequested(): void
  /** a pending target was replaced by a newer one before it was applied */
  seekSuperseded(): void
  /** the browser presented a frame on screen */
  framePresented(): void
}

export interface VideoManagerOptions {
  metrics?: ScrubMetricsRecorder
}

export interface VideoManager {
  seekTo(seek: TimelineSeek): void
  /** decodes the first frame of an upcoming clip so it is never blank on arrival */
  primeClip(index: number): void
  pauseAll(): void
  getState(): VideoManagerState
  /** cancels the internal scrub loop (call on unmount) */
  destroy(): void
}

/** rAF ticks to wait before assuming a presented-frame callback will never fire. */
const STUCK_TICKS = 12

function hasFrameCallback(video: ManagedVideo): boolean {
  return typeof video.requestVideoFrameCallback === 'function'
}

export function createVideoManager(videos: ManagedVideo[], options: VideoManagerOptions = {}): VideoManager {
  if (!Array.isArray(videos) || videos.length === 0) {
    throw new Error('createVideoManager requires at least one video')
  }

  // No recorder, no behaviour change — reporting is strictly a side observation.
  const metrics = options.metrics

  const pauseAll = (): void => {
    videos.forEach((video) => {
      if (!video.paused) video.pause()
    })
  }

  // Registration guarantee: nothing is playing from the start.
  pauseAll()

  let activeIndex = 0
  /** The newest target scroll asked for but has not been applied yet. */
  let pendingSeek: TimelineSeek | null = null
  /** true while the active video is decoding a seek. */
  let inFlight = false
  /** how many rAF ticks the current seek has been held open */
  let inFlightTicks = 0
  let disposed = false

  function openGate(): void {
    if (!inFlight || disposed) return
    inFlight = false
    inFlightTicks = 0
    drain()
  }

  function drain(): void {
    if (inFlight || disposed) return
    const seek = pendingSeek
    if (!seek) return
    pendingSeek = null

    const video = videos[seek.clipIndex]
    const clamped = Math.min(video.duration, Math.max(0, seek.localTime))

    // Only pause/switch when the target clip actually changes.
    if (seek.clipIndex !== activeIndex) {
      pauseAll()
      activeIndex = seek.clipIndex
    }

    // Skip redundant seeks so the decoder is not disturbed.
    if (video.currentTime === clamped) {
      return
    }

    inFlight = true
    inFlightTicks = 0
    metrics?.seekRequested()
    video.currentTime = clamped

    // Prefer the presented-frame signal when the browser offers it.
    video.requestVideoFrameCallback?.(() => {
      if (disposed) return
      metrics?.framePresented()
      openGate()
    })
  }

  // One lightweight loop. While a seek is decoding we leave currentTime
  // alone; the moment the video reports it is no longer seeking we apply
  // whatever NEWER target arrived in the meantime. Stale seeks are dropped
  // instead of queued, which is what keeps fast scrubbing smooth.
  const rafLoop = (): void => {
    if (disposed) return
    if (inFlight) {
      const active = videos[activeIndex]
      inFlightTicks += 1
      if (!hasFrameCallback(active)) {
        if (!active.seeking) openGate()
      } else if (inFlightTicks > STUCK_TICKS) {
        // The callback never fired — the seek landed on the frame already
        // shown, so no new frame was ever presented. Do not stall forever.
        openGate()
      }
    } else if (pendingSeek) {
      drain()
    }
    requestAnimationFrame(rafLoop)
  }
  requestAnimationFrame(rafLoop)

  return {
    seekTo(seek: TimelineSeek): void {
      if (
        !Number.isInteger(seek.clipIndex) ||
        seek.clipIndex < 0 ||
        seek.clipIndex >= videos.length
      ) {
        throw new Error(`clipIndex ${seek.clipIndex} is out of range`)
      }
      // Record the newest target FIRST so opening the gate applies this
      // position, not the one it superseded.
      if (pendingSeek) metrics?.seekSuperseded()
      pendingSeek = seek
      const active = videos[activeIndex]
      // Without a presented-frame callback the element's own seeking flag is
      // the only signal available, so re-check it on every scroll frame.
      if (inFlight && !hasFrameCallback(active) && !active.seeking) {
        inFlight = false
        inFlightTicks = 0
      }
      drain()
    },

    primeClip(index: number): void {
      if (disposed) return
      if (!Number.isInteger(index) || index < 0 || index >= videos.length) return
      // Never disturb the clip on screen: its currentTime IS the scrub.
      if (index === activeIndex) return
      const video = videos[index]
      if (video.currentTime === 0) return
      // Decoding frame 0 now means the layer already has a picture when the
      // boundary crossing reveals it, instead of a frozen or blank frame.
      video.currentTime = 0
    },

    pauseAll,

    getState(): VideoManagerState {
      return { activeIndex }
    },

    destroy(): void {
      disposed = true
    },
  }
}
