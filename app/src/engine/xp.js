/** EP-Tabellen (GRW Tabelle 3-1, gegen PDF geprüft 2026-09-25) — unverändert aus XpTracker.jsx. */
// PF1e XP thresholds — index = level-1, value = XP needed to reach that level
export const XP_TRACKS = {
  schnell: [0,1300,3300,6000,10000,15000,23000,34000,50000,71000,105000,145000,210000,295000,425000,600000,850000,1200000,1700000,2400000],
  mittel:  [0,2000,5000,9000,15000,23000,35000,51000,75000,105000,155000,220000,315000,445000,635000,890000,1300000,1800000,2550000,3600000],
  langsam: [0,3000,7500,14000,23000,35000,53000,77000,115000,160000,235000,330000,475000,665000,955000,1350000,1900000,2700000,3850000,5350000],
}

export function xpLevel(current, thresholds) {
  let lv = 1
  for (let i = 1; i < thresholds.length; i++) {
    if (current >= thresholds[i]) lv = i + 1
    else break
  }
  return Math.min(lv, 20)
}


// PF1e: Talente auf ungeraden Stufen (1,3,5,…19), Attributswerterhöhung alle 4 Stufen — unabhängig vom XP-Tempo (Langsam/Mittel/Schnell), das nur die XP-Schwellen verschiebt, nicht die Stufen selbst.
export const FEAT_LEVELS = [1,3,5,7,9,11,13,15,17,19]
export const ATTR_LEVELS = [4,8,12,16,20]

