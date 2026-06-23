import './AttributeBlock.css'

const ATTR_LABELS = {
  de: { ST: 'Stärke', GE: 'Geschick', KO: 'Konstitution', IN: 'Intelligenz', WE: 'Weisheit', CH: 'Charisma' },
  en: { ST: 'Strength', GE: 'Dexterity', KO: 'Constitution', IN: 'Intelligence', WE: 'Wisdom', CH: 'Charisma' },
}

export function AttributeBlock({ attrKey, computed, onScoreChange, lang = 'de' }) {
  const { score, buff, buffed, mod } = computed
  const label = ATTR_LABELS[lang]?.[attrKey] ?? attrKey
  const modStr = mod >= 0 ? `+${mod}` : `${mod}`

  return (
    <div className="attr-block">
      <div className="attr-label">
        <div className="attr-abbr">{attrKey}</div>
        <div className="attr-name">{label}</div>
      </div>
      <input
        className="attr-score"
        type="number"
        min={1} max={50}
        value={score}
        onChange={e => onScoreChange(attrKey, e.target.value)}
      />
      {buff !== 0 && (
        <div className="attr-buff" title={`Buff: ${buff > 0 ? '+' : ''}${buff} → ${buffed}`}>
          ✦{buff > 0 ? `+${buff}` : buff}
        </div>
      )}
      <div className={`attr-mod ${mod >= 0 ? 'pos' : 'neg'}`}>{modStr}</div>
    </div>
  )
}
