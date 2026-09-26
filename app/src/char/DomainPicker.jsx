import { useState } from 'react'
import { DOMAINS, domainOptions, extraDomainOptions, maxDomains, resolveDomain } from '../spells/domainSpells.js'

/** Domänenwahl im Klassen-Editor: Chips, Unterdomänen eingerückt unter ihrer Domäne. */
export function DomainPicker({ classId, value, onChange, lang }) {
  const L = lang === 'de'
  const max = maxDomains(classId)
  const [more, setMore] = useState(false)
  const chosen = (value ?? []).map(resolveDomain).filter(Boolean)
  const toggle = k => onChange(chosen.includes(k) ? chosen.filter(x => x !== k) : [...chosen, k].slice(-max))
  const chip = k => {
    const d = DOMAINS[k]
    const on = chosen.includes(k)
    return <button key={k} className={`nc-chip ${d.parent ? 'is-sub' : ''} ${on ? 'is-on' : ''}`} aria-pressed={on} onClick={() => toggle(k)}
      title={d.parent ? (L ? `Unterdomäne von ${d.parent} (ersetzt sie)` : `Subdomain of ${d.parent}`) : undefined}>{d.parent ? `↳ ${d.name}` : d.name}</button>
  }
  const extras = classId === 'druide' ? [] : extraDomainOptions()
  return (
    <div className="nc-edit-field">
      <span className="nc-edit-label">{L ? `Domänen (${chosen.length}/${max})` : `Domains (${chosen.length}/${max})`}</span>
      <div className="nc-chips">{domainOptions(classId).map(chip)}</div>
      {extras.length > 0 && <>
        <button className="nc-btn nc-btn-ghost nc-self-start" onClick={() => setMore(m => !m)}>{more ? (L ? 'Weitere Domänen ausblenden' : 'Hide more') : (L ? `Weitere Domänen (${extras.length})` : `More domains (${extras.length})`)}</button>
        {more && <div className="nc-chips">{extras.map(chip)}</div>}
      </>}
      <span className="nc-hint">{classId === 'druide'
        ? (L ? 'Naturbund (GRW): eine Domäne → zusätzlicher Domänenzauberplatz je Grad wie beim Kleriker.' : 'Nature bond: one domain, extra domain slot.')
        : (L ? 'Domänenzauber: GRW S. 56–63; Unterdomänen ersetzen ihre Domäne (Expertenregeln, aus dem Excel).' : 'Subdomains replace their domain.')}</span>
    </div>
  )
}
