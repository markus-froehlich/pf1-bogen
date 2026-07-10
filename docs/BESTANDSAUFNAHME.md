# Bestandsaufnahme — „Bogen 6.61 Spieler" (PF1e Bogen)

> Lesbare Gesamtanalyse der Excel-Vorlage als Grundlage für den originalgetreuen
> Web-App-Nachbau. **Dies ist der Prüf-Checkpoint** (Schritt 4 im Plan): bitte
> durchsehen und Offene Fragen (§7) beantworten, bevor Code/Engine gebaut wird.
>
> Detail-Analysen je Themenblock liegen in [`docs/sections/`](sections/):
> [01 Kern-Berechnung](sections/01-kern-berechnung.md) ·
> [02 Klassen & Völker](sections/02-klassen-voelker.md) ·
> [03 Zauber & Kräfte](sections/03-zauber-kraefte.md) ·
> [04 Waffen & Ausrüstung](sections/04-waffen-ausruestung.md) ·
> [05 Infrastruktur](sections/05-infrastruktur.md)
>
> Rohextraktion (maschinenlesbar) in [`extraction/`](../extraction/): pro Blatt
> `sheets_values/*.csv` (zuletzt berechnete Werte = Referenz-Wahrheit) und
> `sheets_formulas/*.tsv` (alle Formelzellen), dazu `named_ranges.json` (1210
> Namen), `validations.json` (Dropdowns/Eingaben), `merged_cells.json`,
> `workbook_overview.json`.

---

## 1. Was diese Datei ist

Kein schlanker Bogen, sondern ein **vollständiger PF1e-Charakter-Builder**
in Excel — komplett mit Inhalts-Datenbank für (fast) das ganze Regelwerk.

- **Quelle:** `Version 6.61/Bogen 6.61 Spieler.xlsx` (6,7 MB, **ohne** Makros).
  Die `…Master.xlsm` (mit VBA) bleibt außen vor.
- **Umfang:** 23 Tabellenblätter (8 versteckt), **1210 benannte Bereiche**,
  **~104.000 Formelzellen** (≈106k `IF`, ≈53k `VLOOKUP`).
- **Regelbasis:** PF1e, deutsches Grundregelwerk (Ulisses), Standardregeln.
- **Eingabe:** Der Nutzer füllt nur Dropdowns/Felder (Volk, Klasse(n)+Stufe,
  Attribute, Größe, Waffen, Rüstung, Talente …). Alles andere rechnet sich.

### Inhalt laut Analyse (Stückzahlen)
| Inhalt | Anzahl | Quelle |
|---|---:|---|
| Klassen (wählbar, inkl. Prestige) | **48** | Klasse-Blatt / `KlaListe` |
| Völker | **38** | Volk-Blatt / `Volkliste` |
| Archetypen | **~150** | `FertTabArche` |
| Zauber/Sprüche (Stammtabelle gesamt) | ~13.285 Text-Objekte | `ZaBesch` |
| Klassen-Spruchlisten | ~24 Listen | `ZaListe` (Spaltenpaare) |
| Waffen | **~393** | `Waffentab` |
| Rüstungen / Schilde | **63 / 16** | `Ruesttab` / `Schildtab` |
| Talente (Feats) | viele (Liste) | `Talentliste` |

---

## 2. Architektur in drei Ideen (wichtig für den Nachbau)

Die ganze Tabelle hängt an drei wiederkehrenden Mustern. Wer die versteht, kann
sie sauber nach JS überführen:

1. **Eine Stammdaten-Tabelle für alle Text-Objekte.** `ZaBesch`
   (`ZauberListen!BB:BF`, Zeilen 1–13285) hält *jedes* benannte Spielobjekt —
   Zauber, Klassenfähigkeiten, Gifte, Titel, Waffen, Volksmerkmale, Schablonen.
   Ein Typ-Tag in Spalte `BA` (`Spruch`, `BesFähig`, `Tal-WZ`, `Titel`, `Volk`,
   `Gift`, `Schablone`, `Waffe`, …) klassifiziert jede Zeile. → In der App wird das
   **eine normalisierte Datenbank mit `type`-Feld**.

