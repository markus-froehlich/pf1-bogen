import { useState, useRef, useMemo } from 'react'
import featsData from '../data/feats.json'
import { RefLink } from './RefLink.jsx'
import './FeatsTab.css'

const FEAT_PREFIX_BOOK = {
  G:  'Grundregelwerk',
  E:  'Expertenregeln',
  M:  'Ausbauregeln-Magie',
  K:  'Ausbauregeln-II-Kampf',
  KL: 'Ausbauregeln-VI-Klassen',
  OK: 'Ausbauregeln-VII-Okkultes',
}

function toFeatSlug(name) {
  const stripped = name
    .replace(/\s*\([^)]*\)\s*$/, '')          // remove trailing "(NT)", "(WZ)" etc.
    .replace(/\s+[A-ZÄÖÜ]{1,3}\s*$/, '')      // remove trailing " K", " WZ", " KL", " KKK" etc.
    .trim()
  return stripped
    .replace(/ä/g, 'ae').replace(/Ä/g, 'Ae')
    .replace(/ö/g, 'oe').replace(/Ö/g, 'Oe')
    .replace(/ü/g, 'ue').replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
}

function featBook(source) {
  if (!source) return null
  const m = source.match(/^([A-Za-z]+)/)
  if (!m) return null
  return FEAT_PREFIX_BOOK[m[1]] ?? null
}

function FeatRefLink({ name, source }) {
  const book = featBook(source)
  if (!book) return null
  const url = `http://prd.5footstep.de/${book}/Talente/${toFeatSlug(name)}`
  return (
    <a className="feat-ref-link" href={url} target="_blank" rel="noreferrer"
      onClick={e => e.stopPropagation()} title={`prd.5footstep.de · ${book}`}>↗</a>
  )
}

function genId() { return 'ft_' + Math.random().toString(36).slice(2, 10) }

const EMPTY_FEAT = { id: '', name: '', type: 'Allgemein', notes: '', desc: '' }

const TYPES_DE = ['Allgemein', 'Kampf', 'Metamagie', 'Erschaffung', 'Teamwork', 'Volk', 'Klasse', 'WZ', 'Nachteil', 'Sonstige']
const TYPES_EN = ['General',  'Combat', 'Metamagic', 'Item Creation','Teamwork','Racial','Class',  'WZ',  'Drawback',  'Other']

const TYPE_COLOR = {
  'Kampf':       '#c9a96e', 'Combat':        '#c9a96e',
  'Metamagie':   '#9e6ec9', 'Metamagic':     '#9e6ec9',
  'Erschaffung': '#6e9ec9', 'Item Creation': '#6e9ec9',
  'Teamwork':    '#6ec9c9',
  'Volk':        '#6ec96e', 'Racial':        '#6ec96e',
  'Klasse':      '#c96e6e', 'Class':         '#c96e6e',
  'WZ':          '#c9c96e',
  'Nachteil':    '#a06060', 'Drawback':      '#a06060',
}

const DB_FEATS = featsData.feats  // array sorted by name

function LookupFeatRow({ feat, lang, onAdd }) {
  const [open, setOpen] = useState(false)
  const L = lang === 'de'
  return (
    <div className="fl-row">
      <div className="fl-row-head" onClick={() => setOpen(o => !o)}>
        <span className="fl-row-type" style={{ color: TYPE_COLOR[feat.type] ?? 'var(--accent)' }}>
          {feat.type}
        </span>
        <span className="fl-row-name">{feat.name.de}</span>
        <FeatRefLink name={feat.name.de} source={feat.source} />
        {feat.source && <span className="fl-row-src">{feat.source}</span>}
        <button className="fl-add-btn" onClick={e => { e.stopPropagation(); onAdd() }} title={L ? 'Zum Charakter' : 'Add to character'}>+</button>
      </div>
      {open && feat.desc?.de && (
        <div className="fl-row-desc">{feat.desc.de}</div>
      )}
    </div>
  )
}

