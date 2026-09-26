/**
 * Talent-Budget, automatische Talente und Bonustalent-Plätze.
 *
 * Quellen (geprüft 2026-09-26):
 *  - GRW Tabelle 3-1: Talente auf Charakterstufe 1, 3, 5 … 19 → ⌈Stufe/2⌉
 *  - GRW Volk: Mensch „Bonustalent" (frei, St. 1); Halb-Elf „Anpassungsfähig" (Fertigkeitsfokus, St. 1)
 *  - GRW Klassen: Kämpfer Bonustalent 1 + jede gerade Stufe (Kampftalente); Mönch Verbesserter
 *    waffenloser Schlag + Betäubender Schlag (1), Bonustalente 1/2/6/10/14/18 (Liste); Waldläufer
 *    Kampfstil 2/6/10/14/18, Ausdauer (3); Magier Schriftrolle anfertigen (1), Bonustalente 5/10/15/20
 *    (Metamagie/Erschaffung/Zaubermeisterschaft); Hexenmeister Materialkomponentenlos zaubern (1),
 *    Blutlinie 7/13/19; Prestige: Drachenjünger Talent der Blutlinie 2/5/8, Mystischer Ritter 1/5/9.
 *  - GRW Domänen (Klerikerstufe): Dunkelheit → Blind kämpfen, Runen → Schriftrolle anfertigen (1),
 *    Adel → Anführen (8). Magierschule Nekromantie → Untote befehligen oder vertreiben (Wahl).
 *  - Klassen außerhalb des GRW: Excel + deutsches PRD, siehe classFeatsExtra.js.
 *  Alles andere (Schurkentricks, Gegenstände …) über `char.feats_extra` (manuell).
 *
 *  Gespeicherte Talente: char.feats[i].slot = Schlüssel eines Bonus-Platzes (z. B. „hexenmeister:blutlinie");
 *  ohne slot → freier Platz (Stufe/Volk/manuell). Automatische Talente werden über den Namen erkannt
 *  oder – wenn nicht eingetragen – virtuell angezeigt und mitgezählt.
 */
import featsData from '../data/feats.json'
import { chosenDomains } from '../spells/domainSpells.js'
import { EXTRA_CLASS_FEATS, EXTRA_NO_FEATS } from './classFeatsExtra.js'

const at = (levels, lv) => levels.filter(x => x <= lv).length
const range = (from, to, step) => Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step)
const DB = Object.fromEntries(featsData.feats.map(f => [f.id, f]))

/** Name-Vergleich: „Verbesserter Waffenloser Schlag K" ≙ „verbesserter waffenloser schlag", „Materialk.los" ≙ „Materialkomponentenlos". */
export function normFeatName(n) {
  return String(n ?? '').toLowerCase()
    .replace(/materialk(omp)?\.\s*los/g, 'materialkomponentenlos')
    .replace(/\((tal|af)\)/g, '').replace(/\s+[kmt]$/g, '')
    .replace(/[^a-zäöüß]/g, '')
}

/** GRW-Klassen. auto: feste Talente; bonus: Plätze zur Wahl (key eindeutig je Klasse). */
const GRW_CLASS_FEATS = {
  kaempfer: {
    bonus: [{ key: 'bonus', levels: [1, ...range(2, 20, 2)], de: 'Bonustalente (Stufe 1 + jede gerade)', en: 'Bonus feats',
      hint: 'Kampftalente („Bonustalente für Kämpfer“)' }],
  },
  moench: {
    auto: [{ level: 1, id: 'feat_verb_waffenloser_schlag_k' }, { level: 1, id: 'feat_beta_ubender_schlag_k' }],
    bonus: [{ key: 'bonus', levels: [1, 2, 6, 10, 14, 18], de: 'Bonustalente (1/2/6/10/14/18)', en: 'Bonus feats',
      hint: 'Ausweichen, Geschosse abwehren, Improvisierter Fern-/Nahkampf, Kampfreflexe, Skorpionstachel, Verbesserter Ringkampf; ab 6: Gorgonenfaust, Beweglichkeit, Verb. Ansturm, Verb. Entwaffnen, Verb. Finte, Verb. Zu-Fall-bringen; ab 10: Geschosse fangen, Medusenzorn, Tänzelnder Angriff, Verb. Kritischer Treffer (Voraussetzungen entfallen)' }],
  },
  waldlaeufer: {
    auto: [{ level: 3, id: 'feat_ausdauer' }],
    bonus: [{ key: 'kampfstil', levels: [2, 6, 10, 14, 18], de: 'Kampfstiltalente (2/6/10/14/18)', en: 'Combat style feats',
      hint: 'aus dem gewählten Kampfstil (Voraussetzungen entfallen)' }],
  },
  magier: {
    auto: [{ level: 1, id: 'feat_schriftrolle_anfertigen' }],
    bonus: [{ key: 'bonus', levels: [5, 10, 15, 20], de: 'Bonustalente (5/10/15/20)', en: 'Bonus feats',
      hint: 'Metamagie-, Erschaffungstalent oder Zaubermeisterschaft' }],
  },
  hexenmeister: {
    auto: [{ level: 1, id: 'feat_materialk_los_zaubern' }],
    bonus: [{ key: 'blutlinie', levels: [7, 13, 19], de: 'Blutlinientalente (7/13/19)', en: 'Bloodline feats',
      hint: 'aus der Talentliste der Blutlinie (Voraussetzungen erfüllen)' }],
  },
  drachenjuenger: {
    bonus: [{ key: 'blutlinie', levels: [2, 5, 8], de: 'Talent der Blutlinie (2/5/8)', en: 'Bloodline feats',
      hint: 'aus der Talentliste der drakonischen Blutlinie' }],
  },
  mystischer_ritter: {
    bonus: [{ key: 'bonus', levels: [1, 5, 9], de: 'Bonustalente (1/5/9)', en: 'Bonus feats',
      hint: 'Voraussetzungen müssen erfüllt sein' }],
  },
}
const CLASS_FEATS = { ...EXTRA_CLASS_FEATS, ...GRW_CLASS_FEATS }

