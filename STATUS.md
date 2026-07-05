# STATUS

_Stand: 2026-07-05_

## Wo wir stehen
**Phase 1 (Bestandsaufnahme) abgeschlossen + freigegeben.** Entscheidungen geklärt.
**Phase 2 (Daten-Port) gestartet:** kanonischer Voll-Dump fertig, erstes Dataset
(`races.json`) als Pipeline-Muster verifiziert. Als Nächstes: weitere Datasets +
Engine-Gerüst.

## Entscheidungen (festgezurrt, siehe AGENTS.md)
1. Rechnen **1:1 wie Excel** (Referenz = `sheets_values`/`sheets_full`).
2. Sprache **DE + EN** umschaltbar (Felder sprachgekeyt).
3. **Homebrew von Anfang an.**
4. **Kein** Alt-Import (eigene lokale Speicherung).
5. Quellenfilter zurückgestellt.

## Zuletzt erledigt
- Quelle: `Version 6.61/Bogen 6.61 Spieler.xlsx` (ohne Makros). Scope: voller Nachbau.
- Rohextraktion → `extraction/` (Werte-CSV, Formel-TSV, 1210 benannte Bereiche,
  Dropdowns, verbundene Zellen).
- **Kanonischer untrimmter Voll-Dump** → `extraction/sheets_full/*.jsonl`
  (498.520 Zellen: Konstante+Formel+Wert). Schließt die Trimm-Lücke. = Datenquelle.
- Detailanalyse → `docs/sections/01..05`; Gesamt-Doku → `docs/BESTANDSAUFNAHME.md`.
- Pipeline-Skripte → `tools/`. Projekt-Doku (CLAUDE/AGENTS/STATUS).
- **`data/races.json`** (38 Völker) — erstes normalisiertes, sprach-fähiges Dataset.
- **Verifiziert:** Attributwerte sind Direkteingaben; Volks-Mods werden NICHT
  auto-angewendet (nur Anzeigetext). Gnom-„ST+2" ist harmloser Anzeige-Tippfehler.

## Wichtigste Erkenntnisse
- 23 Blätter, ~104k Formeln; vollständiger Builder, nicht nur Rechenkern.
- 48 Klassen, 38 Völker, ~150 Archetypen, ~393 Waffen, 63 Rüstungen, 16 Schilde,
  ~13.285 Text-Objekte in der Stammtabelle `ZaBesch`.
- 3 Architekturmuster: Stammtabelle+Typ-Tag, VLOOKUP-per-Index-Listen,
  20-Zeilen-Progressionsblock je Klasse.
- Referenz-Wahrheit für Tests: `extraction/sheets_values/*.csv`.

## Zuletzt erledigt (Phase 3 — PWA + Engine)
- **`app/`** — React+Vite+PWA installierbar (vite-plugin-pwa, manifest, SW)
- **`app/src/engine/attributes.js`** — Attribut-Engine: `computeAttributes()`,
  `abilityMod()`, `carryThresholds()` 1:1 aus Attributtab (Listen!IE5:IS54)
- **`app/src/data/races.json`** + **`attributtab.json`** — in App gebundelt
- **`app/src/store/useCharacter.js`** — localStorage-backed State
- **iOS-Test bestanden**: Portrait+Landscape, navAtBottom, kein Overflow
- **`data/attributtab.json`** — 50 Einträge (Score 1–50, Mod+Tragegrenzen)
- **`data/classes.json`** — 67 Klassen (42 vollständig), 20-Zeilen-Progression
- **`app/src/engine/classes.js`** — `computeBABAndSaves()`, Multiclass-SUMME
- **`app/src/engine/combat.js`** — RK, Init, GAB, KMB/KMV, Saves
- **Combat-Tab** — Klassen-Wähler (3×), Kampfwerte, RK-Felder, Rettungswürfe
- Verifiziert: Kämpfer Stufe 5, ST=18 → alle Werte 1:1 korrekt

- **`data/skills.json`** — 35 Fertigkeiten (direkt aus Fertig-Blatt extrahiert)
- **`app/src/engine/skills.js`** — `computeSkill()`, `buildClassSkillSet()`,
  manuelle K-Überschreibung + auto wenn class_skills[] vorhanden
- **Fertigkeiten-Tab** — 35 Einträge, Rang-Eingabe, K-Toggle, Gesamt-Berechnung
- Verifiziert: Akrobatik K+3Ränge+GE0 = +6 ✓, iOS Portrait+Landscape ✓

- **`data/weapons.json`** — 377 Waffen aus Waffentab (M5:IH534), eindeutige IDs
- **`app/src/engine/weapons.js`** — `computeWeaponAttack()`, Finesse/Nebenhand/RW
- **Ausrüstungs-Tab** — 5 Waffenslots, Angriff/Schaden/Krit/RW, Verz./Ang+/Sch+
- Verifiziert: Langschwert K5/ST18 → +9/1W8+4/19-20/x2 ✓

- **`data/armor.json`** — 45 Rüstungen (Leicht/Mittel/Schwer) aus Ruesttab
- **`data/shields.json`** — 16 Schilde aus Schildtab
- **Combat-Tab Gear-Sektion** — Rüstungs-/Schildauswahl + Verzauberung;
  RK auto-berechnet; MaxGE-Cap greift; Info-Zeile zeigt Typ/Malus/ZV-Chance
