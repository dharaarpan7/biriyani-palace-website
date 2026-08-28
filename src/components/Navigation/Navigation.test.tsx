import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

const getLenis = vi.fn()

vi.mock('../../lib/scrollController', () => ({
  getLenis: (...args: unknown[]) => getLenis(...args),
}))

import { Navigation } from './Navigation'

describe('Navigation', () => {
  beforeEach(() => {
    getLenis.mockReset()
    window.scrollY = 0
  })

  afterEach(() => {
    window.scrollY = 0
  })

  it('renders the brand and the three primary links', () => {
    render(<Navigation />)
    expect(screen.getByRole('link', { name: 'BIRYANI PALACE' })).toHaveAttribute('href', '#top')
    expect(screen.getByRole('link', { name: 'MENU' })).toHaveAttribute('href', '#menu')
    expect(screen.getByRole('link', { name: 'STORY' })).toHaveAttribute('href', '#philosophy')
    expect(screen.getByRole('link', { name: 'RESERVE' })).toHaveAttribute('href', '#reserve')
  })

  it('stays transparent at the top of the page', () => {
    render(<Navigation />)
    expect(document.querySelector('header.nav')).not.toHaveClass('is-scrolled')
  })

  it('marks itself scrolled once past 1.2 viewports', () => {
    render(<Navigation />)
    act(() => {
      window.scrollY = window.innerHeight * 1.5
      window.dispatchEvent(new Event('scroll'))
    })
    expect(document.querySelector('header.nav')).toHaveClass('is-scrolled')
  })

  it('unmarks itself when scrolled back up', () => {
    render(<Navigation />)
    act(() => {
      window.scrollY = window.innerHeight * 1.5
      window.dispatchEvent(new Event('scroll'))
    })
    act(() => {
      window.scrollY = 0
      window.dispatchEvent(new Event('scroll'))
    })
    expect(document.querySelector('header.nav')).not.toHaveClass('is-scrolled')
  })

  it('routes anchor jumps through Lenis when it is available', () => {
    const scrollTo = vi.fn()
    getLenis.mockReturnValue({ scrollTo })
    const menuTarget = document.createElement('div')
    menuTarget.id = 'menu'
    document.body.appendChild(menuTarget)

    render(<Navigation />)
    const click = new MouseEvent('click', { bubbles: true, cancelable: true })
    Object.defineProperty(click, 'preventDefault', { value: vi.fn() })
    fireEvent(screen.getByRole('link', { name: 'MENU' }), click)

    expect(click.preventDefault).toHaveBeenCalled()
    expect(getLenis).toHaveBeenCalled()
    expect(scrollTo).toHaveBeenCalledWith(menuTarget, { offset: 0 })
    menuTarget.remove()
  })

  it('falls back to native smooth scrollIntoView without Lenis', () => {
    getLenis.mockReturnValue(null)
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    const reserveTarget = document.createElement('div')
    reserveTarget.id = 'reserve'
    document.body.appendChild(reserveTarget)

    render(<Navigation />)
    fireEvent.click(screen.getByRole('link', { name: 'RESERVE' }))

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' })
    reserveTarget.remove()
    delete (Element.prototype as unknown as Record<string, unknown>).scrollIntoView
  })

  it('ignores clicks whose target section does not exist', () => {
    getLenis.mockReturnValue(null)
    render(<Navigation />)
    // No #philosophy element in this document.
    expect(() =>
      fireEvent.click(screen.getByRole('link', { name: 'STORY' })),
    ).not.toThrow()
    expect(getLenis).not.toHaveBeenCalled()
  })
})
