import { useState } from 'react'
import { PrintView } from './components/PrintView.jsx'
import { useCharacters } from './store/useCharacters.js'
import { useHomebrew }   from './store/useHomebrew.js'
import { computeAttributes, computeBABAndSaves, computeCombat, computeBuffTotals, ATTRS, carryThresholds, ARMOR_MAP, SHIELDS_MAP, ALL_CLASSES, registerHomebrewClasses, registerHomebrewArmor, registerHomebrewShields } from './engine/index.js'
import racesData from './data/races.json'
import { AttributeBlock } from './components/AttributeBlock.jsx'
import { RaceSelector } from './components/RaceSelector.jsx'
import { ClassSection } from './components/ClassSection.jsx'
import { CombatTab } from './components/CombatTab.jsx'
import { SkillsTab } from './components/SkillsTab.jsx'
import { WeaponsTab } from './components/WeaponsTab.jsx'
import { SpellsTab } from './components/SpellsTab.jsx'
import { CharacterDrawer } from './components/CharacterDrawer.jsx'
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
import { useSectionOrder } from './store/useSectionOrder.js'
import './App.css'

const COMBAT_INTERNAL_DEFAULT = ['hp', 'combat', 'speed', 'ac', 'saves', 'dr']
const COMBAT_OUTER_DEFAULT    = ['features', 'conditions', 'buffs', 'resources', 'weapons']
const ATTR_DEFAULT            = ['race', 'class', 'attrs', 'xp', 'bio']

function SortBar({ id, idx, total, label, onMove, collapsed, onToggle }) {
  return (
    <div className="sort-bar">
      <button className="sort-bar-collapse" onClick={() => onToggle?.(id)} title={collapsed ? 'Aufklappen' : 'Zuklappen'}>
        {collapsed ? '▶' : '▼'}
      </button>
      <span className="sort-bar-label">{label}</span>
      <div className="sort-bar-btns">
        <button className="sort-bar-btn" disabled={idx === 0} onClick={() => onMove(id, -1)} title="Nach oben">↑</button>
        <button className="sort-bar-btn" disabled={idx === total - 1} onClick={() => onMove(id, 1)} title="Nach unten">↓</button>
      </div>
    </div>
  )
}

const TABS = [
  { id: 'attr',      de: 'Attribute', en: 'Attribute' },
  { id: 'combat',    de: 'Kampf',     en: 'Combat'  },
  { id: 'skills',    de: 'Fähigk.',   en: 'Skills'  },
  { id: 'spells',    de: 'Zauber',    en: 'Spells'  },
  { id: 'inventory', de: 'Inventar',  en: 'Inventory' },
  { id: 'feats',     de: 'Talente',   en: 'Feats'   },
  { id: 'notes',     de: 'Notizen',   en: 'Notes'   },
]

const NAV_ICONS = { attr: '◆', combat: '⚔', skills: '★', spells: '✦', inventory: '⚜', feats: '❋', notes: '✎' }

