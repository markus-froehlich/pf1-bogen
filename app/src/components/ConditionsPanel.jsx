import { useState, useMemo } from 'react'
import { RefLink } from './RefLink.jsx'
import './ConditionsPanel.css'

// PF1e Verwirrt d%-Tabelle
const CONFUSED_TABLE = [
  { range: '01–25',  de: 'Handelt normal',                    en: 'Act normally' },
  { range: '26–50',  de: 'Tut nichts, lallt verwirrt',        en: 'Do nothing, babbles incoherently' },
  { range: '51–75',  de: 'Fügt sich selbst 1W8+ST-Schaden zu', en: 'Deals 1d8+STR damage to self' },
  { range: '76–100', de: 'Greift nächste Kreatur an',         en: 'Attack nearest creature' },
]
function rollConfusion() {
  return Math.floor(Math.random() * 100) + 1
}
function getConfusionResult(roll) {
  if (roll <= 25)  return CONFUSED_TABLE[0]
  if (roll <= 50)  return CONFUSED_TABLE[1]
  if (roll <= 75)  return CONFUSED_TABLE[2]
  return CONFUSED_TABLE[3]
}

// PF1e Standardzustände mit kurzer Auswirkung
export const CONDITIONS = [
  { id: 'blind',         de: 'Blind',          en: 'Blind',        effect: '−2 RK, kein GE-Bonus, −4 Wahrnehm., 50% Miss' },
  { id: 'geblendet',     de: 'Geblendet',       en: 'Dazzled',      effect: '−1 Angriff, −1 Wahrnehm. (Sehen)' },
  { id: 'verwirrt',      de: 'Verwirrt',        en: 'Confused',     effect: 'zufällige Aktionen' },
  { id: 'benommen',      de: 'Benommen',        en: 'Dazed',        effect: 'keine Aktionen' },
  { id: 'beschaedigt',   de: 'Beschädigt',      en: 'Broken',       effect: 'Waffe −2 Angriff/Schaden; Rüstung/Schild RK-Bonus halbiert; 75% Wert' },
  { id: 'blutung',       de: 'Blutung',         en: 'Bleed',        effect: 'Schaden zu Rundenbeginn, bis Heilkunde SG 15 o. Heilzauber' },
  { id: 'koerperlos',    de: 'Körperlos',       en: 'Incorporeal',  effect: 'immun geg. nichtmagische Angriffe, 50% Schaden von Magischem' },
  { id: 'taub',          de: 'Taub',            en: 'Deafened',     effect: '−4 Init, 20% Zauberversagen (verbal)' },
  { id: 'sterbend',      de: 'Im Sterben',      en: 'Dying',        effect: 'bewusstlos, −1 TP/Rd' },
  { id: 'erschoepft',    de: 'Erschöpft',       en: 'Fatigued',     effect: '−2 ST & GE, kein Rennen/Ansturm' },
  { id: 'ermuedtet',     de: 'Entkräftet',      en: 'Exhausted',    effect: '−6 ST & GE, halbe Bewegung, kein Rennen/Ansturm' },
  { id: 'verängstigt',   de: 'Verängstigt',     en: 'Frightened',   effect: '−2 Angriff/RW/Fertigk./Attributswürfe, muss fliehen' },
  { id: 'festgehalten',  de: 'Ringend',         en: 'Grappled',     effect: '−4 GE, −2 Angriff, kein Bewegen' },
  { id: 'hilflos',       de: 'Hilflos',         en: 'Helpless',     effect: 'GE=0, Gnadenangriffe möglich' },
  { id: 'unsichtbar',    de: 'Unsichtbar',       en: 'Invisible',    effect: '+2 Angriff, Gegner verliert GE-Bonus auf RK' },
  { id: 'gelähmt',       de: 'Gelähmt',         en: 'Paralyzed',    effect: 'ST & GE effektiv 0, hilflos' },
  { id: 'panisch',       de: 'Panisch',         en: 'Panicked',     effect: '−2 RW/Fertigk./Attributswürfe, muss fliehen, lässt Sachen fallen' },
  { id: 'niedergestreckt', de: 'Liegend',       en: 'Prone',        effect: '−4 Nahkampf-Angr., RK +4 vs. Fern/−4 vs. Nah' },
  { id: 'schütteln',     de: 'Erschüttert',     en: 'Shaken',       effect: '−2 Angriff/RW/Fertigk./Attributswürfe' },
  { id: 'krank',         de: 'Kränkelnd',       en: 'Sickened',     effect: '−2 Angriff/Schaden/RW/Fertigk./Attributswürfe' },
  { id: 'taumelnd',      de: 'Wankend',         en: 'Staggered',    effect: 'nur 1 Standard- oder Bewegungsaktion' },
  { id: 'betäubt',       de: 'Betäubt',         en: 'Stunned',      effect: 'keine Aktionen, −2 RK, kein GE-Bonus, lässt Sachen fallen' },
  { id: 'bewusstlos',    de: 'Bewusstlos',      en: 'Unconscious',  effect: 'hilflos' },
  { id: 'flachfuss',     de: 'Auf dem falschen Fuß erwischt', en: 'Flat-Footed', effect: 'kein GE-Bonus auf RK, keine Gelegenheitsangriffe' },
  { id: 'fasziniert',    de: 'Fasziniert',      en: 'Fascinated',   effect: 'reagiert nicht auf Umgebung, −4 auf Reaktions-Fertigkeitswürfe' },
  { id: 'haltegriff',    de: 'Im Haltegriff',   en: 'Pinned',       effect: 'kein GE-Bonus auf RK, zusätzlich −4 RK, keine Bewegung' },
  { id: 'kampfunfaehig', de: 'Kampfunfähig',    en: 'Disabled',     effect: '0/negative TP, nur Bewegungs- ODER Standardaktion, halbe Bewegung' },
  { id: 'kauernd',       de: 'Kauernd',         en: 'Cowering',     effect: '−2 RK, kein GE-Bonus, keine Handlungen' },
  { id: 'lebenskraftverlust', de: 'Lebenskraftverlust', en: 'Energy Drain', effect: 'negative Stufen, Tod bei ≥ Trefferwürfel' },
  { id: 'stabilisiert',  de: 'Stabilisiert',    en: 'Stable',       effect: 'nicht mehr sterbend, aber weiter bewusstlos' },
  { id: 'tot',           de: 'Tot',             en: 'Dead',         effect: 'keine Handlungen, nur durch Magie wiederbelebbar' },
  { id: 'uebelkeit',     de: 'Übelkeit',        en: 'Nauseated',    effect: 'nur 1 Bewegungsaktion, kein Angriff/Zauber/Konzentr.' },
  { id: 'versteinert',   de: 'Versteinert',     en: 'Petrified',    effect: 'zu Stein verwandelt, gilt als bewusstlos' },
  { id: 'verstrickt',    de: 'Verstrickt',      en: 'Entangled',    effect: '−2 Angriff, −4 GE, halbe Bewegung, kein Rennen/Ansturm' },
  { id: 'verlangsamt',   de: 'Verlangsamt',     en: 'Slowed',       effect: '−1 Angriff/RK/Reflex, eine Aktion weniger' },
  { id: 'gehast',        de: 'Gehetzt',         en: 'Hasted',       effect: '+1 Angriff/RK/Reflex, Zusatzangriff, +9m Bew.' },
  { id: 'gesegnet',      de: 'Gesegnet',        en: 'Blessed',      effect: '+1 Angriff & RW' },
]

