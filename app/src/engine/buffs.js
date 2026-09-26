export const BUFF_STATS = [
  { key: 'str',        de: 'ST',         cat: 'attr'   },
  { key: 'dex',        de: 'GE',         cat: 'attr'   },
  { key: 'kon',        de: 'KO',         cat: 'attr'   },
  { key: 'int_',       de: 'IN',         cat: 'attr'   },
  { key: 'wis',        de: 'WE',         cat: 'attr'   },
  { key: 'cha',        de: 'CH',         cat: 'attr'   },
  { key: 'attack',     de: 'Angriff',    cat: 'combat' },
  { key: 'damage',     de: 'Schaden',    cat: 'combat' },
  { key: 'ac',         de: 'RK',         cat: 'combat' },
  { key: 'nat_armor',  de: 'Nat. Rüstung', cat: 'combat' },
  { key: 'deflection', de: 'Ablenkung',  cat: 'combat' },
  { key: 'dodge',      de: 'Ausweichen', cat: 'combat' },
  { key: 'saves_all',  de: 'Alle RW',    cat: 'saves'  },
  { key: 'fort',       de: 'Zäh',        cat: 'saves'  },
  { key: 'ref',        de: 'Ref',        cat: 'saves'  },
  { key: 'will',       de: 'Wil',        cat: 'saves'  },
  { key: 'init',       de: 'Initiative', cat: 'other'  },
  { key: 'skills_all', de: 'Fertigkeiten', cat: 'other' },
]

// Bonus-Typen (README „Buff"): gleicher Typ + gleiches Ziel → nur der höchste zählt;
// Ausweichen, ungetypt und alle Mali stapeln. Buffs ohne Typ (Bestand) = ungetypt.
export const BUFF_TYPES = [
  { id: 'verbesserung', de: 'Verbesserung', en: 'Enhancement' },
  { id: 'ruestung',     de: 'Rüstung',      en: 'Armor' },
  { id: 'schild',       de: 'Schild',       en: 'Shield' },
  { id: 'moral',        de: 'Moral',        en: 'Morale' },
  { id: 'glueck',       de: 'Glück',        en: 'Luck' },
  { id: 'kompetenz',    de: 'Kompetenz',    en: 'Competence' },
  { id: 'heilig',       de: 'Heilig',       en: 'Sacred' },
  { id: 'unheilig',     de: 'Unheilig',     en: 'Profane' },
  { id: 'verstaendnis', de: 'Verständnis',  en: 'Insight' },
  { id: 'situation',    de: 'Situation',    en: 'Circumstance' },
  { id: 'widerstand',   de: 'Widerstand',   en: 'Resistance' },
  { id: 'ablenkung',    de: 'Ablenkung',    en: 'Deflection' },
  { id: 'ausweichen',   de: 'Ausweichen',   en: 'Dodge' },
  { id: 'groesse',      de: 'Größe',        en: 'Size' },
  { id: 'ungetypt',     de: 'Ungetypt',     en: 'Untyped' },
]
const STACKING_TYPES = new Set(['ausweichen', 'ungetypt'])

/**
 * Pro Ziel die Beiträge aller aktiven Buffs mit Stapelregel.
 * → { [key]: [{ id, name, type, value, counted, suppressedBy }] } (Reihenfolge = Buff-Reihenfolge)
 */
export function buffContributions(active_buffs) {
  const out = {}
  for (const s of BUFF_STATS) out[s.key] = []
  for (const b of (active_buffs ?? [])) {
    if (!b.active) continue
    const type = b.type || 'ungetypt'
    for (const s of BUFF_STATS) {
      const value = Number(b.bonuses?.[s.key] ?? 0)
      if (value) out[s.key].push({ id: b.id, name: b.name, type, value, counted: true, suppressedBy: null })
    }
  }
  for (const list of Object.values(out)) {
    const byType = {}
    for (const c of list) {
      if (c.value < 0 || STACKING_TYPES.has(c.type)) continue
      ;(byType[c.type] ??= []).push(c)
    }
    for (const group of Object.values(byType)) {
      if (group.length < 2) continue
      const best = group.reduce((a, c) => (c.value > a.value ? c : a))
      for (const c of group) if (c !== best) { c.counted = false; c.suppressedBy = best.name }
    }
  }
  return out
}

export function computeBuffTotals(active_buffs) {
  const totals = {}
  const contribs = buffContributions(active_buffs)
  for (const s of BUFF_STATS) totals[s.key] = contribs[s.key].reduce((sum, c) => sum + (c.counted ? c.value : 0), 0)
  return totals
}

/** Für die Buff-Zeile: „stapelt nicht: Angriff (Moral, Heldenmut)". */
export function suppressedTargets(buff, active_buffs) {
  const contribs = buffContributions(active_buffs)
  const typeLabel = BUFF_TYPES.find(t => t.id === (buff.type || 'ungetypt'))?.de ?? ''
  return BUFF_STATS
    .filter(s => contribs[s.key].some(c => c.id === buff.id && !c.counted))
    .map(s => {
      const c = contribs[s.key].find(x => x.id === buff.id)
      return `${s.de} (${typeLabel}, ${c.suppressedBy})`
    })
}
