import { useState } from 'react'
import './XpTracker.css'
import { XP_TRACKS, xpLevel, FEAT_LEVELS, ATTR_LEVELS } from '../engine/xp.js'

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
  const curFeat    = FEAT_LEVELS.includes(lvFromXp)
  const curAttr    = ATTR_LEVELS.includes(lvFromXp)

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

      {(curFeat || curAttr) && (
        <div className="xp-next-perk">
          {curFeat && <span className="xp-perk-chip">✦ {L ? `Talent auf Stufe ${lvFromXp}` : `Feat at level ${lvFromXp}`}</span>}
          {curAttr && <span className="xp-perk-chip">↑ {L ? `Attributswerterhöhung auf Stufe ${lvFromXp}` : `Attribute increase at level ${lvFromXp}`}</span>}
        </div>
      )}
    </div>
  )
}
