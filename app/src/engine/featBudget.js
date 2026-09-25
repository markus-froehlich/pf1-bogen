/** Talent-Budget: ⌈Stufe/2⌉, Mensch +1 (Bonustalent). */
export function baseFeatBudget(totalLevel, isHuman) {
  if (!totalLevel) return 0
  return Math.ceil(totalLevel / 2) + (isHuman ? 1 : 0)
}
