// Cold-start download order. On a first visit the film is roughly 73 MB away,
// and a browser will happily fetch several clips at once if asked — which is
// what made the opening chapters stutter: the clip on screen was sharing the
// connection with another, and later clips did not start downloading until
// the visitor had already scrolled into them.
//
// The chain walks the film in order: clip N+1 begins downloading only when
// clip N is entirely on the machine, so in the common case one download owns
// the connection at a time and every clip is finished long before the scroll
// reaches it. A visitor who outruns the chain can force the clip they are
// watching to start immediately via prioritize() — correctness before order.

export interface BufferInfo {
  readonly length: number
  start(index: number): number
  end(index: number): number
}

export interface PreloadableVideo {
  preload: string
  duration: number
  readonly buffered: BufferInfo
  addEventListener(type: string, listener: () => void): void
  removeEventListener(type: string, listener: () => void): void
}

export interface VideoPreloadChain {
  /**
   * Stages the clip the visitor is scrubbing right now, out of order if the
   * chain has not reached it yet. Idempotent and cheap — safe on every
   * scroll frame.
   */
  prioritize(clipIndex: number): void
  /** Detaches the listeners; the chain stages no further downloads. */
  destroy(): void
}

/**
 * Buffering can report a fraction of a second short of the true end, and a
 * hole smaller than this is not worth stalling the chain over.
 */
const TOLERANCE = 0.5

/** Events that mean "the amount of downloaded data may have changed". */
const ADVANCE_EVENTS = ['progress', 'suspend', 'canplaythrough', 'loadedmetadata']

/** true when every byte of the clip is on the machine — holes included. */
function isFullyBuffered(video: PreloadableVideo): boolean {
  if (!Number.isFinite(video.duration) || video.duration <= 0) return false
  const buffered = video.buffered
  if (buffered.length === 0) return false
  if (buffered.start(0) > TOLERANCE) return false
  let reached = 0
  for (let i = 0; i < buffered.length; i++) {
    if (buffered.start(i) > reached + TOLERANCE) return false // a hole
    reached = Math.max(reached, buffered.end(i))
  }
  return reached >= video.duration - TOLERANCE
}

export function createVideoPreloadChain(videos: PreloadableVideo[]): VideoPreloadChain {
  if (!Array.isArray(videos) || videos.length === 0) {
    throw new Error('createVideoPreloadChain requires at least one video')
  }

  /** clip i has been told to download (preload="auto") */
  const staged = videos.map(() => false)
  let destroyed = false

  function stage(index: number): void {
    if (destroyed || index < 0 || index >= videos.length || staged[index]) return
    staged[index] = true
    videos[index].preload = 'auto'
  }

  // The walk: the first clip begins immediately, and every clip after it
  // may begin when the clip before it is entirely buffered. Gaps that
  // prioritize() opened ahead of the chain are filled in order behind it.
  function advance(): void {
    if (destroyed) return
    for (let i = 0; i < videos.length; i++) {
      if (!staged[i] && (i === 0 || isFullyBuffered(videos[i - 1]))) {
        stage(i)
      }
    }
  }

  const onAdvanceEvent = (): void => advance()

  videos.forEach((video) => {
    ADVANCE_EVENTS.forEach((type) => video.addEventListener(type, onAdvanceEvent))
  })

  // A warm HTTP cache can finish every clip without firing a single event
  // after the chain exists — check the current state once up front.
  advance()

  return {
    prioritize(clipIndex: number): void {
      if (!Number.isInteger(clipIndex) || clipIndex < 0 || clipIndex >= videos.length) return
      stage(clipIndex)
      advance()
    },

    destroy(): void {
      destroyed = true
      videos.forEach((video) => {
        ADVANCE_EVENTS.forEach((type) => video.removeEventListener(type, onAdvanceEvent))
      })
    },
  }
}
