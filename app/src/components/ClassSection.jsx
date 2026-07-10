import { ALL_CLASSES } from '../engine/index.js'
import archetypesData from '../data/archetypes.json'
import { DomainsPanel } from './DomainsPanel.jsx'
import { RefLink } from './RefLink.jsx'
import './CombatTab.css'

const SOURCE_BOOK = {
  G:   'Grundregelwerk',
  E:   'Expertenregeln',
  M:   'AusbauregelnMagie',
  K:   'AusbauregelnIIKampf',
  KL:  'AusbauregelnVIKlassen',
  OK:  'AusbauregelnVIIOkkultes',
  V:   'VoelkerderInnerenSee',
}

function toArchSlug(name) {
  return name
    .replace(/ä/g, 'ae').replace(/Ä/g, 'Ae')
    .replace(/ö/g, 'oe').replace(/Ö/g, 'Oe')
    .replace(/ü/g, 'ue').replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
}

function archUrl(className, archName, source) {
  const m = source?.match(/^([A-Za-z]+)/)
  const book = (m && SOURCE_BOOK[m[1]]) ?? 'Grundregelwerk'
  return `http://prd.5footstep.de/${book}/Archetypen/${toArchSlug(className)}/${toArchSlug(archName)}`
}

export function ClassSection({ char, setClass, setMeta, baseValues, lang, hbClasses = [], hbRaces = [],
  collapsed = false, onToggle, onMove, sectionIdx = 0, sectionCount = 1 }) {
  const L = lang === 'de'
  const CLASS_MAP_TAB = Object.fromEntries([...ALL_CLASSES, ...hbClasses].map(c => [c.id, c]))
  const classes = char.meta.classes ?? [{ id: '', level: 1 }]

  return (
    <>
      {/* Class selector */}
      <section className="ct-section">
        <div className="ct-heading-row">
          <button className="ct-collapse-btn" onClick={() => onToggle?.('class')} title={collapsed ? 'Aufklappen' : 'Zuklappen'}>
            {collapsed ? '▶' : '▼'}
          </button>
          <h3 className="ct-heading ct-heading-clk" onClick={() => onToggle?.('class')}>{L ? 'Klasse(n)' : 'Class(es)'}</h3>
          {onMove && (
            <div className="ct-move-btns">
              <button className="ct-move-btn" disabled={sectionIdx === 0} onClick={() => onMove('class', -1)} title="Nach oben">↑</button>
              <button className="ct-move-btn" disabled={sectionIdx === sectionCount - 1} onClick={() => onMove('class', 1)} title="Nach unten">↓</button>
            </div>
          )}
        </div>
        {!collapsed && [0, 1, 2].map(idx => {
          const entry     = classes[idx] ?? { id: '', level: 1 }
          const archList  = entry.id ? (archetypesData.archetypes[entry.id] ?? []) : []
          const selected  = entry.archetypes ?? []
          const available = archList.filter(a => !selected.includes(a.name))
          const archByName = Object.fromEntries(archList.map(a => [a.name, a]))
          const className = CLASS_MAP_TAB[entry.id]?.name?.de ?? entry.id

          function addArchetype(name) {
            if (!name || selected.includes(name) || selected.length >= 3) return
            setClass(idx, 'archetypes', [...selected, name])
          }
          function removeArchetype(name) {
            setClass(idx, 'archetypes', selected.filter(n => n !== name))
          }

          return (
            <div key={idx} className="class-slot">
              <div className="class-row">
                <select
                  className="class-select"
                  value={entry.id}
                  onChange={e => setClass(idx, 'id', e.target.value)}
                >
                  <option value="">—</option>
                  {ALL_CLASSES.map(c => (
                    <option key={c.id} value={c.id}>{c.name.de}</option>
                  ))}
                  {hbClasses.length > 0 && hbClasses.map(c => (
                    <option key={c.id} value={c.id}>⚙ {c.name?.de ?? c.id}</option>
                  ))}
                </select>
                <input
                  className="class-level"
                  type="number" min={1} max={20}
                  value={entry.level}
                  onChange={e => setClass(idx, 'level', Number(e.target.value))}
                />

                {entry.id && CLASS_MAP_TAB[entry.id] && (
                  <span className="class-info-badge">
                    W{CLASS_MAP_TAB[entry.id].hit_die} · {CLASS_MAP_TAB[entry.id].skill_points_per_level}FP
                  </span>
                )}
              </div>

              {/* Archetype chips */}
              {entry.id && (
                <div className="archetype-row">
                  {selected.map(name => (
                    <span key={name} className="arch-chip">
                      {name}
                      <a
                        className="arch-ref-link"
                        href={archUrl(className, name, archByName[name]?.source)}
                        target="_blank" rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        title="prd.5footstep.de"
                      >↗</a>
                      <button className="arch-remove" onClick={() => removeArchetype(name)}>×</button>
                    </span>
                  ))}
                  {selected.length < 3 && available.length > 0 && (
                    <select
                      className="arch-add-select"
                      value=""
                      onChange={e => addArchetype(e.target.value)}
                    >
                      <option value="">+ {L ? 'Archetyp' : 'Archetype'}</option>
                      {available.map(a => (
                        <option key={a.name} value={a.name}>{a.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {!collapsed && (
          <div className="total-level">
            {L ? 'Gesamtstufe' : 'Total level'}: {baseValues.totalLevel}
          </div>
        )}
      </section>

      {!collapsed && <DomainsPanel char={char} setMeta={setMeta} lang={lang} />}
    </>
  )
}
