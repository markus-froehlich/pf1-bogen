import { useState } from 'react'

const RECENT_KEY = 'pf1_pad_recent'
function loadRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]').filter(Number.isFinite) } catch { return [] }
}

/**
 * Zahlenfeld-Sheet (README „Trefferpunkte" / „Zahlenfeld"): optionales Modus-Segment,
 * Schnellwerte (zuletzt benutzt + 1/5/10), Tastenfeld 3×4, Bestätigen mit Klartext.
 */
export function NumberPad({ modes, mode, onMode, hint, cta, onCommit, quick = true, maxLen = 5, lang }) {
  const L = lang === 'de'
  const [pad, setPad] = useState('')
  const [recent, setRecent] = useState(loadRecent)
  const value = Number(pad) || 0
  const chips = [...new Set([...recent, 1, 5, 10])].slice(0, 5)
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫']

  function press(k) {
    setPad(p => (k === 'C' ? '' : k === '⌫' ? p.slice(0, -1) : (p + k).replace(/^0+(?=\d)/, '').slice(0, maxLen)))
  }
  function commit() {
    if (!value) return onCommit(0)
    const next = [value, ...recent.filter(x => x !== value)].slice(0, 3)
    setRecent(next)
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)) } catch { /* privat */ }
    onCommit(value)
  }

  return (
    <div className="nc-pad">
      {modes && (
        <div className="nc-seg is-full">
          {modes.map(([id, label]) => (
            <button key={id} className={`nc-seg-opt ${mode === id ? 'is-on' : ''}`} onClick={() => onMode(id)}>{label}</button>
          ))}
        </div>
      )}
      <div className="nc-pad-display">
        <span className="nc-pad-hint">{hint}</span>
        <span className={`nc-pad-value ${value ? '' : 'is-empty'}`}>{pad || '0'}</span>
      </div>
      {quick && (
        <div className="nc-pad-quick">
          {chips.map(v => (
            <button key={v} className={`nc-chip ${pad === String(v) ? 'is-on' : ''}`} onClick={() => setPad(String(v))}>{v}</button>
          ))}
        </div>
      )}
      <div className="nc-pad-keys">
        {keys.map(k => (
          <button key={k} className="nc-pad-key" onClick={() => press(k)} aria-label={k === '⌫' ? (L ? 'Löschen' : 'Backspace') : k}>{k}</button>
        ))}
      </div>
      <button className="nc-btn nc-btn-primary nc-pad-cta" onClick={commit} disabled={!value}>
        {value ? cta(value) : (L ? 'Betrag eingeben' : 'Enter amount')}
      </button>
    </div>
  )
}