- `char.gear = { armor_id, armor_enh, shield_id, shield_enh }` in Store
- `tools/build_armor.py` — Pipeline-Skript (analog zu build_weapons.py)
- Verifiziert: Plattenpanzer → RK +18, MaxGE 0, ZV 40% ✓, iOS ✓

- **`data/spells.json`** — 2238 Sprüche aus ZaBesch+ZaListe (22 Klassen, class_levels)
- **`app/src/components/SpellsTab.jsx`** — Klassen-Dropdown, Stufen-Tabs (0–9), Suche,
  expandierbare Beschreibungen, farbige Stufen-Badges
- Verifiziert: Feuerball → Hxm./Magier Stufe 3, Schule Hv Fe ✓

- **Export/Import** — ⬇/⬆ Buttons in Topbar; Download als `<name>.json`;
  Upload via FileReader + importChar(); `importChar()` in useCharacter.js
- **Tragegrenze** — Attribute-Tab Zeile: Leicht/Mittel/Schwer in kg (aus Attributtab,
  1:1 Excel), farbkodiert grün/amber/rot; reagiert auf ST-Änderungen
- **Größen-Modifikator** — Kampf-Tab: size-Selektor (7 Stufen Winzig→Kolossal);
  auto-detect aus Rasse; setzt size_mod_rk + size_mod_kmb in combat_misc;
  Anzeige "RK ±X · KMB ±X" neben Dropdown

- **Trefferpunkte** — Combat-Tab: Max/Aktuell/Temp-Felder, Farb-HP-Bar (grün/amber/rot),
  +1/−1 Quick-Buttons; `char.hp = {max, current, temp}`; `setHp()` in Store
- **Rüstungsmalus auf Fertigkeiten** — `computeAllSkills()` + `computeSkill()` nehmen
  `armorCheckPenalty`; `armor_check_penalty: true` Skills aus skills.json automatisch
  reduziert; rotes "−7" Exponent in Skill-Zeile, Hinweis-Banner bei aktivem Malus
  Verifiziert: Akrobatik K+3Rg+GE0 − Plattenpanzer(−7) = −1 ✓

- **Bewegungsgeschwindigkeit** — Kampf-Tab: Zeile "Bewegung X m (Y m ohne Rüstung)";
  auto aus `races.json speed_m.unarmored/armored`; Rüstung = armored-Wert. Zwerg: 6/6 m.
- **Mehrere Charaktere** — `useCharacters.js` (neuer Store, ersetzt useCharacter.js);
  Migration von Legacy `pf1_character` automatisch; `pf1_chars_index` + `pf1_char_<id>`;
  `CharacterDrawer.jsx` — Schublade mit Liste, Wechsel, Löschen, Neu; ☰ mit Zahl-Badge;
  immer mind. 1 Charakter; `newChar()` / `switchChar(id)` / `deleteChar(id)`

- **Notizen-Tab** — freies Textarea pro Charakter (`char.notes`), `setNotes()` in Store
- **Zauberbuch-Modus** — Zauber-Tab: Mode-Toggle Nachschlagen/Zauberbuch;
  Zauberbuch: Klassen-Wahl, Stufen-Slots (Total/Used/↺), Slot−/+;
  Nachschlagen: "+" Button → Spruch in Zauberbuch-Stufe eintragen;
  `char.spellbook = { class_id, levels: {lv: {total, used, prepared[]}} }`;
  `setSpellbook(fn)` in Store; `setNotes()` in Store
  Verifiziert: Stufe 3, Feuerball Hv Fe ✓

- **FK-Punkte-Budget** — Fertigkeiten-Tab Header: Verbraucht/Gesamt + Frei-Anzeige;
  Formel: `max(1, sppl + IN_mod) + race_extra` × Stufen, Multiclass-SUMME;
  Rot wenn überzogen, grün wenn frei; ausgeblendet wenn keine Klasse gewählt.
- **Bekanntschaftsbuch** — Notizen-Tab Mode-Toggle ✎ Notizen / ☻ Bekanntschaftsbuch;
  NSC-Karten: Name, Volk, Verhältnis (Verbündeter/Feind/Händler/…), Notiz;
  Inline-Formular: Neu anlegen, Bearbeiten, Löschen; Zahl-Badge im Toggle;
  `char.contacts = [{id, name, race, relation, notes}]`; `setContacts(fn)` in Store
  Verifiziert: Karte anlegen, Badge zählt, Verhältnis farbig ✓

- **Homebrew** — ⚙ Button in Topbar öffnet Panel; 5 Typen: Klassen/Völker/Waffen/Rüstungen/Schilde;
  CRUD (Anlegen/Bearbeiten/Löschen) je Typ; gespeichert global in `pf1_homebrew` (localStorage);
  Klassen-Progression automatisch generiert (bab_type + good_saves);
  Homebrew-Einträge erscheinen in allen Selektoren (⚙-Prefix, eigene optgroup);
  Engine-Registrierung: `registerHomebrewClasses/Armor/Shields()` → sofort in Berechnungen aktiv;
  `useHomebrew.js` Store; `HomebrewPanel.jsx` + CSS; `generateClassProgression()` in classes.js
  Verifiziert: Runenschmied W8·full·2FK angelegt → in allen 3 Klassen-Dropdowns sichtbar ✓

