/**
 * Condition modifiers for PF1e standard conditions.
 * Returns flat modifier object applied on top of base combat/skill calculations,
 * plus `sources`: for each modifier key, the list of condition ids that
 * contributed to it (used by the UI to show *which* condition is responsible,
 * not just the number).
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
    // Weapon damage modifier
    damage: 0,
    // Save modifiers
    fort: 0,
    ref_flat: 0,
    will: 0,
    // Initiative
    init: 0,
    // Skill checks
    skill_penalty: 0,
  }
  const sources = {}

  function bump(key, delta, condId) {
    m[key] += delta
    ;(sources[key] ??= []).push(condId)
  }
  function flag(key, condId) {
    m[key] = true
    ;(sources[key] ??= []).push(condId)
  }

  // Erschöpft (Fatigued): -2 ST & GE → -1 to each mod
  if (c.has('erschoepft')) { bump('dex_mod_delta', -1, 'erschoepft'); bump('str_mod_delta', -1, 'erschoepft') }
  // Entkräftet (Exhausted, id kept as 'ermuedtet' for backward compat): -6 ST & GE → -3 to each mod
  if (c.has('ermuedtet'))  { bump('dex_mod_delta', -3, 'ermuedtet');  bump('str_mod_delta', -3, 'ermuedtet') }

  // Festgehalten (Ringend): -4 GE (= -2 mod), -2 attack
  if (c.has('festgehalten')) { bump('dex_mod_delta', -2, 'festgehalten'); bump('attack', -2, 'festgehalten') }

  // Im Haltegriff (Pinned): like Ringend, plus additionally hilflos (no_dex_to_ac above)
  if (c.has('haltegriff')) { bump('dex_mod_delta', -2, 'haltegriff'); bump('attack', -4, 'haltegriff') }

  // Kauernd (Cowering): -2 AC on top of losing DEX bonus
  if (c.has('kauernd')) bump('rk', -2, 'kauernd')

  // Verstrickt (Entangled): -4 GE (= -2 mod), -2 attack
  if (c.has('verstrickt')) { bump('dex_mod_delta', -2, 'verstrickt'); bump('attack', -2, 'verstrickt') }

  // Conditions that remove positive DEX bonus to AC (flat-footed equivalent)
  for (const id of ['blind', 'betäubt', 'hilflos', 'gelähmt', 'bewusstlos', 'benommen',
                     'flachfuss', 'haltegriff', 'kauernd', 'versteinert']) {
    if (c.has(id)) flag('no_dex_to_ac', id)
  }

  // Blind: additionally -2 to AC
  if (c.has('blind')) bump('rk', -2, 'blind')

  // Betäubt: -2 AC (on top of losing DEX)
  if (c.has('betäubt')) bump('rk', -2, 'betäubt')

  // Gelähmt: STR & DEX effectively 0 (use 0 mod)
  if (c.has('gelähmt')) {
    bump('dex_mod_delta', -999, 'gelähmt')  // will be clamped in combat
    bump('str_mod_delta', -999, 'gelähmt')
  }

  // Schütteln: -2 attack/saves/skills
  if (c.has('schütteln')) {
    bump('attack', -2, 'schütteln'); bump('fort', -2, 'schütteln')
    bump('ref_flat', -2, 'schütteln'); bump('will', -2, 'schütteln'); bump('skill_penalty', -2, 'schütteln')
  }

  // Kränkelnd (Sickened): -2 attack/weapon damage/saves/skills
  if (c.has('krank')) {
    bump('attack', -2, 'krank'); bump('damage', -2, 'krank'); bump('fort', -2, 'krank')
    bump('ref_flat', -2, 'krank'); bump('will', -2, 'krank'); bump('skill_penalty', -2, 'krank')
  }

  // Verängstigt: -2 attack/saves/skills (+ forced flee, handled in UI)
  if (c.has('verängstigt')) {
    bump('attack', -2, 'verängstigt'); bump('fort', -2, 'verängstigt')
    bump('ref_flat', -2, 'verängstigt'); bump('will', -2, 'verängstigt'); bump('skill_penalty', -2, 'verängstigt')
  }

  // Panisch: -2 attack/saves
  if (c.has('panisch')) {
    bump('attack', -2, 'panisch'); bump('fort', -2, 'panisch')
    bump('ref_flat', -2, 'panisch'); bump('will', -2, 'panisch')
  }

  // Niedergestreckt: -4 to melee attacks (applied to general attack for simplicity)
  if (c.has('niedergestreckt')) bump('attack', -4, 'niedergestreckt')

  // Taub: -4 Initiative (20% arcane spell failure handled in UI)
  if (c.has('taub')) bump('init', -4, 'taub')

  // Verlangsamt: -1 attack/AC/Reflex
  if (c.has('verlangsamt')) { bump('attack', -1, 'verlangsamt'); bump('rk', -1, 'verlangsamt'); bump('ref_flat', -1, 'verlangsamt') }

  // Gehetzt (Hasted): +1 attack/AC/Reflex
  if (c.has('gehast')) { bump('attack', 1, 'gehast'); bump('rk', 1, 'gehast'); bump('ref_flat', 1, 'gehast') }

  // Gesegnet: +1 attack + all saves
  if (c.has('gesegnet')) { bump('attack', 1, 'gesegnet'); bump('fort', 1, 'gesegnet'); bump('ref_flat', 1, 'gesegnet'); bump('will', 1, 'gesegnet') }

  // Unsichtbar: +2 attack
  if (c.has('unsichtbar')) bump('attack', 2, 'unsichtbar')

  m.sources = sources
  return m
}
