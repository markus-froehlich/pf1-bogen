import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ArrowSquareOut, MagnifyingGlass, Plus } from '@phosphor-icons/react'
import poisonsData from '../data/poisons.json'
import racialTraitsData from '../data/racial_traits.json'
import classFeaturesData from '../data/class_features.json'
import templatesData from '../data/templates.json'
import { RefLink } from '../components/RefLink.jsx'
import { Sheet } from '../shell/Sheet.jsx'
import { useToast } from '../shell/toastContext.js'
import { EditSheet, TextField, ChipsField, Field } from '../combat/EditSheet.jsx'
import { ListCard } from '../combat/ui.jsx'
import './more.css'

const ALL_TRAITS = [
  ...Object.values(racialTraitsData.by_race ?? {}).flatMap(list => list.map(t => ({ name: t.trait, desc: t.desc ?? '', from: t.name, kind: 'race' }))),
  ...(classFeaturesData.features ?? []).map(f => ({ name: f.trait ?? f.name, desc: f.desc ?? '', from: f.source ?? '', kind: 'class' })),
]
const RELATIONS = [['Verbündeter', 'Ally'], ['Feind', 'Enemy'], ['Neutral', 'Neutral'], ['Händler', 'Merchant'], ['Auftraggeber', 'Employer'], ['Familie', 'Family'], ['Bekannt', 'Acquaintance']]
const SOURCES = [['Rasse', 'Race'], ['Klasse', 'Class'], ['Archetyp', 'Archetype'], ['Talent', 'Feat'], ['Gegenstand', 'Item'], ['Sonstige', 'Other']]
const REL_TONE = { Verbündeter: 'pos', Ally: 'pos', Feind: 'neg', Enemy: 'neg', Familie: 'pos', Family: 'pos' }
const genId = () => Math.random().toString(36).slice(2, 10)
const slug = s => s.replace(/ä/g, 'ae').replace(/Ä/g, 'Ae').replace(/ö/g, 'oe').replace(/Ö/g, 'Oe').replace(/ü/g, 'ue').replace(/Ü/g, 'Ue').replace(/ß/g, 'ss').replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '')
const poisonUrl = p => (p.page?.startsWith('G') ? `http://prd.5footstep.de/Grundregelwerk/Anhang/BesondereFaehigkeiten/Gebrechen/Gifte/${slug(p.name)}` : null)

/** Karte (Name + Tag + Text), antippen = bearbeiten. */
function Card({ title, tag, tone, text, sub, onClick }) {
  return (
    <button className="nc-more-card" onClick={onClick}>
      <span className="nc-more-card-top"><span className="nc-more-card-title">{title}</span>{tag && <span className={`nc-tag nc-more-tag is-${tone ?? 'neutral'}`}>{tag}</span>}</span>
      {sub && <span className="nc-row-sub">{sub}</span>}
      {text && <span className="nc-more-card-text">{text}</span>}
    </button>
  )
}

function useCrud(list, setList, label, L) {
  const toast = useToast()
  const [edit, setEdit] = useState(undefined)            // undefined = zu, null = neu, id = bearbeiten
  return {
    edit, open: id => setEdit(id), close: () => setEdit(undefined),
    current: edit ? list.find(x => x.id === edit) ?? null : null,
    save: item => { setList(prev => (prev.some(x => x.id === item.id) ? prev.map(x => (x.id === item.id ? item : x)) : [...prev, item])); setEdit(undefined) },
    remove: id => {
      const prev = list
      const it = list.find(x => x.id === id)
      setList(l => l.filter(x => x.id !== id)); setEdit(undefined)
      toast(L ? `${it?.name || label} gelöscht` : `${it?.name || label} deleted`, { undo: () => setList(() => prev) })
    },
  }
}

