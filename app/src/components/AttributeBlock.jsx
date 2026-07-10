import { CondTag, BuffTag } from './DetailTag.jsx'
import './AttributeBlock.css'

const ATTR_LABELS = {
  de: { ST: 'Stärke', GE: 'Geschick', KO: 'Konstitution', IN: 'Intelligenz', WE: 'Weisheit', CH: 'Charisma' },
  en: { ST: 'Strength', GE: 'Dexterity', KO: 'Constitution', IN: 'Intelligence', WE: 'Wisdom', CH: 'Charisma' },
}

// Only STR/DEX are altered by conditions (erschöpft/entkräftet/gelähmt/ringend)
const ATTR_TO_COND_KEY = { ST: 'str_mod_delta', GE: 'dex_mod_delta' }

export function AttributeBlock({ attrKey, computed, onScoreChange, lang = 'de', condMods = {} }) {
  const { score, buff, buffed, mod } = computed
  const label = ATTR_LABELS[lang]?.[attrKey] ?? attrKey

  const condKey = ATTR_TO_COND_KEY[attrKey]
  const rawDelta = condKey ? (condMods[condKey] ?? 0) : 0
  const effMod = rawDelta ? Math.max(-5, mod + rawDelta) : mod
  const appliedDelta = effMod - mod
  const condInfo = appliedDelta !== 0 ? { total: appliedDelta, sourceIds: condMods.sources?.[condKey] ?? [] } : null
  const modStr = effMod >= 0 ? `+${effMod}` : `${effMod}`

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
      <BuffTag info={buff !== 0 ? { total: buff, title: `Buff → ${buffed}` } : null} />
      <div className="attr-mod-row">
        <div className={`attr-mod ${effMod >= 0 ? 'pos' : 'neg'}`}>{modStr}</div>
        <CondTag info={condInfo} lang={lang} />
      </div>
    </div>
  )
}
