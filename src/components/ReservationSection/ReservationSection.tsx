import { useState, type FormEvent } from 'react'
import './ReservationSection.css'

/**
 * Front-end only reservation experience. There is no backend: on submit we
 * show an honest confirmation that the request has been noted locally —
 * we never pretend the reservation was transmitted.
 */
export function ReservationSection() {
  const [confirmed, setConfirmed] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setConfirmed(true)
  }

  return (
    <section className="reservation" id="reserve" aria-labelledby="reservation-title">
      <div className="reservation__inner">
        <p className="reservation__eyebrow">RESERVATIONS</p>
        <h2 className="reservation__title" id="reservation-title">
          YOUR TABLE IS READY.
        </h2>

        {confirmed ? (
          <div className="reservation__confirmation" role="status">
            <p className="reservation__confirmation-line">
              We’ve noted your request.
            </p>
            <p className="reservation__confirmation-sub">
              Our team will be in touch to confirm your table.
            </p>
          </div>
        ) : (
          <form className="reservation__form" onSubmit={handleSubmit}>
            <div className="reservation__field">
              <label htmlFor="reservation-date">Date</label>
              <input id="reservation-date" name="date" type="date" required />
            </div>

            <div className="reservation__field">
              <label htmlFor="reservation-time">Time</label>
              <input id="reservation-time" name="time" type="time" required defaultValue="19:30" />
            </div>

            <div className="reservation__field">
              <label htmlFor="reservation-guests">Guests</label>
              <select id="reservation-guests" name="guests" defaultValue="2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'guest' : 'guests'}
                  </option>
                ))}
              </select>
            </div>

            <div className="reservation__field">
              <label htmlFor="reservation-name">Name</label>
              <input id="reservation-name" name="name" type="text" autoComplete="name" required />
            </div>

            <div className="reservation__field">
              <label htmlFor="reservation-email">Email</label>
              <input
                id="reservation-email"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
            </div>

            <div className="reservation__field">
              <label htmlFor="reservation-phone">Phone</label>
              <input
                id="reservation-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                required
              />
            </div>

            <div className="reservation__submit">
              <button type="submit" className="btn btn--solid">
                RESERVE A TABLE
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}
