import { describe, it, expect } from 'vitest'
import { CHAPTERS } from './chapters'

describe('CHAPTERS data', () => {
  it('defines exactly five chapters in narrative order', () => {
    expect(CHAPTERS).toHaveLength(5)
    expect(CHAPTERS.map((c) => c.name)).toEqual([
      'THE WAIT',
      'THE REVEAL',
      'THE CRAFT',
      'THE JOURNEY',
      'THE TABLE',
    ])
  })

  it('keeps copy sparse: one short headline line per chapter', () => {
    CHAPTERS.forEach((c) => {
      expect(c.headline).toBeTruthy()
      // sparse editorial copy — never paragraph walls
      expect(c.headline.length).toBeLessThanOrEqual(60)
      if (c.support) {
        expect(c.support.length).toBeLessThanOrEqual(80)
      }
    })
  })

  it('maps each chapter to its clip index 0..4 in order', () => {
    CHAPTERS.forEach((c, i) => {
      expect(c.clipIndex).toBe(i)
    })
  })

  it('keeps every label window inside 0..1 and ordered', () => {
    CHAPTERS.forEach((c) => {
      c.labels.forEach((label) => {
        expect(label.at).toBeGreaterThanOrEqual(0)
        expect(label.at).toBeLessThanOrEqual(1)
        expect(label.text).toBeTruthy()
      })
      // labels appear staggered, not simultaneously
      const ats = c.labels.map((l) => l.at)
      const sorted = [...ats].sort((a, b) => a - b)
      expect(ats).toEqual(sorted)
      const unique = new Set(ats)
      expect(unique.size).toBe(ats.length)
    })
  })
})