- **Talente-Tab** — 7. Tab (❋); Budget: ceil(Stufe/2) + 1 für Mensch; Typ-Badge farbig
  (Allgemein/Kampf/Metamagie/Erschaffung/Teamwork/Volk/Klasse/Sonstige);
  Inline-Formular: Name + Typ + Notiz; Bearbeiten/Löschen; `char.feats = [{id,name,type,notes}]`;
  `setFeats(fn)` in Store; Hinweis zu Klassenbonus-Talenten
  Verifiziert: Waffenfokus Typ Kampf ✓

- **XP-Tracker** — Attribute-Tab unterhalb Tragegrenze; 3 Tempos (Schnell/Mittel/Langsam);
  Progress-Bar mit Stufen-Label; XP-Direkteingabe + Quick-Add; Warndreieck bei
  Abweichung XP-Stufe ≠ Klassenstufe; Max-Level-Anzeige bei Stufe 20;
  `char.xp = {current, track}`; `setXp(field, value)` in Store
  Verifiziert: 0 XP → Stufe 1, 2k bis Stufe 2 ✓

- **Talente-Datenbank** — 3568 Einträge aus ZaBesch (Tal-WZ) extrahiert → `data/feats.json`;
  Typen: Allgemein/Kampf/Metamagie/Erschaffung/Teamwork/WZ/Nachteil/Klasse (per Suffix-Erkennung);
  FeatsTab: Autocomplete-Dropdown beim Eingeben (≥2 Zeichen), zeigt Name+Typ+Beschreibung;
  Klicken füllt Name, Typ, DB-Beschreibung automatisch; eigenes Notizfeld bleibt frei;
  Karte zeigt DB-Beschreibung kursiv + Nutzernotiz; `tools/build_feats.py` Pipeline-Skript
  Verifiziert: "Waffenfokus" → Dropdown, "Waffenfokus K" auswählen → Typ Kampf, DB "TW+1 auf eine Waffe" ✓

- **Zustände** — Kampf-Tab unterhalb Rettungswürfe; 22 PF1e-Standardzustände als Toggle-Chips;
  aktive Zustände rot hervorgehoben, Badge "N aktiv", Auswirkungsliste darunter;
  `char.conditions = [id, …]`; `setConditions(fn)` in Store
  Verifiziert: Ermüdet + Schütteln → 2 aktiv Badge, Auswirkungen sichtbar ✓

- **Inventar-Tab** — 8. Tab (⚜); Münzen PP/GP/SP/CP mit ≈GP-Summe;
  Gegenstände-Liste: Name/Menge/Gewicht/Notiz; Gesamtgewicht farbkodiert (Leicht/Mittel/Schwer);
  `char.inventory = {coins, items[]}`; `setInventory(fn)` in Store
  Verifiziert: Seil 4.5 kg → "4.5 kg LEICHT" ✓

- **Archetypen** — 346 Einträge aus ZaBesch (Titel-Typ) in 65 Klassen → `data/archetypes.json`;
  Kampf-Tab: Archetyp-Dropdown erscheint nach Klassenwahl, max. 3 pro Slot;
  Chips mit ×-Button; gewählte Archetypen in `entry.archetypes[]` (via setClass());
  `tools/build_archetypes.py` Pipeline-Skript
  Verifiziert: Kämpfer → "Bogenschütze" Chip erscheint, entfernbar ✓

- **Sonderfertigkeiten** — Notizen-Tab 3. Modus (⚡ Sonderfähigk.); CRUD: Name/Quelle/Beschreibung;
  Quellen: Rasse/Klasse/Archetyp/Talent/Gegenstand/Sonstige (farbkodiert); Badge zählt;
  `char.specials = [{id, name, source, desc}]`; `setSpecials(fn)` in Store
  Verifiziert: Darkvision Quelle Rasse → Karte + Badge 1 ✓

- **Sprachen/Bio** — Attribute-Tab unterhalb XP-Tracker; Sprachen (input), Aussehen (2-Zeilen),
  Hintergrund (3-Zeilen); `char.bio = {languages, appearance, background}`; `setBio(field, value)`
  in Store; `BioSection.jsx` + CSS
  Verifiziert: alle 3 Felder sichtbar, persistent ✓

- **Iterative Angriffe** — Waffen-Tab zeigt vollständige Angriffskette (+11/+6/+1);
  `iterativeAttacks()` in weapons.js; `full_attack_str` im Angriff-Box
  Verifiziert: Kämpfer Stufe 11 → +11/+6/+1 ✓

- **Trefferwürfel-Text** — Kampf-Tab: `hd_text` Freitextfeld je Klassen-Slot (z.B. "1W10+3");
  gespeichert als `entry.hd_text` in `char.meta.classes[idx]`

- **DR / Resistenzen / Immunität** — Kampf-Tab neue Sektion unterhalb Rettungswürfe;
  3 Freitextfelder DR / Resist. / Immunität; gespeichert in `combat_misc.dr_text`,
  `.resist_text`, `.immunity_text`

