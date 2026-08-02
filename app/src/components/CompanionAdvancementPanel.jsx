import './CompanionAdvancementPanel.css'

const ATTRS = ['ST', 'GE', 'KO', 'IN', 'WE', 'CH']

export function CompanionAdvancementPanel({ rules, onChoicesChange, lang }) {
  if (!rules) return null
  const L = lang === 'de'
  const choices = rules.choices ?? { statChoices: [], abilityChoices: [] }

  function setChoice(group, index, value) {
    const next = [...(choices[group] ?? [])]
    next[index] = value
    onChoicesChange({ ...choices, [group]: next })
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
          <select value={choices.statChoices?.[index] ?? 'ST'} onChange={e => setChoice('statChoices', index, e.target.value)}>
            <option value="ST">ST</option>
            <option value="GE">GE</option>
          </select>
        </label>
      ))}
      {Array.from({ length: rules.abilityIncreaseCount }, (_, index) => (
        <label key={`ability-${index}`}>
          <span>{L ? `Stufe ${[4, 9, 14, 20][index]}: Attribut +1` : `Level ${[4, 9, 14, 20][index]}: Ability +1`}</span>
          <select value={choices.abilityChoices?.[index] ?? 'ST'} onChange={e => setChoice('abilityChoices', index, e.target.value)}>
            {ATTRS.map(attr => <option key={attr} value={attr}>{attr}</option>)}
          </select>
        </label>
      ))}
    </div>
  )
}
