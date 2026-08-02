import { useMemo, useState } from 'react'
import companionsData from '../data/animal_companions.json'
import './CompanionsTab.css'

const SPECIES = companionsData.companions

export function CompanionsTab({ index, ownerId, onCreate, onOpen, lang }) {
  const L = lang === 'de'
  const [query, setQuery] = useState('')
  const [speciesId, setSpeciesId] = useState(SPECIES[0]?.id ?? '')
  const companions = index.filter(entry => entry.ownerId === ownerId)
  const selected = SPECIES.find(species => species.id === speciesId)
  const options = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? SPECIES.filter(s => s.name.de.toLowerCase().includes(q)).slice(0, 12) : SPECIES.slice(0, 12)
  }, [query])

  return (
    <div className="companions-tab">
      <div className="companions-intro">
        <div>
          <div className="companions-kicker">{L ? 'VERKNÜPFTE GEFÄHRTEN' : 'LINKED COMPANIONS'}</div>
          <h2>{L ? 'Tiergefährten' : 'Animal Companions'}</h2>
          <p>{L ? 'Jeder Gefährte wird separat geführt und bleibt mit diesem Druiden verbunden.' : 'Each companion is tracked separately and remains linked to this druid.'}</p>
        </div>
        <span className="companions-count">{companions.length}</span>
      </div>

      <div className="companion-create">
        <label>{L ? 'Tierart auswählen' : 'Choose species'}</label>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={L ? 'Wolf, Bär, Pferd …' : 'Wolf, bear, horse …'}
        />
        <div className="companion-species-list">
          {options.map(species => (
            <button
              key={species.id}
              className={`companion-species-option${species.id === speciesId ? ' selected' : ''}`}
              onClick={() => { setSpeciesId(species.id); setQuery(species.name.de) }}
            >
              <span>{species.name.de}</span>
              <small>{species.size} · {species.speed || '—'}</small>
            </button>
          ))}
        </div>
        <button className="companion-add-btn" disabled={!selected} onClick={() => onCreate(selected)}>
          + {L ? `${selected?.name.de ?? 'Tier'} als Gefährten anlegen` : `Add ${selected?.name.de ?? 'animal'} as companion`}
        </button>
      </div>

      {companions.length === 0 ? (
        <div className="companions-empty">{L ? 'Noch kein Tiergefährte angelegt.' : 'No companion created yet.'}</div>
      ) : (
        <div className="companions-list">
          {companions.map(entry => {
            const species = SPECIES.find(s => s.id === entry.speciesId)
            return (
              <button key={entry.id} className="companion-card" onClick={() => onOpen(entry.id)}>
                <span className="companion-card-icon">◆</span>
                <span className="companion-card-main">
                  <strong>{entry.name || species?.name.de || (L ? 'Tiergefährte' : 'Companion')}</strong>
                  <small>{species?.name.de || entry.speciesId} · {L ? 'separater Bogen' : 'separate sheet'}</small>
                </span>
                <span className="companion-card-arrow">›</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
