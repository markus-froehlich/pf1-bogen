/**
 * Domänen + Domänenzauber (data/domain_spells.json, gebaut von tools/build_domain_spells.py:
 * GRW S. 56-63 maßgeblich, Unterdomänen/weitere aus dem Excel).
 *
 * char.meta.domains: Liste aus alten IDs (domains.json, z. B. „luft") oder Schlüsseln aus
 * domain_spells.json (z. B. „Luft", „Luft/Wolken"). Beides wird hier aufgelöst.
 */
import domainSpellsData from '../data/domain_spells.json'
import domainsData from '../data/domains.json'

export const DOMAINS = domainSpellsData.domains
// domains.json-Namen, die in den Listen anders heißen
const LEGACY_NAME = { Tier: 'Tiere', Gesetz: 'Ordnung', Pflanze: 'Pflanzen', Reise: 'Reisen', Rune: 'Runen', List: 'Tricks',
  Charme: 'Verzauberung', Ruhm: 'Herrlichkeit', Artefakt: 'Handwerk' }
const LEGACY_ID = Object.fromEntries(domainsData.domains.map(d => [d.id, LEGACY_NAME[d.name_de] ?? d.name_de]))

/** GRW: Naturbund des Druiden — eine dieser Domänen (Unterdomänen davon, Expertenregeln). */
export const DRUID_DOMAINS = ['Erde', 'Feuer', 'Luft', 'Pflanzen', 'Tiere', 'Wasser', 'Wetter']

export const resolveDomain = v => (DOMAINS[v] ? v : DOMAINS[LEGACY_ID[v]] ? LEGACY_ID[v] : null)
export const chosenDomains = char => [...new Set((char.meta?.domains ?? []).map(resolveDomain).filter(Boolean))]
export const domainLabel = key => (DOMAINS[key] ? (DOMAINS[key].parent ? `${DOMAINS[key].name} (${DOMAINS[key].parent})` : DOMAINS[key].name) : key)

/** Auswahlliste je Klasse: Hauptdomänen, jeweils gefolgt von ihren Unterdomänen. */
export function domainOptions(classId) {
  const entries = Object.entries(DOMAINS).filter(([, d]) => d.group === 'domaene')
  const mains = classId === 'druide' ? DRUID_DOMAINS : entries.filter(([, d]) => !d.parent && d.source === 'GRW').map(([k]) => k)
  return mains.flatMap(m => [m, ...entries.filter(([, d]) => d.parent === m).map(([k]) => k)])
}
/** Weitere Domänen aus anderen Büchern (nur Kleriker/Inquisitor). */
export const extraDomainOptions = () => Object.entries(DOMAINS).filter(([, d]) => d.group === 'domaene' && !d.parent && d.source !== 'GRW').map(([k]) => k)

export const maxDomains = classId => ({ kleriker: 2, inquisitor: 1, druide: 1 })[classId] ?? 0

/** Domänenzauber eines Grades für die gewählten Domänen → [{ domain, name, ids[] }]. */
export function domainSpellsAt(char, lv) {
  return chosenDomains(char).map(k => {
    const s = DOMAINS[k]?.spells?.[lv]
    if (!s) return null
    return { domain: k, name: s.name, ids: s.id ? (Array.isArray(s.id) ? s.id : [s.id]) : [] }
  }).filter(Boolean)
}
