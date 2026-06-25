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
    const data = await pull(inputToken.trim(), res.gistId)
    setWorking(false)
    if (!data || !data.index || !data.chars) {
      setMsg('Verbunden. Gist noch leer — Backup läuft automatisch.')
      return
    }
    for (const [id, charData] of Object.entries(data.chars)) {
      localStorage.setItem(`pf1_char_${id}`, JSON.stringify(charData))
    }
    localStorage.setItem('pf1_chars_index', JSON.stringify(data.index))
    if (data.homebrew) localStorage.setItem('pf1_homebrew', JSON.stringify(data.homebrew))
    if (data.preferences) {
      for (const [k, v] of Object.entries(data.preferences)) localStorage.setItem(k, JSON.stringify(v))
    }
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
    if (data.homebrew) localStorage.setItem('pf1_homebrew', JSON.stringify(data.homebrew))
    if (data.preferences) {
      for (const [k, v] of Object.entries(data.preferences)) localStorage.setItem(k, JSON.stringify(v))
    }
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
              <label className="gist-label">Gruppen-Token eingeben</label>
              <input
                className="gist-token-input"
                type="password"
                placeholder="ghp_xxxxxxxxxxxx"
                value={inputToken}
                onChange={e => setInputToken(e.target.value)}
                autoComplete="off"
                onKeyDown={e => { if (e.key === 'Enter') handleConnect() }}
              />
              <button className="gist-connect-btn" onClick={handleConnect}
                disabled={!inputToken.trim() || working}>
                {working ? 'Verbinde…' : 'Verbinden'}
              </button>
              <p className="gist-create-hint">
                Token neu erstellen: github.com → Settings → Developer Settings → Personal access tokens → Tokens (classic) → nur „gist" ankreuzen
              </p>
            </div>
          )}

          {connected && (
            <div className="gist-actions">
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
