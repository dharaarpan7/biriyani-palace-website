import { useEffect, useState } from 'react'
import { getLenis } from '../../lib/scrollController'
import './Navigation.css'

const LINKS = [
  { label: 'MENU', href: '#menu' },
  { label: 'STORY', href: '#philosophy' },
  { label: 'RESERVE', href: '#reserve' },
]

/**
 * Minimal overlay navigation: transparent over the film, quietly readable
 * over the content sections. Anchor jumps go through Lenis so the
 * cinematic scroll language is preserved.
 */
export function Navigation() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 1.2)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function handleAnchor(event: React.MouseEvent<HTMLAnchorElement>, href: string) {
    event.preventDefault()
    const target = document.querySelector(href)
    if (!target) return
    const lenis = getLenis()
    if (lenis) {
      lenis.scrollTo(target as HTMLElement, { offset: 0 })
    } else {
      ;(target as HTMLElement).scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <header className={`nav${scrolled ? ' is-scrolled' : ''}`}>
      <a
        className="nav__brand"
        href="#top"
        onClick={(e) => handleAnchor(e, '#top')}
      >
        BIRYANI PALACE
      </a>
      <nav className="nav__links" aria-label="Primary">
        {LINKS.map((link) => (
          <a key={link.href} href={link.href} onClick={(e) => handleAnchor(e, link.href)}>
            {link.label}
          </a>
        ))}
      </nav>
    </header>
  )
}
