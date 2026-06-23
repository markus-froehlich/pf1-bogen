import { useState, useCallback } from 'react'

const STORAGE_KEY = 'pf1_character'

const DEFAULT_CHAR = {
  meta: { name: '', race: '', level: 1, classes: [{ id: '', level: 1 }] },
  attributes: { ST: 10, GE: 10, KO: 10, IN: 10, WE: 10, CH: 10 },
  buffs: { ST: 0, GE: 0, KO: 0, IN: 0, WE: 0, CH: 0 },
  combat_misc: {},
  gear: { armor_id: '', armor_enh: 0, shield_id: '', shield_enh: 0 },
  skills: {},
  hp: { max: 0, current: 0, temp: 0 },
}

function load() {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    return s ? { ...DEFAULT_CHAR, ...JSON.parse(s) } : { ...DEFAULT_CHAR }
  } catch { return { ...DEFAULT_CHAR } }
}

export function useCharacter() {
  const [char, setChar] = useState(load)

  const update = useCallback((patch) => {
    setChar(prev => {
      const next = deepMerge(prev, patch)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

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
    setChar(prev => {
      const next = { ...prev, combat_misc: { ...prev.combat_misc, [key]: Number(value) || 0 } }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const setClass = useCallback((idx, field, value) => {
    setChar(prev => {
      const classes = [...(prev.meta.classes ?? [{ id: '', level: 1 }])]
      classes[idx] = { ...(classes[idx] ?? { id: '', level: 1 }), [field]: value }
      const next = deepMerge(prev, { meta: { classes } })
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const setWeaponSlot = useCallback((idx, field, value) => {
    setChar(prev => {
      const NUM_SLOTS = 5
      const EMPTY = { weapon_id: '', enhancement: 0, misc_attack: 0, misc_damage: 0, finesse: false, off_hand: false }
      const weapons = Array.from({ length: NUM_SLOTS }, (_, i) => ({ ...EMPTY, ...(prev.weapons?.[i] ?? {}) }))
      weapons[idx] = { ...weapons[idx], [field]: typeof value === 'boolean' ? value : (isNaN(Number(value)) ? value : (value === '' ? value : Number(value))) }
      const next = { ...prev, weapons }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const setGear = useCallback((field, value) => {
    setChar(prev => {
      const next = { ...prev, gear: { ...(prev.gear ?? {}), [field]: value } }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const setSkill = useCallback((skillId, field, value) => {
    setChar(prev => {
      const skillEntry = { ...(prev.skills?.[skillId] ?? {}) }
      skillEntry[field] = field === 'is_class' ? Boolean(value) : (Number(value) || 0)
      const next = { ...prev, skills: { ...prev.skills, [skillId]: skillEntry } }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const setHp = useCallback((field, value) => {
    setChar(prev => {
      const next = { ...prev, hp: { ...(prev.hp ?? {}), [field]: Number(value) || 0 } }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const importChar = useCallback((data) => {
    try {
      const next = { ...DEFAULT_CHAR, ...data }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      setChar(next)
      return true
    } catch { return false }
  }, [])

  return { char, update, setAttr, setBuff, setMeta, setCombatMisc, setClass, setGear, setSkill, setWeaponSlot, setHp, importChar }
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
