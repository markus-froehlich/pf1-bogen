import { Sparkle, WarningCircle, Diamond, Circle } from '@phosphor-icons/react'
import { sg } from './breakdown.js'
import { Stepper } from './ui.jsx'

const ICONS = { buff: Sparkle, cond: WarningCircle, gear: Diamond }

/** Aufschlüsselungs-Sheet: Titel + Gesamt, Zeile je Posten, „Sonstiges" + Notiz, Legende. */
export function BreakdownSheet({ bd, misc, onMisc, lang }) {
  const L = lang === 'de'
  if (!bd) return null
  const shown = bd.totalLabel ?? (bd.absolute ? String(bd.total) : sg(bd.total))
  return (
    <div className="nc-bd">
      <div className="nc-bd-head">
        <div className="nc-bd-titles">
          <span className="nc-label nc-label-tight">{L ? 'Aufschlüsselung' : 'Breakdown'}</span>
          <span className="nc-bd-title">{bd.title}</span>
        </div>
        <span className="nc-bd-total">{shown}</span>
      </div>
      <div className="nc-bd-lines">
        {bd.lines.map((line, i) => {
          const Icon = ICONS[line.kind] ?? Circle
          return (
            <div key={i} className={`nc-bd-line is-${line.kind}`}>
              <Icon className="nc-bd-icon" weight={line.kind === 'buff' || line.kind === 'cond' ? 'fill' : 'regular'} />
              <span className="nc-bd-text">
                <span className="nc-ellipsis">{line.label}</span>
                <span className="nc-bd-sub">{line.sub}</span>
              </span>
              <span className="nc-bd-val">{line.display ?? (line.raw ? line.value : sg(line.value))}</span>
            </div>
          )
        })}
        <div className="nc-bd-sum">
          <span>{L ? 'Gesamt' : 'Total'}</span>
          <span className="nc-bd-val">{shown}</span>
        </div>
      </div>
      {bd.editable && onMisc && bd.extras?.map(x => (
        <div key={x.key} className="nc-bd-misc">
          <div className="nc-bd-misc-row">
            <span className="nc-bd-text"><span>{x.label}</span><span className="nc-bd-sub">{x.sub}</span></span>
            <Stepper value={Number(misc?.[x.key] ?? 0)} onChange={v => onMisc(x.key, v)} min={x.min ?? -99} label={x.label} />
          </div>
        </div>
      ))}
      {bd.editable && onMisc && (
        <div className="nc-bd-misc">
          <div className="nc-bd-misc-row">
            <span className="nc-bd-text">
              <span>{L ? 'Sonstiges' : 'Other'}</span>
              <span className="nc-bd-sub">{L ? 'Manueller Bonus oder Malus' : 'Manual bonus or penalty'}</span>
            </span>
            <Stepper value={Number(misc?.[bd.miscKey] ?? 0)} onChange={v => onMisc(bd.miscKey, v)} label={L ? 'Sonstiges' : 'Other'} />
          </div>
          <input className="nc-input" value={misc?.[bd.noteKey] ?? ''} onChange={e => onMisc(bd.noteKey, e.target.value)}
            placeholder={L ? 'Notiz, z. B. Talent „Blitzschnelle Reflexe“' : 'Note, e.g. feat “Lightning Reflexes”'} />
        </div>
      )}
      {bd.note && <span className="nc-bd-note">{bd.note}</span>}
      <div className="nc-bd-legend">
        <span><Sparkle weight="fill" className="nc-accent-soft" />Buff</span>
        <span><WarningCircle weight="fill" className="nc-neg" />{L ? 'Zustand' : 'Condition'}</span>
        <span><Diamond className="nc-muted-icon" />{L ? 'Ausrüstung' : 'Gear'}</span>
      </div>
    </div>
  )
}
