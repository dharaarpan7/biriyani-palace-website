// Menu data — placeholder prices, structured so it can be replaced wholesale.

export interface MenuItem {
  name: string
  note?: string
  price: number
}

export interface MenuSection {
  title: string
  note?: string
  items: MenuItem[]
}

export const MENU: MenuSection[] = [
  {
    title: 'BIRYANI',
    note: 'Every pot sealed, every fire slow.',
    items: [
      { name: 'Classic Chicken Biryani', note: 'The house standard', price: 380 },
      { name: 'Royal Mutton Biryani', note: 'Slow-cooked overnight', price: 520 },
      { name: 'Saffron Chicken Dum Biryani', price: 440 },
      { name: 'Palace Special Biryani', note: 'The chef’s own composition', price: 640 },
    ],
  },
  {
    title: 'FROM THE KITCHEN',
    items: [
      { name: 'Seekh Kebab', price: 320 },
      { name: 'Chicken Tikka', price: 340 },
      { name: 'Mutton Kebab', price: 380 },
      { name: 'Paneer Tikka', price: 300 },
    ],
  },
  {
    title: 'ACCOMPANIMENTS',
    items: [
      { name: 'Burhani Raita', price: 90 },
      { name: 'Fresh Salad', price: 120 },
      { name: 'Mint Chutney', price: 60 },
      { name: 'Traditional Pickles', price: 70 },
    ],
  },
]
