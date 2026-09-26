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
import { buffContributions } from './buffs.js'
import { carryThresholds } from './attributes.js'
import { carriedWeight, carryTier, LOAD_EFFECTS, loadRulesOn } from './carry.js'

// GRW (KMV): Ablenkungs-, Ausweich-, Glücks-, Heilige, Moral-, Situations-, Unheilige und
// Verständnis-Boni auf die RK zählen auch auf die KMV.
const KMV_AC_TYPES = new Set(['ablenkung', 'ausweichen', 'glueck', 'heilig', 'unheilig', 'moral', 'situation', 'verstaendnis'])

const ARMOR_MAP   = Object.fromEntries(armorData.armor.map(a => [a.id, a]))
const SHIELDS_MAP = Object.fromEntries(shieldsData.shields.map(s => [s.id, s]))
const RINGS_MAP    = Object.fromEntries(ringsData.rings.map(r => [r.id, r]))

export { ARMOR_MAP, SHIELDS_MAP, RINGS_MAP }

export function registerHomebrewArmor(items)   { for (const a of (items ?? [])) ARMOR_MAP[a.id]   = a }
export function registerHomebrewShields(items) { for (const s of (items ?? [])) SHIELDS_MAP[s.id] = s }

const KIND_OF_TYPE = { Leicht: 'leicht', Mittel: 'mittel', Schwer: 'schwer' }

/**
 * Ein Ausrüstungseintrag → aufgelöste Werte. Bestand {id, enh, mw} verweist auf die Rüstungs-/
 * Schild-/Ringdaten; eigene Felder (README „Ausrüstung") überschreiben bzw. ersetzen sie:
 * kind (Rüstung|Schild|Ring|Umhang|Sonstiges), name, ac, maxGE, cat (leicht|mittel|schwer),
 * acp, asf (Anteil 0–1), defl, res, note.
 */
