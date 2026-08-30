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
  /** frames per second of this clip; absent when the frame grid is unknown */
  fps?: number
}

export interface TimelinePosition {
  clipIndex: number
  localTime: number
  globalTime: number
  /** index of the frame on screen; absent when the clip has no known fps */
  frame?: number
}

export function buildTimeline(durations: number[], fps?: number[]): TimelineSegment[] {
  if (!Array.isArray(durations) || durations.length === 0) {
    throw new Error('buildTimeline requires at least one clip duration')
  }
  if (durations.some((d) => !Number.isFinite(d) || d <= 0)) {
    throw new Error('every clip duration must be a positive finite number')
  }
  if (fps !== undefined) {
    if (!Array.isArray(fps) || fps.length !== durations.length) {
      throw new Error('buildTimeline needs one frame rate per clip duration')
    }
    if (fps.some((f) => !Number.isFinite(f) || f <= 0)) {
      throw new Error('every clip frame rate must be a positive finite number')
    }
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
      fps: fps?.[clipIndex],
    }
    elapsed += duration
    return segment
  })
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

const FRAME_EPSILON = 1e-9

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
  const continuous = Math.min(segment.duration, Math.max(0, local))
  // Video is a grid of discrete frames: a 25fps clip only changes picture every
  // 0.04s. Landing the scrub on the frame that is actually on screen means two
  // scroll positions inside the same frame become ONE seek instead of two, and
  // the decoder is never asked for a picture that cannot be seen.
  const { fps } = segment
  if (fps === undefined) {
    return {
      clipIndex: segment.clipIndex,
      localTime: continuous,
      globalTime: segment.startTime + continuous,
    }
  }
  const lastFrame = Math.max(0, Math.ceil(segment.duration * fps) - 1)
  // EPSILON absorbs float drift so 5.04s * 25 lands on frame 126, not 125.
  const frame = Math.min(lastFrame, Math.max(0, Math.floor(continuous * fps + FRAME_EPSILON)))
  const localTime = frame / fps
  return {
    clipIndex: segment.clipIndex,
    localTime,
    globalTime: segment.startTime + localTime,
    frame,
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
