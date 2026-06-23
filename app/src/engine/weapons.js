/**
 * Weapon attack/damage engine — 1:1 faithful to Bogen 6.61 Spieler.xlsx
 *
 * Attack bonus = BAB + STmod (melee) or GEmod (ranged) + enhancement + misc
 * Damage      = die + STmod * str_mult (melee) or 0 (ranged unless composite)
 * Two-weapon: main hand = full BAB penalty, off hand = additional -2/-6
 */

/** Compute attack and damage bonuses for one equipped weapon slot */
export function computeWeaponAttack(slot, attrs, bab) {
  if (!slot?.weapon_id) return null

  const STmod = attrs.ST.mod
  const GEmod = attrs.GE.mod

  const isRanged  = slot.is_ranged ?? false
  const isThrWn   = slot.is_thrown ?? false
  const finesse   = slot.finesse   ?? false   // use GE for melee attack
  const strMult   = slot.str_mult  ?? 1       // from weapon def or override
  const enh       = Number(slot.enhancement ?? 0)
  const misc      = Number(slot.misc_attack  ?? 0)
  const dmgMisc   = Number(slot.misc_damage  ?? 0)
  const offHand   = slot.off_hand  ?? false

  // Attack ability
  const attackMod = (isRanged && !isThrWn) ? GEmod
                  : finesse                 ? Math.max(STmod, GEmod)
                  : STmod

  // Damage ability (ranged = 0 unless composite bow uses strength)
  const damageMod = isRanged ? (slot.composite_str ?? 0)
                  : Math.floor(STmod * strMult)

  const attackBonus = bab + attackMod + enh + misc + (offHand ? -4 : 0)
  const totalDmgMod = damageMod + enh + dmgMisc

  return {
    attack_bonus: attackBonus,
    damage_mod:   totalDmgMod,
    attack_mod:   attackMod,
    damage_mod_str: damageMod,
    enh,
    attack_str:      signedStr(attackBonus),
    full_attack_str: iterativeAttacks(attackBonus, bab).map(signedStr).join('/'),
    damage_str:      signedStr(totalDmgMod),
  }
}

function signedStr(n) { return n >= 0 ? `+${n}` : `${n}` }

function iterativeAttacks(first, bab) {
  const attacks = [first]
  for (let n = 1; bab >= n * 5 + 1; n++) attacks.push(first - n * 5)
  return attacks
}
