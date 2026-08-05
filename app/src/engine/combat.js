/**
 * Combat engine — 1:1 faithful to Bogen 6.61 Spieler.xlsx
 *
 * Excel references (Bogen sheet):
 *   GAB melee  = BAB + STMod + misc
 *   GAB ranged = BAB + GEMod + misc
 *   RK  = 10 + Rüstung + Schild + GEMod (capped) + Größe + Natur + Ausw + Misc
 *   Fort = BaseFort + KOMod + misc
 *   Ref  = BaseRef  + GEMod + misc
 *   Will = BaseWill + WEMod + misc
 *   Init = GEMod + misc
 *   KMB  = BAB + STMod + Größemod_KMB
 *   KMV  = 10 + KMB
 */

import armorData   from '../data/armor.json'
import shieldsData from '../data/shields.json'
import ringsData   from '../data/rings.json'
import { getConditionMods } from './conditions.js'

const ARMOR_MAP   = Object.fromEntries(armorData.armor.map(a => [a.id, a]))
const SHIELDS_MAP = Object.fromEntries(shieldsData.shields.map(s => [s.id, s]))
const RINGS_MAP    = Object.fromEntries(ringsData.rings.map(r => [r.id, r]))

export { ARMOR_MAP, SHIELDS_MAP, RINGS_MAP }

export function registerHomebrewArmor(items)   { for (const a of (items ?? [])) ARMOR_MAP[a.id]   = a }
export function registerHomebrewShields(items) { for (const s of (items ?? [])) SHIELDS_MAP[s.id] = s }

function hasImprovedInitiative(feats) {
  return (feats ?? []).some(feat =>
    String(feat.name ?? '').toLowerCase().replace(/[^a-zäöüß]/g, '') === 'verbesserteinitiative'
  )
}

export function hasToughness(feats) {
  return (feats ?? []).some(feat =>
    String(feat.name ?? '').toLowerCase().replace(/[^a-zäöüß]/g, '') === 'abhärtung'
  )
}

/**
 * @param {object} char  full character object
 * @param {object} attrs result of computeAttributes(char)
 * @param {object} baseValues result of computeBABAndSaves(char)
 * @param {object} buffTotals result of computeBuffTotals(char.active_buffs)
 */
