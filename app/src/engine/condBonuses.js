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

/** Bedingte Boni aus den Regeln (GRW Kap. 2 Völker, Kap. 3 Klassen, Tab. 3-6; Texte geprüft 2026-10-11).
 *  Nicht automatisch: Blutlinien-Boni (Blutlinie nicht gespeichert), Erzfeind/bevorzugtes Gelände des
 *  Waldläufers (gewählte Werte) – dafür eigene Einträge in der Aufschlüsselung. */
export function autoCondBonuses({ char, companionRules, lang = 'de' }) {
  const L = lang === 'de'
  const out = []
  // GRW Tab. 3-6 „Hingabe" ab Gefährtenstufe 6
  if (companionRules?.level >= 6) {
    out.push({ id: 'auto:hingabe', auto: true, target: 'will', value: 4, text: L ? 'gg. Verzauberung' : 'vs. enchantment',
      info: L ? 'Hingabe (GRW Tab. 3-6): +4 Moralbonus auf Willenswürfe gegen Verzauberungen und Verzauberungseffekte.' : 'Devotion: +4 morale bonus on Will saves vs. enchantments.' })
  }
  if (!companionRules) {
    const add = (id, target, value, de, en, info) => out.push({ id: `auto:${id}`, auto: true, target, value, text: L ? de : en, info })
    // ── Völker (GRW Kap. 2, Volksmerkmale) ──
    const race = char.meta?.race
    if (race === 'zwerg') {
      add('zwerg-abgehaertet', 'saves', 2, 'gg. Gift, Zauber, zauberähnl. Fähigkeiten', 'vs. poison, spells, SLAs', L ? 'Abgehärtet (Zwerg): Volksbonus +2 auf Rettungswürfe gegen Gifte, Zauber und zauberähnliche Fähigkeiten.' : 'Hardy (dwarf)')
      add('zwerg-verteidigung', 'rk', 4, 'gg. Riesen (Ausweichen)', 'vs. giants (dodge)', L ? 'Verteidigungsschulung (Zwerg): Ausweichbonus +4 auf die RK gegen Angriffe von Riesen.' : 'Defensive training (dwarf)')
      add('zwerg-standfest', 'kmv', 4, 'gg. Ansturm/Zu Fall bringen', 'vs. bull rush/trip', L ? 'Standfestigkeit (Zwerg): Volksbonus +4 auf die KMV gegen Ansturm oder Zu-Fall-bringen, solange er auf festem Untergrund steht.' : 'Stability (dwarf)')
      add('zwerg-hass', 'attack', 1, 'gg. Orks/Goblinoide', 'vs. orcs/goblinoids', L ? 'Hass (Zwerg): +1 auf Angriffswürfe gegen Humanoide der Unterart Ork oder Goblinoider.' : 'Hatred (dwarf)')
      add('zwerg-steingespuer', 'skill:wahrnehmung', 2, 'ungewöhnliches Mauerwerk', 'unusual stonework', L ? 'Steingespür (Zwerg): +2 auf Wahrnehmung, um ungewöhnliches Stein- oder Mauerwerk zu bemerken (Fallen, Geheimtüren in Stein).' : 'Stonecunning (dwarf)')
      add('zwerg-gier', 'skill:schatzen', 2, 'Metall/Edelsteine', 'metals/gems', L ? 'Gier (Zwerg): Volksbonus +2 auf Schätzen bei nicht-magischen Gütern mit wertvollen Metallen oder Edelsteinen.' : 'Greed (dwarf)')
    }
    if (race === 'elf' || race === 'halb_elf') {
      add('elf-verzauberung', 'saves', 2, 'gg. Verzauberung', 'vs. enchantment', L ? 'Immunität (Elf/Halb-Elf): immun gegen magische Schlaf-Effekte und Volksbonus +2 auf Rettungswürfe gegen Zauber und magische Effekte der Schule Verzauberung.' : 'Immunities (elf/half-elf)')
    }
    if (race === 'gnom') {
      add('gnom-illusion', 'saves', 2, 'gg. Illusionen', 'vs. illusions', L ? 'Illusionsresistent (Gnom): Volksbonus +2 auf Rettungswürfe gegen Illusionseffekte.' : 'Illusion resistance (gnome)')
      add('gnom-verteidigung', 'rk', 4, 'gg. Riesen (Ausweichen)', 'vs. giants (dodge)', L ? 'Verteidigungsschulung (Gnom): Ausweichbonus +4 auf die RK gegen Angriffe von Riesen.' : 'Defensive training (gnome)')
      add('gnom-hass', 'attack', 1, 'gg. reptilische/goblinoide Humanoide', 'vs. reptilian/goblinoid humanoids', L ? 'Hass (Gnom): +1 auf Angriffswürfe gegen Humanoide der Unterarten Reptilisch oder Goblinoider.' : 'Hatred (gnome)')
    }
    if (race === 'halbling') {
      add('halbling-furchtlos', 'saves', 2, 'gg. Furcht', 'vs. fear', L ? 'Furchtlos (Halbling): Volksbonus +2 auf alle Rettungswürfe gegen Furcht (addiert sich mit Halblingsglück).' : 'Fearless (halfling)')
    }
    // ── Klassen (GRW Kap. 3) ──
    const trap = ['barbar', 'schurke'].reduce((a, id) => a + (classLevel(char, id) >= 3 ? Math.min(6, Math.floor(classLevel(char, id) / 3)) : 0), 0)
    if (trap) {
      const info = L ? 'Fallengespür (Barbar/Schurke ab Stufe 3, +1 je 3 Stufen; Boni verschiedener Klassen addieren sich): Bonus auf Reflexwürfe gegen Fallen und auf die RK gegen Angriffe von Fallen.' : 'Trap sense'
      add('fallengespuer-ref', 'ref', trap, 'gg. Fallen', 'vs. traps', info)
      add('fallengespuer-rk', 'rk', trap, 'gg. Fallen', 'vs. traps', info)
    }
    if (classLevel(char, 'barbar') >= 14) add('barbar-wille', 'will', 4, 'gg. Verzauberung (im Kampfrausch)', 'vs. enchantment (raging)', L ? 'Unbeugsamer Wille (Barbar ab Stufe 14): während des Kampfrauschs +4 auf Willenswürfe gegen Verzauberungen.' : 'Indomitable will')
    if (classLevel(char, 'barde') >= 2) add('barde-bewandert', 'saves', 4, 'gg. Bardenauftritt, Schall, sprachabh. Effekte', 'vs. bardic performance, sonic, language', L ? 'Bewandert (Barde ab Stufe 2): +4 auf Rettungswürfe gegen Bardenauftritt, Schallangriffe und sprachabhängige Effekte.' : 'Well-versed')
    if (classLevel(char, 'kaempfer') >= 2) add('kaempfer-tapferkeit', 'will', 1 + Math.floor((classLevel(char, 'kaempfer') - 2) / 4), 'gg. Furcht', 'vs. fear', L ? 'Tapferkeit (Kämpfer ab Stufe 2, +1 alle vier Stufen über der 2.): Bonus auf Willenswürfe gegen Furcht.' : 'Bravery')
    if (classLevel(char, 'moench') >= 3) add('moench-ruhiger-geist', 'saves', 2, 'gg. Verzauberung', 'vs. enchantment', L ? 'Ruhiger Geist (Mönch ab Stufe 3): +2 auf Rettungswürfe gegen Zauber und Effekte der Schule Verzauberung.' : 'Still mind')
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
