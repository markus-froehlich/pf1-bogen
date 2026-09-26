import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Sword, Heart, Crosshair, PencilSimple, X, DiceFive, Moon, ArrowsDownUp,
  DotsSixVertical, Eye, EyeSlash, ArrowUp, ArrowDown, Stack,
  TShirt, Shield, CircleNotch, Wind, Diamond, CaretRight, Minus, Plus,
} from '@phosphor-icons/react'
import weaponsData from '../data/weapons.json'
import { computeAttributes, computeCombat, resolveGearItem } from '../engine/index.js'
import { computeWeaponAttack, weaponStrMult, weaponCategory } from '../engine/weapons.js'
import { BUFF_STATS, BUFF_TYPES, suppressedTargets } from '../engine/buffs.js'
import { hasToughness } from '../engine/combat.js'
import { classLabel } from '../engine/classes.js'
import { CONDITIONS, CONFUSED_TABLE } from '../components/ConditionsPanel.jsx'
import { Sheet } from '../shell/Sheet.jsx'
import { useToast } from '../shell/toastContext.js'
import { SectionFrame, ValueTags, Switch, ListCard, Stepper } from './ui.jsx'
import { BuffEditor, ResourceEditor, WeaponEditor, GearEditor } from './editors.jsx'
import { BreakdownSheet } from './BreakdownSheet.jsx'
import { NumberPad } from './NumberPad.jsx'
import { combatBreakdown, weaponBreakdown, sg, typo } from './breakdown.js'
import { computeSpeed, currentSizeKey, SIZE_MODS } from './defense.js'
import './combat.css'

const LABELS = {
  hp:    ['Trefferpunkte', 'Hit points'],
  stats: ['Kampfwerte', 'Combat values'],
  saves: ['Rettungswürfe', 'Saving throws'],
  atk:   ['Angriffe', 'Attacks'],
  def:   ['Verteidigung', 'Defense'],
  move:  ['Bewegung', 'Movement'],
  cond:  ['Zustände', 'Conditions'],
  buff:  ['Buffs · Effekte', 'Buffs · Effects'],
  res:   ['Ressourcen', 'Resources'],
}
const SIZE_TO_DMG = { 2: 'sk', 1: 'k', 0: 'm', '-1': 'g', '-2': 'r', '-4': 'g', '-8': 'r' }
const RESET_LABEL = { rast: ['Rast', 'Rest'], tag: ['Neuer Tag', 'New day'], nie: ['Nie', 'Never'] }

function useWeaponMap(hbWeapons) {
  return useMemo(() => Object.fromEntries([...weaponsData.weapons, ...hbWeapons].map(w => [w.id, w])), [hbWeapons])
}

/** Wert mit/ohne Buffs bzw. Zustände — Differenz = Tag „✦ +n" bzw. „⚠ −n" (Engine bleibt maßgeblich). */
function useDeltas(char, attrs, combat, baseValues, buffTotals) {
  return useMemo(() => {
    // Vergleich „ohne Buffs": die Engine liest RK-Buffs nach Typ direkt aus active_buffs → dort leeren
    const noBuffChar = { ...char, active_buffs: [] }
    const noBuffAttrs = computeAttributes(noBuffChar, {})
    const noBuff = computeCombat(noBuffChar, noBuffAttrs, baseValues, {})
    const noCondChar = { ...char, conditions: [] }
    const noCond = computeCombat(noCondChar, attrs, baseValues, buffTotals)
    return { noBuff, noBuffAttrs, noCond }
  }, [char, attrs, baseValues, buffTotals])
}

function weaponRows({ char, attrs, baseValues, condMods, buffTotals, weaponMap, companionAttacks, deltas, lang }) {
  const L = lang === 'de'
  const misc = char.combat_misc ?? {}
  const dmgKey = SIZE_TO_DMG[String(Number(misc.size_mod_rk ?? 0))] ?? 'm'
  const rows = []
  for (const attack of companionAttacks ?? []) {
    const slot = { weapon_id: `companion_${attack.name}`, str_mult: attack.strMult }
    const result = computeWeaponAttack(slot, attrs, baseValues.bab, condMods, buffTotals.attack ?? 0, buffTotals.damage ?? 0)
    rows.push({ key: `nat:${attack.name}`, name: attack.name, natural: true, slot, result, isRanged: false,
      sub: `${L ? 'Natürlich' : 'Natural'}${attack.special ? ` · ${attack.special}` : ''}`,
      dmg: `${attack.damage}${result.damage_mod ? result.damage_str : ''}` })
  }
  ;(char.weapons ?? []).filter(w => w?.weapon_id).forEach((slot, idx) => {
    const def = weaponMap[slot.weapon_id]
    if (!def) return
    const isRanged = slot.is_ranged != null ? slot.is_ranged : def.str_bonus_mult === 0
    const strMult = weaponStrMult(def, slot)
    const s = { ...slot, is_ranged: isRanged, str_mult: strMult }
    const result = computeWeaponAttack(s, attrs, baseValues.bab, condMods, buffTotals.attack ?? 0, buffTotals.damage ?? 0)
    const noBuff = computeWeaponAttack(s, deltas.noBuffAttrs, baseValues.bab, condMods, 0, 0)
    const noCond = computeWeaponAttack(s, attrs, baseValues.bab, {}, buffTotals.attack ?? 0, buffTotals.damage ?? 0)
    const enh = Number(slot.enhancement ?? 0)
    const name = (slot.name || def.name?.[L ? 'de' : 'en'] || def.name?.de || def.id) + (enh ? ` +${enh}` : slot.mw ? ` (${L ? 'MA' : 'MW'})` : '')
    const wc = weaponCategory(def, lang)
    const sub = [isRanged ? (L ? 'Fernkampf' : 'Ranged') : (L ? 'Nahkampf' : 'Melee'), wc.damage, typo(def.crit),
      def.range_m ? `${def.range_m} m` : null, slot.off_hand ? (L ? 'Nebenhand' : 'Off hand') : null, slot.two_handed ? (L ? 'zweihändig' : 'two-handed') : null,
      wc.category?.replace(/ · (Fernkampf|ranged)$/, '')].filter(Boolean).join(' · ')   // „Fernkampf“ steht schon vorne
    const dice = def.damage?.[dmgKey] ?? def.damage?.m ?? '—'
    rows.push({ key: `w:${idx}`, idx, rawSlot: slot, name, slot: s, result, isRanged, finesse: slot.finesse, sub,
      dmg: `${dice}${result.damage_mod ? result.damage_str : ''}${slot.dmg_extra ? ` + ${slot.dmg_extra}` : ''}`,
      buff: result.attack_bonus - noBuff.attack_bonus, cond: result.attack_bonus - noCond.attack_bonus, def })
  })
  return rows
}

