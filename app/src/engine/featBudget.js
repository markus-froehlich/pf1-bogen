/**
 * Talent-Budget nach Grundregelwerk (geprüft 2026-09-26):
 *  - Tabelle 3-1: Talente auf Charakterstufe 1, 3, 5 … 19 → ⌈Stufe/2⌉
 *  - Volk: Mensch „Bonustalent" (+1 auf Stufe 1); Halb-Elf „Anpassungsfähig" (Fertigkeitsfokus als Bonustalent)
 *  - Klassen (Klassenstufe, GRW-Klassentabellen): Kämpfer 1 + jede gerade Stufe; Mönch Verbesserter
 *    waffenloser Schlag + Betäubender Schlag (1) und Bonustalente 1/2/6/10/14/18; Waldläufer Kampfstil
 *    2/6/10/14/18 + Ausdauer (3); Magier Schriftrolle anfertigen (1) + 5/10/15/20; Hexenmeister
 *    Materialkomponentenlos zaubern (1) + Blutlinie 7/13/19.
 *  Alles andere (Klassen außerhalb des GRW, Domänen, Schurkentricks …) über `char.feats_extra` (manuell).
 */
const at = (levels, lv) => levels.filter(x => x <= lv).length

const CLASS_BONUS = {
  kaempfer: lv => [{ n: lv >= 1 ? 1 + Math.floor(lv / 2) : 0, de: 'Bonustalente (Stufe 1 + jede gerade)', en: 'Bonus feats' }],
  moench: lv => [
    { n: lv >= 1 ? 2 : 0, de: 'Verb. waffenloser Schlag, Betäubender Schlag (St. 1)', en: 'Improved Unarmed Strike, Stunning Fist' },
    { n: at([1, 2, 6, 10, 14, 18], lv), de: 'Bonustalente (1/2/6/10/14/18)', en: 'Bonus feats' },
  ],
  waldlaeufer: lv => [
    { n: at([2, 6, 10, 14, 18], lv), de: 'Kampfstiltalente (2/6/10/14/18)', en: 'Combat style feats' },
    { n: lv >= 3 ? 1 : 0, de: 'Ausdauer (St. 3)', en: 'Endurance' },
  ],
  magier: lv => [
    { n: lv >= 1 ? 1 : 0, de: 'Schriftrolle anfertigen (St. 1)', en: 'Scribe Scroll' },
    { n: at([5, 10, 15, 20], lv), de: 'Bonustalente (5/10/15/20)', en: 'Bonus feats' },
  ],
  hexenmeister: lv => [
    { n: lv >= 1 ? 1 : 0, de: 'Materialkomponentenlos zaubern (St. 1)', en: 'Eschew Materials' },
    { n: at([7, 13, 19], lv), de: 'Blutlinientalente (7/13/19)', en: 'Bloodline feats' },
  ],
}
const RACE_BONUS = {
  mensch: { de: 'Mensch: Bonustalent', en: 'Human bonus feat' },
  human: { de: 'Mensch: Bonustalent', en: 'Human bonus feat' },
  halb_elf: { de: 'Halb-Elf: Fertigkeitsfokus', en: 'Half-elf: Skill Focus' },
}

/** Aufstellung aller Talente, die der Charakter haben darf → { total, lines: [{ label, n, sub? }] } */
export function featBudget(char, totalLevel, lang = 'de') {
  const L = lang === 'de'
  const lines = []
  if (!totalLevel) return { total: 0, lines }
  lines.push({ label: L ? `Stufe ${totalLevel}` : `Level ${totalLevel}`, sub: L ? 'Talente auf Stufe 1, 3, 5 …' : 'Feats at 1, 3, 5 …', n: Math.ceil(totalLevel / 2) })
  const race = RACE_BONUS[char.meta?.race]
  if (race) lines.push({ label: L ? race.de : race.en, n: 1 })
  for (const c of (char.meta?.classes ?? []).filter(x => x.id && Number(x.level) > 0)) {
    for (const b of CLASS_BONUS[c.id]?.(Number(c.level)) ?? []) if (b.n) lines.push({ label: L ? b.de : b.en, sub: c.id, n: b.n, classId: c.id })
  }
  const extra = Number(char.feats_extra ?? 0)
  if (extra) lines.push({ label: L ? 'Weitere Bonustalente (manuell)' : 'Other bonus feats (manual)', n: extra })
  return { total: lines.reduce((a, l) => a + l.n, 0), lines }
}

/** Kompatibel zur alten Signatur (nur Stufe + Mensch). */
export function baseFeatBudget(totalLevel, isHuman) {
  if (!totalLevel) return 0
  return Math.ceil(totalLevel / 2) + (isHuman ? 1 : 0)
}

/** Klassen, deren Bonustalente die App nicht kennt (außerhalb des GRW) → Hinweis auf das manuelle Feld. */
export const hasKnownBonusRules = classId => classId in CLASS_BONUS
