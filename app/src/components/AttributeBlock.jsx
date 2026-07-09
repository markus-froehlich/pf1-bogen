import { CondTag } from './DetailTag.jsx'
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
  const effMod = condKey ? Math.max(-5, mod + (condMods[condKey] ?? 0)) : mod
  const condInfo = condKey ? condAnnot({ [condKey + '_applied']: effMod - mod, sources: { [condKey + '_applied']: condMods.sources?.[condKey] ?? [] } }, condKey + '_applied') : null
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
      {buff !== 0 && (
        <div className="attr-buff" title={`Buff: ${buff > 0 ? '+' : ''}${buff} → ${buffed}`}>
          ✦{buff > 0 ? `+${buff}` : buff}
        </div>
      )}
      <div className="attr-mod-row">
        <div className={`attr-mod ${effMod >= 0 ? 'pos' : 'neg'}`}>{modStr}</div>
        <CondTag info={condInfo} lang={lang} />
      </div>
    </div>
  )
}
