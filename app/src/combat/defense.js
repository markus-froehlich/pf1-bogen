/** Bewegung + Größe — unverändert aus dem bisherigen CombatTab.jsx übernommen. */
import { resolveGearItem } from '../engine/combat.js'
import racesData from '../data/races.json'

const RACE_MAP_BASE = Object.fromEntries(racesData.races.map(r => [r.id, r]))

// PF1e encumbrance speed table (medium/heavy load, same reduction)
export function encumberedSpeed(baseM) {
  const ft = Math.round(baseM / 0.3)
  if (ft <= 5)  return 1.5
  if (ft <= 10) return 1.5
  if (ft <= 15) return 3
  if (ft <= 20) return 4.5
  if (ft <= 25) return 6
  if (ft <= 30) return 6
  if (ft <= 35) return 7.5
  if (ft <= 40) return 9
  if (ft <= 45) return 9
  return Math.round(ft * 2 / 3 / 5) * 5 * 0.3
}

// PF1e size mods: { rk, kmb }  (RK and KMB/KMV use equal-and-opposite values)
// Grundregelwerk Tabelle 8-1 (sehr klein = Tiny, winzig = Diminutive, Mini = Fine)
export const SIZE_MODS = {
  mini:        { de: 'Mini',        en: 'Fine',       rk:  8, kmb: -8 },
  winzig:      { de: 'Winzig',      en: 'Diminutive', rk:  4, kmb: -4 },
  sehr_klein:  { de: 'Sehr klein',  en: 'Tiny',       rk:  2, kmb: -2 },
  klein:       { de: 'Klein',       en: 'Small',      rk:  1, kmb: -1 },
  mittelgross: { de: 'Mittelgroß',  en: 'Medium',     rk:  0, kmb:  0 },
  gross:       { de: 'Groß',        en: 'Large',      rk: -1, kmb:  1 },
  riesig:      { de: 'Riesig',      en: 'Huge',       rk: -2, kmb:  2 },
  gigantisch:  { de: 'Gigantisch',  en: 'Gargantuan', rk: -4, kmb:  4 },
  kolossal:    { de: 'Kolossal',    en: 'Colossal',   rk: -8, kmb:  8 },
}

const RACE_SIZE_KEY = {
  'Mittelgroß': 'mittelgross', 'Klein': 'klein', 'Sehr klein': 'sehr_klein', 'Winzig': 'winzig', 'Mini': 'mini',
  'Groß': 'gross', 'Riesig': 'riesig', 'Gigantisch': 'gigantisch', 'Kolossal': 'kolossal',
}

export function raceMapWith(hbRaces = []) {
  return { ...RACE_MAP_BASE, ...Object.fromEntries(hbRaces.map(r => [r.id, r])) }
}

export function currentSizeKey(char, hbRaces = []) {
  const misc = char.combat_misc ?? {}
  const raceSizeKey = RACE_SIZE_KEY[raceMapWith(hbRaces)[char.meta.race]?.size?.de] ?? 'mittelgross'
  const curRK = Number(misc.size_mod_rk ?? SIZE_MODS[raceSizeKey].rk)
  return Object.keys(SIZE_MODS).find(k => SIZE_MODS[k].rk === curRK) ?? raceSizeKey
}

/** Bewegung zu Fuß (m): nur mittlere/schwere Rüstung senkt sie (PF1e RAW); Last optional. */
export function computeSpeed(char, { hbRaces = [], encumbranceTier = 'light', applyCarryMovement = false } = {}) {
  const misc = char.combat_misc ?? {}
  const raceData = raceMapWith(hbRaces)[char.meta.race]
  // Mittlere/schwere Rüstung (auch eigene Einträge mit Kategorie) senkt die Bewegung
  const worn = (char.gear?.items ?? []).map(resolveGearItem).filter(g => g && g.kind === 'Rüstung')
  const hasArmor = worn.some(g => g.cat === 'mittel' || g.cat === 'schwer')
  const manualSpeed = misc.speed_walk === '' || misc.speed_walk == null ? null : Number(misc.speed_walk)
  const speedRaw = manualSpeed ?? (hasArmor
    ? (raceData?.speed_m?.armored ?? raceData?.speed_m?.unarmored ?? null)
    : (raceData?.speed_m?.unarmored ?? null))
  const baseSpeedM = manualSpeed ?? raceData?.speed_m?.unarmored ?? speedRaw
  const encumbered = applyCarryMovement && encumbranceTier !== 'light' && baseSpeedM != null
  const speed = encumbered ? Math.min(speedRaw ?? Infinity, encumberedSpeed(baseSpeedM)) : speedRaw
  const unarmored = raceData?.speed_m?.unarmored ?? null
  return { speed, unarmored, hasArmor, encumbered, encumbranceTier }
}
