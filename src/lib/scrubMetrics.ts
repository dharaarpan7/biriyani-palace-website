// Measures whether the scroll scrub is ACTUALLY smooth, in the browser, with
// numbers instead of opinions.
//
// "Smooth" is not "many seeks per second". The scrub is allowed to skip
// pictures — the coalescing gate in videoManager keeps the position current, so
// a fast flick showing every 4th frame still lands on the right frame. What
// reads as choppy is UNEVEN cadence: a run of 16ms gaps and then a 200ms hole.
// So the headline numbers here are the gap distribution and the stall count,
// not the throughput.
//
// Everything is injectable (clock included) so the unit tests assert exact
// milliseconds and never depend on wall-clock timing.

export interface ScrubMetricsOptions {
  /** monotonic clock in ms; defaults to performance.now() where available */
  now?: () => number
  /** an inter-frame gap LONGER than this is a visible hitch (ms) */
  stallThresholdMs?: number
  /** how many recent gaps the percentile window keeps */
  maxSamples?: number
}

export interface ScrubMetricsSnapshot {
  /** seeks that actually reached the decoder */
  seeks: number
  /** targets replaced before the decoder was free — these cost nothing */
  superseded: number
  /** frames the browser reported as presented on screen */
  presented: number
  /** gaps longer than the stall threshold */
  stalls: number
  /** longest gap inside the recent sample window */
  longestGapMs: number
  /** longest gap since the last reset, even if it aged out of the window */
  worstGapEverMs: number
  medianGapMs: number
  p95GapMs: number
  presentedPerSecond: number
  elapsedMs: number
}

export interface ScrubMetrics {
  /** a seek was handed to the decoder */
  seekRequested(): void
  /** a pending target was replaced by a newer one before it was applied */
  seekSuperseded(): void
  /** the browser presented a frame on screen */
  framePresented(): void
  snapshot(): ScrubMetricsSnapshot
  /** one console-readable line */
  format(): string
  reset(): void
}

/** A gap over this is long enough to read as a hitch rather than a slow frame. */
const DEFAULT_STALL_MS = 100
/** ~10s of frames at 60fps — enough for a percentile, small enough to ignore. */
const DEFAULT_MAX_SAMPLES = 600

function defaultNow(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now()
}

/** Nearest-rank percentile: no interpolation, so every value returned is real. */
function percentile(sorted: number[], fraction: number): number {
  if (sorted.length === 0) return 0
  const rank = Math.ceil(fraction * sorted.length) - 1
  return sorted[Math.min(sorted.length - 1, Math.max(0, rank))]
}

export function createScrubMetrics(options: ScrubMetricsOptions = {}): ScrubMetrics {
  const now = options.now ?? defaultNow
  const stallThresholdMs = options.stallThresholdMs ?? DEFAULT_STALL_MS
  const maxSamples = options.maxSamples ?? DEFAULT_MAX_SAMPLES

  if (!Number.isFinite(stallThresholdMs) || stallThresholdMs <= 0) {
    throw new Error('stallThresholdMs must be a positive finite number')
  }
  if (!Number.isInteger(maxSamples) || maxSamples < 1) {
    throw new Error('maxSamples must be an integer of at least 1')
  }

  let startedAt = now()
  let seeks = 0
  let superseded = 0
  let presented = 0
  let stalls = 0
  let worstGapEverMs = 0
  let lastPresentedAt: number | null = null
  let gaps: number[] = []

  function snapshot(): ScrubMetricsSnapshot {
    const elapsedMs = now() - startedAt
    const sorted = [...gaps].sort((a, b) => a - b)
    return {
      seeks,
      superseded,
      presented,
      stalls,
      longestGapMs: sorted.length > 0 ? sorted[sorted.length - 1] : 0,
      worstGapEverMs,
      medianGapMs: percentile(sorted, 0.5),
      p95GapMs: percentile(sorted, 0.95),
      presentedPerSecond: elapsedMs > 0 ? presented / (elapsedMs / 1000) : 0,
      elapsedMs,
    }
  }

  return {
    seekRequested(): void {
      seeks += 1
    },

    seekSuperseded(): void {
      superseded += 1
    },

    framePresented(): void {
      const t = now()
      presented += 1
      if (lastPresentedAt !== null) {
        const gap = t - lastPresentedAt
        // Counters see every gap; the sample window only keeps the recent ones,
        // so a hitch is never quietly forgotten just because it aged out.
        if (gap > worstGapEverMs) worstGapEverMs = gap
        if (gap > stallThresholdMs) stalls += 1
        gaps.push(gap)
        if (gaps.length > maxSamples) gaps.splice(0, gaps.length - maxSamples)
      }
      lastPresentedAt = t
    },

    snapshot,

    format(): string {
      const s = snapshot()
      return [
        `seeks=${s.seeks}`,
        `superseded=${s.superseded}`,
        `presented=${s.presented}`,
        `stalls=${s.stalls}`,
        `median=${Math.round(s.medianGapMs)}ms`,
        `p95=${Math.round(s.p95GapMs)}ms`,
        `worst=${Math.round(s.worstGapEverMs)}ms`,
        `rate=${s.presentedPerSecond.toFixed(1)}/s`,
      ].join(' ')
    },

    reset(): void {
      startedAt = now()
      seeks = 0
      superseded = 0
      presented = 0
      stalls = 0
      worstGapEverMs = 0
      lastPresentedAt = null
      gaps = []
    },
  }
}
