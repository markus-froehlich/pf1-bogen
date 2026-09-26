import { DotsThreeOutline, NotePencil, CaretDown, CaretLeft, MagnifyingGlass } from '@phosphor-icons/react'
import { NAV_ITEMS, initials } from './navItems.js'

/** Kopf: Avatar + Name + „Volk · Klasse Stufe · Spieler"; rechts Notizen und ⋯ (Mehr). */
export function AppHeader({ name, subline, onOpenChars, onOpenNotes, onOpenSearch, onOpenMore, showMore, moreActive, syncDot, sub, lang }) {
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
      {onOpenSearch && (
        <button className="nc-icon-btn" onClick={onOpenSearch} title={L ? 'Suche (⌘/Strg + K)' : 'Search (⌘/Ctrl + K)'} aria-label={L ? 'Suche' : 'Search'}>
          <MagnifyingGlass />
        </button>
      )}
      <button className="nc-icon-btn nc-head-notes" onClick={onOpenNotes} title={L ? 'Notizen' : 'Notes'} aria-label={L ? 'Notizen' : 'Notes'}>
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
