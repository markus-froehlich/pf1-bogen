/**
 * Aufschlüsselung von Kampfwerten (README „Herkunft von Werten"): eine Zeile je Posten,
 * Summe = Engine-Wert. Quellen: combat._components, getConditionMods je Zustand,
 * buffContributions je Buff. Nichts wird hier neu berechnet, was die Engine anders rechnet —
 * weicht die Summe ab, wird die Differenz als eigene Zeile ausgewiesen (und fällt so auf).
 */
import { getConditionMods } from '../engine/conditions.js'
import { buffContributions } from '../engine/buffs.js'
import { CONDITIONS } from '../components/ConditionsPanel.jsx'

const COND_NAME = Object.fromEntries(CONDITIONS.map(c => [c.id, c]))

export const sg = n => (n >= 0 ? `+${n}` : `${n}`)

function condLines(conditions, keys, lang) {
  const out = []
  for (const id of conditions ?? []) {
    const m = getConditionMods([id])
    const v = keys.reduce((sum, k) => sum + Number(m[k] ?? 0), 0)
    if (v) out.push({ kind: 'cond', label: lang === 'de' ? COND_NAME[id]?.de ?? id : COND_NAME[id]?.en ?? id, sub: lang === 'de' ? 'Zustand' : 'Condition', value: v })
  }
  return out
}

function buffLines(activeBuffs, keys, lang) {
  const contribs = buffContributions(activeBuffs)
  const byBuff = new Map()
  for (const k of keys) {
    for (const c of contribs[k] ?? []) {
      const entry = byBuff.get(c.id) ?? { name: c.name, value: 0, suppressed: [] }
      if (c.counted) entry.value += c.value
      else entry.suppressed.push(c.suppressedBy)
      byBuff.set(c.id, entry)
    }
  }
  return [...byBuff.values()].filter(e => e.value || e.suppressed.length).map(e => ({
    kind: 'buff', label: e.name,
    sub: e.suppressed.length ? (lang === 'de' ? `Buff · stapelt nicht mit ${e.suppressed.join(', ')}` : 'Buff · does not stack') : 'Buff',
    value: e.value,
  }))
}

function finish(title, total, lines, extra = {}) {
  // „Sonstiges" (manuelles Feld + Notiz) ist Teil der Summe
  if (extra.miscKey && Number(extra.miscValue ?? 0)) {
    lines.push({ kind: 'misc', label: extra.lang === 'en' ? 'Other' : 'Sonstiges', sub: extra.note || (extra.lang === 'en' ? 'manual' : 'manuell'), value: Number(extra.miscValue) })
  }
  const sum = lines.reduce((s, l) => s + (l.value ?? 0), 0)
  if (sum !== total) lines.push({ kind: 'misc', label: 'Differenz', sub: 'Engine ≠ Summe der Posten', value: total - sum })
  return { title, total, lines, ...extra }
}

/**
 * key: 'rk' | 'touch' | 'flat' | 'init' | 'kmb' | 'kmv' | 'fort' | 'ref' | 'will'
 */
