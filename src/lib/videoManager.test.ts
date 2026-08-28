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
