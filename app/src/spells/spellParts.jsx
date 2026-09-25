import { useMemo, useState } from 'react'
import { ArrowSquareOut, MagnifyingGlass, Minus, Plus, MagicWand } from '@phosphor-icons/react'
import { RefLink } from '../components/RefLink.jsx'
import { EditSheet, TextField, NumField } from '../combat/EditSheet.jsx'
import { Stepper } from '../combat/ui.jsx'
import { SPELL_MAP, SCHOOLS, spellUrl, spellSub } from './spellModel.js'

/** Eine Zauberzeile: links optional Kästchen, Name (antippen = Beschreibung), rechts Aktionen. */
export function SpellRow({ spell, spellId, dc, lead, tags, actions, done, lang }) {
  const [open, setOpen] = useState(false)
  const s = spell ?? SPELL_MAP[spellId]
  const name = s ? ((lang === 'de' ? s.name.de : s.name.en) || s.name.de) : spellId
  const url = s ? spellUrl(s) : null
  return (
    <div className={`nc-spell-row ${done ? 'is-done' : ''}`}>
      {lead}
      <button className="nc-spell-main" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="nc-spell-name">{name}{tags}</span>
        <span className="nc-row-sub">{spellSub(s, dc)}</span>
        {open && s?.desc && <span className="nc-spell-desc">{s.desc}{s.page ? ` · ${s.page}` : ''}</span>}
      </button>
      {open && url && <RefLink className="nc-icon-btn" href={url} title="prd.5footstep.de"><ArrowSquareOut /></RefLink>}
      {actions}
    </div>
  )
}

/** Suchfeld + Zauberliste (Klassenliste, Lernen, Nachschlagen). */
export function SpellSearchList({ spells, dc, placeholder, hint, renderActions, renderTags, lang, emptyText }) {
  const [q, setQ] = useState('')
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return s ? spells.filter(x => x.name.de.toLowerCase().includes(s)) : spells
  }, [q, spells])
  return (
    <>
      <div className="nc-search nc-search-plain"><MagnifyingGlass /><input value={q} onChange={e => setQ(e.target.value)} placeholder={placeholder} /></div>
      {hint && <span className="nc-hint">{hint}</span>}
      <div className="nc-card nc-card-list">
        {shown.map(s => <SpellRow key={s.id} spell={s} dc={dc} lang={lang} actions={renderActions(s)} tags={renderTags?.(s)} />)}
        {!shown.length && <span className="nc-empty">{emptyText}</span>}
      </div>
    </>
  )
}

/** Platz-Punkte (voll = frei). Antippen: nächsten freien verbrauchen bzw. letzten zurückgeben. */
export function SlotPips({ total, used, onUse, onRestore, lang }) {
  const L = lang === 'de'
  if (total > 12) {
    return <Stepper value={Math.max(0, total - used)} min={0} max={total} format={v => `${v}/${total}`}
      onChange={v => (v < total - used ? onUse() : onRestore())} label={L ? 'Plätze übrig' : 'Slots left'} />
  }
  return (
    <div className="nc-pips" role="group" aria-label={L ? 'Plätze' : 'Slots'}>
      {Array.from({ length: total }, (_, i) => {
        const free = i < total - used
        return <button key={i} className={`nc-pip ${free ? 'is-on' : ''}`} onClick={free ? onUse : onRestore}
          aria-label={free ? (L ? 'Platz verbrauchen' : 'Use slot') : (L ? 'Platz zurückgeben' : 'Restore slot')}><span /></button>
      })}
    </div>
  )
}

/** Zauberstäbe (char.wands). */
export function WandsCard({ wands, setWands, onEdit, lang }) {
  const L = lang === 'de'
  const change = (id, d) => setWands(prev => prev.map(w => (w.id === id ? { ...w, charges: Math.max(0, Math.min(w.max_charges, (Number(w.charges) || 0) + d)) } : w)))
  return (
    <div className="nc-card nc-card-list">
      {wands.map(w => (
        <div key={w.id} className="nc-wand-row">
          <button className="nc-spell-main" onClick={() => onEdit(w.id)}>
            <span className="nc-spell-name"><MagicWand className="nc-accent-soft" />{w.name}</span>
            {w.notes && <span className="nc-row-sub">{w.notes}</span>}
          </button>
          <div className="nc-stepper">
            <button className="nc-step-btn" onClick={() => change(w.id, -1)} disabled={w.charges <= 0} aria-label="−"><Minus /></button>
            <span className={`nc-step-val ${w.charges <= Math.ceil(w.max_charges * 0.2) ? 'nc-warn' : ''}`}>{w.charges}/{w.max_charges}</span>
            <button className="nc-step-btn" onClick={() => change(w.id, 1)} disabled={w.charges >= w.max_charges} aria-label="+"><Plus /></button>
          </div>
        </div>
      ))}
      {!wands.length && <span className="nc-empty">{L ? 'Keine Zauberstäbe.' : 'No wands.'}</span>}
      <button className="nc-add-row" onClick={() => onEdit(null)}><Plus />{L ? 'Zauberstab anlegen' : 'Add wand'}</button>
    </div>
  )
}

