import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChapterIndicator } from './ChapterIndicator'
import { CHAPTERS } from '../../data/chapters'

describe('ChapterIndicator', () => {
  it('renders all five chapter numerals and names', () => {
    render(<ChapterIndicator activeIndex={0} />)
    CHAPTERS.forEach((c) => {
      expect(screen.getByText(c.numeral)).toBeInTheDocument()
      expect(screen.getByText(c.name)).toBeInTheDocument()
    })
  })

  it('marks exactly one chapter as active with aria-current', () => {
    render(<ChapterIndicator activeIndex={2} />)
    const items = screen.getAllByRole('listitem')
    const active = items.filter((el) => el.getAttribute('aria-current') === 'true')
    expect(active).toHaveLength(1)
    expect(active[0].textContent).toContain(CHAPTERS[2].name)
  })

  it('is not a navigation menu (no links)', () => {
    render(<ChapterIndicator activeIndex={0} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
