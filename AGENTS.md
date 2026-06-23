# AGENTS.md — Arbeitsweise & Konventionen

## Ziel
Originalgetreuer Nachbau der Excel `Version 6.61/Bogen 6.61 Spieler.xlsx` als
plattformübergreifende **PWA**. Die App soll **alles können, was die Excel kann**,
mit besserem Design. **Oberste Priorität: exakte Daten und exakte Berechnungen.**
Scope-Entscheidung des Nutzers: **voller Nachbau** (nicht nur der Rechenkern).

## Regelbasis
Pathfinder **1st Edition**, deutsches Grundregelwerk (Ulisses), Standardregeln.

## Entscheidungen (festgezurrt 2026-06-21)
1. **Rechen-Treue: 1:1 wie Excel.** Die Excel-Werte (`sheets_values/*.csv`) sind die
   Referenz-Wahrheit; Engine wird dagegen getestet. Excel-Eigenheiten werden
   übernommen (z. B. TP nicht auto-summiert; Last senkt Bewegung nicht).
   Abweichungen vom RAW-Regelwerk nur als separate Notiz markieren, nicht „fixen".
2. **Sprache: DE + EN umschaltbar.** Datenfelder sprachgekeyt (`{de, en}`). EN-Inhalt
   nur wo in der Quelle vorhanden; sonst DE-Fallback + später ergänzen.
3. **Homebrew von Anfang an.** Eigene Klassen/Völker/Waffen/Rüstungen/Schilde/Sprüche
   sind Teil des Kern-Nachbaus (an Stammlisten anhängbar, dynamisch statt fester Slots).
4. **Kein Alt-Import.** Eigene lokale Speicherung; Charaktere in der App neu angelegt.
   Excel-Speicherformat (VBA) wird NICHT rekonstruiert.
5. **Quellen-/Regelwerksfilter:** vorerst zurückgestellt (alles sichtbar); später optional.

## Tech-Stack (geplant)
- React + Vite + PWA-Plugin; offline-fähig, „zum Homescreen hinzufügen".
- Berechnungs-**Engine = reines, UI-unabhängiges JS-Modul**, strikt von der UI getrennt.
- Charakterdaten **lokal** (localStorage/IndexedDB), kein Server/Login/Sync.
- Export/Import: Charakter als JSON-Datei.
- Regel-/Stammdaten: gebündelte JSON (read-only), aus der Excel extrahiert.

## Rahmen
- Vorerst **nur lokal** — kein Git/Push/Hosting (Hosting später, separat).
- Privates Projekt.

## Extraktions-Pipeline (Quelle → Daten)
Rohextraktion liegt in `extraction/` (erzeugt mit openpyxl, venv im Scratchpad):
- `sheets_values/<Blatt>.csv` — zuletzt berechnete Zellwerte = **Referenz-Wahrheit**
  für Engine-Tests. ⚠️ auf letzte nicht-leere Zeile getrimmt (siehe Caveat unten).
- `sheets_formulas/<Blatt>.tsv` — alle Formelzellen (`Zelle<TAB>Formel`).
- `named_ranges.json` (1210), `validations.json` (Eingabe-Dropdowns),
  `merged_cells.json`, `workbook_overview.json`.
- Blattnamen mit Leerzeichen → Unterstrich im Dateinamen; Umlaute erhalten.

**Caveat:** Werte-CSVs sind getrimmt; rein formel-/leer-gecachte Tabellen können
abgeschnitten sein. Vor dem Daten-Port einen **vollständigen Konstanten-Dump**
nachziehen (Konstanten aus der Formel-Arbeitsmappe + Werte). Mehrere benannte
Bereiche sind dynamisch (OFFSET/INDIRECT) und im Export leer → aus Routing-Formeln
rekonstruieren.

## Architektur der Excel (drei Schlüsselmuster)
1. **Eine Stammtabelle** `ZaBesch` (`ZauberListen!BB:BF`, ~13.285 Zeilen) für alle
   Text-Objekte; Typ-Tag in Spalte `BA` (Spruch/BesFähig/Tal-WZ/Titel/Volk/Gift/
   Schablone/Waffe). → in der App eine DB mit `type`-Feld.
2. **Auswahllisten = VLOOKUP per Index** (Listen-Index auf `Klasse`-Blatt). → in der
   App gefilterte Queries.
3. **Klassen-Progression als 20-Zeilen-Block** pro Klasse (`Klasse`-Blatt),
   `INDIRECT("c"&KlasseNr*20+Stufe)`; Spalten C=GAB, G=Ref, H=Wil, I=Zäh (fertige
   Werte). Multiclass = SUMME über 3 Klassenzeilen.

## Wichtige Excel-Eigenheiten (verifiziert — für 1:1-Treue)
- **Attributwerte sind Direkteingaben.** `ST=Bogen!M26` etc. ist der fertige Wert;
  Mod = `VLOOKUP(ST+BuffST, Attributtab, 2)`. **Volks-Attribut-Mods werden NICHT
  automatisch angewendet** — der Spieler trägt sie selbst in den Wert ein. Volks-Mod-
  Texte (`VolkTab` Spalte F) sind reine Anzeige. (Tippfehler dort, z. B. Gnom „ST+2",
  beeinflussen daher nichts → faithful als Text übernehmen, RAW-Abweichung nur notieren.)
- **TP nicht auto-summiert** (nur Trefferwürfel-Text). **Mittlere/schwere Last senkt
  Bewegung/maxGE nicht** (nur getragene Rüstung). Siehe BESTANDSAUFNAHME §7.
- Speeds in `VolkTab` sind in **Metern** (dt. PF1e: 9 m ≈ 30 ft).

## Tools / Pipeline-Skripte (`tools/`)
- `extract_structure.py` — Formeln, benannte Bereiche, Validierungen, verbundene Zellen.
- `extract_full.py` — **kanonischer** untrimmter Per-Zell-Dump → `extraction/sheets_full/*.jsonl`
  (Konstante+Formel+gecachter Wert je Zelle). Maßgebliche Datenquelle.
- `dump_util.py` — schneidet A1-Bereiche aus den `sheets_full`-Dumps (raw|val).
- `build_races.py` — normalisiert `VolkTab` → `data/races.json` (Muster für weitere Ports).
- Laufen mit einem venv + `openpyxl` (Dump-Erzeugung). Slicing/Build brauchen nur Python-stdlib.

## Dokumentation
- `docs/BESTANDSAUFNAHME.md` — Gesamtanalyse (Prüf-Checkpoint, offene Fragen).
- `docs/sections/01..05` — Detailanalysen je Themenblock.

## Verifikation (Pflicht für die Engine)
Engine-Ausgaben gegen `extraction/sheets_values/*.csv` testen: gleiche Eingaben
müssen dieselben Werte liefern. Beispiel-Charakter im Bogen: Volk=Mensch,
Klasse1=Kämpfer Stufe 1.

## Mobile/PWA-Test
Layout (Portrait UND Landscape) vor „fertig" mit dem iOS-Preview-Rig prüfen
(`~/.claude/tools/ios-preview/shoot.js`). Echtes Gerät für Homescreen-Vollbild.
