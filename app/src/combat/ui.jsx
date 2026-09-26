import { CaretDown, Sparkle, WarningCircle, Minus, Plus } from '@phosphor-icons/react'
import { sg } from './breakdown.js'

/** Bereich mit einklappbarer Überschrift (Caret dreht), Zusammenfassung wenn zu, optionale Aktion rechts. */
export function SectionFrame({ id, label, summary, collapsed, onToggle, action, children, innerRef }) {
  return (
    <section className="nc-section" data-section={id} ref={innerRef}>
      <div className="nc-section-head">
        <button className="nc-section-toggle" onClick={() => onToggle(id)} aria-expanded={!collapsed}>
          <CaretDown className={`nc-caret ${collapsed ? 'is-shut' : ''}`} />
          <span className="nc-section-label">{label}</span>
          {collapsed && summary && <span className="nc-section-summary">{summary}</span>}
        </button>
        {action}
      </div>
      {!collapsed && children}
    </section>
  )
}

/** ✦ +2 (Buff) / ⚠ −2 (Zustand) — Icon + Farbe, damit ohne Farbe unterscheidbar. */
export function ValueTags({ buff, cond }) {
  return (
    <>
      {buff ? <span className="nc-vtag is-buff"><Sparkle weight="fill" />{sg(buff)}</span> : null}
      {cond ? <span className="nc-vtag is-cond"><WarningCircle weight="fill" />{sg(cond)}</span> : null}
    </>
  )
}

export function Stepper({ value, onChange, min = -99, max = 99, format = v => (v ? sg(v) : '0'), label }) {
  return (
    <div className="nc-stepper" aria-label={label}>
      <button className="nc-step-btn" onClick={() => onChange(Math.max(min, value - 1))} aria-label="−"><Minus /></button>
      <span className="nc-step-val">{format(value)}</span>
      <button className="nc-step-btn" onClick={() => onChange(Math.min(max, value + 1))} aria-label="+"><Plus /></button>
    </div>
  )
}

export function Switch({ on }) {
  return <span className={`nc-switch ${on ? 'is-on' : ''}`}><span className="nc-switch-knob" /></span>
}

/** Karte mit Liste (Zeilen mit Trennern) + optionaler „… anlegen"-Zeile. */
export function ListCard({ children, empty, emptyText, addLabel, onAdd }) {
  return (
    <div className="nc-card nc-card-list">
      {children}
      {empty && <span className="nc-empty">{emptyText}</span>}
      {onAdd && (
        <button className="nc-add-row" onClick={onAdd}><Plus />{addLabel}</button>
      )}
    </div>
  )
}
