import { ARMOR_MAP, SHIELDS_MAP } from '../engine/index.js'
import armorData      from '../data/armor.json'
import shieldsData    from '../data/shields.json'
import racesData      from '../data/races.json'
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

function buffAnnot(activeBuffs, ...keys) {
  let total = 0
  const parts = []
  for (const b of activeBuffs) {
    if (!b.active) continue
    let sum = 0
    for (const k of keys) sum += Number(b.bonuses?.[k] ?? 0)
    if (sum !== 0) { total += sum; parts.push(`${b.name}: ${sum > 0 ? '+' : ''}${sum}`) }
  }
  return total !== 0 ? { total, title: parts.join(', ') } : null
}

function condAnnot(condMods, ...keys) {
  if (!condMods) return null
  let total = 0
  for (const k of keys) total += Number(condMods[k] ?? 0)
  return total !== 0 ? total : null
}

function BuffTag({ info }) {
  if (!info) return null
  return (
    <span className="buff-tag" title={info.title}>
      ✦{info.total > 0 ? `+${info.total}` : info.total}
    </span>
  )
}

function CondTag({ value }) {
  if (!value) return null
  const pos = value > 0
  return (
    <span className={`cond-tag ${pos ? 'cond-pos' : 'cond-neg'}`} title="Zustand">
      ⚡{pos ? `+${value}` : value}
    </span>
  )
}

