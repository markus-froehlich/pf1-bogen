import { useState } from 'react'
import { Plus, X } from '@phosphor-icons/react'
import { Stepper } from './ui.jsx'
import { sg } from './breakdown.js'
import { appliesTo } from '../engine/condBonuses.js'

/**
 * „Bedingte Boni" in einer Aufschlüsselung: Liste (automatische + eigene) und Formular zum Hinzufügen.
 * Zählen nicht in den Wert; erscheinen in der Übersicht als eigene Kachel.
 */
export function CondBonusEditor({ target, all = [], manual = [], onChange, lang }) {
  const L = lang === 'de'
  const [value, setValue] = useState(2)
  const [text, setText] = useState('')
  const shown = all.filter(e => appliesTo(e, target))
  const add = () => {
    if (!text.trim()) return
    onChange([...manual, { id: 'cb_' + Math.random().toString(36).slice(2, 9), target, value, text: text.trim() }])
    setText('')
  }
  return (
    <div className="nc-bd-misc nc-cond-bonus">
      <span className="nc-bd-text"><span>{L ? 'Bedingte Boni' : 'Conditional bonuses'}</span>
        <span className="nc-bd-sub">{L ? 'gelten nur in bestimmten Fällen – zählen nicht in den Wert, stehen aber in der Übersicht' : 'only in certain situations – not added to the total'}</span></span>
      {shown.map(e => (
        <div key={e.id} className="nc-cond-bonus-row">
          <b>{sg(Number(e.value) || 0)}</b>
          <span className="nc-cond-bonus-text">{e.text}{e.auto && <span className="nc-bd-sub"> · {L ? 'automatisch (Regel)' : 'automatic'}</span>}{e.target === 'saves' && target !== 'saves' && <span className="nc-bd-sub"> · {L ? 'alle RW' : 'all saves'}</span>}</span>
          {!e.auto && <button className="nc-icon-btn nc-muted" onClick={() => onChange(manual.filter(x => x.id !== e.id))} aria-label={L ? 'Entfernen' : 'Remove'}><X /></button>}
        </div>
      ))}
      <div className="nc-cond-bonus-add">
        <Stepper value={value} onChange={setValue} min={-20} max={20} label={L ? 'Wert' : 'Value'} />
        <input className="nc-input" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add() }}
          placeholder={L ? 'Bedingung, z. B. gg. Gift' : 'Condition, e.g. vs. poison'} aria-label={L ? 'Bedingung' : 'Condition'} />
        <button className="nc-icon-btn nc-accent" disabled={!text.trim()} onClick={add} aria-label={L ? 'Hinzufügen' : 'Add'}><Plus /></button>
      </div>
    </div>
  )
}
