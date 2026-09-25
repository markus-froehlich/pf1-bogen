import { useMemo, useState } from 'react'
import { MagnifyingGlass, Minus, Plus, Shield, ArrowSquareOut } from '@phosphor-icons/react'
import skillsData from '../data/skills.json'
import { computeAllSkills, buildClassSkillSet, usedSkillRanks } from '../engine/skills.js'
import { getConditionMods } from '../engine/conditions.js'
import { buffContributions } from '../engine/buffs.js'
import { CONDITIONS } from '../components/ConditionsPanel.jsx'
import { RefLink } from '../components/RefLink.jsx'
import { Sheet } from '../shell/Sheet.jsx'
import { BreakdownSheet } from '../combat/BreakdownSheet.jsx'
import { sg } from '../combat/breakdown.js'
import { ATTR_NAMES } from '../char/charLogic.js'
import './skills.css'

const SKILLS = skillsData.skills
const ANIMAL_SKILL_IDS = new Set(['akrobatik', 'einschuchtern', 'entfesselungskunst', 'fliegen', 'heimlichkeit', 'klettern', 'schwimmen', 'uberlebenskunst', 'wahrnehmung'])
const ANIMAL_CLASS_SKILL_IDS = new Set(['akrobatik', 'fliegen', 'heimlichkeit', 'klettern', 'schwimmen', 'wahrnehmung'])
const COND_NAME = Object.fromEntries(CONDITIONS.map(c => [c.id, c]))

function skillUrl(name) {
  const base = /^Wissen\s/.test(name) ? 'Wissen' : name
  const slug = base.replace(/ä/g, 'ae').replace(/Ä/g, 'Ae').replace(/ö/g, 'oe').replace(/Ö/g, 'Oe').replace(/ü/g, 'ue').replace(/Ü/g, 'Ue').replace(/ß/g, 'ss').replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '')
  return `http://prd.5footstep.de/Grundregelwerk/Fertigkeiten/${slug}`
}

function skillBreakdown({ def, cv, entry, attrs, char, isClass, lang, instanceName }) {
  const L = lang === 'de'
  const lines = [{ kind: 'base', label: L ? 'Ränge' : 'Ranks', sub: L ? 'Fertigkeitspunkte' : 'Skill points', value: cv.ranks }]
  const baseMod = attrs[def.ability]?.mod ?? 0
  lines.push({ kind: 'attr', label: ATTR_NAMES[def.ability]?.[L ? 0 : 1] ?? def.ability, sub: L ? 'Attribut' : 'Ability', value: baseMod })
  if (cv.abilityMod !== baseMod) lines.push({ kind: 'cond', label: L ? 'Attribut durch Zustand' : 'Ability via condition', sub: L ? 'Zustand · Modifikator' : 'Condition', value: cv.abilityMod - baseMod })
  if (cv.classBonus) lines.push({ kind: 'class', label: L ? 'Klassenfertigkeit' : 'Class skill', sub: L ? '+3 bei mindestens 1 Rang' : '+3 with at least 1 rank', value: 3 })
  if (cv.armorPenalty) lines.push({ kind: 'gear', label: L ? 'Rüstungsmalus' : 'Armor check penalty', sub: L ? 'Ausrüstung' : 'Gear', value: cv.armorPenalty })
  for (const c of buffContributions(char.active_buffs ?? []).skills_all ?? []) {
    lines.push({ kind: 'buff', label: c.name, sub: c.counted ? 'Buff' : (L ? `stapelt nicht mit ${c.suppressedBy}` : 'does not stack'), value: c.counted ? c.value : 0 })
  }
  for (const id of char.conditions ?? []) {
    const m = getConditionMods([id])
    let v = Number(m.skill_penalty ?? 0)
    if (def.ability === 'ST' || def.ability === 'GE') v += Number(m.stge_skill_penalty ?? 0)
    if (def.id === 'wahrnehmung') v += Number(m.perception_penalty ?? 0)
    if (v) lines.push({ kind: 'cond', label: L ? COND_NAME[id]?.de ?? id : COND_NAME[id]?.en ?? id, sub: L ? 'Zustand' : 'Condition', value: v })
  }
  if (cv.misc) lines.push({ kind: 'misc', label: L ? 'Sonstiges' : 'Other', sub: entry?.note || (L ? 'manuell' : 'manual'), value: cv.misc })
  const sum = lines.reduce((a, l) => a + l.value, 0)
  if (sum !== cv.total) lines.push({ kind: 'misc', label: 'Differenz', sub: 'Engine ≠ Summe der Posten', value: cv.total - sum })
  const untrained = def.trained_only && !cv.ranks
  const name = def.name[lang] ?? def.name.de
  return {
    title: instanceName ? `${name} (${instanceName})` : name, total: cv.total, totalLabel: untrained ? '—' : undefined, lines,
    note: untrained ? (L ? 'Nur geübt einsetzbar – ohne Ränge nicht möglich.' : 'Trained only – needs ranks.') : '',
    editable: false,
  }
}

