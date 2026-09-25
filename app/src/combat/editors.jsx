import { useMemo, useState } from 'react'
import { Plus, Minus, X } from '@phosphor-icons/react'
import weaponsData from '../data/weapons.json'
import armorData from '../data/armor.json'
import shieldsData from '../data/shields.json'
import ringsData from '../data/rings.json'
import { BUFF_STATS, BUFF_TYPES } from '../engine/buffs.js'
import { computeWeaponAttack, weaponStrMult } from '../engine/weapons.js'
import { getAutoResources } from '../engine/resources.js'
import { classLabel } from '../engine/classes.js'
import { EditSheet, Field, TextField, NumField, ChipsField, SearchPick } from './EditSheet.jsx'
import { sg, typo } from './breakdown.js'

const newId = prefix => `${prefix}_${Math.random().toString(36).slice(2, 9)}`
const TARGET_LABEL = { ac: 'RK (alle)' }

// ── Buff ─────────────────────────────────────────────────────────────────────
// Vorlagen: Werte je Zaubertext im Grundregelwerk (geprüft 2026-09-26), Stufe = Zauberstufe.
function buffTemplates(cl) {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
  return [
    { name: 'Segen', type: 'moral', bonuses: { attack: 1 }, duration: '1 Min./Stufe', notes: 'RW-Bonus +1 nur gegen Furcht (GRW S. 331)' },
    { name: 'Heldenmut', type: 'moral', bonuses: { attack: 2, saves_all: 2, skills_all: 2 }, duration: '10 Min./Stufe' },
    { name: 'Bärenstärke', type: 'verbesserung', bonuses: { str: 4 }, duration: '1 Min./Stufe' },
    { name: 'Katzenhafte Anmut', type: 'verbesserung', bonuses: { dex: 4 }, duration: '1 Min./Stufe' },
    { name: 'Rindenhaut', type: 'verbesserung', bonuses: { nat_armor: clamp(2 + Math.floor(Math.max(0, cl - 3) / 3), 2, 5) }, duration: '10 Min./Stufe' },
    { name: 'Schild des Glaubens', type: 'ablenkung', bonuses: { deflection: clamp(2 + Math.floor(cl / 6), 2, 5) }, duration: '1 Min./Stufe' },
    { name: 'Göttliche Gunst', type: 'glueck', bonuses: { attack: clamp(Math.floor(cl / 3), 1, 3), damage: clamp(Math.floor(cl / 3), 1, 3) }, duration: '1 Minute' },
    { name: 'Kampfrausch', type: 'moral', bonuses: { str: 4, kon: 4, will: 2, ac: -2 }, duration: 'Runden' },
  ]
}

function buffPreview(d, lang) {
  const L = lang === 'de'
  const type = BUFF_TYPES.find(t => t.id === (d.type || 'ungetypt'))
  const parts = BUFF_STATS.filter(s => Number(d.bonuses?.[s.key] ?? 0)).map(s => `${TARGET_LABEL[s.key] ?? s.de} ${sg(Number(d.bonuses[s.key]))}`)
  return parts.length ? `${L ? type?.de : type?.en} · ${parts.join(', ')}${d.duration ? ` · ${d.duration}` : ''}` : (L ? 'Noch kein Bonus' : 'No bonus yet')
}

