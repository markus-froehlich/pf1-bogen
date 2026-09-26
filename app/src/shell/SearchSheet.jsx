import { useMemo, useState } from 'react'
import { MagnifyingGlass, CaretRight, ListChecks, Backpack, NotePencil, MagicWand, Sparkle, UsersThree, Lightning, Flask, Stack, Star } from '@phosphor-icons/react'
import skillsData from '../data/skills.json'
import poisonsData from '../data/poisons.json'
import templatesData from '../data/templates.json'
import { ALL_SPELLS, SPELL_MAP, preparedEntries } from '../spells/spellModel.js'
import { carriedWeight, coinValueGp } from '../inventory/carry.js'

const fmt = n => (Number(n) || 0).toLocaleString('de-DE', { maximumFractionDigits: 1 })
const MAX_PER_GROUP = 6

/** Zauber, die der Charakter vorbereitet/kennt (alle Zauberklassen). */
function charSpells(sb) {
  const out = new Map()
  const collect = d => {
    for (const [lv, v] of Object.entries(d?.levels ?? {})) for (const e of preparedEntries(v.prepared, Number(lv))) out.set(e.spell_id, Number(lv))
    for (const [lv, ids] of Object.entries(d?.book ?? {})) for (const id of ids) if (!out.has(id)) out.set(id, Number(lv))
  }
  collect(sb)
  Object.values(sb?.others ?? {}).forEach(collect)
  return out
}

