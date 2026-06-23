import { useState } from 'react'
import './HomebrewPanel.css'

const TYPES = [
  { id: 'classes',  de: 'Klassen',   en: 'Classes'  },
  { id: 'races',    de: 'Völker',    en: 'Races'    },
  { id: 'weapons',  de: 'Waffen',    en: 'Weapons'  },
  { id: 'armor',    de: 'Rüstungen', en: 'Armor'    },
  { id: 'shields',  de: 'Schilde',   en: 'Shields'  },
]

const EMPTY = {
  classes: { name: { de: '', en: '' }, hit_die: 8, skill_points_per_level: 2, bab_type: 'full', good_saves: ['fort'] },
  races:   { name: { de: '', en: '' }, size: { de: 'Mittelgroß', en: 'Medium' }, size_key: 'mittelgross', speed_m: { unarmored: 9, armored: 9 }, extra_skill_points_per_level: 0, ability_mods_text: { de: '', en: '' } },
  weapons: { name: { de: '', en: '' }, damage: '1W6', crit_range: 20, crit_mult: 2, type: 'S', range_m: 0, properties: '' },
  armor:   { name: { de: '', en: '' }, type: 'L', bonus: 0, max_dex: 8, check_penalty: 0, arcane_failure: 0, speed_m: { unarmored: 9, armored: 9 } },
  shields: { name: { de: '', en: '' }, bonus: 0, check_penalty: 0, arcane_failure: 0 },
}

const SIZE_OPTIONS = [
  { de: 'Winzig',     en: 'Tiny',    key: 'winzig'     },
  { de: 'Klein',      en: 'Small',   key: 'klein'      },
  { de: 'Mittelgroß', en: 'Medium',  key: 'mittelgross'},
  { de: 'Groß',       en: 'Large',   key: 'gross'      },
  { de: 'Riesig',     en: 'Huge',    key: 'riesig'     },
  { de: 'Gigantisch', en: 'Garg.',   key: 'gigantisch' },
  { de: 'Kolossal',   en: 'Colossal',key: 'kolossal'   },
]

