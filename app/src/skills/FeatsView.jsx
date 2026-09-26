import { useMemo, useState } from 'react'
import { ArrowSquareOut, MagnifyingGlass, Plus } from '@phosphor-icons/react'
import featsData from '../data/feats.json'
import { featBudget, hasKnownBonusRules } from '../engine/featBudget.js'
import { classLabel } from '../engine/classes.js'
import { Stepper } from '../combat/ui.jsx'
import { RefLink } from '../components/RefLink.jsx'
import { Sheet } from '../shell/Sheet.jsx'
import { useToast } from '../shell/toastContext.js'
import { EditSheet, TextField, ChipsField, Field } from '../combat/EditSheet.jsx'
import { ListCard } from '../combat/ui.jsx'
import { featUrl } from './featLinks.js'
import './skills.css'

const DB_FEATS = featsData.feats
const TYPES = ['Allgemein', 'Kampf', 'Metamagie', 'Erschaffung', 'Teamwork', 'Volk', 'Klasse', 'WZ', 'Nachteil', 'Sonstige']
const TYPES_EN = { Allgemein: 'General', Kampf: 'Combat', Metamagie: 'Metamagic', Erschaffung: 'Item creation', Teamwork: 'Teamwork', Volk: 'Racial', Klasse: 'Class', WZ: 'Trait', Nachteil: 'Drawback', Sonstige: 'Other' }
const PAGE = 40
const genId = () => 'ft_' + Math.random().toString(36).slice(2, 10)
const typeLabel = (t, L) => (L ? t : TYPES_EN[t] ?? t)

function FeatEditor({ feat, onSave, onDelete, onClose, lang }) {
  const L = lang === 'de'
  const [d, setD] = useState(() => feat ? { ...feat } : { id: genId(), name: '', type: 'Allgemein', notes: '', desc: '', source: '' })
  const [q, setQ] = useState('')
  const set = patch => setD(prev => ({ ...prev, ...patch }))
  const hits = useMemo(() => {
    const s = q.trim().toLowerCase()
    return s.length < 2 ? [] : DB_FEATS.filter(f => f.name.de.toLowerCase().includes(s)).slice(0, 8)
  }, [q])
  return (
    <EditSheet lang={lang} title={feat ? (L ? 'Talent bearbeiten' : 'Edit feat') : (L ? 'Talent anlegen' : 'Add feat')}
      onDelete={feat ? () => onDelete(feat.id) : null} onCancel={onClose} saveDisabled={!d.name.trim()}
      onSave={() => onSave({ ...d, name: d.name.trim() })}>
      {!feat && (
        <Field label={L ? `Aus der Datenbank (${DB_FEATS.length})` : `From database (${DB_FEATS.length})`}>
          <div className="nc-search">
            <MagnifyingGlass className="nc-accent-soft" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder={L ? 'Talent suchen, mind. 2 Zeichen' : 'Search, min. 2 letters'} />
          </div>
          {hits.length > 0 && (
            <div className="nc-search-hits">
              {hits.map(f => (
                <button key={f.id} className={`nc-search-hit ${d.name === f.name.de ? 'is-on' : ''}`}
                  onClick={() => { set({ name: f.name.de, type: f.type, desc: f.desc?.de ?? '', source: f.source ?? '' }); setQ('') }}>
                  <span className="nc-row-text"><span className="nc-ellipsis">{f.name.de}</span>
                    {f.desc?.de && <span className="nc-row-sub nc-ellipsis">{f.desc.de}</span>}</span>
                  <span className="nc-search-meta">{typeLabel(f.type, L)}</span>
                </button>
              ))}
            </div>
          )}
        </Field>
      )}
      <TextField label="Name" value={d.name} onChange={v => set({ name: v })} placeholder={L ? 'z. B. Waffenfokus (Langschwert)' : 'e.g. Weapon Focus'} />
      <ChipsField label={L ? 'Typ' : 'Type'} options={TYPES.map(t => [t, typeLabel(t, L)])} value={d.type} onChange={v => set({ type: v })} />
      {d.desc && <Field label={L ? 'Beschreibung (Datenbank)' : 'Description (database)'}><span className="nc-feat-desc">{d.desc}</span></Field>}
      <TextField area label={L ? 'Notiz' : 'Note'} value={d.notes} onChange={v => set({ notes: v })} placeholder={L ? 'z. B. gewählte Waffe, Stufe erhalten' : 'Note'} />
    </EditSheet>
  )
}

