import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createVideoManager, type ManagedVideo } from './videoManager'

// Fake video element: we only care about play/pause/currentTime/preload/readyState.
function fakeVideo(overrides: Partial<ManagedVideo> = {}): ManagedVideo {
  return {
    paused: true,
    currentTime: 0,
    duration: 10,
    preload: 'auto',
    readyState: 4,
    seeking: false,
    pause: vi.fn(function (this: ManagedVideo) {
      this.paused = true
    }),
    play: vi.fn(function (this: ManagedVideo) {
      this.paused = false
      return Promise.resolve()
    }),
    ...overrides,
  } as ManagedVideo
}

describe('createVideoManager', () => {
  let videos: ManagedVideo[]

  beforeEach(() => {
    videos = [fakeVideo(), fakeVideo(), fakeVideo()]
  })

  it('pauses every video on registration so nothing ever autoplays', () => {
    const playing = fakeVideo({ paused: false })
    videos.push(playing)
    createVideoManager(videos)
    expect(playing.paused).toBe(true)
    expect(playing.pause).toHaveBeenCalled()
  })

  it('seek sets currentTime on the active clip and pauses it', () => {
    const mgr = createVideoManager(videos)
    mgr.seekTo({ clipIndex: 1, localTime: 4.5 })
    expect(videos[1].currentTime).toBe(4.5)
    expect(videos[1].paused).toBe(true)
    expect(videos[1].play).not.toHaveBeenCalled()
  })

  it('never calls play() on any video when scrubbing', () => {
    const mgr = createVideoManager(videos)
    mgr.seekTo({ clipIndex: 0, localTime: 2 })
    mgr.seekTo({ clipIndex: 2, localTime: 8 })
    mgr.seekTo({ clipIndex: 1, localTime: 1 })
    videos.forEach((v) => expect(v.play).not.toHaveBeenCalled())
  })

  it('skips redundant seeks when currentTime already matches', () => {
    const mgr = createVideoManager(videos)
    videos[0].currentTime = 3
    mgr.seekTo({ clipIndex: 0, localTime: 3 })
    // currentTime already 3 -> no reassignment needed; verify no error and still paused
    expect(videos[0].paused).toBe(true)
    expect(videos[0].currentTime).toBe(3)
  })

  it('activates only the current clip and deactivates others', () => {
    const mgr = createVideoManager(videos)
    mgr.seekTo({ clipIndex: 1, localTime: 2 })
    const state = mgr.getState()
    expect(state.activeIndex).toBe(1)
    // all videos remain paused regardless of active state
    videos.forEach((v) => expect(v.paused).toBe(true))
  })

  it('preloadNext upgrades the next clip preload level before the boundary', () => {
    const lazy = fakeVideo({ preload: 'none' })
    const vids = [lazy, fakeVideo({ preload: 'none' }), fakeVideo({ preload: 'none' })]
    const mgr = createVideoManager(vids)
    mgr.preloadNext(0)
    expect(vids[1].preload).toBe('auto')
    // clip beyond next stays lazy
    expect(vids[2].preload).toBe('none')
  })

  it('preloadNext on the last clip is a no-op', () => {
    const vids = [fakeVideo(), fakeVideo()]
    const mgr = createVideoManager(vids)
    expect(() => mgr.preloadNext(1)).not.toThrow()
    expect(vids[0].preload).toBe('auto') // untouched from registration default
  })

  it('pauseAll pauses any video that somehow started playing', () => {
    const rogue = fakeVideo({ paused: false })
    const vids = [fakeVideo(), rogue]
    const mgr = createVideoManager(vids)
    rogue.paused = false // simulate external play after registration
    mgr.pauseAll()
    expect(rogue.paused).toBe(true)
    expect(rogue.pause).toHaveBeenCalled()
  })

  it('seekTo throws on out-of-range clip index', () => {
    const mgr = createVideoManager(videos)
    expect(() => mgr.seekTo({ clipIndex: 5, localTime: 0 })).toThrow()
    expect(() => mgr.seekTo({ clipIndex: -1, localTime: 0 })).toThrow()
  })

  it('clamps localTime to the clip duration', () => {
    const short = fakeVideo({ duration: 4 })
    const vids = [fakeVideo(), short]
    const mgr = createVideoManager(vids)
    mgr.seekTo({ clipIndex: 1, localTime: 99 })
    expect(short.currentTime).toBe(4)
  })

  it('refuses to manage an empty video list', () => {
    expect(() => createVideoManager([])).toThrow('at least one video')
  })

  it('stops seeking once destroyed — scrub loop is cancelled', () => {
    const mgr = createVideoManager(videos)
    mgr.destroy()
    expect(() => mgr.seekTo({ clipIndex: 0, localTime: 5 })).not.toThrow()
    // the destroyed manager must not touch the decoder anymore
    expect(videos[0].currentTime).toBe(0)
  })
})

