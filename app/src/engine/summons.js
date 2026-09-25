/**
 * Herbeizaubern — Monster herbeizaubern I–IX und Verbündeten der Natur herbeizaubern I–IX.
 * Daten: tools/build_summons.py (GRW Tab. 10-1/10-2, Werteblöcke Monsterhandbuch I/II).
 *
 * Anzahl je Zaubergrad (GRW S. 308/352): 1 Kreatur aus der Liste des Zaubergrads,
 * 1W3 Kreaturen derselben Art aus der Liste eins darunter, 1W4+1 aus einer niedrigeren Liste.
 * Schablonen Celestisch/Infernalisch: MHB I S. 294-295.
 */
import data from '../data/summons.json'

export const SUMMON_SPELLS = data.spells
export const SUMMON_CREATURES = data.creatures
export const SUMMON_LISTS = data.lists

/** Welche Listen darf ein Zauber des Grads `grade` nutzen? */
export function summonOptions(listKey, grade) {
  const list = SUMMON_LISTS[listKey] ?? []
  const groups = [{ count: data.spells.count_same, grades: [grade] }]
  if (grade >= 2) groups.push({ count: data.spells.count_minus1, grades: [grade - 1] })
  if (grade >= 3) groups.push({ count: data.spells.count_lower, grades: Array.from({ length: grade - 2 }, (_, i) => grade - 2 - i) })
  return groups.map(group => ({ ...group, entries: list.filter(entry => group.grades.includes(entry.grade)) }))
}

export function hgValue(hg) {
  if (hg == null) return null
  const [a, b] = String(hg).split('/').map(Number)
  return b ? a / b : a
}

/** Schablone aus der Gesinnung des Zaubernden: gut → celestisch, böse → infernalisch, neutral → Wahl. */
export function templateForAlignment(alignment) {
  const id = String(alignment ?? '').toLowerCase()
  if (id.endsWith('g')) return 'celestisch'
  if (id.endsWith('b')) return 'infernalisch'
  return null
}

const abilityBonus = score => (score == null ? 0 : Math.max(0, Math.floor((score - 10) / 2)))

/**
 * Wendet die celestische/infernalische Schablone an und gibt die geänderten/zusätzlichen Werte zurück.
 * Alle Werte stammen aus MHB I S. 294-295 (Schöpfungsregeln = Schnelle Regeln).
 */
export function applySummonTemplate(creature, key) {
  const template = data.templates[key]
  if (!creature || !template) return null
  const rules = data.templates._rules
  const tw = creature.tw ?? 0
  const tier = rules.by_tw.find(row => tw <= row.max)
  const baseHg = hgValue(creature.hg)
  const hgUp = tw >= rules.hg_plus_one_from_tw
  const newHg = hgUp ? baseHg + 1 : baseHg
  const hgLabel = hgUp ? String(newHg) : creature.hg
  const zr = Number.isInteger(newHg) ? String(newHg + 5) : `${hgLabel} + 5`
  return {
    key,
    name: template.name,
    hg: hgLabel,
    senses: `Dunkelsicht ${rules.darkvision_m} m`,
    resist: `${template.resist} ${tier.resist}`,
    sr: tier.sr ? `${tier.sr}/${template.sr_vs}` : null,
    zr,
    smite: `${template.smite} 1/Tag (Schnelle Aktion): +${abilityBonus(creature.ch)} Angriff, +${tw} Schaden gegen ${template.smite_vs} Kreaturen`,
    page: template.page,
  }
}

/** Maximale TP aus der TP-Zeile („13 (2W8+4)" → 13). */
export function summonHp(creature) {
  const line = creature?.lines?.find(([label]) => label === 'TP')
  return Number(line?.[1]?.match(/^\d+/)?.[0] ?? 0)
}

/** Zufallswurf für die Anzahl: „1", „1W3", „1W4+1". */
export function rollCount(expr) {
  const m = String(expr).match(/^(\d+)W(\d+)(?:\+(\d+))?$/i)
  if (!m) return Number(expr) || 1
  let total = Number(m[3] ?? 0)
  for (let i = 0; i < Number(m[1]); i++) total += 1 + Math.floor(Math.random() * Number(m[2]))
  return total
}
