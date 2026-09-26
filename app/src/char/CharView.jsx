import { Fragment, useMemo, useState } from 'react'
import { Plus, Minus, X, PawPrint, CaretRight, Warning, PencilSimple, ArrowsDownUp, ArrowUp, ArrowDown, DotsSixVertical } from '@phosphor-icons/react'
import archetypesData from '../data/archetypes.json'
import classFeatData from '../data/class_features_by_level.json'
import racialTraitsData from '../data/racial_traits.json'
import { ALL_CLASSES } from '../engine/index.js'
import { XP_TRACKS, xpLevel, FEAT_LEVELS, ATTR_LEVELS } from '../engine/xp.js'
import { Sheet } from '../shell/Sheet.jsx'
import { useToast } from '../shell/toastContext.js'
import { ValueTags } from '../combat/ui.jsx'
import { BreakdownSheet } from '../combat/BreakdownSheet.jsx'
import { NumberPad } from '../combat/NumberPad.jsx'
import { EditSheet, TextField, NumField, ChipsField, SearchPick, Field } from '../combat/EditSheet.jsx'
import { sg } from '../combat/breakdown.js'
import { DomainPicker } from './DomainPicker.jsx'
import { maxDomains, chosenDomains, domainLabel } from '../spells/domainSpells.js'
import { CompanionPicker } from './CompanionPicker.jsx'
import { CompanionAdvancementPanel } from '../components/CompanionAdvancementPanel.jsx'
import { CompanionFeaturesPanel } from '../components/CompanionFeaturesPanel.jsx'
import { ATTR_NAMES, attributeBreakdown, classProfile, classFeatureNames } from './charLogic.js'
import { useSectionOrder } from '../store/useSectionOrder.js'
import { CHAR_SECTIONS, CHAR_SECTION_LABELS } from './charSections.js'
import './char.css'

const ATTRS = ['ST', 'GE', 'KO', 'IN', 'WE', 'CH']
const ALIGNMENTS = [['rg', 'Rechtschaffen Gut', 'Lawful Good'], ['ng', 'Neutral Gut', 'Neutral Good'], ['cg', 'Chaotisch Gut', 'Chaotic Good'],
  ['rn', 'Rechtschaffen Neutral', 'Lawful Neutral'], ['n', 'Neutral', 'True Neutral'], ['cn', 'Chaotisch Neutral', 'Chaotic Neutral'],
  ['rb', 'Rechtschaffen Böse', 'Lawful Evil'], ['nb', 'Neutral Böse', 'Neutral Evil'], ['cb', 'Chaotisch Böse', 'Chaotic Evil']]
const TRACKS = [['schnell', 'Schnell', 'Fast'], ['mittel', 'Mittel', 'Medium'], ['langsam', 'Langsam', 'Slow']]
const TRAITS = racialTraitsData.by_race ?? {}
const fmt = n => Number(n || 0).toLocaleString('de-DE')

