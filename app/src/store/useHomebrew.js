import { useState, useCallback } from 'react'

const KEY = 'pf1_homebrew'

const DEFAULT = { classes: [], races: [], weapons: [], armor: [], shields: [] }

function genId() { return 'hb_' + Math.random().toString(36).slice(2, 10) }

function load() {
  try {
    const s = localStorage.getItem(KEY)
    return s ? { ...DEFAULT, ...JSON.parse(s) } : { ...DEFAULT }
  } catch { return { ...DEFAULT } }
}

function save(data) { localStorage.setItem(KEY, JSON.stringify(data)) }

export function useHomebrew() {
  const [hb, setHB] = useState(load)

  const patch = useCallback((fn) => {
    setHB(prev => { const next = fn(prev); save(next); return next })
  }, [])

  const addHB = useCallback((type, item) => {
    const entry = { ...item, id: genId() }
    patch(prev => ({ ...prev, [type]: [...prev[type], entry] }))
    return entry
  }, [patch])

  const saveHBItem = useCallback((type, item) => {
    patch(prev => {
      const exists = prev[type].some(i => i.id === item.id)
      const list = exists
        ? prev[type].map(i => i.id === item.id ? item : i)
        : [...prev[type], { ...item, id: item.id || genId() }]
      return { ...prev, [type]: list }
    })
  }, [patch])

  const deleteHB = useCallback((type, id) => {
    patch(prev => ({ ...prev, [type]: prev[type].filter(i => i.id !== id) }))
  }, [patch])

  const reloadHB = useCallback(() => { setHB(load()) }, [])

  return { hb, addHB, saveHBItem, deleteHB, reloadHB }
}