/** Suche (⌘/Strg + K): eigene Daten zuerst, dann Nachschlagewerke. Treffer springen zum passenden Bereich. */
export function SearchSheet({ char, lang, featBudget, featsHave, onGo }) {
  const L = lang === 'de'
  const [q, setQ] = useState('')
  const s = q.trim().toLowerCase()
  const inv = char.inventory ?? {}

  const groups = useMemo(() => {
    if (s.length < 2) return []
    const has = t => String(t ?? '').toLowerCase().includes(s)
    const inv = char.inventory ?? {}
    const mine = charSpells(char.spellbook)
    const g = [
      { key: 'skills', label: L ? 'Fertigkeiten' : 'Skills', Icon: ListChecks, go: { tab: 'skills', skillsMode: 'skills' },
        hits: skillsData.skills.filter(d => has(d.name.de) || has(d.name.en)).map(d => ({ id: d.id, title: d.name[lang] ?? d.name.de, sub: d.ability })) },
      { key: 'feats', label: L ? 'Talente' : 'Feats', Icon: Star, go: { tab: 'skills', skillsMode: 'feats' },
        hits: (char.feats ?? []).filter(f => has(f.name) || has(f.notes)).map(f => ({ id: f.id, title: f.name, sub: f.type })) },
      { key: 'items', label: L ? 'Gegenstände' : 'Items', Icon: Backpack, go: { tab: 'inventory' },
        hits: [...(inv.items ?? []).filter(i => has(i.name) || has(i.notes)).map(i => ({ id: i.id, title: i.name, sub: i.bag || (L ? 'getragen' : 'worn') })),
          ...Object.entries(char.magic_slots ?? {}).filter(([, v]) => has(v)).map(([k, v]) => ({ id: `slot_${k}`, title: v, sub: L ? `Magischer Platz · ${k}` : `Magic slot · ${k}` })),
          ...(char.wands ?? []).filter(w => has(w.name)).map(w => ({ id: w.id, title: w.name, sub: `${w.charges}/${w.max_charges}`, go: { tab: 'spells' } }))] },
      { key: 'myspells', label: L ? 'Meine Zauber' : 'My spells', Icon: MagicWand, go: { tab: 'spells' },
        hits: [...mine.entries()].filter(([id]) => has(SPELL_MAP[id]?.name?.de)).map(([id, lv]) => ({ id, title: SPELL_MAP[id].name.de, sub: `${L ? 'Grad' : 'Level'} ${lv} · ${SPELL_MAP[id].school ?? ''}` })) },
      { key: 'specials', label: L ? 'Sonderfähigkeiten' : 'Special abilities', Icon: Lightning, go: { tab: 'more', morePage: 'specials' },
        hits: (char.specials ?? []).filter(x => has(x.name) || has(x.desc)).map(x => ({ id: x.id, title: x.name, sub: x.source })) },
      { key: 'contacts', label: L ? 'Kontakte' : 'Contacts', Icon: UsersThree, go: { tab: 'more', morePage: 'contacts' },
        hits: (char.contacts ?? []).filter(x => has(x.name) || has(x.notes) || has(x.race)).map(x => ({ id: x.id, title: x.name, sub: [x.relation, x.race].filter(Boolean).join(' · ') })) },
      { key: 'notes', label: L ? 'Notizen' : 'Notes', Icon: NotePencil, go: { tab: 'more', morePage: 'notes' },
        hits: has(char.notes) ? [{ id: 'notes', title: L ? 'Treffer in den Notizen' : 'Match in notes', sub: excerpt(char.notes, s) }] : [] },
      { key: 'spells', label: L ? 'Zauber (Nachschlagen)' : 'Spells (reference)', Icon: Sparkle, go: { tab: 'spells' },
        hits: ALL_SPELLS.filter(x => !mine.has(x.id) && has(x.name.de)).map(x => ({ id: x.id, title: x.name.de, sub: [x.school, x.page].filter(Boolean).join(' · ') })) },
      { key: 'poisons', label: L ? 'Gifte' : 'Poisons', Icon: Flask, go: { tab: 'more', morePage: 'poisons' },
        hits: poisonsData.poisons.filter(p => has(p.name)).map(p => ({ id: p.id, title: p.name, sub: [p.type, p.dc ? `SG ${p.dc}` : null].filter(Boolean).join(' · ') })) },
      { key: 'templates', label: L ? 'Schablonen' : 'Templates', Icon: Stack, go: { tab: 'more', morePage: 'templates' },
        hits: templatesData.templates.filter(t => has(t.name)).map(t => ({ id: t.id, title: t.name, sub: t.page })) },
    ]
    return g.filter(x => x.hits.length)
  }, [s, char, lang, L])

  const w = carriedWeight(inv)
  const quick = [
    { id: 'feats', Icon: Star, title: L ? 'Talente' : 'Feats', sub: `${featsHave ?? (char.feats ?? []).length}${featBudget ? `/${featBudget}` : ''}`, go: { tab: 'skills', skillsMode: 'feats' } },
    { id: 'inv', Icon: Backpack, title: L ? 'Inventar' : 'Inventory', sub: `${fmt(coinValueGp(inv.coins))} ${L ? 'GM' : 'gp'} · ${fmt(w.total)} Pfd.`, go: { tab: 'inventory' } },
    { id: 'notes', Icon: NotePencil, title: L ? 'Notizen' : 'Notes', sub: L ? 'Öffnen' : 'Open', go: { tab: 'more', morePage: 'notes' } },
  ]
  const total = groups.reduce((a, g) => a + g.hits.length, 0)

  return (
    <div className="nc-edit nc-search-sheet">
      <div className="nc-search">
        <MagnifyingGlass className="nc-accent-soft" />
        <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder={L ? 'Suchen: Talent, Zauber, Gegenstand …' : 'Search: feat, spell, item …'} aria-label={L ? 'Suche' : 'Search'}
          onKeyDown={e => { if (e.key === 'Enter' && groups[0]) onGo(groups[0].hits[0].go ?? groups[0].go) }} />
      </div>
      {s.length < 2 ? <>
        <span className="nc-edit-label">{L ? 'Schnellzugriff' : 'Quick access'}</span>
        <div className="nc-search-hits">
          {quick.map(x => <Hit key={x.id} Icon={x.Icon} title={x.title} sub={x.sub} onClick={() => onGo(x.go)} />)}
        </div>
      </> : <>
        {!total && <span className="nc-empty">{L ? 'Nichts gefunden.' : 'Nothing found.'}</span>}
        {groups.map(g => (
          <div key={g.key} className="nc-edit-field">
            <span className="nc-edit-label">{g.label}{g.hits.length > MAX_PER_GROUP ? ` · ${g.hits.length}` : ''}</span>
            <div className="nc-search-hits">
              {g.hits.slice(0, MAX_PER_GROUP).map(h => <Hit key={h.id} Icon={g.Icon} title={h.title} sub={h.sub} onClick={() => onGo(h.go ?? g.go)} />)}
            </div>
          </div>
        ))}
      </>}
      <span className="nc-hint">{L ? 'Durchsucht Talente, Zauber, Gegenstände und Fertigkeiten dieses Charakters – Treffer antippen springt direkt dorthin. Am Rechner: ⌘/Strg + K öffnet, Esc schließt.' : 'Searches this character’s feats, spells, items and skills – tap a hit to jump there. ⌘/Ctrl + K opens, Esc closes.'}</span>
    </div>
  )
}

function Hit({ Icon, title, sub, onClick }) {
  return (
    <button className="nc-search-hit" onClick={onClick}>
      <Icon className="nc-accent-soft nc-hit-icon" />
      <span className="nc-row-text"><span className="nc-ellipsis">{title}</span>{sub && <span className="nc-row-sub nc-ellipsis">{sub}</span>}</span>
      <CaretRight className="nc-muted" />
    </button>
  )
}

function excerpt(text, s) {
  const t = String(text ?? '')
  const i = t.toLowerCase().indexOf(s)
  const a = Math.max(0, i - 30)
  return `${a ? '…' : ''}${t.slice(a, i + s.length + 40).replace(/\s+/g, ' ')}…`
}
