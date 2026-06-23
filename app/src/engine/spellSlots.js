/**
 * spellSlots.js — PF1e spell slot lookup engine
 *
 * getSpellSlots(classId, classLevel) → { [spellLevel]: slotsPerDay } | null
 * Returns null for non-casters.
 * Only non-zero slot levels are included in the result object.
 */

// ---------------------------------------------------------------------------
// Tables: rows = class levels 1–20, cols = spell levels 0–9
// ---------------------------------------------------------------------------

const TABLES = {

  /** Full 9-level prepared casters: Kleriker, Druide, Magier, Hexe, Schamane,
   *  Mystiker, Kriegspriester (full), Orakel, Arkanist */
  full9_prepared: [
    // lv  0  1  2  3  4  5  6  7  8  9
    /* 1 */ [3, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    /* 2 */ [4, 2, 0, 0, 0, 0, 0, 0, 0, 0],
    /* 3 */ [4, 2, 1, 0, 0, 0, 0, 0, 0, 0],
    /* 4 */ [4, 3, 2, 0, 0, 0, 0, 0, 0, 0],
    /* 5 */ [4, 3, 2, 1, 0, 0, 0, 0, 0, 0],
    /* 6 */ [4, 3, 3, 2, 0, 0, 0, 0, 0, 0],
    /* 7 */ [4, 4, 3, 2, 1, 0, 0, 0, 0, 0],
    /* 8 */ [4, 4, 3, 3, 2, 0, 0, 0, 0, 0],
    /* 9 */ [4, 4, 4, 3, 2, 1, 0, 0, 0, 0],
    /*10 */ [4, 4, 4, 3, 3, 2, 0, 0, 0, 0],
    /*11 */ [4, 4, 4, 4, 3, 2, 1, 0, 0, 0],
    /*12 */ [4, 4, 4, 4, 3, 3, 2, 0, 0, 0],
    /*13 */ [4, 4, 4, 4, 4, 3, 2, 1, 0, 0],
    /*14 */ [4, 4, 4, 4, 4, 3, 3, 2, 0, 0],
    /*15 */ [4, 4, 4, 4, 4, 4, 3, 2, 1, 0],
    /*16 */ [4, 4, 4, 4, 4, 4, 3, 3, 2, 0],
    /*17 */ [4, 4, 4, 4, 4, 4, 4, 3, 2, 1],
    /*18 */ [4, 4, 4, 4, 4, 4, 4, 3, 3, 2],
    /*19 */ [4, 4, 4, 4, 4, 4, 4, 4, 3, 3],
    /*20 */ [4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  ],

  /** 6-level prepared casters: Kampfmagier, Magus, Inquisitor, Ermittler, Alchemist,
   *  Kriegspriester (variant) — cols 0–6, padded to 10 */
  full6_prepared: [
    // lv  0  1  2  3  4  5  6
    /* 1 */ [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    /* 2 */ [2, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    /* 3 */ [3, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    /* 4 */ [3, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    /* 5 */ [4, 2, 0, 0, 0, 0, 0, 0, 0, 0],
    /* 6 */ [4, 3, 0, 0, 0, 0, 0, 0, 0, 0],
    /* 7 */ [4, 3, 1, 0, 0, 0, 0, 0, 0, 0],
    /* 8 */ [4, 3, 2, 0, 0, 0, 0, 0, 0, 0],
    /* 9 */ [4, 3, 3, 0, 0, 0, 0, 0, 0, 0],
    /*10 */ [4, 3, 3, 1, 0, 0, 0, 0, 0, 0],
    /*11 */ [4, 4, 3, 2, 0, 0, 0, 0, 0, 0],
    /*12 */ [4, 4, 3, 3, 0, 0, 0, 0, 0, 0],
    /*13 */ [4, 4, 3, 3, 1, 0, 0, 0, 0, 0],
    /*14 */ [4, 4, 4, 3, 2, 0, 0, 0, 0, 0],
    /*15 */ [4, 4, 4, 3, 3, 0, 0, 0, 0, 0],
    /*16 */ [4, 4, 4, 3, 3, 1, 0, 0, 0, 0],
    /*17 */ [4, 4, 4, 4, 3, 2, 0, 0, 0, 0],
    /*18 */ [4, 4, 4, 4, 3, 3, 0, 0, 0, 0],
    /*19 */ [4, 4, 4, 4, 3, 3, 1, 0, 0, 0],
    /*20 */ [4, 4, 4, 4, 4, 3, 2, 0, 0, 0],
  ],

  /** 4-level prepared casters: Paladin, Waldläufer, Jäger — no 0-level spells */
  full4_prepared: [
    // lv  0  1  2  3  4
    /* 1 */ [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    /* 2 */ [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    /* 3 */ [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    /* 4 */ [0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    /* 5 */ [0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    /* 6 */ [0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    /* 7 */ [0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    /* 8 */ [0, 1, 1, 0, 0, 0, 0, 0, 0, 0],
    /* 9 */ [0, 2, 1, 0, 0, 0, 0, 0, 0, 0],
    /*10 */ [0, 2, 1, 1, 0, 0, 0, 0, 0, 0],
    /*11 */ [0, 2, 1, 1, 0, 0, 0, 0, 0, 0],
    /*12 */ [0, 2, 2, 1, 0, 0, 0, 0, 0, 0],
    /*13 */ [0, 2, 2, 1, 1, 0, 0, 0, 0, 0],
    /*14 */ [0, 2, 2, 1, 1, 0, 0, 0, 0, 0],
    /*15 */ [0, 2, 2, 2, 1, 0, 0, 0, 0, 0],
    /*16 */ [0, 2, 2, 2, 1, 0, 0, 0, 0, 0],
    /*17 */ [0, 2, 2, 2, 1, 0, 0, 0, 0, 0],
    /*18 */ [0, 3, 2, 2, 1, 0, 0, 0, 0, 0],
    /*19 */ [0, 3, 3, 2, 2, 0, 0, 0, 0, 0],
    /*20 */ [0, 3, 3, 3, 2, 0, 0, 0, 0, 0],
  ],

  /** 6-level spontaneous casters: Barde, Skalde */
  full6_spontaneous: [
    // lv  0  1  2  3  4  5  6
    /* 1 */ [4, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    /* 2 */ [5, 2, 0, 0, 0, 0, 0, 0, 0, 0],
    /* 3 */ [6, 3, 0, 0, 0, 0, 0, 0, 0, 0],
    /* 4 */ [6, 3, 1, 0, 0, 0, 0, 0, 0, 0],
    /* 5 */ [6, 4, 2, 0, 0, 0, 0, 0, 0, 0],
    /* 6 */ [6, 4, 3, 0, 0, 0, 0, 0, 0, 0],
    /* 7 */ [6, 4, 3, 1, 0, 0, 0, 0, 0, 0],
    /* 8 */ [6, 4, 4, 2, 0, 0, 0, 0, 0, 0],
    /* 9 */ [6, 5, 4, 3, 0, 0, 0, 0, 0, 0],
    /*10 */ [6, 5, 4, 3, 1, 0, 0, 0, 0, 0],
    /*11 */ [6, 5, 4, 4, 2, 0, 0, 0, 0, 0],
    /*12 */ [6, 5, 5, 4, 3, 0, 0, 0, 0, 0],
    /*13 */ [6, 5, 5, 4, 3, 1, 0, 0, 0, 0],
    /*14 */ [6, 5, 5, 4, 4, 2, 0, 0, 0, 0],
    /*15 */ [6, 5, 5, 5, 4, 3, 0, 0, 0, 0],
    /*16 */ [6, 5, 5, 5, 4, 3, 1, 0, 0, 0],
    /*17 */ [6, 5, 5, 5, 4, 4, 2, 0, 0, 0],
    /*18 */ [6, 5, 5, 5, 5, 4, 3, 0, 0, 0],
    /*19 */ [6, 5, 5, 5, 5, 5, 4, 0, 0, 0],
    /*20 */ [6, 5, 5, 5, 5, 5, 5, 0, 0, 0],
  ],

  /** 9-level spontaneous casters: Paktmagier — same table as full9_prepared */
  get full9_spontaneous() { return this.full9_prepared },

  /** 9-level spontaneous casters with own progression: Hexenmeister, Orakel */
  full9_spontaneous_class: [
    // lv  0  1  2  3  4  5  6  7  8  9
    /* 1 */ [4, 3, 0, 0, 0, 0, 0, 0, 0, 0],
    /* 2 */ [4, 4, 0, 0, 0, 0, 0, 0, 0, 0],
    /* 3 */ [4, 4, 3, 0, 0, 0, 0, 0, 0, 0],
    /* 4 */ [4, 4, 4, 0, 0, 0, 0, 0, 0, 0],
    /* 5 */ [4, 4, 4, 3, 0, 0, 0, 0, 0, 0],
    /* 6 */ [4, 4, 4, 4, 0, 0, 0, 0, 0, 0],
    /* 7 */ [4, 4, 4, 4, 3, 0, 0, 0, 0, 0],
    /* 8 */ [4, 4, 4, 4, 4, 0, 0, 0, 0, 0],
    /* 9 */ [4, 4, 4, 4, 4, 3, 0, 0, 0, 0],
    /*10 */ [4, 4, 4, 4, 4, 4, 0, 0, 0, 0],
    /*11 */ [4, 4, 4, 4, 4, 4, 3, 0, 0, 0],
    /*12 */ [4, 4, 4, 4, 4, 4, 4, 0, 0, 0],
    /*13 */ [4, 4, 4, 4, 4, 4, 4, 3, 0, 0],
    /*14 */ [4, 4, 4, 4, 4, 4, 4, 4, 0, 0],
    /*15 */ [4, 4, 4, 4, 4, 4, 4, 4, 3, 0],
    /*16 */ [4, 4, 4, 4, 4, 4, 4, 4, 4, 0],
    /*17 */ [4, 4, 4, 4, 4, 4, 4, 4, 4, 3],
    /*18 */ [4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    /*19 */ [4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    /*20 */ [4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  ],
}

// ---------------------------------------------------------------------------
// Class → slot type mapping
// ---------------------------------------------------------------------------

export const CLASS_SLOT_TYPE = {
  hxm_magier:   'full9_prepared',
  arkanist:     'full9_prepared',
  alchemist:    'full6_prepared',
  hexe:         'full9_prepared',
  kampfmagier:  'full6_prepared',
  ermittler:    'full6_prepared',
  kleriker:     'full9_prepared',
  druide:       'full9_prepared',
  inquisitor:   'full6_prepared',
  waldlaeufer:  'full4_prepared',
  jaeger:       'full4_prepared',
  schamane:     'full9_prepared',
  mystiker:     'full9_prepared',
  kriegspriester: 'full6_prepared',
  barde:        'full6_spontaneous',
  paladin:      'full4_prepared',
  antipaladin:  'full4_prepared',
  blutwueter:   'full4_prepared',
  skalde:       'full6_spontaneous',
  paktmagier:   'full9_spontaneous',
  adept:        'full9_prepared',
  hexenmeister: 'full9_spontaneous_class',
  orakel:       'full9_spontaneous_class',
}

// ---------------------------------------------------------------------------
// Spells Known tables (spontaneous casters only)
// ---------------------------------------------------------------------------

const KNOWN_TABLES = {
  /** Bard / Skalde — 6-level spontaneous */
  full6_spontaneous: [
    // lv  0  1  2  3  4  5  6
    /* 1 */ [4, 2, 0, 0, 0, 0, 0],
    /* 2 */ [5, 3, 0, 0, 0, 0, 0],
    /* 3 */ [6, 4, 0, 0, 0, 0, 0],
    /* 4 */ [6, 4, 2, 0, 0, 0, 0],
    /* 5 */ [6, 4, 3, 0, 0, 0, 0],
    /* 6 */ [6, 4, 4, 0, 0, 0, 0],
    /* 7 */ [6, 5, 4, 2, 0, 0, 0],
    /* 8 */ [6, 5, 4, 3, 0, 0, 0],
    /* 9 */ [6, 5, 4, 4, 0, 0, 0],
    /*10 */ [6, 5, 5, 4, 2, 0, 0],
    /*11 */ [6, 6, 5, 4, 3, 0, 0],
    /*12 */ [6, 6, 5, 4, 4, 0, 0],
    /*13 */ [6, 6, 5, 5, 4, 2, 0],
    /*14 */ [6, 6, 6, 5, 4, 3, 0],
    /*15 */ [6, 6, 6, 5, 4, 4, 0],
    /*16 */ [6, 6, 6, 5, 5, 4, 2],
    /*17 */ [6, 6, 6, 6, 5, 4, 3],
    /*18 */ [6, 6, 6, 6, 5, 4, 4],
    /*19 */ [6, 6, 6, 6, 5, 5, 4],
    /*20 */ [6, 6, 6, 6, 6, 5, 5],
  ],

  /** Hexenmeister / Orakel — 9-level spontaneous, PF1e Sorcerer/Oracle Spells Known */
  full9_spontaneous_class: [
    // lv  0  1  2  3  4  5  6  7  8  9
    /* 1 */ [4, 2, 0, 0, 0, 0, 0, 0, 0, 0],
    /* 2 */ [5, 2, 0, 0, 0, 0, 0, 0, 0, 0],
    /* 3 */ [5, 3, 0, 0, 0, 0, 0, 0, 0, 0],
    /* 4 */ [6, 3, 1, 0, 0, 0, 0, 0, 0, 0],
    /* 5 */ [6, 4, 2, 0, 0, 0, 0, 0, 0, 0],
    /* 6 */ [7, 4, 2, 1, 0, 0, 0, 0, 0, 0],
    /* 7 */ [7, 5, 3, 2, 0, 0, 0, 0, 0, 0],
    /* 8 */ [8, 5, 3, 2, 1, 0, 0, 0, 0, 0],
    /* 9 */ [8, 5, 4, 3, 2, 0, 0, 0, 0, 0],
    /*10 */ [9, 5, 4, 3, 2, 1, 0, 0, 0, 0],
    /*11 */ [9, 5, 5, 4, 3, 2, 0, 0, 0, 0],
    /*12 */ [9, 5, 5, 4, 3, 2, 1, 0, 0, 0],
    /*13 */ [9, 5, 5, 4, 4, 3, 2, 0, 0, 0],
    /*14 */ [9, 5, 5, 4, 4, 3, 2, 1, 0, 0],
    /*15 */ [9, 5, 5, 4, 4, 4, 3, 2, 0, 0],
    /*16 */ [9, 5, 5, 4, 4, 4, 3, 2, 1, 0],
    /*17 */ [9, 5, 5, 4, 4, 4, 4, 3, 2, 0],
    /*18 */ [9, 5, 5, 4, 4, 4, 4, 3, 2, 1],
    /*19 */ [9, 5, 5, 4, 4, 4, 4, 3, 3, 2],
    /*20 */ [9, 5, 5, 4, 4, 4, 4, 3, 3, 3],
  ],

  /** Paktmagier — 9-level spontaneous */
  full9_spontaneous: [
    // lv  0  1  2  3  4  5  6  7  8  9
    /* 1 */ [4, 2, 0, 0, 0, 0, 0, 0, 0, 0],
    /* 2 */ [5, 2, 0, 0, 0, 0, 0, 0, 0, 0],
    /* 3 */ [5, 3, 0, 0, 0, 0, 0, 0, 0, 0],
    /* 4 */ [6, 3, 1, 0, 0, 0, 0, 0, 0, 0],
    /* 5 */ [6, 4, 2, 0, 0, 0, 0, 0, 0, 0],
    /* 6 */ [7, 4, 2, 1, 0, 0, 0, 0, 0, 0],
    /* 7 */ [7, 5, 3, 2, 0, 0, 0, 0, 0, 0],
    /* 8 */ [8, 5, 3, 2, 1, 0, 0, 0, 0, 0],
    /* 9 */ [8, 5, 4, 3, 2, 0, 0, 0, 0, 0],
    /*10 */ [9, 5, 4, 3, 2, 1, 0, 0, 0, 0],
    /*11 */ [9, 5, 5, 4, 3, 2, 0, 0, 0, 0],
    /*12 */ [9, 5, 5, 4, 3, 2, 1, 0, 0, 0],
    /*13 */ [9, 5, 5, 4, 4, 3, 2, 0, 0, 0],
    /*14 */ [9, 5, 5, 4, 4, 3, 2, 1, 0, 0],
    /*15 */ [9, 5, 5, 4, 4, 4, 3, 2, 0, 0],
    /*16 */ [9, 5, 5, 4, 4, 4, 3, 2, 1, 0],
    /*17 */ [9, 5, 5, 4, 4, 4, 3, 3, 2, 0],
    /*18 */ [9, 5, 5, 4, 4, 4, 3, 3, 2, 1],
    /*19 */ [9, 5, 5, 4, 4, 4, 3, 3, 3, 2],
    /*20 */ [9, 5, 5, 4, 4, 4, 3, 3, 3, 3],
  ],
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns true when the class casts spontaneously.
 * Covers: Barde, Skalde, Paktmagier, Hexenmeister, Orakel
 */
export function isSpontaneousCaster(classId) {
  return CLASS_SLOT_TYPE[classId]?.includes('spontaneous') ?? false
}

/**
 * Returns max spells known per spell level for spontaneous casters.
 * Only non-zero entries included. Returns null for non-spontaneous classes.
 */
export function getSpellsKnown(classId, classLevel) {
  const type = CLASS_SLOT_TYPE[classId]
  if (!type?.includes('spontaneous')) return null
  const table = KNOWN_TABLES[type]
  if (!table) return null
  const row = table[Math.min(Math.max(classLevel, 1), 20) - 1]
  const result = {}
  row.forEach((n, lv) => { if (n > 0) result[lv] = n })
  return result
}

/**
 * Returns spell slots per day for a given class and class level.
 *
 * @param {string} classId   — class identifier (must match CLASS_SLOT_TYPE key)
 * @param {number} classLevel — class level 1–20
 * @returns {{ [spellLevel: number]: number } | null}
 *   Object keyed by spell level (0–9) with slots-per-day value.
 *   Only non-zero entries are included. Returns null for non-caster classes.
 */
export function getSpellSlots(classId, classLevel) {
  const type = CLASS_SLOT_TYPE[classId]
  if (!type) return null  // non-caster

  const table = TABLES[type]
  const row = table[Math.min(Math.max(classLevel, 1), 20) - 1]

  const result = {}
  row.forEach((n, lv) => {
    if (n > 0) result[lv] = n
  })
  return result
}