export function resolveGearItem(item) {
  if (!item) return null
  const armor = ARMOR_MAP[item.id], shield = SHIELDS_MAP[item.id], ring = RINGS_MAP[item.id]
  const def = armor ?? shield ?? ring ?? null
  const kind = item.kind ?? (armor ? 'Rüstung' : shield ? 'Schild' : ring ? 'Ring' : null)
  if (!kind) return null
  const num = (v, fallback) => (v === '' || v == null ? fallback : Number(v))
  const enh = Number(item.enh ?? 0)
  const mw = !!item.mw
  const baseAcp = num(item.acp, def?.check_penalty ?? 0)
  return {
    kind, def, id: item.id ?? null,
    name: item.name || def?.name?.de || kind,
    ac: kind === 'Rüstung' || kind === 'Schild' ? num(item.ac, def?.bonus ?? 0) : 0,
    enh: kind === 'Rüstung' || kind === 'Schild' ? enh : 0,
    mw,
    maxGE: kind === 'Rüstung' || (kind === 'Schild' && (item.maxGE != null || def?.max_dex != null)) ? num(item.maxGE, def?.max_dex ?? null) : null,
    cat: item.cat ?? KIND_OF_TYPE[def?.type] ?? null,
    // Meisterarbeit oder Verzauberung (magisch = immer Meisterarbeit): Rüstungsmalus −1 weniger
    acp: baseAcp < 0 && (mw || enh > 0) ? Math.min(0, baseAcp + 1) : baseAcp,
    asf: num(item.asf, def?.spell_failure ?? 0),
    defl: kind === 'Ring' ? num(item.defl, ring?.bonus ?? 0) : 0,
    res: kind === 'Umhang' ? num(item.res, 0) : 0,
    note: item.note ?? '',
  }
}

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
  const gearItems = (gear.items ?? []).map(resolveGearItem).filter(Boolean)
  let rk_armor = 0, rk_shield = 0, rk_ring = 0, gearResist = 0
  let armorMaxDex = 99, gearCheckPenalty = 0, gearSpellFailure = 0
  for (const g of gearItems) {
    if (g.kind === 'Rüstung') { rk_armor += g.ac + g.enh; if (g.maxGE != null) armorMaxDex = Math.min(armorMaxDex, g.maxGE) }
    else if (g.kind === 'Schild') { rk_shield += g.ac + g.enh; if (g.maxGE != null) armorMaxDex = Math.min(armorMaxDex, g.maxGE) }  // Turmschild: Max. GE +2
    else if (g.kind === 'Ring') rk_ring = Math.max(rk_ring, g.defl)          // Ablenkungsboni stapeln nicht
    else if (g.kind === 'Umhang') gearResist = Math.max(gearResist, g.res)   // Widerstandsboni stapeln nicht
    if (g.acp < 0) gearCheckPenalty += g.acp
    if (g.asf > 0) gearSpellFailure += g.asf
  }
  // Traglast (GRW Tab. 7-5): mittlere/schwere Last wie Rüstung — der schlechtere Wert zählt, nicht kumulativ
  const loadTier = loadRulesOn(char.inventory) ? carryTier(carriedWeight(char.inventory).total, carryThresholds(attrs.ST.buffed)) : 'light'
  const load = LOAD_EFFECTS[loadTier] ?? null
  const loadMaxDex = load ? load.maxDex : 99
  const loadCheckPenalty = load && load.acp < gearCheckPenalty ? load.acp - gearCheckPenalty : 0   // nur der Anteil über den Rüstungsmalus hinaus
  gearCheckPenalty += loadCheckPenalty
  // MaxDex: worn armor's (or load's) cap wins if lower than manual misc
  const maxDex = Math.min(
    armorMaxDex, loadMaxDex,
    misc.max_dex != null ? Number(misc.max_dex) : 99
  )
  // If condition removes DEX to AC: cap positive DEX at 0 (negative still applies)
  const GEmodForAC = cond.no_dex_to_ac ? Math.min(0, effGEmod) : effGEmod
  const GEmodCapped = Math.min(GEmodForAC, maxDex)

  const rk_natural  = Number(misc.rk_natural ?? 0) + Number(bt.nat_armor ?? 0)
  // RK-Buffs nach Bonus-Typ: Ablenkung → Ablenkung, Ausweichen → Ausweichen, Rest → RK
  const acContribs  = (buffContributions(char.active_buffs ?? []).ac ?? []).filter(x => x.counted)
  const acOfType    = pred => acContribs.filter(x => pred(x.type)).reduce((a, x) => a + x.value, 0)
  const acDeflect   = acOfType(t => t === 'ablenkung')
  const acDodge     = acOfType(t => t === 'ausweichen')
  const rk_buff_ac  = acOfType(t => t !== 'ablenkung' && t !== 'ausweichen')
  const acKmv       = acOfType(t => KMV_AC_TYPES.has(t) && t !== 'ablenkung' && t !== 'ausweichen')
  // Ablenkung: Ring, Buff und manuelles Feld sind derselbe Bonus-Typ → nur der höchste zählt (GRW)
  const deflSources = [
    { src: 'ring', value: rk_ring },
    { src: 'buff', value: Number(bt.deflection ?? 0) + acDeflect },
    { src: 'manual', value: Number(misc.rk_deflect ?? 0) },
  ].filter(x => x.value)
  const rk_deflect  = deflSources.reduce((m, x) => Math.max(m, x.value), 0)
  const deflCounted = deflSources.find(x => x.value === rk_deflect)?.src ?? null
  const rk_misc2    = Number(misc.rk_misc    ?? 0)
  // Ausweichen: zählt auf RK + Berührung, entfällt auf dem falschen Fuß und ohne GE-Bonus
  const dodgeRaw    = Number(bt.dodge ?? 0) + acDodge
  const rk_dodge    = cond.no_dex_to_ac ? 0 : dodgeRaw

  const saves_all = Number(bt.saves_all ?? 0) + gearResist

  const initFeat = hasImprovedInitiative(char.feats) ? 4 : 0
  const storedInitMisc = Number(misc.init_misc ?? 0)
  // Older characters stored the feat bonus in the hidden misc field.
  const initMisc = initFeat === 4 && storedInitMisc === 4 ? 0 : storedInitMisc

  const rk       = 10 + rk_armor + rk_shield + GEmodCapped + sizeModRK + rk_natural + rk_deflect + rk_misc2 + rk_buff_ac + rk_dodge + cond.rk
  const rk_touch = 10 + GEmodCapped + sizeModRK + rk_deflect + rk_misc2 + rk_buff_ac + rk_dodge + cond.rk
  const rk_flat  = 10 + rk_armor + rk_shield + sizeModRK + rk_natural + rk_deflect + rk_misc2 + rk_buff_ac

  const fort_total = fort + KOmod + Number(misc.fort_misc ?? 0) + cond.fort + saves_all + Number(bt.fort ?? 0)
  const ref_total  = ref  + effGEmod + Number(misc.ref_misc  ?? 0) + cond.ref_flat + saves_all + Number(bt.ref ?? 0)
  const will_total = will + WEmod  + Number(misc.will_misc ?? 0) + cond.will + saves_all + Number(bt.will ?? 0)

  const init = effGEmod + initMisc + initFeat + cond.init + Number(bt.init ?? 0)

  const gabMelee  = bab + effSTmod + Number(misc.gab_melee_misc  ?? 0) + cond.attack + cond.melee_attack + Number(bt.attack ?? 0)
  const gabRanged = bab + effGEmod + Number(misc.gab_ranged_misc ?? 0) + cond.attack + Number(bt.attack ?? 0)

  // KMB gets the same attack-roll condition mods as GAB (e.g. Ringend/Schütteln -2 gilt
  // auch für Kampfmanöverwürfe). KMV is a defense value: it inherits AC-type dodge mods
  // (cond.rk, e.g. Gehetzt +1/Verlangsamt -1) but NOT the attacker's own attack-roll malus.
  const kmbBase = bab + effSTmod + sizeModKMB + Number(misc.kmb_misc ?? 0)
  // GRW: beim Kampfmanöver zählen alle Boni aus Zaubern/Talenten/Effekten auf Angriffswürfe
  const kmb = kmbBase + cond.attack + cond.melee_attack + Number(bt.attack ?? 0)
  const kmv = 10 + kmbBase + effGEmod + cond.rk + Number(misc.kmv_misc ?? 0) + rk_deflect + rk_dodge + acKmv

  const meleeAttacks  = attackString(gabMelee,  bab)
  const rangedAttacks = attackString(gabRanged, bab)

  return {
    bab, init,
    rk, rk_touch, rk_flat,
    fort: fort_total, ref: ref_total, will: will_total,
    gab_melee: gabMelee, gab_ranged: gabRanged,
    melee_attacks: meleeAttacks, ranged_attacks: rangedAttacks,
    kmb, kmv,
    gear_check_penalty: gearCheckPenalty,
    gear_spell_failure: gearSpellFailure,
    _components: {
      rk_armor, rk_shield, GEmodCapped, sizeModRK, rk_natural, rk_deflect, rk_misc2,
      rk_ring, rk_buff_ac, rk_dodge, dodgeRaw, acKmv, deflSources, deflCounted, loadTier, loadMaxDex, loadCheckPenalty,
      kmb_buff: Number(bt.attack ?? 0), armorMaxDex, maxDex, effGEmod, effSTmod, sizeModKMB, gearResist,
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
