import { useMemo } from 'react'
import skillsData from '../data/skills.json'
import { computeAllSkills, buildClassSkillSet } from '../engine/skills.js'
import { getConditionMods } from '../engine/conditions.js'
import { condAnnot, CondTag } from './DetailTag.jsx'
import './SkillsTab.css'

const SKILLS = skillsData.skills
const fmtBonus = n => n >= 0 ? `+${n}` : `${n}`

function toSkillSlug(name) {
  // "Wissen Adel", "Wissen Arkanes" etc. all share one PRD page → strip subtype
  const base = /^Wissen\s/.test(name) ? 'Wissen' : name
  return base
    .replace(/ä/g,'ae').replace(/Ä/g,'Ae').replace(/ö/g,'oe').replace(/Ö/g,'Oe')
    .replace(/ü/g,'ue').replace(/Ü/g,'Ue').replace(/ß/g,'ss')
    .replace(/\s+/g,'').replace(/[^a-zA-Z0-9]/g,'')
}
function SkillLink({ name }) {
  const url = `http://prd.5footstep.de/Grundregelwerk/Fertigkeiten/${toSkillSlug(name)}`
  return (
    <a className="skill-ref-link" href={url} target="_blank" rel="noreferrer"
      onClick={e => e.stopPropagation()} title="prd.5footstep.de">↗</a>
  )
}

export function SkillsTab({ char, attrs, setSkill, armorCheckPenalty = 0, totalFk = 0, usedFk = 0, skillsBuff = 0, lang }) {
  const L = lang === 'de'

  const condMods = useMemo(() => getConditionMods(char.conditions), [char.conditions])
  const condSkillPenalty = condMods.skill_penalty
  const classSkillSet = useMemo(() => buildClassSkillSet(char, SKILLS), [char])
  const computed = useMemo(
    () => computeAllSkills(char, attrs, SKILLS, classSkillSet, armorCheckPenalty, condSkillPenalty, skillsBuff, condMods),
    [char, attrs, classSkillSet, armorCheckPenalty, condSkillPenalty, skillsBuff, condMods]
  )

  const remainingFk = totalFk - usedFk

  return (
    <div className="skills-tab">
      <div className="skills-sticky-head">
        {totalFk > 0 && (
          <div className={`fk-budget ${remainingFk < 0 ? 'over' : remainingFk === 0 ? 'done' : ''}`}>
            <span className="fk-label">{L ? 'FP-Budget' : 'Skill Points'}</span>
            <span className="fk-used">{usedFk}</span>
            <span className="fk-sep">/</span>
            <span className="fk-total">{totalFk}</span>
            <span className={`fk-remain ${remainingFk < 0 ? 'neg' : ''}`}>
              ({remainingFk >= 0 ? '+' : ''}{remainingFk} {L ? 'frei' : 'free'})
            </span>
          </div>
        )}
        <div className="skills-header">
        <span className="sh-cs" title={L ? 'Klassenfertigkeit' : 'Class Skill'}>K</span>
        <span className="sh-name">{L ? 'Fertigkeit' : 'Skill'}</span>
        <span className="sh-ability">{L ? 'Attr.' : 'Abil.'}</span>
        <span className="sh-ranks">{L ? 'Ränge' : 'Ranks'}</span>
        <span className="sh-misc">{L ? 'Sonst.' : 'Misc'}</span>
        <span className="sh-total">{L ? 'Gesamt' : 'Total'}</span>
        </div>
      </div>

      <div className="skills-list">
        {SKILLS.map(def => {
          const isClass = classSkillSet.has(def.id)
          const isClassOverride = char.skills?.[def.id]?.is_class ?? false
          const cv = computed[def.id]
          const ranks = char.skills?.[def.id]?.ranks ?? 0

          return (
            <div key={def.id} className={`skill-row ${isClass ? 'is-class' : ''}`}>
              <button
                className={`sk-cs-btn ${isClass ? 'active' : ''}`}
                onClick={() => setSkill(def.id, 'is_class', !isClassOverride)}
                title={L ? 'Klassenfertigkeit umschalten' : 'Toggle class skill'}
              >
                {isClass ? '◆' : '◇'}
              </button>
              <span className="sk-name">
                {def.name[lang] ?? def.name.de}
                {def.trained_only && <sup className="sk-t" title="Nur geübt einsetzbar">Ü</sup>}
                {def.armor_check_penalty && armorCheckPenalty < 0 && (
                  <sup className="sk-ap" title={`Rüstungsmalus ${armorCheckPenalty}`}>{armorCheckPenalty}</sup>
                )}
                <SkillLink name={def.name.de} />
              </span>
              <span className="sk-ability">{def.ability}</span>
              <input
                className="sk-ranks"
                type="number" min={0} max={20}
                value={ranks}
                onChange={e => setSkill(def.id, 'ranks', e.target.value)}
              />
              <input
                className="sk-misc"
                type="number"
                value={char.skills?.[def.id]?.misc ?? 0}
                onChange={e => setSkill(def.id, 'misc', e.target.value)}
              />
              <span className={`sk-total ${def.trained_only && ranks === 0 ? 'sk-untrained' : cv.total >= 0 ? 'pos' : 'neg'}`}>
                {def.trained_only && ranks === 0 ? '—' : fmtBonus(cv.total)}
              </span>
            </div>
          )
        })}
      </div>

      {armorCheckPenalty < 0 && (
        <p className="skills-armor-note">
          {L ? `Rüstungsmalus ${armorCheckPenalty} auf markierte Fertigkeiten` : `Armor check penalty ${armorCheckPenalty} on marked skills`}
        </p>
      )}
      {condSkillPenalty < 0 && (
        <p className="skills-armor-note">
          {L ? `Zustandsmalus ${condSkillPenalty} auf alle Fertigkeiten` : `Condition penalty ${condSkillPenalty} on all skills`}
        </p>
      )}
      <p className="skills-note">
        {L
          ? '◆ = Klassenfertigkeit (+3 wenn Ränge > 0)  ·  Ü = Nur geübt einsetzbar'
          : '◆ = Class skill (+3 if ranks > 0)  ·  Ü = Trained only'}
      </p>
    </div>
  )
}
