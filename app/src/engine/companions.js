import companionsData from '../data/animal_companions.json'

const SPECIES = Object.fromEntries(companionsData.companions.map(species => [species.id, species]))

// Tabelle 3-6: Grundwerte von Tiergefährten. The values are independent from
// normal class progressions and are therefore kept in their own engine module.
const PROGRESSION = [
  [2, 1, 3, 0, 3, 0, 0, 1], [3, 2, 3, 1, 3, 0, 0, 1], [3, 2, 3, 1, 3, 2, 1, 2],
  [4, 3, 4, 1, 4, 2, 1, 2], [5, 3, 4, 1, 4, 2, 1, 2], [6, 4, 5, 2, 5, 4, 2, 3],
  [6, 4, 5, 2, 5, 4, 2, 3], [7, 5, 6, 2, 6, 4, 2, 3], [8, 6, 6, 2, 6, 6, 3, 4],
  [9, 6, 6, 3, 6, 6, 3, 4], [9, 6, 6, 3, 6, 6, 3, 4], [10, 7, 7, 3, 7, 8, 4, 5],
  [11, 8, 7, 3, 7, 8, 4, 5], [12, 9, 8, 4, 8, 8, 4, 5], [12, 9, 8, 4, 8, 10, 5, 6],
  [13, 9, 8, 4, 8, 10, 5, 6], [14, 10, 9, 4, 8, 10, 5, 6], [15, 11, 9, 5, 9, 12, 6, 7],
  [15, 11, 9, 5, 9, 12, 6, 7], [16, 12, 10, 5, 10, 12, 6, 7],
]

const SIZE_MODS = { klein: [1, -1], mittelgroß: [0, 0], gross: [-1, 1], groß: [-1, 1], riesig: [-2, 2] }
const normalise = value => String(value ?? '').trim().toLowerCase()

function baseAttributes(species) {
  const attrs = { ST: 10, GE: 10, KO: 10, IN: 10, WE: 10, CH: 10 }
  for (const key of Object.keys(attrs)) {
    const match = species.base.match(new RegExp(`${key}\\s*,?\\s*(\\d+)`, 'i'))
    if (match) attrs[key] = Number(match[1])
  }
  // A dash represents a mindless creature in the source data, not INT 10.
  if (/IN\s*[-—]/i.test(species.base)) attrs.IN = 0
  return attrs
}

export function getCompanionBaseAttributes(speciesOrId) {
  const species = typeof speciesOrId === 'string' ? SPECIES[speciesOrId] : speciesOrId
  return species ? baseAttributes(species) : null
}

function baseMovement(species) {
  const base = species.base ?? ''
  const movement = {}
  if (species.speed) movement.speed_walk = Number(species.speed)
  for (const [key, word] of [['speed_swim', 'Schwimmen'], ['speed_fly', 'Fliegen'], ['speed_climb', 'Klettern']]) {
    const match = base.match(new RegExp(`${word}\\s*(\\d+)\\s*m`, 'i'))
    if (match) movement[key] = Number(match[1])
  }
  return movement
}

function addTextBonuses(attrs, text) {
  for (const key of ['ST', 'GE', 'KO', 'IN', 'WE', 'CH']) {
    const match = text.match(new RegExp(`${key}\\s*([+-])\\s*(\\d+)`, 'gi')) ?? []
    for (const part of match) {
      const value = part.match(/([+-])\s*(\d+)/)
      attrs[key] += (value[1] === '-' ? -1 : 1) * Number(value[2])
    }
  }
}

function naturalArmorFeatCount(feats) {
  return (feats ?? []).filter(feat => normalise(feat.name).replace(/[^a-zäöüß]/g, '') === 'verbessertenatürlicherk').length
}

export function getCompanionRules(char, level) {
  const species = SPECIES[char.companion?.speciesId]
  if (!species) return null
  const safeLevel = Math.max(1, Math.min(20, Number(level) || 1))
  const [hd, bab, ref, will, fort, naturalArmor, statBonuses, tricks] = PROGRESSION[safeLevel - 1]
  const attrs = baseAttributes(species)
  let size = species.size
  let speciesNaturalArmor = 0
  const baseNatural = species.base.match(/nat[.\s]*RK\s*\+?(\d+)/i)
  if (baseNatural) speciesNaturalArmor += Number(baseNatural[1])

  for (let i = 0; i < safeLevel; i++) {
    const text = species.levels[i] ?? ''
    addTextBonuses(attrs, text)
    const armor = text.match(/(?:nat RK|NRK)\s*\+?(\d+)/i)
    if (armor) speciesNaturalArmor += Number(armor[1])
    const sizeMatch = text.match(/Größe\s+(winzig|klein|mittelgroß|gross|groß|riesig)/i)
    if (sizeMatch) size = sizeMatch[1].replace(/^./, c => c.toUpperCase())
  }

  const choices = char.companion?.choices ?? { abilityChoices: [] }
  // "ST/GE" in Tabelle 3-6 is one shared progression bonus: it applies to
  // both Strength and Dexterity, not a choice between the two attributes.
  attrs.ST += statBonuses
  attrs.GE += statBonuses
  const abilityCount = [4, 9, 14, 20].filter(lv => lv <= safeLevel).length
  for (let i = 0; i < abilityCount; i++) {
    const choice = choices.abilityChoices?.[i]
    if (['ST', 'GE', 'KO', 'IN', 'WE', 'CH'].includes(choice)) attrs[choice] += 1
  }

  const [sizeModRK, sizeModKMB] = SIZE_MODS[normalise(size)] ?? [0, 0]
  const movement = baseMovement(species)
  return {
    species, level: safeLevel, hd, tricks, attrs, size, speed: species.speed,
    choices, statBonusCount: statBonuses, abilityIncreaseCount: abilityCount,
    baseValues: { bab, ref, will, fort, totalLevel: safeLevel },
    combatMisc: { ...movement, size_mod_rk: sizeModRK, size_mod_kmb: sizeModKMB, rk_natural: naturalArmor + speciesNaturalArmor + naturalArmorFeatCount(char.feats) },
  }
}
