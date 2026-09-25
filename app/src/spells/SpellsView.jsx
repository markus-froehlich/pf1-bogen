import { useEffect, useMemo, useRef, useState } from 'react'
import { Moon, GearSix, Check, X, Sparkle, BookOpen, MagnifyingGlass, ListChecks, PawPrint, Lightning, Plus } from '@phosphor-icons/react'
import { Sheet } from '../shell/Sheet.jsx'
import { useToast } from '../shell/toastContext.js'
import { sg } from '../combat/breakdown.js'
import { SummonsPanel } from '../components/SummonsPanel.jsx'
import {
  ALL_SPELLS, SPELL_MAP, LIST_NAMES, casterEntries, bookData, updateBook, gradeInfo, gradeTile, preparedEntries, newInstId,
  slotCost, classSpells, bookIds, bookName, copyCost, entryLabel, schoolOf, SCHOOLS,
} from './spellModel.js'
import { SpellRow, SpellSearchList, SlotPips, WandsCard, WandEditor, CasterSettings } from './spellParts.jsx'
import './spells.css'

const lsGet = (k, d) => { try { return localStorage.getItem(k) ?? d } catch { return d } }
const lsSet = (k, v) => { try { localStorage.setItem(k, v) } catch { /* privat */ } }

const KIND_TAG = {
  list: ['Vorbereitet · Klassenliste', 'Prepared · class list'],
  book: ['Vorbereitet · {book}', 'Prepared · {book}'],
  spont: ['Spontan', 'Spontaneous'],
  hybrid: ['Hybrid · Zauberbuch', 'Hybrid · spellbook'],
}
const KIND_HINT = {
  list: ['Bereitet täglich aus der ganzen Klassenliste vor. Doppelte Vorbereitung ist erlaubt.', 'Prepares daily from the full class list.'],
  book: ['Bereitet täglich nur Zauber aus dem {book} vor. Neue Zauber über „Nachschlagen" eintragen.', 'Prepares only from the {book}.'],
  spont: ['Wirkt bekannte Zauber frei mit den Plätzen des Grades. Grad 0 beliebig oft.', 'Casts known spells with slots.'],
  hybrid: ['Legt Zauber aus dem Zauberbuch bereit und wirkt sie spontan mit den Plätzen des Grades.', 'Prepares from the spellbook, casts spontaneously.'],
}
const MODES = {
  list: [['prep', 'Vorbereitet', 'Prepared', ListChecks], ['list', 'Klassenliste', 'Class list', MagnifyingGlass]],
  book: [['prep', 'Vorbereitet', 'Prepared', ListChecks], ['book', '{book}', '{book}', BookOpen], ['lookup', 'Nachschlagen', 'Lookup', MagnifyingGlass]],
  spont: [['known', 'Bekannt', 'Known', Lightning], ['learn', 'Lernen', 'Learn', MagnifyingGlass]],
  hybrid: [['ready', 'Bereit', 'Ready', Lightning], ['book', 'Zauberbuch', 'Spellbook', BookOpen], ['lookup', 'Nachschlagen', 'Lookup', MagnifyingGlass]],
}

