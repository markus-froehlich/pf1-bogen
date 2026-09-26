/**
 * Talente von Klassen außerhalb des GRW. Aufbau wie GRW_CLASS_FEATS in featBudget.js.
 *
 * Quellen (geprüft 2026-09-26): das Excel nennt meist nur die erste Stufe (Kräftelisten) bzw. für
 * Kampfmagus/Schütze/Samurai alle Stufen (Blatt „Klasse" Sp. J). Die weiteren Stufen und die
 * Einschränkungen stammen aus dem deutschen PRD (prd.5footstep.de, Expertenregeln / Ausbauregeln
 * Magie, Kampf II, Klassen VI). Abweichung Excel ↔ PRD: Draufgänger Bonuskampftalent laut Text ab
 * Stufe 4 (dann alle 4), das Excel nennt 5 (die PRD-Tabelle hat 4/5 vertauscht; engl. PRD: 4).
 * Nur feste Talente; Talente aus gewählten Optionen (Hexereien, Offenbarungen, Tricks, Orden …)
 * trägt man als freie/manuelle Talente ein.
 */
const R = (from, to, step) => Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step)
const b = (key, levels, de, hint) => ({ key, levels, de: `${de} (${levels.join('/')})`, en: 'Bonus feats', hint })

export const EXTRA_CLASS_FEATS = {
  alchemist: { auto: [{ level: 1, id: 'feat_trank_brauen' }, { level: 1, id: 'feat_improvisierter_fernkampf_k' }] },
  skalde: { auto: [{ level: 1, id: 'feat_schriftrolle_anfertigen' }] },
  blutwueter: {
    auto: [{ level: 4, id: 'feat_materialk_los_zaubern' }],
    bonus: [b('blutlinie', R(6, 18, 3), 'Talente des Blutes', 'aus der Bonustalent-Liste der Blutlinie (Voraussetzungen erfüllen)')],
  },
  kampfmagus: { bonus: [b('bonus', [5, 11, 17], 'Bonustalente', 'Kampf-, Metamagie- oder Erschaffungstalent')] },
  schuetze: {
    auto: [{ level: 1, id: 'feat_bu_chsenmacher_tal' }],
    bonus: [b('bonus', R(4, 20, 4), 'Bonustalente', 'Kampf- oder Schneidtalent')],
  },
  samurai: { bonus: [b('bonus', [6, 12, 18], 'Bonustalente', 'Kampftalent (Voraussetzungen erfüllen)')] },
  inquisitor: { bonus: [b('team', R(3, 18, 3), 'Gemeinschaftstalente', 'Gemeinschaftstalent (Teamwork)')] },
  ritter: {
    bonus: [
      b('team', [1, 9, 17], 'Taktiker: Gemeinschaftstalente', 'Gemeinschaftstalent (Voraussetzungen erfüllen)'),
      b('kampf', [6, 12, 18], 'Bonustalente', 'Kampftalent (Voraussetzungen erfüllen)'),
    ],
  },
  draufgaenger: { bonus: [b('kampf', R(4, 20, 4), 'Bonuskampftalente', 'Kampftalent; Draufgängerstufe zählt als Kämpferstufe')] },
  raufbold: {
    auto: [{ level: 1, id: 'feat_verb_waffenloser_schlag_k' }],
    bonus: [b('kampf', R(2, 20, 3), 'Bonuskampftalente', 'Kampftalent, das Verteidigung oder Nahkampfangriffe verbessert')],
  },
  jaeger: {
    bonus: [
      b('ausman', [2], 'Genaues Ausmanövrieren', 'Präzisionsschuss oder Ausmanövrieren (ohne Voraussetzungen)'),
      b('team', R(3, 18, 3), 'Bonusgemeinschaftstalente', 'Gemeinschaftstalent (Voraussetzungen erfüllen)'),
    ],
  },
  kriegspriester: {
    bonus: [
      b('fokus', [1], 'Fokuswaffe', 'Waffenfokus mit der Fokuswaffe (bei Waffenlosem Schlag zusätzlich Verbesserter waffenloser Schlag)'),
      b('kampf', R(3, 18, 3), 'Bonuskampftalente', 'Kampftalent; Kriegspriesterstufe zählt als GAB für Voraussetzungen'),
    ],
  },
  kriegsherold: { bonus: [b('team', [6], 'Gemeinschaftstalent', 'Gemeinschaftstalent (Voraussetzungen erfüllen)')] },
  glaubenskrieger: { auto: [{ level: 5, id: 'feat_fokussiertes_niederstreck' }] },
}

/** Laut Quelle ohne feste Talente/Bonustalent-Plätze (Talente nur über gewählte Optionen). */
export const EXTRA_NO_FEATS = ['hexe', 'mystiker', 'paktmagier', 'ninja', 'antipaladin', 'arkanist', 'ermittler', 'schamane', 'attentaeter',
  'niederer_templer', 'bote_des_zorn', 'hueter_der_natur', 'meisterspion', 'mutierter', 'standh_verteidiger', 'weltengaenger']
