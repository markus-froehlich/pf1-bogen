import { useMemo, useState } from 'react'
import { Check, MagnifyingGlass, PawPrint, CaretRight } from '@phosphor-icons/react'
import companionsData from '../data/animal_companions.json'

const SPECIES = companionsData.companions
const src = s => String(s.source ?? '').replace(/[()]/g, '').trim()
/** Besonderheiten ohne die sechs Attributwerte, z. B. „Fliegen 24m normal, Dämmersicht". */
const traits = s => String(s.base ?? '').split(',').map(t => t.trim()).filter(t => t && !/^(ST|GE|KO|IN|WE|CH)\s*\d/.test(t)).slice(0, 2).join(', ')

/** Tiergefährten des Druiden: bestehende öffnen, neue Tierart wählen (Nocturne-Stil). */
export function CompanionPicker({ index, ownerId, onCreate, onOpen, onClose, lang }) {
  const L = lang === 'de'
  const [q, setQ] = useState('')
  const [pick, setPick] = useState(null)
  const mine = index.filter(e => e.ownerId === ownerId)
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return s ? SPECIES.filter(x => x.name.de.toLowerCase().includes(s)) : SPECIES
  }, [q])
  const selected = SPECIES.find(x => x.id === pick)
  return (
    <div className="nc-edit">
      <div className="nc-edit-head"><span className="nc-sheet-title">{L ? 'Tiergefährte' : 'Animal companion'}</span>
        <button className="nc-btn nc-btn-ghost" onClick={onClose}>{L ? 'Fertig' : 'Done'}</button></div>

      {mine.length > 0 && (
        <div className="nc-edit-field"><span className="nc-edit-label">{L ? `Deine Gefährten (${mine.length})` : `Your companions (${mine.length})`}</span>
          <div className="nc-card nc-card-list">
            {mine.map(e => {
              const sp = SPECIES.find(x => x.id === e.speciesId)
              return (
                <button key={e.id} className="nc-list-row" onClick={() => onOpen(e.id)}>
                  <PawPrint className="nc-list-icon nc-accent-soft" />
                  <span className="nc-row-text"><span className="nc-row-title">{e.name || sp?.name.de || (L ? 'Tiergefährte' : 'Companion')}</span>
                    <span className="nc-row-sub">{sp?.name.de ?? e.speciesId} · {L ? 'eigener Charakter' : 'own sheet'}</span></span>
                  <CaretRight className="nc-list-caret" />
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="nc-edit-field"><span className="nc-edit-label">{L ? `Neue Tierart (${SPECIES.length})` : `New species (${SPECIES.length})`}</span>
        <div className="nc-search"><MagnifyingGlass className="nc-accent-soft" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={L ? 'Wolf, Bär, Pferd …' : 'Wolf, bear, horse …'} aria-label={L ? 'Tierart suchen' : 'Search species'} /></div>
        <div className="nc-search-hits nc-species-list">
          {shown.map(x => (
            <button key={x.id} className={`nc-search-hit ${pick === x.id ? 'is-on' : ''}`} onClick={() => setPick(x.id)} aria-pressed={pick === x.id}>
              <span className="nc-row-text"><span className="nc-ellipsis">{x.name.de}</span>
                <span className="nc-row-sub nc-ellipsis">{x.size} · {x.speed ? `${x.speed} m` : '—'}{traits(x) ? ` · ${traits(x)}` : ''}</span></span>
              <span className="nc-search-meta">{pick === x.id ? <Check className="nc-accent" /> : src(x)}</span>
            </button>
          ))}
          {!shown.length && <span className="nc-empty">{L ? 'Keine Tierart gefunden.' : 'No species found.'}</span>}
        </div>
      </div>
      {selected && <span className="nc-hint">{selected.base}</span>}
      <div className="nc-edit-actions">
        <button className="nc-btn nc-btn-secondary" onClick={onClose}>{L ? 'Abbrechen' : 'Cancel'}</button>
        <button className="nc-btn nc-btn-primary" disabled={!selected} onClick={() => onCreate(selected)}>
          {selected ? (L ? `${selected.name.de} anlegen` : `Create ${selected.name.de}`) : (L ? 'Tierart wählen' : 'Choose species')}
        </button>
      </div>
    </div>
  )
}
