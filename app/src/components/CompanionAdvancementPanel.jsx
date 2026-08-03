import './CompanionAdvancementPanel.css'

export function CompanionAdvancementPanel({ rules, tricks = [], onTricksChange, lang }) {
  if (!rules) return null
  const L = lang === 'de'

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
