import { useState } from 'react'
import classFeatData from '../data/class_features_by_level.json'
import { RefLink } from './RefLink.jsx'
import './ClassFeaturesPanel.css'

const DATA = classFeatData.by_class ?? {}

function toClassSlug(name) {
  return name
    .replace(/ä/g, 'ae').replace(/Ä/g, 'Ae')
    .replace(/ö/g, 'oe').replace(/Ö/g, 'Oe')
    .replace(/ü/g, 'ue').replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')
    .replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '')
}

export function ClassFeaturesPanel({ char, lang, hideTitle = false }) {
  const L = lang === 'de'
  const [open, setOpen] = useState(false)

  const classes = (char.meta.classes ?? []).filter(e => e.id && Number(e.level) > 0)
  if (classes.length === 0) return null

  // Collect all unlocked features across all class slots
  const slots = classes.map(entry => {
    const classData = DATA[entry.id]
    if (!classData) return null
    const maxLevel = Number(entry.level)
    const unlocked = []
    for (let lvl = 1; lvl <= maxLevel; lvl++) {
      const feats = classData.levels[lvl]
      if (feats?.length) {
        unlocked.push({ level: lvl, features: feats })
      }
    }
    return { id: entry.id, name: classData.name, level: maxLevel, unlocked }
  }).filter(Boolean)

  const totalFeatures = slots.reduce((s, sl) => s + sl.unlocked.reduce((a, u) => a + u.features.length, 0), 0)
  if (slots.length === 0) return null

  return (
    <div className="cf-panel">
      {hideTitle ? (
        <div className="cf-compact-badge">
          <span className="cf-badge">{totalFeatures}</span>
        </div>
      ) : (
        <button className="cf-toggle" onClick={() => setOpen(o => !o)}>
          <span className="cf-toggle-label">
            {L ? '⊕ Klassenmerkmale' : '⊕ Class Features'}
          </span>
          <span className="cf-badge">{totalFeatures}</span>
          <span className="cf-arrow">{open ? '▲' : '▼'}</span>
        </button>
      )}

      {(hideTitle || open) && (
        <div className="cf-body">
          {slots.map(slot => (
            <div key={slot.id} className="cf-class-block">
              <div className="cf-class-header">
                <RefLink
                  className="cf-class-name cf-class-link"
                  href={`http://prd.5footstep.de/Grundregelwerk/Klassen/${toClassSlug(slot.name)}`}
                >{slot.name} ↗</RefLink>
                <span className="cf-class-level">{L ? 'Stufe' : 'Level'} {slot.level}</span>
              </div>
              {slot.unlocked.map(({ level, features }) => (
                <div key={level} className="cf-level-row">
                  <span className="cf-lv-badge">{level}</span>
                  <div className="cf-feats">
                    {features.map((f, i) => (
                      <span key={i} className="cf-feat-chip">{f}</span>
                    ))}
                  </div>
                </div>
              ))}
              {slot.unlocked.length === 0 && (
                <div className="cf-no-data">
                  {L ? 'Keine Daten für diese Klasse' : 'No data for this class'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