function StatBox({ label, value, sub, className, buffInfo, condInfo }) {
  return (
    <div className={`stat-box${className ? ' ' + className : ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value-row">
        <div className="stat-value">{typeof value === 'number' ? fmtBonus(value) : value}</div>
        <BuffTag info={buffInfo} />
        <CondTag value={condInfo} />
      </div>
      {sub && <div className="stat-sub">{sub}</div>}
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
          <CondTag value={condInfo} />
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
  const def = selectedId ? (ARMOR_MAP[selectedId] ?? SHIELDS_MAP[selectedId]) : null
  return (
    <div className="gear-selector">
      <div className="gear-row">
        <span className="gear-label">{label}</span>
        <select className="gear-select" value={selectedId} onChange={e => onSelect(e.target.value)}>
          <option value="">— {L ? 'keine' : 'none'} —</option>
          {items.map(item => (
            <option key={item.id} value={item.id}>
              {item.name.de}
            </option>
          ))}
        </select>
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

function SectionHead({ id, label, idx, count, collapsed, onToggle, onMove }) {
  return (
    <div className="ct-heading-row">
      <button className="ct-collapse-btn" onClick={() => onToggle?.(id)} title={collapsed ? 'Aufklappen' : 'Zuklappen'}>
        {collapsed ? '▶' : '▼'}
      </button>
      <h3 className="ct-heading ct-heading-clk" onClick={() => onToggle?.(id)}>{label}</h3>
      {onMove && (
        <div className="ct-move-btns">
          <button className="ct-move-btn" disabled={idx === 0} onClick={() => onMove(id, -1)} title="Nach oben">↑</button>
          <button className="ct-move-btn" disabled={idx === count - 1} onClick={() => onMove(id, 1)} title="Nach unten">↓</button>
        </div>
      )}
    </div>
  )
}

export function CombatTab({ char, attrs, combat, baseValues, setCombatMisc, setGear, setHp, setNlDamage, lang, hbRaces = [], hbArmor = [], hbShields = [], encumbranceTier = 'light', applyCarryMovement = false, buffTotals = {}, activeBuffs = [], condMods = {}, sectionOrder, onMoveSection, collapsedSections, onToggleCollapse }) {
  const L = lang === 'de'
  const misc = char.combat_misc ?? {}
  const gear = char.gear ?? {}
  const hp   = char.hp ?? { max: 0, current: 0, temp: 0 }
  const nlDmg = char.nl_damage ?? 0
  const hpPct = hp.max > 0 ? Math.max(0, Math.min(1, hp.current / hp.max)) : 0

  const RACE_MAP = { ...RACE_MAP_BASE, ...Object.fromEntries(hbRaces.map(r => [r.id, r])) }
  const ALL_ARMOR_MERGED   = [...armorData.armor,   ...hbArmor]
  const ALL_SHIELDS_MERGED = [...shieldsData.shields, ...hbShields]

  const raceData   = RACE_MAP[char.meta.race]
  const hasArmor   = !!gear.armor_id
  const speedRaw   = hasArmor
    ? (raceData?.speed_m?.armored ?? raceData?.speed_m?.unarmored ?? null)
    : (raceData?.speed_m?.unarmored ?? null)
  const baseSpeedM  = raceData?.speed_m?.unarmored ?? speedRaw
  const encumbered  = applyCarryMovement && encumbranceTier !== 'light' && baseSpeedM != null
  const speedFinal  = encumbered ? Math.min(speedRaw ?? Infinity, encumberedSpeed(baseSpeedM)) : speedRaw
  const speedLabel  = speedFinal != null ? `${speedFinal} m` : '—'

  const order_ = (sectionOrder ?? INTERNAL_DEFAULT).filter(id => INTERNAL_DEFAULT.includes(id))

  const renderSection = (id, idx) => {
    const count = order_.length
    const isCollapsed = collapsedSections?.has(id) ?? false
    if (id === 'hp') return (
      <section key="hp" className="ct-section">
        <SectionHead id="hp" label={L ? 'Trefferpunkte' : 'Hit Points'} idx={idx} count={count} onMove={onMoveSection} collapsed={isCollapsed} onToggle={onToggleCollapse} />
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
              <span>{L ? 'NL-Schaden' : 'NL Dmg'}</span>
              <input type="number" min={0} className="hp-input"
                value={nlDmg}
                onChange={e => setNlDamage?.(e.target.value)} />
            </label>
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
        <SectionHead id="combat" label={L ? 'Kampfwerte' : 'Combat values'} idx={idx} count={count} onMove={onMoveSection} collapsed={isCollapsed} onToggle={onToggleCollapse} />
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
                <select
                  className="size-select"
                  value={curKey}
                  onChange={e => {
                    const m = SIZE_MODS[e.target.value]
                    setCombatMisc('size_mod_rk',  m.rk)
                    setCombatMisc('size_mod_kmb', m.kmb)
                  }}
                >
                  {Object.entries(SIZE_MODS).map(([k, v]) => (
                    <option key={k} value={k}>{L ? v.de : v.en}</option>
                  ))}
                </select>
                <span className="size-mods">
                  RK {fmtBonus(SIZE_MODS[curKey].rk)} · KMB {fmtBonus(SIZE_MODS[curKey].kmb)}
                </span>
              </div>
            )
          })()}

          <div className="stat-row">
            <StatBox label="GAB" value={combat.bab}
              buffInfo={buffAnnot(activeBuffs, 'attack')}
              condInfo={condAnnot(condMods, 'attack')} />
            <StatBox label={L ? 'Init' : 'Init'} value={combat.init} sub={`GE${fmtBonus(attrs.GE.mod)}`}
              buffInfo={buffAnnot(activeBuffs, 'init')}
              condInfo={condAnnot(condMods, 'init')} />
            <StatBox label="KMB" value={combat.kmb}
              buffInfo={buffAnnot(activeBuffs, 'attack')} />
            <StatBox label="KMV" value={combat.kmv} />
            <StatBox label={L ? 'Nahkampf' : 'Melee'}
              value={combat.melee_attacks.map(fmtBonus).join('/')}
              className="stat-box-attacks"
              buffInfo={buffAnnot(activeBuffs, 'attack')} />
            <StatBox label={L ? 'Fernkampf' : 'Ranged'}
              value={combat.ranged_attacks.map(fmtBonus).join('/')}
              className="stat-box-attacks"
              buffInfo={buffAnnot(activeBuffs, 'attack')} />
          </div>
        </>}
      </section>
    )
    if (id === 'speed') return (
      <section key="speed" className="ct-section">
        <SectionHead id="speed" label={L ? 'Bewegung' : 'Movement'} idx={idx} count={count} onMove={onMoveSection} collapsed={isCollapsed} onToggle={onToggleCollapse} />
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
        <SectionHead id="ac" label={L ? 'Rüstungsklasse' : 'Armor Class'} idx={idx} count={count} onMove={onMoveSection} collapsed={isCollapsed} onToggle={onToggleCollapse} />
        {!isCollapsed && <>
          <div className="stat-row">
            <StatBox label={L ? 'RK' : 'AC'} value={combat.rk}
              buffInfo={buffAnnot(activeBuffs, 'ac', 'nat_armor', 'deflection')}
              condInfo={condAnnot(condMods, 'rk')} />
            <StatBox label={L ? 'Berührung' : 'Touch'} value={combat.rk_touch}
              buffInfo={buffAnnot(activeBuffs, 'ac', 'deflection')}
              condInfo={condAnnot(condMods, 'rk')} />
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
                  <input type="number"
                    value={misc[key] ?? 0}
                    onChange={e => setCombatMisc(key, e.target.value)}
                  />
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
        <SectionHead id="saves" label={L ? 'Rettungswürfe' : 'Saving Throws'} idx={idx} count={count} onMove={onMoveSection} collapsed={isCollapsed} onToggle={onToggleCollapse} />
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
    return null
  }

  return (
    <div className="combat-tab">
      {order_.map((id, idx) => renderSection(id, idx))}
    </div>
  )
}
