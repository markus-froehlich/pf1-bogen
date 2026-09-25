/**
 * Zauber-Tab: Klassentypen, Plätze je Grad, Datenzugriff auf char.spellbook.
 *
 * Speicherformat (abwärtskompatibel):
 *   spellbook = { class_id, levels, book?, school?, opposed?, notes?, others? }
 *   – die erste Zauberklasse („primär") liegt wie bisher direkt in spellbook (Druckansicht liest das),
 *   – weitere Zauberklassen (Multiklasse) unter spellbook.others[charClassId] im selben Format.
 *   levels[lv] = { total, used, prepared: [{ id, spell_id, used, slot? }], bloodline_ids: [] }
 *   book[lv]   = [spell_id]   (Magier-Zauberbuch, Vertrauter, Formelbuch)
 */
import spellsData from '../data/spells.json'
import { castingStatOf, spellRow, bonusSpells } from '../engine/spellSlots.js'
import { classLabel } from '../engine/classes.js'

export const ALL_SPELLS = spellsData.spells
export const SPELL_MAP = Object.fromEntries(ALL_SPELLS.map(s => [s.id, s]))
export const GRADES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

/** Klassen-ID (classes.json) → Zauberliste (spells.json). */
const LIST_ID = { magier: 'hxm_magier', hexenmeister: 'hxm_magier', kampfmagus: 'kampfmagier', orakel: 'mystiker' }
export const listIdOf = charId => LIST_ID[charId] ?? charId

/** Klassentyp laut README: Klassenliste, Buch, spontan, hybrid. */
const BOOK = { magier: 'Zauberbuch', kampfmagus: 'Zauberbuch', arkanist: 'Zauberbuch', hexe: 'Vertrauter', alchemist: 'Formelbuch', ermittler: 'Formelbuch' }
export function kindOf(charId, row) {
  if (charId === 'arkanist') return 'hybrid'
  if (row?.known) return 'spont'
  return BOOK[charId] ? 'book' : 'list'
}
export const bookName = (charId, L) => (L ? BOOK[charId] ?? 'Zauberbuch' : ({ Zauberbuch: 'Spellbook', Vertrauter: 'Familiar', Formelbuch: 'Formula book' })[BOOK[charId]] ?? 'Spellbook')

/** Zauberstufe: Paladin/Waldläufer = Klassenstufe − 3 (GRW); sonst Klassenstufe (Excel). */
const CL_MINUS_3 = new Set(['paladin', 'waldlaeufer'])
export const casterLevelOf = (charId, level) => (CL_MINUS_3.has(charId) ? Math.max(0, level - 3) : level)

/** Kosten fürs Eintragen ins Zauberbuch (GRW, Magier): Grad 0 = 5 GM, sonst Grad² × 10 GM. */
export const copyCost = lv => (lv === 0 ? 5 : lv * lv * 10)

/** Die acht Schulen (Namen wie in den Zauberlisten des GRW) — Kürzel wie in spells.json. */
export const SCHOOLS = { Ba: 'Bannzauber', Be: 'Beschwörung', Er: 'Erkenntnis', Hv: 'Hervorrufung', Il: 'Illusion', Ne: 'Nekromantie', Vw: 'Verwandlung', Vz: 'Verzauberung' }
export const schoolOf = spell => { const c = (spell?.school ?? '').split(/\s+/)[0]; return c.length === 2 ? c[0].toUpperCase() + c[1].toLowerCase() : c }

/** Alle Zauberklassen des Charakters (Reihenfolge wie Klassen-Slots). */
export function casterEntries(char) {
  const sb = char.spellbook ?? {}
  const list = (char.meta?.classes ?? []).filter(e => e.id && Number(e.level) > 0 && castingStatOf(e.id))
    .map(e => ({ charId: e.id, listId: listIdOf(e.id), level: Number(e.level) || 1 }))
  const primaryIdx = Math.max(0, list.findIndex(e => e.listId === sb.class_id || e.charId === sb.class_id))
  return list.map((e, i) => {
    const row = spellRow(e.charId, e.level)
    return { ...e, key: i === primaryIdx ? '__primary' : e.charId, primary: i === primaryIdx, row, kind: kindOf(e.charId, row), stat: castingStatOf(e.charId), cl: casterLevelOf(e.charId, e.level) }
  })
}

const EMPTY = { levels: {} }
export function bookData(sb, entry) {
  if (!entry) return EMPTY
  return entry.primary ? (sb ?? EMPTY) : (sb?.others?.[entry.charId] ?? EMPTY)
}

/** Änderung nur am Datenblock einer Zauberklasse. */
export function updateBook(setSpellbook, entry, fn) {
  setSpellbook(prev => {
    if (entry.primary) return { ...prev, ...fn(prev), class_id: prev.class_id && prev.class_id === entry.listId ? prev.class_id : entry.listId }
    const others = prev.others ?? {}
    return { ...prev, others: { ...others, [entry.charId]: fn(others[entry.charId] ?? { levels: {} }) } }
  })
}

/** Alte Exporte speicherten vorbereitete Zauber als reine IDs. */
export function preparedEntries(prepared, lv) {
  return (prepared ?? []).map((e, i) => (typeof e === 'string'
    ? { id: `legacy_${lv}_${i}`, spell_id: e, used: false }
    : { ...e, id: e.id ?? `legacy_${lv}_${i}`, spell_id: e.spell_id ?? e.id, used: Boolean(e.used) }))
}
export const newInstId = () => `prep_${Math.random().toString(36).slice(2, 10)}`