export function CharView(props) {
  const {
    char, attrs, baseValues, lang, layout, races, hbClasses = [],
    setMeta, setAttr, setXp, setBio, update,
    isCompanion, companionRules, owner, ownedCompanions, isDruid, index, activeId, switchChar, newCompanion,
  } = props
  const L = lang === 'de'
  const toast = useToast()
  const [sheet, setSheet] = useState(null)
  const [charOrder, moveChar, resetChar] = useSectionOrder('pf1_char_order', CHAR_SECTIONS)
  const close = () => setSheet(null)
  const classMap = useMemo(() => Object.fromEntries([...ALL_CLASSES, ...hbClasses].map(c => [c.id, c])), [hbClasses])
  const raceMap = useMemo(() => Object.fromEntries(races.map(r => [r.id, r])), [races])
  const race = raceMap[char.meta.race]
  const bio = char.bio ?? {}
  const classes = (char.meta.classes ?? []).filter(c => c.id)

  // Identität
  const identity = [
    [L ? 'Name' : 'Name', char.meta.name || '—'],
    [L ? 'Spieler' : 'Player', char.meta.player || '—'],
    [L ? 'Volk' : 'Race', race ? `${race.name?.[L ? 'de' : 'en'] ?? race.name?.de} · ${race.size?.de ?? ''}` : '—'],
    [L ? 'Gesinnung' : 'Alignment', ALIGNMENTS.find(a => a[0] === bio.alignment)?.[L ? 1 : 2] ?? '—'],
    [L ? 'Gottheit' : 'Deity', bio.deity || '—'],
    ...(bio.campaign ? [[L ? 'Kampagne' : 'Campaign', bio.campaign]] : []),
  ]

  // EP
  const xp = char.xp ?? { current: 0, track: 'mittel' }
  const th = XP_TRACKS[xp.track] ?? XP_TRACKS.mittel
  const cur = Number(xp.current) || 0
  const lvXp = xpLevel(cur, th)
  const atMax = lvXp >= 20
  const pct = atMax ? 1 : (cur - th[lvXp - 1]) / Math.max(1, th[lvXp] - th[lvXp - 1])
  const mismatch = baseValues.totalLevel > 0 && baseValues.totalLevel !== lvXp
  const [xpMode, setXpMode] = useState('add')

  const features = classFeatureNames(char, classFeatData.by_class ?? {})
  const bd = sheet?.type === 'attr' ? attributeBreakdown(sheet.key, { char, attrs, lang }) : null

  function removeClass(idx) {
    const prev = char.meta.classes ?? []
    const name = classMap[prev[idx]?.id]?.name?.de ?? prev[idx]?.id
    setMeta('classes', prev.filter((_, i) => i !== idx))
    close()
    toast(L ? `${name} entfernt` : `${name} removed`, { undo: () => setMeta('classes', prev) })
  }

  // Bereiche (sortierbar, Reihenfolge in pf1_char_order)
  const blocks = {
    identity: (<>
      <button className="nc-card nc-card-list nc-identity-card" onClick={() => setSheet({ type: 'identity' })}>
        {identity.map(([label, value]) => (
          <span key={label} className="nc-kv"><span className="nc-kv-label">{label}</span><span className="nc-kv-value nc-ellipsis">{value}</span></span>
        ))}
      </button>
    </>),
    owner: (<>
      {isCompanion && owner && (
        <button className="nc-card nc-companion-card" onClick={() => switchChar(owner.id)}>
          <span className="nc-char-icon is-lg"><PawPrint /></span>
          <span className="nc-row-text"><span className="nc-row-title">{L ? 'Tiergefährte von' : 'Companion of'} {owner.name || (L ? 'Charakter' : 'Character')}</span>
            <span className="nc-row-sub">{companionRules ? `${companionRules.species?.name?.de ?? ''} · ${L ? 'Stufe' : 'level'} ${companionRules.level} · ${companionRules.hd} ${L ? 'TW' : 'HD'}` : ''}</span></span>
          <CaretRight className="nc-list-caret" />
        </button>
      )}
    </>),
    classes: (<>
      {!isCompanion && <>
        <span className="nc-label">{L ? 'Klassen' : 'Classes'}</span>
        {classes.length === 0 && (
          <button className="nc-card nc-class-card is-empty" onClick={() => setSheet({ type: 'class', idx: 0 })}>
            <span className="nc-row-title">{L ? 'Klasse wählen' : 'Choose class'}</span><Plus />
          </button>
        )}
        {classes.map((entry, idx) => {
          const cls = classMap[entry.id]
          const prof = classProfile(cls, lang)
          const arch = entry.archetypes ?? []
          return (
            <div key={idx} className="nc-card nc-class-card">
              <button className="nc-class-main" onClick={() => setSheet({ type: 'class', idx })}>
                <span className="nc-class-top">
                  <span className="nc-row-text"><span className="nc-row-title">{cls?.name?.[L ? 'de' : 'en'] ?? cls?.name?.de ?? entry.id}</span>
                    <span className="nc-row-sub">{prof?.text}</span></span>
                  <span className="nc-class-level">{entry.level}</span>
                </span>
                <span className="nc-chips nc-chips-tight">
                  {arch.map(a => <span key={a} className="nc-tag nc-tag-accent">{a}</span>)}
                  {(archetypesData.archetypes[entry.id]?.length ?? 0) > 0 && <span className="nc-tag nc-tag-outline">{arch.length ? (L ? 'Archetypen ändern' : 'Change archetypes') : (L ? '+ Archetyp' : '+ Archetype')}</span>}
                  {maxDomains(entry.id) > 0 && chosenDomains(char).map(k => <span key={k} className="nc-tag nc-tag-neutral">{domainLabel(k)}</span>)}
                </span>
              </button>
              {idx > 0 && <button className="nc-row-edit" onClick={() => removeClass(idx)} aria-label={L ? 'Klasse entfernen' : 'Remove class'}><X /></button>}
            </div>
          )
        })}
        {classes.length > 0 && classes.length < 3 && (
          <button className="nc-btn nc-btn-secondary nc-btn-start" onClick={() => setSheet({ type: 'class', idx: classes.length })}><Plus />{L ? 'Weitere Klasse' : 'Add class'}</button>
        )}
      </>}
    </>),
    attrs: (<>
      <span className="nc-label">{L ? 'Attribute' : 'Abilities'}</span>
      {isCompanion && <CompanionAdvancementPanel rules={companionRules} lang={lang} tricks={char.companion?.tricks ?? []} onTricksChange={tricks => update({ companion: { tricks } })} />}
      <div className={`nc-attr-grid ${layout === 'phone' ? '' : 'is-3'}`}>
        {ATTRS.map(k => {
          const a = attrs[k]
          const effMod = attributeBreakdown(k, { char, attrs, lang }).total
          const condDelta = effMod - a.mod
          const tone = condDelta < 0 ? 'is-neg' : effMod > 0 ? 'is-pos' : ''
          return (
            <div key={k} className="nc-card nc-attr">
              <button className="nc-attr-head" onClick={() => setSheet({ type: 'attr', key: k })}>
                <span className="nc-attr-names"><span className="nc-attr-key">{k}</span><span className="nc-attr-name">{ATTR_NAMES[k][L ? 0 : 1]}</span></span>
                <span className={`nc-mod-pill ${tone}`}>{sg(effMod)}</span>
              </button>
              <div className="nc-attr-foot">
                <button className="nc-step-btn" onClick={() => setAttr(k, Math.max(1, a.score - 1))} aria-label="−"><Minus /></button>
                <span className="nc-attr-score-wrap">
                  <input className="nc-attr-score" inputMode="numeric" value={a.score} aria-label={ATTR_NAMES[k][0]}
                    onChange={e => { const v = e.target.value.replace(/\D/g, ''); if (v !== '') setAttr(k, Math.min(50, Number(v))) }} />
                  {a.buff ? <span className="nc-vtag is-buff">→ {a.buffed}</span> : null}
                  {condDelta ? <ValueTags cond={condDelta} /> : null}
                </span>
                <button className="nc-step-btn" onClick={() => setAttr(k, Math.min(50, a.score + 1))} aria-label="+"><Plus /></button>
              </div>
            </div>
          )
        })}
      </div>
      <span className="nc-hint">{L ? 'Werte selbst eintragen, Modifikatoren werden berechnet. Volksboni werden nicht automatisch angewendet.' : 'Enter scores yourself; racial bonuses are not applied automatically.'}</span>
    </>),
    xp: (<>
      {!isCompanion && <>
        <span className="nc-label">{L ? 'Erfahrung' : 'Experience'}</span>
        <div className="nc-card nc-card-pad">
          <div className="nc-xp-top">
            <span className="nc-row-text">
              <span className="nc-xp-value">{fmt(cur)} {L ? 'EP' : 'XP'}</span>
              <span className="nc-row-sub">{atMax ? (L ? 'Stufe 20 erreicht' : 'Level 20 reached') : `${L ? 'Stufe' : 'Level'} ${lvXp} · ${fmt(th[lvXp] - cur)} ${L ? 'bis Stufe' : 'to level'} ${lvXp + 1}`}</span>
            </span>
            <button className="nc-btn nc-btn-primary" onClick={() => { setXpMode('add'); setSheet({ type: 'xp' }) }}><Plus />{L ? 'EP' : 'XP'}</button>
          </div>
          <div className="nc-bar"><div className="nc-bar-fill is-ok" style={{ width: `${pct * 100}%` }} /></div>
          {mismatch && <span className="nc-warn-line"><Warning />{L ? `EP reichen für Stufe ${lvXp} – Klassenstufe (${baseValues.totalLevel}) anpassen.` : `XP match level ${lvXp} – adjust class level.`}</span>}
          {(FEAT_LEVELS.includes(lvXp) || ATTR_LEVELS.includes(lvXp)) && (
            <span className="nc-chips nc-chips-tight">
              {FEAT_LEVELS.includes(lvXp) && <span className="nc-tag nc-tag-neutral">{L ? `Talent auf Stufe ${lvXp}` : `Feat at level ${lvXp}`}</span>}
              {ATTR_LEVELS.includes(lvXp) && <span className="nc-tag nc-tag-neutral">{L ? `Attributswerterhöhung auf Stufe ${lvXp}` : `Ability increase at ${lvXp}`}</span>}
            </span>
          )}
          <div className="nc-seg nc-self-start">
            {TRACKS.map(([id, de, en]) => <button key={id} className={`nc-seg-opt ${xp.track === id ? 'is-on' : ''}`} onClick={() => setXp('track', id)}>{L ? de : en}</button>)}
          </div>
        </div>
      </>}
    </>),
    companion: (<>
      {!isCompanion && isDruid && <>
        <span className="nc-label">{L ? 'Tiergefährte' : 'Animal companion'}</span>
        {ownedCompanions.map(c => (
          <button key={c.id} className="nc-card nc-companion-card" onClick={() => switchChar(c.id)}>
            <span className="nc-char-icon is-lg"><PawPrint /></span>
            <span className="nc-row-text"><span className="nc-row-title">{c.name || (L ? 'Tiergefährte' : 'Companion')}</span>
              <span className="nc-row-sub">{c.speciesId ? c.speciesId.replace(/^animal_/, '').replace(/^./, s => s.toUpperCase()) : ''}</span></span>
            <CaretRight className="nc-list-caret" />
          </button>
        ))}
        <button className="nc-btn nc-btn-secondary nc-btn-start" onClick={() => setSheet({ type: 'companion' })}><Plus />{L ? 'Tiergefährte anlegen' : 'Add companion'}</button>
      </>}
      {isCompanion && <CompanionFeaturesPanel features={companionRules?.features} lang={lang} />}
    </>),
    features: (<>
      {!isCompanion && features.length > 0 && <>
        <span className="nc-label">{L ? `Klassenmerkmale bis Stufe ${baseValues.totalLevel}` : `Class features to level ${baseValues.totalLevel}`}</span>
        <div className="nc-chips nc-chips-tight">{features.map(f => <span key={f} className="nc-feature-chip">{f}</span>)}</div>
      </>}
    </>),
    person: (<>
      <span className="nc-label">{L ? 'Person' : 'Person'}</span>
      <button className="nc-person" onClick={() => setSheet({ type: 'person' })}>
        {[[L ? 'Geschlecht' : 'Gender', bio.gender], [L ? 'Alter' : 'Age', bio.age], [L ? 'Größe' : 'Height', bio.height_cm ? `${bio.height_cm} cm` : ''],
          [L ? 'Gewicht' : 'Weight', bio.weight_kg ? `${bio.weight_kg} Pfd.` : ''], [L ? 'Haare' : 'Hair', bio.hair], [L ? 'Augen' : 'Eyes', bio.eyes]].map(([l, v]) => (
          <span key={l} className="nc-card nc-person-tile"><span className="nc-kv-label">{l}</span><span className="nc-ellipsis">{v || '—'}</span></span>
        ))}
        <span className="nc-card nc-person-tile is-wide"><span className="nc-kv-label">{L ? 'Sprachen' : 'Languages'}</span><span>{bio.languages || '—'}</span></span>
        {bio.appearance && <span className="nc-card nc-person-tile is-wide"><span className="nc-kv-label">{L ? 'Aussehen' : 'Appearance'}</span><span className="nc-pre">{bio.appearance}</span></span>}
        {bio.background && <span className="nc-card nc-person-tile is-wide"><span className="nc-kv-label">{L ? 'Hintergrund' : 'Background'}</span><span className="nc-pre">{bio.background}</span></span>}
        <span className="nc-person-edit"><PencilSimple />{L ? 'Person bearbeiten' : 'Edit person'}</span>
      </button>
    </>),
  }

  return (
    <div className="nc-page nc-char">
      {charOrder.map(id => <Fragment key={id}>{blocks[id]}</Fragment>)}
      <button className="nc-btn nc-btn-secondary nc-arrange-btn" onClick={() => setSheet({ type: 'arrange' })}><ArrowsDownUp />{L ? 'Bereiche anordnen' : 'Arrange sections'}</button>

      <Sheet open={!!sheet} onClose={close} layout={layout} label={sheet?.type}>
        {sheet?.type === 'arrange' && (
          <div className="nc-sheet-body nc-gap">
            <div className="nc-sheet-titlebar"><span className="nc-sheet-title">{L ? 'Char-Tab anordnen' : 'Arrange char tab'}</span>
              <button className="nc-btn nc-btn-ghost" onClick={close}>{L ? 'Fertig' : 'Done'}</button></div>
            <div className="nc-arrange">
              {charOrder.map((id, i) => (
                <div key={id} className="nc-arrange-row">
                  <DotsSixVertical className="nc-muted-icon" />
                  <span className="nc-arrange-name">{CHAR_SECTION_LABELS[id][L ? 0 : 1]}</span>
                  <button className="nc-icon-btn nc-sm" disabled={i === 0} onClick={() => moveChar(id, -1)} aria-label={L ? 'Nach oben' : 'Up'}><ArrowUp /></button>
                  <button className="nc-icon-btn nc-sm" disabled={i === charOrder.length - 1} onClick={() => moveChar(id, 1)} aria-label={L ? 'Nach unten' : 'Down'}><ArrowDown /></button>
                </div>
              ))}
            </div>
            <div className="nc-sheet-foot">
              <span className="nc-hint">{L ? 'Bereiche ohne Inhalt (z. B. Tiergefährte bei Nicht-Druiden) bleiben ausgeblendet.' : 'Empty sections stay hidden.'}</span>
              <button className="nc-btn nc-btn-ghost" onClick={resetChar}>{L ? 'Zurücksetzen' : 'Reset'}</button>
            </div>
          </div>
        )}
        {sheet?.type === 'attr' && <BreakdownSheet bd={bd} lang={lang} />}
        {sheet?.type === 'xp' && (
          <NumberPad lang={lang} maxLen={7}
            modes={[['add', L ? 'Hinzufügen' : 'Add'], ['set', L ? 'Setzen' : 'Set']]} mode={xpMode} onMode={setXpMode}
            hint={`${L ? 'Aktuell' : 'Current'} ${fmt(cur)} ${L ? 'EP' : 'XP'}`}
            cta={v => (xpMode === 'add' ? `+${fmt(v)} ${L ? 'EP' : 'XP'}` : `${L ? 'EP auf' : 'Set XP to'} ${fmt(v)}${L ? ' setzen' : ''}`)}
            onCommit={v => {
              if (!v) return close()
              const prev = cur
              setXp('current', xpMode === 'add' ? cur + v : v)
              close()
              toast(xpMode === 'add' ? `+${fmt(v)} ${L ? 'EP' : 'XP'}` : `${L ? 'EP' : 'XP'} ${fmt(v)}`, { undo: () => setXp('current', prev) })
            }} />
        )}
        {sheet?.type === 'identity' && (
          <IdentityEditor char={char} races={races} setMeta={setMeta} setBio={setBio} lang={lang} onClose={close} />
        )}
        {sheet?.type === 'person' && <PersonEditor bio={bio} setBio={setBio} lang={lang} onClose={close} />}
        {sheet?.type === 'class' && (
          <ClassEditor char={char} idx={sheet.idx} classMap={classMap} hbClasses={hbClasses} setMeta={setMeta}
            onRemove={sheet.idx > 0 && sheet.idx < classes.length ? () => removeClass(sheet.idx) : null} lang={lang} onClose={close} />
        )}
        {sheet?.type === 'companion' && (
          <CompanionPicker index={index} ownerId={activeId} onCreate={species => { newCompanion(species, activeId); close() }}
            onOpen={id => { switchChar(id); close() }} onClose={close} lang={lang} />
        )}
      </Sheet>
    </div>
  )
}

