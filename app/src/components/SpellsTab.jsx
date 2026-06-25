import { useState, useMemo } from 'react'
import spellsData from '../data/spells.json'
import { getSpellSlots, getSpellsKnown, isSpontaneousCaster } from '../engine/spellSlots.js'
import './SpellsTab.css'

// Casting stat per class ID (PF1e rules)
const CASTING_STAT = {
  hxm_magier: 'IN', arkanist: 'IN', alchemist: 'IN',
  hexe: 'IN', kampfmagier: 'IN', ermittler: 'IN',
  magier: 'IN',
  kleriker: 'WE', druide: 'WE', inquisitor: 'WE',
  waldlaeufer: 'WE', jaeger: 'WE', schamane: 'WE',
  mystiker: 'WE', kriegspriester: 'WE', adept: 'WE',
  barde: 'CH', paladin: 'CH', antipaladin: 'CH',
  blutwueter: 'CH', skalde: 'CH', paktmagier: 'CH',
  hexenmeister: 'CH', orakel: 'CH',
}

// spells.json class IDs → possible classes.json char class IDs
// (e.g. hxm_magier covers both hexenmeister and magier in the spell list)
const SPELLBOOK_TO_CHAR_ID = {
  hxm_magier: ['hexenmeister', 'magier'],
}

const ALL_SPELLS = spellsData.spells
const CLASSES    = spellsData._meta.classes
const CLASS_LIST = Object.entries(CLASSES).map(([id, v]) => ({ id, de: v.de }))
const SPELL_MAP  = Object.fromEntries(ALL_SPELLS.map(s => [s.id, s]))
const LEVELS     = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

// English class names (not in source data — PF1e standard)
const CLASS_EN = {
  barde: 'Bard', druide: 'Druid', hxm_magier: 'Wiz./Sorc.', kleriker: 'Cleric',
  paladin: 'Paladin', waldlaeufer: 'Ranger', alchemist: 'Alchemist', hexe: 'Witch',
  inquisitor: 'Inquisitor', paktmagier: 'Summoner', adept: 'Adept',
  kampfmagier: 'Magus', antipaladin: 'Antipaladin', arkanist: 'Arcanist',
  blutwueter: 'Bloodrager', ermittler: 'Investigator', jaeger: 'Hunter',
  kriegspriester: 'Warpriest', mystiker: 'Occultist', schamane: 'Shaman',
  skalde: 'Skald', legendaer: 'Legendary',
}

function LevelBadge({ level }) {
  return <span className={`spell-lvl lvl-${level}`}>{level}</span>
}

// page-prefix → prd.5footstep.de book path (verified via URL testing)
const PAGE_PREFIX_BOOK = {
  G:  'Grundregelwerk',
  E:  'Expertenregeln',
  M:  'Ausbauregeln-Magie',
  K:  'Ausbauregeln-II-Kampf',
  KL: 'Ausbauregeln-VI-Klassen',
  OG: 'Ausbauregeln-VII-Okkultes',
}

function pageBook(page) {
  if (!page) return null
  const m = page.match(/^([A-Za-z]+)/)
  if (!m) return null
  return PAGE_PREFIX_BOOK[m[1]] ?? null
}

function toSlug(name) {
  return name
    .replace(/ä/g, 'ae').replace(/Ä/g, 'Ae')
    .replace(/ö/g, 'oe').replace(/Ö/g, 'Oe')
    .replace(/ü/g, 'ue').replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
}

function RefLink({ name, page }) {
  const book = pageBook(page)
  if (!book) return null
  const url = `http://prd.5footstep.de/${book}/Zauber/${toSlug(name)}`
  return (
    <a
      className="spell-ref-link"
      href={url}
      target="_blank"
      rel="noreferrer"
      onClick={e => e.stopPropagation()}
      title={`prd.5footstep.de · ${book}`}
    >↗</a>
  )
}

