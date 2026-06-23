# 04 – Waffen, Rüstungen/Schilde & Ausrüstung

Dokumentiert die Datentabellen (Kataloge) und Berechnungsblöcke für Waffen,
Rüstungen, Schilde und Ausrüstung der "Bogen 6.61 Spieler"-Mappe.
Zellbezüge sind 1-basiert (A1-Notation). Sheet-Namen wie im Workbook.

> **Wichtigster Strukturbefund:** Sowohl der **Waffenkatalog** als auch die
> **Rüstungs-** und **Schildkataloge** liegen alle auf dem versteckten Sheet
> **`Waffe`** (nicht auf `Listen`). Das `Listen`-Sheet enthält nur
> Anzeige-/Filterkopien (`ListeWaffen` F3:BU166, `ListeRuest` F168:BU200,
> `ListeSchild` F202:BU220). Die maßgeblichen Lookup-Tabellen sind
> `Waffentab`, `Ruesttab`, `Schildtab` auf `Waffe`.

---

## 1. Waffen

### 1.1 Sheet-Aufbau `Waffe`

`Waffe` ist versteckt, real **701 Zeilen × 303 Spalten** (Overview meldet
max_row 1037, real genutzt bis ~Zeile 697). Das Sheet enthält drei Teile:

| Bereich | Zeilen | Inhalt |
|---|---|---|
| Waffenkatalog | M6:IH534 (`Waffentab`) | Stammdaten aller Waffen |
| Rüstungskatalog | M547:HY655 (`Ruesttab`) | Stammdaten Rüstungen |
| Schildkatalog | M666:HY697 (`Schildtab`) | Stammdaten Schilde |
| Mönch-Tabelle | JU64:KG83 (`MönchTab`) | Schlaghagel-Schaden je Stufe |
| Berechnungsblöcke | Spalten IX:KA, Zeilen 8–13 | je 1 Zeile pro Waffe 1–6 |

### 1.2 Waffenkatalog `Waffentab` (`Waffe!M6:IH534`)

Kopfzeile in **Zeile 5**, Einträge ab **Zeile 7**. Die `Waffentab`-Range
beginnt in Spalte **M** (= VLOOKUP-Spalte 1 = Name).

Spaltenbelegung (VLOOKUP-Index = Spalte − M + 1):

