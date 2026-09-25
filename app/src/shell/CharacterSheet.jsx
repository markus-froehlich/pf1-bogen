import { useState } from 'react'
import { User, PawPrint, Check, Plus, Trash } from '@phosphor-icons/react'
import { useToast } from './toastContext.js'

/** Charakterwahl (ersetzt CharacterDrawer): Liste, Wechsel, Neu, Löschen mit Bestätigung. */
export function CharacterSheet({ index, activeId, onSwitch, onNew, onDelete, onRestore, onClose, lang, raceMap = {}, classMap = {}, player }) {
  const L = lang === 'de'
  const toast = useToast()
  const [confirmId, setConfirmId] = useState(null)

  const raceName = id => (id ? raceMap[id]?.name?.[lang] || raceMap[id]?.name?.de || id : null)
  const classStr = classes => (classes ?? [])
    .map(c => `${classMap[c.id]?.name?.[lang] || classMap[c.id]?.name?.de || c.id} ${c.level}`).join(' / ') || null

  return (
    <div className="nc-sheet-body">
      <span className="nc-sheet-title">{L ? 'Charaktere' : 'Characters'}{player ? ` · ${player}` : ''}</span>
      <div className="nc-char-list">
        {index.map(entry => {
          const active = entry.id === activeId
          const companion = entry.kind === 'companion'
          const Icon = companion ? PawPrint : User
          const sub = [raceName(entry.race), classStr(entry.classes), entry.player].filter(Boolean).join(' · ')
            || (companion ? (L ? 'Tiergefährte' : 'Companion') : '—')
          return (
            <div key={entry.id} className={`nc-char-row ${active ? 'is-active' : ''}`}>
              <button className="nc-char-main" onClick={() => { onSwitch(entry.id); onClose() }}>
                <span className="nc-char-icon"><Icon /></span>
                <span className="nc-char-text">
                  <span className="nc-ellipsis nc-char-name">{entry.name && entry.name !== '—' ? entry.name : (L ? '(Unbenannt)' : '(Unnamed)')}</span>
                  <span className="nc-ellipsis nc-char-sub">{sub}</span>
                </span>
                {active && <Check className="nc-accent" />}
              </button>
              {!active && (
                <button className="nc-icon-btn nc-muted" title={L ? 'Löschen' : 'Delete'} onClick={() => setConfirmId(confirmId === entry.id ? null : entry.id)}>
                  <Trash />
                </button>
              )}
              {confirmId === entry.id && (
                <div className="nc-char-confirm">
                  <span>{L ? 'Wirklich löschen?' : 'Really delete?'}</span>
                  <button className="nc-btn nc-btn-secondary" onClick={() => setConfirmId(null)}>{L ? 'Abbrechen' : 'Cancel'}</button>
                  <button className="nc-btn nc-btn-danger" onClick={() => {
                    const snapshot = onDelete(entry.id)
                    setConfirmId(null)
                    const label = entry.name && entry.name !== '—' ? entry.name : (L ? 'Charakter' : 'Character')
                    toast(L ? `${label} gelöscht` : `${label} deleted`, { undo: snapshot ? () => onRestore(snapshot) : undefined })
                  }}>{L ? 'Löschen' : 'Delete'}</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <button className="nc-btn nc-btn-primary nc-btn-block" onClick={() => { onNew(); onClose() }}>
        <Plus />{L ? 'Neuer Charakter' : 'New character'}
      </button>
    </div>
  )
}
