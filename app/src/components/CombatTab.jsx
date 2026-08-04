import { useState, useRef } from 'react'
import { ARMOR_MAP, SHIELDS_MAP } from '../engine/index.js'
import armorData      from '../data/armor.json'
import shieldsData    from '../data/shields.json'
import racesData      from '../data/races.json'
import weaponsData    from '../data/weapons.json'
import { computeWeaponAttack } from '../engine/weapons.js'
import { condAnnot, buffAnnot, BuffTag, CondTag } from './DetailTag.jsx'
import './CombatTab.css'

const ALL_ARMOR   = armorData.armor
const ALL_SHIELDS = shieldsData.shields
const RACE_MAP_BASE = Object.fromEntries(racesData.races.map(r => [r.id, r]))

// PF1e encumbrance speed table (medium/heavy load, same reduction)
function encumberedSpeed(baseM) {
  const ft = Math.round(baseM / 0.3)
  if (ft <= 5)  return 1.5
  if (ft <= 10) return 1.5
  if (ft <= 15) return 3
  if (ft <= 20) return 4.5
  if (ft <= 25) return 6
  if (ft <= 30) return 6
  if (ft <= 35) return 7.5
  if (ft <= 40) return 9
  if (ft <= 45) return 9
  return Math.round(ft * 2 / 3 / 5) * 5 * 0.3
}

// PF1e size mods: { rk, kmb }  (RK and KMB/KMV use equal-and-opposite values)
const SIZE_MODS = {
  winzig:      { de: 'Winzig',      en: 'Tiny',       rk:  2, kmb: -2 },
  klein:       { de: 'Klein',       en: 'Small',      rk:  1, kmb: -1 },
  mittelgross: { de: 'Mittelgroß',  en: 'Medium',     rk:  0, kmb:  0 },
  gross:       { de: 'Groß',        en: 'Large',      rk: -1, kmb:  1 },
  riesig:      { de: 'Riesig',      en: 'Huge',       rk: -2, kmb:  2 },
  gigantisch:  { de: 'Gigantisch',  en: 'Gargantuan', rk: -4, kmb:  4 },
  kolossal:    { de: 'Kolossal',    en: 'Colossal',   rk: -8, kmb:  8 },
}

// Map German race size text → SIZE_MODS key
const RACE_SIZE_KEY = {
  'Mittelgroß': 'mittelgross', 'Klein': 'klein', 'Winzig': 'winzig',
  'Groß': 'gross', 'Riesig': 'riesig', 'Gigantisch': 'gigantisch', 'Kolossal': 'kolossal',
}

const fmtBonus = n => n >= 0 ? `+${n}` : `${n}`
const pct = f => `${Math.round(f * 100)}%`

