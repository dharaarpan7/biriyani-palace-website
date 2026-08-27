import { CHAPTERS } from '../../data/chapters'
import './ChapterIndicator.css'

interface ChapterIndicatorProps {
  activeIndex: number
}

/**
 * A cinematic chapter indicator — quiet list of numerals + names,
 * exactly one active chapter, never a navigation menu.
 */
export function ChapterIndicator({ activeIndex }: ChapterIndicatorProps) {
  return (
    <ol className="chapter-indicator" aria-label="Cinematic chapters">
      {CHAPTERS.map((chapter, index) => {
        const active = index === activeIndex
        return (
          <li
            key={chapter.numeral}
            aria-current={active ? 'true' : undefined}
            className={`chapter-indicator__item${active ? ' is-active' : ''}`}
          >
            <span className="chapter-indicator__numeral">{chapter.numeral}</span>
            <span className="chapter-indicator__name">{chapter.name}</span>
          </li>
        )
      })}
    </ol>
  )
}
