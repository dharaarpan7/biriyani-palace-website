// Lenis ⇄ GSAP ScrollTrigger synchronization.
// One Lenis instance, one ticker hookup, one master ScrollTrigger —
// scroll position is the single source of truth for the cinematic timeline.

import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

let lenis: Lenis | null = null
/** The exact ticker callback we registered, so destroy can take it back off. */
let tickerCallback: ((time: number) => void) | null = null

export function createSmoothScroll(): Lenis {
  if (lenis) return lenis

  lenis = new Lenis({
    // A lerp chases the scroll target every single frame. A fixed duration +
    // easing instead restarts a ~1s animation on every wheel event, so during
    // a continuous scroll the film is always arriving late — which is exactly
    // what reads as "not smooth".
    lerp: 0.1,
    smoothWheel: true,
    touchMultiplier: 1.6,
  })

  // Drive Lenis from GSAP's ticker so ScrollTrigger and the video scrub
  // stay perfectly in phase.
  lenis.on('scroll', ScrollTrigger.update)
  tickerCallback = (time: number) => {
    lenis?.raf(time * 1000)
  }
  gsap.ticker.add(tickerCallback)
  gsap.ticker.lagSmoothing(0)

  return lenis
}

export function getLenis(): Lenis | null {
  return lenis
}

export function destroySmoothScroll(): void {
  if (tickerCallback) {
    // Leaving it attached would step a stale Lenis — and step the next one
    // twice per frame if the stage is ever remounted.
    gsap.ticker.remove(tickerCallback)
    tickerCallback = null
  }
  if (lenis) {
    lenis.destroy()
    lenis = null
  }
}

export { gsap, ScrollTrigger }