export function NotesPage({ char, setNotes, lang }) {
  const L = lang === 'de'
  const ref = useRef(null)
  // Höhe an den Text anpassen (beim Öffnen und bei jeder Änderung), damit nichts versteckt scrollt
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => { el.style.height = 'auto'; el.style.height = `${el.scrollHeight + 2}px` }
    fit()
    let w = el.clientWidth
    const ro = new ResizeObserver(() => { if (el.clientWidth !== w) { w = el.clientWidth; fit() } })   // Drehen, Spaltenbreite
    ro.observe(el)
    return () => ro.disconnect()
  }, [char.notes])
  return (
    <div className="nc-page">
      <textarea ref={ref} className="nc-input nc-textarea nc-notes-area" value={char.notes ?? ''} onChange={e => setNotes(e.target.value)}
        placeholder={L ? 'Hintergrundgeschichte, Quests, Hinweise …' : 'Background, quests, notes …'} aria-label={L ? 'Notizen' : 'Notes'} />
      <span className="nc-hint">{L ? 'Wird automatisch gespeichert.' : 'Saved automatically.'}</span>
    </div>
  )
}

function ContactEditor({ item, onSave, onDelete, onClose, lang }) {
  const L = lang === 'de'
  const [d, setD] = useState(() => item ? { ...item } : { id: genId(), name: '', race: '', relation: '', notes: '' })
  const set = p => setD(prev => ({ ...prev, ...p }))
  return (
    <EditSheet lang={lang} title={item ? (L ? 'Kontakt bearbeiten' : 'Edit contact') : (L ? 'Kontakt anlegen' : 'Add contact')}
      onDelete={item ? () => onDelete(item.id) : null} onCancel={onClose} saveDisabled={!d.name.trim()} onSave={() => onSave({ ...d, name: d.name.trim() })}>
      <TextField label="Name" value={d.name} onChange={v => set({ name: v })} placeholder={L ? 'Name des NSC' : 'NPC name'} />
      <TextField label={L ? 'Volk / Typ' : 'Race / type'} value={d.race} onChange={v => set({ race: v })} />
      <ChipsField label={L ? 'Verhältnis' : 'Relation'} options={RELATIONS.map(([de, en]) => [L ? de : en, L ? de : en])} value={d.relation} onChange={v => set({ relation: d.relation === v ? '' : v })} />
      <TextField area label={L ? 'Notiz' : 'Note'} value={d.notes} onChange={v => set({ notes: v })} placeholder={L ? 'Ort, Beruf, Begegnungen …' : 'Location, job …'} />
    </EditSheet>
  )
}

export function ContactsPage({ char, setContacts, lang, layout }) {
  const L = lang === 'de'
  const list = char.contacts ?? []
  const c = useCrud(list, setContacts, L ? 'Kontakt' : 'Contact', L)
  return (
    <div className="nc-page">
      <ListCard empty={!list.length} emptyText={L ? 'Noch keine Kontakte.' : 'No contacts yet.'} addLabel={L ? 'Kontakt anlegen' : 'Add contact'} onAdd={() => c.open(null)}>
        {list.map(x => <Card key={x.id} title={x.name} tag={x.relation} tone={REL_TONE[x.relation]} sub={x.race} text={x.notes} onClick={() => c.open(x.id)} />)}
      </ListCard>
      <Sheet open={c.edit !== undefined} onClose={c.close} layout={layout} label={L ? 'Kontakt' : 'Contact'}>
        {c.edit !== undefined && <ContactEditor key={c.edit ?? 'new'} item={c.current} onSave={c.save} onDelete={c.remove} onClose={c.close} lang={lang} />}
      </Sheet>
    </div>
  )
}