function StatBox({ label, value, sub, className, buffInfo, condInfo, lang }) {
  return (
    <div className={`stat-box${className ? ' ' + className : ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value-row">
        <div className="stat-value">{typeof value === 'number' ? fmtBonus(value) : value}</div>
        <BuffTag info={buffInfo} />
        <CondTag info={condInfo} lang={lang} />
      </div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

function InitBox({ combat, misc, onMiscChange, lang, buffInfo, condInfo }) {
  const L = lang === 'de'
  const storedMisc = Number(misc.init_misc ?? 0)
  const featBonus = combat._components?.init_feat ?? 0
  const miscValue = featBonus === 4 && storedMisc === 4 ? 0 : storedMisc
  const parts = []
  if (featBonus) parts.push(L ? `Verbesserte Initiative: +${featBonus}` : `Improved Initiative: +${featBonus}`)
  if (miscValue) parts.push(`${L ? 'Sonstiges' : 'Other'}: ${fmtBonus(miscValue)}`)
  if (buffInfo?.title) parts.push(buffInfo.title)
  const extraTotal = featBonus + miscValue + (buffInfo?.total ?? 0)
  const extraInfo = extraTotal !== 0 ? { total: extraTotal, title: parts.join(', ') } : null

  return (
    <div className="stat-box">
      <div className="stat-label">Init</div>
      <div className="stat-value-row">
        <div className="stat-value">{fmtBonus(combat.init)}</div>
        <BuffTag info={extraInfo} />
        <CondTag info={condInfo} lang={lang} />
      </div>
      <div className="stat-sub">GE{fmtBonus(combat._components?.init_ability ?? 0)}</div>
      <div className="stat-misc">
        <input className="stat-misc-input" type="number" value={miscValue}
          onChange={e => onMiscChange(e.target.value)} />
        <span>{L ? 'Sonst.' : 'Other'}</span>
      </div>
    </div>
  )
}

function SaveBox({ label, total, base, mod, modAttr, misc, onMiscChange, note, onNoteChange, notePlaceholder, lang, buffInfo, condInfo }) {
  const L = lang === 'de'
  return (
    <div className="save-box">
      <div className="save-header">
        <span className="save-label">{label}</span>
        <div className="save-total-wrap">
          <span className="save-total">{fmtBonus(total)}</span>
          <BuffTag info={buffInfo} />
          <CondTag info={condInfo} lang={lang} />
        </div>
      </div>
      <div className="save-breakdown">
        <div className="save-part">
          <span className="save-part-val">{base}</span>
          <span className="save-part-lbl">{L ? 'Klasse' : 'Class'}</span>
        </div>
        <span className="save-sep">{mod >= 0 ? '+' : '−'}</span>
        <div className="save-part">
          <span className="save-part-val">{Math.abs(mod)}</span>
          <span className="save-part-lbl">{modAttr}</span>
        </div>
        <span className="save-sep">+</span>
        <div className="save-part">
          <input className="save-misc-input" type="number" value={misc}
            onChange={e => onMiscChange(e.target.value)} />
          <span className="save-part-lbl">{L ? 'Sonst.' : 'Other'}</span>
        </div>
      </div>
      <input
        className="save-note-input"
        type="text"
        placeholder={notePlaceholder}
        value={note ?? ''}
        onChange={e => onNoteChange(e.target.value)}
      />
    </div>
  )
}

function GearSelector({ label, items, selectedId, enh, onSelect, onEnh, lang }) {
  const L = lang === 'de'
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  const def = selectedId ? (ARMOR_MAP[selectedId] ?? SHIELDS_MAP[selectedId]) : null
  const selectedName = def ? def.name.de : ''

  const q = query.toLowerCase()
  const filtered = q ? items.filter(i => i.name.de.toLowerCase().includes(q)) : items

  // Group by type
  const groups = {}
  filtered.forEach(item => {
    const t = item.type || '—'
    if (!groups[t]) groups[t] = []
    groups[t].push(item)
  })

  function pick(id) { onSelect(id); setQuery(''); setOpen(false) }
  function clear(e) { e.stopPropagation(); onSelect(''); setQuery(''); setOpen(false) }

  return (
    <div className="gear-selector">
      <div className="gear-row">
        <span className="gear-label">{label}</span>
        <div className="gear-search-wrap" ref={wrapRef}>
          <input
            className="gear-search-input"
            type="text"
            placeholder={open ? (L ? 'Suchen…' : 'Search…') : (selectedName || (L ? '— keine —' : '— none —'))}
            value={open ? query : (selectedName ? '' : '')}
            readOnly={!open}
            onFocus={() => { setOpen(true); setQuery('') }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onChange={e => setQuery(e.target.value)}
          />
          {selectedId && !open && (
            <span className="gear-search-val">{selectedName}</span>
          )}
          {selectedId && (
            <button className="gear-clear-btn" onMouseDown={clear} tabIndex={-1}>×</button>
          )}
          {open && (
            <div className="gear-dropdown">
              <div className="gear-dd-none" onMouseDown={() => pick('')}>
                — {L ? 'keine' : 'none'} —
              </div>
              {Object.entries(groups).map(([type, typeItems]) => (
                <div key={type}>
                  <div className="gear-dd-group">{type}</div>
                  {typeItems.map(item => (
                    <div key={item.id}
                      className={`gear-dd-item${item.id === selectedId ? ' selected' : ''}`}
                      onMouseDown={() => pick(item.id)}>
                      <span className="gear-dd-name">{item.name.de}</span>
                      <span className="gear-dd-bonus">+{item.bonus}</span>
                    </div>
                  ))}
                </div>
              ))}
              {filtered.length === 0 && <div className="gear-dd-empty">{L ? 'Keine Treffer' : 'No results'}</div>}
            </div>
          )}
        </div>
        <label className="gear-enh-label">
          <span>{L ? 'Verz.' : 'Enh.'}</span>
          <input
            className="gear-enh"
            type="number" min={0} max={10}
            value={enh}
            onChange={e => onEnh(e.target.value)}
          />
        </label>
      </div>
      {def && (
        <div className="gear-info">
          <span className="gi-tag">{def.type}</span>
          <span className="gi-bonus">RK +{def.bonus + Number(enh)}</span>
          {def.max_dex != null && <span className="gi-cap">Max. GE {def.max_dex}</span>}
          {def.check_penalty < 0 && <span className="gi-pen">Rüstungsmalus {def.check_penalty}</span>}
          {def.spell_failure > 0 && <span className="gi-fail">Zauberpatzer {pct(def.spell_failure)}</span>}
        </div>
      )}
    </div>
  )
}

const INTERNAL_DEFAULT = ['hp', 'combat', 'speed', 'ac', 'saves', 'dr']
const PHONE_SECTION_LABELS = {
  Trefferpunkte: 'TP',
  Kampfwerte: 'Kampf',
  Rüstungsklasse: 'RK',
  Rettungswürfe: 'RW',
  'Schadensreduktion & Resistenzen': 'Schadensreduktion',
}

function SectionHead({ id, label, summary, idx, count, collapsed, onToggle, onMove }) {
  const compactLabel = PHONE_SECTION_LABELS[label]
  return (
    <div className="ct-heading-row">
      <button className="ct-collapse-btn" onClick={() => onToggle?.(id)} title={collapsed ? 'Aufklappen' : 'Zuklappen'}>
        {collapsed ? '▶' : '▼'}
      </button>
      <h3 className="ct-heading ct-heading-clk" onClick={() => onToggle?.(id)}>
        {compactLabel ? <><span className="ct-heading-full">{label}</span><span className="ct-heading-phone">{compactLabel}</span></> : label}
      </h3>
      {collapsed && summary && <div className="ct-heading-summary">{summary}</div>}
      {onMove && (
        <div className="ct-move-btns">
          <button className="ct-move-btn" disabled={idx === 0} onClick={() => onMove(id, -1)} title="Nach oben">↑</button>
          <button className="ct-move-btn" disabled={idx === count - 1} onClick={() => onMove(id, 1)} title="Nach unten">↓</button>
        </div>
      )}
    </div>
  )
}

export function CombatTab({ char, attrs, combat, baseValues, setCombatMisc, setGear, setHp, setNlDamage, lang, hbRaces = [], hbArmor = [], hbShields = [], hbWeapons = [], encumbranceTier = 'light', applyCarryMovement = false, buffTotals = {}, activeBuffs = [], condMods = {}, sectionOrder, onMoveSection, collapsedSections, onToggleCollapse, extraPanels = {}, extraLabels = {}, isCompanion = false, companionHd = null }) {
  const L = lang === 'de'
  const misc = char.combat_misc ?? {}
  const gear = char.gear ?? {}
  const hp   = char.hp ?? { max: 0, current: 0, temp: 0 }
  const nlDmg = char.nl_damage ?? 0
  const [dmgInput, setDmgInput]   = useState('')
  const [nlInput,  setNlInput]    = useState('')
  const hpPct = hp.max > 0 ? Math.max(0, Math.min(1, hp.current / hp.max)) : 0

  const RACE_MAP = { ...RACE_MAP_BASE, ...Object.fromEntries(hbRaces.map(r => [r.id, r])) }
  const ALL_ARMOR_MERGED   = [...armorData.armor,   ...hbArmor]
  const ALL_SHIELDS_MERGED = [...shieldsData.shields, ...hbShields]

  const raceData   = RACE_MAP[char.meta.race]
  // Only medium/heavy armor reduces movement speed in PF1e RAW — light armor
  // (and shields) never do, regardless of whether one is equipped.
  const armorDefForSpeed = gear.armor_id ? ALL_ARMOR_MERGED.find(a => a.id === gear.armor_id) : null
  const hasArmor   = armorDefForSpeed?.type === 'Mittel' || armorDefForSpeed?.type === 'Schwer'
  const manualSpeed = misc.speed_walk === '' || misc.speed_walk == null ? null : Number(misc.speed_walk)
  const speedRaw   = manualSpeed ?? (hasArmor
    ? (raceData?.speed_m?.armored ?? raceData?.speed_m?.unarmored ?? null)
    : (raceData?.speed_m?.unarmored ?? null))
  const baseSpeedM  = manualSpeed ?? raceData?.speed_m?.unarmored ?? speedRaw
  const encumbered  = applyCarryMovement && encumbranceTier !== 'light' && baseSpeedM != null
  const speedFinal  = encumbered ? Math.min(speedRaw ?? Infinity, encumberedSpeed(baseSpeedM)) : speedRaw
  const speedLabel  = speedFinal != null ? `${speedFinal} m` : '—'

  // Conditions like Entkräftet/Erschöpft/Verstrickt/Ringend work by changing the
  // effective ST/GE mod (not a flat 'attack'/'rk' bump) — condAnnot() alone can't
  // see that. Compute the actual clamped delta here (attrs is available) so boxes
  // that derive from ST/GE (Nahkampf/Fernkampf/KMB/KMV) can show it as a badge too.
  const stModDelta = Math.max(-5, attrs.ST.mod + (condMods.str_mod_delta ?? 0)) - attrs.ST.mod
  const geModDelta = Math.max(-5, attrs.GE.mod + (condMods.dex_mod_delta ?? 0)) - attrs.GE.mod
  function modInfo(delta, sourceIds) {
    return delta !== 0 ? { total: delta, sourceIds: sourceIds ?? [] } : null
  }
  function mergeCondInfo(...infos) {
    const valid = infos.filter(Boolean)
    if (!valid.length) return null
    const total = valid.reduce((s, i) => s + i.total, 0)
    return total !== 0 ? { total, sourceIds: [...new Set(valid.flatMap(i => i.sourceIds))] } : null
  }
  const stAttackCondInfo = mergeCondInfo(condAnnot(condMods, 'attack'), modInfo(stModDelta, condMods.sources?.str_mod_delta))
  const geAttackCondInfo = mergeCondInfo(condAnnot(condMods, 'attack'), modInfo(geModDelta, condMods.sources?.dex_mod_delta))
  const kmvCondInfo = mergeCondInfo(condAnnot(condMods, 'rk'), modInfo(geModDelta, condMods.sources?.dex_mod_delta))

  const allKnownIds = [...INTERNAL_DEFAULT, ...Object.keys(extraPanels)]
  const order_ = (sectionOrder ?? INTERNAL_DEFAULT).filter(id => allKnownIds.includes(id))

  const weaponSummary = (() => {
    const sizeModRk = Number(misc.size_mod_rk ?? 0)
    const damageKey = ({ 2: 'sk', 1: 'k', 0: 'm', '-1': 'g', '-2': 'r', '-4': 'g', '-8': 'r' })[sizeModRk] ?? 'm'
    const weaponMap = Object.fromEntries([...weaponsData.weapons, ...hbWeapons].map(weapon => [weapon.id, weapon]))
    const standardWeapons = (char.weapons ?? []).flatMap(slot => {
      const weapon = weaponMap[slot.weapon_id]
      if (!weapon) return []
      const isRanged = slot.is_ranged != null ? slot.is_ranged : weapon.str_bonus_mult === 0
      const strMult = slot.off_hand ? Math.min(weapon.str_bonus_mult ?? 1, 0.5) : (weapon.str_bonus_mult ?? 1)
      const result = computeWeaponAttack({ ...slot, is_ranged: isRanged, str_mult: strMult }, attrs, baseValues.bab, condMods, buffTotals.attack ?? 0)
      const damage = weapon.damage?.[damageKey] ?? weapon.damage?.m ?? '—'
      return [`${weapon.name?.[L ? 'de' : 'en'] ?? weapon.name?.de ?? weapon.id} ${result.full_attack_str} · ${damage}${result.damage_mod ? result.damage_str : ''}`]
    })
    const naturalWeapons = (extraPanels.weapons?.props?.companionAttacks ?? []).map(attack => {
      const result = computeWeaponAttack({ weapon_id: `companion_${attack.name}`, str_mult: attack.strMult }, attrs, baseValues.bab, condMods, buffTotals.attack ?? 0)
      return `${attack.name} ${result.full_attack_str} · ${attack.damage}${result.damage_mod ? result.damage_str : ''}`
    })
    return [...naturalWeapons, ...standardWeapons].join('  |  ')
  })()

  const renderSection = (id, idx) => {
    const count = order_.length
    const isCollapsed = collapsedSections?.has(id) ?? false
    if (id === 'hp') return (
      <section key="hp" className="ct-section">
        <SectionHead id="hp" label={L ? 'Trefferpunkte' : 'Hit Points'} summary={`${hp.current} / ${hp.max} ${L ? 'TP' : 'HP'}`} idx={idx} count={count} onMove={onMoveSection} collapsed={isCollapsed} onToggle={onToggleCollapse} />
        {!isCollapsed && <>
          <div className="hp-bar-wrap">
            <div className="hp-bar" style={{ width: `${hpPct * 100}%`,
              background: hpPct > 0.5 ? '#6ec96e' : hpPct > 0.25 ? '#c9a96e' : '#c96e6e' }} />
          </div>
          <div className="hp-row">
            <label className="hp-field">
              <span>Max</span>
              <input type="number" min={0} className="hp-input"
                value={hp.max}
                onChange={e => setHp('max', e.target.value)} />
            </label>
            <label className="hp-field hp-current">
              <span>{L ? 'Aktuell' : 'Current'}</span>
              <input type="number" className="hp-input hp-input-big"
                value={hp.current}
                onChange={e => setHp('current', e.target.value)} />
            </label>
            <label className="hp-field">
              <span>Temp.</span>
              <input type="number" min={0} className="hp-input"
                value={hp.temp}
                onChange={e => setHp('temp', e.target.value)} />
            </label>
            <label className="hp-field">
              <span>{L ? 'NT' : 'NL'}</span>
              <input type="number" min={0} className="hp-input"
                value={nlDmg}
                onChange={e => setNlDamage?.(e.target.value)} />
            </label>
          </div>
          {companionHd != null && (
            <div className="hp-companion-hd" title={L ? 'Wird aus der Stufe des verknüpften Druiden berechnet' : 'Calculated from the linked druid level'}>
              <span>{companionHd} {L ? 'TW' : 'HD'}</span>
              <span>W8</span>
            </div>
          )}
          <label className="hp-rolls-field">
            <span>{L ? 'Trefferwürfel-Historie' : 'Hit-die history'}</span>
            <input
              type="text"
              value={hp.rolls ?? ''}
              onChange={e => setHp('rolls', e.target.value)}
              placeholder={L ? 'z.B. 8 + 7 + 7 + 8 + 4 + 1; je TW +5 KO' : 'e.g. 8 + 7 + 7 + 8 + 4 + 1; +5 CON per HD'}
            />
          </label>
          {(baseValues?.totalLevel ?? 0) > 0 && (() => {
            const koMod   = attrs?.KO?.mod ?? 0
            const lvls    = baseValues.totalLevel
            const contrib = koMod * lvls
            return (
              <div className="hp-ko-hint"
                title={`KO-Mod ${koMod >= 0 ? '+' : ''}${koMod} × ${lvls} Stufen = ${contrib >= 0 ? '+' : ''}${contrib} Max-TP`}>
                <span className="hp-ko-label">KO</span>
                <span className="hp-ko-eq">{koMod >= 0 ? '+' : ''}{koMod} × {lvls} Stufen</span>
                <span className={`hp-ko-val ${contrib < 0 ? 'neg' : ''}`}>{contrib >= 0 ? '+' : ''}{contrib} TP</span>
              </div>
            )
          })()}
          <div className="hp-dmg-row">
            <span className="hp-dmg-label">{L ? 'Schaden' : 'Damage'}</span>
            <input className="hp-dmg-input" type="number" min={0} placeholder="0"
              value={dmgInput} onChange={e => setDmgInput(e.target.value)} />
            <button className="hp-dmg-btn" onClick={() => {
              const v = parseInt(dmgInput) || 0; if (v > 0) { setHp('current', hp.current - v); setDmgInput('') }
            }}>−TP</button>
            <span className="hp-dmg-sep" />
            <span className="hp-dmg-label">{L ? 'NT' : 'NL'}</span>
            <input className="hp-dmg-input" type="number" min={0} placeholder="0"
              value={nlInput} onChange={e => setNlInput(e.target.value)} />
            <button className="hp-dmg-btn" onClick={() => {
              const v = parseInt(nlInput) || 0; if (v > 0) { setNlDamage?.(nlDmg + v); setNlInput('') }
            }}>{L ? '+NT' : '+NL'}</button>
          </div>
          {nlDmg > 0 && (
            <div className="hp-nl-row">
              <span className="hp-nl-info">{L ? `Bewusstlos bei ≤${hp.current - nlDmg} TP` : `Unconscious at ≤${hp.current - nlDmg} HP`}</span>
              <button className="hp-nl-clear" onClick={() => setNlDamage?.(0)}>{L ? 'Erholt' : 'Recovered'}</button>
            </div>
          )}
        </>}
      </section>
    )
    if (id === 'combat') return (
      <section key="combat" className="ct-section">
        <SectionHead id="combat" label={L ? 'Kampfwerte' : 'Combat values'} summary={`Init ${fmtBonus(combat.init)} · KMB ${fmtBonus(combat.kmb)} · KMV ${fmtBonus(combat.kmv)}`} idx={idx} count={count} onMove={onMoveSection} collapsed={isCollapsed} onToggle={onToggleCollapse} />
        {!isCollapsed && <>
          {/* Size selector — auto-detect from race, allow override */}
          {(() => {
            const raceSizeKey = RACE_SIZE_KEY[RACE_MAP[char.meta.race]?.size?.de] ?? 'mittelgross'
            // Determine current selected key from misc values; default to race size
            const curRK  = Number(misc.size_mod_rk  ?? SIZE_MODS[raceSizeKey].rk)
            const curKey = Object.keys(SIZE_MODS).find(k => SIZE_MODS[k].rk === curRK) ?? raceSizeKey
            return (
              <div className="size-row">
                <span className="size-label">{L ? 'Größe' : 'Size'}</span>
                <select className="size-select" value={curKey} onChange={e => {
                  const m = SIZE_MODS[e.target.value]
                  setCombatMisc('size_mod_rk', m.rk)
                  setCombatMisc('size_mod_kmb', m.kmb)
                }}>
                  {Object.entries(SIZE_MODS).map(([k, v]) => <option key={k} value={k}>{L ? v.de : v.en}</option>)}
                </select>
                <span className="size-mods">
                  RK {fmtBonus(SIZE_MODS[curKey].rk)} · KMB {fmtBonus(SIZE_MODS[curKey].kmb)}
                </span>
              </div>
            )
          })()}

          <div className="stat-row">
            <StatBox label="GAB" value={combat.bab} />
            <InitBox combat={combat} misc={misc} onMiscChange={v => setCombatMisc('init_misc', v)}
              buffInfo={buffAnnot(activeBuffs, 'init')}
              condInfo={condAnnot(condMods, 'init')} lang={lang} />
            <StatBox label="KMB" value={combat.kmb}
              buffInfo={buffAnnot(activeBuffs, 'attack')}
              condInfo={stAttackCondInfo} lang={lang} />
            <StatBox label="KMV" value={combat.kmv}
              condInfo={kmvCondInfo} lang={lang} />
            <StatBox label={L ? 'Nahkampf' : 'Melee'}
              value={combat.melee_attacks.map(fmtBonus).join('/')}
              className="stat-box-attacks"
              buffInfo={buffAnnot(activeBuffs, 'attack')}
              condInfo={stAttackCondInfo} lang={lang} />
            <StatBox label={L ? 'Fernkampf' : 'Ranged'}
              value={combat.ranged_attacks.map(fmtBonus).join('/')}
              className="stat-box-attacks"
              buffInfo={buffAnnot(activeBuffs, 'attack')}
              condInfo={geAttackCondInfo} lang={lang} />
          </div>
        </>}
      </section>
    )
    if (id === 'speed') return (
      <section key="speed" className="ct-section">
        <SectionHead id="speed" label={L ? 'Bewegung' : 'Movement'} summary={`${L ? 'Zu Fuß' : 'Walk'} ${speedLabel}`} idx={idx} count={count} onMove={onMoveSection} collapsed={isCollapsed} onToggle={onToggleCollapse} />
        {!isCollapsed && <>
          <div className="speed-main-row">
            <div className="speed-main-box">
              <div className="stat-label">{L ? 'Zu Fuß' : 'Walk'}</div>
              <div className="speed-main-val">{speedLabel}</div>
              {encumbered && (
                <div className="speed-enc" title={L ? `Tragelast ${encumbranceTier === 'medium' ? 'Mittel' : 'Schwer'} (RAW)` : `${encumbranceTier} load (RAW)`}>
                  🏃 {encumbranceTier === 'medium' ? (L ? 'Mittel' : 'Med') : (L ? 'Schwer' : 'Heavy')}
                </div>
              )}
              {!encumbered && hasArmor && raceData?.speed_m?.unarmored != null && raceData.speed_m.unarmored !== raceData.speed_m.armored && (
                <div className="speed-unarm">{raceData.speed_m.unarmored} m {L ? 'unbew.' : 'unarm.'}</div>
              )}
            </div>
            <div className="speed-extras-grid">
              <div className="es-cell">
                <span className="es-label">{L ? 'Fliegen' : 'Fly'}</span>
                <input className="es-input" type="number" min={0} placeholder="—"
                  value={misc.speed_fly ?? ''}
                  onChange={e => setCombatMisc('speed_fly', e.target.value ? Number(e.target.value) : '')} />
                <span className="es-unit">m</span>
              </div>
              <div className="es-cell">
                <span className="es-label">{L ? 'Schwimmen' : 'Swim'}</span>
                <input className="es-input" type="number" min={0} placeholder="—"
                  value={misc.speed_swim ?? ''}
                  onChange={e => setCombatMisc('speed_swim', e.target.value ? Number(e.target.value) : '')} />
                <span className="es-unit">m</span>
              </div>
              <div className="es-cell">
                <span className="es-label">{L ? 'Klettern' : 'Climb'}</span>
                <input className="es-input" type="number" min={0} placeholder="—"
                  value={misc.speed_climb ?? ''}
                  onChange={e => setCombatMisc('speed_climb', e.target.value ? Number(e.target.value) : '')} />
                <span className="es-unit">m</span>
              </div>
            </div>
          </div>
        </>}
      </section>
    )
    if (id === 'ac') return (
      <section key="ac" className="ct-section">
        <SectionHead id="ac" label={L ? 'Rüstungsklasse' : 'Armor Class'} summary={`${L ? 'RK' : 'AC'} ${fmtBonus(combat.rk)}`} idx={idx} count={count} onMove={onMoveSection} collapsed={isCollapsed} onToggle={onToggleCollapse} />
        {!isCollapsed && <>
          <div className="stat-row">
            <StatBox label={L ? 'RK' : 'AC'} value={combat.rk}
              buffInfo={buffAnnot(activeBuffs, 'ac', 'nat_armor', 'deflection')}
              condInfo={condAnnot(condMods, 'rk')} lang={lang} />
            <StatBox label={L ? 'Berührung' : 'Touch'} value={combat.rk_touch}
              buffInfo={buffAnnot(activeBuffs, 'ac', 'deflection')}
              condInfo={condAnnot(condMods, 'rk')} lang={lang} />
            <StatBox label={L ? 'Falsch. Fuß' : 'Flat'} value={combat.rk_flat}
              buffInfo={buffAnnot(activeBuffs, 'ac', 'nat_armor')} />
          </div>

          <GearSelector
            label={L ? 'Rüstung' : 'Armor'}
            items={ALL_ARMOR_MERGED}
            selectedId={gear.armor_id ?? ''}
            enh={gear.armor_enh ?? 0}
            onSelect={v => setGear('armor_id', v)}
            onEnh={v => setGear('armor_enh', Number(v) || 0)}
            lang={lang}
          />
          <GearSelector
            label={L ? 'Schild' : 'Shield'}
            items={ALL_SHIELDS_MERGED}
            selectedId={gear.shield_id ?? ''}
            enh={gear.shield_enh ?? 0}
            onSelect={v => setGear('shield_id', v)}
            onEnh={v => setGear('shield_enh', Number(v) || 0)}
            lang={lang}
          />

          <div className="rk-inputs">
            {[
              ['rk_natural', L ? 'Natürlich' : 'Natural',   buffTotals.nat_armor  ?? 0],
              ['rk_deflect', L ? 'Ausweichen' : 'Deflect',  buffTotals.deflection ?? 0],
              ['rk_misc',    L ? 'Sonstiges' : 'Misc',      0],
            ].map(([key, lbl, buffVal]) => (
              <label key={key} className="rk-field">
                <span>{lbl}</span>
                <div className="rk-field-val">
                  <input type="number" value={misc[key] ?? 0} onChange={e => setCombatMisc(key, e.target.value)} />
                  {buffVal !== 0 && (
                    <span className="rk-buff-badge" title={L ? 'Aus aktivem Buff' : 'From active buff'}>
                      +{buffVal}
                    </span>
                  )}
                </div>
              </label>
            ))}
          </div>
        </>}
      </section>
    )
    if (id === 'saves') return (
      <section key="saves" className="ct-section">
        <SectionHead id="saves" label={L ? 'Rettungswürfe' : 'Saving Throws'} summary={L ? `Zäh ${fmtBonus(combat.fort)} · Ref ${fmtBonus(combat.ref)} · Wil ${fmtBonus(combat.will)}` : `Fort ${fmtBonus(combat.fort)} · Ref ${fmtBonus(combat.ref)} · Will ${fmtBonus(combat.will)}`} idx={idx} count={count} onMove={onMoveSection} collapsed={isCollapsed} onToggle={onToggleCollapse} />
        {!isCollapsed && <>
          <div className="saves-grid">
            <SaveBox label={L ? 'Zähigkeit' : 'Fortitude'} total={combat.fort}
              base={baseValues.fort} mod={attrs.KO.mod} modAttr={L ? 'KO' : 'CON'}
              misc={misc.fort_misc ?? 0} onMiscChange={v => setCombatMisc('fort_misc', v)}
              note={misc.fort_note ?? ''} onNoteChange={v => setCombatMisc('fort_note', v)}
              notePlaceholder={L ? 'z.B. Umhang der Resistenz +2, Sturheit …' : 'e.g. Cloak of Resistance +2 …'} lang={lang}
              buffInfo={buffAnnot(activeBuffs, 'saves_all', 'fort')}
              condInfo={condAnnot(condMods, 'fort')} />
            <SaveBox label={L ? 'Reflex' : 'Reflex'} total={combat.ref}
              base={baseValues.ref} mod={attrs.GE.mod} modAttr={L ? 'GE' : 'DEX'}
              misc={misc.ref_misc ?? 0} onMiscChange={v => setCombatMisc('ref_misc', v)}
              note={misc.ref_note ?? ''} onNoteChange={v => setCombatMisc('ref_note', v)}
              notePlaceholder={L ? 'z.B. Umhang der Resistenz +2, Schnelle Reflexe …' : 'e.g. Cloak of Resistance +2 …'} lang={lang}
              buffInfo={buffAnnot(activeBuffs, 'saves_all', 'ref')}
              condInfo={condAnnot(condMods, 'ref_flat')} />
            <SaveBox label={L ? 'Wille' : 'Will'} total={combat.will}
              base={baseValues.will} mod={attrs.WE.mod} modAttr={L ? 'WE' : 'WIS'}
              misc={misc.will_misc ?? 0} onMiscChange={v => setCombatMisc('will_misc', v)}
              note={misc.will_note ?? ''} onNoteChange={v => setCombatMisc('will_note', v)}
              notePlaceholder={L ? 'z.B. Umhang der Resistenz +2, Eiserner Wille …' : 'e.g. Cloak of Resistance +2 …'} lang={lang}
              buffInfo={buffAnnot(activeBuffs, 'saves_all', 'will')}
              condInfo={condAnnot(condMods, 'will')} />
          </div>
        </>}
      </section>
    )
    if (id === 'dr') return (
      <section key="dr" className="ct-section">
        <SectionHead id="dr" label={L ? 'Schadensreduktion & Resistenzen' : 'DR & Resistances'} idx={idx} count={count} onMove={onMoveSection} collapsed={isCollapsed} onToggle={onToggleCollapse} />
        {!isCollapsed && <>
          <div className="dr-grid">
            <label className="dr-field">
              <span className="dr-label">{L ? 'Schadensreduktion' : 'Damage Reduction'}</span>
              <input
                className="dr-input"
                type="text"
                placeholder={L ? 'z.B. 5/Silber, 10/Magie' : 'e.g. 5/Silver, 10/Magic'}
                value={misc.dr_text ?? ''}
                onChange={e => setCombatMisc('dr_text', e.target.value)}
              />
            </label>
            <label className="dr-field">
              <span className="dr-label">{L ? 'Resistenzen' : 'Resistances'}</span>
              <input
                className="dr-input"
                type="text"
                placeholder={L ? 'z.B. Feuer 10, Kälte 5, Elektrizität 5' : 'e.g. Fire 10, Cold 5'}
                value={misc.resist_text ?? ''}
                onChange={e => setCombatMisc('resist_text', e.target.value)}
              />
            </label>
            <label className="dr-field">
              <span className="dr-label">{L ? 'Immunität' : 'Immunity'}</span>
              <input
                className="dr-input"
                type="text"
                placeholder={L ? 'z.B. Schlaf, Furcht, Gift' : 'e.g. Sleep, Fear, Poison'}
                value={misc.immunity_text ?? ''}
                onChange={e => setCombatMisc('immunity_text', e.target.value)}
              />
            </label>
          </div>
        </>}
      </section>
    )
    // Extra (outer) panels passed from App.jsx
    if (extraPanels[id]) return (
      <section key={id} className="ct-section">
        <SectionHead id={id} label={extraLabels[id] ?? id} summary={id === 'weapons' ? weaponSummary : ''} idx={idx} count={count} onMove={onMoveSection} collapsed={isCollapsed} onToggle={onToggleCollapse} />
        {!isCollapsed && extraPanels[id]}
      </section>
    )
    return null
  }

  return (
    <div className="combat-tab">
      {order_.map((id, idx) => renderSection(id, idx))}
    </div>
  )
}
