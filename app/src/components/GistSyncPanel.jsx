import { useState } from 'react'
import './GistSyncPanel.css'

const STATUS_LABEL = {
  idle:       { text: 'Nicht verbunden', color: 'var(--text-muted)' },
  connecting: { text: 'Verbinde…',       color: '#c9a96e' },
  syncing:    { text: 'Synchronisiert…', color: '#c9a96e' },
  ok:         { text: 'Verbunden',       color: '#6ec97e' },
  error:      { text: 'Fehler',          color: '#c96e6e' },
}

export function GistSyncPanel({ gistSync, onClose }) {
  const { token, gistId, connected, status, lastSync, connect, pull, disconnect } = gistSync
  const [inputToken, setInputToken] = useState(token)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [working, setWorking] = useState(false)

  async function handleConnect() {
    setError(''); setMsg(''); setWorking(true)
    const res = await connect(inputToken.trim())
    if (!res.ok) { setWorking(false); setError(res.error); return }
    if (!res.existed) { setWorking(false); setMsg('Neuer Gist erstellt — Backup läuft automatisch.'); return }
    // Existing gist found — immediately pull data
    setMsg('Vorhandenen Gist gefunden, lade Daten…')
    const data = await pull()
    setWorking(false)
    if (!data || !data.index || !data.chars) {
      setMsg('Verbunden. Gist noch leer — Backup läuft automatisch.')
      return
    }
    for (const [id, charData] of Object.entries(data.chars)) {
      localStorage.setItem(`pf1_char_${id}`, JSON.stringify(charData))
    }
    localStorage.setItem('pf1_chars_index', JSON.stringify(data.index))
    if (data.activeId) localStorage.setItem('pf1_active_char', data.activeId)
    setMsg('Daten geladen — Seite wird neu geladen…')
    setTimeout(() => window.location.reload(), 700)
  }

  async function handlePull() {
    setError(''); setMsg(''); setWorking(true)
    const data = await pull()
    setWorking(false)
    if (!data || !data.index || !data.chars) {
      setError('Gist noch leer — Backup wird automatisch gespeichert sobald du etwas änderst.')
      return
    }
    for (const [id, charData] of Object.entries(data.chars)) {
      localStorage.setItem(`pf1_char_${id}`, JSON.stringify(charData))
    }
    localStorage.setItem('pf1_chars_index', JSON.stringify(data.index))
    if (data.activeId) localStorage.setItem('pf1_active_char', data.activeId)
    setMsg('Daten geladen — Seite wird neu geladen…')
    setTimeout(() => window.location.reload(), 700)
  }

  const sl = STATUS_LABEL[status] ?? STATUS_LABEL.idle

  return (
    <div className="gist-overlay" onClick={onClose}>
      <div className="gist-panel" onClick={e => e.stopPropagation()}>
        <div className="gist-header">
          <span className="gist-title">☁ Cloud-Backup (GitHub Gist)</span>
          <button className="gist-close" onClick={onClose}>✕</button>
        </div>

        <div className="gist-body">
          <p className="gist-desc">
            Charaktere werden automatisch in einem privaten GitHub Gist gesichert.
            Nur ein kostenloser GitHub-Token mit <code>gist</code>-Berechtigung nötig.
          </p>

          <div className="gist-status-row">
            <span className="gist-status-dot" style={{ background: sl.color }} />
            <span className="gist-status-text" style={{ color: sl.color }}>{sl.text}</span>
            {connected && lastSync && <span className="gist-last-sync">· zuletzt {lastSync}</span>}
            {connected && gistId && (
              <a className="gist-id-link"
                href={`https://gist.github.com/${gistId}`}
                target="_blank" rel="noreferrer">↗ Gist</a>
            )}
          </div>

          {!connected && (
            <div className="gist-connect-form">
              <label className="gist-label">GitHub Personal Access Token (gist scope)</label>
              <input
                className="gist-token-input"
                type="password"
                placeholder="ghp_xxxxxxxxxxxx"
                value={inputToken}
                onChange={e => setInputToken(e.target.value)}
                autoComplete="off"
                onKeyDown={e => { if (e.key === 'Enter') handleConnect() }}
              />
              <a className="gist-help-btn"
                href="https://github.com/settings/tokens/new?scopes=gist&description=PF1+Bogen"
                target="_blank" rel="noreferrer">
                ↗ Token auf GitHub erstellen
                <span className="gist-help-hint">(nur „gist" ankreuzen, dann kopieren)</span>
              </a>
              <button className="gist-connect-btn" onClick={handleConnect}
                disabled={!inputToken.trim() || working}>
                {working ? 'Verbinde…' : 'Verbinden'}
              </button>
            </div>
          )}

          {connected && (
            <div className="gist-actions">
              <p className="gist-info">
                Alle Änderungen werden automatisch nach 3 Sekunden gesichert.
                Um auf einem anderen Gerät / nach Cache-Reset wiederherzustellen:
                „Laden" klicken.
              </p>
              <div className="gist-btn-row">
                <button className="gist-action-btn gist-pull-btn" onClick={handlePull} disabled={working}>
                  {working ? 'Lädt…' : '⬇ Daten laden'}
                </button>
                <button className="gist-action-btn gist-disconnect-btn" onClick={disconnect}>
                  Trennen
                </button>
              </div>
            </div>
          )}

          {error && <div className="gist-error">{error}</div>}
          {msg   && <div className="gist-msg">{msg}</div>}
        </div>
      </div>
    </div>
  )
}