function SpecialEditor({ item, onSave, onDelete, onClose, lang }) {
  const L = lang === 'de'
  const [d, setD] = useState(() => item ? { ...item } : { id: genId(), name: '', source: '', desc: '' })
  const [q, setQ] = useState('')
  const set = p => setD(prev => ({ ...prev, ...p }))
  const hits = useMemo(() => { const s = q.trim().toLowerCase(); return s.length < 2 ? [] : ALL_TRAITS.filter(t => t.name?.toLowerCase().includes(s)).slice(0, 10) }, [q])
  return (
    <EditSheet lang={lang} title={item ? (L ? 'Sonderfähigkeit bearbeiten' : 'Edit ability') : (L ? 'Sonderfähigkeit anlegen' : 'Add ability')}
      onDelete={item ? () => onDelete(item.id) : null} onCancel={onClose} saveDisabled={!d.name.trim()} onSave={() => onSave({ ...d, name: d.name.trim() })}>
      {!item && (
        <Field label={L ? 'Aus Volks- und Klassenmerkmalen' : 'From racial and class traits'}>
          <div className="nc-search"><MagnifyingGlass className="nc-accent-soft" /><input value={q} onChange={e => setQ(e.target.value)} placeholder={L ? 'Suchen, mind. 2 Zeichen' : 'Search, min. 2 letters'} /></div>
          {hits.length > 0 && (
            <div className="nc-search-hits">
              {hits.map((t, i) => (
                <button key={i} className="nc-search-hit" onClick={() => { set({ name: t.name, source: t.kind === 'race' ? (L ? 'Rasse' : 'Race') : (L ? 'Klasse' : 'Class'), desc: d.desc || t.desc }); setQ('') }}>
                  <span className="nc-row-text"><span className="nc-ellipsis">{t.name}</span>{t.desc && <span className="nc-row-sub nc-ellipsis">{t.desc}</span>}</span>
                  <span className="nc-search-meta">{t.kind === 'race' ? t.from.split(' ').slice(-1)[0] : t.from}</span>
                </button>
              ))}
            </div>
          )}
        </Field>
      )}
      <TextField label="Name" value={d.name} onChange={v => set({ name: v })} placeholder={L ? 'z. B. Dunkelsicht' : 'e.g. Darkvision'} />
      <ChipsField label={L ? 'Quelle' : 'Source'} options={SOURCES.map(([de, en]) => [L ? de : en, L ? de : en])} value={d.source} onChange={v => set({ source: d.source === v ? '' : v })} />
      <TextField area label={L ? 'Beschreibung' : 'Description'} value={d.desc} onChange={v => set({ desc: v })} placeholder={L ? 'Wirkung, Nutzungen …' : 'Effect, uses …'} />
    </EditSheet>
  )
}

export function SpecialsPage({ char, setSpecials, lang, layout }) {
  const L = lang === 'de'
  const list = char.specials ?? []
  const c = useCrud(list, setSpecials, L ? 'Fähigkeit' : 'Ability', L)
  return (
    <div className="nc-page">
      <ListCard empty={!list.length} emptyText={L ? 'Noch keine Sonderfähigkeiten.' : 'No special abilities yet.'} addLabel={L ? 'Sonderfähigkeit anlegen' : 'Add ability'} onAdd={() => c.open(null)}>
        {list.map(x => <Card key={x.id} title={x.name} tag={x.source} tone="accent" text={x.desc} onClick={() => c.open(x.id)} />)}
      </ListCard>
      <Sheet open={c.edit !== undefined} onClose={c.close} layout={layout} label={L ? 'Sonderfähigkeit' : 'Ability'}>
        {c.edit !== undefined && <SpecialEditor key={c.edit ?? 'new'} item={c.current} onSave={c.save} onDelete={c.remove} onClose={c.close} lang={lang} />}
      </Sheet>
    </div>
  )
}

