// Scroll-scrubbed video control. The videos NEVER play on their own:
// every frame the visitor sees is the direct result of scroll position.
// The manager keeps every clip paused, coalesces seeks so the decoder
// always chases the NEWEST requested position (never a backlog), and
// upgrades the preload level of the next clip before a boundary crossing.

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
}

export interface TimelineSeek {
  clipIndex: number
  localTime: number
}

export interface VideoManagerState {
  activeIndex: number
}

export interface VideoManager {
  seekTo(seek: TimelineSeek): void
  preloadNext(activeIndex: number): void
  pauseAll(): void
  getState(): VideoManagerState
  /** cancels the internal scrub loop (call on unmount) */
  destroy(): void
}

export function createVideoManager(videos: ManagedVideo[]): VideoManager {
  if (!Array.isArray(videos) || videos.length === 0) {
    throw new Error('createVideoManager requires at least one video')
  }

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
  let disposed = false

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
    video.currentTime = clamped
  }

  // One lightweight loop. While a seek is decoding we leave currentTime
  // alone; the moment the video reports it is no longer seeking we apply
  // whatever NEWER target arrived in the meantime. Stale seeks are dropped
  // instead of queued, which is what keeps fast scrubbing smooth.
  const rafLoop = (): void => {
    if (disposed) return
    if (inFlight) {
      const active = videos[activeIndex]
      if (!active.seeking) {
        inFlight = false
        drain()
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
      pendingSeek = seek
      drain()
    },

    preloadNext(current: number): void {
      const next = videos[current + 1]
      if (next) {
        next.preload = 'auto'
      }
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