function buffSummary(b, lang) {
  const L = lang === 'de'
  const type = BUFF_TYPES.find(t => t.id === (b.type || 'ungetypt'))
  const parts = BUFF_STATS.filter(s => Number(b.bonuses?.[s.key] ?? 0) !== 0).map(s => `${s.de} ${sg(Number(b.bonuses[s.key]))}`)
  return [type && b.type ? (L ? type.de : type.en) : null, parts.join(', ') || (L ? 'ohne Bonus' : 'no bonus'), b.duration || null].filter(Boolean).join(' · ')
}

export function CombatView(props) {
  const {
    char, rulesChar, attrs, combat, baseValues, condMods, buffTotals, lang, layout,
    setCombatMisc, setHp, setNlDamage, setConditions, setActiveBuffs, setResources, setWeapons, setGearItems,
    hbRaces = [], hbArmor = [], hbShields = [], hbWeapons = [], encumbranceTier, applyCarryMovement,
    companionHd = null, companionAttacks = [], casterLevel = 1,
    order, onMove, onResetOrder, collapsed, onToggle,
  } = props
  const L = lang === 'de'
  const toast = useToast()
  const [sheet, setSheet] = useState(null)      // { type, ... }
  const [padMode, setPadMode] = useState('dmg')
  const [confRoll, setConfRoll] = useState(null)
  const close = () => setSheet(null)
  const misc = char.combat_misc ?? {}
  const hp = { max: 0, current: 0, temp: 0, ...(char.hp ?? {}) }
  const nl = Number(char.nl_damage ?? 0)
  const weaponMap = useWeaponMap(hbWeapons)
  const deltas = useDeltas(rulesChar, attrs, combat, baseValues, buffTotals)
  const speed = computeSpeed(rulesChar, { hbRaces, encumbranceTier, applyCarryMovement })
  const bdCtx = { char: rulesChar, attrs, combat, baseValues, lang }
  const conds = char.conditions ?? []
  const buffs = char.active_buffs ?? []
  const resources = char.resources ?? []
  const attacks = weaponRows({ char: rulesChar, attrs, baseValues, condMods, buffTotals, weaponMap, companionAttacks, deltas, lang })
  const removeCondition = id => {
    const prev = conds
    const c = CONDITIONS.find(x => x.id === id)
    setConditions(list => list.filter(x => x !== id))
    toast(L ? `${c?.de ?? id} entfernt` : `${c?.en ?? id} removed`, { undo: () => setConditions(() => prev) })
  }
  const tag = key => ({ buff: combat[key] - deltas.noBuff[key], cond: combat[key] - deltas.noCond[key] })
  const koScore = attrs.KO?.buffed ?? attrs.KO?.score ?? 10   // Tot bei negativen TP in Höhe des KO-Werts

  // ── Listen speichern/löschen (Löschen mit Rückgängig) ──────────────────
  const upsert = (list, item, match) => (list.some(match) ? list.map(x => (match(x) ? item : x)) : [...list, item])
  const saveBuff = b => { setActiveBuffs(list => upsert(list, b, x => x.id === b.id)); close() }
  const saveResource = r => { setResources(list => upsert(list, r, x => x.id === r.id)); close() }
  const saveAt = setter => (index, value) => { setter(list => (index == null ? [...list, value] : list.map((x, i) => (i === index ? value : x)))); close() }
  const removeWithUndo = (setter, predicate, label) => {
    let removed = null
    setter(list => { removed = list; return list.filter((x, i) => !predicate(x, i)) })
    close()
    toast(L ? `${label} gelöscht` : `${label} deleted`, { undo: () => setter(() => removed) })
  }
  const gearItems = (char.gear?.items ?? []).filter(i => i && (i.id || i.kind))
  const weaponsList = (char.weapons ?? []).filter(w => w?.weapon_id)

  // ── TP ──────────────────────────────────────────────────────────────────
  function applyPad(v) {
    if (!v) return close()
    const prev = { current: hp.current, temp: hp.temp, nl }
    if (padMode === 'dmg') {
      const fromTemp = Math.min(hp.temp, v)
      setHp('temp', hp.temp - fromTemp)
      setHp('current', hp.current - (v - fromTemp))
    } else if (padMode === 'heal') {
      setHp('current', Math.min(hp.max || Infinity, hp.current + v))
      setNlDamage(Math.max(0, nl - v))                // Heilung heilt NL-Schaden in gleicher Höhe
    } else if (padMode === 'temp') {
      setHp('temp', v)
    } else if (padMode === 'nl') {
      setNlDamage(nl + v)
    }
    close()
    const msg = { dmg: L ? `${v} Schaden genommen` : `Took ${v} damage`, heal: L ? `${v} TP geheilt` : `Healed ${v} HP`,
      temp: L ? `${v} temporäre TP gesetzt` : `Set ${v} temporary HP`, nl: L ? `${v} NL-Schaden` : `${v} nonlethal damage` }[padMode]
    toast(msg, { undo: () => { setHp('current', prev.current); setHp('temp', prev.temp); setNlDamage(prev.nl) } })
  }
  const ratio = hp.max > 0 ? Math.max(0, Math.min(1, hp.current / hp.max)) : 0
  const hpTone = ratio <= 0.25 ? 'neg' : ratio <= 0.5 ? 'warn' : 'ok'
  const hpStatus = hp.current <= -koScore ? (L ? 'Tot' : 'Dead')
    : hp.current < 0 ? (L ? 'Sterbend' : 'Dying')
    : hp.current === 0 && hp.max > 0 ? (L ? 'Kampfunfähig' : 'Disabled')
    : `${L ? 'Tot bei' : 'Dead at'} −${koScore}`

  // ── Aufschlüsselung ─────────────────────────────────────────────────────
  const bd = sheet?.type === 'bd'
    ? (sheet.key.startsWith('w:') || sheet.key.startsWith('nat:')
      ? (() => {
          const row = attacks.find(a => a.key === sheet.key)
          if (!row) return null
          const out = weaponBreakdown({ name: row.name, result: row.result, slot: row.slot, bab: baseValues.bab, isRanged: row.isRanged, finesse: row.finesse, condMods, buffs, lang })
          out.note = `${L ? 'Schaden' : 'Damage'} ${row.dmg}${row.def?.crit ? ` · ${typo(row.def.crit)}` : ''}${row.def?.range_m ? ` · ${L ? 'Grundreichweite' : 'Range'} ${row.def.range_m} m` : ''}${row.slot.off_hand ? (L ? ' · Nebenhand (ST ×½)' : ' · off hand (Str ×½)') : ''}`
          return out
        })()
      : combatBreakdown(sheet.key, bdCtx))
    : null

  // ── Zusammenfassungen (eingeklappt) ─────────────────────────────────────
  const summaries = {
    hp: `${hp.current}/${hp.max} ${L ? 'TP' : 'HP'}${hp.temp ? ` +${hp.temp}` : ''}`,
    stats: `RK ${combat.rk} · Init ${sg(combat.init)} · KMB ${sg(combat.kmb)}`,
    saves: `${L ? 'Zäh' : 'Fort'} ${sg(combat.fort)} · Ref ${sg(combat.ref)} · ${L ? 'Wil' : 'Will'} ${sg(combat.will)}`,
    atk: attacks.map(a => `${a.name} ${a.result.full_attack_str}`).join(' · ') || (L ? 'keine' : 'none'),
    def: `RK ${combat.rk} · SR ${misc.dr_text || '—'}`,
    move: [speed.speed != null ? `${speed.speed} m` : '—', ...[['speed_fly', L ? 'Fliegen' : 'Fly'], ['speed_swim', L ? 'Schwimmen' : 'Swim'], ['speed_climb', L ? 'Klettern' : 'Climb'], ['speed_burrow', L ? 'Graben' : 'Burrow']].filter(([k]) => misc[k]).map(([k, n]) => `${n} ${misc[k]} m`)].join(' · '),
    // Listen als Kacheln unter der Überschrift (statt langem Text rechts)
    cond: conds.length ? conds.map(id => ({ key: id, label: CONDITIONS.find(c => c.id === id)?.[L ? 'de' : 'en'] ?? id, tone: 'cond' })) : (L ? 'keine' : 'none'),
    buff: buffs.some(b => b.active) ? buffs.filter(b => b.active).map(b => ({ key: b.id, label: b.name, tone: 'buff' })) : (L ? 'keine aktiv' : 'none active'),
    res: resources.length ? resources.map(r => {
      const left = Math.max(0, r.max - (r.current ?? 0))
      return { key: r.id ?? r.name, label: r.name, value: `${left}/${r.max}`, tone: left === 0 ? 'empty' : '' }
    }) : (L ? 'keine' : 'none'),
  }

  // ── Bereiche ────────────────────────────────────────────────────────────
  const sections = {
    hp: (
      <div className="nc-card nc-card-lg nc-hp">
        <div className="nc-hp-top">
          <button className="nc-hp-value" onClick={() => setSheet({ type: 'hpEdit' })} title={L ? 'TP bearbeiten' : 'Edit HP'}>
            <span className="nc-hp-cur">{hp.current}</span>
            <span className="nc-hp-max">/ {hp.max}</span>
            <PencilSimple className="nc-hp-edit" />
          </button>
          <div className="nc-hp-actions">
            <button className="nc-btn nc-btn-secondary" onClick={() => { setPadMode('dmg'); setSheet({ type: 'pad' }) }}><Sword />{L ? 'Schaden' : 'Damage'}</button>
            <button className="nc-btn nc-btn-primary" onClick={() => { setPadMode('heal'); setSheet({ type: 'pad' }) }}><Heart />{L ? 'Heilen' : 'Heal'}</button>
          </div>
        </div>
        <div className="nc-bar"><div className={`nc-bar-fill is-${hpTone}`} style={{ width: `${ratio * 100}%` }} /></div>
        <div className="nc-hp-meta">
          <span className="nc-hp-status">{hpStatus}</span>
          <div className="nc-hp-extra">
            <button className={`nc-hp-pill ${hp.temp > 0 ? 'is-on' : ''}`} onClick={() => { setPadMode('temp'); setSheet({ type: 'pad' }) }} title={L ? 'Temporäre TP setzen' : 'Set temporary HP'}>
              <span className="nc-hp-pill-k">{L ? 'Temp. TP' : 'Temp HP'}</span><span className="nc-hp-pill-v">{hp.temp > 0 ? `+${hp.temp}` : 0}</span></button>
            <button className={`nc-hp-pill ${nl > 0 ? 'is-warn' : ''}`} onClick={() => { setPadMode('nl'); setSheet({ type: 'pad' }) }} title={L ? 'Nichttödlichen Schaden nehmen' : 'Take nonlethal damage'}>
              <span className="nc-hp-pill-k">{L ? 'NL-Schaden' : 'Nonlethal'}</span><span className="nc-hp-pill-v">{nl}</span></button>
          </div>
        </div>
      </div>
    ),
    stats: (
      <div className="nc-tiles">
        {[
          { key: 'rk', label: L ? 'RK' : 'AC', v: String(combat.rk), sub: `${L ? 'Ber.' : 'Touch'} ${combat.rk_touch} · ${L ? 'Fuß' : 'Flat'} ${combat.rk_flat}`, big: true },
          { key: 'init', label: 'Initiative', v: sg(combat.init), sub: `GE ${sg(combat._components?.init_ability ?? 0)}` },
          { key: 'gab', label: L ? 'GAB' : 'BAB', v: sg(combat.bab), sub: (char.meta.classes ?? []).filter(c => c.id).map(c => `${classLabel(c.id, lang)} ${c.level}`).join(' / ') || '—', noBd: true },
          { key: 'kmb', label: L ? 'KMB' : 'CMB', v: sg(combat.kmb), sub: `ST ${sg(combat._components?.effSTmod ?? attrs.ST.mod)}` },
          { key: 'kmv', label: L ? 'KMV' : 'CMD', v: String(combat.kmv), sub: L ? 'GAB+ST+GE' : 'BAB+Str+Dex' },
          { key: 'speed', label: L ? 'Bewegung' : 'Speed', v: speed.speed != null ? `${speed.speed} m` : '—',
            sub: speed.encumbered ? (L ? 'durch Last reduziert' : 'reduced by load') : speed.unarmored != null && speed.speed != null && speed.speed < speed.unarmored ? `${speed.unarmored} m ${L ? 'ohne Rüstung' : 'unarmored'}` : (L ? 'Grundbewegung' : 'Base speed'), noBd: true },
        ].map(t => {
          const tags = t.noBd ? {} : tag(t.key)
          const onClick = t.key === 'speed' ? () => (collapsed.has('move') ? onToggle('move') : null)
            : t.noBd ? () => toast(L ? `GAB aus Klassen: ${t.sub}` : `BAB from classes: ${t.sub}`)
            : () => setSheet({ type: 'bd', key: t.key })
          return (
            <button key={t.key} className="nc-tile" onClick={onClick}>
              <span className="nc-tile-label">{t.label}</span>
              <span className="nc-tile-row">
                <span className={`nc-tile-value ${t.big ? 'is-big' : ''}`}>{t.v}</span>
                <ValueTags buff={tags.buff} cond={tags.cond} />
              </span>
              <span className="nc-tile-sub nc-ellipsis">{t.sub}</span>
            </button>
          )
        })}
      </div>
    ),
    saves: (
      <div className="nc-tiles">
        {[['fort', L ? 'Zähigkeit' : 'Fortitude', 'KO'], ['ref', 'Reflex', 'GE'], ['will', L ? 'Willen' : 'Will', 'WE']].map(([key, label, attr]) => {
          const t = tag(key)
          const attrMod = key === 'ref' ? (combat._components?.effGEmod ?? attrs.GE.mod) : attrs[attr].mod
          const m = Number(misc[`${key}_misc`] ?? 0)
          return (
            <button key={key} className="nc-tile nc-tile-save" onClick={() => setSheet({ type: 'bd', key })}>
              <span className="nc-tile-label is-plain">{label}</span>
              <span className="nc-tile-row"><span className="nc-tile-value">{sg(combat[key])}</span><ValueTags buff={t.buff} cond={t.cond} /></span>
              <span className="nc-tile-sub nc-ellipsis">{baseValues[key]} + {attr} {sg(attrMod)}{m ? ` ${sg(m)}` : ''}</span>
            </button>
          )
        })}
      </div>
    ),
    atk: (
      <ListCard empty={!attacks.length} emptyText={L ? 'Keine Waffen eingetragen.' : 'No weapons.'}
        addLabel={L ? 'Waffe hinzufügen' : 'Add weapon'} onAdd={() => setSheet({ type: 'weapon', idx: null })}>
        {attacks.map(a => (
          <div key={a.key} className="nc-row">
            <button className="nc-row-main" onClick={() => setSheet({ type: 'bd', key: a.key })}>
              <span className="nc-icon-tile">{a.isRanged ? <Crosshair /> : <Sword />}</span>
              <span className="nc-row-text">
                <span className="nc-row-title nc-ellipsis">{a.name}</span>
                <span className="nc-row-sub nc-ellipsis">{a.sub}</span>
              </span>
              <span className="nc-row-right">
                <span className={`nc-row-value ${a.cond < 0 ? 'is-neg' : a.buff > 0 ? 'is-buff' : ''}`}>{a.result.full_attack_str}</span>
                <span className="nc-row-sub">{a.dmg}</span>
              </span>
            </button>
            {!a.natural && (
              <button className="nc-row-edit" onClick={() => setSheet({ type: 'weapon', idx: a.idx })} title={L ? 'Waffe bearbeiten' : 'Edit weapon'}><PencilSimple /></button>
            )}
          </div>
        ))}
      </ListCard>
    ),
    def: (<>
      <div className="nc-tiles">
        {[['rk', 'rk', L ? 'RK' : 'AC'], ['touch', 'rk_touch', L ? 'Berührung' : 'Touch'], ['flat', 'rk_flat', L ? 'Falscher Fuß' : 'Flat-footed']].map(([bdKey, key, label]) => {
          const tags = tag(key)
          return (
            <button key={bdKey} className="nc-tile" onClick={() => setSheet({ type: 'bd', key: bdKey })}>
              <span className="nc-tile-label">{label}</span>
              <span className="nc-tile-row"><span className="nc-tile-value is-big">{combat[key]}</span><ValueTags buff={tags.buff} cond={tags.cond} /></span>
            </button>
          )
        })}
      </div>
      <DefenseSection char={rulesChar} setCombatMisc={setCombatMisc} hbRaces={hbRaces} lang={lang}
        gearItems={gearItems} onEditGear={index => setSheet({ type: 'gear', index })} />
    </>),
    move: <MovementSection char={rulesChar} setCombatMisc={setCombatMisc} speed={speed} lang={lang} />,
    cond: (
      <ListCard empty={!conds.length} emptyText={L ? 'Keine aktiven Zustände.' : 'No active conditions.'}
        addLabel={L ? 'Zustand hinzufügen' : 'Add condition'} onAdd={() => setSheet({ type: 'conds' })}>
        {conds.map(id => {
          const c = CONDITIONS.find(x => x.id === id)
          if (!c) return null
          return (
            <div key={id} className="nc-row">
              <button className="nc-row-main" onClick={() => setSheet({ type: 'conds' })}>
                <span className="nc-row-text">
                  <span className="nc-row-title">{L ? c.de : c.en}</span>
                  <span className="nc-row-sub">{c.effect}</span>
                </span>
              </button>
              <button className="nc-row-edit" onClick={() => removeCondition(id)} title={L ? 'Zustand entfernen' : 'Remove condition'} aria-label={L ? `${c.de} entfernen` : `Remove ${c.en}`}><X /></button>
            </div>
          )
        })}
        {conds.includes('verwirrt') && (
          <div className="nc-confused nc-card-pad">
            <button className="nc-btn nc-btn-secondary" onClick={() => setConfRoll(1 + Math.floor(Math.random() * 100))}>
              <DiceFive />{L ? 'W% würfeln' : 'Roll d%'}{confRoll != null ? ` · ${confRoll}` : ''}
            </button>
            {CONFUSED_TABLE.map((row, i) => {
              const [a, b] = [[1, 25], [26, 50], [51, 75], [76, 100]][i]
              const hit = confRoll != null && confRoll >= a && confRoll <= b
              return <div key={row.range} className={`nc-conf-row ${hit ? 'is-hit' : ''}`}><span>{row.range}</span><span>{L ? row.de : row.en}</span></div>
            })}
          </div>
        )}
      </ListCard>
    ),
    buff: (
      <ListCard empty={!buffs.length} emptyText={L ? 'Keine Buffs angelegt.' : 'No buffs.'}
        addLabel={L ? 'Buff anlegen' : 'Add buff'} onAdd={() => setSheet({ type: 'buff', id: null })}>
        {buffs.map(b => {
          const sup = b.active ? suppressedTargets(b, buffs) : []
          return (
            <div key={b.id} className="nc-row">
              <button className="nc-row-main" onClick={() => setActiveBuffs(list => list.map(x => (x.id === b.id ? { ...x, active: !x.active } : x)))} aria-pressed={!!b.active}>
                <span className="nc-row-text">
                  <span className={`nc-row-title ${b.active ? '' : 'is-off'}`}>{b.name}</span>
                  <span className="nc-row-sub">{buffSummary(b, lang)}</span>
                  {sup.length > 0 && <span className="nc-row-warn"><Stack />{L ? 'stapelt nicht' : 'does not stack'}: {sup.join(', ')}</span>}
                </span>
                <Switch on={!!b.active} />
              </button>
              <button className="nc-row-edit" onClick={() => setSheet({ type: 'buff', id: b.id })} title={L ? 'Buff bearbeiten' : 'Edit buff'}><PencilSimple /></button>
            </div>
          )
        })}
      </ListCard>
    ),
    res: (
      <ListCard empty={!resources.length} emptyText={L ? 'Keine Ressourcen angelegt.' : 'No resources.'}
        addLabel={L ? 'Ressource anlegen' : 'Add resource'} onAdd={() => setSheet({ type: 'resource', id: null })}>
        {resources.map(r => {
          const used = Number(r.current ?? 0)
          const left = Math.max(0, r.max - used)
          const setUsed = n => setResources(list => list.map(x => (x.id === r.id ? { ...x, current: Math.max(0, Math.min(x.max, n)) } : x)))
          const reset = RESET_LABEL[r.reset ?? 'tag'] ?? RESET_LABEL.tag
          return (
            <div key={r.id} className="nc-row nc-row-res">
              <button className="nc-row-main is-text" onClick={() => setSheet({ type: 'resource', id: r.id })}>
                <span className="nc-row-text">
                  <span className="nc-row-title"><span className="nc-ellipsis">{r.name}</span><PencilSimple className="nc-inline-edit" /></span>
                  <span className="nc-row-sub nc-ellipsis">{[r.unit || r.source, r.reset === 'nie' ? (L ? 'kein Reset' : 'no reset') : `Reset: ${L ? reset[0] : reset[1]}`].filter(Boolean).join(' · ')}</span>
                </span>
              </button>
              {r.max <= 6 ? (
                <div className="nc-pips">
                  {Array.from({ length: r.max }, (_, k) => {
                    const avail = k < left
                    return <button key={k} className={`nc-pip ${avail ? 'is-on' : ''}`} onClick={() => setUsed(avail ? used + 1 : used - 1)} aria-label={avail ? (L ? 'verbrauchen' : 'use') : (L ? 'zurückgeben' : 'restore')}><span /></button>
                  })}
                </div>
              ) : (
                <div className="nc-counter">
                  <button className="nc-step-btn" onClick={() => setUsed(used + 1)} aria-label="−">−</button>
                  <span className="nc-counter-val">{left}<small> /{r.max}</small></span>
                  <button className="nc-step-btn" onClick={() => setUsed(used - 1)} aria-label="+">+</button>
                </div>
              )}
            </div>
          )
        })}
      </ListCard>
    ),
  }
  const actions = {
    res: resources.length > 0 && (
      <button className="nc-btn nc-btn-ghost nc-head-action" onClick={() => {
        const prev = resources
        setResources(list => list.map(r => (r.reset === 'nie' ? r : { ...r, current: 0 })))
        toast(L ? 'Rast: Ressourcen zurückgesetzt' : 'Rest: resources reset', { undo: () => setResources(() => prev) })
      }}><Moon />{L ? 'Rast' : 'Rest'}</button>
    ),
  }

  // ── Tablet: Masonry (Bereiche fließen in die kürzere Spalte) ────────────
  const refs = useRef({})
  const [heights, setHeights] = useState({})
  const masonry = layout === 'tablet'
  useLayoutEffect(() => {
    if (!masonry || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      const next = {}
      for (const id of order) next[id] = refs.current[id]?.offsetHeight ?? 0
      setHeights(prev => (order.every(id => prev[id] === next[id]) ? prev : next))
    })
    for (const id of order) if (refs.current[id]) ro.observe(refs.current[id])
    return () => ro.disconnect()
  }, [masonry, order])
  const columns = [[], []]
  if (masonry) {
    const colH = [0, 0]
    for (const id of order) { const c = colH[0] <= colH[1] ? 0 : 1; columns[c].push(id); colH[c] += (heights[id] || 180) + 12 }
  }
  const renderSection = id => (
    <SectionFrame key={id} id={id} label={LABELS[id][L ? 0 : 1]} summary={summaries[id]} collapsed={collapsed.has(id)} onToggle={onToggle}
      action={actions[id]} innerRef={el => { refs.current[id] = el }}>
      {sections[id]}
    </SectionFrame>
  )

  const buffForEdit = sheet?.type === 'buff'
  return (
    <div className={`nc-combat ${masonry ? 'is-masonry' : ''}`}>
      {masonry
        ? <div className="nc-masonry">{columns.map((ids, i) => <div key={i} className="nc-masonry-col">{ids.map(renderSection)}</div>)}</div>
        : order.map(renderSection)}
      <button className="nc-btn nc-btn-secondary nc-arrange-btn" onClick={() => setSheet({ type: 'arrange' })}><ArrowsDownUp />{L ? 'Bereiche anordnen' : 'Arrange sections'}</button>

      <Sheet open={!!sheet} onClose={close} layout={layout} label={sheet?.type}>
        {sheet?.type === 'pad' && (
          <NumberPad lang={lang}
            modes={[['dmg', L ? 'Schaden' : 'Damage'], ['heal', L ? 'Heilung' : 'Heal'], ['temp', L ? 'Temp.' : 'Temp'], ['nl', 'NL']]}
            mode={padMode} onMode={setPadMode}
            hint={`${L ? 'TP' : 'HP'} ${hp.current}/${hp.max}${hp.temp ? ` · temp. ${hp.temp}` : ''}${nl ? ` · NL ${nl}` : ''}`}
            cta={v => ({ dmg: L ? `${v} Schaden nehmen` : `Take ${v} damage`, heal: L ? `${v} TP heilen` : `Heal ${v} HP`,
              temp: L ? `${v} temporäre TP setzen` : `Set ${v} temp HP`, nl: L ? `${v} NL-Schaden nehmen` : `Take ${v} nonlethal` }[padMode])}
            onCommit={applyPad} />
        )}
        {sheet?.type === 'hpEdit' && (
          <HpEdit hp={hp} nl={nl} setHp={setHp} setNlDamage={setNlDamage} attrs={attrs} baseValues={baseValues}
            companionHd={companionHd} feats={char.feats} lang={lang} onDone={close} />
        )}
        {sheet?.type === 'bd' && (
          <BreakdownSheet bd={bd} misc={misc} onMisc={(k, v) => setCombatMisc(k, v)} lang={lang} />
        )}
        {sheet?.type === 'conds' && (
          <div className="nc-sheet-body nc-gap">
            <div className="nc-sheet-titlebar"><span className="nc-sheet-title">{L ? 'Zustände' : 'Conditions'}</span>
              <button className="nc-btn nc-btn-ghost" onClick={close}>{L ? 'Fertig' : 'Done'}</button></div>
            <div className="nc-chips">
              {CONDITIONS.filter(c => !c.spellEffect || conds.includes(c.id)).map(c => {
                const on = conds.includes(c.id)
                return <button key={c.id} className={`nc-chip nc-chip-cond ${on ? 'is-on' : ''}`} aria-pressed={on}
                  onClick={() => setConditions(list => (on ? list.filter(x => x !== c.id) : [...list, c.id]))}>{L ? c.de : c.en}</button>
              })}
            </div>
            <span className="nc-hint">{L ? 'Aktive Zustände fließen direkt in RK, Angriff, Rettungswürfe, Initiative und Fertigkeiten ein.' : 'Active conditions feed directly into AC, attacks, saves, initiative and skills.'}</span>
            {CONDITIONS.some(c => c.spellEffect && conds.includes(c.id)) && <span className="nc-hint">{L ? 'Gehetzt, Verlangsamt und Gesegnet sind im GRW Zaubereffekte (Hast, Verlangsamen, Segnen) – bitte als Buff anlegen und hier abwählen.' : 'Hasted/slowed/blessed are spell effects – use the buff templates.'}</span>}
          </div>
        )}
        {sheet?.type === 'arrange' && (
          <div className="nc-sheet-body nc-gap">
            <div className="nc-sheet-titlebar"><span className="nc-sheet-title">{L ? 'Kampf-Tab anordnen' : 'Arrange combat tab'}</span>
              <button className="nc-btn nc-btn-ghost" onClick={close}>{L ? 'Fertig' : 'Done'}</button></div>
            <div className="nc-arrange">
              {order.map((id, i) => {
                const shut = collapsed.has(id)
                return (
                  <div key={id} className="nc-arrange-row">
                    <DotsSixVertical className="nc-muted-icon" />
                    <span className={`nc-arrange-name ${shut ? 'is-shut' : ''}`}>{LABELS[id][L ? 0 : 1]}</span>
                    <button className={`nc-icon-btn nc-sm ${shut ? 'nc-muted' : 'is-active'}`} onClick={() => onToggle(id)} title={L ? 'Ein-/Ausklappen' : 'Collapse'}>{shut ? <EyeSlash /> : <Eye />}</button>
                    <button className="nc-icon-btn nc-sm" disabled={i === 0} onClick={() => onMove(id, -1)} aria-label={L ? 'Nach oben' : 'Up'}><ArrowUp /></button>
                    <button className="nc-icon-btn nc-sm" disabled={i === order.length - 1} onClick={() => onMove(id, 1)} aria-label={L ? 'Nach unten' : 'Down'}><ArrowDown /></button>
                  </div>
                )
              })}
            </div>
            <div className="nc-sheet-foot">
              <span className="nc-hint">{L ? 'Eingeklappte Bereiche zeigen ihre Werte in der Kopfzeile. Tippen auf eine Überschrift klappt auch direkt.' : 'Collapsed sections show their values in the header.'}</span>
              <button className="nc-btn nc-btn-ghost" onClick={onResetOrder}>{L ? 'Zurücksetzen' : 'Reset'}</button>
            </div>
          </div>
        )}
        {sheet?.type === 'weapon' && (
          <WeaponEditor slot={sheet.idx != null ? weaponsList[sheet.idx] : null} index={sheet.idx} char={rulesChar} attrs={attrs} bab={baseValues.bab}
            condMods={condMods} buffTotals={buffTotals} hbWeapons={hbWeapons} lang={lang} onClose={close}
            onSave={(index, slot) => { if (index == null && weaponsList.length >= 5) { toast(L ? 'Höchstens 5 Waffen' : 'At most 5 weapons'); return } saveAt(setWeapons)(index, slot) }}
            onDelete={index => removeWithUndo(setWeapons, (_, i) => i === index, L ? 'Waffe' : 'Weapon')} />
        )}
        {buffForEdit && (
          <BuffEditor buff={buffs.find(b => b.id === sheet.id) ?? null} casterLevel={casterLevel} lang={lang} onClose={close}
            onSave={saveBuff} onDelete={id => removeWithUndo(setActiveBuffs, x => x.id === id, 'Buff')} />
        )}
        {sheet?.type === 'resource' && (
          <ResourceEditor resource={resources.find(r => r.id === sheet.id) ?? null} char={rulesChar} attrs={attrs} lang={lang} onClose={close}
            onSave={saveResource} onDelete={id => removeWithUndo(setResources, x => x.id === id, L ? 'Ressource' : 'Resource')} />
        )}
        {sheet?.type === 'gear' && (
          <GearEditor item={sheet.index != null ? gearItems[sheet.index] : null} index={sheet.index} hbArmor={hbArmor} hbShields={hbShields} lang={lang} onClose={close}
            onSave={saveAt(setGearItems)} onDelete={index => removeWithUndo(setGearItems, (_, i) => i === index, L ? 'Ausrüstung' : 'Gear')} />
        )}
      </Sheet>
    </div>
  )
}

