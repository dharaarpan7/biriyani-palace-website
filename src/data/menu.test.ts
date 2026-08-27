import { describe, it, expect } from 'vitest'
import { MENU } from './menu'

describe('MENU data', () => {
  it('has BIRYANI, FROM THE KITCHEN and ACCOMPANIMENTS sections', () => {
    const sections = MENU.map((s) => s.title)
    expect(sections).toContain('BIRYANI')
    expect(sections).toContain('FROM THE KITCHEN')
    expect(sections).toContain('ACCOMPANIMENTS')
  })

  it('gives every item a name and a numeric price', () => {
    MENU.forEach((section) => {
      expect(section.items.length).toBeGreaterThan(0)
      section.items.forEach((item) => {
        expect(item.name).toBeTruthy()
        expect(item.price).toBeGreaterThan(0)
        expect(Number.isFinite(item.price)).toBe(true)
      })
    })
  })

  it('includes the signature biryanis from the brief', () => {
    const biryani = MENU.find((s) => s.title === 'BIRYANI')
    const names = biryani!.items.map((i) => i.name)
    expect(names).toContain('Classic Chicken Biryani')
    expect(names).toContain('Royal Mutton Biryani')
    expect(names).toContain('Palace Special Biryani')
  })
})