export function BuffEditor({ buff, casterLevel, onSave, onDelete, onClose, lang }) {
  const L = lang === 'de'
  const [d, setD] = useState(() => buff
    ? { name: buff.name, type: buff.type || 'ungetypt', duration: buff.duration ?? '', notes: buff.notes ?? '', rows: BUFF_STATS.filter(s => Number(buff.bonuses?.[s.key] ?? 0)).map(s => ({ key: s.key, v: Number(buff.bonuses[s.key]) })) }
    : { name: '', type: 'ungetypt', duration: '', notes: '', rows: [{ key: 'attack', v: 1 }] })
  const set = patch => setD(prev => ({ ...prev, ...patch }))
  const bonuses = Object.fromEntries(BUFF_STATS.map(s => [s.key, d.rows.filter(r => r.key === s.key).reduce((a, r) => a + r.v, 0)]).filter(([, v]) => v))
  const tpls = buffTemplates(casterLevel)
  const setRow = (i, patch) => set({ rows: d.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) })
  return (
    <EditSheet lang={lang} title={buff ? (L ? 'Buff bearbeiten' : 'Edit buff') : (L ? 'Buff anlegen' : 'Add buff')}
      onDelete={buff ? () => onDelete(buff.id) : null}
      templates={buff ? [] : tpls.map(t => ({ key: t.name, label: t.name, on: d.name === t.name,
        pick: () => set({ name: t.name, type: t.type, duration: t.duration, notes: t.notes ?? '', rows: Object.entries(t.bonuses).map(([key, v]) => ({ key, v })) }) }))}
      preview={buffPreview({ ...d, bonuses }, lang)}
      onCancel={onClose} saveDisabled={!d.name.trim()}
      onSave={() => onSave({ ...(buff ?? { id: newId('b'), active: true }), name: d.name.trim(), type: d.type, duration: d.duration.trim(), notes: d.notes.trim(), bonuses })}>
      <TextField label="Name" value={d.name} onChange={v => set({ name: v })} placeholder={L ? 'z. B. Segen' : 'e.g. Bless'} />
      <TextField label={L ? 'Dauer' : 'Duration'} value={d.duration} onChange={v => set({ duration: v })} placeholder={L ? 'z. B. 7 Min. oder 1 Min./Stufe' : 'e.g. 1 min./level'} />
      <ChipsField label={L ? 'Bonus-Typ' : 'Bonus type'} options={BUFF_TYPES.map(t => [t.id, L ? t.de : t.en])} value={d.type} onChange={v => set({ type: v })}
        hint={L ? 'Boni desselben Typs stapeln nicht – es zählt der höchste. Ausweichen, ungetypte Boni und alle Mali stapeln.' : 'Same-type bonuses do not stack; dodge, untyped and penalties do.'} />
      <Field label={L ? 'Boni' : 'Bonuses'}>
        <div className="nc-boni">
          {d.rows.map((r, i) => (
            <div key={i} className="nc-boni-row">
              <select className="nc-input nc-boni-target" value={r.key} onChange={e => setRow(i, { key: e.target.value })}>
                {BUFF_STATS.map(s => <option key={s.key} value={s.key}>{TARGET_LABEL[s.key] ?? s.de}</option>)}
              </select>
              <button className="nc-step-btn" onClick={() => setRow(i, { v: r.v - 1 })} aria-label="−"><Minus /></button>
              <span className="nc-step-val">{sg(r.v)}</span>
              <button className="nc-step-btn" onClick={() => setRow(i, { v: r.v + 1 })} aria-label="+"><Plus /></button>
              <button className="nc-step-btn is-bare" onClick={() => set({ rows: d.rows.filter((_, j) => j !== i) })} aria-label={L ? 'Entfernen' : 'Remove'}><X /></button>
            </div>
          ))}
          <button className="nc-btn nc-btn-ghost nc-self-start" onClick={() => set({ rows: [...d.rows, { key: 'attack', v: 1 }] })}><Plus />{L ? 'Bonus hinzufügen' : 'Add bonus'}</button>
        </div>
      </Field>
      <TextField label={L ? 'Notiz' : 'Note'} value={d.notes} onChange={v => set({ notes: v })} placeholder={L ? 'optional' : 'optional'} />
    </EditSheet>
  )
}

// ── Ressource ────────────────────────────────────────────────────────────────
const RESETS = [['rast', ['Rast', 'Rest']], ['tag', ['Neuer Tag', 'New day']], ['nie', ['Nie', 'Never']]]