/** TP bearbeiten: Max, Aktuell, Temp, NL, Trefferwürfel-Historie, KO-/Abhärtungs-Hinweis. */
function HpEdit({ hp, nl, setHp, setNlDamage, attrs, baseValues, companionHd, feats, lang, onDone }) {
  const L = lang === 'de'
  const koMod = attrs?.KO?.mod ?? 0
  const lvls = companionHd ?? baseValues?.totalLevel ?? 0
  const unit = companionHd != null ? (L ? 'TW' : 'HD') : (L ? 'Stufen' : 'levels')
  const num = (label, value, onChange) => (
    <label className="nc-field"><span>{label}</span>
      <input className="nc-input" type="number" inputMode="numeric" value={value} onChange={e => onChange(e.target.value)} />
    </label>
  )
  return (
    <div className="nc-sheet-body nc-gap">
      <div className="nc-sheet-titlebar"><span className="nc-sheet-title">{L ? 'Trefferpunkte' : 'Hit points'}</span>
        <button className="nc-btn nc-btn-ghost" onClick={onDone}>{L ? 'Fertig' : 'Done'}</button></div>
      <div className="nc-grid-2">
        {num(L ? 'Maximum' : 'Maximum', hp.max, v => setHp('max', v))}
        {num(L ? 'Aktuell' : 'Current', hp.current, v => setHp('current', v))}
        {num(L ? 'Temporär' : 'Temporary', hp.temp, v => setHp('temp', v))}
        {num(L ? 'NL-Schaden' : 'Nonlethal', nl, v => setNlDamage(v))}
      </div>
      {nl > 0 && (
        <div className="nc-inline-note">
          <span>{L ? `Bewusstlos bei ≤${hp.current - nl} TP` : `Unconscious at ≤${hp.current - nl} HP`}</span>
          <button className="nc-btn nc-btn-ghost" onClick={() => setNlDamage(0)}>{L ? 'Erholt' : 'Recovered'}</button>
        </div>
      )}
      <label className="nc-field"><span>{L ? 'Trefferwürfel-Historie' : 'Hit-die history'}</span>
        <input className="nc-input" type="text" value={hp.rolls ?? ''} onChange={e => setHp('rolls', e.target.value)}
          placeholder={L ? 'z. B. 8 + 7 + 7 + 8; je TW +5 KO' : 'e.g. 8 + 7 + 7 + 8; +5 CON per HD'} />
      </label>
      {lvls > 0 && (
        <div className="nc-inline-note"><span>KO {sg(koMod)} × {lvls} {unit}</span><span className={koMod < 0 ? 'nc-neg' : ''}>{sg(koMod * lvls)} {L ? 'TP' : 'HP'}</span></div>
      )}
      {companionHd != null && <div className="nc-inline-note"><span>{companionHd} {L ? 'TW' : 'HD'}</span><span>W8</span></div>}
      {hasToughness(feats) && (baseValues?.totalLevel ?? 0) > 0 && (
        <div className="nc-inline-note"><span>{L ? 'Abhärtung' : 'Toughness'}: +1 × {baseValues.totalLevel} {L ? 'Stufen' : 'levels'}</span><span>+{baseValues.totalLevel} {L ? 'TP' : 'HP'}</span></div>
      )}
    </div>
  )
}

