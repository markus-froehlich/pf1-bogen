/**
 * Class progression engine — 1:1 faithful to Bogen 6.61 Spieler.xlsx
 *
 * Excel reference:
 *   GAB = INDIRECT("c"&KlasseNr*20+Stufe)  col C = BAB
 *   Ref = col G, Will = col H, Fort = col I
 *   Multiclass = SUM across up to 3 class blocks
 */

import classesData from '../data/classes.json'

const CLASSES_BY_ID = Object.fromEntries(classesData.classes.map(c => [c.id, c]))
const CLASSES_BY_NAME_DE = Object.fromEntries(classesData.classes.map(c => [c.name.de, c]))
const HB_CLASSES_BY_ID = {}

export const ALL_CLASSES = classesData.classes

/** Generate a standard 20-row progression from bab_type + good_saves */
export function generateClassProgression(cls) {
  const rows = []
  for (let lv = 1; lv <= 20; lv++) {
    const bab = cls.bab_type === 'full'  ? lv
               : cls.bab_type === '3/4' ? Math.floor(lv * 0.75)
               : Math.floor(lv * 0.5)
    const good = 2 + Math.floor(lv / 2)
    const bad  = Math.floor(lv / 3)
    rows.push({
      bab,
      fort: (cls.good_saves ?? []).includes('fort') ? good : bad,
      ref:  (cls.good_saves ?? []).includes('ref')  ? good : bad,
      will: (cls.good_saves ?? []).includes('will') ? good : bad,
    })
  }
  return rows
}

/** Register homebrew classes into the engine lookup (call on every render before engine use) */
export function registerHomebrewClasses(hbClasses) {
  for (const c of (hbClasses ?? [])) {
    HB_CLASSES_BY_ID[c.id] = { ...c, progression: generateClassProgression(c) }
  }
}

/** Find a class by id or German name (includes homebrew) */
export function findClass(idOrName) {
  return CLASSES_BY_ID[idOrName] ?? CLASSES_BY_NAME_DE[idOrName] ?? HB_CLASSES_BY_ID[idOrName] ?? null
}

/** All homebrew classes as array */
export function getHBClasses() { return Object.values(HB_CLASSES_BY_ID) }

/** Get progression row for a class at a given level (1–20) */
export function getProgression(classId, level) {
  const cls = findClass(classId)
  if (!cls || !level) return { bab: 0, ref: 0, will: 0, fort: 0 }
  const row = cls.progression[Math.min(Math.max(level, 1), 20) - 1]
  return row ?? { bab: 0, ref: 0, will: 0, fort: 0 }
}

/**
 * Compute BAB and base saves for a multiclass character.
 * char.meta.classes = [{ id, level }, { id, level }, { id, level }]
 * Returns { bab, ref, will, fort, totalLevel }
 */
export function computeBABAndSaves(char) {
  const entries = (char.meta?.classes ?? []).filter(e => e.id && e.level > 0)
  let bab = 0, ref = 0, will = 0, fort = 0, totalLevel = 0
  for (const e of entries) {
    const p = getProgression(e.id, e.level)
    bab  += p.bab
    ref  += p.ref
    will += p.will
    fort += p.fort
    totalLevel += Number(e.level)
  }
  return { bab, ref, will, fort, totalLevel }
}