- **Zauber-SG** — Zauber-Tab Zauberbuch-Modus: DC-Panel oben; SG = 10+Stufe+Mod pro Stufe 0–9;
  Attribut-Mapping INT/WE/CH für 22 Klassen; `DcPanel` Komponente; `attrs` Prop an SpellsTab
  Verifiziert: Hxm./Magier IN+0 → Stufe 0=10, 1=11, 3=13, 9=19 ✓

- **Gifte** — 80 Einträge aus ZaBesch (Gift-Typ) → `data/poisons.json`;
  Notizen-Tab 4. Modus (☠ Gifte): durchsuchbare Liste, Name/Typ/SG/Seite,
  expandierbar mit Eintritt/Frequenz/Effekt/Heilung; `tools/build_poisons.py`
  Verifiziert: Albtraumdämpfe SG 20, Belladonna SG 14 ✓

- **Druckansicht** — 🖨 Button in Topbar öffnet Print-Overlay; weißes A4-Layout mit
  Attributen, Kampfwerten, Saves, Fertigkeiten (trainiert), Waffen, Talenten, Sonderfähigkeiten,
  Notizen; `@media print` blendet App-Shell aus, `window.print()` aus dem Overlay;
  `PrintView.jsx` + `PrintView.css`

- **Sonderfertigkeiten-Datenbank** — 117 Rassenmerkmale aus ZaBesch (BesFähig-Typ) → `data/racial_traits.json`;
  `tools/build_racial_traits.py` Pipeline-Skript; Sonderfähigk.-Formular: Autocomplete beim
  Eingeben (≥2 Zeichen), füllt Name+Quelle(Rasse)+Beschreibung; `.sf-autocomplete-wrap`

- **Wechselkurs-Rechner** — Inventar-Tab: ⇄ Toggle-Button; Eingabe Betrag + Währung,
  zeigt alle 4 Denominationen gleichzeitig; Kurs PP/GP/SP/CP korrekt

- **Volkstext / Rassenmerkmale** — Volk-Selector zeigt "Rassenmerkmale (N)" Toggle;
  collapsible Liste mit Trait-Name + Beschreibung; leer wenn keine Daten vorhanden

- **Klassen-Info-Badge** — Kampf-Tab Klassen-Slots: Badge "W{hit_die} · {sppl}FK" neben
  TW-Eingabe; aus `classes.json` lookup; auch für Homebrew-Klassen

- **Charakter-Stufe im Header** — Topbar: "Stufe X" Badge rechts vom Charakternamen;
  zeigt `baseValues.totalLevel`, ausgeblendet wenn 0

- **Zauberslots Auto** — Zauberbuch-Modus: "⟳ Auto" Button neben Klassen-Selector;
  befüllt Slot-Totals aus PF1e-Standardtabellen (`engine/spellSlots.js`);
  `getSpellSlots(classId, classLevel)` → sparse object; 4 Tabellentypen:
  full9/full6/full4_prepared + full6_spontaneous; 21 Klassen gemappt

- **Spells Known (Spontanwirker)** — `getSpellsKnown()` + `isSpontaneousCaster()` in
  `engine/spellSlots.js`; Barde/Skalde (6-level) + Paktmagier (9-level) Tabellen;
  SpellBook zeigt "Spontan"-Badge + "N/Max bekannt" Zähler pro Stufe für Spontanzauberer.
  Verifiziert: Barde → "Spontan"-Badge, Stufe 3 → Zähler sichtbar ✓

- **Schablonen** — 25 Einträge aus ZaBesch (Schablone-Typ) → `data/templates.json`;
  5. Modus im Notizen-Tab (✦ Schablonen); durchsuchbare Referenzliste mit GRW-Seitenzahlen.

- **PWA-Cache-Limit** auf 5 MiB erhöht (vite.config.js workbox.maximumFileSizeToCacheInBytes)

- **Klassenfähigkeiten-Panel** — collapsible im Kampf-Tab; 10 Basisklassen (Barbar, Barde, Druide,
  Hexenmeister, Hexe, Kämpfer, Kleriker, Magier, Mönch, Paladin); freigeschaltete Fähigkeiten je
  Stufe als Chips; `data/class_features_by_level.json`; `ClassFeaturesPanel.jsx`;
  `tools/build_class_features.py` (hardcoded Kräftelisten-Spalten)

- **NL-Schaden** — Kampf-Tab HP-Sektion: separates Eingabefeld; "Bewusstlos bei ≤X" Hinweis;
  "Erholt" Reset-Button; `char.nl_damage` im Store

- **Magische Ausrüstungsslots** — Inventar-Tab: 12 Slots (Kopf/Stirn/Hals/Schultern/Brust/Körper/
  Gürtel/Handgelenke/Hände/Ring 1/Ring 2/Füße) als collapsible 2-Spalten-Grid;
  `char.magic_slots` im Store; `setMagicSlots(slot, value)` in Store

- **Ressourcen-Vorschläge** — Ressourcen-Panel zeigt Chips mit Auto-Berechnungen für 10 Klassen
  (Barbar, Kleriker, Barde/Skalde, Paladin/Antipaladin, Mönch, Hexe/Hexenmeister, Inquisitor,
  Paktmagier, Alchemist); Klick fügt Resource direkt ein; deaktiviert wenn bereits vorhanden