export function SkillsView({ char, attrs, setSkill, setMultiSkill, addSkillSlot, removeSkillSlot, armorCheckPenalty = 0, totalFk = 0,
  skillsBuff = 0, companionRules = null, maxRanks = 20, lang, layout }) {
  const L = lang === 'de'
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('alle')
  const [sheet, setSheet] = useState(null)
  const isCompanion = Boolean(companionRules)
  const canUseAll = Number(attrs.IN?.score ?? 0) >= 3
  const visible = isCompanion && !canUseAll ? SKILLS.filter(d => ANIMAL_SKILL_IDS.has(d.id)) : SKILLS
  const condMods = useMemo(() => getConditionMods(char.conditions), [char.conditions])
  const classSet = useMemo(() => {
    const set = buildClassSkillSet(char, SKILLS)
    if (isCompanion) ANIMAL_CLASS_SKILL_IDS.forEach(id => set.add(id))
    return set
  }, [char, isCompanion])
  const computed = useMemo(() => computeAllSkills(char, attrs, SKILLS, classSet, armorCheckPenalty, condMods.skill_penalty, skillsBuff, condMods),
    [char, attrs, classSet, armorCheckPenalty, condMods, skillsBuff])
  const used = usedSkillRanks(char.skills)
  const left = totalFk - used
  const tone = left < 0 ? 'neg' : left === 0 ? 'ok' : 'warn'

  // Zeilen (Mehrfachfertigkeiten je Instanz)
  const rows = []
  for (const def of visible) {
    if (def.multi) {
      const stored = char.skills?.[def.id]
      const inst = Array.isArray(stored) && stored.length ? stored : Array.from({ length: def.default_slots ?? 1 }, () => ({ name: '', ranks: 0, misc: 0 }))
      inst.forEach((entry, idx) => rows.push({ def, idx, entry, cv: computed[def.id][idx], multi: true, count: inst.length }))
    } else {
      rows.push({ def, entry: char.skills?.[def.id], cv: computed[def.id] })
    }
  }
  const qq = q.trim().toLowerCase()
  const shown = rows.filter(r => {
    const name = `${r.def.name.de} ${r.entry?.name ?? ''}`.toLowerCase()
    if (qq && !name.includes(qq)) return false
    if (filter === 'klasse' && !classSet.has(r.def.id)) return false
    if (filter === 'raenge' && !r.cv.ranks) return false
    return true
  })
  const setRanks = (r, v) => {
    const val = Math.max(0, Math.min(maxRanks, v))
    if (r.multi) setMultiSkill(r.def.id, r.idx, 'ranks', val, r.def.default_slots ?? 1)
    else setSkill(r.def.id, 'ranks', val)
  }
  const condText = condMods.skill_penalty ? (L ? ` · Zustand ${sg(condMods.skill_penalty)} auf alle` : ` · condition ${sg(condMods.skill_penalty)} on all`) : ''

  const open = sheet ? rows.find(r => r.def.id === sheet.id && (r.idx ?? null) === (sheet.idx ?? null)) : null
  const bd = open ? skillBreakdown({ def: open.def, cv: open.cv, entry: open.entry, attrs, char, isClass: classSet.has(open.def.id), lang, instanceName: open.multi ? open.entry?.name : null }) : null
  const setField = (field, value) => (open.multi ? setMultiSkill(open.def.id, open.idx, field, value, open.def.default_slots ?? 1) : setSkill(open.def.id, field, value))

  return (
    <div className="nc-skills">
      <div className="nc-skills-head">
        {totalFk > 0 && (
          <div className="nc-fp">
            <div className="nc-fp-row"><span className="nc-muted">{L ? 'Fertigkeitspunkte' : 'Skill points'}</span>
              <span className={`nc-fp-val is-${tone}`}>{used} / {totalFk} · {left >= 0 ? `${left} ${L ? 'frei' : 'free'}` : `${-left} ${L ? 'zu viel' : 'over'}`}</span></div>
            <div className="nc-fp-bar"><div className={`is-${tone}`} style={{ width: `${Math.min(100, (used / Math.max(1, totalFk)) * 100)}%` }} /></div>
          </div>
        )}
        <div className="nc-search nc-search-plain">
          <MagnifyingGlass />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={L ? 'Fertigkeit suchen' : 'Search skill'} />
        </div>
        <div className="nc-seg is-full">
          {[['alle', L ? 'Alle' : 'All'], ['klasse', L ? 'Klasse' : 'Class'], ['raenge', L ? 'Mit Rängen' : 'Ranked']].map(([k, t]) => (
            <button key={k} className={`nc-seg-opt ${filter === k ? 'is-on' : ''}`} onClick={() => setFilter(k)}>{t}</button>
          ))}
        </div>
        {(armorCheckPenalty < 0 || condText) && (
          <span className="nc-skills-note"><Shield />{armorCheckPenalty < 0 ? (L ? `Rüstungsmalus ${sg(armorCheckPenalty)} auf markierte Fertigkeiten (RM)` : `Armor check penalty ${sg(armorCheckPenalty)} on marked skills`) : ''}{condText}</span>
        )}
      </div>

      <div className="nc-skill-list">
        {shown.map(r => {
          const isClass = classSet.has(r.def.id)
          const untrained = r.def.trained_only && !r.cv.ranks
          const hasCondPenalty = r.cv.condPenalty < 0 || (r.cv.abilityMod < (attrs[r.def.ability]?.mod ?? 0))
          const name = r.multi ? `${r.def.name[lang] ?? r.def.name.de}${r.entry?.name ? ` (${r.entry.name})` : ''}` : (r.def.name[lang] ?? r.def.name.de)
          const key = `${r.def.id}:${r.idx ?? ''}`
          return (
            <div key={key} className="nc-skill-row">
              <button className="nc-skill-name" onClick={() => setSheet({ id: r.def.id, idx: r.idx })}>
                <span className="nc-ellipsis nc-skill-title">{name}</span>
                <span className="nc-skill-meta">
                  <span>{r.def.ability}</span>
                  {isClass && <span className="nc-accent-soft">{L ? 'Klasse' : 'Class'}</span>}
                  {r.def.armor_check_penalty && <span>RM</span>}
                  {r.def.trained_only && <span>{L ? 'geübt' : 'trained'}</span>}
                </span>
              </button>
              <div className="nc-skill-ranks">
                <button className="nc-rank-btn" onClick={() => setRanks(r, r.cv.ranks - 1)} aria-label="−"><Minus /></button>
                <span className={`nc-rank-val ${r.cv.ranks ? '' : 'is-zero'}`}>{r.cv.ranks}</span>
                <button className="nc-rank-btn" onClick={() => setRanks(r, r.cv.ranks + 1)} aria-label="+"><Plus /></button>
              </div>
              <button className={`nc-skill-total ${untrained ? 'is-na' : hasCondPenalty ? 'is-neg' : ''}`} onClick={() => setSheet({ id: r.def.id, idx: r.idx })}>
                {untrained ? '—' : sg(r.cv.total)}
              </button>
            </div>
          )
        })}
        {!shown.length && <span className="nc-empty">{L ? 'Keine Fertigkeit gefunden.' : 'No skill found.'}</span>}
      </div>
      {isCompanion && !canUseAll && <span className="nc-hint">{L ? 'Tiergefährte mit IN unter 3: nur die erlaubten Gefährtenfertigkeiten.' : 'Companion with INT below 3: limited skills.'}</span>}

      <Sheet open={!!open} onClose={() => setSheet(null)} layout={layout} label={bd?.title}>
        {open && <>
          <BreakdownSheet bd={bd} lang={lang} />
          <div className="nc-bd-misc">
            {open.multi && (
              <label className="nc-field"><span>{L ? 'Spezialisierung' : 'Specialty'}</span>
                <input className="nc-input" value={open.entry?.name ?? ''} placeholder={L ? 'z. B. Schreiner' : 'e.g. carpenter'} onChange={e => setField('name', e.target.value)} /></label>
            )}
            <div className="nc-bd-misc-row">
              <span className="nc-bd-text"><span>{L ? 'Sonstiges' : 'Other'}</span><span className="nc-bd-sub">{L ? 'Manueller Bonus oder Malus' : 'Manual bonus or penalty'}</span></span>
              <div className="nc-stepper">
                <button className="nc-step-btn" onClick={() => setField('misc', Number(open.entry?.misc ?? 0) - 1)} aria-label="−"><Minus /></button>
                <span className="nc-step-val">{Number(open.entry?.misc ?? 0) ? sg(Number(open.entry.misc)) : '±0'}</span>
                <button className="nc-step-btn" onClick={() => setField('misc', Number(open.entry?.misc ?? 0) + 1)} aria-label="+"><Plus /></button>
              </div>
            </div>
            <input className="nc-input" value={open.entry?.note ?? ''} onChange={e => setField('note', e.target.value)} placeholder={L ? 'Notiz, z. B. Talent „Fertigkeitsfokus“' : 'Note'} />
            {!isCompanion && !open.multi && (
              <button className={`nc-chip ${char.skills?.[open.def.id]?.is_class ? 'is-on' : ''}`} onClick={() => setSkill(open.def.id, 'is_class', !char.skills?.[open.def.id]?.is_class)}>
                {L ? 'Als Klassenfertigkeit markieren (manuell)' : 'Mark as class skill (manual)'}
              </button>
            )}
          </div>
          <div className="nc-sheet-foot">
            <RefLink className="nc-btn nc-btn-ghost" href={skillUrl(open.def.name.de)} title="prd.5footstep.de"><ArrowSquareOut />{L ? 'Regeln' : 'Rules'}</RefLink>
            {open.multi && (
              <span className="nc-chips">
                <button className="nc-btn nc-btn-ghost" onClick={() => addSkillSlot(open.def.id, open.def.default_slots ?? 1)}><Plus />{L ? `Weitere ${open.def.name.de}` : 'Add another'}</button>
                {open.count > 1 && <button className="nc-btn nc-btn-ghost nc-neg" onClick={() => { removeSkillSlot(open.def.id, open.idx); setSheet(null) }}>{L ? 'Zeile entfernen' : 'Remove row'}</button>}
              </span>
            )}
          </div>
        </>}
      </Sheet>
    </div>
  )
}