export function HomebrewPanel({ hb, saveHBItem, deleteHB, onClose, lang }) {
  const L = lang === 'de'
  const [type, setType]   = useState('classes')
  const [editId, setEditId] = useState(null)
  const [draft, setDraft]   = useState(null)

  const items = hb[type] ?? []

  function openNew() {
    setDraft({ ...EMPTY[type] })
    setEditId('__new__')
  }

  function openEdit(item) {
    setDraft(JSON.parse(JSON.stringify(item)))
    setEditId(item.id)
  }

  function handleSave() {
    if (!draft) return
    const item = editId === '__new__' ? draft : { ...draft, id: editId }
    saveHBItem(type, item)
    setEditId(null)
    setDraft(null)
  }

  function handleDelete() {
    if (editId && editId !== '__new__') deleteHB(type, editId)
    setEditId(null)
    setDraft(null)
  }

  function switchType(t) {
    setType(t)
    setEditId(null)
    setDraft(null)
  }

  return (
    <div className="hb-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="hb-panel">
        <div className="hb-header">
          <span className="hb-title">⚙ {L ? 'Homebrew' : 'Homebrew'}</span>
          <button className="hb-close" onClick={onClose}>✕</button>
        </div>

        {/* Type tabs */}
        <div className="hb-type-tabs">
          {TYPES.map(t => (
            <button key={t.id}
              className={`hb-type-btn ${type === t.id ? 'active' : ''}`}
              onClick={() => switchType(t.id)}>
              {t[lang] ?? t.de}
              {hb[t.id]?.length > 0 && <span className="hb-count">{hb[t.id].length}</span>}
            </button>
          ))}
        </div>

        {/* Edit form */}
        {editId && draft && (
          <div className="hb-form">
            {type === 'classes'  && <ClassForm  draft={draft} setDraft={setDraft} L={L} />}
            {type === 'races'    && <RaceForm   draft={draft} setDraft={setDraft} L={L} />}
            {type === 'weapons'  && <WeaponForm draft={draft} setDraft={setDraft} L={L} />}
            {type === 'armor'    && <ArmorForm  draft={draft} setDraft={setDraft} L={L} />}
            {type === 'shields'  && <ShieldForm draft={draft} setDraft={setDraft} L={L} />}
            <div className="hb-form-actions">
              {editId !== '__new__' && (
                <button className="hb-del-btn" onClick={handleDelete}>{L ? 'Löschen' : 'Delete'}</button>
              )}
              <button className="hb-cancel-btn" onClick={() => { setEditId(null); setDraft(null) }}>
                {L ? 'Abbrechen' : 'Cancel'}
              </button>
              <button className="hb-save-btn" onClick={handleSave}
                disabled={!draft?.name?.de?.trim()}>
                {L ? 'Speichern' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {/* Item list */}
        <div className="hb-list">
          {items.length === 0 && !editId && (
            <p className="hb-empty">{L ? 'Noch keine Einträge.' : 'No entries yet.'}</p>
          )}
          {items.map(item => (
            <div key={item.id}
              className={`hb-item ${editId === item.id ? 'editing' : ''}`}
              onClick={() => editId !== item.id && openEdit(item)}>
              <span className="hb-item-name">{item.name?.de}</span>
              <span className="hb-item-meta">{itemMeta(type, item, L)}</span>
            </div>
          ))}
        </div>

        {!editId && (
          <button className="hb-add-btn" onClick={openNew}>
            + {L ? 'Neu' : 'New'}
          </button>
        )}
      </div>
    </div>
  )
}

function itemMeta(type, item, L) {
  if (type === 'classes') return `W${item.hit_die} · ${item.bab_type} GAB · ${item.skill_points_per_level} FP`
  if (type === 'races')   return `${item.size?.de} · ${item.speed_m?.unarmored}m`
  if (type === 'weapons') return `${item.damage} · ${item.crit_range}-20/×${item.crit_mult}${item.range_m ? ` · ${item.range_m}m` : ''}`
  if (type === 'armor')   return `+${item.bonus} · ${item.type}`
  if (type === 'shields') return `+${item.bonus}`
  return ''
}

// ── Sub-forms ──────────────────────────────────────────────────────────────

function Row({ label, children }) {
  return (
    <div className="hbf-row">
      <label className="hbf-label">{label}</label>
      <div className="hbf-ctrl">{children}</div>
    </div>
  )
}

function ClassForm({ draft, setDraft, L }) {
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }))
  const setName = v => setDraft(d => ({ ...d, name: { ...d.name, de: v } }))
  const toggleSave = s => setDraft(d => {
    const gs = d.good_saves ?? []
    return { ...d, good_saves: gs.includes(s) ? gs.filter(x => x !== s) : [...gs, s] }
  })
  return (
    <>
      <Row label={L ? 'Name' : 'Name'}>
        <input className="hbf-input" value={draft.name?.de ?? ''} onChange={e => setName(e.target.value)} autoFocus />
      </Row>
      <Row label={L ? 'Trefferwürfel' : 'Hit Die'}>
        <select className="hbf-select" value={draft.hit_die} onChange={e => set('hit_die', Number(e.target.value))}>
          {[4,6,8,10,12].map(d => <option key={d} value={d}>W{d}</option>)}
        </select>
      </Row>
      <Row label={L ? 'FP/Stufe' : 'SP/level'}>
        <input className="hbf-input hbf-short" type="number" min={1} max={8} value={draft.skill_points_per_level} onChange={e => set('skill_points_per_level', Number(e.target.value))} />
      </Row>
      <Row label="GAB">
        <select className="hbf-select" value={draft.bab_type} onChange={e => set('bab_type', e.target.value)}>
          <option value="full">{L ? 'Voll (=Stufe)' : 'Full (=level)'}</option>
          <option value="3/4">¾ (×0,75)</option>
          <option value="half">{L ? 'Halb (×0,5)' : 'Half (×0.5)'}</option>
        </select>
      </Row>
      <Row label={L ? 'Gute RWs' : 'Good saves'}>
        <div className="hbf-checks">
          {['fort', 'ref', 'will'].map(s => (
            <label key={s} className="hbf-check">
              <input type="checkbox" checked={(draft.good_saves ?? []).includes(s)}
                onChange={() => toggleSave(s)} />
              {s === 'fort' ? 'Zäh' : s === 'ref' ? 'Ref' : 'Wil'}
            </label>
          ))}
        </div>
      </Row>
    </>
  )
}

