import { useState, useMemo, useCallback } from 'react'
import poisonsData from '../data/poisons.json'
import racialTraitsData from '../data/racial_traits.json'
import classFeaturesData from '../data/class_features.json'
import templatesData from '../data/templates.json'
import './NotesTab.css'

const ALL_RACIAL = Object.entries(racialTraitsData.by_race ?? {}).flatMap(([raceId, traits]) =>
  traits.map(t => ({ ...t, raceId, _kind: 'race' }))
)
const ALL_CLASS_FEATS = (classFeaturesData.features ?? []).map(f => ({
  ...f, _kind: 'class'
}))
const ALL_TRAITS = [...ALL_RACIAL, ...ALL_CLASS_FEATS]

const ALL_POISONS    = poisonsData.poisons
const ALL_TEMPLATES  = templatesData.templates

function toPoisonSlug(name) {
  return name
    .replace(/ä/g, 'ae').replace(/Ä/g, 'Ae')
    .replace(/ö/g, 'oe').replace(/Ö/g, 'Oe')
    .replace(/ü/g, 'ue').replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
}

function PoisonRefLink({ name, page }) {
  if (!page?.startsWith('G')) return null
  const url = `http://prd.5footstep.de/Grundregelwerk/Anhang/BesondereFaehigkeiten/Gebrechen/Gifte/${toPoisonSlug(name)}`
  return (
    <a className="poison-ref-link" href={url} target="_blank" rel="noreferrer"
      onClick={e => e.stopPropagation()} title="prd.5footstep.de">↗</a>
  )
}

function genId() {
  return Math.random().toString(36).slice(2, 10)
}

const EMPTY_CONTACT = { id: '', name: '', race: '', relation: '', notes: '' }
const EMPTY_SPECIAL = { id: '', name: '', source: '', desc: '' }

const RELATION_DE = ['Verbündeter', 'Feind', 'Neutral', 'Händler', 'Auftraggeber', 'Familie', 'Bekannt']
const RELATION_EN = ['Ally', 'Enemy', 'Neutral', 'Merchant', 'Employer', 'Family', 'Acquaintance']
const SOURCE_DE    = ['Rasse', 'Klasse', 'Archetyp', 'Talent', 'Gegenstand', 'Sonstige']
const SOURCE_EN    = ['Race', 'Class', 'Archetype', 'Feat', 'Item', 'Other']

const SOURCE_COLOR = {
  Rasse: '#6ec9c9', Race: '#6ec9c9',
  Klasse: '#c96ec9', Class: '#c96ec9',
  Archetyp: '#c9a96e', Archetype: '#c9a96e',
  Talent: '#6e9ec9', Feat: '#6e9ec9',
  Gegenstand: '#9ec96e', Item: '#9ec96e',
}

function autoResize(el) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