export function ResourceEditor({ resource, char, attrs, onSave, onDelete, onClose, lang }) {
  const L = lang === 'de'
  const [d, setD] = useState(() => resource
    ? { name: resource.name, source: resource.source ?? resource.unit ?? '', max: Number(resource.max) || 1, reset: resource.reset ?? 'tag' }
    : { name: '', source: '', max: 1, reset: 'tag' })
  const set = patch => setD(prev => ({ ...prev, ...patch }))
  const suggestions = useMemo(() => (char.meta.classes ?? []).filter(c => c.id)
    .flatMap(c => getAutoResources(c.id, c.level, attrs, lang).map(s => ({ ...s, source: `${classLabel(c.id, lang)} ${c.level}` }))), [char.meta.classes, attrs, lang])
  return (
    <EditSheet lang={lang} title={resource ? (L ? 'Ressource bearbeiten' : 'Edit resource') : (L ? 'Ressource anlegen' : 'Add resource')}
      onDelete={resource ? () => onDelete(resource.id) : null}
      templatesLabel={L ? 'Vorschläge für deine Klassen' : 'Suggestions for your classes'}
      templates={resource ? [] : suggestions.map(s => ({ key: s.name, label: `${s.name} · ${s.max}`, on: d.name === s.name, pick: () => set({ name: s.name, max: s.max, source: s.source }) }))}
      preview={Number(d.max) <= 6 ? (L ? `Anzeige als ${d.max} Punkte zum Antippen` : `Shown as ${d.max} pips`) : (L ? `Anzeige als Zähler 0–${d.max}` : `Shown as counter 0–${d.max}`)}
      onCancel={onClose} saveDisabled={!d.name.trim()}
      onSave={() => onSave({ ...(resource ?? { id: newId('res'), current: 0 }), name: d.name.trim(), source: d.source.trim(), max: Math.max(1, Number(d.max) || 1), reset: d.reset,
        current: Math.min(resource?.current ?? 0, Math.max(1, Number(d.max) || 1)) })}>
      <TextField label="Name" value={d.name} onChange={v => set({ name: v })} placeholder={L ? 'z. B. Kampfrausch' : 'e.g. Rage'} />
      <TextField label={L ? 'Quelle / Hinweis' : 'Source / note'} value={d.source} onChange={v => set({ source: v })} placeholder={L ? 'z. B. Barbar 7 oder Ladungen' : 'e.g. Barbarian 7 or charges'} />
      <NumField label={L ? 'Maximum' : 'Maximum'} value={d.max} onChange={v => set({ max: v })} min={1} max={99} />
      <ChipsField label={L ? 'Zurücksetzen' : 'Reset'} options={RESETS.map(([v, t]) => [v, L ? t[0] : t[1]])} value={d.reset} onChange={v => set({ reset: v })}
        hint={L ? '„Rast“ im Kampf-Tab setzt alles außer „Nie“ zurück. Zauberstäbe und Tränke: „Nie“.' : '“Rest” resets everything except “Never”.'} />
    </EditSheet>
  )
}

// ── Waffe ────────────────────────────────────────────────────────────────────
const SIZE_TO_DMG = { 2: 'sk', 1: 'k', 0: 'm', '-1': 'g', '-2': 'r', '-4': 'g', '-8': 'r' }