function RaceForm({ draft, setDraft, L }) {
  const setName = v => setDraft(d => ({ ...d, name: { ...d.name, de: v } }))
  const setSize = de => {
    const opt = SIZE_OPTIONS.find(s => s.de === de)
    setDraft(d => ({ ...d, size: { de: opt?.de ?? de, en: opt?.en ?? de }, size_key: opt?.key ?? 'mittelgross' }))
  }
  const setSpeed = v => setDraft(d => ({ ...d, speed_m: { unarmored: Number(v), armored: Number(v) } }))
  const setMods = v => setDraft(d => ({ ...d, ability_mods_text: { ...d.ability_mods_text, de: v } }))
  return (
    <>
      <Row label={L ? 'Name' : 'Name'}>
        <input className="hbf-input" value={draft.name?.de ?? ''} onChange={e => setName(e.target.value)} autoFocus />
      </Row>
      <Row label={L ? 'Größe' : 'Size'}>
        <select className="hbf-select" value={draft.size?.de ?? 'Mittelgroß'} onChange={e => setSize(e.target.value)}>
          {SIZE_OPTIONS.map(s => <option key={s.key} value={s.de}>{s.de}</option>)}
        </select>
      </Row>
      <Row label={L ? 'Bewegung (m)' : 'Speed (m)'}>
        <input className="hbf-input hbf-short" type="number" min={3} max={18} step={3}
          value={draft.speed_m?.unarmored ?? 9} onChange={e => setSpeed(e.target.value)} />
      </Row>
      <Row label={L ? 'Extra FP/Stufe' : 'Bonus SP/lv'}>
        <input className="hbf-input hbf-short" type="number" min={0} max={4}
          value={draft.extra_skill_points_per_level ?? 0}
          onChange={e => setDraft(d => ({ ...d, extra_skill_points_per_level: Number(e.target.value) }))} />
      </Row>
      <Row label={L ? 'Attributboni' : 'Ability mods'}>
        <input className="hbf-input" placeholder="z.B. ST+2, KO−2"
          value={draft.ability_mods_text?.de ?? ''}
          onChange={e => setMods(e.target.value)} />
      </Row>
    </>
  )
}

function WeaponForm({ draft, setDraft, L }) {
  const setName = v => setDraft(d => ({ ...d, name: { ...d.name, de: v } }))
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }))
  return (
    <>
      <Row label={L ? 'Name' : 'Name'}>
        <input className="hbf-input" value={draft.name?.de ?? ''} onChange={e => setName(e.target.value)} autoFocus />
      </Row>
      <Row label={L ? 'Schaden' : 'Damage'}>
        <input className="hbf-input hbf-short" placeholder="1W8" value={draft.damage ?? ''} onChange={e => set('damage', e.target.value)} />
      </Row>
      <Row label={L ? 'Krit-Bereich' : 'Crit range'}>
        <select className="hbf-select" value={draft.crit_range ?? 20} onChange={e => set('crit_range', Number(e.target.value))}>
          <option value={20}>20</option>
          <option value={19}>19–20</option>
          <option value={18}>18–20</option>
          <option value={17}>17–20</option>
        </select>
      </Row>
      <Row label={L ? 'Krit-Faktor' : 'Crit mult'}>
        <select className="hbf-select" value={draft.crit_mult ?? 2} onChange={e => set('crit_mult', Number(e.target.value))}>
          <option value={2}>×2</option>
          <option value={3}>×3</option>
          <option value={4}>×4</option>
        </select>
      </Row>
      <Row label={L ? 'Typ' : 'Type'}>
        <input className="hbf-input hbf-short" placeholder="S/P/H" value={draft.type ?? ''} onChange={e => set('type', e.target.value)} />
      </Row>
      <Row label={L ? 'Reichweite (m)' : 'Range (m)'}>
        <input className="hbf-input hbf-short" type="number" min={0} value={draft.range_m ?? 0} onChange={e => set('range_m', Number(e.target.value))} />
      </Row>
    </>
  )
}

