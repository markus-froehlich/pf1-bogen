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
import { getConditionMods } from './conditions.js'

const ARMOR_MAP   = Object.fromEntries(armorData.armor.map(a => [a.id, a]))
const SHIELDS_MAP = Object.fromEntries(shieldsData.shields.map(s => [s.id, s]))

export { ARMOR_MAP, SHIELDS_MAP }

export function registerHomebrewArmor(items)   { for (const a of (items ?? [])) ARMOR_MAP[a.id]   = a }
export function registerHomebrewShields(items) { for (const s of (items ?? [])) SHIELDS_MAP[s.id] = s }

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

  // Resolve armor from gear selection; fall back to manual misc for backward compat
  const armorDef  = ARMOR_MAP[gear.armor_id]
  const shieldDef = SHIELDS_MAP[gear.shield_id]

  const rk_armor   = armorDef
    ? armorDef.bonus + Number(gear.armor_enh ?? 0)
    : Number(misc.rk_armor ?? 0)
  const rk_shield  = shieldDef
    ? shieldDef.bonus + Number(gear.shield_enh ?? 0)
    : Number(misc.rk_shield ?? 0)

  // MaxDex: armor's cap wins if lower than manual misc
  const armorMaxDex = armorDef?.max_dex ?? 99
  const maxDex = Math.min(
    armorMaxDex,
    misc.max_dex != null ? Number(misc.max_dex) : 99
  )
  // If condition removes DEX to AC: cap positive DEX at 0 (negative still applies)
  const GEmodForAC = cond.no_dex_to_ac ? Math.min(0, effGEmod) : effGEmod
  const GEmodCapped = Math.min(GEmodForAC, maxDex)

  const rk_natural  = Number(misc.rk_natural ?? 0) + Number(bt.nat_armor ?? 0)
  const rk_deflect  = Number(misc.rk_deflect ?? 0) + Number(bt.deflection ?? 0)
  const rk_misc2    = Number(misc.rk_misc    ?? 0)
  const rk_buff_ac  = Number(bt.ac ?? 0)

  const saves_all = Number(bt.saves_all ?? 0)

  const rk       = 10 + rk_armor + rk_shield + GEmodCapped + sizeModRK + rk_natural + rk_deflect + rk_misc2 + rk_buff_ac + cond.rk
  const rk_touch = 10 + GEmodCapped + sizeModRK + rk_deflect + rk_misc2 + rk_buff_ac + cond.rk
  const rk_flat  = 10 + rk_armor + rk_shield + sizeModRK + rk_natural + rk_deflect + rk_misc2

  const fort_total = fort + KOmod + Number(misc.fort_misc ?? 0) + cond.fort + saves_all + Number(bt.fort ?? 0)
  const ref_total  = ref  + effGEmod + Number(misc.ref_misc  ?? 0) + cond.ref_flat + saves_all + Number(bt.ref ?? 0)
  const will_total = will + WEmod  + Number(misc.will_misc ?? 0) + cond.will + saves_all + Number(bt.will ?? 0)

  const init = effGEmod + Number(misc.init_misc ?? 0) + cond.init + Number(bt.init ?? 0)

  const gabMelee  = bab + effSTmod + Number(misc.gab_melee_misc  ?? 0) + cond.attack + Number(bt.attack ?? 0)
  const gabRanged = bab + effGEmod + Number(misc.gab_ranged_misc ?? 0) + cond.attack + Number(bt.attack ?? 0)

  const kmb = bab + effSTmod + sizeModKMB + Number(misc.kmb_misc ?? 0)
  const kmv = 10 + kmb + effGEmod

  const meleeAttacks  = attackString(gabMelee,  bab)
  const rangedAttacks = attackString(gabRanged, bab)

  return {
    bab, init,
    rk, rk_touch, rk_flat,
    fort: fort_total, ref: ref_total, will: will_total,
    gab_melee: gabMelee, gab_ranged: gabRanged,
    melee_attacks: meleeAttacks, ranged_attacks: rangedAttacks,
    kmb, kmv,
    _components: { rk_armor, rk_shield, GEmodCapped, sizeModRK, rk_natural, rk_deflect, rk_misc2 },
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