export function WandEditor({ wand, onSave, onDelete, onClose, lang }) {
  const L = lang === 'de'
  const [d, setD] = useState(() => wand ? { ...wand } : { id: Math.random().toString(36).slice(2, 9), name: '', max_charges: 50, charges: 50, notes: '' })
  const set = p => setD(prev => ({ ...prev, ...p }))
  return (
    <EditSheet lang={lang} title={wand ? (L ? 'Zauberstab bearbeiten' : 'Edit wand') : (L ? 'Zauberstab anlegen' : 'Add wand')}
      onDelete={wand ? () => onDelete(wand.id) : null} onCancel={onClose} saveDisabled={!d.name.trim()}
      onSave={() => { const max = Math.max(1, Number(d.max_charges) || 1); onSave({ ...d, name: d.name.trim(), max_charges: max, charges: Math.min(max, Number(d.charges) || 0) }) }}>
      <TextField label="Name" value={d.name} onChange={v => set({ name: v })} placeholder={L ? 'z. B. Zauberstab: Leichte Wunden heilen' : 'e.g. Wand of Cure Light Wounds'} />
      <NumField label={L ? 'Ladungen maximal' : 'Max charges'} value={d.max_charges} onChange={v => set({ max_charges: v })} min={1} max={50} />
      <NumField label={L ? 'Ladungen aktuell' : 'Charges left'} value={d.charges} onChange={v => set({ charges: v })} min={0} max={Math.max(1, Number(d.max_charges) || 1)} />
      <TextField label={L ? 'Notiz' : 'Note'} value={d.notes} onChange={v => set({ notes: v })} placeholder={L ? 'z. B. ZS 1' : 'e.g. CL 1'} />
    </EditSheet>
  )
}

/** Einstellungen einer Zauberklasse: Schule/Gegnerschulen (Magier), Plätze korrigieren, Notiz. */
export function CasterSettings({ entry, data, grades, onPatch, onAdjust, lang }) {
  const L = lang === 'de'
  const opposed = data.opposed ?? []
  const specialist = data.school && data.school !== 'universal'
  return (
    <div className="nc-edit">
      <div className="nc-edit-head"><span className="nc-sheet-title">{L ? 'Zauber-Einstellungen' : 'Spell settings'}</span></div>
      {entry.charId === 'magier' && <>
        <div className="nc-edit-field"><span className="nc-edit-label">{L ? 'Arkane Schule' : 'Arcane school'}</span>
          <div className="nc-chips">
            {[['universal', L ? 'Universal' : 'Universal'], ...Object.entries(SCHOOLS)].map(([k, n]) => (
              <button key={k} className={`nc-chip ${(data.school ?? 'universal') === k ? 'is-on' : ''}`}
                onClick={() => onPatch({ school: k, opposed: k === 'universal' ? [] : opposed.filter(o => o !== k) })}>{n}</button>
            ))}
          </div>
          <span className="nc-hint">{L ? 'Spezialisiert: +1 Schulplatz je Grad ab Grad 1 (GRW).' : 'Specialist: +1 school slot per level from 1st.'}</span>
        </div>
        {specialist && (
          <div className="nc-edit-field"><span className="nc-edit-label">{L ? `Gegnerschulen (${opposed.length}/2)` : `Opposition schools (${opposed.length}/2)`}</span>
            <div className="nc-chips">
              {Object.entries(SCHOOLS).filter(([k]) => k !== data.school).map(([k, n]) => {
                const on = opposed.includes(k)
                return <button key={k} className={`nc-chip ${on ? 'is-on' : ''}`} disabled={!on && opposed.length >= 2}
                  onClick={() => onPatch({ opposed: on ? opposed.filter(o => o !== k) : [...opposed, k] })}>{n}</button>
              })}
            </div>
            <span className="nc-hint">{L ? 'Zauber einer Gegnerschule belegen beim Vorbereiten zwei Plätze (GRW).' : 'Opposed spells use two slots.'}</span>
          </div>
        )}
      </>}
      <div className="nc-edit-field"><span className="nc-edit-label">{L ? 'Plätze je Grad' : 'Slots per level'}</span>
        <div className="nc-card nc-card-list">
          {grades.filter(g => g.accessible).map(g => (
            <div key={g.lv} className="nc-bd-misc-row nc-slot-adjust">
              <span className="nc-bd-text"><span>{L ? `Grad ${g.lv}` : `Level ${g.lv}`} · {g.total}</span>
                <span className="nc-bd-sub">{[`${L ? 'Grund' : 'Base'} ${g.base}`, g.bonus ? `Bonus ${g.bonus}` : null, g.special ? `${g.specialLabel} ${g.special}` : null, g.adjust ? `${L ? 'Korrektur' : 'Adjust'} ${g.adjust > 0 ? '+' : ''}${g.adjust}` : null].filter(Boolean).join(' · ')}</span></span>
              <Stepper value={g.adjust} onChange={v => onAdjust(g.lv, v)} min={-g.base - g.bonus - g.special} max={20} label={L ? 'Korrektur' : 'Adjust'} />
            </div>
          ))}
        </div>
        <span className="nc-hint">{L ? 'Grundwerte aus der Klassentabelle, Bonus aus dem Zauberattribut. Korrektur z. B. für Gegenstände.' : 'Base from class table, bonus from ability.'}</span>
      </div>
      <TextField area label={L ? 'Notiz' : 'Note'} value={data.notes ?? ''} onChange={v => onPatch({ notes: v })} placeholder={L ? 'z. B. Domänen, Blutlinie, Patron' : 'e.g. domains, bloodline'} />
    </div>
  )
}