- **Druckansicht erweitert** — Bio-Sektion (Sprachen/Aussehen/Hintergrund) + Zauberbuch-Sektion
  (Stufen-Slots, vorbereitete Zauber) in PrintView.jsx

- **Zustands-Modifier in Engine** — `app/src/engine/conditions.js`: `getConditionMods()` für
  alle 22 PF1e-Zustände; greift in RK, GAB, Saves, Init, Skills ein. Erschöpft/Ermüdet/Gelähmt
  ändern effektive ST/GE-Mods; blind/betäubt/gelähmt nehmen Dex-Bonus zur RK.
  Verifiziert: Schütteln aktiv → alle Saves −2 (+4→+2) ✓

- **Klassenfähigkeiten Coverage** — `tools/build_class_features_by_level.py` scannt alle
  Zellen von Kräftelisten nach `101 <Klassenname>`-Ankern; **65 Klassen** (vorher 10);
  Schurke, Waldläufer, Alchemist, Inquisitor, Paktmagier, Kampfmagus, Skalde, Ninja u.v.m.

- **Druckansicht Seite 2** — Seite 1 = Attribute/Kampf/Saves/Gear/Zustand/Sprachen +
  Waffen/Fertig/Talente/Sonderfähigk.; Seite 2 (konditionell) = Zauberbuch mit DC-Tabelle +
  Slot-Detail + Spruchliste + Notizen + Bio (Aussehen/Hintergrund); Screen: gestrichelter
  Trenner; Print: `page-break-before: always`; `PrintView.jsx` + `PrintView.css`
  Verifiziert: Seite 1 + 2 rendern korrekt, keine Konsolenfehler ✓

- **Klassenfähigkeiten-Panel** — `ClassFeaturesPanel.jsx` ist bereits vollständig data-driven
  aus `class_features_by_level.json` (65 Klassen); kein Hardcoding mehr nötig ✓

- **Verwirrt-Zustand (d%-Würfelhelfer)** — `ConditionsPanel.jsx`: wenn Verwirrt aktiv,
  erscheint Panel mit "🎲 Würfeln"-Button; zeigt d100-Ergebnis + Highlight der passenden
  Tabellen-Zeile (01-25 Handelt normal / 26-50 Lallt / 51-75 Selbstschaden / 76-100 Angreift)
  Verifiziert: Roll 3 → "Handelt normal" hervorgehoben ✓

- **Ressourcen Auto-Berechnung erweitert** — `ResourcesPanel.jsx`: neue Klassen: Druide
  (Tiergestalt), Kampfmagus (Arkaner Pool), Ritter (Herausforderung/Ordensgelübde),
  Ninja (Ki-Vorrat), Schütze, Orakel (Offenbarung), Waldläufer (Gefährten-Fokus)

- **Spontanwirker vervollständigt** — `engine/spellSlots.js`: Hexenmeister + Orakel als
  `full9_spontaneous_class` (eigene Slot-Tabelle + PF1e Sorcerer/Oracle Spells-Known-Tabelle);
  `isSpontaneousCaster()` erkennt jetzt alle 5 Spontanklassen

- **Inventar-Gewicht gegen Tragegrenze** — `App.jsx`: Gesamtgewicht der Inventar-Items wird
  live berechnet; aktive Tier-Kachel (Leicht/Mittel/Schwer) bekommt Outline-Highlight;
  aktuelles Gewicht als farbiger Badge rechts in der Tragegrenze-Zeile

- **Klassenfähigkeiten im Druck** — `PrintView.jsx` Seite 1 rechts: neue Sektion nach
  Sonderfähigkeiten; zeigt alle freigeschalteten Fähigkeiten je Klasse als Chips;
  `PrintView.css`: `.pv-cf-*` Stile

- **Buff-Tracker** — Kampf-Tab: collapsibles Panel "Buffs / Effekte"; Buffs anlegen mit Name +
  16 Bonus-Feldern (ST/GE/KO/IN/WE/CH, Angriff, RK, Nat.Rüst., Ausweich., Fort/Ref/Will/AlleRW,
  Init, Fertigk.); Toggle aktiv/inaktiv je Buff; aktive Buffs fließen in Engine: Attribut-Scores
  (computeAttributes), Kampfwerte (computeCombat), Fertigkeiten (computeAllSkills);
  `char.active_buffs = [{id, name, active, bonuses}]`; `engine/buffs.js` + `BuffTracker.jsx`

- **Domänen-Auswahl** — Kampf-Tab: erscheint wenn Kleriker (2 Slots) oder Inquisitor (1 Slot)
  als Klasse gewählt; 35 PF1e-Domänen aus `data/domains.json`; Auswahl in `char.meta.domains[]`;
  `DomainsPanel.jsx` + `DomainsPanel.css`

- **Charakter-Grunddaten** — Attribute-Tab Bio-Sektion: 4 neue Zeilen (2-spaltig):
  Gesinnung (Dropdown 9 Optionen), Gottheit, Geschlecht, Alter, Größe (cm), Gewicht (kg),
  Haarfarbe, Augenfarbe; gespeichert in `char.bio`; `BioSection.jsx` erweitert

