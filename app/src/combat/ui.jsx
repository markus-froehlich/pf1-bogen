import { Sparkle, WarningCircle, Minus, Plus, PencilSimple } from '@phosphor-icons/react'
import { sg } from './breakdown.js'

/**
 * Kampf-Bereich: Überschrift (antippen = Bereich bearbeiten, Stift rechts) + Werte als Kacheln.
 * `summary` als Liste → Kacheln; Kachel mit eigener Schnellaktion (onClick), sonst öffnet sie den Bereich.
 * Ohne Liste werden `children` gezeigt (z. B. die TP-Karte).
 */
export function SectionFrame({ id, label, summary, onEdit, editLabel, action, children, innerRef }) {
  const chips = Array.isArray(summary)
  return (
    <section className="nc-section" data-section={id} ref={innerRef}>
      <div className="nc-section-head">
        <button className="nc-section-toggle" onClick={() => onEdit(id)} aria-label={editLabel ?? label}>
          <span className="nc-section-label">{label}</span>
          {!chips && summary && <span className="nc-section-summary">{summary}</span>}
        </button>
        {action}
        <button className="nc-icon-btn nc-section-edit" onClick={() => onEdit(id)} aria-label={editLabel ?? label} title={editLabel ?? label}><PencilSimple /></button>
      </div>
      {chips ? (
        <div className="nc-section-chips">
          {summary.map(c => (
            <button key={c.key} className={`nc-sum-chip ${c.tone ? `is-${c.tone}` : ''}`} onClick={c.onClick ?? (() => onEdit(id))} aria-pressed={c.pressed}>
              {(c.tone === 'buff' || c.tone === 'up') && <Sparkle weight="fill" />}{(c.tone === 'cond' || c.tone === 'down') && <WarningCircle weight="fill" />}
              {c.icon}
              <span className="nc-sum-chip-label">{c.label}</span>{c.value && <b>{c.value}</b>}{c.sub && <span className="nc-sum-chip-sub">{c.sub}</span>}
            </button>
          ))}
        </div>
      ) : children}
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