export function combatBreakdown(key, { char, attrs, combat, baseValues, lang }) {
  const L = lang === 'de'
  const misc = char.combat_misc ?? {}
  const c = combat._components ?? {}
  const conds = char.conditions ?? []
  const buffs = char.active_buffs ?? []
  const cm = combat._condMods ?? {}
  const gePrefix = L ? 'Geschicklichkeit' : 'Dexterity'

  if (key === 'rk' || key === 'touch' || key === 'flat') {
    const lines = [{ kind: 'base', label: L ? 'Basis' : 'Base', sub: L ? 'Grundwert' : 'Base value', value: 10, raw: true }]
    if (key !== 'touch') {
      if (c.rk_armor) lines.push({ kind: 'gear', label: L ? 'Rüstung' : 'Armor', sub: L ? 'Ausrüstung' : 'Gear', value: c.rk_armor })
      if (c.rk_shield) lines.push({ kind: 'gear', label: L ? 'Schild' : 'Shield', sub: L ? 'Ausrüstung' : 'Gear', value: c.rk_shield })
    }
    if (key !== 'flat' && c.GEmodCapped) {
      const capped = c.maxDex < 99 && c.effGEmod > c.maxDex
      lines.push({ kind: 'attr', label: gePrefix, sub: capped ? (L ? `Attribut · max. GE ${sg(c.maxDex)}` : `Ability · max Dex ${sg(c.maxDex)}`) : (L ? 'Attribut' : 'Ability'), value: c.GEmodCapped })
    }
    if (c.sizeModRK) lines.push({ kind: 'size', label: L ? 'Größe' : 'Size', sub: L ? 'Größenmodifikator' : 'Size modifier', value: c.sizeModRK })
    if (key !== 'touch') {
      const natManual = Number(misc.rk_natural ?? 0)
      if (natManual) lines.push({ kind: 'misc', label: L ? 'Natürliche Rüstung' : 'Natural armor', sub: L ? 'manuell' : 'manual', value: natManual })
      lines.push(...buffLines(buffs, ['nat_armor'], lang))
    }
    if (c.rk_ring) lines.push({ kind: 'gear', label: L ? 'Ablenkung' : 'Deflection', sub: L ? 'Ring · Ausrüstung' : 'Ring', value: c.rk_ring })
    const deflManual = Number(misc.rk_deflect ?? 0)
    if (deflManual) lines.push({ kind: 'misc', label: L ? 'Ablenkung' : 'Deflection', sub: L ? 'manuell' : 'manual', value: deflManual })
    lines.push(...buffLines(buffs, ['deflection', 'ac', ...(key === 'flat' ? [] : ['dodge'])], lang))
    if (key !== 'flat') lines.push(...condLines(conds, ['rk'], lang))
    // Ausweichen entfällt ohne GE-Bonus (Engine: rk_dodge = 0) — Buffzeilen sind dann korrigiert
    if (key !== 'flat' && cm.no_dex_to_ac) {
      const dodge = buffLines(buffs, ['dodge'], lang).reduce((s, l) => s + l.value, 0)
      if (dodge) lines.push({ kind: 'cond', label: L ? 'Ausweichen entfällt' : 'Dodge lost', sub: L ? 'kein GE-Bonus auf RK' : 'no Dex to AC', value: -dodge })
    }
    const total = key === 'rk' ? combat.rk : key === 'touch' ? combat.rk_touch : combat.rk_flat
    const title = key === 'rk' ? (L ? 'Rüstungsklasse' : 'Armor Class') : key === 'touch' ? (L ? 'RK Berührung' : 'Touch AC') : (L ? 'RK auf dem falschen Fuß' : 'Flat-footed AC')
    // rk_misc zählt in alle drei RK-Werte; bearbeitbar nur in der RK-Aufschlüsselung
    const miscExtra = { miscKey: 'rk_misc', noteKey: 'rk_note', miscValue: Number(misc.rk_misc ?? 0), note: misc.rk_note, lang, editable: key === 'rk', absolute: true }
    return finish(title, total, lines, miscExtra)
  }

  if (key === 'init') {
    const lines = [{ kind: 'attr', label: gePrefix, sub: L ? 'Attribut' : 'Ability', value: c.init_ability ?? 0 }]
    if (c.init_feat) lines.push({ kind: 'feat', label: L ? 'Verbesserte Initiative' : 'Improved Initiative', sub: L ? 'Talent' : 'Feat', value: c.init_feat })
    lines.push(...buffLines(buffs, ['init'], lang), ...condLines(conds, ['init'], lang))
    return finish(L ? 'Initiative' : 'Initiative', combat.init, lines, { miscKey: 'init_misc', noteKey: 'init_note', miscValue: c.init_misc ?? 0, note: misc.init_note, lang, editable: true })
  }

  if (key === 'kmb' || key === 'kmv') {
    const lines = []
    if (key === 'kmv') lines.push({ kind: 'base', label: L ? 'Basis' : 'Base', sub: L ? 'Grundwert' : 'Base value', value: 10, raw: true })
    lines.push({ kind: 'class', label: L ? 'Grund-Angriffsbonus' : 'Base attack bonus', sub: L ? 'Klasse' : 'Class', value: baseValues.bab })
    lines.push({ kind: 'attr', label: L ? 'Stärke' : 'Strength', sub: L ? 'Attribut' : 'Ability', value: c.effSTmod ?? attrs.ST.mod })
    if (key === 'kmv') lines.push({ kind: 'attr', label: gePrefix, sub: L ? 'Attribut' : 'Ability', value: c.effGEmod ?? attrs.GE.mod })
    if (c.sizeModKMB) lines.push({ kind: 'size', label: L ? 'Größe' : 'Size', sub: L ? 'Größenmodifikator' : 'Size modifier', value: c.sizeModKMB })
    const kmbMisc = Number(misc.kmb_misc ?? 0)
    if (key === 'kmv' && kmbMisc) lines.push({ kind: 'misc', label: L ? 'Sonstiges (KMB)' : 'Other (CMB)', sub: misc.kmb_note || (L ? 'manuell' : 'manual'), value: kmbMisc })
    lines.push(...condLines(conds, key === 'kmb' ? ['attack', 'melee_attack'] : ['rk'], lang))
    const miscKey = key === 'kmb' ? 'kmb_misc' : 'kmv_misc'
    return finish(key === 'kmb' ? (L ? 'Kampfmanöverbonus' : 'Combat maneuver bonus') : (L ? 'Kampfmanöververteidigung' : 'Combat maneuver defense'),
      combat[key], lines, { miscKey, noteKey: key === 'kmb' ? 'kmb_note' : 'kmv_note', miscValue: Number(misc[miscKey] ?? 0), note: misc[key === 'kmb' ? 'kmb_note' : 'kmv_note'], lang, editable: true, absolute: key === 'kmv' })
  }

  if (key === 'fort' || key === 'ref' || key === 'will') {
    const attr = { fort: ['KO', L ? 'Konstitution' : 'Constitution'], ref: ['GE', gePrefix], will: ['WE', L ? 'Weisheit' : 'Wisdom'] }[key]
    const attrMod = key === 'ref' ? (c.effGEmod ?? attrs.GE.mod) : attrs[attr[0]].mod
    const lines = [
      { kind: 'class', label: L ? 'Grundwert' : 'Base save', sub: L ? 'Klasse' : 'Class', value: baseValues[key] },
      { kind: 'attr', label: attr[1], sub: L ? 'Attribut' : 'Ability', value: attrMod },
      ...buffLines(buffs, ['saves_all', key], lang),
      ...condLines(conds, [key === 'ref' ? 'ref_flat' : key], lang),
    ]
    const title = { fort: L ? 'Zähigkeit' : 'Fortitude', ref: 'Reflex', will: L ? 'Willen' : 'Will' }[key]
    return finish(title, combat[key], lines, { miscKey: `${key}_misc`, noteKey: `${key}_note`, miscValue: Number(misc[`${key}_misc`] ?? 0), note: misc[`${key}_note`], lang, editable: true })
  }
  return null
}