export default function App() {
  const [tab, setTab] = useState('attr')
  const [lang, setLang] = useState('de')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [hbOpen, setHbOpen] = useState(false)
  const [printOpen, setPrintOpen] = useState(false)

  const [combatInternalOrder, moveCombatInternal] = useSectionOrder('pf1_combat_internal_order', COMBAT_INTERNAL_DEFAULT)
  const [combatOuterOrder,    moveCombatOuter]    = useSectionOrder('pf1_combat_outer_order',    COMBAT_OUTER_DEFAULT)
  const [attrOrder,           moveAttr]           = useSectionOrder('pf1_attr_order',            ATTR_DEFAULT)

  const [combatCollapsed, setCombatCollapsed] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('pf1_combat_collapsed') ?? '[]')) }
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

  const [outerCollapsed, setOuterCollapsed] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('pf1_outer_collapsed') ?? '[]')) }
    catch { return new Set() }
  })
  const toggleOuterCollapse = (id) => {
    setOuterCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      localStorage.setItem('pf1_outer_collapsed', JSON.stringify([...next]))
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
    char, index, activeId,
    setAttr, setMeta, setCombatMisc, setClass, setGear, setSkill, setWeaponSlot, setHp,
    setNotes, setSpellbook, setContacts, setFeats, setXp,
    setConditions, setInventory, setBio, setSpecials, setResources,
    setNlDamage, setMagicSlots, setActiveBuffs,
    importChar, newChar, switchChar, deleteChar,
  } = useCharacters()

  const { hb, saveHBItem, deleteHB } = useHomebrew()

  // Register homebrew entries into engine lookup maps (runs before any engine call)
  registerHomebrewClasses(hb.classes)
  registerHomebrewArmor(hb.armor)
  registerHomebrewShields(hb.shields)

  // Combined class map includes homebrew
  const RACE_MAP_APP  = Object.fromEntries([...racesData.races, ...hb.races].map(r => [r.id, r]))
  const CLASS_MAP_APP = Object.fromEntries([...ALL_CLASSES, ...hb.classes].map(c => [c.id, c]))

  const buffTotals = computeBuffTotals(char.active_buffs ?? [])
  const computed   = computeAttributes(char, buffTotals)
  const baseValues = computeBABAndSaves(char)
  const combat     = computeCombat(char, computed, baseValues, buffTotals)

  const gear = char.gear ?? {}
  const armorCheckPenalty = (ARMOR_MAP[gear.armor_id]?.check_penalty ?? 0)
                          + (SHIELDS_MAP[gear.shield_id]?.check_penalty ?? 0)

  // Carry tier for CombatTab (encumbrance → speed)
  const _carry = carryThresholds(computed.ST.buffed)
  const _coins = char.inventory?.coins ?? {}
  const _countCoins = char.inventory?.count_coin_weight !== false
  const _coinCount = (Number(_coins.pp)||0)+(Number(_coins.gp)||0)+(Number(_coins.sp)||0)+(Number(_coins.cp)||0)
  const _itemsKg = (char.inventory?.items ?? []).reduce((s, it) => s + (Number(it.weight)||0)*(Number(it.qty)||1), 0)
  const _carriedKg = Math.round((_itemsKg + (_countCoins ? _coinCount * 1.5 / 1000 : 0)) * 10) / 10
  const encumbranceTier = _carriedKg <= _carry.light ? 'light' : _carriedKg <= _carry.medium ? 'medium' : 'heavy'
  const applyCarryMovement = char.inventory?.apply_carry_movement === true

  // Fertigkeitspunkte-Budget
  const inMod = computed.IN.mod
  const raceBonus = RACE_MAP_APP[char.meta.race]?.extra_skill_points_per_level ?? 0
  const totalFk = (char.meta.classes ?? []).reduce((sum, entry) => {
    if (!entry.id) return sum
    const sppl = CLASS_MAP_APP[entry.id]?.skill_points_per_level ?? 2
    const perLevel = Math.max(1, sppl + inMod) + raceBonus
    return sum + perLevel * (Number(entry.level) || 0)
  }, 0)
  const usedFk = Object.values(char.skills ?? {}).reduce((s, e) => s + (Number(e.ranks) || 0), 0)

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-row1">
          <button
            className="topbar-icon-btn char-list-btn"
            title={lang === 'de' ? 'Charakterliste' : 'Characters'}
            onClick={() => setDrawerOpen(true)}
          >
            ☰
            {index.length > 1 && <span className="char-count-badge">{index.length}</span>}
          </button>
          {baseValues.totalLevel > 0 && (
            <span className="topbar-level">{lang === 'de' ? 'Stufe' : 'Lvl'} {baseValues.totalLevel}</span>
          )}
          <div className="topbar-actions">
            <button
              className="topbar-icon-btn"
              title={lang === 'de' ? 'Charakter exportieren' : 'Export character'}
              onClick={() => {
                const name = char.meta.name?.trim() || 'charakter'
                const slug = name.toLowerCase().replace(/[^a-z0-9äöü]/gi, '_').replace(/_+/g, '_')
                const blob = new Blob([JSON.stringify(char, null, 2)], { type: 'application/json' })
                const url  = URL.createObjectURL(blob)
                const a    = document.createElement('a')
                a.href = url; a.download = `${slug}.json`
                a.click()
                URL.revokeObjectURL(url)
              }}
            >⬇</button>
            <label className="topbar-icon-btn" title={lang === 'de' ? 'Charakter importieren' : 'Import character'}>
              ⬆
              <input
                type="file" accept=".json" style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = ev => {
                    try {
                      const data = JSON.parse(ev.target.result)
                      importChar(data)
                    } catch { alert(lang === 'de' ? 'Ungültige JSON-Datei' : 'Invalid JSON file') }
                  }
                  reader.readAsText(file)
                  e.target.value = ''
                }}
              />
            </label>
            <button className="topbar-icon-btn" title={lang === 'de' ? 'Drucken' : 'Print'} onClick={() => setPrintOpen(true)}>🖨</button>
            <button className="topbar-icon-btn" title="Homebrew" onClick={() => setHbOpen(true)}>⚙</button>
            <button className="lang-btn" onClick={() => setLang(l => l === 'de' ? 'en' : 'de')}>
              {lang === 'de' ? 'EN' : 'DE'}
            </button>
            <span className="app-version" title="Build-Version">#{__COMMIT__}</span>
          </div>
        </div>
        <input
          className="char-name-input"
          type="text"
          placeholder={lang === 'de' ? 'Charaktername' : 'Character name'}
          value={char.meta.name}
          onChange={e => setMeta('name', e.target.value)}
        />
      </header>

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

      {drawerOpen && (
        <CharacterDrawer
          index={index} activeId={activeId}
          onSwitch={switchChar} onNew={newChar} onDelete={deleteChar}
          onClose={() => setDrawerOpen(false)}
          lang={lang}
        />
      )}

      <main className="main-scroll">
        {tab === 'attr' && (
          <div className="section">
            {attrOrder.map((id, idx) => {
              const L2 = lang === 'de'
              const isCollapsed = attrCollapsed.has(id)
              const count = attrOrder.length
              const headings = {
                race:  L2 ? 'Volk'      : 'Race',
                class: L2 ? 'Klasse(n)' : 'Class(es)',
                attrs: L2 ? 'Attribute' : 'Ability Scores',
                xp:    L2 ? 'EP'        : 'XP',
                bio:   L2 ? 'Person'    : 'Person',
              }
              const attrHead = (
                <div className="ct-heading-row">
                  <button className="ct-collapse-btn" onClick={() => toggleAttrCollapse(id)} title={isCollapsed ? 'Aufklappen' : 'Zuklappen'}>
                    {isCollapsed ? '▶' : '▼'}
                  </button>
                  <h3 className="ct-heading ct-heading-clk" onClick={() => toggleAttrCollapse(id)}>{headings[id]}</h3>
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
                  collapsed={isCollapsed} onToggle={toggleAttrCollapse} onMove={moveAttr}
                  sectionIdx={idx} sectionCount={count}
                />
              )
              if (id === 'attrs') return (
                <section key="attrs" className="ct-section">
                  {attrHead}
                  {!isCollapsed && (
                    <div className="attr-grid">
                      {ATTRS.map(a => (
                        <AttributeBlock key={a} attrKey={a} computed={computed[a]} onScoreChange={setAttr} lang={lang} />
                      ))}
                    </div>
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
                  {!isCollapsed && <BioSection char={char} setBio={setBio} lang={lang} />}
                </section>
              )
              return null
            })}
          </div>
        )}

        {tab === 'combat' && (
          <div className="section">
            <CombatTab
              char={char} attrs={computed} combat={combat} baseValues={baseValues}
              setCombatMisc={setCombatMisc} setGear={setGear} setHp={setHp} setNlDamage={setNlDamage}
              lang={lang}
              hbRaces={hb.races} hbArmor={hb.armor} hbShields={hb.shields}
              encumbranceTier={encumbranceTier} applyCarryMovement={applyCarryMovement}
              buffTotals={buffTotals}
              activeBuffs={char.active_buffs ?? []}
              sectionOrder={combatInternalOrder}
              onMoveSection={moveCombatInternal}
              collapsedSections={combatCollapsed}
              onToggleCollapse={toggleCombatCollapse}
            />
            {combatOuterOrder.map((id, idx) => {
              const L = lang === 'de'
              const outerLabels = {
                features:   L ? 'Klassenmerkmale' : 'Class Features',
                conditions: L ? 'Zustände'        : 'Conditions',
                buffs:      L ? 'Buffs / Effekte' : 'Buffs / Effects',
                resources:  L ? 'Ressourcen'      : 'Resources',
                weapons:    L ? 'Waffen'          : 'Weapons',
              }
              const panels = {
                features:   <ClassFeaturesPanel char={char} lang={lang} hideTitle />,
                conditions: <ConditionsPanel char={char} setConditions={setConditions} lang={lang} hideTitle />,
                buffs:      <BuffTracker char={char} setActiveBuffs={setActiveBuffs} lang={lang} hideTitle />,
                resources:  <ResourcesPanel char={char} setResources={setResources} attrs={computed} baseValues={baseValues} lang={lang} hideTitle />,
                weapons:    <WeaponsTab char={char} attrs={computed} bab={baseValues.bab} setWeaponSlot={setWeaponSlot} lang={lang} hbWeapons={hb.weapons} />,
              }
              return (
                <div key={id} className="sortable-outer-panel">
                  <SortBar id={id} idx={idx} total={combatOuterOrder.length} label={outerLabels[id]} onMove={moveCombatOuter}
                    collapsed={outerCollapsed.has(id)} onToggle={toggleOuterCollapse} />
                  {!outerCollapsed.has(id) && panels[id]}
                </div>
              )
            })}
          </div>
        )}

        {tab === 'skills' && (
          <SkillsTab char={char} attrs={computed} setSkill={setSkill}
            armorCheckPenalty={armorCheckPenalty}
            totalFk={totalFk} usedFk={usedFk}
            skillsBuff={buffTotals.skills_all ?? 0}
            lang={lang} />
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
          <SpellsTab char={char} setSpellbook={setSpellbook} attrs={computed} lang={lang} />
        )}

        {tab === 'feats' && (
          <FeatsTab char={char} setFeats={setFeats} totalLevel={baseValues.totalLevel} lang={lang} />
        )}

        {tab === 'notes' && (
          <NotesTab char={char} setNotes={setNotes} setContacts={setContacts} setSpecials={setSpecials} lang={lang} />
        )}
      </main>

      <nav className="bottom-nav">
        {TABS.map(t => (
          <button key={t.id} className={`nav-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <span className="nav-icon">{NAV_ICONS[t.id]}</span>
            <span className="nav-label">{t[lang]}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
