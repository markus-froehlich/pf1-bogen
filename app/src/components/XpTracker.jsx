import { useState } from 'react'
import './XpTracker.css'

// PF1e XP thresholds — index = level-1, value = XP needed to reach that level
const XP_TRACKS = {
  schnell: [0,1300,3300,6000,10000,15000,23000,34000,50000,71000,105000,145000,210000,295000,425000,600000,850000,1200000,1700000,2400000],
  mittel:  [0,2000,5000,9000,15000,23000,35000,51000,75000,105000,155000,220000,315000,440000,635000,890000,1300000,1800000,2550000,3600000],
  langsam: [0,3000,7500,14000,23000,35000,53000,77000,115000,160000,235000,330000,475000,665000,955000,1350000,1900000,2700000,3850000,5350000],
}

function xpLevel(current, thresholds) {
  let lv = 1
  for (let i = 1; i < thresholds.length; i++) {
    if (current >= thresholds[i]) lv = i + 1
    else break
  }
  return Math.min(lv, 20)
}

const fmt = n => n.toLocaleString('de-DE')

export function XpTracker({ char, setXp, totalLevel = 0, lang }) {
  const L = lang === 'de'
  const [addInput, setAddInput] = useState('')

  const xp = char.xp ?? { current: 0, track: 'mittel' }
  const thresholds = XP_TRACKS[xp.track] ?? XP_TRACKS.mittel
  const current    = Number(xp.current) || 0
  const lvFromXp   = xpLevel(current, thresholds)
  const atMax      = lvFromXp >= 20
  const lvStart    = thresholds[lvFromXp - 1]
  const lvEnd      = atMax ? null : thresholds[lvFromXp]
  const progress   = atMax ? 1 : (current - lvStart) / (lvEnd - lvStart)
  const remaining  = atMax ? 0 : lvEnd - current
  const mismatch   = totalLevel > 0 && totalLevel !== lvFromXp

  function handleAdd() {
    const n = parseInt(addInput, 10)
    if (!n || n <= 0) return
    setXp('current', current + n)
    setAddInput('')
  }

  return (
    <div className="xp-tracker">
      <div className="xp-header">
        <span className="xp-label">XP</span>
        <select className="xp-track-sel" value={xp.track}
          onChange={e => setXp('track', e.target.value)}>
          <option value="schnell">{L ? 'Schnell' : 'Fast'}</option>
          <option value="mittel">{L ? 'Mittel' : 'Medium'}</option>
          <option value="langsam">{L ? 'Langsam' : 'Slow'}</option>
        </select>
        <span className={`xp-lv ${mismatch ? 'mismatch' : ''}`}>
          {L ? 'Stufe' : 'Lv'} {lvFromXp}
          {mismatch && <span className="xp-mismatch-icon" title={L ? 'XP-Stufe ≠ Klassenstufe' : 'XP level ≠ class level'}>⚠</span>}
        </span>
      </div>

      {/* Progress bar */}
      <div className="xp-bar-wrap">
        <div className="xp-bar-track">
          <div className="xp-bar-fill" style={{ width: `${Math.min(progress * 100, 100)}%` }} />
        </div>
        <div className="xp-bar-labels">
          <span className="xp-cur-lv">{fmt(lvStart)}</span>
          {!atMax && <span className="xp-next-lv">{fmt(lvEnd)}</span>}
        </div>
      </div>

      {/* Current XP + quick add + remaining — all one row */}
      <div className="xp-row">
        <input
          className="xp-input"
          type="number" min={0}
          value={current}
          onChange={e => setXp('current', Math.max(0, Number(e.target.value) || 0))}
        />
        <span className="xp-unit">XP</span>
        <input
          className="xp-add-input"
          type="number" min={1} placeholder="+XP"
          value={addInput}
          onChange={e => setAddInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button className="xp-add-btn" onClick={handleAdd} disabled={!addInput || Number(addInput) <= 0}>
          +
        </button>
        {!atMax && (
          <span className="xp-remaining">
            {fmt(remaining)} {L ? 'bis Stufe' : 'to lv'} {lvFromXp + 1}
          </span>
        )}
        {atMax && <span className="xp-maxlv">{L ? 'Max. Stufe' : 'Max level'} 🎖</span>}
      </div>
    </div>
  )
}
