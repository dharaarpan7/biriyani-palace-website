import './sections.css'

/** The story after the film — one restrained statement, nothing more. */
export function Philosophy() {
  return (
    <section id="philosophy" className="section section--philosophy" aria-labelledby="philosophy-title">
      <p className="eyebrow">OUR PHILOSOPHY</p>
      <h2 className="section-title" id="philosophy-title">
        Slow fire. Fragrant rice.<br />
        Patience without compromise.
      </h2>
      <p className="section-line">
        Every pot is sealed, every fire is slow, and nothing leaves the kitchen
        before it is ready.
      </p>
    </section>
  )
}
