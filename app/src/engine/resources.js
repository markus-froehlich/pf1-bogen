/** Ressourcen-Vorschläge je Klasse (unverändert aus ResourcesPanel.jsx verschoben). */
// Auto-resource formulas per class ID
export function getAutoResources(classId, level, attrs, lang) {
  const L = lang === 'de'
  const ko = attrs?.KO?.mod ?? 0
  const ch = attrs?.CH?.mod ?? 0
  const we = attrs?.WE?.mod ?? 0
  const lvl = Number(level) || 1
  const n = (de, en) => L ? de : en
  const suggestions = []

  if (classId === 'barbar') {
    // PF1e RAW: 4 + Con mod at level 1, +2 rounds/day for each level after that
    // (i.e. 4 + ko + 2*(lvl-1) — not "+2*lvl", which double-counts level 1's base rounds).
    suggestions.push({ name: n('Kampfrausch (Runden)', 'Rage (rounds)'), max: Math.max(1, 4 + ko + 2 * (lvl - 1)) })
  }
  if (classId === 'kleriker') {
    suggestions.push({ name: n('Energie fokussieren', 'Channel Energy'), max: Math.max(1, 3 + ch) })
  }
  if (classId === 'barde' || classId === 'skalde') {
    suggestions.push({ name: classId === 'skalde' ? n('Runenlied (Runden)', 'Raging Song (rounds)') : n('Bardenauftritt (Runden)', 'Bardic Performance (rounds)'), max: Math.max(1, 4 + ch + 2 * lvl) })
  }
  if (classId === 'paladin') {
    suggestions.push({ name: n('Handauflegen', 'Lay on Hands'), max: Math.max(1, Math.floor(lvl / 2) + ch) })
    suggestions.push({ name: n('Böses niederstrecken', 'Smite Evil'), max: Math.max(1, Math.floor(lvl / 2)) })
  }
  if (classId === 'antipaladin') {
    suggestions.push({ name: n('Handauflegen', 'Touch of Corruption'), max: Math.max(1, Math.floor(lvl / 2) + ch) })
    suggestions.push({ name: n('Böses niederstrecken', 'Smite Good'), max: Math.max(1, Math.floor(lvl / 2)) })
  }
  if (classId === 'moench') {
    suggestions.push({ name: n('Ki-Vorrat', 'Ki Pool'), max: Math.max(1, Math.floor(lvl / 2) + we) })
  }
  if (classId === 'hexe' || classId === 'hexenmeister') {
    suggestions.push({ name: classId === 'hexe' ? n('Hexerei/Tag', 'Hex/day') : n('Geheimnis/Tag', 'Secret/day'), max: Math.max(1, Math.floor(lvl / 2) + 1) })
  }
  if (classId === 'inquisitor') {
    suggestions.push({ name: n('Urteil', 'Judgment'), max: Math.max(1, 1 + Math.floor((lvl - 1) / 3)) })
  }
  if (classId === 'paktmagier') {
    suggestions.push({ name: n('Paktmagie-Slot', 'Pact Magic Slot'), max: 1 })
  }
  if (classId === 'alchemist') {
    suggestions.push({ name: n('Bomben', 'Bombs'), max: Math.max(1, lvl + (attrs?.IN?.mod ?? 0)) })
  }
  if (classId === 'druide') {
    // Wild Shape: 1/day at lvl 4, +1/day every 2 levels (lvl 6 → 2, lvl 8 → 3, …)
    const uses = lvl >= 4 ? Math.floor(lvl / 2) - 1 : 0
    if (uses > 0) suggestions.push({ name: n('Tiergestalt', 'Wild Shape'), max: uses })
  }
  if (classId === 'kampfmagus' || classId === 'kampfmagier') {
    suggestions.push({ name: n('Arkaner Pool', 'Arcane Pool'), max: Math.max(1, Math.floor(lvl / 2) + (attrs?.IN?.mod ?? 0)) })
  }
  if (classId === 'ritter') {
    suggestions.push({ name: n('Herausforderung', 'Challenge'), max: Math.max(1, 1 + Math.floor((lvl - 1) / 4)) })
    suggestions.push({ name: n('Ordensgelübde (Runden)', 'Order Ability (rounds)'), max: Math.max(1, lvl) })
  }
  if (classId === 'ninja') {
    suggestions.push({ name: n('Ki-Vorrat', 'Ki Pool'), max: Math.max(1, Math.floor(lvl / 2) + (attrs?.CH?.mod ?? 0)) })
  }
  if (classId === 'schuetze') {
    suggestions.push({ name: n('Gnadenvolley', 'Mercy Volley'), max: Math.max(1, Math.floor(lvl / 6) + 1) })
  }
  if (classId === 'orakel') {
    suggestions.push({ name: n('Offenbarung/Tag', 'Revelation/day'), max: Math.max(1, Math.floor(lvl / 2) + 1) })
  }
  if (classId === 'hexenmeister') {
    suggestions.push({ name: n('Blutmagie', 'Bloodline Power'), max: Math.max(1, 3 + ch) })
  }
  if (classId === 'magier') {
    if (lvl >= 5) suggestions.push({ name: n('Arkanist-Exploit', 'Arcane Exploit'), max: Math.max(1, Math.floor(lvl / 2)) })
  }
  if (classId === 'waldlaeufer') {
    if (lvl >= 1) suggestions.push({ name: n('Gefährten-Fokus', 'Companion Focus'), max: 1 })
  }
  return suggestions
}

