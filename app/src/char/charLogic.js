import { abilityMod } from '../engine/attributes.js'
import { getConditionMods } from '../engine/conditions.js'
import { buffContributions } from '../engine/buffs.js'
import { CONDITIONS } from '../components/ConditionsPanel.jsx'
import { sg } from '../combat/breakdown.js'

export const ATTR_NAMES = {
  ST: ['Stärke', 'Strength'], GE: ['Geschicklichkeit', 'Dexterity'], KO: ['Konstitution', 'Constitution'],
  IN: ['Intelligenz', 'Intelligence'], WE: ['Weisheit', 'Wisdom'], CH: ['Charisma', 'Charisma'],
}
const ATTR_TO_BUFF = { ST: 'str', GE: 'dex', KO: 'kon', IN: 'int_', WE: 'wis', CH: 'cha' }
const COND_NAME = Object.fromEntries(CONDITIONS.map(c => [c.id, c]))

/** GRW Tabelle 1-1: Steigerungspunkte-Kosten (geprüft am PDF 2026-09-26). */
export const POINT_BUY = { 7: -4, 8: -2, 9: -1, 10: 0, 11: 1, 12: 2, 13: 3, 14: 5, 15: 7, 16: 10, 17: 13, 18: 17 }
/** GRW Tabelle 1-2: Steigerungspunkte je Kampagnenart. */
export const POINT_BUY_BUDGETS = [[10, 'Low-Fantasy'], [15, 'Standard'], [20, 'High-Fantasy'], [25, 'Episch']]

/** Kurzprofil einer Klasse aus ihrer Progression (Stufe 20 GAB → 1 / ¾ / ½; gute RW = +2 auf Stufe 1). */
export function classProfile(cls, lang) {
  if (!cls) return null
  const L = lang === 'de'
  const prog = cls.progression ?? []
  const bab20 = prog[19]?.bab
  const babLabel = bab20 === 20 ? '1' : bab20 === 15 ? '¾' : bab20 === 10 ? '½' : bab20 != null ? String(bab20) : '—'
  const good = [['fort', L ? 'Zäh' : 'Fort'], ['ref', 'Ref'], ['will', L ? 'Wil' : 'Will']].filter(([k]) => prog[0]?.[k] === 2).map(([, n]) => n)
  return {
    hitDie: cls.hit_die, sppl: cls.skill_points_per_level, babLabel, good,
    text: `${cls.hit_die ?? '—'} · ${cls.skill_points_per_level ?? '—'} ${L ? 'FP/Stufe' : 'SP/level'} · ${L ? 'GAB' : 'BAB'} ${babLabel}${good.length ? ` · ${good.join('/')} ${L ? 'gut' : 'good'}` : ''}`,
  }
}

/** Aufschlüsselung eines Attributs: Buffs zählen in den Wert, Zustände auf den Modifikator. */
export function attributeBreakdown(key, { char, attrs, lang }) {
  const L = lang === 'de'
  const a = attrs[key]
  const lines = []
  const contribs = buffContributions(char.active_buffs ?? [])[ATTR_TO_BUFF[key]] ?? []
  for (const c of contribs) {
    lines.push({ kind: 'buff', label: c.name, sub: c.counted ? (L ? 'Buff · zählt in den Wert' : 'Buff · adds to score') : (L ? `stapelt nicht mit ${c.suppressedBy}` : 'does not stack'), value: 0, display: `${L ? 'Wert' : 'Score'} ${sg(c.counted ? c.value : 0)}` })
  }
  const manual = Number(char.buffs?.[key] ?? 0)
  if (manual) lines.push({ kind: 'buff', label: L ? 'Manueller Buff' : 'Manual buff', sub: L ? 'zählt in den Wert' : 'adds to score', value: 0, display: `${L ? 'Wert' : 'Score'} ${sg(manual)}` })
  const detail = [`${L ? 'Grundwert' : 'Base'} ${a.score}`, ...contribs.filter(c => c.counted).map(c => `${sg(c.value)} ${c.name}`), manual ? `${sg(manual)}` : null].filter(Boolean).join(' ')
  const baseMod = abilityMod(a.buffed)
  lines.push({ kind: 'attr', label: `${L ? 'Modifikator aus Wert' : 'Modifier from score'} ${a.buffed}`, sub: detail, value: baseMod })
  let total = baseMod
  if (key === 'ST' || key === 'GE') {
    const field = key === 'ST' ? 'str_mod_delta' : 'dex_mod_delta'
    for (const id of char.conditions ?? []) {
      const v = Number(getConditionMods([id])[field] ?? 0)
      if (!v) continue
      const shown = v < -20 ? -99 : v                    // gelähmt/hilflos: Wert 0
      lines.push({ kind: 'cond', label: L ? COND_NAME[id]?.de ?? id : COND_NAME[id]?.en ?? id, sub: L ? 'Zustand · Modifikator' : 'Condition · modifier', value: shown, display: shown === -99 ? (L ? 'Wert 0' : 'Score 0') : null })
      total += v
    }
    const clamped = Math.max(-5, total)
    if (clamped !== total) {
      // Anzeige: Summe = Endwert (Wert 0 → Mod −5)
      const condSum = lines.filter(l => l.kind === 'cond').reduce((s, l) => s + (l.value === -99 ? 0 : l.value), 0)
      lines.forEach(l => { if (l.value === -99) l.value = clamped - baseMod - condSum })
      total = clamped
    }
  }
  const note = contribs.length || manual ? (L ? 'Buffs erhöhen den Attributswert; der Modifikator ergibt sich aus dem Gesamtwert.' : 'Buffs raise the score; the modifier follows from it.')
    : (L ? 'Kein Buff wirkt gerade auf dieses Attribut.' : 'No buff affects this ability.')
  return { title: L ? ATTR_NAMES[key][0] : ATTR_NAMES[key][1], total, lines, note }
}

export function classFeatureNames(char, featureData) {
  const out = []
  for (const entry of (char.meta.classes ?? []).filter(e => e.id && Number(e.level) > 0)) {
    const data = featureData[entry.id]
    if (!data) continue
    for (let lvl = 1; lvl <= Number(entry.level); lvl++) for (const f of data.levels?.[lvl] ?? []) out.push(f)
  }
  return [...new Set(out)]
}