function baseFeatBudget(totalLevel, isHuman) {
  if (!totalLevel) return 0
  return Math.ceil(totalLevel / 2) + (isHuman ? 1 : 0)
}

function searchFeats(query, limit = 10) {
  if (!query || query.length < 2) return []
  const q = query.toLowerCase()
  const results = []
  for (const f of DB_FEATS) {
    const name = f.name.de.toLowerCase()
    if (name.includes(q)) {
      results.push(f)
      if (results.length >= limit) break
    }
  }
  return results
}

export function FeatsTab({ char, setFeats, totalLevel = 0, lang }) {
  const L = lang === 'de'
  const [mode, setMode]         = useState('char')
  const [editId, setEditId]     = useState(null)
  const [draft, setDraft]       = useState(EMPTY_FEAT)
  const [suggestions, setSugg]  = useState([])
  const [suggIdx, setSuggIdx]   = useState(-1)
  const [showSugg, setShowSugg] = useState(false)
  const [lookupQuery, setLookupQuery] = useState('')
  const [lookupType,  setLookupType]  = useState('')
  const [lookupPage,  setLookupPage]  = useState(0)
  const nameRef = useRef(null)

  const PAGE_SIZE = 30
  const lookupFiltered = useMemo(() => {
    if (mode !== 'lookup') return []
    const hasQuery = lookupQuery.trim().length >= 1
    const hasType  = !!lookupType
    if (!hasQuery && !hasType) return null  // null = show empty state
    let results = DB_FEATS
    if (hasType)  results = results.filter(f => f.type === lookupType)
    if (hasQuery) {
      const q = lookupQuery.toLowerCase()
      results = results.filter(f => f.name.de.toLowerCase().includes(q))
    }
    return results
  }, [mode, lookupQuery, lookupType])

  const lookupTotal = lookupFiltered?.length ?? 0
  const lookupPageCount = Math.ceil(lookupTotal / PAGE_SIZE)
  const lookupResults = lookupFiltered?.slice(lookupPage * PAGE_SIZE, (lookupPage + 1) * PAGE_SIZE) ?? []

  const feats   = char.feats ?? []
  const types   = L ? TYPES_DE : TYPES_EN
  const isHuman = char.meta?.race === 'mensch' || char.meta?.race === 'human'
  const budget  = baseFeatBudget(totalLevel, isHuman)

  function openNew() {
    setDraft({ ...EMPTY_FEAT, id: genId() })
    setEditId('__new__')
    setSugg([])
    setSuggIdx(-1)
  }

  function openEdit(f) {
    setDraft({ ...f })
    setEditId(f.id)
    setSugg([])
    setSuggIdx(-1)
  }

  function saveDraft() {
    if (!draft.name.trim()) return
    setFeats(prev => {
      if (editId === '__new__') return [...prev, draft]
      return prev.map(f => f.id === editId ? draft : f)
    })
    setEditId(null)
    setShowSugg(false)
  }

  function deleteFeat(id) {
    setFeats(prev => prev.filter(f => f.id !== id))
    if (editId === id) setEditId(null)
  }

  function handleNameChange(e) {
    const val = e.target.value
    setDraft(d => ({ ...d, name: val }))
    const results = searchFeats(val)
    setSugg(results)
    setSuggIdx(-1)
    setShowSugg(results.length > 0)
  }

  function pickSuggestion(dbFeat) {
    setDraft(d => ({
      ...d,
      name: dbFeat.name.de,
      type: dbFeat.type,
      desc: dbFeat.desc?.de ?? '',
    }))
    setShowSugg(false)
    setSugg([])
    setSuggIdx(-1)
    nameRef.current?.blur()
  }

  function handleNameKeyDown(e) {
    if (!showSugg || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSuggIdx(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSuggIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && suggIdx >= 0) {
      e.preventDefault()
      pickSuggestion(suggestions[suggIdx])
    } else if (e.key === 'Escape') {
      setShowSugg(false)
    }
  }

  const typeColor = t => TYPE_COLOR[t] ?? 'var(--accent)'

  return (
    <div className="feats-tab">
      {/* Budget row */}
      <div className={`feat-budget ${feats.length > budget && budget > 0 ? 'over' : ''}`}>
        <span className="fb-label">{L ? 'Talente' : 'Feats'}</span>
        <span className="fb-used">{feats.length}</span>
        {budget > 0 && <>
          <span className="fb-sep">/</span>
          <span className="fb-total">{budget}</span>
          <span className={`fb-note ${feats.length > budget ? 'neg' : ''}`}
            title={L ? 'Basis ohne Klassenbonus' : 'Base, excl. class bonus'}>
            {L ? `(Basis${isHuman ? ' +1 Mensch' : ''})` : `(base${isHuman ? ' +1 human' : ''})`}
          </span>
        </>}
        <span className="fb-db-count">{L ? `${DB_FEATS.length} in DB` : `${DB_FEATS.length} in DB`}</span>
        <button
          className={`feat-mode-btn ${mode === 'lookup' ? 'active' : ''}`}
          onClick={() => setMode(m => m === 'char' ? 'lookup' : 'char')}
          title={L ? 'DB durchsuchen' : 'Browse DB'}
        >🔍</button>
      </div>

      {/* Lookup panel */}
      {mode === 'lookup' && (
        <div className="feat-lookup">
          <div className="fl-controls">
            <input
              className="fl-search"
              placeholder={L ? 'Name suchen…' : 'Search name…'}
              value={lookupQuery}
              onChange={e => { setLookupQuery(e.target.value); setLookupPage(0) }}
              autoFocus
            />
            <select
              className="fl-type-filter"
              value={lookupType}
              onChange={e => { setLookupType(e.target.value); setLookupPage(0) }}
            >
              <option value="">{L ? 'Alle Typen' : 'All types'}</option>
              {(L ? TYPES_DE : TYPES_EN).map((t, i) => (
                <option key={t} value={TYPES_DE[i]}>{t}</option>
              ))}
            </select>
          </div>
          {lookupFiltered === null ? (
            <div className="fl-empty-hint">
              {L ? 'Tippe einen Namen oder wähle einen Typ.' : 'Type a name or pick a type.'}
            </div>
          ) : (
            <>
              <div className="fl-count">
                {lookupTotal === 0
                  ? (L ? 'Keine Treffer' : 'No results')
                  : lookupPageCount > 1
                    ? `${lookupPage * PAGE_SIZE + 1}–${Math.min((lookupPage + 1) * PAGE_SIZE, lookupTotal)} / ${lookupTotal}`
                    : `${lookupTotal} ${L ? 'Treffer' : 'results'}`}
              </div>
              <div className="fl-list">
                {lookupResults.map(f => (
                  <LookupFeatRow key={f.id} feat={f} lang={lang} onAdd={() => {
                    setFeats(prev => [...prev, {
                      id: genId(), name: f.name.de, type: f.type,
                      desc: f.desc?.de ?? '', notes: '', source: f.source ?? ''
                    }])
                    setMode('char')
                  }} />
                ))}
              </div>
              {lookupPageCount > 1 && (
                <div className="fl-pagination">
                  <button className="fl-page-btn" disabled={lookupPage === 0}
                    onClick={() => setLookupPage(p => p - 1)}>‹ {L ? 'Zurück' : 'Prev'}</button>
                  <span className="fl-page-info">{lookupPage + 1} / {lookupPageCount}</span>
                  <button className="fl-page-btn" disabled={lookupPage >= lookupPageCount - 1}
                    onClick={() => setLookupPage(p => p + 1)}>{L ? 'Weiter' : 'Next'} ›</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Inline form */}
      {editId && (
        <div className="feat-form">
          {/* Name + autocomplete */}
          <div className="ff-row">
            <label className="ff-label">{L ? 'Name' : 'Name'}</label>
            <div className="ff-name-wrap">
              <input
                ref={nameRef}
                className="ff-input ff-name"
                autoFocus
                autoComplete="off"
                placeholder={L ? 'Talentname oder suchen…' : 'Feat name or search…'}
                value={draft.name}
                onChange={handleNameChange}
                onKeyDown={handleNameKeyDown}
                onFocus={() => suggestions.length > 0 && setShowSugg(true)}
                onBlur={() => setTimeout(() => setShowSugg(false), 150)}
              />
              {showSugg && suggestions.length > 0 && (
                <div className="ff-suggestions">
                  {suggestions.map((s, i) => (
                    <div
                      key={s.id}
                      className={`ff-sugg-item ${i === suggIdx ? 'active' : ''}`}
                      onMouseDown={() => pickSuggestion(s)}
                    >
                      <span className="ff-sugg-name">{s.name.de}</span>
                      <span className="ff-sugg-type" style={{ color: typeColor(s.type) }}>{s.type}</span>
                      {s.desc?.de && <span className="ff-sugg-desc">{s.desc.de}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Type */}
          <div className="ff-row">
            <label className="ff-label">{L ? 'Typ' : 'Type'}</label>
            <select className="ff-select"
              value={draft.type}
              onChange={e => setDraft(d => ({ ...d, type: e.target.value }))}>
              {types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* DB description (read-only if present) */}
          {draft.desc && (
            <div className="ff-row ff-desc-row">
              <label className="ff-label">DB</label>
              <p className="ff-desc-text">{draft.desc}</p>
            </div>
          )}

          {/* User note */}
          <div className="ff-row">
            <label className="ff-label">{L ? 'Notiz' : 'Note'}</label>
            <input className="ff-input"
              placeholder={L ? 'Voraussetzungen, Waffenwahl, …' : 'Prerequisites, weapon choice, …'}
              value={draft.notes}
              onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} />
          </div>

          <div className="ff-actions">
            {editId !== '__new__' && (
              <button className="ff-del-btn" onClick={() => deleteFeat(editId)}>
                {L ? 'Löschen' : 'Delete'}
              </button>
            )}
            <button className="ff-cancel-btn" onClick={() => { setEditId(null); setShowSugg(false) }}>
              {L ? 'Abbrechen' : 'Cancel'}
            </button>
            <button className="ff-save-btn" onClick={saveDraft} disabled={!draft.name.trim()}>
              {L ? 'Speichern' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Feat list */}
      {feats.length === 0 && !editId && (
        <p className="feats-empty">{L
          ? 'Noch keine Talente eingetragen. Tippe auf + um ein Talent hinzuzufügen.'
          : 'No feats yet. Tap + to add one.'}</p>
      )}

      <div className="feats-list">
        {feats.map(f => (
          <div key={f.id}
            className={`feat-card ${editId === f.id ? 'editing' : ''}`}
            onClick={() => editId !== f.id && openEdit(f)}>
            <div className="fc-main">
              <span className="fc-name">{f.name}</span>
              <FeatRefLink name={f.name} source={f.source} />
              <span className="fc-type" style={{ color: typeColor(f.type) }}>{f.type}</span>
            </div>
            {f.desc  && <p className="fc-desc">{f.desc}</p>}
            {f.notes && <p className="fc-notes">{f.notes}</p>}
          </div>
        ))}
      </div>

      {!editId && (
        <button className="feats-add-btn" onClick={openNew}>
          + {L ? 'Talent hinzufügen' : 'Add feat'}
        </button>
      )}

      {budget > 0 && (
        <p className="feats-hint">{L
          ? '* Kämpfer, Zauberer u.a. erhalten zusätzliche Klassentalente — diese manuell mitrechnen.'
          : '* Fighters, wizards etc. get bonus class feats — count those manually.'}</p>
      )}
    </div>
  )
}