export function SpellsView({ char, setSpellbook, setWands, setSummons, attrs, lang, layout }) {
  const L = lang === 'de'
  const toast = useToast()
  const sb = useMemo(() => char.spellbook ?? { class_id: '', levels: {} }, [char.spellbook])
  const entries = useMemo(() => casterEntries(char), [char])
  const [selKey, setSelKey] = useState(() => lsGet('pf1_spell_class', ''))
  const entry = entries.find(e => e.key === selKey) ?? entries[0] ?? null
  const [summon, setSummon] = useState(false)
  const [sheet, setSheet] = useState(null)

  // Plätze (berechnet) in levels[lv].total spiegeln — die Druckansicht liest diesen Wert.
  const totalsSig = entries.map(e => `${e.key}:${gradeInfo(e, bookData(sb, e), attrs).map(g => g.total).join(',')}`).join('|')
  useEffect(() => {
    for (const e of entries) {
      const d = bookData(sb, e)
      const gi = gradeInfo(e, d, attrs)
      const differs = gi.some(g => (d.levels?.[g.lv]?.total ?? 0) !== g.total && (g.total > 0 || d.levels?.[g.lv]))
      if (!differs) continue
      updateBook(setSpellbook, e, prev => {
        const levels = { ...(prev.levels ?? {}) }
        for (const g of gradeInfo(e, prev, attrs)) {
          if (g.total > 0 || levels[g.lv]) levels[g.lv] = { used: 0, prepared: [], ...(levels[g.lv] ?? {}), total: g.total }
        }
        return { ...prev, levels }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalsSig])

  const wands = char.wands ?? []
  const wandSheet = sheet?.type === 'wand'
  const closeSheet = () => setSheet(null)
  const saveWand = w => { setWands(prev => (prev.some(x => x.id === w.id) ? prev.map(x => (x.id === w.id ? w : x)) : [...prev, w])); closeSheet() }
  const deleteWand = id => {
    const prev = wands
    setWands(list => list.filter(w => w.id !== id)); closeSheet()
    toast(L ? 'Zauberstab gelöscht' : 'Wand deleted', { undo: () => setWands(() => prev) })
  }
  const wandsBlock = (
    <div className="nc-spell-block">
      <span className="nc-spell-block-title">{L ? 'Zauberstäbe' : 'Wands'}</span>
      <WandsCard wands={wands} setWands={setWands} onEdit={id => setSheet({ type: 'wand', id })} lang={lang} />
    </div>
  )
  const sheets = (
    <Sheet open={!!sheet} onClose={closeSheet} layout={layout} label={L ? 'Zauber' : 'Spells'}>
      {wandSheet && <WandEditor key={sheet.id ?? 'new'} wand={wands.find(w => w.id === sheet.id) ?? null} onSave={saveWand} onDelete={deleteWand} onClose={closeSheet} lang={lang} />}
    </Sheet>
  )

  if (summon || !entry) {
    return (
      <div className="nc-spells">
        {entry ? (
          <button className="nc-btn nc-btn-ghost nc-self-start" onClick={() => setSummon(false)}><X />{L ? 'Zurück zu den Zaubern' : 'Back to spells'}</button>
        ) : (
          <div className="nc-card nc-card-pad"><span className="nc-spell-head-title">{L ? 'Kein Zauberwirker' : 'No spellcaster'}</span>
            <span className="nc-hint">{L ? 'Keine Klasse mit Zaubern gewählt. Zauberlisten lassen sich trotzdem nachschlagen.' : 'No casting class. You can still browse spell lists.'}</span></div>
        )}
        {summon ? <SummonsPanel char={char} setSummons={setSummons} lang={lang} /> : <>
          <FreeLookup lang={lang} />
          {setSummons && <button className="nc-btn nc-btn-secondary" onClick={() => setSummon(true)}><PawPrint />{L ? 'Herbeizaubern (Monster)' : 'Summon monsters'}</button>}
          {wandsBlock}
        </>}
        {sheets}
      </div>
    )
  }

  return (
    <div className="nc-spells">
      {entries.length > 1 && (
        <div className="nc-chips nc-spell-pills">
          {entries.map(e => <button key={e.key} className={`nc-chip ${e.key === entry.key ? 'is-on' : ''}`} onClick={() => { setSelKey(e.key); lsSet('pf1_spell_class', e.key) }}>{entryLabel(e, lang)}</button>)}
        </div>
      )}
      <CasterView key={entry.key} entry={entry} sb={sb} attrs={attrs} setSpellbook={setSpellbook} lang={lang} layout={layout} />
      {setSummons && <button className="nc-btn nc-btn-secondary" onClick={() => setSummon(true)}><PawPrint />{L ? 'Herbeizaubern (Monster)' : 'Summon monsters'}</button>}
      {wandsBlock}
      {sheets}
    </div>
  )
}

/** Eine Zauberklasse: Kopfkarte, Modi, Grad-Kacheln, Listen. */
function CasterView({ entry, sb, attrs, setSpellbook, lang, layout }) {
  const L = lang === 'de'
  const toast = useToast()
  const data = bookData(sb, entry)
  const grades = gradeInfo(entry, data, attrs)
  const shownGrades = grades.filter(g => g.accessible || (data.levels?.[g.lv]?.prepared?.length ?? 0) > 0)
  const [modeByKind, setModeByKind] = useState(() => { try { return JSON.parse(lsGet('pf1_spell_modes', '{}')) } catch { return {} } })
  const [gradeSel, setGradeSel] = useState(null)
  const [sheet, setSheet] = useState(null)
  const closeSheet = () => setSheet(null)
  const sbRef = useRef(sb)
  useEffect(() => { sbRef.current = sb }, [sb])

  const kind = entry.kind
  const bName = bookName(entry.charId, L)
  const fill = s => s.replace('{book}', bName)
  const modes = MODES[kind]
  const mode = modes.some(m => m[0] === modeByKind[kind]) ? modeByKind[kind] : modes[0][0]
  const pickMode = m => { const next = { ...modeByKind, [kind]: m }; setModeByKind(next); lsSet('pf1_spell_modes', JSON.stringify(next)) }
  const firstGrade = shownGrades.find(g => g.lv >= 1)?.lv ?? shownGrades[0]?.lv ?? 0
  const lv = shownGrades.some(g => g.lv === gradeSel) ? gradeSel : firstGrade
  const g = grades[lv]
  const lvData = data.levels?.[lv] ?? { total: 0, used: 0, prepared: [] }
  const inst = preparedEntries(lvData.prepared, lv)
  const mod = attrs?.[entry.stat]?.mod ?? 0
  const patchLevel = (level, fn) => updateBook(setSpellbook, entry, d => {
    const cur = { total: 0, used: 0, prepared: [], ...(d.levels?.[level] ?? {}) }
    return { ...d, levels: { ...d.levels, [level]: fn({ ...cur, prepared: preparedEntries(cur.prepared, level) }) } }
  })
  function addInstance(level, spellId, slot) {
    patchLevel(level, cur => ({ ...cur, prepared: [...cur.prepared, { id: newInstId(), spell_id: spellId, used: false, ...(slot ? { slot } : {}) }] }))
  }
  const undoable = (msg, fn) => { const prev = sbRef.current; fn(); toast(msg, { undo: () => setSpellbook(() => prev) }) }
  const spellName = id => SPELL_MAP[id]?.name?.de ?? id

  function newDay() {
    undoable(L ? `${entryLabel(entry, lang)}: neuer Tag` : 'New day', () => updateBook(setSpellbook, entry, d => ({
      ...d, levels: Object.fromEntries(Object.entries(d.levels ?? {}).map(([k, v]) => [k, { ...v, used: 0, prepared: preparedEntries(v.prepared, Number(k)).map(i => ({ ...i, used: false })) }])),
    })))
  }

  // Freie Plätze (Vorbereiten): normale und Sonderplätze getrennt
  const specialUsed = inst.filter(i => i.slot === 'special').length
  const normalUsed = inst.filter(i => i.slot !== 'special').reduce((a, i) => a + slotCost(i.spell_id, data), 0)
  const normalFree = Math.max(0, g.total - g.special - normalUsed)
  const specialFree = Math.max(0, g.special - specialUsed)
  const over = normalUsed > g.total - g.special
  const nonBonusKnown = inst.filter(i => !(lvData.bloodline_ids ?? []).includes(i.spell_id)).length
  const used = Number(lvData.used ?? 0)
  const slotsLeft = Math.max(0, g.total - used)
  const cast = () => { if (g.unlimited) { toast(L ? 'Grad 0 – beliebig oft' : 'Level 0 – at will'); return } patchLevel(lv, cur => ({ ...cur, used: Math.min(g.total, Number(cur.used ?? 0) + 1) })) }
  const restoreOne = () => patchLevel(lv, cur => ({ ...cur, used: Math.max(0, Number(cur.used ?? 0) - 1) }))
  const removeInst = i => undoable(L ? `${spellName(i.spell_id)} entfernt` : 'Removed', () => patchLevel(lv, cur => ({
    ...cur, prepared: cur.prepared.filter(x => x.id !== i.id),
    bloodline_ids: (cur.bloodline_ids ?? []).filter(id => id !== i.spell_id || cur.prepared.some(x => x.id !== i.id && x.spell_id === id)),
  })))
  const toggleUsed = i => patchLevel(lv, cur => ({ ...cur, prepared: cur.prepared.map(x => (x.id === i.id ? { ...x, used: !x.used } : x)) }))
  const toggleBonus = id => patchLevel(lv, cur => { const ids = cur.bloodline_ids ?? []; return { ...cur, bloodline_ids: ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id] } })
  const addToBook = (level, id) => updateBook(setSpellbook, entry, d => ({ ...d, book: { ...(d.book ?? {}), [level]: [...new Set([...(d.book?.[level] ?? []), id])] } }))
  const removeFromBook = id => undoable(L ? `${spellName(id)} aus dem ${bName} entfernt` : 'Removed from book', () => updateBook(setSpellbook, entry, d => ({
    ...d, book: { ...(d.book ?? {}), [lv]: (d.book?.[lv] ?? []).filter(x => x !== id) },
    levels: { ...d.levels, [lv]: { ...(d.levels?.[lv] ?? {}), prepared: preparedEntries(d.levels?.[lv]?.prepared, lv).filter(x => x.spell_id !== id) } },
  })))
  const tagsFor = i => <>
    {i.slot === 'special' && <span className="nc-tag nc-tag-accent">{g.specialLabel}</span>}
    {slotCost(i.spell_id, data) > 1 && <span className="nc-tag nc-tag-warn">{L ? 'Gegnerschule ×2' : 'Opposed ×2'}</span>}
    {(lvData.bloodline_ids ?? []).includes(i.spell_id) && <span className="nc-tag nc-tag-accent">Bonus</span>}
  </>
  const prepareFromList = id => {
    if (normalFree <= 0 && !(g.unlimited && inst.length < g.total)) {
      toast(L ? `Keine freien Plätze auf Grad ${lv}` : `No free slots at level ${lv}`); return
    }
    if (slotCost(id, data) > normalFree) { toast(L ? 'Gegnerschule: braucht zwei freie Plätze' : 'Opposed: needs two slots'); return }
    addInstance(lv, id, null); toast(L ? `${spellName(id)} vorbereitet` : 'Prepared')
  }

  // ── Körper je Modus ──
  let body = null
  if (mode === 'prep') {
    body = <>
      <span className={`nc-hint ${over ? 'nc-neg' : ''}`}>
        {g.unlimited ? (L ? `Grad 0 · beliebig oft wirken · ${inst.length} von ${g.total} vorbereitet` : `Level 0 · at will · ${inst.length}/${g.total} prepared`)
          : over ? (L ? 'Mehr vorbereitet als Plätze vorhanden' : 'More prepared than slots')
            : (L ? `${gradeTile(entry, data, g).left} von ${g.total} übrig · Kästchen = gewirkt` : `${gradeTile(entry, data, g).left} of ${g.total} left · box = cast`)}
      </span>
      <div className="nc-card nc-card-list">
        {inst.map(i => (
          <SpellRow key={i.id} spellId={i.spell_id} dc={g.dc} lang={lang} done={i.used && !g.unlimited} tags={tagsFor(i)}
            lead={!g.unlimited ? <button className={`nc-check ${i.used ? 'is-on' : ''}`} onClick={() => toggleUsed(i)} aria-pressed={i.used} aria-label={L ? 'Gewirkt' : 'Cast'}>{i.used && <Check weight="bold" />}</button> : null}
            actions={<button className="nc-icon-btn nc-muted" onClick={() => removeInst(i)} aria-label={L ? 'Entfernen' : 'Remove'}><X /></button>} />
        ))}
        {Array.from({ length: g.unlimited ? Math.max(0, g.total - inst.length) : normalFree }, (_, k) => (
          <button key={`f${k}`} className="nc-free-slot" onClick={() => setSheet({ type: 'pick', lv, slot: null })}><Plus />{L ? 'Freier Platz – vorbereiten' : 'Free slot – prepare'}</button>
        ))}
        {!g.unlimited && Array.from({ length: specialFree }, (_, k) => (
          <button key={`s${k}`} className="nc-free-slot is-special" onClick={() => setSheet({ type: 'pick', lv, slot: 'special' })}><Plus />{L ? `${g.specialLabel}nplatz – vorbereiten` : 'Special slot – prepare'}</button>
        ))}
      </div>
    </>
  } else if (mode === 'list') {
    body = <SpellSearchList spells={classSpells(entry.listId, lv)} dc={g.dc} lang={lang}
      placeholder={L ? `${LIST_NAMES[entry.listId]?.de ?? ''}-Zauber suchen` : 'Search spells'}
      hint={L ? `${LIST_NAMES[entry.listId]?.de ?? ''}-Liste Grad ${lv} · alles darf vorbereitet werden` : `Class list level ${lv}`}
      emptyText={L ? 'Keine Zauber gefunden.' : 'No spells found.'}
      renderActions={s => <button className="nc-btn nc-btn-small" onClick={() => prepareFromList(s.id)}>{L ? 'Vorbereiten' : 'Prepare'}</button>} />
  } else if (mode === 'book') {
    const ids = bookIds(data, lv)
    body = <>
      <span className="nc-hint">{L ? `${ids.length} Zauber im ${bName} auf Grad ${lv}` : `${ids.length} spells in ${bName}`}</span>
      <div className="nc-card nc-card-list">
        {ids.map(id => <SpellRow key={id} spellId={id} dc={g.dc} lang={lang}
          actions={<>
            <button className="nc-btn nc-btn-small" onClick={() => (kind === 'hybrid' ? readyFromBook(id) : prepareFromList(id))}>{kind === 'hybrid' ? (L ? 'Bereitlegen' : 'Ready') : (L ? 'Vorbereiten' : 'Prepare')}</button>
            <button className="nc-icon-btn nc-muted" onClick={() => removeFromBook(id)} aria-label={L ? 'Aus dem Buch entfernen' : 'Remove from book'}><X /></button>
          </>} />)}
        {!ids.length && <span className="nc-empty">{L ? `Noch nichts im ${bName} auf Grad ${lv}. Über „Nachschlagen" eintragen.` : 'Nothing here yet – use Lookup.'}</span>}
      </div>
    </>
  } else if (mode === 'lookup') {
    const inBook = new Set(bookIds(data, lv))
    const showCost = bName === 'Zauberbuch' || bName === 'Spellbook'
    body = <SpellSearchList spells={classSpells(entry.listId, lv)} dc={g.dc} lang={lang}
      placeholder={L ? 'Zauber suchen' : 'Search spells'}
      hint={showCost ? (L ? `Eintragen kostet ${copyCost(lv)} GM (Grad ${lv}; GRW: Grad 0 = 5 GM, sonst Grad² × 10 GM)` : `Copying costs ${copyCost(lv)} gp`) : null}
      emptyText={L ? 'Keine Zauber gefunden.' : 'No spells found.'}
      renderActions={s => (inBook.has(s.id)
        ? <span className="nc-tag nc-tag-neutral"><Check />{L ? 'Im Buch' : 'In book'}</span>
        : <button className="nc-btn nc-btn-small" onClick={() => { addToBook(lv, s.id); toast(L ? `${s.name.de} eingetragen${showCost ? ` · ${copyCost(lv)} GM` : ''}` : 'Added') }}>
          {L ? 'Ins Buch' : 'To book'}{showCost ? ` · ${copyCost(lv)} GM` : ''}</button>)} />
  } else if (mode === 'known' || mode === 'ready') {
    const max = mode === 'ready' ? (g.knownMax ?? 0) : g.knownMax
    const countShown = mode === 'ready' ? inst.length : nonBonusKnown
    body = <>
      <div className="nc-card nc-card-pad nc-slot-card">
        <span className="nc-row-text">
          <span className="nc-spell-name">{g.unlimited ? (L ? 'Beliebig oft' : 'At will') : (L ? `${slotsLeft} von ${g.total} Plätzen übrig` : `${slotsLeft} of ${g.total} slots left`)}</span>
          <span className="nc-row-sub">{mode === 'ready' ? (L ? `bereit ${countShown}/${max}` : `ready ${countShown}/${max}`) : (L ? `bekannt ${countShown}/${max ?? '—'}` : `known ${countShown}/${max ?? '—'}`)}</span>
        </span>
        {!g.unlimited && g.total > 0 && <SlotPips total={g.total} used={used} onUse={cast} onRestore={restoreOne} lang={lang} />}
      </div>
      <div className="nc-card nc-card-list">
        {inst.map(i => (
          <SpellRow key={i.id} spellId={i.spell_id} dc={g.dc} lang={lang} tags={tagsFor(i)}
            actions={<>
              <button className="nc-btn nc-btn-small" onClick={cast} disabled={!g.unlimited && slotsLeft <= 0}>{L ? 'Wirken' : 'Cast'}</button>
              {mode === 'known' && <button className={`nc-icon-btn ${(lvData.bloodline_ids ?? []).includes(i.spell_id) ? 'is-active' : 'nc-muted'}`} onClick={() => toggleBonus(i.spell_id)}
                aria-label={L ? 'Bonuszauber (Blutlinie/Mysterium) – zählt nicht mit' : 'Bonus spell'} title={L ? 'Bonuszauber (Blutlinie/Mysterium) – zählt nicht mit' : 'Bonus spell'}><Sparkle /></button>}
              <button className="nc-icon-btn nc-muted" onClick={() => removeInst(i)} aria-label={L ? 'Entfernen' : 'Remove'}><X /></button>
            </>} />
        ))}
        {mode === 'ready' && Array.from({ length: Math.max(0, max - inst.length) }, (_, k) => (
          <button key={k} className="nc-free-slot" onClick={() => setSheet({ type: 'pick', lv, slot: null })}><Plus />{L ? 'Aus dem Zauberbuch bereitlegen' : 'Ready from spellbook'}</button>
        ))}
        {mode === 'known' && !inst.length && <span className="nc-empty">{L ? 'Noch keine bekannten Zauber. Über „Lernen" hinzufügen.' : 'No known spells yet.'}</span>}
      </div>
    </>
  } else if (mode === 'learn') {
    const known = new Set(inst.map(i => i.spell_id))
    const full = g.knownMax != null && nonBonusKnown >= g.knownMax
    body = <SpellSearchList spells={classSpells(entry.listId, lv)} dc={g.dc} lang={lang}
      placeholder={L ? 'Zauber suchen' : 'Search spells'}
      hint={full ? (L ? `Grad ${lv} voll (${nonBonusKnown}/${g.knownMax}). Bonuszauber (✦) zählen nicht mit.` : 'Level full.') : (L ? `bekannt ${nonBonusKnown}/${g.knownMax ?? '—'} · ✦ = als Bonuszauber lernen` : 'known')}
      emptyText={L ? 'Keine Zauber gefunden.' : 'No spells found.'}
      renderActions={s => (known.has(s.id)
        ? <span className="nc-tag nc-tag-neutral"><Check />{L ? 'Bekannt' : 'Known'}</span>
        : <>
          <button className="nc-btn nc-btn-small" disabled={full} onClick={() => { addInstance(lv, s.id, null); toast(L ? `${s.name.de} gelernt` : 'Learned') }}>{L ? 'Lernen' : 'Learn'}</button>
          <button className="nc-icon-btn nc-muted" title={L ? 'Als Bonuszauber lernen' : 'Learn as bonus'} aria-label={L ? 'Als Bonuszauber lernen' : 'Learn as bonus'}
            onClick={() => { patchLevel(lv, cur => ({ ...cur, prepared: [...cur.prepared, { id: newInstId(), spell_id: s.id, used: false }], bloodline_ids: [...new Set([...(cur.bloodline_ids ?? []), s.id])] })); toast(L ? `${s.name.de} als Bonuszauber` : 'Bonus spell added') }}><Sparkle /></button>
        </>)} />
  }
  function readyFromBook(id) {
    if (inst.length >= (g.knownMax ?? 0)) { toast(L ? `Grad ${lv}: schon ${g.knownMax} bereit` : 'Full'); return }
    addInstance(lv, id, null); toast(L ? `${spellName(id)} bereitgelegt` : 'Readied')
  }

  const typeTag = fill(KIND_TAG[kind][L ? 0 : 1])
  return (
    <>
      <div className="nc-card nc-card-pad nc-spell-head">
        <div className="nc-spell-head-top">
          <span className="nc-spell-head-title">{entryLabel(entry, lang)}</span>
          <button className="nc-icon-btn" onClick={() => setSheet({ type: 'settings' })} aria-label={L ? 'Einstellungen' : 'Settings'}><GearSix /></button>
          <button className="nc-btn nc-btn-ghost" onClick={newDay}><Moon />{L ? 'Neuer Tag' : 'New day'}</button>
        </div>
        <div className="nc-spell-head-meta">
          <span className="nc-tag nc-tag-accent">{typeTag}</span>
          <span>{entry.stat} {sg(mod)} · ZS {entry.cl} · {L ? 'Konz.' : 'Conc.'} {sg(entry.cl + mod)}</span>
          {entry.charId === 'magier' && data.school && data.school !== 'universal' && <span className="nc-tag nc-tag-neutral">{L ? 'Schule' : 'School'}: {SCHOOLS[data.school] ?? data.school}</span>}
        </div>
        <span className="nc-hint">{fill(KIND_HINT[kind][L ? 0 : 1])}{data.notes ? ` · ${data.notes}` : ''}</span>
      </div>

      <div className="nc-seg is-full">
        {modes.map(([k, de, en, Icon]) => (
          <button key={k} className={`nc-seg-opt ${mode === k ? 'is-on' : ''}`} onClick={() => pickMode(k)}><Icon />{fill(L ? de : en)}</button>
        ))}
      </div>

      {shownGrades.length > 0 ? <>
        <div className="nc-grade-tiles" role="tablist">
          {shownGrades.map(gg => {
            const t = gradeTile(entry, data, gg)
            const val = gg.unlimited ? '∞' : `${t.left}/${gg.total}`
            return (
              <button key={gg.lv} role="tab" aria-selected={gg.lv === lv} className={`nc-grade-tile ${gg.lv === lv ? 'is-on' : ''} ${!gg.unlimited && t.left === 0 && gg.total > 0 ? 'is-empty' : ''}`} onClick={() => setGradeSel(gg.lv)}>
                <span className="nc-grade-label">{L ? 'Grad' : 'Lvl'} {gg.lv}</span>
                <span className="nc-grade-val">{val}</span>
                <span className="nc-grade-dc">SG {gg.dc}</span>
              </button>
            )
          })}
        </div>
        {body}
      </> : <span className="nc-empty">{L ? `Auf Stufe ${entry.level} noch keine Zauber (${entryLabel(entry, lang)}).` : 'No spells at this level yet.'}</span>}

      <Sheet open={!!sheet} onClose={closeSheet} layout={layout} label={L ? 'Zauber' : 'Spells'}>
        {sheet?.type === 'settings' && (
          <CasterSettings entry={entry} data={data} grades={grades} lang={lang}
            onPatch={p => updateBook(setSpellbook, entry, d => ({ ...d, ...p }))}
            onAdjust={(level, v) => updateBook(setSpellbook, entry, d => ({ ...d, levels: { ...d.levels, [level]: { total: 0, used: 0, prepared: [], ...(d.levels?.[level] ?? {}), adjust: v } } }))} />
        )}
        {sheet?.type === 'pick' && <PickSheet entry={entry} data={data} g={grades[sheet.lv]} slot={sheet.slot} lang={lang}
          onPick={id => { addInstance(sheet.lv, id, sheet.slot); closeSheet() }} />}
      </Sheet>
    </>
  )
}

/** Auswahl für einen freien Platz: Klassenliste (vorbereitet) oder Buch (Buch/Hybrid). */
function PickSheet({ entry, data, g, slot, onPick, lang }) {
  const L = lang === 'de'
  const fromBook = entry.kind === 'book' || entry.kind === 'hybrid'
  const spells = fromBook ? bookIds(data, g.lv).map(id => SPELL_MAP[id]).filter(Boolean) : classSpells(entry.listId, g.lv)
  return (
    <div className="nc-edit">
      <div className="nc-edit-head"><span className="nc-sheet-title">{slot === 'special' ? (L ? `${g.specialLabel}nplatz · Grad ${g.lv}` : `Special slot · level ${g.lv}`) : (L ? `Vorbereiten · Grad ${g.lv}` : `Prepare · level ${g.lv}`)}</span></div>
      {slot === 'special' && <span className="nc-hint">{entry.charId === 'magier' ? (L ? 'Nur Zauber der eigenen Schule.' : 'Only spells of your school.') : (L ? 'Domänen-/Geistzauber des Grades (Liste nicht in den Daten – bitte selbst wählen).' : 'Domain spell of this level.')}</span>}
      <SpellSearchList spells={entry.charId === 'magier' && slot === 'special' ? spells.filter(s => schoolOf(s) === data.school) : spells} dc={g.dc} lang={lang}
        placeholder={L ? 'Zauber suchen' : 'Search spells'}
        emptyText={fromBook ? (L ? 'Keine passenden Zauber im Buch. Über „Nachschlagen" eintragen.' : 'Nothing in the book.') : (L ? 'Keine Zauber gefunden.' : 'No spells found.')}
        renderActions={s => <button className="nc-btn nc-btn-small" onClick={() => onPick(s.id)}>{L ? 'Wählen' : 'Pick'}</button>} />
    </div>
  )
}

/** Nachschlagen ohne Zauberklasse: Liste + Grad frei wählbar. */
function FreeLookup({ lang }) {
  const L = lang === 'de'
  const [list, setList] = useState('hxm_magier')
  const [lv, setLv] = useState(1)
  const grades = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(g => ALL_SPELLS.some(s => s.class_levels[list] === g))
  const cur = grades.includes(lv) ? lv : grades[0] ?? 0
  return <>
    <label className="nc-field"><span>{L ? 'Zauberliste' : 'Spell list'}</span>
      <select className="nc-input" value={list} onChange={e => setList(e.target.value)}>
        {Object.entries(LIST_NAMES).map(([id, v]) => <option key={id} value={id}>{v.de}</option>)}
      </select></label>
    <div className="nc-chips nc-spell-pills">{grades.map(g => <button key={g} className={`nc-chip ${g === cur ? 'is-on' : ''}`} onClick={() => setLv(g)}>{L ? 'Grad' : 'Lvl'} {g}</button>)}</div>
    <SpellSearchList spells={classSpells(list, cur)} lang={lang} placeholder={L ? 'Zauber suchen' : 'Search spells'} emptyText={L ? 'Keine Zauber gefunden.' : 'No spells found.'} renderActions={() => null} />
  </>
}
