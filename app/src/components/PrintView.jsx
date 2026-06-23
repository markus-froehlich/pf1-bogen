import racesData        from '../data/races.json'
import armorData        from '../data/armor.json'
import shieldsData      from '../data/shields.json'
import skillsData       from '../data/skills.json'
import spellsData       from '../data/spells.json'
import classFeatData    from '../data/class_features_by_level.json'
import { computeWeaponAttack } from '../engine/weapons.js'
import { getSpellSlots, isSpontaneousCaster } from '../engine/spellSlots.js'
import { ALL_CLASSES } from '../engine/index.js'
import './PrintView.css'

const CF_DATA = classFeatData.by_class ?? {}
const CLASS_MAP = Object.fromEntries(ALL_CLASSES.map(c => [c.id, c]))

const SPELL_MAP = Object.fromEntries(spellsData.spells.map(s => [s.id, s]))

const RACE_MAP   = Object.fromEntries(racesData.races.map(r => [r.id, r]))
const ARMOR_MAP  = Object.fromEntries(armorData.armor.map(a => [a.id, a]))
const SHIELD_MAP = Object.fromEntries(shieldsData.shields.map(s => [s.id, s]))
const ALL_SKILLS = skillsData.skills

const ATTRS = ['ST','GE','KO','IN','WE','CH']
const ATTR_DE = { ST:'Stärke', GE:'Geschicklichkeit', KO:'Konstitution', IN:'Intelligenz', WE:'Weisheit', CH:'Charisma' }
const ATTR_EN = { ST:'Strength', GE:'Dexterity', KO:'Constitution', IN:'Intelligence', WE:'Wisdom', CH:'Charisma' }

function sign(n) { return n >= 0 ? `+${n}` : `${n}` }

// Spell DC = 10 + spell level + ability mod; ability depends on class
const SPELL_ABILITY_MAP = {
  magier:'IN', hexe:'IN', alchemist:'IN', kampfmagus:'IN',
  kleriker:'WE', druide:'WE', waldlaeufer:'WE', paladin:'WE', inquisitor:'WE',
  barde:'CH', hexenmeister:'CH', paktmagier:'CH', skalde:'CH', orakel:'CH',
}

