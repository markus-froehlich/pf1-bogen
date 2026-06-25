import { useState } from 'react'
import './CharacterDrawer.css'

export function CharacterDrawer({ index, activeId, onSwitch, onNew, onDelete, onClose, lang, raceMap = {}, classMap = {} }) {
  const L = lang === 'de'
  const [confirmId, setConfirmId] = useState(null)

  function raceName(id) {
    if (!id) return null
    const r = raceMap[id]
    return r?.name?.[lang] || r?.name?.de || id
  }

  function classStr(classes) {
    if (!classes?.length) return null
    return classes
      .map(c => {
        const name = classMap[c.id]?.name?.[lang] || classMap[c.id]?.name?.de || c.id
        return `${name} ${c.level}`
      })
      .join(' / ')
  }

  function handleDelete(id) {
    if (confirmId === id) {
      onDelete(id)
      setConfirmId(null)
    } else {
      setConfirmId(id)
    }
  }

  return (
    <div className="char-drawer-overlay" onClick={onClose}>
      <div className="char-drawer" onClick={e => e.stopPropagation()}>
        <div className="cd-header">
          <span className="cd-title">{L ? 'Charaktere' : 'Characters'}</span>
          <button className="cd-close" onClick={onClose}>✕</button>
        </div>

        <div className="cd-list">
          {index.map(entry => (
            <div
              key={entry.id}
              className={`cd-entry ${entry.id === activeId ? 'active' : ''}`}
              onClick={() => { if (confirmId === entry.id) return; onSwitch(entry.id); onClose() }}
            >
              <div className="cde-top-row">
                <div className="cde-info">
                  <span className="cde-name">{entry.name || (L ? '(Unbenannt)' : '(Unnamed)')}</span>
                  <span className="cde-sub">
                    {[entry.player || null, raceName(entry.race), classStr(entry.classes)].filter(Boolean).join(' · ')}
                  </span>
                </div>
                {entry.id !== activeId && (
                  <button
                    className="cde-delete"
                    title={L ? 'Löschen' : 'Delete'}
                    onClick={e => { e.stopPropagation(); handleDelete(entry.id) }}
                  >✕</button>
                )}
                {entry.id === activeId && <span className="cde-active-mark">◆</span>}
              </div>
              {confirmId === entry.id && (
                <div className="cde-confirm" onClick={e => e.stopPropagation()}>
                  <span className="cde-confirm-label">{L ? 'Wirklich löschen?' : 'Really delete?'}</span>
                  <button className="cde-confirm-yes" onClick={e => { e.stopPropagation(); handleDelete(entry.id) }}>
                    {L ? 'Ja, löschen' : 'Yes, delete'}
                  </button>
                  <button className="cde-confirm-no" onClick={e => { e.stopPropagation(); setConfirmId(null) }}>
                    {L ? 'Abbrechen' : 'Cancel'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <button className="cd-new-btn" onClick={() => { onNew(); onClose() }}>
          + {L ? 'Neuer Charakter' : 'New Character'}
        </button>
      </div>
    </div>
  )
}
