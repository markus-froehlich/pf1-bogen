/**
 * Bedingte Boni: gelten nur in bestimmten Fällen (z. B. „+4 gegen Verzauberung") und zählen deshalb
 * NICHT in den angezeigten Wert. Die App zeigt sie als eigene Kachel neben dem Wert an.
 *
 *  - eigene Einträge: char.cond_bonuses = [{ id, target, value, text }]
 *  - automatische Einträge aus den Regeln (autoCondBonuses), jede Regel mit GRW-Beleg
 *
 * target: fort | ref | will | saves (alle RW) | rk | init | attack | kmb | kmv | skill:<fertigkeit-id>
 */
export const COND_TARGETS = {
  fort: ['Zäh', 'Fort'], ref: ['Ref', 'Ref'], will: ['Wil', 'Will'], saves: ['RW', 'Saves'],
  rk: ['RK', 'AC'], init: ['Init', 'Init'], attack: ['Angriff', 'Attack'], kmb: ['KMB', 'CMB'], kmv: ['KMV', 'CMD'],
}
export const targetLabel = (target, L) => (COND_TARGETS[target]?.[L ? 0 : 1] ?? target)

/** Aufschlüsselungs-Schlüssel (Kampf-Tab) → Ziel der bedingten Boni */
export function targetForBd(key) {
  if (['fort', 'ref', 'will', 'init', 'kmb', 'kmv'].includes(key)) return key
  if (['rk', 'touch', 'flat'].includes(key)) return 'rk'
  if (key?.startsWith('w:') || key?.startsWith('nat:')) return 'attack'
  return null
}
/** Gilt der Eintrag für dieses Ziel? „saves" gilt für alle drei Rettungswürfe. */
export const appliesTo = (entry, target) => entry.target === target || (entry.target === 'saves' && ['fort', 'ref', 'will'].includes(target))

const classLevel = (char, id) => (char.meta?.classes ?? []).filter(c => c.id === id).reduce((a, c) => a + Number(c.level || 0), 0)

/** Bedingte Boni aus den Regeln (GRW, jeweils geprüft). */
export function autoCondBonuses({ char, companionRules, lang = 'de' }) {
  const L = lang === 'de'
  const out = []
  // GRW Tab. 3-6 „Hingabe" ab Gefährtenstufe 6
  if (companionRules?.level >= 6) {
    out.push({ id: 'auto:hingabe', auto: true, target: 'will', value: 4, text: L ? 'gg. Verzauberung' : 'vs. enchantment',
      info: L ? 'Hingabe (GRW Tab. 3-6): +4 Moralbonus auf Willenswürfe gegen Verzauberungen und Verzauberungseffekte.' : 'Devotion: +4 morale bonus on Will saves vs. enchantments.' })
  }
  if (!companionRules) {
    // GRW Druide „Lockruf der Natur widerstehen" ab Stufe 4
    if (classLevel(char, 'druide') >= 4) {
      out.push({ id: 'auto:lockruf', auto: true, target: 'saves', value: 4, text: L ? 'gg. Feen/Pflanzen' : 'vs. fey/plants',
        info: L ? 'Lockruf der Natur widerstehen (GRW, Druide ab Stufe 4): +4 auf Rettungswürfe gegen zauberähnliche und übernatürliche Fähigkeiten von Feenwesen und gegen Zauber, die Pflanzen betreffen.' : "Resist nature's lure: +4 vs. fey abilities and plant spells." })
    }
  }
  return out
}

export function allCondBonuses(ctx) {
  return [...autoCondBonuses(ctx), ...(ctx.char.cond_bonuses ?? []).filter(e => e && e.target && e.text)]
}
