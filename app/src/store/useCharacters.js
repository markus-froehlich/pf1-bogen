import { useState, useCallback } from 'react'

const INDEX_KEY  = 'pf1_chars_index'   // [{id, name, race, updated}]
const ACTIVE_KEY = 'pf1_active_char'   // string id
const CHAR_KEY   = id => `pf1_char_${id}`
const LEGACY_KEY = 'pf1_character'     // old single-char storage

export const DEFAULT_CHAR = {
  meta: { name: '', race: '', level: 1, classes: [{ id: '', level: 1 }], domains: [] },
  attributes: { ST: 10, GE: 10, KO: 10, IN: 10, WE: 10, CH: 10 },
  buffs: { ST: 0, GE: 0, KO: 0, IN: 0, WE: 0, CH: 0 },
  combat_misc: {},
  gear: { armor_id: '', armor_enh: 0, shield_id: '', shield_enh: 0 },
  skills: {},
  hp: { max: 0, current: 0, temp: 0 },
  weapons: [],
  notes: '',
  spellbook: { class_id: '', levels: {} },
  contacts: [],
  feats: [],
  xp: { current: 0, track: 'mittel' },
  conditions: [],
  inventory: { coins: { pp: 0, gp: 0, sp: 0, cp: 0 }, items: [] },
  bio: { languages: '', appearance: '', background: '' },
  active_buffs: [],
  specials: [],
  resources: [],
  nl_damage: 0,
  magic_slots: {},
}

function genId() {
  return Math.random().toString(36).slice(2, 10)
}

function saveChar(id, data) {
  localStorage.setItem(CHAR_KEY(id), JSON.stringify(data))
}

function loadChar(id) {
  try {
    const s = localStorage.getItem(CHAR_KEY(id))
    return s ? { ...DEFAULT_CHAR, ...JSON.parse(s) } : null
  } catch { return null }
}

function saveIndex(index) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(index))
}

function loadIndex() {
  try {
    const s = localStorage.getItem(INDEX_KEY)
    return s ? JSON.parse(s) : null
  } catch { return null }
}

function indexEntry(id, char) {
  const classes = (char.meta?.classes ?? [])
    .filter(c => c.id)
    .map(c => ({ id: c.id, level: Number(c.level) || 1 }))
  return { id, name: char.meta?.name || '—', race: char.meta?.race || '', classes, updated: Date.now() }
}

function initialize() {
  let index = loadIndex()

  if (!index) {
    // Migrate legacy single-char if present
    const legacyStr = localStorage.getItem(LEGACY_KEY)
    const legacy = legacyStr ? (() => { try { return JSON.parse(legacyStr) } catch { return null } })() : null
    const id = genId()
    const char = legacy ? { ...DEFAULT_CHAR, ...legacy } : { ...DEFAULT_CHAR }
    saveChar(id, char)
    index = [indexEntry(id, char)]
    saveIndex(index)
    localStorage.setItem(ACTIVE_KEY, id)
    return { index, activeId: id, char }
  }

  let activeId = localStorage.getItem(ACTIVE_KEY) || index[0]?.id
  if (!index.find(e => e.id === activeId)) activeId = index[0]?.id
  const char = loadChar(activeId) ?? { ...DEFAULT_CHAR }
  return { index, activeId, char }
}