export function computeCombat(char, attrs, baseValues, buffTotals = {}) {
  const misc  = char.combat_misc ?? {}
  const gear  = char.gear ?? {}
  const cond  = getConditionMods(char.conditions)
  const bt    = buffTotals

  // Apply condition deltas (erschöpft/ermüdet/gelähmt), floor at -5 (= score 0)
  const effGEmod = Math.max(-5, attrs.GE.mod + cond.dex_mod_delta)
  const effSTmod = Math.max(-5, attrs.ST.mod + cond.str_mod_delta)
  const KOmod = attrs.KO.mod
  const WEmod = attrs.WE.mod

  const { bab, ref, will, fort } = baseValues

  const sizeModRK  = Number(misc.size_mod_rk  ?? 0)
  const sizeModKMB = Number(misc.size_mod_kmb ?? 0)

  // Gear is a free-form list of slots (like weapons) — each slot can hold any armor,
  // shield, or ring item. Nothing stops equipping e.g. two shields; every slot's bonus
  // is simply summed by category, same as a player physically wearing whatever they typed in.
  const gearItems = gear.items ?? []
  let rk_armor = 0, rk_shield = 0, rk_ring = 0
  let armorMaxDex = 99, gearCheckPenalty = 0, gearSpellFailure = 0
  for (const item of gearItems) {
    const isArmor  = ARMOR_MAP[item.id]
    const isShield = SHIELDS_MAP[item.id]
    const isRing   = RINGS_MAP[item.id]
    const def = isArmor ?? isShield ?? isRing
    if (!item.id || !def) continue
    const bonus = def.bonus + (isRing ? 0 : Number(item.enh ?? 0))
    if (isArmor) { rk_armor += bonus; armorMaxDex = Math.min(armorMaxDex, def.max_dex ?? 99) }
    else if (isShield) rk_shield += bonus
    else if (isRing) rk_ring += bonus
    if (def.check_penalty < 0) {
      gearCheckPenalty += (item.mw ? Math.min(0, def.check_penalty + 1) : def.check_penalty)
    }
    if (def.spell_failure > 0) gearSpellFailure += def.spell_failure
  }
  // MaxDex: worn armor's cap wins if lower than manual misc
  const maxDex = Math.min(
    armorMaxDex,
    misc.max_dex != null ? Number(misc.max_dex) : 99
  )
  // If condition removes DEX to AC: cap positive DEX at 0 (negative still applies)
  const GEmodForAC = cond.no_dex_to_ac ? Math.min(0, effGEmod) : effGEmod
  const GEmodCapped = Math.min(GEmodForAC, maxDex)

  const rk_natural  = Number(misc.rk_natural ?? 0) + Number(bt.nat_armor ?? 0)
  const rk_deflect  = rk_ring + Number(misc.rk_deflect ?? 0) + Number(bt.deflection ?? 0)
  const rk_misc2    = Number(misc.rk_misc    ?? 0)
  const rk_buff_ac  = Number(bt.ac ?? 0)

  const saves_all = Number(bt.saves_all ?? 0)

  const initFeat = hasImprovedInitiative(char.feats) ? 4 : 0
  const storedInitMisc = Number(misc.init_misc ?? 0)
  // Older characters stored the feat bonus in the hidden misc field.
  const initMisc = initFeat === 4 && storedInitMisc === 4 ? 0 : storedInitMisc

  const rk       = 10 + rk_armor + rk_shield + GEmodCapped + sizeModRK + rk_natural + rk_deflect + rk_misc2 + rk_buff_ac + cond.rk
  const rk_touch = 10 + GEmodCapped + sizeModRK + rk_deflect + rk_misc2 + rk_buff_ac + cond.rk
  const rk_flat  = 10 + rk_armor + rk_shield + sizeModRK + rk_natural + rk_deflect + rk_misc2

  const fort_total = fort + KOmod + Number(misc.fort_misc ?? 0) + cond.fort + saves_all + Number(bt.fort ?? 0)
  const ref_total  = ref  + effGEmod + Number(misc.ref_misc  ?? 0) + cond.ref_flat + saves_all + Number(bt.ref ?? 0)
  const will_total = will + WEmod  + Number(misc.will_misc ?? 0) + cond.will + saves_all + Number(bt.will ?? 0)

  const init = effGEmod + initMisc + initFeat + cond.init + Number(bt.init ?? 0)

  const gabMelee  = bab + effSTmod + Number(misc.gab_melee_misc  ?? 0) + cond.attack + Number(bt.attack ?? 0)
  const gabRanged = bab + effGEmod + Number(misc.gab_ranged_misc ?? 0) + cond.attack + Number(bt.attack ?? 0)

  // KMB gets the same attack-roll condition mods as GAB (e.g. Ringend/Schütteln -2 gilt
  // auch für Kampfmanöverwürfe). KMV is a defense value: it inherits AC-type dodge mods
  // (cond.rk, e.g. Gehetzt +1/Verlangsamt -1) but NOT the attacker's own attack-roll malus.
  const kmbBase = bab + effSTmod + sizeModKMB + Number(misc.kmb_misc ?? 0)
  const kmb = kmbBase + cond.attack
  const kmv = 10 + kmbBase + effGEmod + cond.rk

  const meleeAttacks  = attackString(gabMelee,  bab)
  const rangedAttacks = attackString(gabRanged, bab)

  return {
    bab, init,
    rk, rk_touch, rk_flat,
    fort: fort_total, ref: ref_total, will: will_total,
    gab_melee: gabMelee, gab_ranged: gabRanged,
    melee_attacks: meleeAttacks, ranged_attacks: rangedAttacks,
    kmb, kmv,
    _components: {
      rk_armor, rk_shield, GEmodCapped, sizeModRK, rk_natural, rk_deflect, rk_misc2,
      init_ability: effGEmod, init_misc: initMisc, init_feat: initFeat,
      init_condition: cond.init, init_buff: Number(bt.init ?? 0),
    },
    _condMods: cond,
  }
}

function attackString(fullBonus, bab) {
  if (bab <= 0) return [fullBonus]
  const attacks = [fullBonus]
  for (let extra = fullBonus - 5; bab >= 6 && extra > fullBonus - 20; extra -= 5) {
    if (bab >= attacks.length * 5 + 1) attacks.push(extra)
    else break
  }
  return attacks
}
