import { useState } from 'react'
import { CONDITIONS } from './ConditionsPanel.jsx'
import './DetailTag.css'

const CONDITION_NAME = Object.fromEntries(CONDITIONS.map(c => [c.id, c]))

/** Sums condMods[key] across `keys` and collects which condition ids contributed. */
export function condAnnot(condMods, ...keys) {
  if (!condMods) return null
  let total = 0
  const ids = new Set()
  for (const k of keys) {
    total += Number(condMods[k] ?? 0)
    for (const id of condMods.sources?.[k] ?? []) ids.add(id)
  }
  return total !== 0 ? { total, sourceIds: [...ids] } : null
}

/** Small badge that shows its detail text on hover (desktop) AND on tap (mobile,
 * where :hover/title never fires) via a toggled inline popover. */
export function DetailTag({ className, symbol, value, title }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="tag-wrap">
      <span
        className={className}
        title={title}
        onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
      >
        {symbol}{value > 0 ? `+${value}` : value}
      </span>
      {open && (
        <span className="tag-popover" onClick={e => { e.stopPropagation(); setOpen(false) }}>
          {title}
        </span>
      )}
    </span>
  )
}

export function BuffTag({ info }) {
  if (!info) return null
  return <DetailTag className="buff-tag" symbol="✦" value={info.total} title={info.title} />
}

export function CondTag({ info, lang }) {
  if (!info) return null
  const L = lang === 'de'
  const title = info.sourceIds
    .map(id => CONDITION_NAME[id] ? (L ? CONDITION_NAME[id].de : CONDITION_NAME[id].en) : id)
    .join(', ')
  return <DetailTag className={`cond-tag ${info.total > 0 ? 'cond-pos' : 'cond-neg'}`} symbol="⚡" value={info.total} title={title} />
}
