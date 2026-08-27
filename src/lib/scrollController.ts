// Lenis ⇄ GSAP ScrollTrigger synchronization.
// One Lenis instance, one ticker hookup, one master ScrollTrigger —
// scroll position is the single source of truth for the cinematic timeline.

import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

let lenis: Lenis | null = null

export function createSmoothScroll(): Lenis {
  if (lenis) return lenis

  lenis = new Lenis({
    // Fluid but responsive — long enough to glide, short enough that the
    // film tracks the visitor's input without trailing behind it.
    duration: 1,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.6,
  })

  // Drive Lenis from GSAP's ticker so ScrollTrigger and the video scrub
  // stay perfectly in phase.
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => {
    lenis?.raf(time * 1000)
  })
  gsap.ticker.lagSmoothing(0)

  return lenis
}

export function getLenis(): Lenis | null {
  return lenis
}

export function destroySmoothScroll(): void {
  if (lenis) {
    lenis.destroy()
    lenis = null
  }
}

export { gsap, ScrollTrigger }
