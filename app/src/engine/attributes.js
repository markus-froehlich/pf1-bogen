/**
 * Attribute engine — 1:1 faithful to Bogen 6.61 Spieler.xlsx
 *
 * Excel reference:
 *   Bogen!T26 = VLOOKUP(ST + BuffST, Attributtab, 2)
 *   Attributtab = Listen!IE5:IS54  (score 1..50, col2=mod, col13/14/15=carry)
 *
 * Racial mods are DISPLAY ONLY — the player enters the final score
 * (including any racial bonus) directly. No auto-application.
 */

import raw from '../data/attributtab.json'

const TABLE = raw.table   // { "10": {mod, carry_light, carry_medium, carry_heavy}, ... }
const ATTRS = ['ST', 'GE', 'KO', 'IN', 'WE', 'CH']

/** Lookup ability modifier exactly like Excel's VLOOKUP on Attributtab. */
export function abilityMod(score) {
  const entry = TABLE[String(Math.round(score))]
  return entry ? entry.mod : 0
}

/** Carry thresholds for a given Strength score (kg, German PF1e). */
export function carryThresholds(strScore) {
  const entry = TABLE[String(Math.round(strScore))]
  if (!entry) return { light: 0, medium: 0, heavy: 0 }
  return { light: entry.carry_light, medium: entry.carry_medium, heavy: entry.carry_heavy }
}

const ATTR_TO_BUFF = { ST: 'str', GE: 'dex', KO: 'kon', IN: 'int_', WE: 'wis', CH: 'cha' }

/**
 * Compute all attribute modifiers for a character.
 * char.attributes = { ST, GE, KO, IN, WE, CH }  (direct input scores, incl. racial)
 * char.buffs      = { ST, GE, KO, IN, WE, CH }  (temporary buff values)
 * buffTotals      = result of computeBuffTotals(char.active_buffs) — active buff bonuses
 *
 * Returns { ST: { score, buffed, mod }, ... }
 */
export function computeAttributes(char, buffTotals = {}) {
  const attrs = char.attributes || {}
  const buffs = char.buffs || {}
  const result = {}
  for (const a of ATTRS) {
    const score    = Number(attrs[a] ?? 10)
    const buff     = Number(buffs[a] ?? 0)
    const tempBuff = Number(buffTotals[ATTR_TO_BUFF[a]] ?? 0)
    const totalBuff = buff + tempBuff
    const buffed   = score + totalBuff
    result[a] = { score, buff: totalBuff, buffed, mod: abilityMod(buffed) }
  }
  return result
}

export { ATTRS }