export function FeatsView({ char, setFeats, update, totalLevel = 0, lang, layout }) {
  const L = lang === 'de'
  const toast = useToast()
  const [sheet, setSheet] = useState(null)           // {type:'edit', id|null} | {type:'browse'}
  const [bq, setBq] = useState('')
  const [btype, setBtype] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const feats = char.feats ?? []
  const fb = featBudget(char, totalLevel, lang)
  const budget = fb.total
  const unknownClasses = (char.meta?.classes ?? []).filter(c => c.id && !hasKnownBonusRules(c.id)).map(c => classLabel(c.id, lang))
  const tone = feats.length > budget ? 'neg' : feats.length === budget ? 'ok' : 'warn'
  const browse = useMemo(() => {
    const s = bq.trim().toLowerCase()
    return DB_FEATS.filter(f => (!btype || f.type === btype) && (!s || f.name.de.toLowerCase().includes(s)))
  }, [bq, btype])

  const close = () => setSheet(null)
  const save = f => { setFeats(prev => (prev.some(x => x.id === f.id) ? prev.map(x => (x.id === f.id ? f : x)) : [...prev, f])); close() }
  const remove = id => {
    const prev = feats
    const f = prev.find(x => x.id === id)
    setFeats(list => list.filter(x => x.id !== id))
    close()
    toast(L ? `${f?.name ?? 'Talent'} gelöscht` : `${f?.name ?? 'Feat'} deleted`, { undo: () => setFeats(() => prev) })
  }
  const addFromDb = f => {
    setFeats(prev => [...prev, { id: genId(), name: f.name.de, type: f.type, desc: f.desc?.de ?? '', notes: '', source: f.source ?? '' }])
    toast(L ? `${f.name.de} hinzugefügt` : `${f.name.de} added`)
  }
  const editing = sheet?.type === 'edit' ? feats.find(f => f.id === sheet.id) ?? null : null

  return (
    <div className="nc-skills">
      <div className="nc-fp">
        <div className="nc-fp-row">
          <span className="nc-muted">{budget > 0 ? (L ? `Talente für Stufe ${totalLevel}` : `Feats for level ${totalLevel}`) : (L ? 'Talente' : 'Feats')}</span>
          <span className={`nc-fp-val is-${budget > 0 ? tone : 'ok'}`}>{feats.length}{budget > 0 ? ` / ${budget}` : ''}</span>
        </div>
        {budget > 0 && <div className="nc-fp-bar"><div className={`is-${tone}`} style={{ width: `${Math.min(100, (feats.length / budget) * 100)}%` }} /></div>}
        {fb.lines.length > 0 && (
          <div className="nc-feat-budget">
            {fb.lines.map((l, i) => (
              <span key={i} className="nc-feat-budget-line"><span>{l.classId ? `${classLabel(l.classId, lang)}: ${l.label}` : l.label}{l.sub && !l.classId ? <span className="nc-muted"> · {l.sub}</span> : null}</span><span className="nc-feat-budget-n">+{l.n}</span></span>
            ))}
          </div>
        )}
        {update && (
          <div className="nc-bd-misc-row">
            <span className="nc-bd-text"><span>{L ? 'Weitere Bonustalente' : 'Other bonus feats'}</span>
              <span className="nc-bd-sub">{unknownClasses.length ? (L ? `z. B. von ${unknownClasses.join(', ')} (Regeln nicht in den App-Daten), Domäne, Schurkentrick` : 'e.g. class, domain, rogue talent') : (L ? 'z. B. Domäne, Schurkentrick, Gegenstand' : 'e.g. domain, rogue talent')}</span></span>
            <Stepper value={Number(char.feats_extra ?? 0)} onChange={v => update({ feats_extra: v })} min={-10} max={20} label={L ? 'Weitere Bonustalente' : 'Other bonus feats'} />
          </div>
        )}
      </div>

      <div className="nc-chips">
        <button className="nc-btn nc-btn-secondary" onClick={() => setSheet({ type: 'edit', id: null })}><Plus />{L ? 'Talent anlegen' : 'Add feat'}</button>
        <button className="nc-btn nc-btn-ghost" onClick={() => { setSheet({ type: 'browse' }); setLimit(PAGE) }}><MagnifyingGlass />{L ? 'Datenbank durchsuchen' : 'Browse database'}</button>
      </div>

      <ListCard empty={!feats.length} emptyText={L ? 'Noch keine Talente.' : 'No feats yet.'}>
        {feats.map(f => {
          const url = featUrl(f.name, f.source)
          return (
            <div key={f.id} className="nc-feat-row">
              <button className="nc-feat-main" onClick={() => setSheet({ type: 'edit', id: f.id })}>
                <span className="nc-feat-top"><span className="nc-feat-name">{f.name}</span><span className={`nc-feat-type t-${f.type}`}>{typeLabel(f.type, L)}</span></span>
                {f.desc && <span className="nc-feat-desc">{f.desc}</span>}
                {f.notes && <span className="nc-feat-note">{f.notes}</span>}
              </button>
              {url && <RefLink className="nc-icon-btn" href={url} title="prd.5footstep.de"><ArrowSquareOut /></RefLink>}
            </div>
          )
        })}
      </ListCard>

      <Sheet open={!!sheet} onClose={close} layout={layout} label={L ? 'Talent' : 'Feat'}>
        {sheet?.type === 'edit' && <FeatEditor key={sheet.id ?? 'new'} feat={editing} onSave={save} onDelete={remove} onClose={close} lang={lang} />}
        {sheet?.type === 'browse' && (
          <div className="nc-edit">
            <div className="nc-edit-head"><span className="nc-sheet-title">{L ? 'Talent-Datenbank' : 'Feat database'}</span></div>
            <div className="nc-search"><MagnifyingGlass className="nc-accent-soft" />
              <input value={bq} onChange={e => { setBq(e.target.value); setLimit(PAGE) }} placeholder={L ? 'Name suchen' : 'Search name'} /></div>
            <div className="nc-chips">
              <button className={`nc-chip ${!btype ? 'is-on' : ''}`} onClick={() => { setBtype(''); setLimit(PAGE) }}>{L ? 'Alle' : 'All'}</button>
              {TYPES.filter(t => t !== 'Sonstige').map(t => <button key={t} className={`nc-chip ${btype === t ? 'is-on' : ''}`} onClick={() => { setBtype(t); setLimit(PAGE) }}>{typeLabel(t, L)}</button>)}
            </div>
            <span className="nc-hint">{browse.length} {L ? 'Treffer' : 'results'}</span>
            <div className="nc-search-hits">
              {browse.slice(0, limit).map(f => {
                const have = feats.some(x => x.name === f.name.de)
                return (
                  <div key={f.id} className="nc-feat-db">
                    <span className="nc-row-text">
                      <span className="nc-feat-top"><span className="nc-feat-name">{f.name.de}</span><span className={`nc-feat-type t-${f.type}`}>{typeLabel(f.type, L)}</span></span>
                      {f.desc?.de && <span className="nc-feat-desc">{f.desc.de}</span>}
                      {f.source && <span className="nc-row-sub">{f.source}</span>}
                    </span>
                    <button className={`nc-icon-btn ${have ? 'is-done' : ''}`} onClick={() => addFromDb(f)} aria-label={L ? 'Hinzufügen' : 'Add'} title={have ? (L ? 'Schon vorhanden – nochmal hinzufügen' : 'Already added') : (L ? 'Hinzufügen' : 'Add')}><Plus /></button>
                  </div>
                )
              })}
            </div>
            {browse.length > limit && <button className="nc-btn nc-btn-ghost" onClick={() => setLimit(limit + PAGE)}>{L ? `Weitere ${Math.min(PAGE, browse.length - limit)} anzeigen` : 'Show more'}</button>}
          </div>
        )}
      </Sheet>
    </div>
  )
}
