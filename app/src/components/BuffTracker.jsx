import { useState } from 'react'
import { BUFF_STATS } from '../engine/buffs.js'
import './BuffTracker.css'

function genId() { return Math.random().toString(36).slice(2, 10) }

const EMPTY_BONUSES = Object.fromEntries(BUFF_STATS.map(s => [s.key, 0]))

const CAT_LABELS = { attr: 'Attribute', combat: 'Kampf', saves: 'Rettungswürfe', other: 'Sonstiges' }

export function BuffTracker({ char, setActiveBuffs, lang, hideTitle = false }) {
  const L = lang === 'de'
  const buffs = char.active_buffs ?? []
  const [editing, setEditing] = useState(null) // null = closed, 'new' or buff.id
  const [form, setForm] = useState({ name: '', bonuses: { ...EMPTY_BONUSES } })
  const [open, setOpen] = useState(true)

  const activeCount = buffs.filter(b => b.active).length

  function startNew() {
    setForm({ name: '', bonuses: { ...EMPTY_BONUSES } })
    setEditing('new')
  }

  function startEdit(b) {
    setForm({ name: b.name, bonuses: { ...EMPTY_BONUSES, ...b.bonuses } })
    setEditing(b.id)
  }

  function save() {
    const hasBonus = BUFF_STATS.some(s => Number(form.bonuses[s.key]) !== 0)
    if (!form.name.trim() && !hasBonus) { setEditing(null); return }
    if (editing === 'new') {
      setActiveBuffs(prev => [...prev, { id: genId(), name: form.name.trim() || 'Buff', active: true, bonuses: { ...form.bonuses } }])
    } else {
      setActiveBuffs(prev => prev.map(b => b.id === editing ? { ...b, name: form.name.trim() || b.name, bonuses: { ...form.bonuses } } : b))
    }
    setEditing(null)
  }

  function del(id) { setActiveBuffs(prev => prev.filter(b => b.id !== id)) }
  function toggle(id) { setActiveBuffs(prev => prev.map(b => b.id === id ? { ...b, active: !b.active } : b)) }

  function setBonusField(key, val) {
    setForm(f => ({ ...f, bonuses: { ...f.bonuses, [key]: Number(val) || 0 } }))
  }

  // Group BUFF_STATS by category for form display
  const cats = ['attr', 'combat', 'saves', 'other']
  const bycat = Object.fromEntries(cats.map(c => [c, BUFF_STATS.filter(s => s.cat === c)]))

  function summaryStr(bonuses) {
    return BUFF_STATS
      .filter(s => Number(bonuses[s.key]) !== 0)
      .map(s => `${s.de} ${Number(bonuses[s.key]) > 0 ? '+' : ''}${bonuses[s.key]}`)
      .join(' · ')
  }

  return (
    <div className="bt-panel">
      {!hideTitle && (
        <div className="bt-header" onClick={() => setOpen(o => !o)}>
          <span className="bt-title">{L ? 'Buffs / Effekte' : 'Buffs / Effects'}</span>
          {activeCount > 0 && <span className="bt-active-badge">{activeCount} {L ? 'aktiv' : 'active'}</span>}
          <span className="bt-toggle-icon">{open ? '▴' : '▾'}</span>
        </div>
      )}
      {(hideTitle || open) && (
        <div className="bt-body">
          {buffs.map(b => (
            <div key={b.id} className={`bt-entry ${b.active ? 'bt-entry-active' : ''}`}>
              <button className={`bt-toggle ${b.active ? 'on' : 'off'}`} onClick={() => toggle(b.id)} title={b.active ? 'Deaktivieren' : 'Aktivieren'}>
                {b.active ? '●' : '○'}
              </button>
              <div className="bt-entry-info" onClick={() => startEdit(b)}>
                <span className="bt-entry-name">{b.name}</span>
                {summaryStr(b.bonuses) && <span className="bt-entry-summary">{summaryStr(b.bonuses)}</span>}
              </div>
              <button className="bt-del" onClick={() => del(b.id)} title="Löschen">×</button>
            </div>
          ))}
          {buffs.length === 0 && <div className="bt-empty">{L ? 'Keine aktiven Buffs' : 'No active buffs'}</div>}

          {editing !== null ? (
            <div className="bt-form">
              <input
                className="bt-form-name"
                placeholder={L ? 'Name (z.B. Heldenmut, Unsichtbarkeit…)' : 'Name (e.g. Heroism, Invisibility…)'}
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                autoFocus
              />
              <div className="bt-form-cats">
                {cats.map(cat => (
                  <div key={cat} className="bt-form-cat">
                    <div className="bt-form-cat-label">{CAT_LABELS[cat]}</div>
                    <div className="bt-form-stat-grid">
                      {bycat[cat].map(s => (
                        <label key={s.key} className="bt-form-stat">
                          <span className="bt-form-stat-name">{s.de}</span>
                          <input
                            type="number"
                            className="bt-form-stat-input"
                            value={form.bonuses[s.key] || ''}
                            placeholder="0"
                            onChange={e => setBonusField(s.key, e.target.value)}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="bt-form-actions">
                <button className="bt-form-save" onClick={save}>{L ? 'Speichern' : 'Save'}</button>
                <button className="bt-form-cancel" onClick={() => setEditing(null)}>{L ? 'Abbrechen' : 'Cancel'}</button>
              </div>
            </div>
          ) : (
            <button className="bt-add-btn" onClick={startNew}>{L ? '+ Buff hinzufügen' : '+ Add buff'}</button>
          )}
        </div>
      )}
    </div>
  )
}