export function ConditionsPanel({ char, setConditions, lang, hideTitle = false }) {
  const L = lang === 'de'
  const active = new Set(char.conditions ?? [])
  const [confusionRoll, setConfusionRoll] = useState(null)
  const sortedConditions = useMemo(
    () => [...CONDITIONS].sort((a, b) => (L ? a.de : a.en).localeCompare(L ? b.de : b.en, L ? 'de' : 'en')),
    [L]
  )

  function toggle(id) {
    setConditions(prev => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return [...s]
    })
  }

  const activeCount = active.size

  return (
    <div className="cond-panel">
      <div className="cond-header">
        {!hideTitle && <span className="cond-title">{L ? 'Zustände' : 'Conditions'}</span>}
        {activeCount > 0 && (
          <span className="cond-active-badge">{activeCount} {L ? 'aktiv' : 'active'}</span>
        )}
        <RefLink className="cond-ref-link" href="http://prd.5footstep.de/Grundregelwerk/Anhang/Zustaende"
          title={L ? 'Regelreferenz Zustände' : 'Conditions reference'}>?</RefLink>
      </div>
      <div className="cond-grid">
        {sortedConditions.map(c => {
          const isActive = active.has(c.id)
          return (
            <button
              key={c.id}
              className={`cond-chip ${isActive ? 'active' : ''}`}
              onClick={() => toggle(c.id)}
              title={c.effect}
            >
              {L ? c.de : c.en}
            </button>
          )
        })}
      </div>
      {activeCount > 0 && (
        <div className="cond-active-list">
          {sortedConditions.filter(c => active.has(c.id)).map(c => (
            <div key={c.id} className="cond-effect-row">
              <span className="cond-effect-name">{L ? c.de : c.en}</span>
              <span className="cond-effect-text">{c.effect}</span>
            </div>
          ))}

          {/* Verwirrt: d%-Würfelhelfer */}
          {active.has('verwirrt') && (
            <div className="cond-confused-panel">
              <div className="cond-confused-header">
                <span>{L ? 'Verwirrt — Aktion je Runde (W%)' : 'Confused — Action per round (d%)'}</span>
                <div className="cond-roll-controls">
                  <input
                    className="cond-roll-input"
                    type="number" min={1} max={100}
                    placeholder="1–100"
                    value={confusionRoll ?? ''}
                    onChange={e => {
                      const v = Math.min(100, Math.max(1, Number(e.target.value) || 1))
                      if (e.target.value === '') setConfusionRoll(null)
                      else setConfusionRoll(v)
                    }}
                  />
                  <button className="cond-roll-btn" onClick={() => setConfusionRoll(rollConfusion())}>
                    {L ? '🎲' : '🎲'}
                  </button>
                </div>
              </div>
              {confusionRoll != null && (
                <div className="cond-confused-result">
                  <span className="cond-roll-num">{confusionRoll}</span>
                  <span className="cond-roll-text">
                    {L ? getConfusionResult(confusionRoll).de : getConfusionResult(confusionRoll).en}
                  </span>
                </div>
              )}
              <div className="cond-confused-table">
                {CONFUSED_TABLE.map((row, i) => (
                  <div key={i} className={`cond-ct-row ${confusionRoll != null && getConfusionResult(confusionRoll) === row ? 'highlight' : ''}`}>
                    <span className="cond-ct-range">{row.range}</span>
                    <span className="cond-ct-text">{L ? row.de : row.en}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
