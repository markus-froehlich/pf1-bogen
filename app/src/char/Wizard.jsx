import { useMemo, useState } from 'react'
import { Check, Minus, Plus } from '@phosphor-icons/react'
import racialTraitsData from '../data/racial_traits.json'
import { ALL_CLASSES, abilityMod } from '../engine/index.js'
import { sg } from '../combat/breakdown.js'
import { ATTR_NAMES, POINT_BUY, POINT_BUY_BUDGETS, classProfile } from './charLogic.js'

const ATTRS = ['ST', 'GE', 'KO', 'IN', 'WE', 'CH']
const TRAITS = racialTraitsData.by_race ?? {}

/**
 * Charakter-Assistent (README „Charakter anlegen"): 1 Name + Spieler · 2 Volk · 3 Klasse ·
 * 4 Attribute per Kaufsystem (GRW Tab. 1-1/1-2), Volksmods automatisch, Wahl-Bonus +2.
 */
export function Wizard({ races, hbClasses = [], defaultPlayer = '', onCreate, onCancel, lang }) {
  const L = lang === 'de'
  const [step, setStep] = useState(0)
  const [w, setW] = useState({ name: '', player: defaultPlayer, race: null, choice: null, cls: null, pb: 15, at: { ST: 10, GE: 10, KO: 10, IN: 10, WE: 10, CH: 10 } })
  const set = patch => setW(prev => ({ ...prev, ...patch }))
  // funktional: schnelles Mehrfachtippen darf keine Schritte verlieren
  const stepAttr = (k, d) => setW(prev => ({ ...prev, at: { ...prev.at, [k]: Math.max(7, Math.min(18, prev.at[k] + d)) } }))
  const classes = useMemo(() => [...ALL_CLASSES, ...hbClasses].filter(c => c.progression?.length), [hbClasses])
  const race = races.find(r => r.id === w.race)
  const floating = race && race.ability_mod_floating != null && !Object.keys(race.ability_mods ?? {}).length
  const raceMods = race ? (floating ? (w.choice ? { [w.choice]: 2 } : {}) : race.ability_mods ?? {}) : {}
  const spent = ATTRS.reduce((a, k) => a + POINT_BUY[w.at[k]], 0)
  const left = w.pb - spent
  const steps = L ? ['Grunddaten', 'Volk', 'Klasse', 'Attribute'] : ['Basics', 'Race', 'Class', 'Abilities']
  const nextOff = (step === 0 && !w.name.trim()) || (step === 1 && !w.race) || (step === 2 && !w.cls) || (step === 3 && (left < 0 || (floating && !w.choice)))

  function create() {
    const attributes = Object.fromEntries(ATTRS.map(k => [k, w.at[k] + (raceMods[k] ?? 0)]))
    onCreate({ meta: { name: w.name.trim(), player: w.player.trim(), race: w.race, level: 1, classes: [{ id: w.cls, level: 1 }], domains: [] }, attributes })
  }

  return (
    <div className="nc-wiz">
      <div className="nc-wiz-head">
        <span className="nc-sheet-title">{L ? 'Neuer Charakter' : 'New character'}</span>
        <div className="nc-wiz-bars">{steps.map((_, i) => <span key={i} className={i <= step ? 'is-on' : ''} />)}</div>
        <span className="nc-hint">{L ? `Schritt ${step + 1} von 4 · ${steps[step]}` : `Step ${step + 1} of 4 · ${steps[step]}`}</span>
      </div>

      {step === 0 && (
        <div className="nc-gap nc-col">
          <label className="nc-field"><span>{L ? 'Charaktername' : 'Character name'}</span>
            <input className="nc-input" value={w.name} onChange={e => set({ name: e.target.value })} placeholder={L ? 'z. B. Thorwald Eisenfaust' : 'e.g. Thorwald'} autoFocus /></label>
          <label className="nc-field"><span>{L ? 'Spielende Person' : 'Player'}</span>
            <input className="nc-input" value={w.player} onChange={e => set({ player: e.target.value })} /></label>
          <span className="nc-hint">{L ? 'Alles lässt sich später ändern. Import einer JSON-Datei: Mehr → Daten → Importieren.' : 'Everything can be changed later.'}</span>
        </div>
      )}

      {step === 1 && (
        <div className="nc-pick-list">
          {races.map(r => {
            const on = w.race === r.id
            const traits = (TRAITS[r.id] ?? []).map(t => t.trait).slice(0, 4).join(', ')
            return (
              <button key={r.id} className={`nc-pick-row ${on ? 'is-on' : ''}`} onClick={() => set({ race: r.id, choice: null })}>
                <span className="nc-row-text">
                  <span className="nc-pick-name">{r.name?.de ?? r.id}</span>
                  <span className="nc-row-sub">{r.size?.de} · {r.speed_m?.unarmored ?? '—'} m · {r.ability_mods_text?.de ?? '—'}</span>
                  {traits && <span className="nc-pick-traits nc-ellipsis">{traits}</span>}
                </span>
                {on && <Check className="nc-accent" />}
              </button>
            )
          })}
        </div>
      )}

      {step === 2 && (
        <div className="nc-pick-list">
          {classes.map(c => {
            const on = w.cls === c.id
            return (
              <button key={c.id} className={`nc-pick-row ${on ? 'is-on' : ''}`} onClick={() => set({ cls: c.id })}>
                <span className="nc-row-text"><span className="nc-pick-name">{c.name?.de ?? c.id}</span><span className="nc-row-sub">{classProfile(c, lang).text}</span></span>
                {on && <Check className="nc-accent" />}
              </button>
            )
          })}
        </div>
      )}

      {step === 3 && (
        <div className="nc-gap nc-col">
          <div className="nc-seg is-full">
            {POINT_BUY_BUDGETS.map(([v, label]) => (
              <button key={v} className={`nc-seg-opt ${w.pb === v ? 'is-on' : ''}`} onClick={() => set({ pb: v })} title={label}>{v}</button>
            ))}
          </div>
          <span className={`nc-wiz-left ${left < 0 ? 'is-neg' : left === 0 ? 'is-ok' : 'is-warn'}`}>
            {left >= 0 ? (L ? `${left} Punkte übrig` : `${left} points left`) : (L ? `${-left} Punkte zu viel` : `${-left} points over`)}
            <span className="nc-hint"> · {POINT_BUY_BUDGETS.find(b => b[0] === w.pb)?.[1]}</span>
          </span>
          {floating && (
            <div className="nc-edit-field"><span className="nc-edit-label">{L ? 'Volksbonus +2 auf' : 'Racial +2 to'}</span>
              <div className="nc-chips">{ATTRS.map(k => <button key={k} className={`nc-chip ${w.choice === k ? 'is-on' : ''}`} onClick={() => set({ choice: k })}>{k}</button>)}</div></div>
          )}
          <div className="nc-pick-list">
            {ATTRS.map(k => {
              const base = w.at[k], r = raceMods[k] ?? 0, fin = base + r
              return (
                <div key={k} className="nc-wiz-attr">
                  <span className="nc-row-text"><span className="nc-pick-name">{k}</span><span className="nc-row-sub">{ATTR_NAMES[k][L ? 0 : 1]} · {POINT_BUY[base]} P</span></span>
                  <button className="nc-step-btn" onClick={() => stepAttr(k, -1)} aria-label="−"><Minus /></button>
                  <span className="nc-step-val">{base}</span>
                  <button className="nc-step-btn" onClick={() => stepAttr(k, 1)} aria-label="+"><Plus /></button>
                  <span className="nc-wiz-final"><span>{fin} <small className="nc-accent-soft">{sg(abilityMod(fin))}</small></span>{r ? <small className="nc-accent-soft">{sg(r)} {L ? 'Volk' : 'race'}</small> : null}</span>
                </div>
              )
            })}
          </div>
          <span className="nc-hint">{L ? 'Kaufsystem (GRW Tabelle 1-1): 7 = −4 · 10 = 0 · 14 = 5 · 16 = 10 · 18 = 17 Punkte.' : 'Point buy (core table 1-1).'}</span>
        </div>
      )}

      <div className="nc-edit-actions">
        <button className="nc-btn nc-btn-secondary" onClick={() => (step ? setStep(step - 1) : onCancel())}>{step ? (L ? 'Zurück' : 'Back') : (L ? 'Abbrechen' : 'Cancel')}</button>
        <button className="nc-btn nc-btn-primary" disabled={nextOff} onClick={() => (step < 3 ? setStep(step + 1) : create())}>
          {step === 3 ? (L ? 'Charakter anlegen' : 'Create character') : (L ? 'Weiter' : 'Next')}
        </button>
      </div>
    </div>
  )
}
