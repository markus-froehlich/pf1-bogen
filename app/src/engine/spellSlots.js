/**
 * spellSlots.js — Zauber pro Tag / bekannte Zauber, 1:1 aus dem Excel (Blatt "Klasse").
 * Daten: data/spell_progression.json, erzeugt mit tools/build_spell_progression.py.
 *
 * Excel-Kodierung in `day`:  99 = unbegrenzt (Grad 0 bei Spontanzauberern),
 * 0.1 = Grad zugänglich, aber 0 Grundzauber (nur Bonuszauber durch hohes Attribut).
 */
import progression from '../data/spell_progression.json'

// Zauberlisten-IDs (spells.json) bzw. alte IDs → Klassen-ID in spell_progression.json
const ALIASES = { hxm_magier: 'magier', kampfmagier: 'kampfmagus', orakel: 'mystiker' }

function entryFor(classId) {
  return progression[classId] ?? progression[ALIASES[classId]] ?? null
}
function rowOf(table, classLevel) {
  return table[Math.min(Math.max(Number(classLevel) || 1, 1), 20) - 1]
}

/** Zauberattribut (IN/WE/CH) laut Excel, sonst null (kein Zauberwirker). */
export function castingStatOf(classId) {
  return entryFor(classId)?.stat ?? null
}

/** Spontanzauberer = Klassen mit Tabelle "bekannte Zauber" im Excel. */
export function isSpontaneousCaster(classId) {
  return Boolean(entryFor(classId)?.known)
}

/** Max. bekannte Zauber je Grad (nur Spontanzauberer), sonst null. */
export function getSpellsKnown(classId, classLevel) {
  const e = entryFor(classId)
  if (!e?.known) return null
  const result = {}
  rowOf(e.known, classLevel).forEach((n, lv) => { if (n > 0) result[lv] = n })
  return result
}

/**
 * Grund-Zauber pro Tag je Grad (ohne Attribut-Bonuszauber), inkl. Domänen-/Geist-Slot.
 * Zugängliche Grade mit 0 Grundzaubern sind mit 0 enthalten, damit Bonuszauber greifen.
 * @returns {{ [spellLevel: number]: number } | null}  null = kein Zauberwirker
 */
export function getSpellSlots(classId, classLevel) {
  const e = entryFor(classId)
  if (!e) return null
  const day   = rowOf(e.day, classLevel)
  const known = e.known ? rowOf(e.known, classLevel) : null
  const extra = e.extra ? rowOf(e.extra, classLevel) : null
  const result = {}
  day.forEach((v, lv) => {
    if (!(v > 0)) return
    let base = v === 99 ? (known?.[lv] ?? 0) : Math.floor(v)
    if (lv >= 1 && extra) base += Math.floor(extra[lv - 1] ?? 0)
    result[lv] = base
  })
  return result
}

/** Attribut-Bonuszauber (Grundregelwerk "Zusätzliche Zauber"): ab Grad 1, wenn Mod ≥ Grad. */
export function bonusSpells(abilityMod, spellLevel) {
  if (spellLevel < 1 || abilityMod < spellLevel) return 0
  return Math.floor((abilityMod - spellLevel) / 4) + 1
}

/**
 * Rohzeile der Excel-Tabelle für eine Klassenstufe: `day` (Zauber/Tag inkl. 99/0.1-Kodierung),
 * `known` (bekannte Zauber bzw. beim Arkanisten: vorbereitete) und `extra` (Domänen-/Geist-Platz,
 * Index = Grad − 1). null = kein Zauberwirker.
 */
export function spellRow(classId, classLevel) {
  const e = entryFor(classId)
  if (!e) return null
  return {
    day: rowOf(e.day, classLevel),
    known: e.known ? rowOf(e.known, classLevel) : null,
    extra: e.extra ? rowOf(e.extra, classLevel) : null,
    source: e.source ?? null,
  }
}