function IdentityEditor({ char, races, setMeta, setBio, lang, onClose }) {
  const L = lang === 'de'
  const bio = char.bio ?? {}
  const [d, setD] = useState({ name: char.meta.name ?? '', player: char.meta.player ?? '', race: char.meta.race ?? '', alignment: bio.alignment ?? '', deity: bio.deity ?? '', campaign: bio.campaign ?? '' })
  const set = patch => setD(prev => ({ ...prev, ...patch }))
  const race = races.find(r => r.id === d.race)
  const traits = TRAITS[d.race] ?? []
  const [showTraits, setShowTraits] = useState(false)
  return (
    <EditSheet lang={lang} title={L ? 'Grunddaten' : 'Basics'} onCancel={onClose}
      preview={race ? `${race.name?.de} · ${race.size?.de ?? ''} · ${race.speed_m?.unarmored ?? '—'} m · ${race.ability_mods_text?.de ?? ''}${race.extra_skill_points_per_level ? ` · +${race.extra_skill_points_per_level} FP/Stufe` : ''}` : ''}
      onSave={() => {
        setMeta('name', d.name); setMeta('player', d.player); setMeta('race', d.race)
        setBio('alignment', d.alignment); setBio('deity', d.deity); setBio('campaign', d.campaign)
        onClose()
      }}>
      <TextField label={L ? 'Charaktername' : 'Character name'} value={d.name} onChange={v => set({ name: v })} placeholder={L ? 'z. B. Thorwald Eisenfaust' : 'e.g. Thorwald'} />
      <TextField label={L ? 'Spielende Person' : 'Player'} value={d.player} onChange={v => set({ player: v })} />
      <SearchPick label={L ? `Volk (${races.length})` : `Race (${races.length})`} items={races.map(r => ({ id: r.id, label: r.name?.de ?? r.id, r }))} selectedId={d.race}
        onPick={i => set({ race: i.id })} placeholder={race?.name?.de ?? (L ? 'Volk suchen …' : 'Search race …')} max={10}
        render={i => (<><span className="nc-ellipsis">{i.label}</span><span className="nc-search-meta">{i.r.size?.de} · {i.r.ability_mods_text?.de ?? ''}</span></>)}
        hint={L ? 'Volksboni selbst in die Attributwerte einrechnen.' : 'Add racial bonuses to the scores yourself.'} />
      {traits.length > 0 && (
        <Field label={L ? `Volksmerkmale (${traits.length})` : `Racial traits (${traits.length})`}>
          <button className="nc-btn nc-btn-ghost nc-self-start" onClick={() => setShowTraits(v => !v)}>{showTraits ? (L ? 'Ausblenden' : 'Hide') : (L ? 'Anzeigen' : 'Show')}</button>
          {showTraits && <div className="nc-traits">{traits.map((t, i) => <div key={i} className="nc-trait"><b>{t.trait}</b>{t.desc ? ` – ${t.desc}` : ''}</div>)}</div>}
        </Field>
      )}
      <ChipsField label={L ? 'Gesinnung' : 'Alignment'} options={ALIGNMENTS.map(a => [a[0], L ? a[1] : a[2]])} value={d.alignment} onChange={v => set({ alignment: v })} />
      <TextField label={L ? 'Gottheit' : 'Deity'} value={d.deity} onChange={v => set({ deity: v })} placeholder="Abadar, Desna, …" />
      <TextField label={L ? 'Kampagne' : 'Campaign'} value={d.campaign} onChange={v => set({ campaign: v })} />
    </EditSheet>
  )
}