describe('boundary priming', () => {
  // Crossing from one clip to the next used to show a frozen frame while the
  // incoming clip decoded from scratch. Priming it to frame 0 ahead of the
  // crossing means the new layer already has a picture when it appears.
  it('primes an upcoming clip to its first frame', () => {
    const videos = [fakeVideo(), fakeVideo(), fakeVideo()]
    const mgr = createVideoManager(videos)
    videos[1].currentTime = 7 // left over from a previous pass through the film
    mgr.primeClip(1)
    expect(videos[1].currentTime).toBe(0)
  })

  it('never primes the clip currently on screen', () => {
    const videos = [fakeVideo(), fakeVideo(), fakeVideo()]
    const mgr = createVideoManager(videos)
    mgr.seekTo({ clipIndex: 1, localTime: 3 })
    mgr.primeClip(1)
    expect(videos[1].currentTime).toBe(3)
  })

  it('leaves the active clip alone while priming its neighbour', () => {
    const videos = [fakeVideo(), fakeVideo(), fakeVideo()]
    const mgr = createVideoManager(videos)
    mgr.seekTo({ clipIndex: 0, localTime: 6 })
    mgr.primeClip(1)
    expect(videos[0].currentTime).toBe(6)
    expect(videos[1].currentTime).toBe(0)
  })

  it('priming out of range is a no-op', () => {
    const videos = [fakeVideo(), fakeVideo()]
    const mgr = createVideoManager(videos)
    expect(() => mgr.primeClip(99)).not.toThrow()
    expect(() => mgr.primeClip(-1)).not.toThrow()
  })

  it('a destroyed manager primes nothing', () => {
    const videos = [fakeVideo(), fakeVideo()]
    const mgr = createVideoManager(videos)
    videos[1].currentTime = 7
    mgr.destroy()
    mgr.primeClip(1)
    expect(videos[1].currentTime).toBe(7)
  })
})

