import {
  Sword, User, ListChecks, MagicWand, Backpack, DotsThreeOutline, NotePencil, CaretDown, CaretLeft,
} from '@phosphor-icons/react'

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

/** Kopf: Avatar + Name + „Volk · Klasse Stufe · Spieler"; rechts Notizen und ⋯ (Mehr). */
export function AppHeader({ name, subline, onOpenChars, onOpenNotes, onOpenMore, showMore, moreActive, syncDot, sub, lang }) {
  const L = lang === 'de'
  if (sub) {
    return (
      <div className="nc-head nc-head-sub">
        <button className="nc-icon-btn nc-accent" onClick={sub.onBack} aria-label={L ? 'Zurück' : 'Back'}><CaretLeft /></button>
        <span className="nc-head-subtitle">{sub.title}</span>
      </div>
    )
  }
  return (
    <div className="nc-head">
      <button className="nc-head-char" onClick={onOpenChars}>
        <span className="nc-avatar">{initials(name)}</span>
        <span className="nc-head-text">
          <span className="nc-head-name">
            <span className="nc-ellipsis">{name || (L ? 'Unbenannt' : 'Unnamed')}</span>
            <CaretDown className="nc-head-caret" />
          </span>
          <span className="nc-head-subline nc-ellipsis">{subline}</span>
        </span>
      </button>
      <button className="nc-icon-btn" onClick={onOpenNotes} title={L ? 'Notizen' : 'Notes'} aria-label={L ? 'Notizen' : 'Notes'}>
        <NotePencil />
      </button>
      {showMore && (
        <button className={`nc-icon-btn ${moreActive ? 'is-active' : ''}`} onClick={onOpenMore} title={L ? 'Mehr' : 'More'} aria-label={L ? 'Mehr' : 'More'}>
          <DotsThreeOutline />
          {syncDot && <span className={`nc-sync-dot is-${syncDot}`} />}
        </button>
      )}
    </div>
  )
}

/** Untere Leiste (Handy) bzw. Navigationsschiene (Tablet/Desktop). */
export function NavBar({ items, active, onSelect, layout, lang }) {
  const L = lang === 'de'
  return (
    <nav className={`nc-nav ${layout === 'phone' ? 'is-bar' : 'is-rail'}`}>
      {items.map(id => {
        const item = NAV_ITEMS[id]
        const on = active === id
        return (
          <button key={id} className={`nc-nav-btn ${on ? 'is-active' : ''}`} onClick={() => onSelect(id)} aria-current={on ? 'page' : undefined}>
            <span className="nc-nav-mark" />
            <item.Icon weight={on ? 'fill' : 'regular'} className="nc-nav-icon" />
            <span className="nc-nav-label">{L ? item.de : item.en}</span>
          </button>
        )
      })}
    </nav>
  )
}
