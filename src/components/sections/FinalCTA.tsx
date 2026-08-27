import './sections.css'

/** The close — confidence and restraint. */
export function FinalCTA() {
  return (
    <section className="section section--cta" aria-labelledby="cta-title">
      <h2 className="section-title section--cta__title" id="cta-title">
        COME HUNGRY.<br />
        LEAVE REMEMBERING.
      </h2>
      <div className="section--cta__actions">
        <a className="btn btn--solid" href="#reserve">
          RESERVE A TABLE
        </a>
        <a className="btn" href="#menu">
          VIEW THE MENU
        </a>
      </div>
    </section>
  )
}