export function useCharacters() {
  const init = () => initialize()
  const [state, setState] = useState(init)

  const { index, activeId, char } = state

  // ── Internal updater ─────────────────────────────────────────────────────
  const patchChar = useCallback((fn) => {
    setState(prev => {
      const next = fn(prev.char)
      saveChar(prev.activeId, next)
      const newIndex = prev.index.map(e =>
        e.id === prev.activeId ? indexEntry(prev.activeId, next) : e
      )
      saveIndex(newIndex)
      return { ...prev, char: next, index: newIndex }
    })
  }, [])

  // ── Edit callbacks (same API as useCharacter) ─────────────────────────────
  const update = useCallback((patch) => {
    patchChar(prev => deepMerge(prev, patch))
  }, [patchChar])

  const setAttr = useCallback((attr, value) => {
    update({ attributes: { [attr]: Number(value) || 0 } })
  }, [update])

  const setBuff = useCallback((attr, value) => {
    update({ buffs: { [attr]: Number(value) || 0 } })
  }, [update])

  const setMeta = useCallback((key, value) => {
    update({ meta: { [key]: value } })
  }, [update])

  const setCombatMisc = useCallback((key, value) => {
    const num = Number(value)
    const stored = value === '' ? '' : isNaN(num) ? value : num
    patchChar(prev => ({
      ...prev,
      combat_misc: { ...prev.combat_misc, [key]: stored }
    }))
  }, [patchChar])

  const setClass = useCallback((idx, field, value) => {
    patchChar(prev => {
      const classes = [...(prev.meta.classes ?? [{ id: '', level: 1 }])]
      classes[idx] = { ...(classes[idx] ?? { id: '', level: 1 }), [field]: value }
      return deepMerge(prev, { meta: { classes } })
    })
  }, [patchChar])

  const setWeaponSlot = useCallback((idx, field, value) => {
    patchChar(prev => {
      const NUM_SLOTS = 5
      const EMPTY = { weapon_id: '', enhancement: 0, misc_attack: 0, misc_damage: 0, finesse: false, off_hand: false }
      const weapons = Array.from({ length: NUM_SLOTS }, (_, i) => ({ ...EMPTY, ...(prev.weapons?.[i] ?? {}) }))
      weapons[idx] = { ...weapons[idx], [field]: typeof value === 'boolean' ? value : (isNaN(Number(value)) ? value : (value === '' ? value : Number(value))) }
      return { ...prev, weapons }
    })
  }, [patchChar])

  const setGear = useCallback((field, value) => {
    patchChar(prev => ({ ...prev, gear: { ...(prev.gear ?? {}), [field]: value } }))
  }, [patchChar])

  const setSkill = useCallback((skillId, field, value) => {
    patchChar(prev => {
      const skillEntry = { ...(prev.skills?.[skillId] ?? {}) }
      skillEntry[field] = field === 'is_class' ? Boolean(value) : (Number(value) || 0)
      return { ...prev, skills: { ...prev.skills, [skillId]: skillEntry } }
    })
  }, [patchChar])

  const setHp = useCallback((field, value) => {
    patchChar(prev => ({ ...prev, hp: { ...(prev.hp ?? {}), [field]: Number(value) || 0 } }))
  }, [patchChar])

  const importChar = useCallback((data) => {
    try {
      patchChar(() => ({ ...DEFAULT_CHAR, ...data }))
      return true
    } catch { return false }
  }, [patchChar])

  // ── Multi-character management ────────────────────────────────────────────
  const newChar = useCallback(() => {
    const id = genId()
    const c = { ...DEFAULT_CHAR }
    saveChar(id, c)
    const entry = indexEntry(id, c)
    setState(prev => {
      const newIndex = [...prev.index, entry]
      saveIndex(newIndex)
      localStorage.setItem(ACTIVE_KEY, id)
      return { index: newIndex, activeId: id, char: c }
    })
  }, [])

  const switchChar = useCallback((id) => {
    setState(prev => {
      if (id === prev.activeId) return prev
      const c = loadChar(id) ?? { ...DEFAULT_CHAR }
      localStorage.setItem(ACTIVE_KEY, id)
      return { ...prev, activeId: id, char: c }
    })
  }, [])

  const deleteChar = useCallback((id) => {
    setState(prev => {
      localStorage.removeItem(CHAR_KEY(id))
      const newIndex = prev.index.filter(e => e.id !== id)
      if (newIndex.length === 0) {
        // Always keep at least one
        const newId = genId()
        const c = { ...DEFAULT_CHAR }
        saveChar(newId, c)
        newIndex.push(indexEntry(newId, c))
        saveIndex(newIndex)
        localStorage.setItem(ACTIVE_KEY, newId)
        return { index: newIndex, activeId: newId, char: c }
      }
      saveIndex(newIndex)
      if (id === prev.activeId) {
        const newActive = newIndex[0].id
        const c = loadChar(newActive) ?? { ...DEFAULT_CHAR }
        localStorage.setItem(ACTIVE_KEY, newActive)
        return { index: newIndex, activeId: newActive, char: c }
      }
      return { ...prev, index: newIndex }
    })
  }, [])

  const setNotes = useCallback((value) => {
    patchChar(prev => ({ ...prev, notes: value }))
  }, [patchChar])

  const setSpellbook = useCallback((fn) => {
    patchChar(prev => ({ ...prev, spellbook: fn(prev.spellbook ?? { class_id: '', levels: {} }) }))
  }, [patchChar])

  const setContacts = useCallback((fn) => {
    patchChar(prev => ({ ...prev, contacts: fn(prev.contacts ?? []) }))
  }, [patchChar])

  const setFeats = useCallback((fn) => {
    patchChar(prev => ({ ...prev, feats: fn(prev.feats ?? []) }))
  }, [patchChar])

  const setXp = useCallback((field, value) => {
    patchChar(prev => ({ ...prev, xp: { ...(prev.xp ?? { current: 0, track: 'mittel' }), [field]: value } }))
  }, [patchChar])

  const setConditions = useCallback((fn) => {
    patchChar(prev => ({ ...prev, conditions: fn(prev.conditions ?? []) }))
  }, [patchChar])

  const setInventory = useCallback((fn) => {
    patchChar(prev => ({ ...prev, inventory: fn(prev.inventory ?? { coins: { pp:0,gp:0,sp:0,cp:0 }, items: [] }) }))
  }, [patchChar])

  const setBio = useCallback((field, value) => {
    patchChar(prev => ({ ...prev, bio: { ...(prev.bio ?? {}), [field]: value } }))
  }, [patchChar])

  const setSpecials = useCallback((fn) => {
    patchChar(prev => ({ ...prev, specials: fn(prev.specials ?? []) }))
  }, [patchChar])

  const setResources = useCallback((fn) => {
    patchChar(prev => ({ ...prev, resources: fn(prev.resources ?? []) }))
  }, [patchChar])

  const setNlDamage = useCallback((value) => {
    patchChar(prev => ({ ...prev, nl_damage: Math.max(0, Number(value) || 0) }))
  }, [patchChar])

  const setMagicSlots = useCallback((slot, value) => {
    patchChar(prev => ({ ...prev, magic_slots: { ...(prev.magic_slots ?? {}), [slot]: value } }))
  }, [patchChar])

  const setActiveBuffs = useCallback((fn) => {
    patchChar(prev => ({ ...prev, active_buffs: fn(prev.active_buffs ?? []) }))
  }, [patchChar])

  return {
    char, index, activeId,
    update, setAttr, setBuff, setMeta, setCombatMisc,
    setClass, setGear, setSkill, setWeaponSlot, setHp,
    setNotes, setSpellbook, setContacts, setFeats, setXp,
    setConditions, setInventory, setBio, setSpecials, setResources,
    setNlDamage, setMagicSlots, setActiveBuffs,
    importChar, newChar, switchChar, deleteChar,
  }
}

function deepMerge(base, patch) {
  const out = { ...base }
  for (const k of Object.keys(patch)) {
    if (patch[k] && typeof patch[k] === 'object' && !Array.isArray(patch[k])) {
      out[k] = { ...(base[k] || {}), ...patch[k] }
    } else {
      out[k] = patch[k]
    }
  }
  return out
}
