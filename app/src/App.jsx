import { useState, useEffect, useRef } from 'react'
import { PrintView } from './components/PrintView.jsx'
import { useCharacters } from './store/useCharacters.js'
import { useHomebrew }   from './store/useHomebrew.js'
import { useGistSync }   from './store/useGistSync.js'
import { GistSyncPanel } from './components/GistSyncPanel.jsx'
import { computeAttributes, computeBABAndSaves, computeCombat, computeBuffTotals, getCompanionRules, ATTRS, carryThresholds, ALL_CLASSES, registerHomebrewClasses, registerHomebrewArmor, registerHomebrewShields } from './engine/index.js'
import { getConditionMods } from './engine/conditions.js'
import { COIN_WEIGHT_PFUND } from './engine/attributes.js'
import racesData from './data/races.json'
import { AttributeBlock } from './components/AttributeBlock.jsx'
import { RaceSelector } from './components/RaceSelector.jsx'
import { ClassSection } from './components/ClassSection.jsx'
import { CombatTab } from './components/CombatTab.jsx'
import { SkillsTab } from './components/SkillsTab.jsx'
import { WeaponsTab } from './components/WeaponsTab.jsx'
import { SpellsTab } from './components/SpellsTab.jsx'
import { NotesTab } from './components/NotesTab.jsx'
import { HomebrewPanel } from './components/HomebrewPanel.jsx'
import { FeatsTab } from './components/FeatsTab.jsx'
import { XpTracker } from './components/XpTracker.jsx'
import { ConditionsPanel } from './components/ConditionsPanel.jsx'
import { ResourcesPanel } from './components/ResourcesPanel.jsx'
import { ClassFeaturesPanel } from './components/ClassFeaturesPanel.jsx'
import { InventoryTab } from './components/InventoryTab.jsx'
import { BioSection } from './components/BioSection.jsx'
import { BuffTracker } from './components/BuffTracker.jsx'
import { CompanionsTab } from './components/CompanionsTab.jsx'
import { CompanionAdvancementPanel } from './components/CompanionAdvancementPanel.jsx'
import { CompanionFeaturesPanel } from './components/CompanionFeaturesPanel.jsx'
import { useExternalLinksPref, setExternalLinksPref } from './components/RefLink.jsx'
import { useSectionOrder } from './store/useSectionOrder.js'
import './App.css'
import './shell/shell.css'
import { useLayout, initialTheme, applyTheme, saveTheme } from './shell/layout.js'
import { ToastProvider } from './shell/Toast.jsx'
import { Sheet } from './shell/Sheet.jsx'
import { AppHeader, NavBar } from './shell/AppChrome.jsx'
import { CharacterSheet } from './shell/CharacterSheet.jsx'
import { MoreView, MORE_PAGES } from './shell/MoreView.jsx'
import { baseFeatBudget } from './components/FeatsTab.jsx'

// Apply saved font scale before first paint
const _SCALES = ['s', 'm', 'l', 'xl']
const _initScale = localStorage.getItem('pf1_font_scale') ?? 'm'
if (_initScale !== 'm') document.documentElement.classList.add(`fs-${_initScale}`)

const COMBAT_ALL_DEFAULT = ['hp', 'combat', 'speed', 'ac', 'saves', 'dr', 'features', 'conditions', 'buffs', 'resources', 'weapons']
const ATTR_DEFAULT            = ['race', 'class', 'attrs', 'xp', 'bio']


// Untere Navigation (README „App-Shell"): Kampf · Char · Fähigk. · Zauber · Inventar; „Mehr" über ⋯ bzw. Schiene
const TABS = ['combat', 'attr', 'skills', 'spells', 'inventory']
const SKILLS_SEG_KEY = 'pf1_skills_segment'

// Theme vor dem ersten Rendern setzen (kein Aufblitzen)
const _initTheme = initialTheme()
applyTheme(_initTheme)

