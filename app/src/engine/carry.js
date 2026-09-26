import { COIN_WEIGHT_PFUND } from './attributes.js'

export const COINS = ['pp', 'gp', 'sp', 'cp']
/** Umrechnung in GM: 1 PM = 10 GM, 1 SM = 1/10 GM, 1 KM = 1/100 GM. */
export const TO_GP = { pp: 10, gp: 1, sp: 0.1, cp: 0.01 }

/** Getragenes Gewicht in Pfd.: Gegenstände (Gewicht × Menge) + optional Münzgewicht. */
export function carriedWeight(inventory) {
  const coins = inventory?.coins ?? {}
  const coinCount = COINS.reduce((s, k) => s + (Number(coins[k]) || 0), 0)
  const items = (inventory?.items ?? []).reduce((s, it) => s + (Number(it.weight) || 0) * (Number(it.qty) || 1), 0)
  const countCoins = inventory?.count_coin_weight !== false
  const coinWeight = coinCount * COIN_WEIGHT_PFUND
  return { items, coinCount, coinWeight, countCoins, total: Math.round((items + (countCoins ? coinWeight : 0)) * 10) / 10 }
}

export const carryTier = (total, t) => (total <= t.light ? 'light' : total <= t.medium ? 'medium' : 'heavy')
export const coinValueGp = coins => COINS.reduce((s, k) => s + (Number(coins?.[k]) || 0) * TO_GP[k], 0)

/** GRW Tab. 7-5: Auswirkungen der Traglast (leicht = keine). */
export const LOAD_EFFECTS = { medium: { maxDex: 3, acp: -3 }, heavy: { maxDex: 1, acp: -6 } }
/** Traglast zählt (Standard an, GRW); aus nur, wenn im Inventar ausdrücklich abgeschaltet. */
export const loadRulesOn = inventory => inventory?.apply_carry_movement !== false