export function NotesTab({ char, setNotes, setContacts, setSpecials, lang }) {
  const L = lang === 'de'
  const [mode, setMode] = useState('notes')
  const [editId, setEditId] = useState(null)
  const [draft, setDraft]   = useState(EMPTY_CONTACT)
  const [specEditId, setSpecEditId] = useState(null)
  const [specDraft, setSpecDraft]   = useState(EMPTY_SPECIAL)
  const [traitSearch, setTraitSearch] = useState('')
  const [poisonSearch, setPoisonSearch] = useState('')
  const [poisonExpanded, setPoisonExpanded] = useState(null)
  const [tmplSearch, setTmplSearch] = useState('')

  const contacts = char.contacts ?? []
  const specials = char.specials ?? []

  const filteredTraits = useMemo(() => {
    const q = traitSearch.trim().toLowerCase()
    if (q.length < 2) return []
    return ALL_TRAITS.filter(t =>
      (t.trait ?? t.name).toLowerCase().includes(q)
    ).slice(0, 12)
  }, [traitSearch])

  const filteredPoisons = useMemo(() => {
    const q = poisonSearch.trim().toLowerCase()
    if (!q) return ALL_POISONS
    return ALL_POISONS.filter(p => p.name.toLowerCase().includes(q))
  }, [poisonSearch])

  const filteredTemplates = useMemo(() => {
    const q = tmplSearch.trim().toLowerCase()
    if (!q) return ALL_TEMPLATES
    return ALL_TEMPLATES.filter(t => t.name.toLowerCase().includes(q))
  }, [tmplSearch])

  function openNew() {
    setDraft({ ...EMPTY_CONTACT, id: genId() })
    setEditId('__new__')
  }

  function openEdit(c) {
    setDraft({ ...c })
    setEditId(c.id)
  }

  function saveDraft() {
    if (!draft.name.trim()) return
    setContacts(prev => {
      if (editId === '__new__') return [...prev, draft]
      return prev.map(c => c.id === editId ? draft : c)
    })
    setEditId(null)
  }

  function deleteContact(id) {
    setContacts(prev => prev.filter(c => c.id !== id))
    if (editId === id) setEditId(null)
  }

  // ── Specials helpers ──────────────────────────────────────────────────────
  function openNewSpecial() {
    setSpecDraft({ ...EMPTY_SPECIAL, id: genId() })
    setSpecEditId('__new__')
  }
  function openEditSpecial(s) {
    setSpecDraft({ ...s })
    setSpecEditId(s.id)
  }
  function saveSpecDraft() {
    if (!specDraft.name.trim()) return
    setSpecials(prev => {
      if (specEditId === '__new__') return [...prev, specDraft]
      return prev.map(s => s.id === specEditId ? specDraft : s)
    })
    setSpecEditId(null)
  }
  function deleteSpecial(id) {
    setSpecials(prev => prev.filter(s => s.id !== id))
    if (specEditId === id) setSpecEditId(null)
  }

  const RELATIONS = L ? RELATION_DE : RELATION_EN
  const SOURCES   = L ? SOURCE_DE   : SOURCE_EN
  const relColor = { [RELATIONS[0]]: '#6ec96e', [RELATIONS[1]]: '#c96e6e', [RELATIONS[2]]: 'var(--text-muted)' }

  return (
    <div className="notes-tab">
      {/* Mode toggle */}
      <div className="notes-mode-toggle">
        <button className={`nmt-btn ${mode === 'notes' ? 'active' : ''}`} onClick={() => setMode('notes')}>
          ✎ {L ? 'Notizen' : 'Notes'}
        </button>
        <button className={`nmt-btn ${mode === 'contacts' ? 'active' : ''}`} onClick={() => setMode('contacts')}>
          ☻ {L ? 'Kontakte' : 'Contacts'}
          {contacts.length > 0 && <span className="nmt-count">{contacts.length}</span>}
        </button>
        <button className={`nmt-btn ${mode === 'specials' ? 'active' : ''}`} onClick={() => setMode('specials')}>
          ⚡ {L ? 'Sonderfähigk.' : 'Spec.Abil.'}
          {specials.length > 0 && <span className="nmt-count">{specials.length}</span>}
        </button>
        <button className={`nmt-btn ${mode === 'poisons' ? 'active' : ''}`} onClick={() => setMode('poisons')}>
          ☠ {L ? 'Gifte' : 'Poisons'}
        </button>
        <button className={`nmt-btn ${mode === 'templates' ? 'active' : ''}`} onClick={() => setMode('templates')}>
          ✦ {L ? 'Schablonen' : 'Templates'}
        </button>
      </div>

      {/* ── Notes mode ── */}
      {mode === 'notes' && (
        <textarea
          className="notes-area"
          placeholder={L
            ? 'Hintergrundgeschichte, Ausrüstungsliste, Quests, Notizen…'
            : 'Background story, equipment, quests, notes…'}
          value={char.notes ?? ''}
          onChange={e => setNotes(e.target.value)}
        />
      )}

      {/* ── Contacts mode ── */}
      {mode === 'contacts' && (
        <div className="contacts-panel">
          {/* Edit / New form */}
          {editId && (
            <div className="contact-form">
              <div className="cf-row">
                <label className="cf-label">{L ? 'Name' : 'Name'}</label>
                <input
                  className="cf-input cf-name"
                  placeholder={L ? 'Name des NSC' : 'NPC name'}
                  value={draft.name}
                  onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                  autoFocus
                />
              </div>
              <div className="cf-row">
                <label className="cf-label">{L ? 'Volk' : 'Race'}</label>
                <input
                  className="cf-input"
                  placeholder={L ? 'Volk / Typ' : 'Race / type'}
                  value={draft.race}
                  onChange={e => setDraft(d => ({ ...d, race: e.target.value }))}
                />
              </div>
              <div className="cf-row">
                <label className="cf-label">{L ? 'Verhältnis' : 'Relation'}</label>
                <select
                  className="cf-select"
                  value={draft.relation}
                  onChange={e => setDraft(d => ({ ...d, relation: e.target.value }))}
                >
                  <option value="">—</option>
                  {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="cf-row cf-notes-row">
                <label className="cf-label">{L ? 'Notiz' : 'Note'}</label>
                <textarea
                  className="cf-input cf-notes"
                  placeholder={L ? 'Kurzbeschreibung, Ort, Beruf…' : 'Description, location, job…'}
                  value={draft.notes}
                  ref={autoResize}
                  onInput={e => autoResize(e.target)}
                  onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
                  rows={2}
                  style={{ overflow: 'hidden', resize: 'none' }}
                />
              </div>
              <div className="cf-actions">
                {editId !== '__new__' && (
                  <button className="cf-delete-btn" onClick={() => deleteContact(editId)}>
                    {L ? 'Löschen' : 'Delete'}
                  </button>
                )}
                <button className="cf-cancel-btn" onClick={() => setEditId(null)}>
                  {L ? 'Abbrechen' : 'Cancel'}
                </button>
                <button className="cf-save-btn" onClick={saveDraft} disabled={!draft.name.trim()}>
                  {L ? 'Speichern' : 'Save'}
                </button>
              </div>
            </div>
          )}

          {/* Contact list */}
          {contacts.length === 0 && !editId && (
            <p className="contacts-empty">{L
              ? 'Noch keine Kontakte. Tippe auf + um einen NSC hinzuzufügen.'
              : 'No contacts yet. Tap + to add an NPC.'}</p>
          )}

          <div className="contacts-list">
            {contacts.map(c => (
              <div key={c.id} className={`contact-card ${editId === c.id ? 'editing' : ''}`}
                   onClick={() => editId !== c.id && openEdit(c)}>
                <div className="cc-main">
                  <span className="cc-name">{c.name}</span>
                  {c.race && <span className="cc-race">{c.race}</span>}
                  {c.relation && (
                    <span className="cc-rel" style={{ color: relColor[c.relation] ?? 'var(--accent)' }}>
                      {c.relation}
                    </span>
                  )}
                </div>
                {c.notes && <p className="cc-notes">{c.notes}</p>}
              </div>
            ))}
          </div>

          {!editId && (
            <button className="contacts-add-btn" onClick={openNew}>
              + {L ? 'NSC hinzufügen' : 'Add NPC'}
            </button>
          )}
        </div>
      )}

      {/* ── Specials mode ── */}
      {mode === 'specials' && (
        <div className="specials-panel">
          {specEditId && (
            <div className="spec-form">
              <div className="sf-row">
                <label className="sf-label">{L ? 'Name' : 'Name'}</label>
                <div className="sf-autocomplete-wrap">
                  <input
                    className="sf-input sf-name"
                    placeholder={L ? 'Name der Fähigkeit' : 'Ability name'}
                    value={specDraft.name}
                    onChange={e => {
                      setSpecDraft(d => ({ ...d, name: e.target.value }))
                      setTraitSearch(e.target.value)
                    }}
                    onFocus={e => setTraitSearch(e.target.value)}
                    onBlur={() => setTimeout(() => setTraitSearch(''), 200)}
                    autoFocus
                  />
                  {filteredTraits.length > 0 && (
                    <div className="trait-suggestions">
                      {filteredTraits.map((t, i) => (
                        <div key={i} className="trait-sug-item"
                          onMouseDown={() => {
                            const srcText = t._kind === 'race'
                              ? (L ? 'Rasse' : 'Race')
                              : (t.source ? (L ? 'Klasse' : 'Class') : (L ? 'Sonstige' : 'Other'))
                            setSpecDraft(d => ({
                              ...d,
                              name: t.trait ?? t.name,
                              source: srcText,
                              desc: d.desc || t.desc || '',
                            }))
                            setTraitSearch('')
                          }}>
                          <span className="ts-name">{t.trait ?? t.name}</span>
                          <span className={`ts-race ${t._kind === 'class' ? 'ts-class' : ''}`}>
                            {t._kind === 'race'
                              ? t.name.split(' ').slice(-1)[0]
                              : (t.source || (L ? 'Klasse' : 'Class'))}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="sf-row">
                <label className="sf-label">{L ? 'Quelle' : 'Source'}</label>
                <select
                  className="sf-select"
                  value={specDraft.source}
                  onChange={e => setSpecDraft(d => ({ ...d, source: e.target.value }))}
                >
                  <option value="">—</option>
                  {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="sf-row sf-desc-row">
                <label className="sf-label">{L ? 'Beschreibung' : 'Description'}</label>
                <textarea
                  className="sf-input sf-desc"
                  placeholder={L ? 'Effekt, Einschränkungen, Nutzungen…' : 'Effect, restrictions, uses…'}
                  value={specDraft.desc}
                  onChange={e => setSpecDraft(d => ({ ...d, desc: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="sf-actions">
                {specEditId !== '__new__' && (
                  <button className="sf-delete-btn" onClick={() => deleteSpecial(specEditId)}>
                    {L ? 'Löschen' : 'Delete'}
                  </button>
                )}
                <button className="sf-cancel-btn" onClick={() => setSpecEditId(null)}>
                  {L ? 'Abbrechen' : 'Cancel'}
                </button>
                <button className="sf-save-btn" onClick={saveSpecDraft} disabled={!specDraft.name.trim()}>
                  {L ? 'Speichern' : 'Save'}
                </button>
              </div>
            </div>
          )}

          {specials.length === 0 && !specEditId && (
            <p className="specials-empty">{L
              ? 'Noch keine Sonderfähigkeiten. Tippe auf + um eine hinzuzufügen.'
              : 'No special abilities yet. Tap + to add one.'}</p>
          )}

          <div className="specials-list">
            {specials.map(s => (
              <div key={s.id} className={`special-card ${specEditId === s.id ? 'editing' : ''}`}
                   onClick={() => specEditId !== s.id && openEditSpecial(s)}>
                <div className="sc-main">
                  <span className="sc-name">{s.name}</span>
                  {s.source && (
                    <span className="sc-source" style={{ color: SOURCE_COLOR[s.source] ?? 'var(--accent)' }}>
                      {s.source}
                    </span>
                  )}
                </div>
                {s.desc && <p className="sc-desc">{s.desc}</p>}
              </div>
            ))}
          </div>

          {!specEditId && (
            <button className="contacts-add-btn" onClick={openNewSpecial}>
              + {L ? 'Fähigkeit hinzufügen' : 'Add ability'}
            </button>
          )}
        </div>
      )}

      {/* ── Templates mode ── */}
      {mode === 'templates' && (
        <div className="templates-panel">
          <input
            className="poison-search"
            type="text"
            placeholder={L ? 'Schablone suchen…' : 'Search template…'}
            value={tmplSearch}
            onChange={e => setTmplSearch(e.target.value)}
          />
          <div className="template-list">
            {filteredTemplates.map(t => (
              <div key={t.id} className="template-row">
                <span className="template-name">{t.name}</span>
                {t.page && <span className="template-page">{t.page}</span>}
                <button
                  className="ref-add-btn"
                  title={L ? 'Zu Sonderfähigkeiten hinzufügen' : 'Add to special abilities'}
                  onClick={() => {
                    if (!specials.some(s => s.name === t.name)) {
                      setSpecials(prev => [...prev, { id: genId(), name: t.name, source: L ? 'Sonstige' : 'Other', desc: t.description ?? '' }])
                    }
                    setMode('specials')
                  }}>+</button>
              </div>
            ))}
          </div>
          <div className="templates-hint">
            {L ? 'Schablonen werden auf Kreaturen angewandt (Referenzliste).' : 'Templates are applied to creatures (reference list).'}
          </div>
        </div>
      )}

      {/* ── Poisons mode ── */}
      {mode === 'poisons' && (
        <div className="poisons-panel">
          <input
            className="poison-search"
            type="text"
            placeholder={L ? 'Gift suchen…' : 'Search poison…'}
            value={poisonSearch}
            onChange={e => { setPoisonSearch(e.target.value); setPoisonExpanded(null) }}
          />
          <div className="poison-count">{filteredPoisons.length} {L ? 'Gifte' : 'poisons'}</div>
          <div className="poison-list">
            {filteredPoisons.map(p => {
              const isOpen = poisonExpanded === p.id
              return (
                <div key={p.id} className={`poison-row ${isOpen ? 'open' : ''}`}
                  onClick={() => setPoisonExpanded(isOpen ? null : p.id)}>
                  <div className="poison-main">
                    <span className="poison-name-wrap">
                      <span className="poison-name">{p.name}</span>
                      <PoisonRefLink name={p.name} page={p.page} />
                    </span>
                    {p.type && <span className="poison-type">{p.type.split(',')[0]}</span>}
                    {p.dc && <span className="poison-dc">SG {p.dc}</span>}
                    {p.page && <span className="poison-page">{p.page}</span>}
                    <button
                      className="ref-add-btn"
                      title={L ? 'Zu Sonderfähigkeiten hinzufügen' : 'Add to special abilities'}
                      onClick={e => {
                        e.stopPropagation()
                        if (!specials.some(s => s.name === p.name)) {
                          setSpecials(prev => [...prev, { id: genId(), name: p.name, source: L ? 'Sonstige' : 'Other', desc: p.effect ?? '' }])
                        }
                        setMode('specials')
                      }}>+</button>
                  </div>
                  {isOpen && (
                    <div className="poison-detail">
                      {p.onset && <div><span className="pd-label">{L ? 'Eintritt' : 'Onset'}</span> {p.onset}</div>}
                      {p.freq  && <div><span className="pd-label">{L ? 'Frequenz' : 'Freq'}</span> {p.freq}</div>}
                      {p.effect && <div><span className="pd-label">{L ? 'Effekt' : 'Effect'}</span> {p.effect}</div>}
                      {p.cure  && <div><span className="pd-label">{L ? 'Heilung' : 'Cure'}</span> {p.cure}</div>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