export default function App() {
  const [tab, setTab] = useState('combat')
  const [morePage, setMorePage] = useState(null)          // Unterseite in „Mehr" (notes, contacts, …)
  const [skillsMode, setSkillsMode] = useState(() => localStorage.getItem(SKILLS_SEG_KEY) === 'feats' ? 'feats' : 'skills')
  const [lang, setLang] = useState('de')
  const [charSheetOpen, setCharSheetOpen] = useState(false)
  const [hbOpen, setHbOpen] = useState(false)
  const [printOpen, setPrintOpen] = useState(false)
  const [gistOpen, setGistOpen] = useState(false)
  const [fontScale, setFontScale] = useState(_initScale)
  const [theme, setTheme] = useState(_initTheme)
  const [chromeHidden, setChromeHidden] = useState(false)
  const lastScrollY = useRef(0)
  const layout = useLayout(fontScale)
  const [profile, setProfile] = useState(() => localStorage.getItem('pf1_profile') ?? 'player')
  const externalLinks = useExternalLinksPref()

  function switchProfile(p) {
    if (p === profile) return
    localStorage.setItem('pf1_profile', p)
    window.location.reload()
  }
  function pickTheme(next) {
    setTheme(next); saveTheme(next); applyTheme(next)
  }
  function selectSkillsMode(mode) {
    setSkillsMode(mode); localStorage.setItem(SKILLS_SEG_KEY, mode)
  }
  function goTab(id) {
    setTab(id); setMorePage(null); setChromeHidden(false)
  }
  function openMorePage(page) {
    setTab('more'); setMorePage(page); setChromeHidden(false)
  }

  // Beim Scrollen nach unten Kopf + Leiste wegklappen (nur Handy, nicht bei offenem Sheet)
  function onMainScroll(e) {
    const y = e.currentTarget.scrollTop
    const last = lastScrollY.current
    lastScrollY.current = y
    if (layout !== 'phone') return
    if (y < 40) { if (chromeHidden) setChromeHidden(false); return }
    if (y > last + 6 && !chromeHidden) setChromeHidden(true)
    else if (y < last - 10 && chromeHidden) setChromeHidden(false)
  }

  function applyFont(scale) {
    localStorage.setItem('pf1_font_scale', scale)
    document.documentElement.classList.remove('fs-s', 'fs-l', 'fs-xl')
    if (scale !== 'm') document.documentElement.classList.add(`fs-${scale}`)
    setFontScale(scale)
  }
  function fontDown() {
    const i = _SCALES.indexOf(fontScale)
    if (i > 0) applyFont(_SCALES[i - 1])
  }
  function fontUp() {
    const i = _SCALES.indexOf(fontScale)
    if (i < _SCALES.length - 1) applyFont(_SCALES[i + 1])
  }

  const [combatOrder, moveCombat] = useSectionOrder('pf1_combat_order', COMBAT_ALL_DEFAULT)
  const [attrOrder,   moveAttr]   = useSectionOrder('pf1_attr_order',   ATTR_DEFAULT)

  const [combatCollapsed, setCombatCollapsed] = useState(() => {
    try {
      // Merge both old keys on first load
      const a = new Set(JSON.parse(localStorage.getItem('pf1_combat_collapsed') ?? '[]'))
      const b = new Set(JSON.parse(localStorage.getItem('pf1_outer_collapsed')  ?? '[]'))
      return new Set([...a, ...b])
    }
    catch { return new Set() }
  })
  const toggleCombatCollapse = (id) => {
    setCombatCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      localStorage.setItem('pf1_combat_collapsed', JSON.stringify([...next]))
      return next
    })
  }

  const [attrCollapsed, setAttrCollapsed] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('pf1_attr_collapsed') ?? '[]')) }
    catch { return new Set() }
  })
  const toggleAttrCollapse = (id) => {
    setAttrCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      localStorage.setItem('pf1_attr_collapsed', JSON.stringify([...next]))
      return next
    })
  }

  const {
    char, index, activeId, update,
    setAttr, setMeta, setCombatMisc, setClass, setGear, setGearSlot, setSkill, setMultiSkill, addSkillSlot, removeSkillSlot, setWeaponSlot, setHp,
    setNotes, setSpellbook, setContacts, setSummons, setFeats, setXp,
    setConditions, setInventory, setBio, setSpecials, setResources,
    setNlDamage, setMagicSlots, setActiveBuffs, setWands,
    importChar, newChar, newCompanion, switchChar, deleteChar,
    getBackupData, reinitialize,
  } = useCharacters(profile)

  const gistSync = useGistSync(profile)

  // Profile-specific localStorage keys (used in sync effects)
  const CHARS_INDEX_LS = profile === 'gm' ? 'pf1_chars_index_gm'  : 'pf1_chars_index'
  const ACTIVE_CHAR_LS = profile === 'gm' ? 'pf1_active_char_gm'  : 'pf1_active_char'
  const CHAR_KEY_LS    = id => profile === 'gm' ? `pf1_char_gm_${id}` : `pf1_char_${id}`

  // Auto-restore from Gist on startup when localStorage is empty (e.g. after cache clear)
  useEffect(() => {
    if (!gistSync.connected) return
    const isEmpty = index.length === 1 && !index[0].name && !index[0].race
    if (!isEmpty) return
    gistSync.pull().then(data => {
      if (!data?.index?.length || !data?.chars) return
      for (const [id, charData] of Object.entries(data.chars)) {
        localStorage.setItem(CHAR_KEY_LS(id), JSON.stringify(charData))
      }
      localStorage.setItem(CHARS_INDEX_LS, JSON.stringify(data.index))
      if (data.activeId) localStorage.setItem(ACTIVE_CHAR_LS, data.activeId)
      window.location.reload()
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Refs so the sync handler always sees current values (avoids stale closures)
  const pullRef      = useRef(gistSync.pull)
  const indexRef     = useRef(index)
  const getDataRef   = useRef(getBackupData)
  const pushReadyRef = useRef(false)   // only push after initial pull completes
  useEffect(() => { pullRef.current    = gistSync.pull },    [gistSync.pull])
  useEffect(() => { indexRef.current   = index },            [index])
  useEffect(() => { getDataRef.current = getBackupData },    [getBackupData])

  // Per-character merge for incoming remote data — mirrors the merge already done on
  // push. Comparing one whole-file timestamp (old behavior) meant ANY other player's
  // update could trigger overwriting ALL local characters, including one you're mid-edit
  // on but haven't pushed yet (still in schedulePush's 3s debounce). Merging per id means
  // your own character only ever loses to remote if remote is genuinely newer for that
  // specific character — a fresh local edit's timestamp always wins its own comparison.
  function mergeRemoteIndex(remoteIndex, localIndexList) {
    const remoteById = Object.fromEntries((remoteIndex ?? []).map(e => [e.id, e]))
    const localById  = Object.fromEntries(localIndexList.map(e => [e.id, e]))
    const allIds = new Set([...Object.keys(remoteById), ...Object.keys(localById)])
    const mergedIndex = []
    const idsToWrite  = []
    for (const id of allIds) {
      const l = localById[id], r = remoteById[id]
      const useRemote = r && (!l || (r.updated ?? 0) > (l.updated ?? 0))
      mergedIndex.push(useRemote ? r : l)
      if (useRemote) idsToWrite.push(id)
    }
    return { mergedIndex, idsToWrite }
  }

  function applyRemoteData(data, idsToWrite, mergedIndex) {
    for (const id of idsToWrite) {
      localStorage.setItem(CHAR_KEY_LS(id), JSON.stringify(data.chars[id]))
    }
    localStorage.setItem(CHARS_INDEX_LS, JSON.stringify(mergedIndex))
    if (data.homebrew) { localStorage.setItem('pf1_homebrew', JSON.stringify(data.homebrew)); reloadHB() }
    if (data.preferences) {
      for (const [k, v] of Object.entries(data.preferences)) {
        localStorage.setItem(k, JSON.stringify(v))
      }
    }
    reinitialize()
  }

  // On startup: pull first, then enable push (prevents overwriting remote with stale local)
  useEffect(() => {
    if (!gistSync.connected) return
    pushReadyRef.current = false
    async function init() {
      const data = await pullRef.current()
      if (data?.index?.length && data?.chars) {
        const { mergedIndex, idsToWrite } = mergeRemoteIndex(data.index, indexRef.current)
        if (idsToWrite.length > 0) applyRemoteData(data, idsToWrite, mergedIndex)
      }
      pushReadyRef.current = true
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gistSync.connected])

  // Auto-push to Gist whenever any character changes (debounced 3 s)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (gistSync.connected && pushReadyRef.current) gistSync.schedulePush(getBackupData)
  }, [index])

  // Poll Gist every 8 s + on visibilitychange — merge in any character that's newer remotely
  useEffect(() => {
    if (!gistSync.connected) return
    let checking = false   // guards against overlapping fetches if one poll is still in flight
    async function checkRemote() {
      if (checking || !pushReadyRef.current) return
      checking = true
      try {
        const data = await pullRef.current()
        if (!data?.index?.length || !data?.chars) return
        const { mergedIndex, idsToWrite } = mergeRemoteIndex(data.index, indexRef.current)
        if (idsToWrite.length === 0) return
        applyRemoteData(data, idsToWrite, mergedIndex)
      } finally {
        checking = false
      }
    }
    const interval = setInterval(checkRemote, 8000)
    function onVisible() { if (document.visibilityState === 'visible') checkRemote() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [gistSync.connected])

  const { hb, saveHBItem, deleteHB, reloadHB } = useHomebrew()

  // Register homebrew entries into engine lookup maps (runs before any engine call)
  registerHomebrewClasses(hb.classes)
  registerHomebrewArmor(hb.armor)
  registerHomebrewShields(hb.shields)

  // Combined class map includes homebrew
  const RACE_MAP_APP  = Object.fromEntries([...racesData.races, ...hb.races].map(r => [r.id, r]))
  const CLASS_MAP_APP = Object.fromEntries([...ALL_CLASSES, ...hb.classes].map(c => [c.id, c]))

  const isCompanion = char.companion?.kind === 'animal_companion'
  const owner = isCompanion ? index.find(entry => entry.id === char.companion.ownerId) : null
  const ownedCompanions = isCompanion ? [] : index.filter(entry => entry.kind === 'animal_companion' && entry.ownerId === activeId)
  const companionLevel = owner?.classes?.filter(entry => entry.id === 'druide').reduce((sum, entry) => sum + Number(entry.level || 0), 0)
  const companionRules = isCompanion ? getCompanionRules(char, companionLevel) : null
  const rulesChar = companionRules ? {
    ...char,
    // Attributes are fully derived from the owner's current druid level (species base +
    // per-level bonuses + ability-increase choices) — like RK/KMB/HD, they're not meant to
    // be hand-edited, so a stale score from an earlier level never lingers after a level change.
    attributes: companionRules.attrs,
    combat_misc: { ...companionRules.combatMisc, ...char.combat_misc },
    meta: { ...char.meta, level: companionRules.level, race: companionRules.size },
  } : char
  const buffTotals = computeBuffTotals(char.active_buffs ?? [])
  const computed   = computeAttributes(rulesChar, buffTotals)
  const baseValues = companionRules?.baseValues ?? computeBABAndSaves(char)
  const combat     = computeCombat(rulesChar, computed, baseValues, buffTotals)
  const condMods   = getConditionMods(char.conditions)
  const isDruid = !isCompanion && (char.meta?.classes ?? []).some(entry => entry.id === 'druide' && Number(entry.level) > 0)
  const visibleTabs = isCompanion ? TABS.filter(tab => tab.id !== 'spells') : TABS
  const visibleAttrOrder = isCompanion ? attrOrder.filter(id => ['attrs', 'bio'].includes(id)) : attrOrder

  const gear = char.gear ?? {}
  // Masterwork armor/shields (−1 check penalty each, PF1e RAW) already folded in by the engine.
  const armorCheckPenalty = combat.gear_check_penalty ?? 0

  // Carry tier for CombatTab (encumbrance → speed)
  const _carry = carryThresholds(computed.ST.buffed)
  const _coins = char.inventory?.coins ?? {}
  const _countCoins = char.inventory?.count_coin_weight !== false
  const _coinCount = (Number(_coins.pp)||0)+(Number(_coins.gp)||0)+(Number(_coins.sp)||0)+(Number(_coins.cp)||0)
  const _itemsKg = (char.inventory?.items ?? []).reduce((s, it) => s + (Number(it.weight)||0)*(Number(it.qty)||1), 0)
  const _carriedKg = Math.round((_itemsKg + (_countCoins ? _coinCount * COIN_WEIGHT_PFUND : 0)) * 10) / 10
  const encumbranceTier = _carriedKg <= _carry.light ? 'light' : _carriedKg <= _carry.medium ? 'medium' : 'heavy'
  const applyCarryMovement = char.inventory?.apply_carry_movement === true

  // Fertigkeitspunkte-Budget
  const inMod = computed.IN.mod
  const raceBonus = RACE_MAP_APP[char.meta.race]?.extra_skill_points_per_level ?? 0
  const totalFk = companionRules ? companionRules.hd : (char.meta.classes ?? []).reduce((sum, entry) => {
    if (!entry.id) return sum
    const sppl = CLASS_MAP_APP[entry.id]?.skill_points_per_level ?? 2
    const perLevel = Math.max(1, sppl + inMod) + raceBonus
    return sum + perLevel * (Number(entry.level) || 0)
  }, 0)
  const usedFk = Object.values(char.skills ?? {}).reduce((s, e) => s + (Number(e.ranks) || 0), 0)

  function exportCurrent() {
    const name = char.meta.name?.trim() || 'charakter'
    const slug = name.toLowerCase().replace(/[^a-z0-9äöü]/gi, '_').replace(/_+/g, '_')
    const hasHB = Object.values(hb).some(arr => arr.length > 0)
    const exportData = hasHB ? { version: 2, char, homebrew: hb } : char
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `${slug}.json`; a.click()
    URL.revokeObjectURL(url)
  }
  function importFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const result = importChar(JSON.parse(ev.target.result))
        if (result?.ok) {
          if (result.hasHomebrew) reloadHB()
          alert(lang === 'de'
            ? 'Als neuer Charakter importiert (bestehende Charaktere wurden nicht verändert).'
            : 'Imported as a new character (existing characters were not changed).')
        } else {
          alert(lang === 'de' ? 'Ungültige JSON-Datei' : 'Invalid JSON file')
        }
      }
      catch { alert(lang === 'de' ? 'Ungültige JSON-Datei' : 'Invalid JSON file') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const L = lang === 'de'
  const featBudget = baseFeatBudget(baseValues.totalLevel, char.meta?.race === 'mensch' || char.meta?.race === 'human')
  const raceLabel = RACE_MAP_APP[char.meta.race]?.name?.[L ? 'de' : 'en'] ?? RACE_MAP_APP[char.meta.race]?.name?.de ?? char.meta.race
  const classLabel = (char.meta.classes ?? []).filter(entry => entry.id)
    .map(entry => `${CLASS_MAP_APP[entry.id]?.name?.[L ? 'de' : 'en'] ?? CLASS_MAP_APP[entry.id]?.name?.de ?? entry.id} ${entry.level}`)
    .join(' / ')
  const subline = [raceLabel, classLabel, char.meta.player].filter(Boolean).join(' · ') || (L ? 'Tippen für Charakterliste' : 'Tap for character list')
  const navItems = [...(isCompanion ? TABS.filter(id => id !== 'spells') : TABS), ...(layout === 'desktop' ? ['more'] : [])]
  const activeNav = tab === 'more' ? 'more' : tab
  const syncDot = gistSync.connected ? (gistSync.status === 'error' ? 'error' : gistSync.status === 'ok' ? 'ok' : 'syncing') : null
  const hbCount = Object.values(hb).reduce((sum, arr) => sum + (arr?.length ?? 0), 0)
  const moreCounts = {
    contacts: (char.contacts ?? []).length || null,
    specials: (char.specials ?? []).length || null,
    poisons: 80, templates: 25,
  }
  const sub = tab === 'more' && morePage
    ? { title: L ? MORE_PAGES[morePage].de : MORE_PAGES[morePage].en, onBack: () => setMorePage(null) }
    : null
  document.documentElement.dataset.layout = layout

  return (
    <ToastProvider lang={lang}>
    <div className={`app-shell nc-shell${chromeHidden && !charSheetOpen ? ' is-chrome-hidden' : ''}`} data-layout={layout}>
      <header className="nc-shell-head">
        <AppHeader
          name={char.meta.name} subline={subline} lang={lang}
          onOpenChars={() => setCharSheetOpen(true)}
          onOpenNotes={() => openMorePage('notes')}
          onOpenMore={() => goTab('more')}
          showMore={layout !== 'desktop'} moreActive={tab === 'more'}
          syncDot={syncDot} sub={sub}
        />
      </header>

      <main className="nc-shell-main main-scroll" onScroll={onMainScroll}>
        <div className="nc-main-inner">
          {tab === 'attr' && (
            <div className="section">
              <div className="nc-identity">
                <label className="nc-field"><span>{lang === 'de' ? 'Charaktername' : 'Character name'}</span>
                  <input className="nc-input" type="text" value={char.meta.name}
                    placeholder={lang === 'de' ? 'Charaktername' : 'Character name'}
                    onChange={e => setMeta('name', e.target.value)} />
                </label>
                <label className="nc-field"><span>{lang === 'de' ? 'Spielende Person' : 'Player'}</span>
                  <input className="nc-input" type="text" value={char.meta.player ?? ''}
                    placeholder={lang === 'de' ? 'Spielende Person' : 'Player'}
                    onChange={e => setMeta('player', e.target.value)} />
                </label>
              </div>
              {(isCompanion && owner) || ownedCompanions.length > 0 ? (
                <div className="nc-companion-links">
                  {isCompanion && owner && (
                    <button className="nc-btn nc-btn-secondary" onClick={() => { switchChar(owner.id); goTab('combat') }}>
                      ↩ {lang === 'de' ? 'zu' : 'to'} {owner.name || (lang === 'de' ? 'Charakter' : 'Character')}
                    </button>
                  )}
                  {!isCompanion && ownedCompanions.map(c => (
                    <button key={c.id} className="nc-btn nc-btn-secondary" onClick={() => { switchChar(c.id); goTab('combat') }}>
                      {lang === 'de' ? 'zu' : 'to'} {c.name || (lang === 'de' ? 'Tiergefährte' : 'Companion')}
                    </button>
                  ))}
                </div>
              ) : null}
              {visibleAttrOrder.map((id, idx) => {
                const L2 = lang === 'de'
                const isCollapsed = attrCollapsed.has(id)
                const count = visibleAttrOrder.length
                const headings = {
                  race:  L2 ? 'Volk'      : 'Race',
                  class: L2 ? 'Klasse(n)' : 'Class(es)',
                  attrs: L2 ? 'Attribute' : 'Ability Scores',
                  xp:    L2 ? 'EP'        : 'XP',
                  bio:   L2 ? 'Person'    : 'Person',
                }
                const raceName = RACE_MAP_APP[char.meta.race]?.name?.[L2 ? 'de' : 'en']
                  ?? RACE_MAP_APP[char.meta.race]?.name?.de
                  ?? char.meta.race
                  ?? '—'
                const classSummary = (char.meta.classes ?? [])
                  .filter(entry => entry.id)
                  .map(entry => {
                    const className = CLASS_MAP_APP[entry.id]?.name?.[L2 ? 'de' : 'en']
                      ?? CLASS_MAP_APP[entry.id]?.name?.de
                      ?? entry.id
                    return `${className} ${entry.level}`
                  })
                  .join(' · ')
                const attrHead = (
                  <div className="ct-heading-row">
                    <button className="ct-collapse-btn" onClick={() => toggleAttrCollapse(id)} title={isCollapsed ? 'Aufklappen' : 'Zuklappen'}>
                      {isCollapsed ? '▶' : '▼'}
                    </button>
                    <h3 className="ct-heading ct-heading-clk" onClick={() => toggleAttrCollapse(id)}>{headings[id]}</h3>
                    {isCollapsed && id === 'race' && <div className="ct-heading-summary">{raceName}</div>}
                    {isCollapsed && id === 'xp' && (
                      <div className="ct-heading-summary">
                        {(Number(char.xp?.current) || 0).toLocaleString(L2 ? 'de-DE' : 'en-US')} {L2 ? 'EP' : 'XP'}
                      </div>
                    )}
                    <div className="ct-move-btns">
                      <button className="ct-move-btn" disabled={idx === 0} onClick={() => moveAttr(id, -1)} title="Nach oben">↑</button>
                      <button className="ct-move-btn" disabled={idx === count - 1} onClick={() => moveAttr(id, 1)} title="Nach unten">↓</button>
                    </div>
                  </div>
                )
                if (id === 'race') return (
                  <section key="race" className="ct-section">
                    {attrHead}
                    {!isCollapsed && <RaceSelector value={char.meta.race} onChange={v => setMeta('race', v)} lang={lang} hbRaces={hb.races} showLabel={false} />}
                  </section>
                )
                if (id === 'class') return (
                  <ClassSection key="class"
                    char={char} setClass={setClass} setMeta={setMeta}
                    baseValues={baseValues} lang={lang}
                    hbClasses={hb.classes} hbRaces={hb.races}
                    collapsedSummary={classSummary}
                    collapsed={isCollapsed} onToggle={toggleAttrCollapse} onMove={moveAttr}
                    sectionIdx={idx} sectionCount={count}
                  />
                )
                if (id === 'attrs') return (
                  <section key="attrs" className="ct-section">
                    {attrHead}
                    {!isCollapsed && (
                      <>
                        <CompanionAdvancementPanel rules={companionRules} lang={lang}
                          tricks={char.companion?.tricks ?? []}
                          onTricksChange={tricks => update({ companion: { tricks } })} />
                        <p className="attr-note">
                          {lang === 'de'
                            ? '⚠ Attributswerte selbst eintragen — Boni werden berechnet'
                            : '⚠ Enter ability scores yourself — modifiers are calculated'}
                        </p>
                        <div className="attr-grid">
                          {ATTRS.map(a => (
                            <AttributeBlock key={a} attrKey={a} computed={computed[a]} onScoreChange={setAttr} lang={lang} condMods={condMods} />
                          ))}
                        </div>
                      </>
                    )}
                  </section>
                )
                if (id === 'xp') return (
                  <section key="xp" className="ct-section">
                    {attrHead}
                    {!isCollapsed && <XpTracker char={char} setXp={setXp} totalLevel={baseValues.totalLevel} lang={lang} />}
                  </section>
                )
                if (id === 'bio') return (
                  <section key="bio" className="ct-section">
                    {attrHead}
                    {!isCollapsed && (
                      <>
                        <BioSection char={char} setBio={setBio} lang={lang} />
                        {isCompanion && <CompanionFeaturesPanel features={companionRules?.features} lang={lang} />}
                        {isDruid && (
                          <CompanionsTab
                            index={index}
                            ownerId={activeId}
                            onCreate={species => newCompanion(species, activeId)}
                            onOpen={id => { switchChar(id); setTab('attr') }}
                            lang={lang}
                          />
                        )}
                        <ClassFeaturesPanel char={char} lang={lang} />
                      </>
                    )}
                  </section>
                )
                return null
              })}
            </div>
          )}

          {tab === 'combat' && (
            <div className="section">
              <CombatTab
                char={rulesChar} attrs={computed} combat={combat} baseValues={baseValues}
                setCombatMisc={setCombatMisc} setGear={setGear} setGearSlot={setGearSlot} setHp={setHp} setNlDamage={setNlDamage}
                lang={lang}
                hbRaces={hb.races} hbArmor={hb.armor} hbShields={hb.shields} hbWeapons={hb.weapons}
                encumbranceTier={encumbranceTier} applyCarryMovement={applyCarryMovement}
                buffTotals={buffTotals}
                activeBuffs={char.active_buffs ?? []}
                condMods={condMods}
                sectionOrder={combatOrder}
                onMoveSection={moveCombat}
                collapsedSections={combatCollapsed}
                onToggleCollapse={toggleCombatCollapse}
                extraPanels={{
                  ...(!isCompanion && { features: <ClassFeaturesPanel char={char} lang={lang} hideTitle /> }),
                  conditions: <ConditionsPanel char={char} setConditions={setConditions} lang={lang} hideTitle />,
                  buffs:      <BuffTracker char={char} setActiveBuffs={setActiveBuffs} lang={lang} hideTitle />,
                  resources:  <ResourcesPanel char={char} setResources={setResources} attrs={computed} baseValues={baseValues} lang={lang} hideTitle />,
                  weapons:    <WeaponsTab char={rulesChar} attrs={computed} bab={baseValues.bab} setWeaponSlot={setWeaponSlot} lang={lang} hbWeapons={hb.weapons} condMods={condMods} buffAttack={buffTotals.attack ?? 0} companionAttacks={companionRules?.attacks ?? []} />,
                }}
                extraLabels={lang === 'de' ? {
                  features:   'Klassenmerkmale',
                  conditions: 'Zustände',
                  buffs:      'Buffs / Effekte',
                  resources:  'Ressourcen',
                  weapons:    'Waffen',
                } : {
                  features:   'Class Features',
                  conditions: 'Conditions',
                  buffs:      'Buffs / Effects',
                  resources:  'Resources',
                  weapons:    'Weapons',
                }}
                isCompanion={isCompanion}
                companionHd={companionRules?.hd ?? null}
              />
            </div>
          )}

          {tab === 'skills' && (
            <>
              <div className="nc-seg is-full nc-tab-seg">
                <button className={`nc-seg-opt ${skillsMode === 'skills' ? 'is-on' : ''}`} onClick={() => selectSkillsMode('skills')}>
                  {lang === 'de' ? 'Fertigkeiten' : 'Skills'}
                </button>
                <button className={`nc-seg-opt ${skillsMode === 'feats' ? 'is-on' : ''}`} onClick={() => selectSkillsMode('feats')}>
                  {lang === 'de' ? 'Talente' : 'Feats'} {(char.feats ?? []).length}{featBudget > 0 ? `/${featBudget}` : ''}
                </button>
              </div>
              {skillsMode === 'skills' && (
                <SkillsTab char={char} attrs={computed} setSkill={setSkill}
                  setMultiSkill={setMultiSkill} addSkillSlot={addSkillSlot} removeSkillSlot={removeSkillSlot}
                  armorCheckPenalty={armorCheckPenalty}
                  totalFk={totalFk} usedFk={usedFk}
                  skillsBuff={buffTotals.skills_all ?? 0}
                  activeBuffs={char.active_buffs ?? []}
                  condSkillPenalty={condMods.skill_penalty ?? 0}
                  companionRules={companionRules}
                  lang={lang} />
              )}
              {skillsMode === 'feats' && (
                <FeatsTab char={char} setFeats={setFeats} totalLevel={baseValues.totalLevel} lang={lang} />
              )}
            </>
          )}

          {tab === 'inventory' && (
            <div className="section">
              <InventoryTab
                char={char} setInventory={setInventory} setMagicSlots={setMagicSlots} lang={lang}
                carryThresholds={carryThresholds(computed.ST.buffed)}
              />
            </div>
          )}

          {tab === 'spells' && (
            <SpellsTab char={char} setSpellbook={setSpellbook} setWands={setWands} setSummons={setSummons} attrs={computed} lang={lang} />
          )}

          {tab === 'more' && !morePage && (
            <MoreView
              lang={lang} counts={moreCounts} onOpenPage={openMorePage}
              onExport={exportCurrent} onImportFile={importFile}
              onPrint={() => setPrintOpen(true)} onHomebrew={() => setHbOpen(true)} homebrewCount={hbCount}
              onBackup={() => setGistOpen(true)}
              backupStatus={gistSync.connected ? (gistSync.status === 'error' ? 'error' : 'ok') : 'off'}
              profile={profile} onProfile={switchProfile}
              fontScale={fontScale} onFontDown={fontDown} onFontUp={fontUp}
              theme={theme} onTheme={pickTheme}
              externalLinks={externalLinks} onLinks={setExternalLinksPref}
              onLang={setLang} build={__COMMIT__}
            />
          )}
          {tab === 'more' && morePage && (
            <NotesTab key={morePage} initialMode={morePage}
              char={char} setNotes={setNotes} setContacts={setContacts} setSpecials={setSpecials} lang={lang} />
          )}
        </div>
      </main>

      <NavBar items={navItems} active={activeNav} onSelect={goTab} layout={layout} lang={lang} />

      <Sheet open={charSheetOpen} onClose={() => setCharSheetOpen(false)} layout={layout} label={L ? 'Charaktere' : 'Characters'}>
        <CharacterSheet
          index={index} activeId={activeId} player={char.meta.player}
          onSwitch={switchChar} onNew={newChar} onDelete={deleteChar}
          onClose={() => setCharSheetOpen(false)}
          lang={lang} raceMap={RACE_MAP_APP} classMap={CLASS_MAP_APP}
        />
      </Sheet>

      {printOpen && (
        <PrintView
          char={char} computed={computed} baseValues={baseValues} combat={combat}
          lang={lang} onClose={() => setPrintOpen(false)}
        />
      )}
      {hbOpen && (
        <HomebrewPanel hb={hb} saveHBItem={saveHBItem} deleteHB={deleteHB}
          onClose={() => setHbOpen(false)} lang={lang} />
      )}
      {gistOpen && (
        <GistSyncPanel gistSync={gistSync} onClose={() => setGistOpen(false)} profile={profile} />
      )}
    </div>
    </ToastProvider>
  )
}