function PersonEditor({ bio, setBio, lang, onClose }) {
  const L = lang === 'de'
  const keys = ['gender', 'age', 'height_cm', 'weight_kg', 'hair', 'eyes', 'languages', 'appearance', 'background']
  const [d, setD] = useState(() => Object.fromEntries(keys.map(k => [k, bio[k] ?? ''])))
  const set = (k, v) => setD(prev => ({ ...prev, [k]: v }))
  return (
    <EditSheet lang={lang} title={L ? 'Person' : 'Person'} onCancel={onClose}
      onSave={() => { keys.forEach(k => { if ((bio[k] ?? '') !== d[k]) setBio(k, d[k]) }); onClose() }}>
      <div className="nc-grid-2">
        <TextField label={L ? 'Geschlecht' : 'Gender'} value={d.gender} onChange={v => set('gender', v)} />
        <TextField label={L ? 'Alter' : 'Age'} value={d.age} onChange={v => set('age', v)} />
        <TextField label={L ? 'Größe (cm)' : 'Height (cm)'} value={d.height_cm} onChange={v => set('height_cm', v)} />
        <TextField label={L ? 'Gewicht (Pfd.)' : 'Weight (lb)'} value={d.weight_kg} onChange={v => set('weight_kg', v)} />
        <TextField label={L ? 'Haarfarbe' : 'Hair'} value={d.hair} onChange={v => set('hair', v)} />
        <TextField label={L ? 'Augenfarbe' : 'Eyes'} value={d.eyes} onChange={v => set('eyes', v)} />
      </div>
      <TextField label={L ? 'Sprachen' : 'Languages'} value={d.languages} onChange={v => set('languages', v)} placeholder={L ? 'Gemeinsprache, Elfisch, …' : 'Common, Elven, …'} />
      <TextField area label={L ? 'Aussehen' : 'Appearance'} value={d.appearance} onChange={v => set('appearance', v)} />
      <TextField area label={L ? 'Hintergrund' : 'Background'} value={d.background} onChange={v => set('background', v)} />
    </EditSheet>
  )
}

