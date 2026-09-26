import { useMemo, useState } from 'react'
import { Trash, Eye, MagnifyingGlass } from '@phosphor-icons/react'
import { Stepper } from './ui.jsx'

/**
 * Einheitliches Bearbeiten-Sheet (README „Bearbeiten, Hinzufügen, Rückgängig"):
 * Titel (+ Löschen) → Vorlagen-Chips → Felder → Vorschau → Abbrechen | Speichern.
 */
export function EditSheet({ title, onDelete, templatesLabel, templates, children, preview, onCancel, onSave, saveDisabled, saveHint, lang }) {
  const L = lang === 'de'
  return (
    <div className="nc-edit">
      <div className="nc-edit-head">
        <span className="nc-sheet-title nc-ellipsis">{title}</span>
        {onDelete && <button className="nc-btn nc-btn-ghost nc-neg" onClick={onDelete}><Trash />{L ? 'Löschen' : 'Delete'}</button>}
      </div>
      {templates?.length > 0 && (
        <Field label={templatesLabel ?? (L ? 'Vorlagen' : 'Templates')}>
          <div className="nc-chips">
            {templates.map(t => <button key={t.key} className={`nc-chip ${t.on ? 'is-on' : ''}`} onClick={t.pick}>{t.label}</button>)}
          </div>
        </Field>
      )}
      {children}
      {preview && <div className="nc-edit-preview"><Eye /><span>{preview}</span></div>}
      {saveDisabled && <span className="nc-hint nc-save-hint">{saveHint ?? (L ? 'Zum Speichern bitte einen Namen eingeben.' : 'Enter a name to save.')}</span>}
      <div className="nc-edit-actions">
        <button className="nc-btn nc-btn-secondary" onClick={onCancel}>{L ? 'Abbrechen' : 'Cancel'}</button>
        <button className="nc-btn nc-btn-primary" onClick={onSave} disabled={saveDisabled}>{L ? 'Speichern' : 'Save'}</button>
      </div>
    </div>
  )
}

export function Field({ label, hint, children }) {
  return (
    <div className="nc-edit-field">
      <span className="nc-edit-label">{label}</span>
      {children}
      {hint && <span className="nc-hint">{hint}</span>}
    </div>
  )
}

export function TextField({ label, value, onChange, placeholder, hint, area }) {
  return (
    <Field label={label} hint={hint}>
      {area
        ? <textarea className="nc-input nc-textarea" value={value ?? ''} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
        : <input className="nc-input" value={value ?? ''} placeholder={placeholder} onChange={e => onChange(e.target.value)} />}
    </Field>
  )
}

export function NumField({ label, value, onChange, min, max, format, hint }) {
  return (
    <Field label={label} hint={hint}>
      <Stepper value={Number(value) || 0} onChange={onChange} min={min} max={max} format={format ?? (v => String(v))} label={label} />
    </Field>
  )
}

/** Chips: options = [[value, label]]; multi → value ist ein Objekt {key: bool}. */
export function ChipsField({ label, options, value, onChange, hint, multi }) {
  return (
    <Field label={label} hint={hint}>
      <div className="nc-chips">
        {options.map(([v, text]) => {
          const on = multi ? !!value?.[v] : value === v
          return <button key={v} className={`nc-chip ${on ? 'is-on' : ''}`} aria-pressed={on}
            onClick={() => onChange(multi ? { ...value, [v]: !on } : v)}>{text}</button>
        })}
      </div>
    </Field>
  )
}

/** Suchfeld mit Trefferliste (für große Listen wie die 377 Waffen). */
export function SearchPick({ label, items, selectedId, onPick, placeholder, render, hint, max = 8 }) {
  const [q, setQ] = useState('')
  const hits = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (s ? items.filter(i => i.label.toLowerCase().includes(s)) : []).slice(0, max)
  }, [q, items, max])
  const selected = items.find(i => i.id === selectedId)
  return (
    <Field label={label} hint={hint}>
      <div className="nc-search">
        <MagnifyingGlass className="nc-accent-soft" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={selected ? selected.label : placeholder} />
      </div>
      {hits.length > 0 && (
        <div className="nc-search-hits">
          {hits.map(i => (
            <button key={i.id} className={`nc-search-hit ${i.id === selectedId ? 'is-on' : ''}`} onClick={() => { onPick(i); setQ('') }}>
              {render ? render(i) : <span className="nc-ellipsis">{i.label}</span>}
            </button>
          ))}
        </div>
      )}
    </Field>
  )
}