export function PrintView({ char, computed, baseValues, combat, lang, onClose }) {
  const L = lang === 'de'
  const meta  = char.meta ?? {}
  const hp    = char.hp ?? { max: 0, current: 0, temp: 0 }
  const misc  = char.combat_misc ?? {}
  const gear  = char.gear ?? {}
  const classes = meta.classes ?? []
  const feats   = char.feats ?? []
  const specials = char.specials ?? []
  const skills  = char.skills ?? {}
  const weapons = char.weapons ?? []
  const conds   = char.conditions ?? []
  const bio     = char.bio ?? {}
  const sb      = char.spellbook ?? { class_id: '', levels: {} }

  // Collect prepared spells from spellbook (non-empty levels)
  const preparedLevels = Object.entries(sb.levels ?? {})
    .map(([lv, data]) => ({ lv: Number(lv), data }))
    .filter(({ data }) => (data.prepared?.length ?? 0) > 0 || data.total > 0)
    .sort((a, b) => a.lv - b.lv)

  // All spell levels (including empty ones with total > 0 for slot display)
  const allSpellLevels = Object.entries(sb.levels ?? {})
    .map(([lv, data]) => ({ lv: Number(lv), data }))
    .filter(({ data }) => data.total > 0)
    .sort((a, b) => a.lv - b.lv)

  // Spell DC for each level
  const spellAbilityKey = SPELL_ABILITY_MAP[sb.class_id] ?? null
  const spellAbilityMod = spellAbilityKey ? (computed[spellAbilityKey]?.mod ?? 0) : 0

  const raceName = RACE_MAP[meta.race]?.name?.de ?? meta.race ?? '—'
  const classStr = classes.filter(e => e.id).map(e => `${CLASS_MAP[e.id]?.name ?? e.id} ${e.level}`).join(' / ')

  // Has page-2 content?
  const hasPage2 = preparedLevels.length > 0 || allSpellLevels.length > 0 ||
    char.notes?.trim() || bio.appearance || bio.background || bio.languages

  const armorDef  = gear.armor_id  ? ARMOR_MAP[gear.armor_id]  : null
  const shieldDef = gear.shield_id ? SHIELD_MAP[gear.shield_id] : null

  // Trained / ranked skills only
  const rankedSkills = ALL_SKILLS.filter(s => (skills[s.id]?.ranks ?? 0) > 0)

  return (
    <div className="print-overlay">
      <div className="print-toolbar">
        <button className="pt-print-btn" onClick={() => window.print()}>
          🖨 {L ? 'Drucken' : 'Print'}
        </button>
        <button className="pt-close-btn" onClick={onClose}>
          ✕ {L ? 'Schließen' : 'Close'}
        </button>
      </div>

      {/* ══ Seite 1 ══ */}
      <div className="pv-page">
        <div className="pv-header">
          <div className="pv-name">{meta.name || '—'}</div>
          <div className="pv-meta">
            <span>{L ? 'Volk' : 'Race'}: <b>{raceName}</b></span>
            {classStr && <span>{L ? 'Klasse' : 'Class'}: <b>{classStr}</b></span>}
            <span>{L ? 'Stufe' : 'Level'}: <b>{baseValues.totalLevel}</b></span>
            <span>HP: <b>{hp.current}/{hp.max}</b>{hp.temp > 0 && ` (+${hp.temp} temp)`}</span>
            {hasPage2 && <span className="pv-page-hint">{L ? '→ Seite 2: Zauber/Notizen' : '→ Page 2: Spells/Notes'}</span>}
          </div>
        </div>

        <div className="pv-body">
          {/* ── Left column ── */}
          <div className="pv-col pv-col-left">

            <section className="pv-section">
              <h3>{L ? 'Attribute' : 'Ability Scores'}</h3>
              <table className="pv-attr-table">
                <tbody>
                  {ATTRS.map(a => {
                    const cv = computed[a]
                    return (
                      <tr key={a}>
                        <td className="pva-abbr">{a}</td>
                        <td className="pva-name">{L ? ATTR_DE[a] : ATTR_EN[a]}</td>
                        <td className="pva-score">{cv.buffed}</td>
                        <td className="pva-mod">{sign(cv.mod)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </section>

            <section className="pv-section">
              <h3>{L ? 'Kampfwerte' : 'Combat'}</h3>
              <div className="pv-stat-grid">
                <div className="pv-stat"><span>GAB</span><b>{sign(combat.bab)}</b></div>
                <div className="pv-stat"><span>Init</span><b>{sign(combat.init)}</b></div>
                <div className="pv-stat"><span>KMB</span><b>{sign(combat.kmb)}</b></div>
                <div className="pv-stat"><span>KMV</span><b>{combat.kmv}</b></div>
                <div className="pv-stat"><span>{L ? 'RK' : 'AC'}</span><b>{combat.rk}</b></div>
                <div className="pv-stat"><span>{L ? 'Berühr.' : 'Touch'}</span><b>{combat.rk_touch}</b></div>
                <div className="pv-stat"><span>{L ? 'Flach' : 'Flat'}</span><b>{combat.rk_flat}</b></div>
                <div className="pv-stat"></div>
              </div>
            </section>

            <section className="pv-section">
              <h3>{L ? 'Rettungswürfe' : 'Saving Throws'}</h3>
              <div className="pv-stat-grid">
                <div className="pv-stat"><span>{L ? 'Zähigkeit' : 'Fort'}</span><b>{sign(combat.fort)}</b></div>
                <div className="pv-stat"><span>Reflex</span><b>{sign(combat.ref)}</b></div>
                <div className="pv-stat"><span>Wille</span><b>{sign(combat.will)}</b></div>
                <div className="pv-stat"></div>
              </div>
            </section>

            <section className="pv-section">
              <h3>{L ? 'Ausrüstung' : 'Gear'}</h3>
              {armorDef  && <div className="pv-gear-line">{L ? 'Rüstung' : 'Armor'}: <b>{armorDef.name.de}</b>{gear.armor_enh > 0 ? ` +${gear.armor_enh}` : ''} (RK +{armorDef.bonus + (gear.armor_enh ?? 0)})</div>}
              {shieldDef && <div className="pv-gear-line">{L ? 'Schild' : 'Shield'}: <b>{shieldDef.name.de}</b>{gear.shield_enh > 0 ? ` +${gear.shield_enh}` : ''} (RK +{shieldDef.bonus + (gear.shield_enh ?? 0)})</div>}
              {!armorDef && !shieldDef && <div className="pv-empty">—</div>}
            </section>

            {conds.length > 0 && (
              <section className="pv-section">
                <h3>{L ? 'Zustände' : 'Conditions'}</h3>
                <div className="pv-tags">{conds.map(c => <span key={c} className="pv-tag">{c}</span>)}</div>
              </section>
            )}

            {bio.languages && (
              <section className="pv-section">
                <h3>{L ? 'Sprachen' : 'Languages'}</h3>
                <div className="pv-bio-row">{bio.languages}</div>
              </section>
            )}
          </div>

          {/* ── Right column ── */}
          <div className="pv-col pv-col-right">

            <section className="pv-section">
              <h3>{L ? 'Waffen' : 'Weapons'}</h3>
              {weapons.filter(w => w.weapon_id).length === 0
                ? <div className="pv-empty">—</div>
                : weapons.filter(w => w.weapon_id).map((w, i) => {
                  const comp = computeWeaponAttack(w, computed, baseValues.bab)
                  return (
                    <div key={i} className="pv-weapon">
                      <b>{comp.name ?? w.weapon_id}</b>
                      {comp.full_attack_str && <span> {comp.full_attack_str}</span>}
                      {comp.damage_str && <span> {comp.damage_str}</span>}
                      {comp.crit_str && <span> ({comp.crit_str})</span>}
                    </div>
                  )
                })}
            </section>

            <section className="pv-section">
              <h3>{L ? 'Fertigkeiten' : 'Skills'} ({rankedSkills.length})</h3>
              {rankedSkills.length === 0
                ? <div className="pv-empty">—</div>
                : (
                  <table className="pv-skill-table">
                    <tbody>
                      {rankedSkills.map(s => {
                        const e = skills[s.id] ?? {}
                        const attrMod = computed[s.ability]?.mod ?? 0
                        const ranks   = Number(e.ranks) || 0
                        const cs      = e.is_class && ranks > 0 ? 3 : 0
                        const total   = ranks + attrMod + cs + (Number(e.misc) || 0)
                        return (
                          <tr key={s.id}>
                            <td className="pvsk-name">{s.name.de}</td>
                            <td className="pvsk-total">{sign(total)}</td>
                            <td className="pvsk-ranks">{ranks} Rg</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
            </section>

            {feats.length > 0 && (
              <section className="pv-section">
                <h3>{L ? 'Talente' : 'Feats'} ({feats.length})</h3>
                <div className="pv-feat-list">
                  {feats.map(f => <div key={f.id} className="pv-feat-item">{f.name}</div>)}
                </div>
              </section>
            )}

            {specials.length > 0 && (
              <section className="pv-section">
                <h3>{L ? 'Sonderfähigkeiten' : 'Special Abilities'} ({specials.length})</h3>
                <div className="pv-feat-list">
                  {specials.map(s => (
                    <div key={s.id} className="pv-feat-item">
                      <b>{s.name}</b>{s.source ? ` (${s.source})` : ''}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Class Features */}
            {classes.filter(e => e.id && Number(e.level) > 0).some(e => CF_DATA[e.id]) && (
              <section className="pv-section">
                <h3>{L ? 'Klassenfähigkeiten' : 'Class Features'}</h3>
                {classes.filter(e => e.id && Number(e.level) > 0).map((entry, idx) => {
                  const cd = CF_DATA[entry.id]
                  if (!cd) return null
                  const maxLvl = Number(entry.level)
                  const unlocked = []
                  for (let lv = 1; lv <= maxLvl; lv++) {
                    if (cd.levels[lv]?.length) unlocked.push(...cd.levels[lv])
                  }
                  if (!unlocked.length) return null
                  return (
                    <div key={idx} className="pv-cf-block">
                      <span className="pv-cf-class">{cd.name} {maxLvl}</span>
                      <div className="pv-cf-chips">
                        {unlocked.map((f, i) => <span key={i} className="pv-cf-chip">{f}</span>)}
                      </div>
                    </div>
                  )
                })}
              </section>
            )}
          </div>
        </div>
      </div>

      {/* ══ Seite 2: Zauber + Notizen + Bio ══ */}
      {hasPage2 && (
        <div className="pv-page pv-page-2">
          <div className="pv-page-2-separator print-hide">
            <span>{L ? '— Seite 2 —' : '— Page 2 —'}</span>
          </div>

          <div className="pv-header pv-header-compact">
            <span className="pv-name-small">{meta.name || '—'}</span>
            <span className="pv-meta-small">{classStr}{baseValues.totalLevel > 0 ? ` · Stufe ${baseValues.totalLevel}` : ''}</span>
          </div>

          <div className="pv-body">
            {/* ── Left: Spellbook ── */}
            <div className="pv-col pv-col-left">
              {allSpellLevels.length > 0 && (
                <section className="pv-section">
                  <h3>{L ? 'Zauberbuch' : 'Spellbook'}{sb.class_id ? ` (${CLASS_MAP[sb.class_id]?.name ?? sb.class_id})` : ''}</h3>

                  {/* DC row header */}
                  {spellAbilityKey && (
                    <div className="pv-dc-header">
                      <span>{L ? 'Zauberschwierigkeit' : 'Spell DC'}:</span>
                      <span>{L ? 'Grundwert' : 'Base'} 10 + {spellAbilityKey} {sign(spellAbilityMod)}</span>
                    </div>
                  )}

                  {/* DC table */}
                  {spellAbilityKey && (
                    <div className="pv-dc-row">
                      {allSpellLevels.map(({ lv }) => (
                        <div key={lv} className="pv-dc-cell">
                          <span className="pv-spell-lv">{lv}</span>
                          <span className="pv-dc-val">SG {10 + lv + spellAbilityMod}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Per-level slot + prepared spells */}
                  <div className="pv-spell-table">
                    {allSpellLevels.map(({ lv, data }) => {
                      const names = (data.prepared ?? []).map(id => SPELL_MAP[id]?.name?.de ?? id)
                      const free  = data.total - (data.used ?? 0)
                      return (
                        <div key={lv} className="pv-spell-row">
                          <div className="pv-spell-row-head">
                            <span className="pv-spell-lv">{lv}</span>
                            <span className="pv-spell-slots-detail">
                              {free}/{data.total} {L ? 'Slots frei' : 'slots free'}
                            </span>
                          </div>
                          {names.length > 0 && (
                            <div className="pv-spell-names-block">
                              {names.map((n, i) => <span key={i} className="pv-spell-chip">{n}</span>)}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}
            </div>

            {/* ── Right: Notes + Bio ── */}
            <div className="pv-col pv-col-right">
              {(bio.appearance || bio.background) && (
                <section className="pv-section">
                  <h3>{L ? 'Biographie' : 'Biography'}</h3>
                  {bio.appearance && (
                    <div className="pv-bio-row pv-bio-bg">
                      <span>{L ? 'Aussehen' : 'Appearance'}:</span> {bio.appearance}
                    </div>
                  )}
                  {bio.background && (
                    <div className="pv-bio-row pv-bio-bg" style={{ marginTop: '6px' }}>
                      <span>{L ? 'Hintergrund' : 'Background'}:</span> {bio.background}
                    </div>
                  )}
                </section>
              )}

              {char.notes?.trim() && (
                <section className="pv-section">
                  <h3>{L ? 'Notizen' : 'Notes'}</h3>
                  <div className="pv-notes">{char.notes}</div>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
