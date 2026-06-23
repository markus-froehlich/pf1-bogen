import { useState, useMemo, useRef, useCallback } from 'react'
import weaponsData from '../data/weapons.json'
import { computeWeaponAttack } from '../engine/weapons.js'
import './WeaponsTab.css'

const OFFICIAL_WEAPONS = weaponsData.weapons
const EMPTY_SLOT  = { weapon_id: '', enhancement: 0, misc_attack: 0, misc_damage: 0, finesse: false, off_hand: false }
const NUM_SLOTS   = 5

// Map size_mod_rk → weapon damage size key
const SIZE_TO_DMG = { '2': 'sk', '1': 'k', '0': 'm', '-1': 'g', '-2': 'r', '-4': 'g', '-8': 'r' }

// Weapon special property abbreviations → German full names
const SPECIAL_MAP = {
  A: 'Abstützen',
  B: 'Blockend',
  D: 'Doppelwaffe',
  E: 'Entwaffnen',
  F: 'Flexibel',
  I: 'Injizieren',
  M: 'Mönch',
  N: 'Nicht-tödlich',
  R: 'Reichweite',
  S: 'Schusswaffe',
  T: 'Niederreißen',
  Z: 'Zerschmettern',
}

function expandSpecial(special) {
  if (!special) return ''
  // Match capital letters (possibly followed by lowercase like 'k', 'ö')
  const tokens = special.match(/[A-ZÄÖÜ][a-zäöü]?|[^A-ZÄÖÜ]+/g) ?? []
  const expanded = tokens
    .map(t => SPECIAL_MAP[t.charAt(0).toUpperCase()] ? SPECIAL_MAP[t.charAt(0).toUpperCase()] : t)
    .filter((v, i, a) => a.indexOf(v) === i)
  return expanded.join(' · ')
}

function WeaponSearch({ allWeapons, initialId, onSelect, onCancel, lang }) {
  const L = lang === 'de'
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(true)
  const inputRef = useRef(null)
  const closeTimer = useRef(null)

  const selected = allWeapons.find(w => w.id === initialId)
  const displayName = selected ? (selected.name?.de ?? selected.id) : ''

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return allWeapons
      .filter(w => (w.name?.de ?? w.id).toLowerCase().includes(q))
      .slice(0, 10)
  }, [query, allWeapons])

  function pick(id) {
    clearTimeout(closeTimer.current)
    onSelect(id)
    setOpen(false)
  }

  function handleBlur() {
    closeTimer.current = setTimeout(() => setOpen(false), 150)
  }
  function handleFocus() {
    clearTimeout(closeTimer.current)
    setOpen(true)
  }

  return (
    <div className="ws-search-wrap">
      <input
        ref={inputRef}
        className="ws-search-input"
        placeholder={displayName || (L ? 'Waffe suchen…' : 'Search weapon…')}
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        autoFocus
      />
      {open && suggestions.length > 0 && (
        <div className="ws-suggestions">
          {suggestions.map(w => (
            <div key={w.id} className="ws-suggestion-item"
              onMouseDown={() => pick(w.id)}>
              <span className="ws-sug-name">{w.name?.de ?? w.id}</span>
              {w.proficiency && <span className="ws-sug-prof">{w.proficiency}</span>}
            </div>
          ))}
        </div>
      )}
      {open && query.length > 0 && suggestions.length === 0 && (
        <div className="ws-suggestions">
          <div className="ws-sug-empty">{L ? 'Keine Treffer' : 'No results'}</div>
        </div>
      )}
    </div>
  )
}

