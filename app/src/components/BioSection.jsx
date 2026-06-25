import './BioSection.css'

const ALIGNMENTS = [
  { id: 'rg', de: 'Rechtschaffen Gut',     en: 'Lawful Good'     },
  { id: 'ng', de: 'Neutral Gut',           en: 'Neutral Good'    },
  { id: 'cg', de: 'Chaotisch Gut',         en: 'Chaotic Good'    },
  { id: 'rn', de: 'Rechtschaffen Neutral', en: 'Lawful Neutral'  },
  { id: 'n',  de: 'Neutral',               en: 'True Neutral'    },
  { id: 'cn', de: 'Chaotisch Neutral',     en: 'Chaotic Neutral' },
  { id: 'rb', de: 'Rechtschaffen Böse',    en: 'Lawful Evil'     },
  { id: 'nb', de: 'Neutral Böse',          en: 'Neutral Evil'    },
  { id: 'cb', de: 'Chaotisch Böse',        en: 'Chaotic Evil'    },
]

function autoResize(el) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

export function BioSection({ char, setBio, lang }) {
  const L = lang === 'de'
  const bio = char.bio ?? {}

  return (
    <div className="bio-section">
      {/* Kampagne */}
      <div className="bio-field">
        <label className="bio-label">{L ? 'Kampagne' : 'Campaign'}</label>
        <input
          className="bio-input"
          placeholder={L ? 'Kampagnenname …' : 'Campaign name …'}
          value={bio.campaign ?? ''}
          onChange={e => setBio('campaign', e.target.value)}
        />
      </div>

      {/* Grunddaten row 1: Gesinnung + Gottheit */}
      <div className="bio-row-2">
        <div className="bio-field">
          <label className="bio-label">{L ? 'Gesinnung' : 'Alignment'}</label>
          <select
            className="bio-select"
            value={bio.alignment ?? ''}
            onChange={e => setBio('alignment', e.target.value)}
          >
            <option value="">—</option>
            {ALIGNMENTS.map(a => (
              <option key={a.id} value={a.id}>{L ? a.de : a.en}</option>
            ))}
          </select>
        </div>
        <div className="bio-field">
          <label className="bio-label">{L ? 'Gottheit' : 'Deity'}</label>
          <input
            className="bio-input"
            placeholder={L ? 'Abadar, Desna, …' : 'Abadar, Desna, …'}
            value={bio.deity ?? ''}
            onChange={e => setBio('deity', e.target.value)}
          />
        </div>
      </div>

      {/* Grunddaten row 2: Geschlecht + Alter */}
      <div className="bio-row-2">
        <div className="bio-field">
          <label className="bio-label">{L ? 'Geschlecht' : 'Gender'}</label>
          <select
            className="bio-select"
            value={bio.gender ?? ''}
            onChange={e => setBio('gender', e.target.value)}
          >
            <option value="">—</option>
            <option value="m">{L ? 'männlich' : 'male'}</option>
            <option value="w">{L ? 'weiblich' : 'female'}</option>
            <option value="d">{L ? 'divers' : 'non-binary'}</option>
            <option value="k">{L ? 'keine Angabe' : 'unspecified'}</option>
          </select>
        </div>
        <div className="bio-field">
          <label className="bio-label">{L ? 'Alter' : 'Age'}</label>
          <input
            className="bio-input bio-input-num"
            type="text"
            inputMode="numeric"
            placeholder="—"
            value={bio.age ?? ''}
            onChange={e => setBio('age', e.target.value)}
          />
        </div>
      </div>

      {/* Grunddaten row 3: Größe + Gewicht */}
      <div className="bio-row-2">
        <div className="bio-field">
          <label className="bio-label">{L ? 'Größe (cm)' : 'Height (cm)'}</label>
          <input
            className="bio-input bio-input-num"
            type="text"
            inputMode="numeric"
            placeholder="—"
            value={bio.height_cm ?? ''}
            onChange={e => setBio('height_cm', e.target.value)}
          />
        </div>
        <div className="bio-field">
          <label className="bio-label">{L ? 'Gewicht (kg)' : 'Weight (kg)'}</label>
          <input
            className="bio-input bio-input-num"
            type="text"
            inputMode="numeric"
            placeholder="—"
            value={bio.weight_kg ?? ''}
            onChange={e => setBio('weight_kg', e.target.value)}
          />
        </div>
      </div>

      {/* Grunddaten row 4: Haarfarbe + Augenfarbe */}
      <div className="bio-row-2">
        <div className="bio-field">
          <label className="bio-label">{L ? 'Haarfarbe' : 'Hair'}</label>
          <input
            className="bio-input"
            placeholder={L ? 'braun, schwarz, …' : 'brown, black, …'}
            value={bio.hair ?? ''}
            onChange={e => setBio('hair', e.target.value)}
          />
        </div>
        <div className="bio-field">
          <label className="bio-label">{L ? 'Augenfarbe' : 'Eyes'}</label>
          <input
            className="bio-input"
            placeholder={L ? 'blau, grün, …' : 'blue, green, …'}
            value={bio.eyes ?? ''}
            onChange={e => setBio('eyes', e.target.value)}
          />
        </div>
      </div>

      {/* Existing fields */}
      <div className="bio-field">
        <label className="bio-label">{L ? 'Sprachen' : 'Languages'}</label>
        <input
          className="bio-input"
          placeholder={L ? 'Gemeinsprache, Elfisch, …' : 'Common, Elven, …'}
          value={bio.languages ?? ''}
          onChange={e => setBio('languages', e.target.value)}
        />
      </div>
      <div className="bio-field">
        <label className="bio-label">{L ? 'Aussehen' : 'Appearance'}</label>
        <textarea
          className="bio-textarea"
          rows={2}
          placeholder={L ? 'Beschreibung …' : 'Description …'}
          value={bio.appearance ?? ''}
          ref={autoResize}
          onInput={e => autoResize(e.target)}
          onChange={e => setBio('appearance', e.target.value)}
        />
      </div>
      <div className="bio-field">
        <label className="bio-label">{L ? 'Hintergrund' : 'Background'}</label>
        <textarea
          className="bio-textarea"
          rows={3}
          placeholder={L ? 'Herkunft, Geschichte, Motivation …' : 'Origin, history, motivation …'}
          value={bio.background ?? ''}
          ref={autoResize}
          onInput={e => autoResize(e.target)}
          onChange={e => setBio('background', e.target.value)}
        />
      </div>
    </div>
  )
}
