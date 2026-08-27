// The master cinematic timeline: five clips behave as ONE scrubbable film.
// Scroll progress (0..1) maps onto a duration-weighted combined timeline,
// so replacing a clip with a different duration just works.

export interface TimelineSegment {
  clipIndex: number
  duration: number
  /** start position on the combined timeline, in seconds */
  startTime: number
  endTime: number
  /** scroll-progress window this clip owns, 0..1 */
  startProgress: number
  endProgress: number
}

export interface TimelinePosition {
  clipIndex: number
  localTime: number
  globalTime: number
}

export function buildTimeline(durations: number[]): TimelineSegment[] {
  if (!Array.isArray(durations) || durations.length === 0) {
    throw new Error('buildTimeline requires at least one clip duration')
  }
  if (durations.some((d) => !Number.isFinite(d) || d <= 0)) {
    throw new Error('every clip duration must be a positive finite number')
  }
  const total = durations.reduce((sum, d) => sum + d, 0)
  let elapsed = 0
  return durations.map((duration, clipIndex) => {
    const segment: TimelineSegment = {
      clipIndex,
      duration,
      startTime: elapsed,
      endTime: elapsed + duration,
      startProgress: elapsed / total,
      endProgress: (elapsed + duration) / total,
    }
    elapsed += duration
    return segment
  })
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

export function resolveProgress(
  segments: TimelineSegment[],
  progress: number,
): TimelinePosition {
  if (segments.length === 0) {
    throw new Error('resolveProgress requires a non-empty timeline')
  }
  const p = clamp01(progress)
  // At an exact boundary the NEXT clip owns the position at its first frame,
  // so the final frame of one clip and the first frame of the next coincide.
  let segment = segments[segments.length - 1]
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    if (p < seg.endProgress || (i === segments.length - 1 && p <= seg.endProgress)) {
      segment = seg
      break
    }
  }
  const span = segment.endProgress - segment.startProgress
  const local = span === 0 ? 0 : ((p - segment.startProgress) / span) * segment.duration
  const localTime = Math.min(segment.duration, Math.max(0, local))
  return {
    clipIndex: segment.clipIndex,
    localTime,
    globalTime: segment.startTime + localTime,
  }
}

export function activeChapterIndex(
  segments: TimelineSegment[],
  progress: number,
): number {
  if (segments.length === 0) {
    throw new Error('activeChapterIndex requires a non-empty timeline')
  }
  const p = clamp01(progress)
  for (const seg of segments) {
    if (p < seg.endProgress) return seg.clipIndex
  }
  return segments[segments.length - 1].clipIndex
}
