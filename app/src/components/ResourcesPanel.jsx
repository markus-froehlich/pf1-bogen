import { useState } from 'react'
import './ResourcesPanel.css'

function genId() { return 'res_' + Math.random().toString(36).slice(2, 9) }

const EMPTY = { id: '', name: '', max: 1, current: 0, unit: '' }

// Auto-resource formulas per class ID
function getAutoResources(classId, level, attrs, lang) {
  const L = lang === 'de'
  const ko = attrs?.KO?.mod ?? 0
  const ch = attrs?.CH?.mod ?? 0
  const we = attrs?.WE?.mod ?? 0
  const lvl = Number(level) || 1
  const n = (de, en) => L ? de : en
  const suggestions = []

  if (classId === 'barbar') {
    suggestions.push({ name: n('Kampfrausch (Runden)', 'Rage (rounds)'), max: Math.max(1, 4 + ko + 2 * lvl) })
  }
  if (classId === 'kleriker') {
    suggestions.push({ name: n('Energie fokussieren', 'Channel Energy'), max: Math.max(1, 3 + ch) })
  }
  if (classId === 'barde' || classId === 'skalde') {
    suggestions.push({ name: classId === 'skalde' ? n('Runenlied (Runden)', 'Raging Song (rounds)') : n('Bardenauftritt (Runden)', 'Bardic Performance (rounds)'), max: Math.max(1, 4 + ch + 2 * lvl) })
  }
  if (classId === 'paladin') {
    suggestions.push({ name: n('Handauflegen', 'Lay on Hands'), max: Math.max(1, Math.floor(lvl / 2) + ch) })
    suggestions.push({ name: n('Böses niederstrecken', 'Smite Evil'), max: Math.max(1, Math.floor(lvl / 2)) })
  }
  if (classId === 'antipaladin') {
    suggestions.push({ name: n('Handauflegen', 'Touch of Corruption'), max: Math.max(1, Math.floor(lvl / 2) + ch) })
    suggestions.push({ name: n('Böses niederstrecken', 'Smite Good'), max: Math.max(1, Math.floor(lvl / 2)) })
  }
  if (classId === 'moench') {
    suggestions.push({ name: n('Ki-Vorrat', 'Ki Pool'), max: Math.max(1, Math.floor(lvl / 2) + we) })
  }
  if (classId === 'hexe' || classId === 'hexenmeister') {
    suggestions.push({ name: classId === 'hexe' ? n('Hexerei/Tag', 'Hex/day') : n('Geheimnis/Tag', 'Secret/day'), max: Math.max(1, Math.floor(lvl / 2) + 1) })
  }
  if (classId === 'inquisitor') {
    suggestions.push({ name: n('Urteil', 'Judgment'), max: Math.max(1, 1 + Math.floor((lvl - 1) / 3)) })
  }
  if (classId === 'paktmagier') {
    suggestions.push({ name: n('Paktmagie-Slot', 'Pact Magic Slot'), max: 1 })
  }
  if (classId === 'alchemist') {
    suggestions.push({ name: n('Bomben', 'Bombs'), max: Math.max(1, lvl + (attrs?.IN?.mod ?? 0)) })
  }
  if (classId === 'druide') {
    // Wild Shape: 1/day at lvl 4, +1/day every 2 levels (lvl 6 → 2, lvl 8 → 3, …)
    const uses = lvl >= 4 ? Math.floor(lvl / 2) - 1 : 0
    if (uses > 0) suggestions.push({ name: n('Tiergestalt', 'Wild Shape'), max: uses })
  }
  if (classId === 'kampfmagus' || classId === 'kampfmagier') {
    suggestions.push({ name: n('Arkaner Pool', 'Arcane Pool'), max: Math.max(1, Math.floor(lvl / 2) + (attrs?.IN?.mod ?? 0)) })
  }
  if (classId === 'ritter') {
    suggestions.push({ name: n('Herausforderung', 'Challenge'), max: Math.max(1, 1 + Math.floor((lvl - 1) / 4)) })
    suggestions.push({ name: n('Ordensgelübde (Runden)', 'Order Ability (rounds)'), max: Math.max(1, lvl) })
  }
  if (classId === 'ninja') {
    suggestions.push({ name: n('Ki-Vorrat', 'Ki Pool'), max: Math.max(1, Math.floor(lvl / 2) + (attrs?.CH?.mod ?? 0)) })
  }
  if (classId === 'schuetze') {
    suggestions.push({ name: n('Gnadenvolley', 'Mercy Volley'), max: Math.max(1, Math.floor(lvl / 6) + 1) })
  }
  if (classId === 'orakel') {
    suggestions.push({ name: n('Offenbarung/Tag', 'Revelation/day'), max: Math.max(1, Math.floor(lvl / 2) + 1) })
  }
  if (classId === 'hexenmeister') {
    suggestions.push({ name: n('Blutmagie', 'Bloodline Power'), max: Math.max(1, 3 + ch) })
  }
  if (classId === 'magier') {
    if (lvl >= 5) suggestions.push({ name: n('Arkanist-Exploit', 'Arcane Exploit'), max: Math.max(1, Math.floor(lvl / 2)) })
  }
  if (classId === 'waldlaeufer') {
    if (lvl >= 1) suggestions.push({ name: n('Gefährten-Fokus', 'Companion Focus'), max: 1 })
  }
  return suggestions
}

