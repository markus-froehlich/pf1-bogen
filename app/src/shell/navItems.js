import { Sword, User, ListChecks, MagicWand, Backpack, DotsThreeOutline } from '@phosphor-icons/react'

// Tab-IDs bleiben die bisherigen (Store/State unverändert); nur Beschriftung/Icons neu.
export const NAV_ITEMS = {
  combat:    { Icon: Sword,            de: 'Kampf',    en: 'Combat' },
  attr:      { Icon: User,             de: 'Char',     en: 'Char' },
  skills:    { Icon: ListChecks,       de: 'Fähigk.',  en: 'Skills' },
  spells:    { Icon: MagicWand,        de: 'Zauber',   en: 'Spells' },
  inventory: { Icon: Backpack,         de: 'Inventar', en: 'Inventory' },
  more:      { Icon: DotsThreeOutline, de: 'Mehr',     en: 'More' },
}

export function initials(name) {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}