describe('seek pacing', () => {
  // The decoder is the bottleneck. The manager holds one seek open at a time
  // and always applies the NEWEST target when the previous one lands, so a
  // fast scrub never builds a backlog of stale positions.
  function pacedVideo(): { video: ManagedVideo; presented: (() => void)[] } {
    const presented: (() => void)[] = []
    const video = fakeVideo({
      requestVideoFrameCallback: (cb: () => void) => {
        presented.push(cb)
        return presented.length
      },
    })
    return { video, presented }
  }

  it('releases the gate when a frame is actually presented on screen', () => {
    const { video, presented } = pacedVideo()
    const mgr = createVideoManager([video])

    mgr.seekTo({ clipIndex: 0, localTime: 2 })
    expect(video.currentTime).toBe(2)

    // a newer target arrives while the first seek is still decoding
    mgr.seekTo({ clipIndex: 0, localTime: 4 })
    expect(video.currentTime).toBe(2)

    // the browser reports the frame is on screen -> newest target applied
    presented.shift()?.()
    expect(video.currentTime).toBe(4)
  })

  it('drops stale targets instead of replaying every one of them', () => {
    const { video, presented } = pacedVideo()
    const mgr = createVideoManager([video])

    mgr.seekTo({ clipIndex: 0, localTime: 1 })
    mgr.seekTo({ clipIndex: 0, localTime: 2 })
    mgr.seekTo({ clipIndex: 0, localTime: 3 })
    mgr.seekTo({ clipIndex: 0, localTime: 9 })
    presented.shift()?.()

    // 2 and 3 were superseded before the decoder was free — skip straight to 9
    expect(video.currentTime).toBe(9)
  })

  it('falls back to the seeking flag when the browser has no frame callback', () => {
    const video = fakeVideo({ seeking: false })
    const mgr = createVideoManager([video])

    mgr.seekTo({ clipIndex: 0, localTime: 2 })
    expect(video.currentTime).toBe(2)

    video.seeking = true // decoder busy
    mgr.seekTo({ clipIndex: 0, localTime: 4 })
    expect(video.currentTime).toBe(2)

    video.seeking = false // decode finished; next scroll frame applies the target
    mgr.seekTo({ clipIndex: 0, localTime: 4 })
    expect(video.currentTime).toBe(4)
  })

  // Written after the implementation, as a regression guard for the deadlock
  // watchdog rather than a driver of it: a seek that lands on the frame
  // already displayed presents no new frame, so the callback never fires.
  it('never stalls when a seek presents no new frame', async () => {
    vi.useFakeTimers()
    try {
      const { video } = pacedVideo()
      const mgr = createVideoManager([video])

      mgr.seekTo({ clipIndex: 0, localTime: 2 })
      mgr.seekTo({ clipIndex: 0, localTime: 4 })
      expect(video.currentTime).toBe(2) // gate held, nothing presented yet

      await vi.advanceTimersByTimeAsync(16 * 20)

      expect(video.currentTime).toBe(4)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('scrub instrumentation', () => {
  // "Is it smooth?" was previously argued from decode arithmetic. The manager
  // now reports what it actually did, so the browser can be measured instead
  // of guessed at. Reporting is optional: no recorder, no behaviour change.
  function fakeRecorder() {
    return {
      seekRequested: vi.fn(),
      seekSuperseded: vi.fn(),
      framePresented: vi.fn(),
    }
  }

  function pacedVideo(): { video: ManagedVideo; presented: (() => void)[] } {
    const presented: (() => void)[] = []
    const video = fakeVideo({
      requestVideoFrameCallback: (cb: () => void) => {
        presented.push(cb)
        return presented.length
      },
    })
    return { video, presented }
  }

  it('reports every seek that actually reaches the decoder', () => {
    const metrics = fakeRecorder()
    const video = fakeVideo()
    const mgr = createVideoManager([video], { metrics })
    mgr.seekTo({ clipIndex: 0, localTime: 2 })
    expect(video.currentTime).toBe(2)
    expect(metrics.seekRequested).toHaveBeenCalledTimes(1)
  })

  it('does not count a redundant seek as decoder work', () => {
    const metrics = fakeRecorder()
    const video = fakeVideo()
    video.currentTime = 3
    const mgr = createVideoManager([video], { metrics })
    mgr.seekTo({ clipIndex: 0, localTime: 3 })
    expect(metrics.seekRequested).not.toHaveBeenCalled()
  })

  it('reports a target replaced before the decoder was free, without counting a seek', () => {
    const metrics = fakeRecorder()
    const { video, presented } = pacedVideo()
    const mgr = createVideoManager([video], { metrics })

    mgr.seekTo({ clipIndex: 0, localTime: 2 }) // applied
    mgr.seekTo({ clipIndex: 0, localTime: 4 }) // waits behind the gate
    mgr.seekTo({ clipIndex: 0, localTime: 6 }) // replaces 4 — it never decoded

    expect(metrics.seekRequested).toHaveBeenCalledTimes(1)
    expect(metrics.seekSuperseded).toHaveBeenCalledTimes(1)

    presented.shift()?.()
    expect(video.currentTime).toBe(6)
    expect(metrics.seekRequested).toHaveBeenCalledTimes(2)
  })

  it('reports a frame the browser put on screen', () => {
    const metrics = fakeRecorder()
    const { video, presented } = pacedVideo()
    const mgr = createVideoManager([video], { metrics })

    mgr.seekTo({ clipIndex: 0, localTime: 2 })
    expect(metrics.framePresented).not.toHaveBeenCalled()

    presented.shift()?.()
    expect(metrics.framePresented).toHaveBeenCalledTimes(1)
  })

  it('scrubs exactly the same with no recorder attached', () => {
    const video = fakeVideo()
    const mgr = createVideoManager([video], {})
    mgr.seekTo({ clipIndex: 0, localTime: 5 })
    expect(video.currentTime).toBe(5)
  })
})