/** Referenzliste mit Suche + aufklappbarem Detail; „+" übernimmt in die Sonderfähigkeiten. */
function RefList({ items, placeholder, countLabel, renderMeta, renderDetail, urlOf, onAdd, added, lang }) {
  const L = lang === 'de'
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(null)
  const shown = useMemo(() => { const s = q.trim().toLowerCase(); return s ? items.filter(x => x.name.toLowerCase().includes(s)) : items }, [q, items])
  return (
    <div className="nc-page">
      <div className="nc-search"><MagnifyingGlass className="nc-accent-soft" /><input value={q} onChange={e => { setQ(e.target.value); setOpen(null) }} placeholder={placeholder} /></div>
      <span className="nc-hint">{shown.length} {countLabel}</span>
      <div className="nc-card nc-card-list">
        {shown.map(x => {
          const isOpen = open === x.id
          const url = urlOf?.(x)
          const has = added(x.name)
          return (
            <div key={x.id} className="nc-ref-row">
              <div className="nc-ref-head">
                <button className="nc-spell-main" onClick={() => setOpen(isOpen ? null : x.id)} aria-expanded={isOpen}>
                  <span className="nc-spell-name">{x.name}</span>
                  <span className="nc-row-sub">{renderMeta(x)}</span>
                </button>
                {isOpen && url && <RefLink className="nc-icon-btn" href={url} title="prd.5footstep.de"><ArrowSquareOut /></RefLink>}
                <button className={`nc-icon-btn ${has ? 'is-active' : 'nc-muted'}`} onClick={() => onAdd(x)} aria-label={L ? 'Zu Sonderfähigkeiten' : 'Add to abilities'}
                  title={has ? (L ? 'Schon in den Sonderfähigkeiten' : 'Already added') : (L ? 'Zu Sonderfähigkeiten hinzufügen' : 'Add to abilities')}><Plus /></button>
              </div>
              {isOpen && <div className="nc-ref-detail">{renderDetail(x)}</div>}
            </div>
          )
        })}
        {!shown.length && <span className="nc-empty">{L ? 'Nichts gefunden.' : 'Nothing found.'}</span>}
      </div>
    </div>
  )
}

function useAddSpecial(char, setSpecials, L) {
  const toast = useToast()
  const names = new Set((char.specials ?? []).map(s => s.name))
  return {
    added: n => names.has(n),
    add: (name, desc) => {
      if (names.has(name)) { toast(L ? `${name} ist schon eingetragen` : 'Already added'); return }
      setSpecials(prev => [...prev, { id: genId(), name, source: L ? 'Sonstige' : 'Other', desc: desc ?? '' }])
      toast(L ? `${name} zu Sonderfähigkeiten hinzugefügt` : 'Added')
    },
  }
}

export function PoisonsPage({ char, setSpecials, lang }) {
  const L = lang === 'de'
  const s = useAddSpecial(char, setSpecials, L)
  const kv = (k, v) => (v && v !== '-' ? <div><span className="nc-ref-k">{k}</span>{v}</div> : null)
  return (
    <RefList items={poisonsData.poisons} lang={lang} placeholder={L ? 'Gift suchen' : 'Search poison'} countLabel={L ? 'Gifte' : 'poisons'}
      renderMeta={p => [p.type?.split(',')[0], p.dc ? `SG ${p.dc}` : null, p.page].filter(Boolean).join(' · ')}
      renderDetail={p => <>{kv(L ? 'Eintritt' : 'Onset', p.onset)}{kv(L ? 'Frequenz' : 'Frequency', p.freq)}{kv(L ? 'Effekt' : 'Effect', p.effect)}{kv(L ? 'Heilung' : 'Cure', p.cure)}</>}
      urlOf={poisonUrl} added={s.added} onAdd={p => s.add(p.name, [p.effect, p.dc ? `SG ${p.dc}` : null].filter(Boolean).join(' · '))} />
  )
}

export function TemplatesPage({ char, setSpecials, lang }) {
  const L = lang === 'de'
  const s = useAddSpecial(char, setSpecials, L)
  return (
    <RefList items={templatesData.templates} lang={lang} placeholder={L ? 'Schablone suchen' : 'Search template'} countLabel={L ? 'Schablonen' : 'templates'}
      renderMeta={t => t.page ?? ''} renderDetail={t => <div>{t.desc || (L ? `Siehe ${t.page ?? 'Quelle'}. Schablonen werden auf Kreaturen angewandt.` : 'See source.')}</div>}
      added={s.added} onAdd={t => s.add(t.name, t.desc || t.page || '')} />
  )
}