function ArmorForm({ draft, setDraft, L }) {
  const setName = v => setDraft(d => ({ ...d, name: { ...d.name, de: v } }))
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }))
  return (
    <>
      <Row label={L ? 'Name' : 'Name'}>
        <input className="hbf-input" value={draft.name?.de ?? ''} onChange={e => setName(e.target.value)} autoFocus />
      </Row>
      <Row label={L ? 'Typ' : 'Type'}>
        <select className="hbf-select" value={draft.type ?? 'L'} onChange={e => set('type', e.target.value)}>
          <option value="L">{L ? 'Leicht' : 'Light'}</option>
          <option value="M">{L ? 'Mittel' : 'Medium'}</option>
          <option value="S">{L ? 'Schwer' : 'Heavy'}</option>
        </select>
      </Row>
      <Row label={L ? 'RK-Bonus' : 'AC bonus'}>
        <input className="hbf-input hbf-short" type="number" min={0} max={15} value={draft.bonus ?? 0} onChange={e => set('bonus', Number(e.target.value))} />
      </Row>
      <Row label={L ? 'Max GE-Mod' : 'Max Dex'}>
        <input className="hbf-input hbf-short" type="number" min={0} max={8} value={draft.max_dex ?? 8} onChange={e => set('max_dex', Number(e.target.value))} />
      </Row>
      <Row label={L ? 'Rüstungsmalus' : 'Check pen.'}>
        <input className="hbf-input hbf-short" type="number" max={0} value={draft.check_penalty ?? 0} onChange={e => set('check_penalty', Number(e.target.value))} />
      </Row>
      <Row label={L ? 'Zauberversagen %' : 'Arcane fail %'}>
        <input className="hbf-input hbf-short" type="number" min={0} max={100} step={5}
          value={Math.round((draft.arcane_failure ?? 0) * 100)}
          onChange={e => set('arcane_failure', Number(e.target.value) / 100)} />
      </Row>
      <Row label={L ? 'Bew. gerüstet (m)' : 'Armored spd'}>
        <input className="hbf-input hbf-short" type="number" min={0}
          value={draft.speed_m?.armored ?? 9}
          onChange={e => setDraft(d => ({ ...d, speed_m: { ...d.speed_m, armored: Number(e.target.value) } }))} />
      </Row>
    </>
  )
}

function ShieldForm({ draft, setDraft, L }) {
  const setName = v => setDraft(d => ({ ...d, name: { ...d.name, de: v } }))
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }))
  return (
    <>
      <Row label={L ? 'Name' : 'Name'}>
        <input className="hbf-input" value={draft.name?.de ?? ''} onChange={e => setName(e.target.value)} autoFocus />
      </Row>
      <Row label={L ? 'Schild-Bonus' : 'Shield bonus'}>
        <input className="hbf-input hbf-short" type="number" min={0} max={10} value={draft.bonus ?? 0} onChange={e => set('bonus', Number(e.target.value))} />
      </Row>
      <Row label={L ? 'Rüstungsmalus' : 'Check pen.'}>
        <input className="hbf-input hbf-short" type="number" max={0} value={draft.check_penalty ?? 0} onChange={e => set('check_penalty', Number(e.target.value))} />
      </Row>
      <Row label={L ? 'Zauberversagen %' : 'Arcane fail %'}>
        <input className="hbf-input hbf-short" type="number" min={0} max={100} step={5}
          value={Math.round((draft.arcane_failure ?? 0) * 100)}
          onChange={e => set('arcane_failure', Number(e.target.value) / 100)} />
      </Row>
    </>
  )
}