2. **Auswahllisten = VLOOKUP per Index.** Eine Klassen-Spruchliste oder die
   wählbaren Fähigkeiten einer Klasse entstehen, indem ein pro Charakter
   berechneter „Listen-Index" (auf dem `Klasse`-Blatt) in indizierte Spaltenpaare
   nachschlägt; der volle Text kommt dann aus `ZaBesch`. → In der App **gefilterte
   Queries auf die Stammdaten** statt vorberechneter Spalten.

3. **Klassen-Progression als 20-Zeilen-Block.** Pro Klasse liegen 20 Zeilen (je
   Stufe 1–20) auf dem `Klasse`-Blatt, adressiert via
   `INDIRECT("c"&KlasseNr*20+Stufe)`. Spalte **C = GAB**, **G = Reflex**,
   **H = Willen**, **I = Zähigkeit** — als **fertig ausgerechnete** Werte pro Stufe
   (gute/schlechte Progression ist schon „eingebacken", kein Typ-Code).
   Multiclass = simple `SUMME` über die drei Klassenzeilen (`Klasse!B5:B7`).
   → In der App entweder dieselben Tabellen oder die zugrundeliegenden
   PF1e-Formeln (GAB = voll/¾/½·Stufe; Save gut = 2+Stufe/2, schlecht = Stufe/3).

---

## 3. Blatt-Übersicht (alle 23)

| # | Blatt | Sicht | Rolle |
|--:|---|---|---|
| 0 | **Bogen** | sichtbar | Haupt-Charakterbogen: Eingaben (Dropdowns) **und** Anzeige der Endwerte; viele Kernformeln (Attribut-Mods, RK, Waffenfelder). |
| 1 | Kräfte | sichtbar | Auswahlseite Klassenfähigkeiten/Volksfähigkeiten/Gifte (Dropdowns → Text). |
| 2 | Zauberbuch | sichtbar | Zauberbuch / vorbereitete Sprüche, Slots pro Grad. |
| 3 | Auswahl | sichtbar | Große Auswahl-/Notizmatrix (B23:B1232 etc.), Bonus-/Punktewahl. |
| 4 | **Fertig** | versteckt | Rechen-Zwischenschicht: Fertigkeiten-Matrix `FerTab`, Initiative, Archetyp-Mods `FertTabArche`. Speist `Bogen`. |
| 5 | Ausrüstung | sichtbar | Inventar + Tragelast (`ARTab`, `ARGewicht`). |
| 6 | Kompakt | sichtbar | Kompakt-Ansicht des Bogens. |
| 7 | **Kräftelisten** | versteckt | DB der Klassenfähigkeiten (Quelle der Kräfte-Dropdowns). |
| 8 | **Listen** | versteckt | Zentrale Nachschlage-DB: Würfel, Größentab, Attributtab, Belastung, Zustände, Talente, Geld, Gefährten … (266 benannte Bereiche). |
| 9 | **ZauberListen** | versteckt | Spruch-DB + **Stammtabelle `ZaBesch`** für alle Text-Objekte. |
| 10 | **Volk** | versteckt | Völker-DB (`VolkTab`) + `groetab` (Größen) + Tragkraft-Mods. |
| 11 | **Klasse** | versteckt | Klassen-Progression (20-Zeilen-Blöcke) + per-Charakter GAB/RW-Rechnung. |
| 12 | **Waffe** | versteckt | Waffen-/Rüstungs-/Schild-Katalog **und** 6 Waffen-Rechenblöcke. |
| 13 | Einkauf | versteckt | Kleine Einkaufs-/Gruppennotiz (kein Gold-Rechner). |
| 14 | Tools | sichtbar | Würfler, **Buffs** (`BuffListe`), Effekte, Alters-/Hilfsrechner. |
| 15 | Eigene | sichtbar | **Homebrew**: eigene Klassen/Völker/Waffen/Rüstungen/Sprüche. |
| 16 | Sonjas Spruchliste | versteckt | Beispiel-/Custom-Spruchliste (klein). |
| 17 | Tabelle1 | versteckt | Restposten/Hilfsspalte. |
| 18 | Einstellungen | sichtbar | Sprache (`LngListe`) + Ja/Nein-Schalter (Regelwerks-/Quellenfilter). |
| 19 | Info | sichtbar | Hinweise/Anleitung. |
| 20 | Legende | sichtbar | Farb-/Zeichenlegende. |
| 21 | **Speicher** | versteckt | **Save/Load-Lager**: gespeicherte Charaktere als flache Feldvektoren (~68–80 Slots). Schreib-/Lese-Mechanik lag im VBA (Master). |
| 22 | Impressum | sichtbar | Credits/Version. |

---

## 4. Eingabe-Modell (was der Nutzer eingibt)

Aus `validations.json` — die echten Eingabezellen sind Dropdowns:

- **Bogen:** Volk (`Volkliste`), Klasse 1–3 (`KlaListe`, abh. von Volk),
  Klassenstufen, Waffen 1–6 (`WaffenWahl`), Rüstung (`Rüstungswahl`), Schild
  (`Schildwahl`), Volksmerkmale (`volksmerkmalwahl`), Archetypen 1–3
  (`archetyp1-3wahl`), Domänen 1–4 (`domauswahl1-4`), Talente (`Talente`).
- **Bogen (Zahleneingaben):** die 6 Attribut-Grundwerte, NatRue/Ablenkung/TempRK
  (RK-Zusätze), diverse manuelle Felder.
- **Kräfte:** Fähigkeiten 1–3 (`kräftewahl1/2/3`), Gifte, Volksfähigkeiten,
  Schablonenkräfte.
- **Auswahl/Tools/Einstellungen:** Bonuswahl, Buffs (`BuffListe`), Sprache, Filter.

Alles Übrige (Mods, GAB, RW, RK, Initiative, KMB/KMV, Fertigkeiten, TP-Anzeige,
Waffenwerte, Tragelast) ist **berechnet**.

---

## 5. Berechnungskern (Kurzfassung — Details in §01)

- **Attribut-Mod:** `(Wert−10)/2` abgerundet via `Attributtab`; Buffs werden **vor**
  dem Lookup auf den Wert addiert; Temp-Override-Logik (`sttmp` …).
- **GAB:** `_GAB1 = SUMME(C5:C7)` (Multiclass), Folgeangriffe `_GAB2..4` bei −5/−10/−15.
- **Rettungswürfe:** Basis aus Progressionsblock (Zäh=`I8`, Ref=`G8`, Wil=`H8`) +
  passender Attribut-Mod (KO/GE/WE) + Buffs; Untoten-Sonderzweig.
- **RK:** `10 + Rüstung + Schild + GE-Mod(gedeckelt) + Größe + natürliche Rüstung +
  Ablenkung + sonstiges + temporär + Buff` (alle 10 Komponenten in §01 aufgelöst).
- **Initiative:** GE-Mod + Boni (`Fertig!U159`).
- **KMB/KMV:** GAB + ST/GE + Größenmod (`groetab`); KMV-Basis 10.
- **Fertigkeiten:** Ränge + (Klassenfertigkeit & Rang>0 → +3) + Attribut-Mod +
  Sonstiges; FP/Stufe = Klassenwert + INT-Mod×Stufe (+1 Mensch). Matrix `FerTab`.
- **Bewegung/Belastung:** Tragkraft aus `Attributtab` (×Größenfaktor); Schwellen
  leicht/mittel/schwer.

---

## 6. Datenmodell-Konsequenzen für die Web-App

Vorschlag, abgeleitet aus der Architektur (§2):

- **Statische Regel-Daten (read-only, im Code/als JSON gebündelt):**
  - `classes.json` — 48 Klassen: Progression (GAB-Typ, 3 RW-Typen, TW, FP/Stufe,
    Zaubertyp, Slots/Stufe), Klassenfertigkeiten, Archetyp-Verweise.
  - `races.json` — 38 Völker: Attribut-Mods, Größe, Bewegung, Merkmale, Boni.
  - `spells.json` — Sprüche (Name, Schule, Grad je Klassenliste, Komponenten,
    RW, ZR, Reichweite, Dauer, Text) — aus `ZaBesch` (Typ=`Spruch`).
  - `feats.json`, `weapons.json`, `armor.json`, `shields.json`,
    `class_features.json`, `conditions.json`, `domains.json`, … (je Typ-Tag aus
    `ZaBesch` + Spezialtabellen).
  - Hilfstabellen: `Attributtab`, `groetab`, Belastung, Würfel.
- **Charakterdaten (lokal, pro Gerät — localStorage/IndexedDB):** nur die
  Eingaben aus §4 (Volk, Klassen+Stufen, Attribute, Ausrüstungswahl, gewählte
  Talente/Fähigkeiten/Zauber, manuelle Zusatzfelder). Alles Abgeleitete wird zur
  Laufzeit von der Engine berechnet.
- **Engine:** reines JS-Modul, nimmt `{charakter, regeldaten}` → liefert alle
  berechneten Werte. Wird gegen die **Referenz-Werte** aus `sheets_values/*.csv`
  getestet (gleiche Eingaben ⇒ gleiche Ausgaben).
- **Export/Import:** Charakter-JSON als Datei (Backup / Geräteübertragung).
- **Homebrew (`Eigene`):** eigene Einträge werden an die Stammlisten angehängt
  (in der App dynamisch statt fester Slots).

---

## 7. Offene Fragen (bitte beantworten — §0 des Bauplans)

Diese Punkte beeinflussen Aufwand bzw. Korrektheit und sollten vor dem Bau geklärt
sein:

1. **Excel-Treue vs. Regel-Korrektheit bei Abweichungen.** Die Excel weicht an ein
   paar Stellen vom Regelwerk (RAW) ab — z. B. **TP werden nicht automatisch
   aufsummiert** (nur der Trefferwürfel-Text wird angezeigt), und **mittlere/schwere
   Last reduziert die Bewegung/maxGE nicht** (nur getragene Rüstung zählt). Soll die
   App **exakt wie Excel** rechnen (1:1 reproduzierbar) oder solche Stellen **nach
   PF1e korrigieren**? *(Empfehlung: 1:1 wie Excel, da das deine Referenz ist;
   Korrekturen optional getrennt markieren.)*
2. **Speichern/Laden alter Charaktere.** Die App bekommt eigene lokale Speicherung.
   Die **Speicher-Lager-Charaktere aus der Excel** lassen sich nur importieren, wenn
   wir das Excel-Speicherformat rekonstruieren (lag im VBA, nicht in dieser Datei).
   Brauchst du **Import bestehender Excel-Charaktere**, oder reicht „neu anlegen"?
3. **Homebrew nötig?** Soll die App eigene Klassen/Völker/Waffen/Zauber erlauben
   (`Eigene`-Blatt) — ja, weil „alles was Excel kann", oder erst später?
4. **Quellen-/Regelwerksfilter** (`Einstellungen`): die Excel kann Inhalte je
   Quellenbuch ein-/ausblenden. Nachbauen oder ignorieren (alles immer sichtbar)?
5. **Sprache:** nur Deutsch, oder DE/EN umschaltbar (Excel hat `LngListe`)?

## 8. Bekannte Extraktions-Hinweise (technisch)

- Die Werte-CSVs sind auf die letzte nicht-leere Zeile getrimmt; einige rein
  formelbasierte/leer-gecachte Tabellen (z. B. `ZustandTab` Tools 625–654, Teile
  von `Listentab`/`spruchtab`) erscheinen abgeschnitten. **Vor dem Daten-Port** wird
  ein vollständiger Konstanten-Dump nachgezogen (Werte **und** Konstanten aus der
  Formel-Arbeitsmappe), damit keine Stammdaten fehlen — kritisch für „Daten exakt".
- Mehrere benannte Bereiche sind dynamisch (OFFSET/INDIRECT) und im Export leer
  (`kräftewahl1/2/3`, `Schablonenkräfte`, `geübte_Waffen`, `Rüstungswahl`,
  `Schildwahl`); ihre Inhalte werden beim Port aus den Routing-Formeln rekonstruiert.
- School-/Typ-Codes sind uneinheitlich groß/klein geschrieben + vereinzelt
  Junk-Werte → beim Import normalisieren.

---

## 9. Vorgeschlagene nächste Schritte (nach Freigabe)

1. **Vollständiger, untrimmter Daten-Dump** + Normalisierung → saubere JSON-Stammdaten
   (`classes/races/spells/feats/weapons/armor/...`).
2. **Engine-Modul** (reines JS) für den Berechnungskern (§5), getestet gegen die
   Referenz-Werte.
3. **PWA-UI** (React + Vite + PWA) mit lokaler Speicherung, Export/Import.
4. Iterativ die weiteren Module (Zauber, Kräfte, Ausrüstung, Homebrew).