/** Angriff einer Waffe: Posten aus computeWeaponAttack. */
export function weaponBreakdown({ name, result, slot, bab, isRanged, finesse, condMods, buffs, lang }) {
  const L = lang === 'de'
  const lines = [
    { kind: 'class', label: L ? 'Grund-Angriffsbonus' : 'Base attack bonus', sub: L ? 'Klasse' : 'Class', value: bab },
    { kind: 'attr', label: isRanged && !slot.is_thrown ? (L ? 'Geschicklichkeit' : 'Dexterity') : finesse ? (L ? 'Stärke/GE (Finesse)' : 'Str/Dex (finesse)') : (L ? 'Stärke' : 'Strength'),
      sub: L ? 'Attribut' : 'Ability', value: result.attack_mod },
  ]
  const enh = Number(slot.enhancement ?? 0)
  if (enh) lines.push({ kind: 'gear', label: L ? 'Verzauberung' : 'Enhancement', sub: L ? 'Waffe' : 'Weapon', value: enh })
  else if (slot.mw) lines.push({ kind: 'gear', label: L ? 'Meisterarbeit' : 'Masterwork', sub: L ? 'Waffe' : 'Weapon', value: 1 })
  if (Number(slot.misc_attack ?? 0)) lines.push({ kind: 'misc', label: L ? 'Angriff+' : 'Attack+', sub: slot.notes || (L ? 'manuell' : 'manual'), value: Number(slot.misc_attack) })
  if (slot.off_hand) lines.push({ kind: 'misc', label: L ? 'Nebenhand' : 'Off hand', sub: L ? 'Zwei-Waffen-Kampf' : 'Two-weapon fighting', value: -4 })
  lines.push(...buffLines(buffs, ['attack'], lang))
  for (const id of Object.keys(COND_NAME)) {
    if (!(condMods.sources?.attack ?? []).includes(id) && !(condMods.sources?.melee_attack ?? []).includes(id)) continue
    const m = getConditionMods([id])
    const v = Number(m.attack ?? 0) + (isRanged ? 0 : Number(m.melee_attack ?? 0))
    if (v) lines.push({ kind: 'cond', label: L ? COND_NAME[id].de : COND_NAME[id].en, sub: L ? 'Zustand' : 'Condition', value: v })
  }
  return finish(`${name} · ${L ? 'Angriff' : 'Attack'}`, result.attack_bonus, lines, { totalLabel: result.full_attack_str })
}
