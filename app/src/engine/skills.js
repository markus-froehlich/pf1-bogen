/**
 * Skills engine — 1:1 faithful to Bogen 6.61 Spieler.xlsx
 *
 * Excel formula (per skill):
 *   Gesamt = Ränge + AbilityMod + (3 if Klassenfertigkeit AND Ränge > 0) + Sonstiges
 *
 * Note: +3 class skill bonus applies ONLY if ranks > 0 AND it is a class skill
 * for at least one of the character's classes.
 */

/**
 * @param {object} skillEntry  from char.skills — { ranks, misc, is_class_override }
 * @param {number} abilityMod  computed mod for this skill's ability
 * @param {boolean} isClassSkill  whether current classes grant class skill status
 * @param {number} armorPenalty  armor check penalty (0 or negative)
 * @param {number} condPenalty   penalty from conditions
 * @param {number} buffBonus     bonus from active buffs (skills_all)
 * @returns {{ total, ranks, abilityMod, classBonus, misc }}
 */
export function computeSkill(skillEntry, abilityMod, isClassSkill, armorPenalty = 0, condPenalty = 0, buffBonus = 0) {
  const ranks = Number(skillEntry?.ranks ?? 0)
  const misc  = Number(skillEntry?.misc  ?? 0)
  const classBonus = (isClassSkill && ranks > 0) ? 3 : 0
  const total = ranks + abilityMod + classBonus + misc + armorPenalty + condPenalty + buffBonus
  return { total, ranks, abilityMod, classBonus, misc, armorPenalty, condPenalty, buffBonus }
}

/**
 * Compute all skill totals for a character.
 * @param {object} char      full character object
 * @param {object} attrs     result of computeAttributes(char)
 * @param {Array}  skillDefs  from skills.json — [{ id, ability, class_skills, armor_check_penalty }]
 * @param {Set}    classSkillSet  Set of skill IDs that are class skills for char's classes
 * @param {number} armorCheckPenalty  combined armor+shield check penalty (0 or negative)
 * @param {number} condSkillPenalty   penalty from conditions (erschöpft, schütteln, etc.)
 * @param {number} skillsBuff         bonus from active buffs (skills_all)
 */
export function computeAllSkills(char, attrs, skillDefs, classSkillSet, armorCheckPenalty = 0, condSkillPenalty = 0, skillsBuff = 0) {
  const result = {}
  for (const def of skillDefs) {
    const abilityMod = attrs[def.ability]?.mod ?? 0
    const isClassSkill = classSkillSet.has(def.id)
    const penalty = def.armor_check_penalty ? armorCheckPenalty : 0
    result[def.id] = computeSkill(char.skills?.[def.id], abilityMod, isClassSkill, penalty, condSkillPenalty, skillsBuff)
  }
  return result
}

/**
 * Build the set of class skill IDs.
 * Sources (merged, either satisfies):
 *   1. skill def's class_skills[] contains one of char's class IDs (auto, from extracted data)
 *   2. char.skills[id].is_class === true  (manual override set by player)
 */
export function buildClassSkillSet(char, skillDefs) {
  const classIds = new Set(
    (char.meta?.classes ?? []).filter(e => e.id).map(e => e.id)
  )
  const set = new Set()
  for (const def of skillDefs) {
    // Auto: extracted class->skill mapping
    if (def.class_skills?.some(cls => classIds.has(cls))) {
      set.add(def.id)
      continue
    }
    // Manual override
    if (char.skills?.[def.id]?.is_class) {
      set.add(def.id)
    }
  }
  return set
}
