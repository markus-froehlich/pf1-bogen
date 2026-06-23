import { useState } from 'react'

export function useSectionOrder(storageKey, defaults) {
  const [order, setOrder] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Keep saved order but ensure all current defaults are present
        const merged = parsed.filter(id => defaults.includes(id))
        defaults.filter(id => !merged.includes(id)).forEach(id => merged.push(id))
        return merged
      }
    } catch {}
    return [...defaults]
  })

  function persist(next) {
    localStorage.setItem(storageKey, JSON.stringify(next))
    return next
  }

  const move = (id, dir) => setOrder(prev => {
    const i = prev.indexOf(id)
    const j = i + dir
    if (j < 0 || j >= prev.length) return prev
    const next = [...prev]
    ;[next[i], next[j]] = [next[j], next[i]]
    return persist(next)
  })

  const reset = () => setOrder(persist([...defaults]))

  return [order, move, reset]
}
