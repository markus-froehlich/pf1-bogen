import domainsData from '../data/domains.json'
import './DomainsPanel.css'

const ALL_DOMAINS = domainsData.domains

// Which class IDs are domain-using classes and how many slots
const DOMAIN_CLASS_SLOTS = {
  kleriker:   2,
  inquisitor: 1,
}

function getMaxDomains(classes) {
  let max = 0
  for (const entry of (classes ?? [])) {
    if (!entry.id) continue
    const slots = DOMAIN_CLASS_SLOTS[entry.id.toLowerCase()] ?? 0
    if (slots > max) max = slots
  }
  return max
}

export function DomainsPanel({ char, setMeta, lang }) {
  const L = lang === 'de'
  const classes = char.meta?.classes ?? []
  const maxSlots = getMaxDomains(classes)

  if (maxSlots === 0) return null

  const domains = char.meta?.domains ?? []

  function setDomain(idx, value) {
    const next = [...domains]
    while (next.length <= idx) next.push('')
    next[idx] = value
    setMeta('domains', next)
  }

  const selectedSet = new Set(domains.filter(Boolean))

  return (
    <div className="dom-panel">
      <div className="dom-title">{L ? 'Domänen' : 'Domains'}</div>
      <div className="dom-slots">
        {Array.from({ length: maxSlots }, (_, i) => {
          const chosen = domains[i] ?? ''
          return (
            <div key={i} className="dom-slot">
              <label className="dom-slot-label">{L ? `Domäne ${i + 1}` : `Domain ${i + 1}`}</label>
              <select
                className="dom-select"
                value={chosen}
                onChange={e => setDomain(i, e.target.value)}
              >
                <option value="">{L ? '— wählen —' : '— choose —'}</option>
                {ALL_DOMAINS.map(d => (
                  <option key={d.id} value={d.id} disabled={selectedSet.has(d.id) && d.id !== chosen}>
                    {L ? d.name_de : d.name_en}
                  </option>
                ))}
              </select>
            </div>
          )
        })}
      </div>
    </div>
  )
}
