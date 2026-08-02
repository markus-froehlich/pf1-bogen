import './CompanionAdvancementPanel.css'

const ATTRS = ['ST', 'GE', 'KO', 'IN', 'WE', 'CH']

export function CompanionAdvancementPanel({ rules, tricks = [], onChoicesChange, onTricksChange, lang }) {
  if (!rules) return null
  const L = lang === 'de'
  const choices = rules.choices ?? { statChoices: [], abilityChoices: [] }

  function setChoice(group, index, value) {
    const next = [...(choices[group] ?? [])]
    next[index] = value
    onChoicesChange({ ...choices, [group]: next })
  }
  function setTrick(index, value) {
    const next = [...tricks]
    next[index] = value
    onTricksChange(next)
  }

  return (
    <div className="companion-advancements">
      <div className="companion-advancements-head">
        <span>{L ? 'GEFÄHRTEN-AUFSTIEGE' : 'COMPANION ADVANCEMENTS'}</span>
        <small>{L ? `Stufe ${rules.level}` : `Level ${rules.level}`}</small>
      </div>
      {Array.from({ length: rules.statBonusCount }, (_, index) => (
        <label key={`stat-${index}`}>
          <span>{L ? `Stufe ${index === 0 ? 3 : 6}: ST oder GE` : `Level ${index === 0 ? 3 : 6}: STR or DEX`}</span>
          <select value={choices.statChoices?.[index] ?? ''} onChange={e => setChoice('statChoices', index, e.target.value)}>
            <option value="">{L ? 'Auswählen…' : 'Choose…'}</option>
            <option value="ST">ST</option>
            <option value="GE">GE</option>
          </select>
        </label>
      ))}
      {Array.from({ length: rules.abilityIncreaseCount }, (_, index) => (
        <label key={`ability-${index}`}>
          <span>{L ? `Stufe ${[4, 9, 14, 20][index]}: Attribut +1` : `Level ${[4, 9, 14, 20][index]}: Ability +1`}</span>
          <select value={choices.abilityChoices?.[index] ?? ''} onChange={e => setChoice('abilityChoices', index, e.target.value)}>
            <option value="">{L ? 'Auswählen…' : 'Choose…'}</option>
            {ATTRS.map(attr => <option key={attr} value={attr}>{attr}</option>)}
          </select>
        </label>
      ))}
      {rules.tricks > 0 && (
        <div className="companion-tricks">
          <div className="companion-tricks-label">{L ? `Bonustricks (${tricks.filter(Boolean).length}/${rules.tricks})` : `Bonus tricks (${tricks.filter(Boolean).length}/${rules.tricks})`}</div>
          {Array.from({ length: rules.tricks }, (_, index) => (
            <input key={`trick-${index}`} value={tricks[index] ?? ''}
              onChange={e => setTrick(index, e.target.value)}
              placeholder={L ? `Trick ${index + 1}` : `Trick ${index + 1}`} />
          ))}
        </div>
      )}
    </div>
  )
}