| VLOOKUP-Idx | Spalte | Kopf (Zeile 5) | Bedeutung |
|---:|:--:|---|---|
| 1 | M | Name | Waffenname (Einträge mit 5 führenden Leerzeichen) |
| 2 | N | TWAttrib | Trefferwurf-/Schaden-Attribut-Code: `1`=ST, `2`=ST(Nahk. Finesse-fähig), `3`=GE (Fernkampf) – steuert `Waffe1Art`/`Waffe1TWBon` |
| 3 | O | Geworfen | Wurfwaffe: `n`=nein, sonst Zahl (Grundreichweite) → `Waffe1Wurf` |
| 4 | P | Schaden SK | Schadenswürfel Größe **Winzig/sehr klein** |
| 5 | Q | Schaden K | Schaden Größe **Klein** |
| 6 | R | Schaden M | Schaden Größe **Mittel** |
| 7 | S | Schaden G | Schaden Größe **Groß** |
| 8 | T | Schaden R | Schaden Größe **Riesig** |
| 9 | U | Kritischer | Kritbereich/-multiplikator (z. B. `x2`, `19-20/x2`) |
| 10 | V | Grundreichweite | Reichweitenschritt |
| 11 | W | Gewicht | Gewicht (#) → in Traglast `*RGewicht` skaliert |
| 12 | X | Speziell | Spezial-Eigenschaften (Text) |
| 13 | Y | ST-Bonus Multiplikator | Basis-ST-Faktor: `1`=einhändig, `1.5`=zweihändig |
| 14 | Z | Zweihand Art | Codenummer für Handhabungs-Typ |
| 15 | AA | Seite | Quellenseite |
| 16 | AB | Beschreibung | Beschreibungstext |
| 18 | AD | Geübt | `1` wenn von Volk/Klasse beherrscht (für `Waffe1geübt`) |
| 33 | AS | (Schadens-)Typ | Stich/Hieb/Wucht (P/S/B) → `Waffe1Typ` |
| 134 | EP | Natürlicher Angriff | `0`/`1`-Flag → `Waffe1Nat` |

Spalten **AE–AK** (Zeile 5: Grundregeln, Expertenregeln, ABR Magie, ABR Kampf,
Golarion, Rüstkammer, Völker) sind **Quellenbuch-Filterflags** zum Ein-/Ausblenden
von Einträgen je aktivierten Regelwerken.

Links davon (Spalten A–K) liegt die **Filter-/Rangierlogik**, die aus dem
Vollkatalog je nach Beherrschung sortierte Dropdown-Listen erzeugt:

- `Waffenliste` = `Waffe!M6:M534` (alle Namen)
- `Waffrang2liste` = `Waffe!C7:C535`; `RuestRang1Liste`/`RuestRang2Liste` analog
- `geübte_Waffen` = **leere** benannte Liste (Definition ohne Bereich; im
  Workbook nicht mehr verwendet — siehe Ambiguitäten), `ungeübte_Waffen` =
  `Waffe!G7:G534`
- Steuerzellen: `WaffgeübtMax` (D4), `WaffUngeübtMax` (E4),
  `EndeKurzWaffen` (IJ3 = 5+WaffgeübtMax), `EndeLangWaffen` (IJ4)
- `WaffenSpalte` = `Waffe!JG34:JH220`; `WaffeSpalteVolk/Kla1/Kla2/Kla3`
  (JL34:JL37) holen je nach Volk/Klasse die Beherrschungs-Spalte via VLOOKUP

#### Waffenkategorien (Proficiency, Kopfzeilen in Spalte M)

Kategorie-Kopfzeilen (ohne führende Leerzeichen) gliedern den Katalog:

| Zeile | Kategorie |
|---:|---|
| 7 | Einfache Waffenlose (simple) |
| 21 | Einfache Leichte Waffen |
| 40 | Einfache Einhandwaffen |
| 56 | Einfache Zweihandwaffen |
| 71 | Einfache Fernkampfwaffen |
| 84 | Kriegswaffen Leicht (martial) |
| 124 | Kriegswaffen Einhand |
| 155 | Kriegswaffen Zweihand |
| 197 | Kriegswaffen Fernkampf |
| 221 | Exotische Waffen Leicht (exotic) |
| 265 | Exotische Waffen Einhand |
| 297 | Exotische Waffen Zweihand |
| 334 | Exotische Waffen Fernkampf |
| 368 | Feuerwaffen |
| 402 | weitere Klasse |
| 405 | Natürliche Angriffe |
| 463 | Magische Fähigkeiten |
| 476 | Belagerungsgeräte |
| 504 | Eigene Waffen (custom) |

**Waffenzählung:** In `Waffenliste` (M6:M534) sind **412** nicht-leere
Einträge; davon sind **19 Kategorie-Kopfzeilen** → ca. **393 Waffen + Spezial-
einträge** (inkl. natürlicher Angriffe, magischer Fähigkeiten,
Belagerungsgeräte und benutzerdefinierter Einträge). Die Größenkategorie der
gespielten Figur wählt automatisch die Schadensspalte (P–T).

`Eigene_Waffen` (= `Eigene!BE8`) verweist auf den Custom-Bereich des sichtbaren
`Eigene`-Sheets; diese fließen in den "Eigene Waffen"-Block (ab Zeile 504) ein.

### 1.3 Per-Charakter-Rechenblöcke Waffe 1–6

**Eingaben** stehen auf dem sichtbaren `Bogen`-Sheet:

| Name | Zelle | Inhalt |
|---|---|---|
| `Waffe1`…`Waffe6` | Bogen A140, A153, A166, A179, A192, A205 | gewählter Waffenname (13 Zeilen Abstand pro Block) |
| `Waffe1ZW`…`Waffe6ZW` | Bogen AS140, AS153, … | Handhabung (Einzelwaffe / Haupthand / Zweithand / Zweiter Angriff / Einziger Angriff …) |
| `Waffe1Plus` | Bogen CE145 = `SUM(A149:V151)` | manuelle/magische Trefferboni des Blocks |

Die eigentliche Rechnung liegt auf `Waffe` in den Zeilen 8–13
(Zeile 8 = Waffe 1, …, Zeile 13 = Waffe 6). Zentrale Spalten je Zeile *r*:

| Spalte | Name (Bsp. Z.8) | Formel / Bedeutung |
|---|---|---|
| IX | `Waffe1ZW`-Auflösung | `=IF(Waffe1ZW="","Einzelwaffe",Waffe1ZW)` |
| IY | `Waffe1Einzel` | `1` wenn Einzelwaffe |
| JA | TWK-Bonus 2-Waffen | Bonus aus „Kampf mit zwei Waffen"-Talent (`ZWTalent`) / Schlangenläufer |
| JB | Haupthand-Malus | Haupthand: −6, „Haupthand (+Leichte)"/Erster Angriff: −4 |
| JC | Zweithand-Malus | Zweithand: −10 (bzw. −8 mit leichter Off-Hand / Zweiter Angriff) |
| JD | `Waffe1ZWMod` | `=SUM(JA:JC)` — Summe der Kampf-mit-2-Waffen-Modifikatoren |
| JE | Plus-Summe | `=Waffe1Plus + VLOOKUP(IX8,ZWmodifitap,3,FALSE)` |
| JF | `gab1vorn` | **1. Angriff:** `=_GAB1 + JE8 + BuffTWAllg + IF(Art=3, BuffTWFK, BuffTWNK)` |
| JG/JH/JI | weitere Iterationen | `_GAB2`/`_GAB3`/`_GAB4` (jeweils −5) als „/x"-String angehängt |
| JJ | `GABWaffe1` | `=CONCATENATE(JF,JG,JH,JI)` → Anzeige-String z. B. `+12/+7/+2` |
| JK | `Waffe1Art` | `=VLOOKUP(Waffe1,Waffentab,2)` (TWAttrib 1/2/3) |
| JL | `Waffe1TWBon` | Treffer-Attributsmod (s. u.) |
| JM | `Waffe1Wurf` | `=VLOOKUP(…,Waffentab,3)` (Wurfreichweite) |
| JN | Basis-ST-Faktor | `=VLOOKUP(Waffe1,Waffentab,13)` (Spalte Y: 1 oder 1.5) |
| JO | wirksamer ST-Faktor | `=IF(OR(Einzelwaffe, $JR$2=1), JN8, VLOOKUP(IX8,ZWmodifitap,2))` |
| JP | `Waffe1STBon` | `=ROUNDDOWN(STmod * JO8, 0)` — ST-Schadensbonus |
| JQ | `Waffe1Dam` | Schadenswürfel: `=VLOOKUP(Waffe1,Waffentab,4+GroeKatNr)` (Größenspalte) |
| JS | `Waffe1geübt` | `=IF(OR(VLOOKUP(…,Waffentab,18)=1, Bogen!BQ140="x"),1,0)` |

#### Trefferwurf (GAB / to-hit)

Aufbau des Angriffsbonus der *ersten* Iteration (`gab1vorn`, JF):

```
Angriff = _GAB1 + Waffe1Plus + ZWmod(Handhabung) + ZWMod(JD: 2-Waffen-Malus über JE)
          + BuffTWAllg + (Fernkampf ? BuffTWFK : BuffTWNK)
```

- `_GAB1`…`_GAB4` (Klasse!C8:F8): Grund-GAB und die −5-Iterationen
  (`_GAB2=IF(_GAB1>5,_GAB1-5,0)` usw.) → mehrere Angriffe pro Runde.
- **Attributsmod** steckt in `_GAB1` (vom Kern-Sheet), nicht in JF; der
  waffenspezifische Attributsmod `Waffe1TWBon` (JL) wird für die
  **Bogen**-Anzeige verwendet (Trefferwurf-Attribut Str/Dex):
  `=IF(Art=1, STmod, IF(Art=3, GEmod, IF(Finesse=0, STmod, MAX(STmod, GEmod+SchildMal))))`
  — also ST bei Nahkampf, GE bei Fernkampf, bei Waffenfinesse das Maximum aus
  ST und (GE + Schildmalus).
- Buffs: `BuffTWAllg` (Tools!AT45), `BuffTWNK`/`BuffTWFK` (Nah-/Fernkampf,
  Tools!AU45/AV45) sind aktive Buff-Summen (SUMIF über aktivierte Buffs).
- Größe & Verbesserung (enhancement) fließen über `_GAB1` bzw. `Waffe1Plus` ein.
- **Handhabungstabelle `ZWmodifitap`** (`Waffe!JQ17:JT26`) — Spalte 2 = ST-Faktor,
  Spalte 3 = GAB-Mod:

  | Handhabung | ST-Faktor | GAB-Mod |
  |---|---:|---:|
  | Einzelwaffe / Haupthandwaffe / Erster Angriff | 1.0 | 0 |
  | Zweiter Angriff / Zweithandwaffe | 0.5 | 0 |
  | **Einziger Angriff (zweihändig)** | **1.5** | 0 |
  | Einzige Angriffsart / Primärangriff | 1.0 | 0 |
  | Sekundärangriff (natürlich) | 0.5 | −5 |

#### Schaden (damage)

Anzeige auf Bogen W145:
`=CONCATENATE(Waffe1Dam, "+", SUM(AE149:AR149) + BuffW1SW)`

```
Schaden = Würfel(Waffe1Dam, größenabhängig)  +  Waffe1STBon  +  Größenbonus
          +  BuffW1SW (Schadens-Buffs)
```

- `Waffe1Dam` (JQ): Würfelausdruck der korrekten **Größenkategorie** über
  `4 + GroeKatNr` (GroeKatNr aus `Volk!N7`); P=winzig … T=riesig.
- `Waffe1STBon` (JP) = `ROUNDDOWN(STmod * JO8, 0)`. **JO8** liefert den
  wirksamen ST-Faktor: 1.0 einhändig, **1.5 bei zweihändigem Einsatz**
  („Einziger Angriff"), 0.5 in der Off-Hand. Damit ist die klassische
  Pathfinder-Regel ST×1.5 für Zweihandwaffen abgebildet.
- Größenbonus (Bogen A149 = `Groemod`) wird in der Anzeigesumme addiert.
- `BuffW1SW` (`Waffe!JA24`) = `BuffSWAllg + (Art=3 ? BuffSWFK : BuffSWNK)`
  (Schadens-Buffs allgemein / Fern- / Nahkampf).
- Wurf-Hinweis Bogen W149: zeigt „Wurf: ±x" wenn `Waffe1Wurf ≠ "n"`.

#### Sonderfälle

- **`Waffe1Nat`** (Bogen CE147) = `1` wenn Waffentab-Spalte 134 (EP) ≠ 0 → die
  Waffe ist ein **natürlicher Angriff** (nutzt Primär/Sekundär-Handhabung statt
  Zweihand).
- **Schlaghagel/Mönch:** Sonderpfad. `GABWaffe1`/`Waffe1Dam` schalten bei
  `Waffe1="     Schlaghagel"` auf `SH_Gab1` (Waffe!KF86) bzw. `SH_Dam`
  (Waffe!JV56), die aus `MönchTab` (JU64:KG83, Schaden je Mönchstufe via
  `Groemod`) gelesen werden. `istMönch` (Waffe!JX59) erkennt Mönchsstufen.
- **`Waffe1ZWMod`** (JD) bündelt die −6/−4/−10/−8-Mali des Kampfes mit zwei
  Waffen samt Talent-Reduktion (`ZWTalent`, `ZWTalentVerb`, `ZWTalentMächtig`).

---

## 2. Rüstungen & Schilde

### 2.1 Rüstungskatalog `Ruesttab` (`Waffe!M547:HY655`)

Kopfzeile **Zeile 545**, Einträge ab **Zeile 548**. Range startet Spalte **M**.

| VLOOKUP-Idx | Spalte | Kopf | Bedeutung |
|---:|:--:|---|---|
| 1 | M | Name | Rüstungsname |
| 2 | N | Art | Kategorie: `Leicht` / `Mittel` / `Schwer` (Kopfzeilen) bzw. Material |
| 3 | O | Bonus | **Rüstungs-AC-Bonus** (`Ruestung1` = VLOOKUP …,3) |
| 4 | P | Max GE-Bon | **maximaler GE-Bonus** (max Dex; `99` = unbegrenzt) |
| 5 | Q | Malus | **Rüstungsmalus** (armor check penalty, negativ) |
| 6 | R | Patzer% | **arkane Zauberpatzerchance** (z. B. `0.15` = 15 %) |
| 7 | S | Gewicht | Gewicht (#) |
| 8 | T | Seite | Quellenseite |

Kategorie-Kopfzeilen (Spalte M): Zeile 547 „Leichte Rüstungen", 571
„Mittelschwere Rüstungen", 593 „Schwere Rüstungen", 616 „Material" (Material-
Modifikatoren), 645 „Eigene Rüstungen". **Rüstungseinträge (eingerückt): 63.**

> **Keine eigene Geschwindigkeits-Spalte** im Katalog. Die Bewegungsreduktion
> durch Rüstung wird separat auf `Volk` berechnet: `BewegungRüstung` (Volk!O16)
> und `FelderRüstung` (Volk!O17 = O16×0.666).

### 2.2 Schildkatalog `Schildtab` (`Waffe!M666:HY697`)

Kopfzeile **Zeile 664**, Einträge ab **Zeile 667**. Gleiche Spaltenstruktur
wie Rüstungen (M=Name, N=Art, O=Bonus, P=Max GE, Q=Malus, R=Patzer%, S=Gewicht).
Art-Werte: `Leicht`, `Schwer`, `Arm` (Tartsche), `Turm` (Turmschild, Bonus 4 /
Malus −10 / MaxGE 2). Kategorie „Schilde" (Zeile 666), „Eigene Schilde"
(Zeile 687). **Schildeinträge (eingerückt): 16.**

### 2.3 Per-Charakter-Block (Bogen, Zeilen 249–280)

Drei Rüstungs-Slots + ein Schild-Slot, summiert in Zeile 279:

| Eingabe | Slot | Lookups |
|---|---|---|
| `Bogen!A249` | Rüstung 1 | `AI249`=Art (Ruesttab Sp.2), `Ruestung1`=AS249 (Bonus, Sp.3) |
| `Bogen!A254` | Rüstung 2 | `Ruestung2`=AS254 |
| `Bogen!A259` | Rüstung 3 | `Ruestung3`=AS259 |
| `Bogen!K274` | Schild | `Schildbon`=AW279, `SchildMal`=AZ274 (`VLOOKUP(K274,Schildtab,5)`) |

Aggregat-Werte (Bogen Zeile 279):

- `RueBon` (AS279) = `SUM(AS249:AY273)` — Summe der AC-Boni aller Rüstungs-Slots.
- `Schildbon` (AW279) = Schild-AC-Bonus (`AS274`).
- `RueMal` (AZ279) = `RKMalusKorrigiert + SchildMal` — Gesamt-Rüstungsmalus
  (`RKMalusKorrigiert` = `Waffe!KM28` = `MIN(KM24:KM27, 0)`, kombiniert die
  Mali der getragenen Rüstungen, gedeckelt auf ≤0).
- `maxgemod` (BU279) = wirksamer **Max-GE-Bonus** = `maxGEMaluskorrigiert`
  (`Waffe!KP28`) — Minimum der MaxGE-Werte der getragenen Rüstung/Schild.
- `Magierüst` (Bogen CB280): zählt nur Slots mit Art „magie" für den
  Rüstungs-AC, der auch bei Berührungsangriffen zählt.
- Gewicht je Slot fließt in `Belastung` ein über `SUM(BN249:BT274)`.

**Custom:** `Eigene_Rüstungen` (Eigene!BD44) und `Eigene_Schilde` (Eigene!BD58)
auf dem sichtbaren `Eigene`-Sheet speisen die „Eigene"-Kategorien der Kataloge.

`Rüstungswahl` und `Schildwahl` sind als benannte Bereiche **ohne Definition**
vorhanden (leer) — die tatsächliche Auswahl läuft über Datenvalidierung der
Eingabezellen (A249/A254/A259/K274).

---

## 3. Ausrüstung (Sheet `Ausrüstung`, 2615×22)

Zwei Teile auf demselben Sheet:

### 3.1 Stamm-Katalog `ARTab` (`Ausrüstung!A3:J2615`)

Master-Liste aller käuflichen Gegenstände, Kopfzeile **Zeile 2**:

| Spalte | Kopf | Bedeutung |
|---|---|---|
| A | Nr. | laufende Nr. |
| B | Art | Oberkategorie (z. B. „Ausrüstung") |
| C | Liste | Unterkategorie (z. B. „Alch. Hilfmittel") |
| D | Besitz | Besitz-Flag (`SUM(D:D)` → R1 = Summe Besitzgewicht) |
| E | Gegenstand | Name (führender `.`) |
| F | Preis | Preis (GM) |
| G | Gewicht # | Stückgewicht |
| H | Regelwerk | Quelle |
| I | ZS / J | Zusatz / Beschreibung |
| N/O | Rang/RangNr | Rangierhilfe (`ARRangListe` N3:O2615) |

### 3.2 Getragenes Inventar `ARTab2` (`Ausrüstung!Q3:T52`) + Q1/P1/T2

Der tatsächlich getragene/ausgewählte Bestand sitzt im Kopfbereich
(Spalten O–V, **max. 50 Zeilen**, Z. 3–52):

- **Auswahl** je Zeile in Spalte `P` (Index `$P3` in den Katalog). Frei: Q1 =
  `50-COUNTIF(Q3:Q52,".")`.
- `U3` = `VLOOKUP($P3, ARTab, 4, FALSE)` → **Anzahl**.
- `V3` = `VLOOKUP($P3, ARTab, 7, FALSE)` → **Gewicht/Stück** (Katalog-Sp. G).
- `T3` = `IF($P3="", ".", U3*V3)` → **Zeilengewicht = Anzahl × Stückgewicht**.

**Gesamtgewicht Ausrüstung:**
`ARGewicht` (`Ausrüstung!T2`) = `ROUND(SUM(T3:T52), 1)`.

### 3.3 Gesamtlast & Tragkraft

`Belastung` (`Bogen!AP425`) = die **Gesamttraglast** der Figur:
```
Belastung = SUM(AK292:AO424)  +  SUM(BN249:BT274)
```
— d. h. Gewicht aller Ausrüstungs-/Waffenzeilen **plus** das Gewicht der
getragenen Rüstungen/Schilde (Block 249–274). `ARGewicht` ist eine der
Komponenten, die in den AK292:AO424-Bereich einfließen. Waffengewicht wird je
Zeile als `Anzahl × VLOOKUP(Waffe, Waffentab, 11) × RGewicht` berechnet
(Bsp. Bogen AK422), wobei `RGewicht` (Volk!N8) und `Gewichtmod` (Volk!N4) die
größenabhängige Skalierung liefern.

**Belastungs-Schwellen** (auf `Listen`, je STtmp aus `Attributtab`,
× `Gewichtmod`):

| Name | Zelle | Formel |
|---|---|---|
| `Leichte` (leichte Last) | Listen!IV8 | `TRUNC(VLOOKUP(IV7, Attributtab, 13) * Gewichtmod, 0)` |
| `Mittlere` (mittlere Last) | Listen!IV9 | `… Attributtab, 14 …` |
| `schwere` (schwere Last) | Listen!IV10 | `… Attributtab, 15 …` |

Anzeige auf Bogen (Zeilen 429–444): „Leichte / Mittlere / Schwere Last", dazu
Heben/Schieben (Spalte K/AF: 100#/200#/500# usw.) und `TrageST` (U444,
„Extra ST für Tragkraft" – manuelle Eingabe). `Mönchlast` (Fertig!BX22) prüft
`Belastung > Leichte` (Mönch verliert Boni bei mehr als leichter Last).

> **Ambiguität:** Eine explizit benannte Konstante für „Überladen" fehlt; der
> Vergleich Belastung↔Schwelle wird in der UI/Anzeige (Bogen 429–444) und in
> `Mönchlast` durchgeführt, nicht in einer einzelnen benannten Zelle.

---

## 4. Einkauf (Sheet `Einkauf`, winzig, 17×47)

Reine **Freitext-/Notiz-Tabelle** für Gruppen-Einkäufe und Item-Wünsche —
**keine Formeln, kein Goldbestand**. Spalten: A = Charaktername (Anneli, Markus,
Kai, David, Sonja …), B = „Plus" (gewünschte/erworbene Items), C = Dauer/Anzahl,
D = „Minus" (abgegebene Items). Beispiele: „Gürtel ST+4", „Alchemistenfeuer 2",
„Sprachenhelm". Goldverwaltung läuft **nicht** hier, sondern im „GELD"-Block des
`Bogen`-Sheets (ab Bogen A447).

---

## 5. Offene Punkte / Ambiguitäten

1. **`geübte_Waffen`** ist als benannter Bereich definiert, aber **ohne
   Zellbereich** (leer) — vermutlich Altlast; aktive Beherrschungs-Logik läuft
   über `WaffenSpalte`/`Waffe1geübt` (Sp. AD/18). `Rüstungswahl`, `Schildwahl`,
   `WaffenWahl` ebenfalls leer (Auswahl per Datenvalidierung).
2. **`WaffenTab1`** (`Waffe!JV17:KA29`) ist eine kleine Hilfstabelle im
   Rechenbereich (Iterations-/Anzeige-Flags JU–KA), **nicht** der Hauptkatalog.
3. **Größenkategorie-Codes:** `GroeKatNr` (Volk!N7, via `groetab`) liefert den
   Offset `4+GroeKatNr` in P–T. Die exakte Zuordnung Zahl→Größe sollte mit dem
   Volk/Größen-Doc (`groetab` = Volk!A61:G69) gegengeprüft werden.
4. **Schadenstyp-Spalte** ist VLOOKUP-Index 33 (= Spalte AS), nicht in der
   Kopfzeile-5-Beschriftung sichtbar (dort steht in AS „Typ" implizit über die
   Datenwerte Stich/Hieb/Wucht).
5. **Mönch/Schlaghagel** und natürliche Angriffe nutzen abweichende Pfade
   (`MönchTab`, `SH_*`, `Waffe1Nat`) — bei der Reimplementierung als
   Sonderfälle behandeln.
6. Die `Listen`-Kopien (`ListeWaffen`/`ListeRuest`/`ListeSchild`) sind
   gefilterte Ansichten; die **Wahrheit** liegt in `Waffentab`/`Ruesttab`/
   `Schildtab` auf `Waffe`.