const GEAR_ICON = { Rüstung: TShirt, Schild: Shield, Ring: CircleNotch, Umhang: Wind, Sonstiges: Diamond }

function gearMeta(g, L) {
  if (g.kind === 'Rüstung' || g.kind === 'Schild') {
    return [`RK +${g.ac + g.enh}`, g.kind === 'Rüstung' && g.maxGE != null ? `${L ? 'max. GE' : 'max Dex'} +${g.maxGE}` : null,
      g.acp ? `${L ? 'RM' : 'ACP'} ${sg(g.acp)}` : null, g.asf ? `${L ? 'ZP' : 'ASF'} ${Math.round(g.asf * 100)} %` : null, g.cat].filter(Boolean).join(' · ')
  }
  if (g.kind === 'Ring') return g.defl ? `${L ? 'Ablenkung' : 'Deflection'} +${g.defl} ${L ? 'auf RK' : 'to AC'}` : (g.note || 'Ring')
  if (g.kind === 'Umhang') return g.res ? `${L ? 'Widerstand' : 'Resistance'} +${g.res} ${L ? 'auf alle RW' : 'on all saves'}` : (L ? 'Umhang' : 'Cloak')
  return g.note || (L ? 'Sonstiges' : 'Other')
}

/** Verteidigung · Bewegung (README): Ausrüstungsliste, Größe, Bewegungsarten, SR/Resistenzen/Immunitäten. */
/** Bewegung: Grundbewegung (Volk, Rüstung, Last) + weitere Bewegungsarten. */
export function MovementSection({ char, setCombatMisc, speed, lang }) {
  const L = lang === 'de'
  const misc = char.combat_misc ?? {}
  const speedField = (label, key) => (
    <label className="nc-field"><span>{label}</span>
      <input className="nc-input" type="text" inputMode="decimal" placeholder="—" value={misc[key] ?? ''}
        onChange={e => setCombatMisc(key, e.target.value === '' ? '' : e.target.value.replace(',', '.'))} />
    </label>
  )
  const why = speed.encumbered ? (L ? 'durch Traglast reduziert' : 'reduced by load')
    : speed.unarmored != null && speed.speed != null && speed.speed < speed.unarmored ? (L ? `durch Rüstung reduziert · ${speed.unarmored} m ohne` : `reduced by armor · ${speed.unarmored} m without`)
      : speed.speed == null ? (L ? 'kein Volk gewählt' : 'no race chosen') : (L ? 'aus dem Volk' : 'from race')
  return (
    <div className="nc-card nc-card-pad nc-gap">
      <div className="nc-set-row nc-set-row-flat">
        <span className="nc-set-text"><span className="nc-set-label">{L ? 'Grundbewegung' : 'Base speed'}</span><span className="nc-set-hint">{why}</span></span>
        <span className="nc-move-value">{speed.speed != null ? `${speed.speed} m` : '—'}</span>
      </div>
      <div className="nc-grid-2">
        {speedField(L ? 'Fliegen (m)' : 'Fly (m)', 'speed_fly')}
        {speedField(L ? 'Schwimmen (m)' : 'Swim (m)', 'speed_swim')}
        {speedField(L ? 'Klettern (m)' : 'Climb (m)', 'speed_climb')}
        {speedField(L ? 'Graben (m)' : 'Burrow (m)', 'speed_burrow')}
      </div>
    </div>
  )
}

