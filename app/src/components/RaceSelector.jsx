import { useState } from 'react'
import racesData from '../data/races.json'
import racialTraitsData from '../data/racial_traits.json'
import './RaceSelector.css'

const officialRaces = racesData.races
const TRAITS_BY_RACE = racialTraitsData.by_race ?? {}

export function RaceSelector({ value, onChange, lang = 'de', hbRaces = [], showLabel = true }) {
  const [traitsOpen, setTraitsOpen] = useState(false)
  const allRaces = [...officialRaces, ...hbRaces]
  const selected = allRaces.find(r => r.id === value)
  const traits   = TRAITS_BY_RACE[value] ?? []

  return (
    <div className="race-selector">
      {showLabel && <label className="field-label">{lang === 'de' ? 'Volk' : 'Race'}</label>}
      <select
        className="race-select"
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">{lang === 'de' ? '— Volk wählen —' : '— Choose race —'}</option>
        <optgroup label={lang === 'de' ? 'Offiziell' : 'Official'}>
          {officialRaces.map(r => (
            <option key={r.id} value={r.id}>{r.name.de}</option>
          ))}
        </optgroup>
        {hbRaces.length > 0 && (
          <optgroup label="Homebrew">
            {hbRaces.map(r => (
              <option key={r.id} value={r.id}>{r.name?.de ?? r.id}</option>
            ))}
          </optgroup>
        )}
      </select>
      {selected && (
        <div className="race-info">
          <span className="race-size">{selected.size?.de ?? selected.size}</span>
          {selected.ability_mods_text?.de && (
            <span className="race-mods">{selected.ability_mods_text.de}</span>
          )}
          {selected.ability_mod_floating != null && !selected.ability_mods_text?.de && (
            <span className="race-mods">1 Attribut +{selected.ability_mod_floating}</span>
          )}
          <span className="race-spd">{selected.speed_m?.unarmored ?? selected.speed_m}m</span>
          {selected.extra_skill_points_per_level > 0 && (
            <span className="race-skill">+{selected.extra_skill_points_per_level} FP/Stufe</span>
          )}
          <span className="race-note">{lang === 'de'
            ? '⚠ Attribut-Boni manuell eintragen'
            : '⚠ Apply ability bonuses manually'}</span>
        </div>
      )}
      {selected && traits.length > 0 && (
        <div className="race-traits-wrap">
          <button className="race-traits-toggle" onClick={() => setTraitsOpen(o => !o)}>
            {lang === 'de' ? `Volksmerkmale (${traits.length})` : `Racial traits (${traits.length})`}
            <span className="rtt-arrow">{traitsOpen ? '▲' : '▼'}</span>
          </button>
          {traitsOpen && (
            <div className="race-traits-list">
              {traits.map((t, i) => (
                <div key={i} className="rt-item">
                  <span className="rt-name">{t.trait}</span>
                  {t.desc && <p className="rt-desc">{t.desc}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
