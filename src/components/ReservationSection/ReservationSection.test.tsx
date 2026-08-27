import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ReservationSection } from './ReservationSection'

describe('ReservationSection', () => {
  it('renders the headline YOUR TABLE IS READY. and all six fields', () => {
    render(<ReservationSection />)
    expect(screen.getByText('YOUR TABLE IS READY.')).toBeInTheDocument()
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/time/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/guests/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reserve a table/i })).toBeInTheDocument()
  })

  it('labels every field (accessibility)', () => {
    render(<ReservationSection />)
    const fields = screen
      .getAllByLabelText(/./)
      .filter((el) => ['INPUT', 'SELECT'].includes(el.tagName))
    expect(fields.length).toBeGreaterThanOrEqual(6)
  })

  it('shows an elegant confirmation state after submit — without pretending it was sent', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    render(<ReservationSection />)

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Aisha' } })
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'aisha@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '9876543210' } })
    fireEvent.change(screen.getByLabelText(/date/i), { target: { value: '2026-09-01' } })
    fireEvent.change(screen.getByLabelText(/time/i), { target: { value: '19:30' } })
    fireEvent.change(screen.getByLabelText(/guests/i), { target: { value: '2' } })

    fireEvent.click(screen.getByRole('button', { name: /reserve a table/i }))

    // honest front-end confirmation, no network activity
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(
      await screen.findByText(/we.*noted your request|table is being prepared/i),
    ).toBeInTheDocument()
    fetchSpy.mockRestore()
  })

  it('requires the essential fields before confirming', () => {
    render(<ReservationSection />)
    const name = screen.getByLabelText(/name/i) as HTMLInputElement
    expect(name.required).toBe(true)
    expect(screen.getByLabelText(/email/i).hasAttribute('required')).toBe(true)
  })
})