function ClassEditor({ char, idx, classMap, hbClasses, setMeta, onRemove, lang, onClose }) {
  const L = lang === 'de'
  const cur = (char.meta.classes ?? [])[idx] ?? { id: '', level: 1, archetypes: [] }
  const [d, setD] = useState({ id: cur.id ?? '', level: Number(cur.level) || 1, archetypes: cur.archetypes ?? [], domains: char.meta.domains ?? [] })
  const set = patch => setD(prev => ({ ...prev, ...patch }))
  const all = [...ALL_CLASSES, ...hbClasses].filter(c => c.progression?.length)
  const cls = classMap[d.id]
  const archList = archetypesData.archetypes[d.id] ?? []
  const prof = classProfile(cls, lang)
  return (
    <EditSheet lang={lang} title={cur.id ? `${cls?.name?.de ?? cur.id}` : (idx === 0 ? (L ? 'Klasse wählen' : 'Choose class') : (L ? 'Weitere Klasse' : 'Add class'))}
      onDelete={onRemove} onCancel={onClose} saveDisabled={!d.id} saveHint={L ? 'Bitte eine Klasse wählen.' : 'Choose a class.'}
      preview={cls ? `${cls.name?.de} ${d.level} · ${prof.text}` : ''}
      onSave={() => {
        const classes = [...(char.meta.classes ?? []).filter(c => c.id)]
        classes[Math.min(idx, classes.length)] = { ...(classes[idx] ?? {}), id: d.id, level: d.level, archetypes: d.archetypes }
        setMeta('classes', classes)
        if (maxDomains(d.id)) setMeta('domains', d.domains)
        onClose()
      }}>
      <SearchPick label={L ? `Klasse (${all.length})` : `Class (${all.length})`} items={all.map(c => ({ id: c.id, label: c.name?.de ?? c.id, c }))} selectedId={d.id}
        onPick={i => set({ id: i.id, archetypes: [] })} placeholder={cls?.name?.de ?? (L ? 'Klasse suchen …' : 'Search class …')} max={10}
        render={i => (<><span className="nc-ellipsis">{i.label}</span><span className="nc-search-meta">{classProfile(i.c, lang).text}</span></>)} />
      <NumField label={L ? 'Stufe' : 'Level'} value={d.level} onChange={v => set({ level: v })} min={1} max={20} />
      {archList.length > 0 && (
        <ChipsField multi label={L ? `Archetypen (bis zu 3)` : 'Archetypes (up to 3)'} options={archList.map(a => [a.name, a.name])}
          value={Object.fromEntries(d.archetypes.map(a => [a, true]))}
          onChange={v => set({ archetypes: Object.keys(v).filter(k => v[k]).slice(-3) })}
          hint={L ? 'Bis zu 3, sofern sie nicht dieselben Klassenmerkmale ersetzen.' : 'Up to 3 if they do not replace the same features.'} />
      )}
      {maxDomains(d.id) > 0 && <DomainPicker classId={d.id} value={d.domains} onChange={v => set({ domains: v })} lang={lang} />}
    </EditSheet>
  )
}