// ── Lookup mode ────────────────────────────────────────────────────────────────
function SpellLookup({ lang, onPrepare }) {
  const L = lang === 'de'
  const [classId, setClassId] = useState('hxm_magier')
  const [levelFilter, setLevelFilter] = useState(-1)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)

  const filteredSpells = useMemo(() => {
    const q = search.trim().toLowerCase()
    return ALL_SPELLS.filter(s => {
      if (!s.class_levels[classId] && s.class_levels[classId] !== 0) return false
      if (levelFilter >= 0 && s.class_levels[classId] !== levelFilter) return false
      if (q && !s.name.de.toLowerCase().includes(q)) return false
      return true
    }).sort((a, b) => {
      const la = a.class_levels[classId] ?? 99
      const lb = b.class_levels[classId] ?? 99
      if (la !== lb) return la - lb
      return a.name.de.localeCompare(b.name.de, 'de')
    })
  }, [classId, levelFilter, search])

  return (
    <>
      <div className="spell-filters">
        <select className="spell-class-select" value={classId}
          onChange={e => { setClassId(e.target.value); setLevelFilter(-1); setExpanded(null) }}>
          {CLASS_LIST.map(c => <option key={c.id} value={c.id}>{L ? c.de : (CLASS_EN[c.id] ?? c.de)}</option>)}
        </select>
        <input className="spell-search" type="text"
          placeholder={L ? 'Suche…' : 'Search…'}
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="spell-level-tabs">
        <button className={`lvl-tab ${levelFilter === -1 ? 'active' : ''}`}
          onClick={() => setLevelFilter(-1)}>{L ? 'Alle' : 'All'}</button>
        {LEVELS.map(lv => {
          const count = ALL_SPELLS.filter(s => s.class_levels[classId] === lv).length
          return count > 0 ? (
            <button key={lv} className={`lvl-tab ${levelFilter === lv ? 'active' : ''}`}
              onClick={() => setLevelFilter(lv)}>{lv}</button>
          ) : null
        })}
      </div>

      <div className="spell-count">{filteredSpells.length} {L ? 'Sprüche' : 'spells'}</div>

      <div className="spell-list">
        {filteredSpells.map(spell => {
          const level = spell.class_levels[classId] ?? '?'
          const isOpen = expanded === spell.id
          return (
            <div key={spell.id} className={`spell-row ${isOpen ? 'open' : ''}`}
              onClick={() => setExpanded(isOpen ? null : spell.id)}>
              <div className="spell-main">
                <LevelBadge level={level} />
                <span className="spell-name-wrap">
                  <span className="spell-name">{(L ? spell.name.de : spell.name.en) ?? spell.name.de}</span>
                  <RefLink name={spell.name.de} page={spell.page} />
                </span>
                <span className="spell-school">{spell.school}</span>
                {spell.page && <span className="spell-page">{spell.page}</span>}
                {onPrepare && (
                  <button className="spell-add-btn" title={L ? 'Ins Zauberbuch' : 'Add to spellbook'}
                    onClick={e => { e.stopPropagation(); onPrepare(spell, typeof level === 'number' ? level : 0, classId) }}>
                    +
                  </button>
                )}
              </div>
              {isOpen && spell.desc && <div className="spell-desc">{spell.desc}</div>}
            </div>
          )
        })}
      </div>
    </>
  )
}