export function WeaponsTab({ char, attrs, bab, setWeaponSlot, lang, hbWeapons = [] }) {
  const [isAdding, setIsAdding] = useState(false)
  const [editingIdx, setEditingIdx] = useState(null) // which filled slot is being re-searched
  const L = lang === 'de'
  const ALL_WEAPONS = useMemo(() => [...OFFICIAL_WEAPONS, ...hbWeapons], [hbWeapons])
  const WEAPON_MAP  = useMemo(() => Object.fromEntries(ALL_WEAPONS.map(w => [w.id, w])), [ALL_WEAPONS])

  // Character size → which damage column to show (sk/k/m/g/r)
  const sizeModRk = Number(char.combat_misc?.size_mod_rk ?? 0)
  const dmgKey = SIZE_TO_DMG[String(sizeModRk)] ?? 'm'

  const slots = useMemo(() => {
    const saved = char.weapons ?? []
    return Array.from({ length: NUM_SLOTS }, (_, i) => ({ ...EMPTY_SLOT, ...saved[i] }))
  }, [char.weapons])

  // Compute attack values for all slots at once (no hooks in loops)
  const computed = useMemo(() => slots.map(slot => {
    const def = WEAPON_MAP[slot.weapon_id]
    if (!def) return null
    const autoRanged = def.str_bonus_mult === 0.0
    const isRanged   = slot.is_ranged != null ? slot.is_ranged : autoRanged
    const strMult = slot.off_hand
      ? Math.min(def.str_bonus_mult ?? 1, 0.5)
      : (def.str_bonus_mult ?? 1)
    return computeWeaponAttack({ ...slot, is_ranged: isRanged, str_mult: strMult }, attrs, bab)
  }), [slots, attrs, bab, WEAPON_MAP])

  const filledSlots = useMemo(
    () => slots.map((s, i) => ({ ...s, _idx: i })).filter(s => s.weapon_id),
    [slots]
  )
  const firstEmptyIdx = slots.findIndex(s => !s.weapon_id)
  const canAdd = firstEmptyIdx !== -1

  const WeaponOptions = () => (
    <>
      <option value="">— {L ? 'Waffe wählen' : 'Choose weapon'} —</option>
      <optgroup label={L ? 'Offiziell' : 'Official'}>
        {OFFICIAL_WEAPONS.map(w => (
          <option key={w.id} value={w.id}>{w.name.de}</option>
        ))}
      </optgroup>
      {hbWeapons.length > 0 && (
        <optgroup label="Homebrew">
          {hbWeapons.map(w => (
            <option key={w.id} value={w.id}>⚙ {w.name?.de ?? w.id}</option>
          ))}
        </optgroup>
      )}
    </>
  )

  return (
    <div className="weapons-tab">
      {filledSlots.map((slot, displayIdx) => {
        const idx  = slot._idx
        const def  = WEAPON_MAP[slot.weapon_id]
        const comp = computed[idx]

        const autoRanged = def ? def.str_bonus_mult === 0.0 : false
        const isRanged   = slot.is_ranged != null ? slot.is_ranged : autoRanged
        const hasRange   = def?.range_m != null

        return (
          <div key={idx} className="weapon-slot filled">
            <div className="ws-select-row">
              <span className="ws-num">{displayIdx + 1}</span>
              {editingIdx === idx ? (
                <WeaponSearch
                  allWeapons={ALL_WEAPONS}
                  initialId={slot.weapon_id}
                  lang={lang}
                  onSelect={id => { setWeaponSlot(idx, 'weapon_id', id); setEditingIdx(null) }}
                  onCancel={() => setEditingIdx(null)}
                />
              ) : (
                <button className="ws-name-btn" onClick={() => setEditingIdx(idx)}
                  title={L ? 'Waffe wechseln' : 'Change weapon'}>
                  {def?.name?.de ?? slot.weapon_id}
                </button>
              )}
              {def?.proficiency && <span className="ws-prof-badge">{def.proficiency}</span>}
              <button
                className="ws-clear-btn"
                onClick={() => { setWeaponSlot(idx, 'weapon_id', ''); setEditingIdx(null) }}
                title={L ? 'Entfernen' : 'Remove'}
              >×</button>
            </div>

            {def && comp && (
              <>
                <div className="ws-stats-row">
                  <div className="ws-stat-box">
                    <span className="ws-lbl">{L ? 'Angriff' : 'Attack'}</span>
                    <span className="ws-big ws-iterative">{comp.full_attack_str}</span>
                  </div>
                  <div className="ws-stat-box">
                    <span className="ws-lbl">{L ? 'Schaden' : 'Damage'}</span>
                    <span className="ws-big">
                      {def.damage?.[dmgKey] ?? def.damage?.m ?? '—'}
                      {comp.damage_mod !== 0 ? ` ${comp.damage_str}` : ''}
                    </span>
                  </div>
                  <div className="ws-stat-box">
                    <span className="ws-lbl">{L ? 'Krit.' : 'Crit'}</span>
                    <span className="ws-big">{def.crit ?? '—'}</span>
                  </div>
                  {(hasRange || isRanged) && (
                    <div className="ws-stat-box">
                      <span className="ws-lbl">{L ? 'Reichweite' : 'Range'}</span>
                      <span className="ws-big">{hasRange ? `${def.range_m}m` : '—'}</span>
                      {hasRange && <span className="ws-sub">−2/Inkr.</span>}
                    </div>
                  )}
                </div>

                <div className="ws-mods-row">
                  {[
                    ['enhancement', L ? 'Verzaub.' : 'Enh.', 0, 10],
                    ['misc_attack',  L ? 'Angriff+' : 'Atk+', -10, 20],
                    ['misc_damage',  L ? 'Schaden+' : 'Dmg+', -10, 20],
                  ].map(([field, lbl, min, max]) => (
                    <label key={field} className="ws-mod-field">
                      <span>{lbl}</span>
                      <input
                        type="number" min={min} max={max}
                        value={slot[field]}
                        onChange={e => setWeaponSlot(idx, field, e.target.value)}
                      />
                    </label>
                  ))}
                  <div className="ws-chips">
                    <button
                      className={`ws-chip ${slot.finesse ? 'ws-chip-on' : ''}`}
                      onClick={() => setWeaponSlot(idx, 'finesse', !slot.finesse)}
                      title={L ? 'Waffenfinesse: GE statt ST für Angriff' : 'Weapon Finesse: DEX instead of STR for attack'}
                    >{L ? 'Waffenfinesse' : 'W.Finesse'}</button>
                    <button
                      className={`ws-chip ${slot.off_hand ? 'ws-chip-on' : ''}`}
                      onClick={() => setWeaponSlot(idx, 'off_hand', !slot.off_hand)}
                      title={L ? 'Nebenhand: −4 Angriff, ½ ST auf Schaden' : 'Off-hand: −4 attack, ½ STR to damage'}
                    >{L ? 'Nebenhand' : 'Off-hand'}</button>
                    <button
                      className={`ws-chip ${isRanged ? 'ws-chip-on' : ''}`}
                      onClick={() => setWeaponSlot(idx, 'is_ranged', !isRanged)}
                      title={L ? 'Fernkampf: GE statt ST für Angriff' : 'Ranged: DEX instead of STR for attack'}
                    >{L ? 'Fernkampf' : 'Ranged'}</button>
                  </div>
                </div>

                {def.special && (
                  <div className="ws-special" title={def.special}>{expandSpecial(def.special)}</div>
                )}
              </>
            )}
          </div>
        )
      })}

      {isAdding && firstEmptyIdx !== -1 && (
        <div className="weapon-slot ws-adding">
          <div className="ws-select-row">
            <WeaponSearch
              allWeapons={ALL_WEAPONS}
              initialId=""
              lang={lang}
              onSelect={id => { setWeaponSlot(firstEmptyIdx, 'weapon_id', id); setIsAdding(false) }}
              onCancel={() => setIsAdding(false)}
            />
            <button
              className="ws-clear-btn"
              onClick={() => setIsAdding(false)}
              title={L ? 'Abbrechen' : 'Cancel'}
            >×</button>
          </div>
        </div>
      )}

      {!isAdding && canAdd && (
        <button className="ws-add-btn" onClick={() => setIsAdding(true)}>
          + {L ? 'Neue Waffe' : 'Add weapon'}
        </button>
      )}
    </div>
  )
}
