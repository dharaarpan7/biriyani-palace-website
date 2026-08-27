import './sections.css'

/** The dining room, in understated editorial detail — not dashboard widgets. */
export function Experience() {
  return (
    <section className="section section--experience" aria-labelledby="experience-title">
      <p className="eyebrow">THE DINING ROOM</p>
      <h2 className="section-title" id="experience-title">
        Where tradition meets the table.
      </h2>

      <dl className="experience__details">
        <div className="experience__detail">
          <dt>DINNER</dt>
          <dd>12:00 PM — 11:30 PM</dd>
        </div>
        <div className="experience__detail">
          <dt>RESERVATIONS</dt>
          <dd>Recommended</dd>
        </div>
        <div className="experience__detail">
          <dt>PRIVATE DINING</dt>
          <dd>Available</dd>
        </div>
      </dl>
    </section>
  )
}