// ── DC Panel ───────────────────────────────────────────────────────────────────
function DcPanel({ char, attrs, lang }) {
  const L = lang === 'de'
  const sb = char.spellbook ?? { class_id: '', levels: {} }
  const classId = sb.class_id
  if (!classId) return null

  const aliases = SPELLBOOK_TO_CHAR_ID[classId] ?? []
  const charEntry = (char.meta.classes ?? []).find(e => e.id === classId || aliases.includes(e.id))
  const effectiveId = (charEntry && charEntry.id !== classId) ? charEntry.id : classId
  const stat = CASTING_STAT[effectiveId] ?? CASTING_STAT[classId]
  if (!stat) return null

  const mod = attrs?.[stat]?.mod ?? 0
  const statLabel = { IN: 'IN', WE: 'WE', CH: 'CH' }[stat]

  return (
    <div className="dc-panel">
      <div className="dc-header">
        <span className="dc-title">{L ? 'Zauber-SG' : 'Spell DC'}</span>
        <span className="dc-stat">{statLabel} {mod >= 0 ? `+${mod}` : mod}</span>
      </div>
      <div className="dc-levels">
        {LEVELS.map(lv => (
          <div key={lv} className="dc-row">
            <span className={`spell-lvl lvl-${lv}`}>{lv}</span>
            <span className="dc-val">{10 + lv + mod}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Spellbook mode ─────────────────────────────────────────────────────────────
function SpellBook({ char, setSpellbook, attrs, lang }) {
  const L = lang === 'de'
  const sb = char.spellbook ?? { class_id: '', levels: {} }

  // Auto-fill slots from PF1e standard tables
  const classEntry = (char.meta.classes ?? []).find(e => e.id === sb.class_id)
  const classLevel = Number(classEntry?.level) || 1
  const spontaneous = isSpontaneousCaster(sb.class_id)
  const castingStat = CASTING_STAT[sb.class_id]
  const castingMod  = (castingStat && attrs) ? (attrs[castingStat]?.mod ?? 0) : 0
  const concBonus   = classLevel + castingMod
  const fmtB = n => n >= 0 ? `+${n}` : `${n}`
  const knownMax    = spontaneous ? (getSpellsKnown(sb.class_id, classLevel) ?? {}) : {}
  function autoFillSlots() {
    if (!sb.class_id) return
    const baseSlots = getSpellSlots(sb.class_id, classLevel)
    if (!baseSlots) return
    // Bonus slots from high casting stat: +1 per level up to ability mod (levels 1+)
    const stat = CASTING_STAT[sb.class_id]
    const abilityMod = (stat && attrs) ? (attrs[stat]?.mod ?? 0) : 0
    setSpellbook(prev => {
      const newLevels = {}
      for (let lv = 0; lv <= 9; lv++) {
        const base  = baseSlots[lv] ?? 0
        const bonus = (lv >= 1 && base > 0 && lv <= abilityMod) ? 1 : 0
        const total = base + bonus
        if (total > 0 || (prev.levels[lv]?.prepared?.length ?? 0) > 0) {
          const existing = prev.levels[lv] ?? { total: 0, used: 0, prepared: [] }
          newLevels[lv] = { ...existing, total }
        }
      }
      return { ...prev, levels: newLevels }
    })
  }

  // Which levels have any slots or prepared spells?
  const activeLevels = LEVELS.filter(lv => {
    const lvData = sb.levels[lv]
    return (lvData?.total ?? 0) > 0 || (lvData?.prepared?.length ?? 0) > 0
  })

  function setSlot(lv, field, value) {
    setSpellbook(prev => {
      const lvData = { total: 0, used: 0, prepared: [], ...(prev.levels[lv] ?? {}) }
      lvData[field] = Math.max(0, Number(value) || 0)
      return { ...prev, levels: { ...prev.levels, [lv]: lvData } }
    })
  }

  function useSlot(lv) {
    setSpellbook(prev => {
      const lvData = { total: 0, used: 0, prepared: [], ...(prev.levels[lv] ?? {}) }
      if (lvData.used < lvData.total) lvData.used = lvData.used + 1
      return { ...prev, levels: { ...prev.levels, [lv]: lvData } }
    })
  }

  function restoreSlots(lv) {
    setSpellbook(prev => {
      const lvData = { ...(prev.levels[lv] ?? {}) }
      lvData.used = 0
      return { ...prev, levels: { ...prev.levels, [lv]: lvData } }
    })
  }

  function removeSpell(lv, spellId) {
    setSpellbook(prev => {
      const lvData = { total: 0, used: 0, prepared: [], ...(prev.levels[lv] ?? {}) }
      lvData.prepared = lvData.prepared.filter(id => id !== spellId)
      return { ...prev, levels: { ...prev.levels, [lv]: lvData } }
    })
  }

  // Slot setup — add a level row
  const [addLv, setAddLv] = useState(1)

  return (
    <div className="spellbook">
      {/* DC panel */}
      <DcPanel char={char} attrs={attrs} lang={lang} />

      {/* Class selector */}
      <div className="sb-class-row">
        <span className="sb-class-label">{L ? 'Klasse' : 'Class'}</span>
        <select className="spell-class-select"
          value={sb.class_id}
          onChange={e => setSpellbook(prev => ({ ...prev, class_id: e.target.value }))}>
          <option value="">— {L ? 'wählen' : 'select'} —</option>
          {CLASS_LIST.map(c => <option key={c.id} value={c.id}>{L ? c.de : (CLASS_EN[c.id] ?? c.de)}</option>)}
        </select>
        {spontaneous && (
          <span className="sb-spont-badge" title={L ? 'Spontanzauberer — Sprüche sind dauerhaft bekannt' : 'Spontaneous caster — spells are permanently known'}>
            {L ? 'Spontan' : 'Spont.'}
          </span>
        )}
        {sb.class_id && getSpellSlots(sb.class_id, classLevel) && (
          <button className="sb-auto-btn" onClick={autoFillSlots}
            title={L ? `Slots für Stufe ${classLevel} auto-befüllen` : `Auto-fill slots for level ${classLevel}`}>
            ⟳ Auto
          </button>
        )}
        {sb.class_id && castingStat && (
          <span className="sb-conc" title={L ? `Konzentrationswurf: 1W20 ${fmtB(concBonus)} (Zauberstufe ${classLevel} + ${castingStat} ${fmtB(castingMod)})` : `Concentration: 1d20 ${fmtB(concBonus)} (CL ${classLevel} + ${castingStat} ${fmtB(castingMod)})`}>
            {L ? 'Konz.' : 'Conc.'} {fmtB(concBonus)}
          </span>
        )}
      </div>

      {/* Add level row */}
      <div className="sb-add-row">
        <span className="sb-add-label">{L ? 'Stufe hinzufügen' : 'Add level'}</span>
        <select className="sb-lv-sel" value={addLv} onChange={e => setAddLv(Number(e.target.value))}>
          {LEVELS.map(lv => <option key={lv} value={lv}>{lv}</option>)}
        </select>
        <button className="sb-add-btn" onClick={() => setSlot(addLv, 'total', (sb.levels[addLv]?.total ?? 0) + 1)}>
          + {L ? 'Slot' : 'Slot'}
        </button>
      </div>

      {/* Level rows */}
      {activeLevels.length === 0 && (
        <div className="sb-empty">{L ? 'Noch keine Slots. Stufe hinzufügen ↑' : 'No slots yet. Add a level above ↑'}</div>
      )}

      {LEVELS.filter(lv => (sb.levels[lv]?.total ?? 0) > 0 || (sb.levels[lv]?.prepared?.length ?? 0) > 0).map(lv => {
        const lvData = sb.levels[lv] ?? { total: 0, used: 0, prepared: [] }
        const remaining = lvData.total - lvData.used
        const knownCount = lvData.prepared?.length ?? 0
        const maxKnown   = knownMax[lv] ?? null
        return (
          <div key={lv} className="sb-level">
            <div className="sb-lv-header">
              <LevelBadge level={lv} />
              <span className="sb-lv-title">{L ? `Stufe ${lv}` : `Level ${lv}`}</span>
              {castingStat && <span className="sb-lv-dc" title={L ? 'Zauber-SG' : 'Spell DC'}>SG {10 + lv + castingMod}</span>}
              {spontaneous && maxKnown !== null && (
                <span className={`sb-known-count ${knownCount >= maxKnown ? 'at-max' : ''}`}
                  title={L ? 'Bekannte Sprüche' : 'Spells known'}>
                  {knownCount}/{maxKnown} {L ? 'bekannt' : 'known'}
                </span>
              )}
              <div className="sb-slots">
                <span className={`sb-remaining ${remaining <= 0 && lv !== 0 ? 'depleted' : ''}`}>
                  {lv === 0 ? '∞' : `${remaining}/${lvData.total}`}
                </span>
                {lv !== 0 && <button className="sb-use-btn" onClick={() => useSlot(lv)}
                  disabled={remaining <= 0} title={L ? 'Slot verwenden' : 'Use slot'}>−</button>}
                {lv !== 0 && <button className="sb-restore-btn" onClick={() => restoreSlots(lv)}
                  title={L ? 'Alle wiederherstellen' : 'Restore all'}>↺</button>}
                <label className="sb-total-label">
                  Max:
                  <input className="sb-total-input" type="number" min={0} max={20}
                    value={lvData.total}
                    onChange={e => setSlot(lv, 'total', e.target.value)} />
                </label>
              </div>
            </div>
            {/* Prepared / known spells */}
            {lvData.prepared?.length > 0 && (
              <div className="sb-prepared">
                {lvData.prepared.map(spellId => {
                  const spell = SPELL_MAP[spellId]
                  return (
                    <div key={spellId} className="sb-spell">
                      <span className="sb-spell-name">{(spell ? ((L ? spell.name.de : spell.name.en) ?? spell.name.de) : null) ?? spellId}</span>
                      {spell && <RefLink name={spell.name.de} page={spell.page} />}
                      {spell?.school && <span className="sb-spell-school">{spell.school}</span>}
                      <button className="sb-remove-btn" onClick={() => removeSpell(lv, spellId)}>✕</button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Wands panel ────────────────────────────────────────────────────────────────
function WandsPanel({ char, setWands, lang }) {
  const L = lang === 'de'
  const wands = char.wands ?? []
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ name: '', max_charges: 50, charges: 50, notes: '' })

  function uid() { return Math.random().toString(36).slice(2, 9) }

  function addWand() {
    if (!draft.name.trim()) return
    const max = Math.max(1, Number(draft.max_charges) || 50)
    setWands(prev => [...prev, { id: uid(), name: draft.name.trim(), max_charges: max, charges: max, notes: draft.notes }])
    setDraft({ name: '', max_charges: 50, charges: 50, notes: '' })
    setAdding(false)
  }

  function changeCharges(id, delta) {
    setWands(prev => prev.map(w => w.id === id
      ? { ...w, charges: Math.max(0, Math.min(w.max_charges, w.charges + delta)) }
      : w))
  }

  function removeWand(id) {
    setWands(prev => prev.filter(w => w.id !== id))
  }

  return (
    <div className="wands-panel">
      {wands.length === 0 && !adding && (
        <p className="wands-empty">{L ? 'Keine Zauberstäbe eingetragen.' : 'No wands added yet.'}</p>
      )}

      {wands.map(w => {
        const pct = w.max_charges > 0 ? (w.charges / w.max_charges) * 100 : 0
        const color = pct > 50 ? '#6ec97e' : pct > 20 ? '#c9a96e' : '#c96e6e'
        return (
          <div key={w.id} className="wand-row">
            <div className="wand-info">
              <span className="wand-name">🪄 {w.name}</span>
              {w.notes && <span className="wand-notes">{w.notes}</span>}
            </div>
            <div className="wand-charges">
              <button className="wand-charge-btn" onClick={() => changeCharges(w.id, -1)} disabled={w.charges <= 0}>−</button>
              <div className="wand-charge-display">
                <span className="wand-charge-val" style={{ color }}>{w.charges}</span>
                <span className="wand-charge-sep">/</span>
                <span className="wand-charge-max">{w.max_charges}</span>
                <div className="wand-charge-bar">
                  <div className="wand-charge-fill" style={{ width: pct + '%', background: color }} />
                </div>
              </div>
              <button className="wand-charge-btn" onClick={() => changeCharges(w.id, 1)} disabled={w.charges >= w.max_charges}>+</button>
              <button className="wand-remove-btn" onClick={() => removeWand(w.id)} title={L ? 'Entfernen' : 'Remove'}>🗑</button>
            </div>
          </div>
        )
      })}

      {adding ? (
        <div className="wand-add-form">
          <input className="wand-input" placeholder={L ? 'Name (z.B. Zauberstab: Feuerball)' : 'Name (e.g. Wand of Fireball)'}
            value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && addWand()} autoFocus />
          <div className="wand-add-row">
            <label className="wand-add-label">{L ? 'Max. Ladungen' : 'Max charges'}</label>
            <input className="wand-input wand-input-num" type="text" inputMode="numeric"
              value={draft.max_charges}
              onChange={e => setDraft(d => ({ ...d, max_charges: e.target.value }))} />
          </div>
          <input className="wand-input" placeholder={L ? 'Notiz (optional)' : 'Note (optional)'}
            value={draft.notes} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} />
          <div className="wand-form-btns">
            <button className="wand-save-btn" onClick={addWand} disabled={!draft.name.trim()}>✓</button>
            <button className="wand-cancel-btn" onClick={() => setAdding(false)}>✕</button>
          </div>
        </div>
      ) : (
        <button className="wand-add-btn" onClick={() => setAdding(true)}>
          + {L ? 'Zauberstab / Stab hinzufügen' : 'Add wand / staff'}
        </button>
      )}
    </div>
  )
}

// ── Main tab ───────────────────────────────────────────────────────────────────
export function SpellsTab({ char, setSpellbook, attrs, lang }) {
  const L = lang === 'de'
  const [mode, setMode] = useState('book')  // 'lookup' | 'book'

  function handlePrepare(spell, level, classId) {
    setSpellbook(prev => {
      const lvData = { total: 0, used: 0, prepared: [], ...(prev.levels[level] ?? {}) }
      if (!lvData.prepared.includes(spell.id)) {
        lvData.prepared = [...lvData.prepared, spell.id]
      }
      return {
        ...prev,
        class_id: prev.class_id || classId,
        levels: { ...prev.levels, [level]: lvData }
      }
    })
  }

  return (
    <div className="spells-tab">
      {/* Mode toggle */}
      <div className="spell-mode-toggle">
        <button className={`smt-btn ${mode === 'lookup' ? 'active' : ''}`}
          onClick={() => setMode('lookup')}>
          {L ? '🔍 Nachschlagen' : '🔍 Lookup'}
        </button>
        <button className={`smt-btn ${mode === 'book' ? 'active' : ''}`}
          onClick={() => setMode('book')}>
          {L ? '📖 Zauberbuch' : '📖 Spellbook'}
        </button>
      </div>

      {mode === 'lookup' && <SpellLookup lang={lang} onPrepare={setSpellbook ? handlePrepare : null} />}
      {mode === 'book'   && <SpellBook char={char} setSpellbook={setSpellbook} attrs={attrs} lang={lang} />}
    </div>
  )
}