- **Waffen-Engine komplett** — `WeaponsTab.jsx` + `engine/weapons.js`:
  - Fin./NH als Chips statt Checkboxen; neuer "FK"-Chip (Fernkampf-Toggle)
  - Nebenhand: ST-Bonus automatisch ×0,5 (war immer ×1)
  - Fernkampf auto-detect: Waffen mit str_bonus_mult=0 (Bögen/Armbrüste) → GE für Angriff
  - Schadensklasse nach Größe: dmgKey aus size_mod_rk → sk/k/m/g/r-Spalte
  - Waffenprofizienzen: `def.proficiency` als Badge neben Waffen-Selector
  - Reichweite mit "−2/Inkr." Sub-Label für Wurfwaffen mit range_m
  - `SIZE_TO_DMG` Map: `{2:'sk', 1:'k', 0:'m', '-1':'g', '-2':'r'}`

- **Münzgewicht in Tragegrenze** — `App.jsx`: 1000 Münzen (PP+GP+SP+CP) = 1,5 kg;
  Münzgewicht wird zum Inventargewicht addiert; Tragegrenze-Tier reagiert live

- **Druiden-Tiergestalt korrigiert** — `ResourcesPanel.jsx`: Formel korrigiert auf
  PF1e-RAW: erst ab Stufe 4 (vorher Stufe 2); `lvl >= 4 ? Math.floor(lvl/2) - 1 : 0`
  (Stufe 4→1, Stufe 6→2, Stufe 8→3, Stufe 14→6)

- **GE-Label** — `AttributeBlock.jsx`: "Geschicklichkeit" → "Geschick" (zu lang für Mobile-Label)

- **Attribute-Tab kollabierbar + sortierbar** — alle 5 Sektionen (VOLK, KLASSE(N), ATTRIBUTE,
  EP, PERSON) mit ▶/▼-Toggle und ↑↓-Reorder; `useSectionOrder('pf1_attr_order', ATTR_DEFAULT)`;
  `attrCollapsed` Set mit localStorage-Persistenz (`pf1_attr_collapsed`); Attr-Tab per
  `attrOrder.map()` gerendert; `ClassSection.jsx` + `RaceSelector.jsx` erweitert (heading-row,
  `showLabel`-Prop)

- **Mobile-First UI-Überarbeitung** — großes Testing + Fixes:
  - Notizen-Tab Mode-Toggle: `overflow-x: auto`, `flex-shrink: 0`, `white-space: nowrap` →
    horizontales Scrollen statt Wrapping bei 5 Modi (NotesTab.css)
  - Talente-Tab Budget-Zeile: Hinweistext verkürzt auf "(Basis +1 Mensch)" mit `title`-Tooltip
  - Combat-Tab Outer-Panels: `hideTitle`-Prop für ConditionsPanel, BuffTracker, ResourcesPanel,
    ClassFeaturesPanel → kein doppelter Titel mehr wenn Panel in ct-section eingebettet
  - Sort-Bar/Panel-Border: `sortable-outer-panel > *:not(.sort-bar) { border-radius: 0 0 8px 8px }`
    für sauberen Übergang (App.css)
  - BioSection + XpTracker: eigene Card-Styles entfernt (waren doppelt genested in ct-section)
  - iOS-Test bestanden: Portrait (390×664) + Landscape (750×340), navAtBottom, kein Overflow ✓

- **XL-Font-Fixes (375px iPhone, font-size: 22px)** — reale iPhone-Screenshots geprüft:
  - `main-scroll { overflow-x: hidden }` → kein horizontaler Viewport-Shift mehr
  - Tragelast-Kacheln: `carry-label/ct-tag/ct-val/carry-current` auf feste px-Größen (9px/11px)
    statt rem → skaliert nicht mit XL-Font; carry-coin-toggle auf 14px
  - Kampf-Tab Bewegungszeile: `overflow: hidden` von `.speed-extras-grid` entfernt;
    `es-cell { min-width: 0; overflow: hidden }` + `es-maneuver-sel { min-width: 0 }` →
    MANÖVER-Select erzwingt keine Überbreite mehr; SCHWIMMEN/GRABEN "m"-Einheit sichtbar ✓
  - Kampf-Tab Kampfwerte: `stat-row { gap: 5px }` (von 8px) → NAHKAMPF-Label vollständig ✓
  - Zauber-Tab Zauberbuch: `sb-class-row { flex-wrap: wrap }` → Spontan-Badge + ⟳ Auto-Button
    wrappen zur zweiten Zeile statt rechts abzuschneiden; `sb-lv-title { white-space: nowrap }`
    verhindert "Stufe\n0"-Umbruch; `sb-slots { flex-shrink: 0; margin-left: auto }`
  - Verifiziert: 375px Portrait + Landscape, alle 4 gemeldeten Issues behoben ✓

