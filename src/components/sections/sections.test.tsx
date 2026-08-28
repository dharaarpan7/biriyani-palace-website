import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Philosophy } from './Philosophy'
import { MenuSection } from './MenuSection'
import { Signature } from './Signature'
import { Experience } from './Experience'
import { FinalCTA } from './FinalCTA'
import { Footer } from './Footer'
import { MENU } from '../../data/menu'

// jsdom has no media implementation — Signature's ref calls video.pause().
beforeAll(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
})

describe('Philosophy', () => {
  it('renders the philosophy statement with its anchor id', () => {
    render(<Philosophy />)
    const section = document.getElementById('philosophy')
    expect(section).not.toBeNull()
    expect(screen.getByText('OUR PHILOSOPHY')).toBeInTheDocument()
    expect(
      screen.getByText(/Slow fire\. Fragrant rice\./),
    ).toBeInTheDocument()
  })
})

describe('MenuSection', () => {
  it('renders every menu group with its items and rupee prices', () => {
    render(<MenuSection />)
    for (const group of MENU) {
      expect(screen.getByRole('heading', { name: group.title })).toBeInTheDocument()
      for (const item of group.items) {
        expect(screen.getByText(item.name)).toBeInTheDocument()
        // prices can repeat across the menu (e.g. two ₹380 dishes)
        expect(screen.getAllByText(`₹${item.price}`).length).toBeGreaterThan(0)
      }
    }
  })

  it('renders item notes as emphasis inside the item name', () => {
    render(<MenuSection />)
    const noted = MENU.flatMap((g) => g.items).filter((i) => i.note)
    for (const item of noted) {
      const note = screen.getByText(item.note as string)
      expect(note.tagName).toBe('EM')
    }
  })
})

describe('Signature', () => {
  it('renders the signature still as a paused video frame, never autoplaying', () => {
    render(<Signature />)
    const video = document.querySelector('video.signature__still') as HTMLVideoElement
    expect(video).not.toBeNull()
    // React renders `muted` as a DOM property, not an attribute
    expect(video.muted).toBe(true)
    expect(video).toHaveAttribute('playsinline')
    expect(video.getAttribute('autoplay')).toBe(null)
    expect(video.getAttribute('aria-hidden')).toBe('true')
  })

  it('announces the signature headline', () => {
    render(<Signature />)
    expect(screen.getByText(/A sealed pot\. A slow fire\./)).toBeInTheDocument()
  })
})

describe('Experience', () => {
  it('renders the dining room details as a definition list', () => {
    render(<Experience />)
    expect(screen.getByText('THE DINING ROOM')).toBeInTheDocument()
    expect(screen.getByText('DINNER')).toBeInTheDocument()
    expect(screen.getByText('12:00 PM — 11:30 PM')).toBeInTheDocument()
    expect(screen.getByText('RESERVATIONS')).toBeInTheDocument()
    expect(screen.getByText('Recommended')).toBeInTheDocument()
    expect(screen.getByText('PRIVATE DINING')).toBeInTheDocument()
    expect(screen.getByText('Available')).toBeInTheDocument()
    expect(document.querySelectorAll('dl.experience__details')).toHaveLength(1)
  })
})

describe('FinalCTA', () => {
  it('renders the closing call to action with both anchor buttons', () => {
    render(<FinalCTA />)
    expect(screen.getByText(/COME HUNGRY\./)).toBeInTheDocument()
    const reserve = screen.getByRole('link', { name: 'RESERVE A TABLE' })
    const menu = screen.getByRole('link', { name: 'VIEW THE MENU' })
    expect(reserve).toHaveAttribute('href', '#reserve')
    expect(menu).toHaveAttribute('href', '#menu')
  })
})

describe('Footer', () => {
  it('renders the brand and the closing line', () => {
    render(<Footer />)
    expect(screen.getByText('BIRYANI PALACE')).toBeInTheDocument()
    expect(
      screen.getByText('Slow fire. Deep flavor. Worth the wait.'),
    ).toBeInTheDocument()
  })
})