/** Spezialisierter Magier (GRW): +1 Schulplatz je Grad ab 1, den er wirken kann. */
const hasSchoolSlot = (entry, data) => entry.charId === 'magier' && data.school && data.school !== 'universal'

/**
 * Plätze je Grad. total = Grundwert (Excel) + Bonuszauber (Attribut) + Sonderplatz + manuelle Korrektur.
 * special = Domänen-/Geist-/Schulplatz (nur für passende Zauber), unlimited = Grad 0 beliebig oft.
 */
export function gradeInfo(entry, data, attrs) {
  const row = entry.row
  const mod = attrs?.[entry.stat]?.mod ?? 0
  return GRADES.map(lv => {
    const day = row?.day?.[lv] ?? 0
    const accessible = day > 0
    const knownMax = row?.known ? row.known[lv] ?? 0 : null
    const unlimited = lv === 0 && accessible && (day === 99 || entry.kind === 'list' || entry.kind === 'book')
    let base = day === 99 ? (knownMax ?? 0) : Math.floor(day)
    if (entry.kind === 'hybrid' && day === 99) base = 0
    const bonus = accessible ? bonusSpells(mod, lv) : 0
    let special = 0
    if (lv >= 1 && accessible) {
      special += Math.floor(row?.extra?.[lv - 1] ?? 0)
      if (hasSchoolSlot(entry, data)) special += 1
    }
    const adjust = Number(data.levels?.[lv]?.adjust ?? 0)
    const total = accessible ? Math.max(0, base + bonus + special + adjust) : 0
    const specialLabel = row?.extra ? (entry.charId === 'schamane' ? 'Geist' : 'Domäne') : 'Schule'
    return { lv, accessible, day, base, bonus, special, specialLabel, adjust, total, unlimited, knownMax, dc: 10 + lv + mod }
  })
}

/** Belegte Plätze durch Vorbereitungen (Gegnerschule belegt zwei). */
export function slotCost(spellId, data) {
  const sch = schoolOf(SPELL_MAP[spellId])
  return (data.opposed ?? []).includes(sch) ? 2 : 1
}

/** Zusammenfassung eines Grades für die Kachel: übrig / gesamt. */
export function gradeTile(entry, data, g) {
  const lvData = data.levels?.[g.lv] ?? {}
  if (entry.kind === 'spont' || entry.kind === 'hybrid') {
    const used = Number(lvData.used ?? 0)
    return { left: g.unlimited ? null : Math.max(0, g.total - used), total: g.total }
  }
  const inst = preparedEntries(lvData.prepared, g.lv)
  const usedCost = g.unlimited ? 0 : inst.filter(i => i.used).reduce((a, i) => a + slotCost(i.spell_id, data), 0)
  const prepCost = inst.reduce((a, i) => a + slotCost(i.spell_id, data), 0)
  return { left: g.unlimited ? null : Math.max(0, prepCost - usedCost), total: g.total, prepared: prepCost }
}

/** Zauber einer Klassenliste auf einem Grad (sortiert). */
export function classSpells(listId, lv) {
  return ALL_SPELLS.filter(s => s.class_levels[listId] === lv).sort((a, b) => a.name.de.localeCompare(b.name.de, 'de'))
}

/** Buch-Inhalt je Grad: gespeicherte Einträge + (Altbestand) bereits vorbereitete Zauber. */
export function bookIds(data, lv) {
  const ids = new Set(data.book?.[lv] ?? [])
  for (const e of preparedEntries(data.levels?.[lv]?.prepared, lv)) ids.add(e.spell_id)
  return [...ids]
}

export const entryLabel = (e, lang) => `${classLabel(e.charId, lang)} ${e.level}`

/* Regel-Link (prd.5footstep.de) — Präfix der Seitenangabe → Buch, unverändert aus SpellsTab.jsx. */
const PAGE_PREFIX_BOOK = { G: 'Grundregelwerk', E: 'Expertenregeln', M: 'Ausbauregeln-Magie', K: 'Ausbauregeln-II-Kampf', KL: 'Ausbauregeln-VI-Klassen', OG: 'Ausbauregeln-VII-Okkultes' }
const SLUG_OVERRIDES = { 'Flamme erzeugen': 'Flammenerzeugen' }
export function spellUrl(spell) {
  const m = spell?.page?.match(/^([A-Za-z]+)/)
  const book = m ? PAGE_PREFIX_BOOK[m[1]] : null
  if (!book) return null
  const slug = SLUG_OVERRIDES[spell.name.de] ?? spell.name.de.replace(/ä/g, 'ae').replace(/Ä/g, 'Ae').replace(/ö/g, 'oe').replace(/Ö/g, 'Oe')
    .replace(/ü/g, 'ue').replace(/Ü/g, 'Ue').replace(/ß/g, 'ss').replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '')
  return `http://prd.5footstep.de/${book}/Zauber/${slug}`
}
export const LIST_NAMES = spellsData._meta.classes

/** Untertitel eines Zaubers: „Hv [Feuer] · SG 13". */
export function spellSub(spell, dc) {
  const sch = spell?.school ? spell.school.replace(/^(\S+)\s+(.+)$/, '$1 [$2]') : null
  return [sch, dc != null ? `SG ${dc}` : null].filter(Boolean).join(' · ')
}