- **UI-Überarbeitung (2026-06-25)** — schwarzes Theme (#000/#111), Font-Stepper −Aa+ (statt Cycle),
  Tab "Attribute" → "Char"; 4 weitere XL-iPhone-12-mini-Fixes:
  `attr-block { min-width: 0 }` → Mod-Kreise rechte Spalte sichtbar;
  `gear-select/class-select { min-width: 0 }` → Verz.-Input + WW-Badge vollständig;
  `gear-enh-label { flex-direction: row }` → Verz. inline;
  `stat-value-row { flex-wrap: wrap }` → Buff-Badges wrappen nach unten

- **Bewegung neu strukturiert** — 2×2-Grid (FLIEGEN/SCHWIMMEN/KLETTERN/GRABEN) + MANÖVER
  als eigene volle Zeile darunter; kein horizontales Overflow mehr bei XL-Font

- **Topbar ⚙-Menü** — 4 Buttons (Export/Import/Druck/Homebrew) in ein Dropdown konsolidiert;
  Fix: `.app-menu` als Sibling von `.app-menu-backdrop` (nicht Child) + `.topbar { overflow: visible }`
  damit das Dropdown nicht vom Topbar geclippt wird

- **Ressourcen-Formular Icon-Buttons** — Text "Löschen/Abbrechen/Speichern" → 🗑/✕/✓ Icons
  mit title-Tooltip; 40×40px touch targets

- **Zauber ↗-Pfeil** — direkt nach dem Zaubernamen (wie bei Fertigkeiten);
  `spell-name-wrap` flex-container mit Name + RefLink nebeneinander

- **Gifte ↗-Links** — NotesTab: `PoisonRefLink` für Gifte mit Seite "G*" auf
  `prd.5footstep.de/Grundregelwerk/…/Gifte/<slug>`; Slug: ä→ae/ö→oe/ü→ue/ß→ss

- **Talente-Karten ↗-Link** — `source`-Feld beim DB-Eintrag-Auswahl gespeichert;
  `FeatRefLink` zeigt ↗ in der Karte auch nach Speichern

- **Stat-Row Fix** — NAHKAMPF/FERNKAMPF gleich groß wie andere Boxes (Desktop):
  `flex-wrap` entfernt, `min-width: 55px` → `min-width: 0`

- **Spieler-Feld** — `char.meta.player`; kleines Eingabefeld unterhalb Charaktername
  in Topbar; player-Name erscheint als erstes in der Charakterliste-Schublade (`CharacterDrawer.jsx`);
  `indexEntry()` enthält `player`-Feld

- **GitHub Gist Backup** — `useGistSync.js` Hook; `GistSyncPanel.jsx` Modal;
  ⚙-Menü neuer Eintrag "☁ Backup"; Token einmalig eingeben → privater Gist wird angelegt
  oder vorhandener erkannt; alle Änderungen 3 s debounced auto-gepusht;
  "⬇ Daten laden" restored alle Chars aus Gist (localStorage-Restore + reload);
  grüner Punkt am ⚙-Button wenn verbunden; kostenlos (GitHub Free, 5000 req/h)

- **Gist-Sync Race-Condition Fix** — `pushReadyRef` blockiert Push bis initialer Pull fertig;
  `countChanged`-Check entfernt (nur Timestamps zählen); verhindert dass Multi-Device-Sync
  ältere Daten überschreibt wenn Debounce noch läuft
  Verifiziert: Mac-Charakter bleibt nach iPhone-Sync erhalten ✓

- **Homebrew in Backup + Export** — Gist-Backup enthält `homebrew`-Key (version 2);
  Single-Char-Export enthält Homebrew wenn vorhanden; Import ruft `reloadHB()` auf;
  `getBackupData()` in useCharacters.js; `reloadHB()` in useHomebrew.js

- **Deep-Merge beim Import** — `deepMerge(base, override)` rekursiv in useCharacters.js;
  `loadChar` + `importChar` nutzen deepMerge statt flachem Spread → neue Sub-Felder
  (z.B. `bio.alignment`) bleiben nie undefined nach Import älterer Char-Dateien

- **Buff-Tracker Icon-Buttons** — Formular-Aktionen: 🗑/✕/✓ Icons (40×40px touch targets),
  analog zu ResourcesPanel; `BuffTracker.css` neue Button-Styles

- **KO-Mod Hinweis bei Max-TP** — Kampf-Tab HP-Sektion: "KO +X × N Stufen = +Y TP" Zeile
  zwischen Max-TP und NL-Schaden; `CombatTab.jsx` + `CombatTab.css` (`.hp-ko-hint`)

- **Spell Auto Fix (Hexenmeister/Magier)** — `SPELLBOOK_TO_CHAR_ID` Alias-Map in SpellsTab;
  `hxm_magier` (spells.json ID) → `hexenmeister`/`magier` (classes.json IDs);
  `effectiveClassId` für Slot-Typ-Lookup; Hexenmeister korrekt als Spontanwirker (CH)
  Verifiziert: Hexenmeister Stufe 10 → Auto füllt alle Stufen korrekt ✓

- **Spinner-Pfeil Fix (Zauberbuch Max-Feld)** — `.sb-total-input`: `-webkit-appearance: none`,
  `-moz-appearance: textfield` → keine überlappenden Spinner-Pfeile auf iOS/Android

- **Zauber Stufen-Tabs scrollbar** — `.spell-level-tabs`: `flex-wrap: nowrap; overflow-x: auto;
  scrollbar-width: none` → kein Umbruch auf 2 Zeilen bei vielen Stufen (Mobile)

- **Zauber ↗-Pfeil neben Namen (Nachschlagen)** — `spell-name-wrap` flex mit `align-items: baseline`;
  `spell-name` hat `min-width: 0` + text-overflow ellipsis; `spell-ref-link` hat `flex-shrink: 0`
  → Pfeil immer direkt nach Name sichtbar, auch bei langen Namen

- **Bonuszauber-Fix + ✦-Toggle** — `engine/spellSlots.js`: Auto-Button-Formel korrigiert auf
  `floor((mod − L) / 4) + 1` (war immer +1, jetzt korrekt ab Mod ≥ 5);
  Zauberbuch: ✦-Button je Zauber → markiert als Bonuszauber (Blutlinie/Mysterium/Patron);
  markierte Zauber zählen nicht gegen N/Max bekannt; golden hervorgehoben;
  `bloodline_ids[]` per Level in `char.spellbook.levels[lv]`; rückwärtskompatibel
  Verifiziert: Arkanes Siegel ✦ aktiv → 0/4 bekannt ✓

- **Panel-Sortier-Grenze gefixt** — Kampf-Tab hatte 2 getrennte Sort-Listen (intern:
  hp/combat/speed/ac/saves/dr + außen: features/conditions/buffs/resources/weapons);
  Panels konnten nicht über die Grenze hinaus verschoben werden; gefixt durch Zusammenführung
  in eine einheitliche Liste `COMBAT_ALL_DEFAULT` (11 Sektionen); `extraPanels`/`extraLabels`
  Props an `CombatTab`; Speicherschlüssel `pf1_combat_order` (war zwei Keys); Migration der
  alten collapsed-Keys (`pf1_combat_internal_collapsed` + `pf1_outer_collapsed`) in einen Key
  Verifiziert: WAFFEN kann frei über alle 11 Sektionen geschoben werden ✓

- **Preferences im Gist-Backup** — Panel-Anordnung (combat/attr order + collapsed-State) wird
  in Gist-Backup als `preferences`-Key gespeichert und beim Pull wiederhergestellt;
  `PREF_KEYS` in `useCharacters.js`; `GistSyncPanel.jsx` schreibt preferences bei Pull

- **SP/SL-Profile** — zwei völlig getrennte Charakterlisten + Gist-Backups; SP nutzt
  bestehende LS-Keys, SL nutzt `_gm`-suffixierte Keys (`pf1_chars_index_gm`, `pf1_char_gm_<id>`
  etc.); Profil-Toggle im ⚙-Menü (SP|SL); Wechsel triggert `window.location.reload()`;
  Gist: gleicher Token, getrennte Dateien (`pf1-bogen.json` / `pf1-bogen-gm.json`);
  `useCharacters(profile)` + `useGistSync(profile)` per `profileKeys()`-Factory
  Verifiziert: SL → leere Charakterliste, SP-Daten unangetastet ✓

- **Magische Ausrüstungsslots Mobile-Fix** — rechte Spalte (STIRN/SCHULTERN/…) war auf
  Mobilgeräten abgeschnitten; Ursache: fehlende `min-width: 0` auf `.inv-magic-cell`;
  behoben → beide Spalten auf 375px Portrait + Landscape sichtbar ✓

- **Bonuszauber-Label** — ✦-Button markiert Zauber als Blutlinie/Mysterium/Patron;
  statt Zeilen-Highlight jetzt kleines "BONUS"-Tag direkt neben dem Zaubernamen;
  `.sb-bonus-tag` (0.6rem, accent-Farbe, uppercase); SpellsTab.jsx + SpellsTab.css

- **GistSyncPanel Profil-Bugfix** — `handleConnect` + `handlePull` schrieben restore-Daten
  in hardcodierte SP-LS-Keys (`pf1_char_${id}`, `pf1_chars_index`), auch im SL-Profil;
  gefixt: `profileStorageKeys(profile)` → `charKey(id)` / `indexKey` korrekt je Profil

## Nächste Schritte
- Waffe zweihändig halten: Toggle an 1H-Waffe → ST-Bonus ×1,5 im Schaden
- Buff-Tracker: Bonus-Typ (Verbesserung/Moral/Glück/…) für Stapelung zeigen (optional)
- Gefährten/Beschwörungen: eigener Mini-Bogen für Tierbegleiter/Vertraute (deferred)

## Hinweise
- Dump-Erzeugung braucht venv + openpyxl 3.1.5 (im Scratchpad; bei Bedarf neu
  anlegen). Slicing/Build (`dump_util.py`, `build_*.py`) brauchen nur Python-stdlib.
- Trimm-Lücke der CSVs ist durch `sheets_full/*.jsonl` geschlossen — diese nutzen.
- Verifikations-Beispielchar im Bogen: Volk=Mensch, Klasse1=Kämpfer, Stufe 1.
- `char.gear` Feld: armor/shield-Selektion getrennt von `combat_misc` (manual overrides).
  `rk_armor`/`rk_shield` in combat_misc nur als Fallback wenn kein Gear gewählt.
