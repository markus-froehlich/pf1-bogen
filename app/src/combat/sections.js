// Kampf-Bereiche in Standard-Reihenfolge (README „Kampf")
export const COMBAT_SECTIONS = ['hp', 'stats', 'saves', 'atk', 'def', 'cond', 'buff', 'res']

// Alte Bereichs-IDs (bis Redesign) → neue; Klassenmerkmale stehen im Char-Tab
const OLD_TO_NEW = { hp: 'hp', combat: 'stats', saves: 'saves', weapons: 'atk', speed: 'def', ac: 'def', dr: 'def', conditions: 'cond', buffs: 'buff', resources: 'res' }

/** Gespeicherte Reihenfolge/eingeklappte Bereiche einmalig auf die neuen IDs umschreiben. */
export function migrateCombatPrefs() {
  try {
    const order = JSON.parse(localStorage.getItem('pf1_combat_order') ?? 'null')
    if (Array.isArray(order) && order.some(id => !COMBAT_SECTIONS.includes(id))) {
      const next = [...new Set(order.map(id => OLD_TO_NEW[id] ?? id).filter(id => COMBAT_SECTIONS.includes(id)))]
      localStorage.setItem('pf1_combat_order', JSON.stringify(next))
    }
    const shut = JSON.parse(localStorage.getItem('pf1_combat_collapsed') ?? 'null')
    if (Array.isArray(shut) && shut.some(id => !COMBAT_SECTIONS.includes(id))) {
      const next = [...new Set(shut.map(id => OLD_TO_NEW[id] ?? id).filter(id => COMBAT_SECTIONS.includes(id)))]
      localStorage.setItem('pf1_combat_collapsed', JSON.stringify(next))
    }
  } catch { /* kaputte Werte ignorieren */ }
}
