/**
 * Weapon attack/damage engine — 1:1 faithful to Bogen 6.61 Spieler.xlsx
 *
 * Attack bonus = BAB + STmod (melee) or GEmod (ranged) + enhancement + misc
 * Damage      = die + STmod * str_mult (melee) or 0 (ranged unless composite)
 * Two-weapon: main hand = full BAB penalty, off hand = additional -2/-6
 */

/**
 * Compute attack and damage bonuses for one equipped weapon slot.
 * `condMods` (from engine/conditions.js) and `extraAttack` (e.g. buff totals'
 * flat attack bonus) are optional — passing them keeps this in sync with the
 * Kampf-Tab's GAB, which already applies both. Without them, this falls back
 * to raw attribute mods (no condition/buff penalties or bonuses).
 */
export function computeWeaponAttack(slot, attrs, bab, condMods = {}, extraAttack = 0, extraDamage = 0) {
  if (!slot?.weapon_id) return null

  const STmod = Math.max(-5, attrs.ST.mod + (condMods.str_mod_delta ?? 0))
  const GEmod = Math.max(-5, attrs.GE.mod + (condMods.dex_mod_delta ?? 0))

  const isRanged  = slot.is_ranged ?? false
  const isThrWn   = slot.is_thrown ?? false
  const finesse   = slot.finesse   ?? false   // use GE for melee attack
  const strMult   = slot.str_mult  ?? 1       // from weapon def or override
  const enh       = Number(slot.enhancement ?? 0)
  // Masterwork gives +1 to attack only (no damage) — superseded once a true
  // enhancement bonus is present (a +1 weapon is already masterwork by definition).
  const mwAttack  = (slot.mw && enh === 0) ? 1 : 0
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

  const attackBonus = bab + attackMod + enh + mwAttack + misc + (offHand ? -4 : 0) + (condMods.attack ?? 0) + (isRanged ? 0 : (condMods.melee_attack ?? 0)) + extraAttack
  const totalDmgMod = damageMod + enh + dmgMisc + (condMods.damage ?? 0) + extraDamage

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

function signedStr(n) { return !n ? '0' : n > 0 ? `+${n}` : `${n}` }

function iterativeAttacks(first, bab) {
  const attacks = [first]
  for (let n = 1; bab >= n * 5 + 1; n++) attacks.push(first - n * 5)
  return attacks
}

/** ST-Multiplikator für Schaden: Nebenhand ×½, einhändige Waffe zweihändig ×1,5, sonst Waffendaten. */
export function weaponStrMult(def, slot) {
  const base = def?.str_bonus_mult ?? 1
  if (slot.off_hand) return Math.min(base, 0.5)
  if (slot.two_handed && base === 1) return 1.5          // einhändige Waffe zweihändig geführt: ST ×1,5
  return base
}

/**
 * Waffen-Kategorie aus den Excel-Kürzeln. Beim Einlesen liegen Schadensart und Kategorie verteilt
 * auf `damage_type` und `proficiency` (z. B. Dolch: „S EL" + „H") → beide zusammen lesen:
 * Kategorie-Token [E|K|X][L|E|Z|F] = einfach/Kriegs-/exotisch · leicht/einhändig/zweihändig/Fernkampf.
 */
const CAT = { E: ['Einfache Waffe', 'Simple'], K: ['Kriegswaffe', 'Martial'], X: ['Exotische Waffe', 'Exotic'] }
const HAND = { L: ['leicht', 'light'], E: ['einhändig', 'one-handed'], Z: ['zweihändig', 'two-handed'], F: ['Fernkampf', 'ranged'] }
const DMG = { H: ['Hieb', 'slashing'], S: ['Stich', 'piercing'], W: ['Wucht', 'bludgeoning'] }
export function weaponCategory(def, lang = 'de') {
  const i = lang === 'de' ? 0 : 1
  const tokens = `${def?.damage_type ?? ''} ${def?.proficiency ?? ''}`.split(/\s+/).filter(Boolean)
  const cat = tokens.find(t => /^[EKX][LEZF]$/.test(t))
  const dmg = [...new Set(tokens.filter(t => t !== cat).join('').replace(/[^HSW]/g, '').split(''))]
  return {
    category: cat ? `${CAT[cat[0]][i]} · ${HAND[cat[1]][i]}` : null,
    damage: dmg.length ? dmg.map(d => DMG[d][i]).join('/') : null,
  }
}
