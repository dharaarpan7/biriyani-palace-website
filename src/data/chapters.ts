// Chapter configuration for the five-part cinematic journey.
// Copy is deliberately sparse: small meaningful lines, never paragraph walls.
// Everything here is data-driven — names, copy, labels and their scroll
// positions can be changed without touching the animation system.

export interface ChapterLabel {
  text: string
  /** where inside the chapter (0..1) this label appears */
  at: number
}

export interface Chapter {
  numeral: string
  name: string
  clipIndex: number
  headline: string
  support?: string
  labels: ChapterLabel[]
}

export const CLIP_COUNT = 5

/** The three opening statements, shown inside chapter 01 as the visitor starts scrolling. */
export const INTRO_LINES: ChapterLabel[] = [
  { text: 'Some dishes are cooked.', at: 0.08 },
  { text: 'Some are prepared.', at: 0.26 },
  { text: 'Some are waited for.', at: 0.44 },
]

export const CHAPTERS: Chapter[] = [
  {
    numeral: '01',
    name: 'THE WAIT',
    clipIndex: 0,
    headline: 'Before the first grain is served, there is patience.',
    support: 'SEALED. SLOW. UNHURRIED.',
    labels: [],
  },
  {
    numeral: '02',
    name: 'THE REVEAL',
    clipIndex: 1,
    headline: 'Steam keeps secrets.',
    labels: [
      { text: 'BASMATI', at: 0.15 },
      { text: 'SAFFRON', at: 0.32 },
      { text: 'FRIED ONION', at: 0.49 },
      { text: 'MINT', at: 0.66 },
      { text: 'SLOW-COOKED MEAT', at: 0.83 },
    ],
  },
  {
    numeral: '03',
    name: 'THE CRAFT',
    clipIndex: 2,
    headline: 'Layer by layer.',
    labels: [
      { text: 'LONG-GRAIN BASMATI', at: 0.2 },
      { text: 'AGED SPICES', at: 0.4 },
      { text: 'SAFFRON', at: 0.6 },
      { text: 'DUM COOKED', at: 0.8 },
    ],
  },
  {
    numeral: '04',
    name: 'THE JOURNEY',
    clipIndex: 3,
    headline: 'From our fire to your table.',
    support: 'WHERE TRADITION MEETS THE TABLE',
    labels: [],
  },
  {
    numeral: '05',
    name: 'THE TABLE',
    clipIndex: 4,
    headline: 'Come hungry. Leave remembering.',
    labels: [],
  },
]