export function WeaponEditor({ slot, index, char, attrs, bab, condMods, buffTotals, hbWeapons = [], onSave, onDelete, onClose, lang }) {
  const L = lang === 'de'
  const all = useMemo(() => [...weaponsData.weapons, ...hbWeapons], [hbWeapons])
  const map = useMemo(() => Object.fromEntries(all.map(w => [w.id, w])), [all])
  const [d, setD] = useState(() => ({ weapon_id: '', name: '', is_ranged: null, enhancement: 0, misc_attack: 0, misc_damage: 0, dmg_extra: '', mw: false, finesse: false, off_hand: false, two_handed: false, notes: '', ...(slot ?? {}) }))
  const set = patch => setD(prev => ({ ...prev, ...patch }))
  const def = map[d.weapon_id]
  const autoRanged = def ? def.str_bonus_mult === 0 : false
  const isRanged = d.is_ranged ?? autoRanged
  const dmgKey = SIZE_TO_DMG[String(Number(char.combat_misc?.size_mod_rk ?? 0))] ?? 'm'
  const result = def ? computeWeaponAttack({ ...d, is_ranged: isRanged, str_mult: weaponStrMult(def, d) }, attrs, bab, condMods, buffTotals.attack ?? 0, buffTotals.damage ?? 0) : null
  const dice = def?.damage?.[dmgKey] ?? def?.damage?.m ?? '—'
  const items = all.map(w => ({ id: w.id, label: w.name?.de ?? w.id, w }))
  return (
    <EditSheet lang={lang} title={slot ? (L ? 'Waffe bearbeiten' : 'Edit weapon') : (L ? 'Waffe hinzufügen' : 'Add weapon')}
      onDelete={slot ? () => onDelete(index) : null}
      preview={result ? `${L ? 'Angriff' : 'Attack'} ${result.full_attack_str} · ${L ? 'Schaden' : 'Damage'} ${dice}${result.damage_mod ? result.damage_str : ''}${d.dmg_extra ? ` + ${d.dmg_extra}` : ''} · ${typo(def.crit) ?? '—'}` : (L ? 'Waffe aus der Liste wählen' : 'Pick a weapon')}
      onCancel={onClose} saveDisabled={!def}
      onSave={() => onSave(index, { ...d, name: d.name.trim() })}>
      <SearchPick label={L ? `Waffe aus Liste (${all.length})` : `Weapon (${all.length})`} items={items} selectedId={d.weapon_id}
        placeholder={L ? 'Waffe suchen …' : 'Search weapon …'}
        onPick={i => set({ weapon_id: i.id, is_ranged: null })}
        render={i => (<><span className="nc-ellipsis">{i.label}</span><span className="nc-search-meta">{i.w.damage?.m ?? '—'} · {typo(i.w.crit) ?? '—'}{i.w.range_m ? ` · ${i.w.range_m} m` : ''}</span></>)} />
      <TextField label="Name" value={d.name} onChange={v => set({ name: v })} placeholder={def ? def.name?.de : (L ? 'eigener Name, optional' : 'custom name, optional')} />
      <ChipsField label={L ? 'Art' : 'Type'} options={[['nah', L ? 'Nahkampf' : 'Melee'], ['fern', L ? 'Fernkampf' : 'Ranged']]} value={isRanged ? 'fern' : 'nah'}
        onChange={v => set({ is_ranged: v === 'fern' ? (autoRanged ? null : true) : (autoRanged ? false : null) })} />
      <NumField label={L ? 'Verzauberung' : 'Enhancement'} value={d.enhancement} onChange={v => set({ enhancement: v })} min={0} max={5} format={v => (v ? `+${v}` : (L ? 'keine' : 'none'))} />
      <NumField label={L ? 'Angriff+ (sonstiges)' : 'Attack+ (other)'} value={d.misc_attack} onChange={v => set({ misc_attack: v })} min={-10} max={20} format={v => (v ? sg(v) : '±0')} />
      <NumField label={L ? 'Schaden+ (sonstiges)' : 'Damage+ (other)'} value={d.misc_damage} onChange={v => set({ misc_damage: v })} min={-10} max={20} format={v => (v ? sg(v) : '±0')} />
      <TextField label={L ? 'Zusatzschaden' : 'Extra damage'} value={d.dmg_extra} onChange={v => set({ dmg_extra: v })} placeholder={L ? 'z. B. 1W6 Feuer' : 'e.g. 1d6 fire'} />
      <ChipsField multi label={L ? 'Eigenschaften' : 'Properties'} value={{ mw: d.mw, finesse: d.finesse, off_hand: d.off_hand, two_handed: d.two_handed }}
        options={[['mw', L ? 'Meisterarbeit' : 'Masterwork'], ['finesse', L ? 'Waffenfinesse' : 'Weapon Finesse'], ['off_hand', L ? 'Nebenhand' : 'Off hand'], ['two_handed', L ? 'Zweihändig' : 'Two-handed']]}
        onChange={v => set({ ...v, ...(v.off_hand && !d.off_hand ? { two_handed: false } : {}), ...(v.two_handed && !d.two_handed ? { off_hand: false } : {}) })}
        hint={L ? 'Waffenfinesse: GE statt ST für den Angriff. Nebenhand: −4 Angriff, ½ ST auf Schaden. Zweihändig: ST ×1,5.' : 'Finesse: Dex for attack. Off hand: −4, ½ Str. Two-handed: Str ×1.5.'} />
      <TextField label={L ? 'Notiz' : 'Note'} value={d.notes} onChange={v => set({ notes: v })} placeholder={L ? 'z. B. Herkunft des Bonus' : 'e.g. source of bonus'} />
    </EditSheet>
  )
}

