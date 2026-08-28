import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Loader } from './Loader'

describe('Loader', () => {
  it('announces itself as a status region while visible', () => {
    render(<Loader visible />)
    const loader = screen.getByText('BIRYANI PALACE').closest('.loader')
    expect(loader).toHaveAttribute('role', 'status')
    expect(loader).toHaveAttribute('aria-hidden', 'false')
    expect(loader).not.toHaveClass('is-done')
  })

  it('shows the brand and the preparing line', () => {
    render(<Loader visible />)
    expect(screen.getByText('BIRYANI PALACE')).toBeInTheDocument()
    expect(screen.getByText('PREPARING THE EXPERIENCE')).toBeInTheDocument()
  })

  it('fades to the done state without a role once hidden', () => {
    const { container } = render(<Loader visible={false} />)
    const loader = container.querySelector('.loader')
    expect(loader).toHaveClass('is-done')
    expect(loader).toHaveAttribute('aria-hidden', 'true')
    expect(loader).not.toHaveAttribute('role')
  })
})
