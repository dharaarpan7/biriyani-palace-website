import { describe, it, expect, vi, afterEach, type Mock } from 'vitest'

// scrollController wires Lenis into GSAP's ticker — keep the test hermetic
// by mocking both animation libraries and asserting the wiring only.
vi.mock('lenis', () => {
  const Lenis = vi.fn(function (this: Record<string, unknown>) {
    this.on = vi.fn()
    this.raf = vi.fn()
    this.destroy = vi.fn()
  })
  return { default: Lenis }
})

vi.mock('gsap', () => ({
  default: {
    registerPlugin: vi.fn(),
    ticker: { add: vi.fn(), remove: vi.fn(), lagSmoothing: vi.fn() },
  },
}))

vi.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: { update: vi.fn() },
}))

import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  createSmoothScroll,
  getLenis,
  destroySmoothScroll,
} from './scrollController'

describe('scrollController', () => {
  afterEach(() => {
    destroySmoothScroll()
    vi.clearAllMocks()
  })

  it('returns no instance before the smooth scroll is created', () => {
    expect(getLenis()).toBeNull()
  })

  it('creates Lenis with cinematic settings and wires it to GSAP', () => {
    const lenis = createSmoothScroll()

    expect(Lenis).toHaveBeenCalledTimes(1)
    expect(Lenis).toHaveBeenCalledWith(
      expect.objectContaining({ smoothWheel: true, touchMultiplier: 1.6 }),
    )
    expect(lenis).toBe(getLenis())
    expect(lenis.on).toHaveBeenCalledWith('scroll', ScrollTrigger.update)
    expect(gsap.ticker.add).toHaveBeenCalledTimes(1)
    expect(gsap.ticker.lagSmoothing).toHaveBeenCalledWith(0)
  })

  it('is a singleton — a second call reuses the same instance', () => {
    const first = createSmoothScroll()
    const second = createSmoothScroll()

    expect(second).toBe(first)
    expect(Lenis).toHaveBeenCalledTimes(1)
  })

  it('destroy tears the instance down and forgets it', () => {
    const lenis = createSmoothScroll()
    destroySmoothScroll()

    expect(lenis.destroy).toHaveBeenCalled()
    expect(getLenis()).toBeNull()
  })

  it('creates a fresh instance after a destroy', () => {
    const first = createSmoothScroll()
    destroySmoothScroll()
    const second = createSmoothScroll()

    expect(second).not.toBe(first)
    expect(Lenis).toHaveBeenCalledTimes(2)
  })
})

describe('scroll follow behaviour', () => {
  afterEach(() => {
    destroySmoothScroll()
    vi.clearAllMocks()
  })

  it('follows the wheel with a lerp instead of replaying a fixed duration', () => {
    createSmoothScroll()
    const config = (Lenis as unknown as Mock).mock.calls[0][0] as Record<string, unknown>

    // A fixed duration + easing restarts a ~1s animation on every wheel event,
    // so the film keeps arriving late. A lerp chases the target every frame.
    expect(typeof config.lerp).toBe('number')
    expect(config.lerp as number).toBeGreaterThan(0)
    expect(config.lerp as number).toBeLessThan(1)
    expect(config.duration).toBeUndefined()
    expect(config.easing).toBeUndefined()
  })

  it('removes its ticker callback on destroy so nothing is stepped twice', () => {
    createSmoothScroll()
    const added = (gsap.ticker.add as unknown as Mock).mock.calls[0][0]

    destroySmoothScroll()

    expect(gsap.ticker.remove).toHaveBeenCalledWith(added)
  })

  it('does not accumulate ticker callbacks across create and destroy cycles', () => {
    createSmoothScroll()
    destroySmoothScroll()
    createSmoothScroll()

    expect(gsap.ticker.add).toHaveBeenCalledTimes(2)
    expect(gsap.ticker.remove).toHaveBeenCalledTimes(1)
  })
})