// ── Ausrüstung ───────────────────────────────────────────────────────────────
const KINDS = ['Rüstung', 'Schild', 'Ring', 'Umhang', 'Sonstiges']
const KIND_EN = { Rüstung: 'Armor', Schild: 'Shield', Ring: 'Ring', Umhang: 'Cloak', Sonstiges: 'Other' }
const CAT_OF_TYPE = { Leicht: 'leicht', Mittel: 'mittel', Schwer: 'schwer' }

export function GearEditor({ item, index, hbArmor = [], hbShields = [], onSave, onDelete, onClose, lang }) {
  const L = lang === 'de'
  const [d, setD] = useState(() => ({ kind: 'Rüstung', id: null, name: '', ac: 0, enh: 0, mw: false, maxGE: null, cat: null, acp: 0, asf: 0, defl: 0, res: 0, note: '', ...(item ?? {}) }))
  const set = patch => setD(prev => ({ ...prev, ...patch }))
  const source = d.kind === 'Rüstung' ? [...armorData.armor, ...hbArmor] : d.kind === 'Schild' ? [...shieldsData.shields, ...hbShields] : d.kind === 'Ring' ? ringsData.rings : []
  const items = source.map(x => ({ id: x.id, label: x.name?.de ?? x.id, x }))
  function pick(x) {
    if (d.kind === 'Ring') return set({ id: x.id, name: x.name?.de, defl: x.bonus })
    set({ id: x.id, name: x.name?.de, ac: x.bonus ?? 0, maxGE: x.max_dex ?? null, acp: x.check_penalty ?? 0, asf: x.spell_failure ?? 0, cat: CAT_OF_TYPE[x.type] ?? null })
  }
  const armorLike = d.kind === 'Rüstung' || d.kind === 'Schild'
  const acpShown = Number(d.acp) < 0 && (d.mw || Number(d.enh) > 0) ? Math.min(0, Number(d.acp) + 1) : Number(d.acp)
  const preview = armorLike
    ? `RK +${Number(d.ac) + Number(d.enh)}${d.kind === 'Rüstung' && d.maxGE != null ? ` · ${L ? 'max. GE' : 'max Dex'} +${d.maxGE}` : ''}${acpShown ? ` · ${L ? 'RM' : 'ACP'} ${sg(acpShown)}` : ''}${Number(d.asf) ? ` · ${L ? 'ZP' : 'ASF'} ${Math.round(Number(d.asf) * 100)} %` : ''}${d.cat ? ` · ${d.cat}` : ''}`
    : d.kind === 'Ring' ? (Number(d.defl) ? `${L ? 'Ablenkung' : 'Deflection'} +${d.defl} ${L ? 'auf RK' : 'to AC'}` : (L ? 'kein RK-Bonus' : 'no AC bonus'))
    : d.kind === 'Umhang' ? (Number(d.res) ? `${L ? 'Widerstand' : 'Resistance'} +${d.res} ${L ? 'auf alle RW' : 'on all saves'}` : (L ? 'kein RW-Bonus' : 'no save bonus'))
    : (L ? 'Wird nicht verrechnet' : 'Not calculated')
  return (
    <EditSheet lang={lang} title={item ? (L ? 'Ausrüstung bearbeiten' : 'Edit gear') : (L ? 'Ausrüstung hinzufügen' : 'Add gear')}
      onDelete={item ? () => onDelete(index) : null} preview={preview}
      onCancel={onClose} saveDisabled={!d.name.trim() && !d.id}
      onSave={() => onSave(index, { ...d, name: d.name.trim() })}>
      <ChipsField label={L ? 'Art' : 'Kind'} options={KINDS.map(k => [k, L ? k : KIND_EN[k]])} value={d.kind}
        onChange={v => set({ kind: v, id: null, name: d.id ? '' : d.name })} />
      {items.length > 0 && (
        <SearchPick label={L ? 'Aus Liste' : 'From list'} items={items} selectedId={d.id} onPick={i => pick(i.x)} placeholder={L ? 'suchen …' : 'search …'}
          render={i => (<><span className="nc-ellipsis">{i.label}</span><span className="nc-search-meta">+{i.x.bonus}{i.x.max_dex != null ? ` · GE ${i.x.max_dex}` : ''}{i.x.type ? ` · ${i.x.type}` : ''}</span></>)} />
      )}
      <TextField label="Name" value={d.name} onChange={v => set({ name: v })} placeholder={L ? 'Name des Gegenstands' : 'Item name'} />
      {armorLike && <>
        <NumField label={d.kind === 'Rüstung' ? (L ? 'Rüstungsbonus' : 'Armor bonus') : (L ? 'Schildbonus' : 'Shield bonus')} value={d.ac} onChange={v => set({ ac: v })} min={0} max={15} format={v => `+${v}`} />
        <NumField label={L ? 'Verzauberung' : 'Enhancement'} value={d.enh} onChange={v => set({ enh: v })} min={0} max={5} format={v => (v ? `+${v}` : (L ? 'keine' : 'none'))} />
        <ChipsField multi label={L ? 'Qualität' : 'Quality'} options={[['mw', L ? 'Meisterarbeit' : 'Masterwork']]} value={{ mw: d.mw }} onChange={v => set({ mw: v.mw })}
          hint={L ? 'Meisterarbeit oder Verzauberung: Rüstungsmalus −1 weniger.' : 'Masterwork or enhancement: −1 less check penalty.'} />
        {d.kind === 'Rüstung' && <>
          <NumField label={L ? 'Max. GE-Bonus' : 'Max Dex'} value={d.maxGE ?? 0} onChange={v => set({ maxGE: v })} min={0} max={10} format={v => `+${v}`} />
          <ChipsField label={L ? 'Kategorie' : 'Category'} options={[['leicht', L ? 'leicht' : 'light'], ['mittel', L ? 'mittel' : 'medium'], ['schwer', L ? 'schwer' : 'heavy']]} value={d.cat} onChange={v => set({ cat: v })}
            hint={L ? 'Mittlere und schwere Rüstung senken die Bewegung (z. B. 9 m → 6 m).' : 'Medium and heavy armor reduce speed.'} />
        </>}
        <NumField label={L ? 'Rüstungsmalus' : 'Check penalty'} value={d.acp} onChange={v => set({ acp: v })} min={-10} max={0} />
        <NumField label={L ? 'Zauberpatzer' : 'Spell failure'} value={Math.round(Number(d.asf) * 100)} onChange={v => set({ asf: v / 100 })} min={0} max={50} format={v => `${v} %`} />
      </>}
      {d.kind === 'Ring' && <>
        <NumField label={L ? 'Ablenkungsbonus auf RK' : 'Deflection bonus'} value={d.defl} onChange={v => set({ defl: v })} min={0} max={5} format={v => (v ? `+${v}` : (L ? 'keiner' : 'none'))} />
        <TextField label={L ? 'Wirkung' : 'Effect'} value={d.note} onChange={v => set({ note: v })} placeholder={L ? 'z. B. Federfall bei Sturz' : 'e.g. feather fall'} />
      </>}
      {d.kind === 'Umhang' && <NumField label={L ? 'Widerstandsbonus auf RW' : 'Resistance bonus'} value={d.res} onChange={v => set({ res: v })} min={0} max={5} format={v => (v ? `+${v}` : (L ? 'keiner' : 'none'))} />}
      {d.kind === 'Sonstiges' && <TextField area label={L ? 'Wirkung' : 'Effect'} value={d.note} onChange={v => set({ note: v })}
        placeholder={L ? 'Wird nicht verrechnet – Boni als Buff oder unter „Sonstiges“ eintragen.' : 'Not calculated.'} />}
    </EditSheet>
  )
}