export function ResourcesPanel({ char, setResources, attrs, baseValues, lang, hideTitle = false }) {
  const L = lang === 'de'
  const resources = char.resources ?? []
  const [editId, setEditId] = useState(null)
  const [draft, setDraft] = useState(EMPTY)

  function openNew() {
    setDraft({ ...EMPTY, id: genId() })
    setEditId('__new__')
  }
  function openEdit(r) { setDraft({ ...r }); setEditId(r.id) }
  function cancel() { setEditId(null) }

  function save() {
    if (!draft.name.trim()) return
    setResources(prev => {
      if (editId === '__new__') return [...prev, draft]
      return prev.map(r => r.id === editId ? draft : r)
    })
    setEditId(null)
  }

  function del(id) {
    setResources(prev => prev.filter(r => r.id !== id))
    if (editId === id) setEditId(null)
  }

  function use(id) {
    setResources(prev => prev.map(r =>
      r.id === id ? { ...r, current: Math.min(r.max, r.current + 1) } : r
    ))
  }
  function restore(id) {
    setResources(prev => prev.map(r =>
      r.id === id ? { ...r, current: 0 } : r
    ))
  }
  function restoreAll() {
    setResources(prev => prev.map(r => ({ ...r, current: 0 })))
  }

  const anyUsed = resources.some(r => r.current > 0)

  // Collect auto-suggestions for all class slots
  const autoSuggestions = (char.meta?.classes ?? []).flatMap(entry => {
    if (!entry.id || !Number(entry.level)) return []
    return getAutoResources(entry.id, entry.level, attrs, lang).map(s => ({
      ...s, _classId: entry.id
    }))
  })

  function addAutoSuggestion(sug) {
    if (resources.some(r => r.name === sug.name)) return
    setResources(prev => [...prev, { id: genId(), name: sug.name, max: sug.max, current: 0 }])
  }

  return (
    <section className="res-panel ct-section">
      <div className="res-header">
        {!hideTitle && <h3 className="ct-heading">{L ? 'Ressourcen' : 'Resources'}</h3>}
        {anyUsed && (
          <button className="res-reset-all-btn" onClick={restoreAll}>
            ↺ {L ? 'Alle zurücksetzen' : 'Reset all'}
          </button>
        )}
      </div>

      {/* Auto-suggestions */}
      {autoSuggestions.length > 0 && !editId && (
        <div className="res-auto-row">
          <span className="res-auto-label">{L ? '⟳ Vorschläge:' : '⟳ Suggestions:'}</span>
          {autoSuggestions.map((sug, i) => {
            const already = resources.some(r => r.name === sug.name)
            return (
              <button key={i}
                className={`res-auto-chip ${already ? 'added' : ''}`}
                onClick={() => addAutoSuggestion(sug)}
                disabled={already}
                title={`${sug.name} (${L ? 'Max' : 'Max'}: ${sug.max})`}>
                {sug.name} <span className="res-auto-max">{sug.max}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Edit / new form */}
      {editId && (
        <div className="res-form">
          <input
            className="res-form-name"
            placeholder={L ? 'Fähigkeit (z.B. Raserei, Kanalisieren)' : 'Ability name'}
            value={draft.name}
            onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
            autoFocus
          />
          <div className="res-form-row">
            <label className="res-form-label">{L ? 'Max' : 'Max'}</label>
            <input
              className="res-form-max"
              type="number" min={1} max={999}
              value={draft.max}
              onChange={e => setDraft(d => ({ ...d, max: Math.max(1, Number(e.target.value) || 1) }))}
            />
            <input
              className="res-form-unit"
              type="text"
              placeholder={L ? 'Einheit (Runden…)' : 'Unit (rounds…)'}
              value={draft.unit ?? ''}
              onChange={e => setDraft(d => ({ ...d, unit: e.target.value }))}
            />
          </div>
          <div className="res-form-actions">
            {editId !== '__new__' && (
              <button className="res-del-btn" onClick={() => del(editId)} title={L ? 'Löschen' : 'Delete'}>🗑</button>
            )}
            <button className="res-cancel-btn" onClick={cancel} title={L ? 'Abbrechen' : 'Cancel'}>✕</button>
            <button className="res-save-btn" onClick={save} disabled={!draft.name.trim()} title={L ? 'Speichern' : 'Save'}>✓</button>
          </div>
        </div>
      )}

      {/* Resources list */}
      {resources.length === 0 && !editId && (
        <p className="res-empty">{L
          ? 'Keine Ressourcen — z.B. Raserei, Kanalisieren, Bardenperformance…'
          : 'No resources — e.g. Rage, Channel Energy, Bardic Performance…'
        }</p>
      )}

      <div className="res-list">
        {resources.map(r => {
          const remaining = r.max - r.current
          const pct = r.max > 0 ? remaining / r.max : 1
          return (
            <div key={r.id} className={`res-row ${editId === r.id ? 'editing' : ''}`}>
              <div className="res-row-main">
                <span className="res-name" onClick={() => editId !== r.id && openEdit(r)}>{r.name}</span>
                <div className="res-controls">
                  <button className="res-use-btn" onClick={() => use(r.id)} disabled={remaining <= 0}
                    title={L ? 'Verwenden' : 'Use'}>−</button>
                  <span className="res-counter"
                    style={{ color: pct > 0.5 ? 'var(--good)' : pct > 0 ? '#c9a96e' : '#c96e6e' }}>
                    {remaining}/{r.max}{r.unit ? ` ${r.unit}` : ''}
                  </span>
                  <button className="res-restore-btn" onClick={() => restore(r.id)} disabled={r.current === 0}
                    title={L ? 'Zurücksetzen' : 'Reset'}>↺</button>
                </div>
              </div>
              <div className="res-bar-wrap">
                <div className="res-bar"
                  style={{ width: `${pct * 100}%`,
                    background: pct > 0.5 ? 'var(--good)' : pct > 0 ? '#c9a96e' : '#c96e6e' }} />
              </div>
            </div>
          )
        })}
      </div>

      {!editId && (
        <button className="res-add-btn" onClick={openNew}>
          + {L ? 'Ressource hinzufügen' : 'Add resource'}
        </button>
      )}
    </section>
  )
}
