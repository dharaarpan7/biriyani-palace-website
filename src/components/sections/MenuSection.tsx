import { MENU } from '../../data/menu'
import './sections.css'

/** Editorial menu — a quiet list with leaders, never a grid of cards. */
export function MenuSection() {
  return (
    <section id="menu" className="section section--menu" aria-labelledby="menu-title">
      <p className="eyebrow">THE MENU</p>
      <h2 className="section-title" id="menu-title">
        Worth the wait.
      </h2>

      <div className="menu">
        {MENU.map((section) => (
          <div key={section.title} className="menu__group">
            <h3 className="menu__group-title">{section.title}</h3>
            {section.note && <p className="menu__group-note">{section.note}</p>}
            <ul className="menu__list">
              {section.items.map((item) => (
                <li key={item.name} className="menu__item">
                  <span className="menu__item-name">
                    {item.name}
                    {item.note && <em className="menu__item-note">{item.note}</em>}
                  </span>
                  <span className="menu__item-leader" aria-hidden="true" />
                  <span className="menu__item-price">₹{item.price}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
