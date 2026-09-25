/** Regel-Links für Talente (prd.5footstep.de) — unverändert aus FeatsTab.jsx übernommen. */
import featsData from '../data/feats.json'

const FEAT_PREFIX_BOOK = {
  G:  'Grundregelwerk',
  E:  'Expertenregeln',
  M:  'Ausbauregeln-Magie',
  K:  'Ausbauregeln-II-Kampf',
  KL: 'Ausbauregeln-VI-Klassen',
  OK: 'Ausbauregeln-VII-Okkultes',
}

function toFeatSlug(name) {
  const stripped = name
    .replace(/\s*\([^)]*\)\s*$/, '')          // remove trailing "(NT)", "(WZ)" etc.
    .replace(/\s+[A-ZÄÖÜ]{1,3}\s*$/, '')      // remove trailing " K", " WZ", " KL", " KKK" etc.
    .trim()
  return stripped
    .replace(/ä/g, 'ae').replace(/Ä/g, 'Ae')
    .replace(/ö/g, 'oe').replace(/Ö/g, 'Oe')
    .replace(/ü/g, 'ue').replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
}

function featBook(source) {
  if (!source) return null
  const m = source.match(/^([A-Za-z]+)/)
  if (!m) return null
  return FEAT_PREFIX_BOOK[m[1]] ?? null
}

// Manually-typed feats (not chosen via the DB autocomplete) have no stored `source`.
// Fall back to a name lookup in the feats DB so the reference link still appears.
function normFeatName(name) {
  return String(name ?? '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/\s+[A-ZÄÖÜ]{1,3}\s*$/, '')
    .trim()
    .toLowerCase()
}
const DB_FEAT_SOURCE_BY_NAME = Object.fromEntries(featsData.feats.map(f => [f.name.de, f.source]))
const DB_FEAT_SOURCE_BY_NORM = Object.fromEntries(featsData.feats.map(f => [normFeatName(f.name.de), f.source]))
function lookupFeatSource(name) {
  return DB_FEAT_SOURCE_BY_NAME[name] ?? DB_FEAT_SOURCE_BY_NORM[normFeatName(name)] ?? null
}


export function featUrl(name, source) {
  const book = featBook(source || lookupFeatSource(name))
  return book ? `http://prd.5footstep.de/${book}/Talente/${toFeatSlug(name)}` : null
}