const RACE_BONUS = {
  mensch: { de: 'Mensch: Bonustalent', en: 'Human bonus feat' },
  human: { de: 'Mensch: Bonustalent', en: 'Human bonus feat' },
}
const RACE_SLOT = {
  halb_elf: { key: 'volk:halb_elf', de: 'Halb-Elf: Anpassungsfähig', en: 'Half-elf: Adaptability', hint: 'Fertigkeitsfokus (beliebige Fertigkeit)' },
}
// GRW-Domänen (Hauptdomäne und ihre Unterdomänen): [Domäne, Talent-ID, ab Klerikerstufe]
const DOMAIN_FEATS = [['Dunkelheit', 'feat_blind_ka_mpfen_k', 1], ['Runen', 'feat_schriftrolle_anfertigen', 1], ['Adel', 'feat_anfu_hren', 8]]

const classLevel = (char, id) => (char.meta?.classes ?? []).filter(c => c.id === id).reduce((a, c) => a + Number(c.level || 0), 0)
function magierSchool(char) {
  const sb = char.spellbook ?? {}
  return sb.class_id === 'magier' ? sb.school : sb.others?.magier?.school
}

/**
 * Vollständige Aufstellung:
 *  auto:  [{ key, id, name, desc, type, source, why }]   feste Talente
 *  slots: [{ key, label, hint, n, classId? }]            Bonus-Plätze zur Wahl (ohne den freien Pool)
 *  lines: Anzeige-Zeilen fürs Budget (inkl. frei/auto), total: Summe aller Talente
 */
