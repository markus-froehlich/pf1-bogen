import { useMemo, useState } from 'react'
import {
  SUMMON_SPELLS, SUMMON_CREATURES, summonOptions, templateForAlignment,
  applySummonTemplate, summonHp, rollCount,
} from '../engine/summons.js'
import { castingStatOf } from '../engine/spellSlots.js'
import './SummonsPanel.css'

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX']
const NATURE_CLASSES = ['druide', 'waldlaeufer']
const ELEMENTS = [['ERD', 'Erde'], ['FEUER', 'Feuer'], ['LUFT', 'Luft'], ['WASSER', 'Wasser']]

function casterInfo(char) {
  const casters = (char.meta?.classes ?? []).filter(entry => entry.id && castingStatOf(entry.id))
  const level = Math.max(1, ...casters.map(entry => Number(entry.level) || 1))
  const onlyNature = casters.length > 0 && casters.every(entry => NATURE_CLASSES.includes(entry.id))
  return { level, listKey: onlyNature ? 'natur' : 'monster' }
}

function newId() { return Math.random().toString(36).slice(2, 10) }

function elementLabel(creature) {
  return ELEMENTS.find(([key]) => creature.name.toUpperCase().includes(`${key}ELEMENTAR`))?.[1] ?? creature.name
}

// ── Werteblock einer Kreatur ──────────────────────────────────────────────────
function CreatureCard({ entry, templateKey, lang, onSummon, countExpr }) {
  const L = lang === 'de'
  const [pick, setPick] = useState(0)
  const [mephit, setMephit] = useState(null)
  const creature = SUMMON_CREATURES[entry.creatures[pick]]
  if (!creature) {
    return <div className="sum-card sum-card-missing">{L ? 'Werte nicht in Monsterhandbuch I/II enthalten.' : 'Stats not in Bestiary I/II.'}</div>
  }
  const template = entry.template && templateKey ? applySummonTemplate(creature, templateKey) : null
  const antVariant = entry.variant && entry.variant !== 'any' ? creature.variants?.[entry.variant] : null
  const mephitVariants = entry.variant === 'any' ? Object.entries(creature.variants ?? {}) : []
  const mephitPick = mephitVariants.find(([name]) => name === mephit)
  const baseHg = template ? template.hg : creature.hg
  const displayName = mephitPick ? mephitPick[0] : creature.name

  return (
    <div className="sum-card">
      {entry.creatures.length > 1 && (
        <div className="sum-chips">
          {entry.creatures.map((id, i) => (
            <button key={id} className={`sum-chip ${i === pick ? 'active' : ''}`} onClick={() => setPick(i)}>
              {elementLabel(SUMMON_CREATURES[id])}
            </button>
          ))}
        </div>
      )}
      {mephitVariants.length > 0 && (
        <div className="sum-chips">
          {mephitVariants.map(([name, v]) => (
            <button key={name} className={`sum-chip ${name === mephit ? 'active' : ''}`} onClick={() => setMephit(name === mephit ? null : name)}>
              {name.replace('mephit', '')} <small>({v.element})</small>
            </button>
          ))}
        </div>
      )}

      <div className="sum-card-head">
        <strong>{displayName}</strong>
        <span className="sum-hg">HG {baseHg}{antVariant && antVariant.hg_delta ? ` ${antVariant.hg_delta > 0 ? '+' : ''}${antVariant.hg_delta}` : ''}</span>
        {template && <span className={`sum-tpl sum-tpl-${template.key}`}>{template.name}</span>}
        <span className="sum-src">{creature.book} S. {creature.page}</span>
      </div>

      {antVariant && <div className="sum-note"><b>{entry.variant}:</b> {antVariant.text}</div>}
      {mephitPick && (
        <ul className="sum-variant-list">
          {mephitPick[1].text.map((line, i) => <li key={i}>{line}</li>)}
        </ul>
      )}
      {mephitVariants.length > 0 && !mephitPick && (
        <div className="sum-note">{L ? 'Art wählen — die Werte unten gelten für alle Mephits.' : 'Pick a kind — base stats below apply to all mephits.'}</div>
      )}

      {template && (
        <div className="sum-template-box">
          <div><b>{L ? 'Sinne' : 'Senses'}</b> + {template.senses}</div>
          <div><b>{L ? 'Resistenzen' : 'Resist'}</b> {template.resist}</div>
          {template.sr && <div><b>SR</b> {template.sr}</div>}
          <div><b>ZR</b> {template.zr}</div>
          <div><b>{L ? 'Bes. Angriff' : 'Special'}</b> {template.smite}</div>
          <div className="sum-template-src">MHB I S. {template.page}</div>
        </div>
      )}

      <dl className="sum-lines">
        {creature.lines.map(([label, value], i) => (
          <div key={i} className="sum-line">
            {label !== 'Typ' && <dt>{label}</dt>}
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {creature.hg_from_ep && <div className="sum-note">{L ? 'HG aus EP abgeleitet (MHB I Tab. 1-7).' : 'CR derived from XP.'}</div>}

      <button className="sum-summon-btn" onClick={() => onSummon(creature, displayName, template, countExpr)}>
        ✦ {L ? `Beschwören (${countExpr})` : `Summon (${countExpr})`}
      </button>
    </div>
  )
}

// ── Aktive Beschwörungen ──────────────────────────────────────────────────────
function ActiveSummons({ summons, setSummons, lang }) {
  const L = lang === 'de'
  if (!summons.length) return null
  const update = (id, fn) => setSummons(list => list.map(s => (s.id === id ? fn(s) : s)))
  return (
    <div className="sum-active">
      <div className="sum-active-head">
        <span>{L ? 'Aktive Beschwörungen' : 'Active summons'}</span>
        <button className="sum-round-btn" onClick={() => setSummons(list => list.map(s => ({ ...s, rounds: Math.max(0, s.rounds - 1) })))}>
          {L ? 'Runde vorbei ↓' : 'End round ↓'}
        </button>
      </div>
      {summons.map(s => (
        <div key={s.id} className={`sum-active-item ${s.rounds === 0 ? 'expired' : ''}`}>
          <div className="sum-active-row">
            <strong>{s.name}{s.hp.length > 1 ? ` ×${s.hp.length}` : ''}</strong>
            {s.template && <span className={`sum-tpl sum-tpl-${s.template}`}>{s.template === 'celestisch' ? 'Cel.' : 'Inf.'}</span>}
            <span className="sum-rounds">
              <button onClick={() => update(s.id, x => ({ ...x, rounds: Math.max(0, x.rounds - 1) }))}>−</button>
              {s.rounds === 0 ? (L ? 'vorbei' : 'expired') : `${s.rounds}/${s.maxRounds} Rd.`}
              <button onClick={() => update(s.id, x => ({ ...x, rounds: Math.min(x.maxRounds, x.rounds + 1) }))}>+</button>
            </span>
            <button className="sum-dismiss" title={L ? 'Entlassen' : 'Dismiss'} onClick={() => setSummons(list => list.filter(x => x.id !== s.id))}>✕</button>
          </div>
          <div className="sum-hp-row">
            {s.hp.map((hp, i) => (
              <span key={i} className={`sum-hp ${hp <= 0 ? 'down' : ''}`}>
                <button onClick={() => update(s.id, x => ({ ...x, hp: x.hp.map((h, j) => (j === i ? h - 1 : h)) }))}>−</button>
                {hp}/{s.hpMax}
                <button onClick={() => update(s.id, x => ({ ...x, hp: x.hp.map((h, j) => (j === i ? Math.min(x.hpMax, h + 1) : h)) }))}>+</button>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Hauptpanel ────────────────────────────────────────────────────────────────
export function SummonsPanel({ char, setSummons, lang }) {
  const L = lang === 'de'
  const caster = useMemo(() => casterInfo(char), [char])
  const [listKey, setListKey] = useState(caster.listKey)
  const [grade, setGrade] = useState(1)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(null)
  const [casterLevel, setCasterLevel] = useState(caster.level)
  const autoTemplate = templateForAlignment(char.bio?.alignment)
  const [neutralPick, setNeutralPick] = useState('celestisch')
  const templateKey = listKey === 'monster' ? (autoTemplate ?? neutralPick) : null
  const summons = char.summons ?? []
  const groups = summonOptions(listKey, grade)
  const q = search.trim().toLowerCase()

  function summon(creature, name, template, countExpr) {
    const count = rollCount(countExpr)
    const hpMax = summonHp(creature)
    setSummons(list => [{
      id: newId(), creatureId: creature.id, name, template: template?.key ?? null,
      hp: Array(count).fill(hpMax), hpMax, rounds: casterLevel, maxRounds: casterLevel,
    }, ...list])
  }

  const spell = SUMMON_SPELLS[listKey]
  return (
    <div className="summons-panel">
      <ActiveSummons summons={summons} setSummons={setSummons} lang={lang} />

      <div className="sum-spell-toggle">
        {['monster', 'natur'].map(key => (
          <button key={key} className={`smt-btn ${listKey === key ? 'active' : ''}`}
            onClick={() => { setListKey(key); setOpen(null) }}>
            {key === 'monster' ? (L ? 'Monster herbeizaubern' : 'Summon Monster') : (L ? 'Verbündete der Natur' : "Nature's Ally")}
          </button>
        ))}
      </div>

      <div className="spell-level-tabs">
        {ROMAN.map((r, i) => (
          <button key={r} className={`lvl-tab ${grade === i + 1 ? 'active' : ''}`} onClick={() => { setGrade(i + 1); setOpen(null) }}>{r}</button>
        ))}
      </div>

      <div className="sum-meta-row">
        <label>{L ? 'Zauberstufe' : 'Caster level'}
          <input type="number" min="1" max="20" value={casterLevel}
            onChange={e => setCasterLevel(Math.max(1, Number(e.target.value) || 1))} />
        </label>
        <span className="sum-duration">{spell.name} {ROMAN[grade - 1]} · {casterLevel} Rd.</span>
        {listKey === 'monster' && (autoTemplate
          ? <span className={`sum-tpl sum-tpl-${autoTemplate}`}>* = {autoTemplate === 'celestisch' ? 'Celestisch' : 'Infernalisch'}</span>
          : (
            <span className="sum-chips inline">
              {['celestisch', 'infernalisch'].map(key => (
                <button key={key} className={`sum-chip ${neutralPick === key ? 'active' : ''}`} onClick={() => setNeutralPick(key)}>
                  * {key === 'celestisch' ? 'Celestisch' : 'Infernalisch'}
                </button>
              ))}
            </span>
          ))}
      </div>

      <input className="spell-search" type="text" placeholder={L ? 'Kreatur suchen…' : 'Search creature…'}
        value={search} onChange={e => setSearch(e.target.value)} />

      {groups.map(group => {
        const entries = group.entries.filter(entry => !q || entry.name.toLowerCase().includes(q))
        if (!entries.length) return null
        const label = group.grades.length > 1 ? `${Math.min(...group.grades)}–${Math.max(...group.grades)}` : group.grades[0]
        return (
          <div key={group.count} className="sum-group">
            <div className="sum-group-head">
              <span className="sum-count">{group.count}</span>
              {L ? (group.count === '1' ? 'Kreatur' : 'Kreaturen derselben Art') : 'creature(s)'} · {L ? 'Liste' : 'list'} {label}
            </div>
            {entries.map(entry => {
              const key = `${entry.grade}:${entry.name}`
              const first = SUMMON_CREATURES[entry.creatures[0]]
              const isOpen = open === key
              return (
                <div key={key} className={`sum-entry ${isOpen ? 'open' : ''}`}>
                  <button className="sum-entry-row" onClick={() => setOpen(isOpen ? null : key)}>
                    <span className="sum-entry-name">{entry.name}{entry.template && listKey === 'monster' ? '*' : ''}</span>
                    {entry.subtype && <span className="sum-subtype">{entry.subtype}</span>}
                    {group.grades.length > 1 && <span className="sum-grade">{entry.grade}</span>}
                    <span className="sum-hg">{first ? `HG ${first.hg}` : '—'}</span>
                  </button>
                  {isOpen && <CreatureCard entry={entry} templateKey={templateKey} lang={lang} onSummon={summon} countExpr={group.count} />}
                </div>
              )
            })}
          </div>
        )
      })}
      <div className="sum-footer">
        {L ? `Quelle: GRW Tab. ${listKey === 'monster' ? '10-1' : '10-2'} (S. ${spell.page}), Werte: Monsterhandbuch I/II.` : 'Source: core rules + bestiaries.'}
      </div>
    </div>
  )
}
