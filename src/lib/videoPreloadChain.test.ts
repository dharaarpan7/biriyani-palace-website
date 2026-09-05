import { describe, it, expect, vi } from 'vitest'
import { createVideoPreloadChain, type PreloadableVideo } from './videoPreloadChain'

// Fake video element: a mutable list of buffered ranges plus a tiny event
// target, so a test can simulate downloading exactly as far as it wants.
function fakeVideo(duration = 10): PreloadableVideo & {
  setRanges(...ranges: [number, number][]): void
  emit(type: string): void
} {
  let ranges: [number, number][] = []
  const listeners: Record<string, (() => void)[]> = {}
  const video = {
    preload: 'metadata',
    duration,
    get buffered() {
      return {
        get length() {
          return ranges.length
        },
        start: (i: number) => ranges[i][0],
        end: (i: number) => ranges[i][1],
      }
    },
    addEventListener(type: string, listener: () => void) {
      ;(listeners[type] ??= []).push(listener)
    },
    removeEventListener(type: string, listener: () => void) {
      listeners[type] = (listeners[type] ?? []).filter((l) => l !== listener)
    },
    setRanges(...next: [number, number][]) {
      ranges = next
    },
    emit(type: string) {
      for (const listener of listeners[type] ?? []) listener()
    },
  }
  return video
}

describe('createVideoPreloadChain', () => {
  it('refuses to manage an empty video list', () => {
    expect(() => createVideoPreloadChain([])).toThrow('at least one video')
  })

  it('stages the next clip only once the current one is fully buffered', () => {
    const videos = [fakeVideo(), fakeVideo(), fakeVideo()]
    createVideoPreloadChain(videos)

    // nothing has downloaded yet — the second clip stays lazy
    videos[0].setRanges([0, 4])
    videos[0].emit('progress')
    expect(videos[1].preload).toBe('metadata')

    // the first clip completes — now (and only now) the second may begin
    videos[0].setRanges([0, 10])
    videos[0].emit('progress')
    expect(videos[1].preload).toBe('auto')
    // and the third still waits for the second
    expect(videos[2].preload).toBe('metadata')
  })

  it('walks the whole film one clip at a time', () => {
    const videos = [fakeVideo(), fakeVideo(), fakeVideo()]
    createVideoPreloadChain(videos)

    videos[0].setRanges([0, 10])
    videos[0].emit('progress')
    expect(videos[1].preload).toBe('auto')

    videos[1].setRanges([0, 10])
    videos[1].emit('progress')
    expect(videos[2].preload).toBe('auto')
  })

  it('stages every clip at once when the cache is already warm', () => {
    const videos = [fakeVideo(), fakeVideo(), fakeVideo()]
    videos.forEach((v) => v.setRanges([0, 10]))
    // no events at all — the chain must look at the current state itself
    createVideoPreloadChain(videos)
    expect(videos.map((v) => v.preload)).toEqual(['auto', 'auto', 'auto'])
  })

  it('accepts a buffered report a fraction of a second short of the end', () => {
    const videos = [fakeVideo(), fakeVideo()]
    createVideoPreloadChain(videos)
    // browsers can report 9.7s of a 10s clip as "everything"
    videos[0].setRanges([0, 9.7])
    videos[0].emit('suspend')
    expect(videos[1].preload).toBe('auto')
  })

  it('does not mistake a hole in the middle for a complete clip', () => {
    const videos = [fakeVideo(), fakeVideo()]
    createVideoPreloadChain(videos)
    // a scrub-driven download can leave 3s–7s missing
    videos[0].setRanges([0, 3], [7, 10])
    videos[0].emit('progress')
    expect(videos[1].preload).toBe('metadata')
  })

  it('ignores a clip whose duration is not known yet', () => {
    const videos = [fakeVideo(NaN), fakeVideo()]
    createVideoPreloadChain(videos)
    videos[0].setRanges([0, 10]) // buffered, but duration is still unknown
    videos[0].emit('progress')
    expect(videos[1].preload).toBe('metadata')
  })

  it('prioritize stages the clip the visitor is watching, out of order', () => {
    const videos = [fakeVideo(), fakeVideo(), fakeVideo()]
    const chain = createVideoPreloadChain(videos)

    // a fast scroller jumps into chapter 3 while clip 1 is still downloading
    chain.prioritize(2)
    expect(videos[2].preload).toBe('auto')
    // the untouched neighbours stay lazy
    expect(videos[1].preload).toBe('metadata')
  })

  it('fills the gap a prioritize() opened once the earlier clips land', () => {
    const videos = [fakeVideo(), fakeVideo(), fakeVideo(), fakeVideo()]
    const chain = createVideoPreloadChain(videos)
    chain.prioritize(2) // clip 3 needed now, clip 2 skipped over

    videos[0].setRanges([0, 10])
    videos[0].emit('progress')
    expect(videos[1].preload).toBe('auto') // the gap is filled in order

    // and the chain continues past the forced clip once it completes
    videos[1].setRanges([0, 10])
    videos[1].emit('progress')
    videos[2].setRanges([0, 10])
    videos[2].emit('progress')
    expect(videos[3].preload).toBe('auto')
  })

  it('treats an out-of-range prioritize as a no-op', () => {
    const videos = [fakeVideo(), fakeVideo()]
    const chain = createVideoPreloadChain(videos)
    expect(() => chain.prioritize(99)).not.toThrow()
    expect(() => chain.prioritize(-1)).not.toThrow()
    expect(videos[1].preload).toBe('metadata')
  })

  it('stages nothing further once destroyed', () => {
    const videos = [fakeVideo(), fakeVideo()]
    const chain = createVideoPreloadChain(videos)
    chain.destroy()

    videos[0].setRanges([0, 10])
    videos[0].emit('progress')
    expect(videos[1].preload).toBe('metadata')
  })

  it('detaches its listeners on destroy', () => {
    const videos = [fakeVideo(), fakeVideo()]
    const chain = createVideoPreloadChain(videos)
    const spy = vi.spyOn(videos[0], 'removeEventListener')
    chain.destroy()
    expect(spy).toHaveBeenCalled()
  })
})