export function featPlan(char, totalLevel, lang = 'de') {
  const L = lang === 'de'
  const lines = []
  const auto = []
  const slots = []
  if (!totalLevel) return { total: 0, lines, auto, slots, free: 0 }
  let free = Math.ceil(totalLevel / 2)
  lines.push({ key: 'frei', label: L ? `Stufe ${totalLevel}` : `Level ${totalLevel}`, sub: L ? 'Talente auf Stufe 1, 3, 5 …' : 'Feats at 1, 3, 5 …', n: free })
  const race = RACE_BONUS[char.meta?.race]
  if (race) { lines.push({ key: 'frei', label: L ? race.de : race.en, n: 1 }); free += 1 }
  const rs = RACE_SLOT[char.meta?.race]
  if (rs) { const s = { key: rs.key, label: L ? rs.de : rs.en, hint: rs.hint, n: 1 }; slots.push(s); lines.push(s) }

  const addAuto = (id, why, key) => {
    const f = DB[id]
    if (!f || auto.some(a => a.id === id)) return
    auto.push({ key, id, name: f.name.de, desc: f.desc?.de ?? '', type: f.type, source: f.source ?? '', why })
  }
  const seen = new Set()
  for (const c of (char.meta?.classes ?? []).filter(x => x.id && Number(x.level) > 0)) {
    if (seen.has(c.id)) continue
    seen.add(c.id)
    const lv = classLevel(char, c.id)
    const rules = CLASS_FEATS[c.id]
    if (!rules) continue
    const autoHere = (rules.auto ?? []).filter(a => a.level <= lv)
    for (const a of autoHere) addAuto(a.id, { classId: c.id, level: a.level }, `auto:${c.id}:${a.id}`)
    if (autoHere.length) {
      const names = autoHere.map(a => DB[a.id]?.name.de.replace(/\s+[KM]$/, '')).join(', ')
      lines.push({ key: 'auto', label: `${names} (${[...new Set(autoHere.map(a => `St. ${a.level}`))].join(', ')})`, n: autoHere.length, classId: c.id, auto: true })
    }
    for (const b of rules.bonus ?? []) {
      const n = at(b.levels, lv)
      if (!n) continue
      const s = { key: `${c.id}:${b.key}`, label: L ? b.de : b.en ?? b.de, hint: b.hint, n, classId: c.id }
      slots.push(s); lines.push(s)
    }
  }
  // Domänen (Kleriker/Inquisitor): verliehene Talente
  const domLv = Math.max(classLevel(char, 'kleriker'), classLevel(char, 'inquisitor'))
  if (domLv > 0) {
    for (const d of chosenDomains(char)) {
      const main = d.split('/')[0]
      for (const [dom, id, lv] of DOMAIN_FEATS) {
        if (main === dom && domLv >= lv && !auto.some(a => a.id === id)) {
          addAuto(id, { domain: d, level: lv }, `auto:domain:${id}`)
          lines.push({ key: 'auto', label: `${L ? 'Domäne' : 'Domain'} ${d}: ${DB[id]?.name.de.replace(/\s+[KM]$/, '')}`, n: 1, auto: true })
        }
      }
    }
  }
  // Magierschule Nekromantie: Macht über Untote → eines von beiden als Bonustalent
  if (classLevel(char, 'magier') > 0 && magierSchool(char) === 'Ne') {
    const s = { key: 'magier:nekromantie', label: L ? 'Nekromantie: Macht über Untote' : 'Necromancy: Power over Undead', hint: 'Untote befehligen oder Untote vertreiben', n: 1, classId: 'magier' }
    slots.push(s); lines.push(s)
  }
  const extra = Number(char.feats_extra ?? 0)
  if (extra) { lines.push({ key: 'frei', label: L ? 'Weitere Bonustalente (manuell)' : 'Other bonus feats (manual)', n: extra }); free += extra }
  return { total: lines.reduce((a, l) => a + l.n, 0), lines, auto, slots, free }
}

/** Kompatibel: { total, lines }. */
export function featBudget(char, totalLevel, lang = 'de') {
  const p = featPlan(char, totalLevel, lang)
  return { total: p.total, lines: p.lines }
}

/**
 * Talente den Plätzen zuordnen → { rows, used: {slotKey: n}, freeUsed, autoMissing }
 * rows: gespeicherte Talente (mit .autoOf / .slotOf) + virtuelle automatische (virtual: true)
 */
export function assignFeats(char, plan) {
  const feats = char.feats ?? []
  const slotKeys = new Set(plan.slots.map(s => s.key))
  const used = {}
  let freeUsed = 0
  const autoTaken = new Set()
  const rows = feats.map(f => {
    const a = !f.slot && plan.auto.find(x => !autoTaken.has(x.key) && normFeatName(x.name) === normFeatName(f.name))
    if (a) { autoTaken.add(a.key); return { ...f, autoOf: a } }
    if (f.slot && slotKeys.has(f.slot)) { used[f.slot] = (used[f.slot] ?? 0) + 1; return { ...f, slotOf: plan.slots.find(s => s.key === f.slot) } }
    freeUsed += 1
    return f
  })
  const missing = plan.auto.filter(a => !autoTaken.has(a.key))
  const virtual = missing.map(a => ({ id: `virtual:${a.key}`, name: a.name, type: a.type, desc: a.desc, source: a.source, autoOf: a, virtual: true }))
  return { rows: [...virtual, ...rows], used, freeUsed, total: feats.length + virtual.length }
}

/** Klassen, deren Bonustalente die App nicht kennt → Hinweis auf das manuelle Feld. */
export const hasKnownBonusRules = classId => classId in CLASS_FEATS || NO_CLASS_FEATS.has(classId)
// Klassen ohne Bonustalente laut Quelle (kein Hinweis nötig)
const NO_CLASS_FEATS = new Set(['barbar', 'barde', 'druide', 'kleriker', 'paladin', 'schurke', 'adept', 'adeliger', 'buergerlicher', 'experte', 'krieger',
  'ark_betrueger', 'ark_bogenschuetze', 'assassine', 'duellant', 'kundsch_chronist', 'mystischer_theurg', 'schattentaenzer', 'wissenshueter', ...EXTRA_NO_FEATS])

/** Anzahl Talente inkl. automatischer (auch nicht eingetragener) → für Kopfzeilen „7/9". */
export const featCount = (char, totalLevel) => assignFeats(char, featPlan(char, totalLevel)).total