export function DefenseSection({ char, setCombatMisc, gearItems, onEditGear, hbRaces, lang }) {
  const L = lang === 'de'
  const misc = char.combat_misc ?? {}
  const sizeKey = currentSizeKey(char, hbRaces)
  const resolved = gearItems.map(resolveGearItem)
  const textField = (label, key, ph) => (
    <label className="nc-field"><span>{label}</span>
      <input className="nc-input" type="text" placeholder={ph} value={misc[key] ?? ''} onChange={e => setCombatMisc(key, e.target.value)} />
    </label>
  )
  return (
    <>
      <ListCard empty={!resolved.length} emptyText={L ? 'Keine Rüstung, kein Schild angelegt.' : 'No armor or shield.'}
        addLabel={L ? 'Ausrüstung hinzufügen' : 'Add gear'} onAdd={() => onEditGear(null)}>
        {resolved.map((g, i) => {
          if (!g) return null
          const Icon = GEAR_ICON[g.kind] ?? Diamond
          return (
            <button key={i} className="nc-list-row nc-gear-row" onClick={() => onEditGear(i)}>
              <Icon className="nc-list-icon nc-accent-soft" />
              <span className="nc-row-text">
                <span className="nc-ellipsis nc-gear-name">{g.name}{g.enh ? ` +${g.enh}` : g.mw && (g.kind === 'Rüstung' || g.kind === 'Schild') ? ` (${L ? 'MA' : 'MW'})` : ''}</span>
                <span className="nc-row-sub nc-ellipsis">{gearMeta(g, L)}</span>
              </span>
              <CaretRight className="nc-list-caret" />
            </button>
          )
        })}
      </ListCard>
      <div className="nc-card nc-card-pad nc-gap">
        {[['rk_natural', L ? 'Natürliche Rüstung' : 'Natural armor', L ? 'z. B. Volk, Tiergestalt (Buffs zählen extra)' : 'e.g. race, wild shape'],
          ['rk_deflect', L ? 'Ablenkung (sonstige)' : 'Deflection (other)', L ? 'zählt nur, wenn höher als Ring/Buff' : 'counts only if higher than ring/buff'],
          ['rk_misc', L ? 'Sonstiges' : 'Other', L ? 'zählt auf RK, Berührung und falschen Fuß' : 'applies to all AC values']].map(([key, label, hint]) => (
          <div key={key} className="nc-bd-misc-row">
            <span className="nc-bd-text"><span>{label}</span><span className="nc-bd-sub">{hint}</span></span>
            <Stepper value={Number(misc[key] ?? 0)} onChange={v => setCombatMisc(key, v)} min={key === 'rk_misc' ? -20 : 0} max={30} label={label} />
          </div>
        ))}
        {(() => {
          // Größe als Stepper wie die Zeilen darüber: − kleiner, + größer (GRW-Reihenfolge Mini … Kolossal)
          const keys = Object.keys(SIZE_MODS)
          const i = keys.indexOf(sizeKey)
          const setSize = k => { const m = SIZE_MODS[k]; setCombatMisc('size_mod_rk', m.rk); setCombatMisc('size_mod_kmb', m.kmb) }
          const cur = SIZE_MODS[sizeKey]
          return (
            <div className="nc-bd-misc-row">
              <span className="nc-bd-text"><span>{L ? 'Größe' : 'Size'}</span>
                <span className="nc-bd-sub">{`RK ${cur?.rk ? sg(cur.rk) : '0'} · KMB ${cur?.kmb ? sg(cur.kmb) : '0'}`}</span></span>
              <div className="nc-stepper nc-stepper-wide" aria-label={L ? 'Größe' : 'Size'}>
                <button className="nc-step-btn" disabled={i <= 0} onClick={() => setSize(keys[i - 1])} aria-label={L ? 'kleiner' : 'smaller'}><Minus /></button>
                <span className="nc-step-val">{cur ? (L ? cur.de : cur.en) : '—'}</span>
                <button className="nc-step-btn" disabled={i < 0 || i >= keys.length - 1} onClick={() => setSize(keys[i + 1])} aria-label={L ? 'größer' : 'larger'}><Plus /></button>
              </div>
            </div>
          )
        })()}
        {textField(L ? 'Schadensreduzierung' : 'Damage reduction', 'dr_text', L ? 'z. B. 5/Kaltes Eisen' : 'e.g. 5/cold iron')}
        {textField(L ? 'Resistenzen' : 'Resistances', 'resist_text', L ? 'z. B. Feuer 10, Kälte 5' : 'e.g. fire 10, cold 5')}
        {textField(L ? 'Immunitäten' : 'Immunities', 'immunity_text', L ? 'z. B. Gift, Schlaf' : 'e.g. poison, sleep')}
      </div>
    </>
  )
}
