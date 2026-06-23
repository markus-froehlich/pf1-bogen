/**
 * Condition modifiers for PF1e standard conditions.
 * Returns flat modifier object applied on top of base combat/skill calculations.
 */
export function getConditionMods(conditions) {
  const c = new Set(conditions ?? [])
  const m = {
    // AC modifiers
    rk: 0,
    no_dex_to_ac: false,   // blind/stunned/paralyzed: positive DEX bonus becomes 0
    dex_mod_delta: 0,       // actual DEX mod change (erschöpft/ermüdet/festgehalten)
    str_mod_delta: 0,       // actual STR mod change (erschöpft/ermüdet)
    // Attack modifier (melee + ranged)
    attack: 0,
    // Save modifiers
    fort: 0,
    ref_flat: 0,
    will: 0,
    // Initiative
    init: 0,
    // Skill checks
    skill_penalty: 0,
  }

  // Erschöpft: -6 ST & GE → -3 to each mod
  if (c.has('erschoepft')) { m.dex_mod_delta -= 3; m.str_mod_delta -= 3 }
  // Ermüdet: -2 ST & GE → -1 to each mod
  if (c.has('ermuedtet'))  { m.dex_mod_delta -= 1; m.str_mod_delta -= 1 }

  // Festgehalten: -4 GE (= -2 mod), -2 attack
  if (c.has('festgehalten')) { m.dex_mod_delta -= 2; m.attack -= 2 }

  // Conditions that remove positive DEX bonus to AC (flat-footed equivalent)
  if (c.has('blind') || c.has('betäubt') || c.has('hilflos') ||
      c.has('gelähmt') || c.has('bewusstlos') || c.has('benommen')) {
    m.no_dex_to_ac = true
  }

  // Blind: additionally -2 to AC
  if (c.has('blind')) m.rk -= 2

  // Betäubt: -2 AC (on top of losing DEX)
  if (c.has('betäubt')) m.rk -= 2

  // Gelähmt: STR & DEX effectively 0 (use 0 mod)
  if (c.has('gelähmt')) {
    m.dex_mod_delta = -999  // will be clamped in combat
    m.str_mod_delta = -999
  }

  // Schütteln: -2 attack/saves/skills
  if (c.has('schütteln')) {
    m.attack -= 2; m.fort -= 2; m.ref_flat -= 2; m.will -= 2; m.skill_penalty -= 2
  }

  // Krank: -2 attack/saves/skills
  if (c.has('krank')) {
    m.attack -= 2; m.fort -= 2; m.ref_flat -= 2; m.will -= 2; m.skill_penalty -= 2
  }

  // Verängstigt: -2 attack/saves/skills (+ forced flee, handled in UI)
  if (c.has('verängstigt')) {
    m.attack -= 2; m.fort -= 2; m.ref_flat -= 2; m.will -= 2; m.skill_penalty -= 2
  }

  // Panisch: -2 attack/saves
  if (c.has('panisch')) {
    m.attack -= 2; m.fort -= 2; m.ref_flat -= 2; m.will -= 2
  }

  // Niedergestreckt: -4 to melee attacks (applied to general attack for simplicity)
  if (c.has('niedergestreckt')) m.attack -= 4

  // Taub: -4 Initiative (20% arcane spell failure handled in UI)
  if (c.has('taub')) m.init -= 4

  // Verlangsamt: -1 attack/AC/Reflex
  if (c.has('verlangsamt')) { m.attack -= 1; m.rk -= 1; m.ref_flat -= 1 }

  // Gehetzt (Hasted): +1 attack/AC/Reflex
  if (c.has('gehast')) { m.attack += 1; m.rk += 1; m.ref_flat += 1 }

  // Gesegnet: +1 attack + all saves
  if (c.has('gesegnet')) { m.attack += 1; m.fort += 1; m.ref_flat += 1; m.will += 1 }

  // Unsichtbar: +2 attack
  if (c.has('unsichtbar')) m.attack += 2

  return m
}
