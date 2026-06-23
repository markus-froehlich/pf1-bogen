# 03 – Zauber & Kräfte (Spells and Class Abilities)

Documents the spell engine and class-feature engine of the *Bogen 6.61 Spieler*
workbook for a faithful web-app reimplementation. All cell/range citations use
the extracted CSV/TSV/JSON in `extraction/`. Sheet names with spaces map to
underscores in `sheets_values/` filenames; column letters are A=1, B=2, …

> **Two big ideas up front**
> 1. There is exactly **one master record table** for every textual game object
>    (spells, class features, poisons, titles, weapons, racial traits, templates).
>    It lives in `ZauberListen!BB:BF` (named range **`ZaBesch`**, rows 1–13285).
>    A `BA`-column tag classifies each row (`Spruch`, `BesFähig`, `Tal-WZ`,
>    `Titel`, `Volk`, `Gift`, `Fehler`, `Schablone`, `Waffe`).
> 2. Selectable lists (a class's spell list, a class's feature picks) are produced
>    by **VLOOKUP into paired/indexed columns**, keyed by a per-character "list
>    index" computed on the `Klasse` sheet. The chosen entry's full text is then
>    fetched from the master `ZaBesch` table.

---

## 1. ZauberListen — the spell database (hidden, 13739×211; values 13291×209)

The sheet has **two logically separate regions** side by side:

### 1a. Class spell-list region — columns A … AY (`ZaListe`, `$A$1:$AY$1212`)

Layout = **paired columns**, one pair per class spell list. Row 1 holds a running
index per pair (1,2,3,…); **Row 2 holds the class-list label**; rows 3+ hold the
data. Column `A` is a sequential row number (`Nr`) used as the VLOOKUP key.

For list pair *k* (0-based): the **spell-level (Grad) number** is in column `2k+1`
(B, D, F, …) and the **spell name** is in column `2k+2` (C, E, G, …).

Row-2 labels and their pair index (cited from `ZauberListen.csv` row 2):

| idx | level col | name col | Row-2 label (class list)            |
|----:|-----------|----------|-------------------------------------|
| 0   | B         | C        | Bardenzauber (Bard)                 |
| 1   | D         | E        | Druidenzauber (Druid)               |
| 2   | F         | G        | Hexenmeister-und Magierzauber (Sorc/Wiz) |
| 3   | H         | I        | Klerikerzauber (Cleric)             |
| 4   | J         | K        | Paladinzauber (Paladin)             |
| 5   | L         | M        | Waldläuferzauber (Ranger)           |
| 6   | N         | O        | Alchemistenformeln (Alchemist)      |
| 7   | P         | Q        | Hexenzauber (Witch)                 |
| 8   | R         | S        | Inquisitorzauber (Inquisitor)       |
| 9   | T         | U        | Paktmagierzauber (Pact/Magus list)  |
| 10  | V         | W        | Liste 1 (custom slot 1)             |
| 11  | X         | Y        | Liste 2 (custom slot 2)             |
| 12  | Z         | AA       | Adept                               |
| 13  | AB        | AC       | Kampfmagier (Magus)                 |
| 14  | AD        | AE       | Antipaladin                         |
| 15  | AF        | AG       | Arkanist (Arcanist)                 |
| 16  | AH        | AI       | Blutwüter (Bloodrager)              |
| 17  | AJ/AK     | AK       | Ermittler (Investigator)            |
| 18  | AM        | AM       | Jäger (Hunter)                      |
| 19  | AO        | AO       | Kriegspriester (Warpriest)          |
| 20  | AQ        | AQ       | Mystiker (Oracle/Mystic)            |
| 21  | AS        | AS       | Schamane (Shaman)                   |
| —   | AU        | AU       | Skalde (Skald)                      |
| —   | AW        | AW       | Legendär (legendary/mythic)         |

(The exact level/name column for the high-index lists drifts by one in a few
places due to merged spacer columns — **verify pair offsets per list against
row 2 before relying on them**; the safe rule is "read row 2 labels and take the
adjacent number+name columns".)

Each cell value is the **German spell name** (e.g. `Aufblitzen`, `Ausbessern`).
The level/number cell is the spell's **Grad (circle)** in *that* list — the same
spell appears in many lists at possibly different circles. Lists are sorted
**alphabetically by spell name within each circle**, then by circle.

Counts: `ZaListe` spans 1212 data rows (max spells in the longest list).

### 1b. Master detail table — `ZaBesch` = `ZauberListen!$BB$1:$BF$13285`

This is the canonical record for *every* text object. Columns (row 2 headers):

| col | idx | header                | meaning                                      |
|-----|-----|-----------------------|----------------------------------------------|
| BA  | 52  | (tag)                 | **entity type** — see counts below           |
| BB  | 53  | (name)                | **name** (the VLOOKUP key)                    |
| BC  | 54  | `Ex`                  | source/expansion flag (always `1` for spells)|
| BD  | 55  | `Ort`                 | **source ref** = bookletter + page, e.g. `M205`, `G241`, `E202` |
| BE  | 56  | `Art`                 | **school abbreviation** (Schule) + descriptor|
| BF  | 57  | `Beschreibung`        | **packed description string**                 |

`BA`-tag value counts (from `BB`-non-empty rows, total 13209):

| tag         | count | meaning                                   |
|-------------|------:|-------------------------------------------|
| `BesFähig`  | 6026  | class features / special abilities        |
| `Tal-WZ`    | 3633  | feats / weapon-special (Talente)          |
| `Spruch`    | 2236  | **spells** (2234 unique names)            |
| `Titel`     | 919   | section/group titles (e.g. `-- Hexereien --`) |
| `Volk`      | 126   | racial traits                             |
| `Gift`      | 80    | poisons                                   |
| `Fehler`    | 59    | error/placeholder rows                    |
| `Schablone` | 25    | templates (Schablonen)                    |
| `Waffe`     | 6     | weapon entries                            |

So **there are 2236 spell rows (≈2234 unique spells)** in the master table; the
class-list region in §1a references them by name.

**School codes (`BE` / Art) for spells** (German abbreviations):
`Be`=Bannung, `Be`schwörung? — observed set: `Ba` Bannung, `Be` Beschwörung,
`Er` Erkenntniszauber, `Hv` Hervorrufung, `Il` Illusion, `Ne` Nekromantie,
`Vw` Verwandlung, `Vz` Verzauberung, `All` allgemein/universal, plus a
sub-descriptor appended for descriptors/elements (`Hv Fe`=Feuer, `Hv Lu`=Luft,
`Be Er`=Erde, `Vw Wa`=Wasser, `Vz Ho`, `Be A`=Akustik, etc.). ~49 spell rows
have an empty Art. Casing is inconsistent (`HV`, `NE`, `BA` appear) — normalize
case on import.

**Packed description format (`BF`)** — single string with inline delimiters
(legend stored in `ZauberListen!BF2` and `Zauberbuch!P1`/`BW74`):
`=` Zeitaufwand (casting time) · `~` Komponenten (components) ·
`>` Reichweite (range) · `"` Bereich (area) · `*` Ziel (target) ·
`#` Dauer (duration) · `R` Rettungswurf (saving throw).
Example (`Abscheu`, Vz, M205):
`Ziel meidet 1 andere Kreatur =A ~vgm >7,5m+1,5m/2St *1 Kreatur #1 Tier RW`
→ casting `=A` (1 action), components `~vgm` (V/G/M), range `>7,5m+1,5m/2St`,
target `*1 Kreatur`, duration `#1 Tier...`, save `R...`. **There is no spell
resistance (Zauberresistenz) field of its own** — it is encoded inline if at all.
A web app must **parse this string** to expose structured fields; the token
abbreviations are expanded via **`AbkListe`** (`ZauberListen!$CY$44:$CZ$134`,
e.g. `na = 7,5m+1,5m/2St`, `ü = Berührung`, `r9 = Rad9m`).

### 1c. Per-class availability flags — columns BI … BU (60–72)

Adjacent to the master table, row 2 labels columns **BI=Alchemist, BJ=AntiPal,
BK=Barde, BL=Druide, BM=Hexe, BN=Hxm Magier, BO=Inquisitor, BP=Kampfmagier,
BQ=Kle, BR=Paladin, BS=Paktmagier, BT=Waldläufer, BU=Mystiker**. For a given
spell row these hold the circle/availability per class (the source from which the
§1a alphabetical lists are generated).

### 1d. How a character's spell list is produced (the lookup chain)

1. `Klasse!AY{(KlasseNr*20)+1}` stores each class's **list index** into `ZaListe`.
   Resolved per character into named ranges **`Kl1Mag`** (`Klasse!B15`
   = `INDIRECT("ay"&(Klasse1Nr*20)+1)`), `Kl2Mag` (`B16`), `Kl3Mag` (`B17`).
   (Klasse1Nr/2/3 come from `Bogen!EJ3` etc. via `Klatab`.)
2. The **Auswahl** sheet builds the per-class selectable list. For class 1
   (`ZaKla1Liste` = `Auswahl!$F$22:$I$1232`):
   - `G23 =VLOOKUP($A23, ZaListe, Kl1Mag*2,   FALSE)` → spell **Grad** (level)
   - `H23 =VLOOKUP($A23, ZaListe, Kl1Mag*2+1, FALSE)` → spell **name**
   - `I23 =CONCATENATE(... VLOOKUP(H23, ZaBesch, 4, FALSE) ..., VLOOKUP(H23, ZaBesch, 5, FALSE))`
     → school (col 4 of ZaBesch = `BE`/Art) prefix + description (col 5 = `BF`).
     The school prefix is only shown for index 7 (Sorc/Wiz) and Arkanist.
   - `F23` gates the row by max castable circle (`Kla1MagMax` = `MIN(D15:E15)`)
     and "known/selected" flags `B/C/D`.
   Classes 2 and 3 mirror this in `ZaKla2Liste` (`N22:Q1232`) and
   `ZaKla3Liste` (`V22:Y1232`); `SpruchListeCharakter` = `Auswahl!G22`.
3. **`Zauberliste`** (`ZauberListen!$BB$3:$BB$3904`) and **`Spruchlisten`**
   (`Listen!$CI$11:$CI$25`, the list of class-list NAMES for dropdowns) are
   helper indexes. **`ZlBa`** (`ZauberListen!$B$1:$C$587`, Bard pair) and
   **`ZLHeMa`** (`ZauberListen!$F$1:$G$1310`, Sorc/Wiz pair) are pre-sliced
   convenience ranges for those two big lists.
4. **`VolkZauberListe`** (`ZauberListen!$BW$98:$BW$196`) = racial spell-like
   abilities list; **`BonusZauberListe`** (`Auswahl!$AA$21:$AD$57`) = bonus /
   domain / bloodline spells, prepended ahead of the class lists in the spellbook.

### 1e. Per-circle slot named ranges (`zark0..9`, `zgo0..9`, `zarkrw0..9`)

These are **single cells on the `Klasse` sheet**, one per spell circle 0–9
(rows 7–16). Two families: **arcane** (columns X/Y/Z) and **divine** (AQ/AR/AS):

| family | known/per-day (`zark`/`zgo`) | bonus (`...bk`) | save DC (`...rw`) |
|--------|------------------------------|-----------------|-------------------|
| arcane | `zark0..9` = `Klasse!X7:X16`  | `zarkbk0..9` = `Y7:Y16` | `zarkrw0..9` = `Z7:Z16` |
| divine | `zgo0..9`  = `Klasse!AQ7:AQ16` | `zgobk0..9` = `AR7:AR16` | `zgorw0..9` = `AS7:AS16` |

Index `n` (0–9) = spell circle. The cells are display strings, not raw numbers:
e.g. `X7 =IF(AnzArkKlassen<2, IF(SUM(L7:N7)=99,"∞",SUM(L7:N7)), CONCATENATE(... "-" ...))`.
The single-class case sums the per-class sub-columns; for multiclass casters it
concatenates up to three values `a-b-c`. `99` renders as `∞` (unlimited, e.g.
cantrips/orisons at-will). The `rw` family (Z / AS) is the **save DC per circle**;
the `bk` family (Y / AR) is **bonus spells from high ability score**. Reimplement
these as computed values, not strings, then format for display.

---

## 2. Zauberbuch — spellbook / prepared-spells page (1605×22; values 1500×16)

A printable list of the character's actually-chosen spells. Header rows 1–10
(merged title block), data from **row 11 down**. Per data row (cited from row 11):

- `A` = sequential index 1..N.
- `C` (Stufe/level), `E` (Spruch/name), `D` (Ort/source), `P` (Beschreibung) are
  all driven by the same cascade of VLOOKUPs across four sources, selected by
  where the row index `A` falls in cumulative counts:
  ```
  E11 = IF(A11<BonusMagAnzahl+1,  VLOOKUP(A11,BonusZauberListe,2),
        IF(A11<Kla1MagAnzahl+1,   VLOOKUP(A11,ZaKla1Liste,3),
        IF(A11<Kla2MagAnzahl+1,   VLOOKUP(A11,ZaKla2Liste,3),
        IF(A11<Kla3MagAnzahl+1,   VLOOKUP(A11,ZaKla3Liste,3), 0))))
  C11 → col 2/3 of those lists (level)        P11 → col 4 (packed description)
  D11 = IF(...,"",VLOOKUP(E11, ZaBesch, 3, FALSE))   (source Ort, col 3 of ZaBesch)
  B11 = IF(E11=0,0,1)  → "row is filled" flag
  ```
  So the spellbook = **Bonus list + class-1 list + class-2 list + class-3 list**
  concatenated, where each segment length is `BonusMagAnzahl`, `Kla1MagAnzahl`
  (`=MAX(Auswahl!F22:F1232)`), `Kla2MagAnzahl`, `Kla3MagAnzahl`. `BonusMagAnzahl`
  = `Auswahl!C4` = `+U18`.

- **Slots-per-day display** is in the header block (rows 6–9):
  - `C5` = caster-class summary string (`Kl.1: <Klasse> <Lev>, Kl.2: …`).
  - `E7 = Kla1Sprueche`, `E8 = Kla2Sprueche`, `E9 = Kla3Sprueche`. Each
    `KlaNSprueche` = `Klasse!BI17/BJ17/BK17` = the **concatenation of that class's
    per-circle slot counts** `BI7&BI8&…&BI16` (circles 0–9). I.e. the slots-per-day
    string is assembled from the same `Klasse` rows 7–16 that back `zark/zgo`.
  - Columns `F:O` in row 6 are the circle headers `0..9`.
  - `C7..C9` = concentration check helper (`"1: W20+" & Kla1KonW & "+" & Konzmod`),
    `Konzmod` = `Bogen!ES319`.

Spells are *chosen* upstream on the **Auswahl** sheet (the B/C/D flag columns
that `F` gates on), not on Zauberbuch itself; Zauberbuch only renders the chosen
set. There is no per-row prepared/known toggle on this sheet.

---

## 3. Kräfte — per-character class-abilities page (653×84)

The page where the user **picks** class features. Header rows 1–3; data from
row 4. Three resolved columns + one pick column per feature slot:

- `A{n}` = **resolved feature name**, pulled straight from the feature DB:
  `A4 = +Kräftelisten!G21`, `A5 = +Kräftelisten!G22`, … (the `G` "Liste" column
  of `Kräftelisten`, see §4). So `Kräfte!A4:A122` (named **`Kraftliste`**) is the
  *output* list of the character's features in display order.
- `B{n}` = **Ort** (source ref) and `C{n}` = **Beschreibung**, both resolved by:
  ```
  B4 = IF(A4="","", IF(LEFT(A4,1)=".", VLOOKUP(A4,ARTab2,2), VLOOKUP(A4,ZaBesch,3)))
  C4 = IF(A4="","", IF(LEFT(A4,1)=".", VLOOKUP(A4,ARTab2,3), VLOOKUP(A4,ZaBesch,5)))
  ```
  **This is the key resolution rule:** a feature name whose first char is `.`
  is an equipment/special token resolved against **`ARTab2`** (`Ausrüstung!$Q$3:$T$52`);
  everything else is resolved against the **master `ZaBesch`** table — i.e. class
  features (`BA="BesFähig"`), poisons (`BA="Gift"`), racial traits (`BA="Volk"`),
  templates (`BA="Schablone"`) all share the same description table as spells.
  Col 3 of `ZaBesch` = `Ort`, col 5 = `Beschreibung` (same packed format as §1b).
- `G{n}` = `IF(A{n}="",0,1)` filled-flag.
- `F{n}` = validity/error flag for the user's pick (e.g.
  `F4 = IF(D4="",0, IF(ISERROR(VLOOKUP(D4, INDIRECT($E$6&$E$7&":"&$E$6&$E$7+$E$8),1,FALSE)),1,0)) + Stunk_Schule1_1`)
  — checks the pick is within the allowed dynamic range (see §4).

**User pick dropdowns** (from `validations.json`, sheet `Kräfte`):

| dropdown range | validation source (named range) | purpose |
|----------------|----------------------------------|---------|
| `D4:D15`       | `kräftewahl1`   | class-1 feature picks |
| `D17:D27`      | `kräftewahl2`   | class-2 feature picks |
| `D29:D40`      | `kräftewahl3`   | class-3 feature picks |
| `D42:D54`      | `Gifte`         | poisons (`ZauberListen!$BB$12966:$BB$13040`) |
| `D56:D69`      | `Volksauswahl`  | racial choices (`Kräfte!$J$138:$J$163`) |
| `D72`          | `SchabloneListe`| template choice (`Listen!$HC$48:$HC$73`) |
| `D74:D89`      | `Schablonenkräfte` | template-granted abilities |

`K_Auswahl` = `Kräfte!$D$3:$D$40` groups the three feature-pick columns.

The user selects a name in column `D`; that selection (cross-referenced through
the Kräftelisten machinery, §4) ends up as the resolved name in column `A`, whose
`Ort`+`Beschreibung` are then VLOOKUP'd from `ZaBesch`/`ARTab2` as above.

> **AMBIGUITY:** `kräftewahl1`, `kräftewahl2`, `kräftewahl3`, and
> `Schablonenkräfte` exist as named ranges but extract to **empty target lists**
> in `named_ranges.json` — they are **dynamic** names (INDIRECT/OFFSET-based) that
> the extractor could not resolve to a static range. Their members are computed
> at runtime by pointing into the right Kräftelisten sub-column for the current
> class/archetype (see §4 / `E6:E8` builders). To reimplement, derive the dropdown
> options dynamically from the class's KListe1 group descriptor rather than from a
> fixed range.

---

## 4. Kräftelisten — the class-feature database (hidden, 1693×426; values 1590×274)

Feeds the §3 dropdowns and the resolved-name column. Header at row 20; data 21+.

**Left index table** (`KraefteListe` = `$A$21:$C$336`; ranks `KraefteRangListe`
= `$D$17:$E$336`):

| col | header     | meaning                                             |
|-----|------------|-----------------------------------------------------|
| A   | (Nr)       | sequential id                                       |
| B   | `Volk`     | full feature name (often suffixed with class, e.g. `Aufstieg Kämpfer`) |
| C   | `Kurz`     | short label                                         |
| D   | `Rang`     | rank/category label                                 |
| E   | `Rang-Nr`  | numeric rank                                        |
| F   | `Laufende` | running counter                                     |
| G   | `Liste`    | **resolved output name** — this is the column pulled into `Kräfte!A` |
| I   | (group)    | group titles `101 Erzmagier`, `101 Skalde …`, etc.  |
| K   | `Titel Kräfte` | currently-active class title block (`K4` is read by `Kräfte!E6:E8`) |

Config: `maxKraefte` = `Kräftelisten!F19` (=8), `maxKraefteKompakt` = `G19`,
`Kraft` = `$G$21:$G$171` (output-name index).

**Right dynamic-lookup region** drives the dropdowns:
- **`KListe1`** = `Kräftelisten!$M$83:$T$1589`. Each row maps a class/archetype
  **group title** (col `M`, e.g. `101 Barbar`, `101 Barbar Totemkrieger`) to:
  col `N` = target **column letter** (e.g. `M`), col `O` (=col 4) = start row,
  col `P`/`Q` = helper cols, col `R` (=col 6) = count. The Kräfte sheet reads
  `E6=VLOOKUP(Kräftelisten!K4, KListe1, 4)`, `E7=…,5`, `E8=…,6` and then builds an
  `INDIRECT($E$6&$E$7&":"&$E$6&$E$7+$E$8)` range — **this is exactly the dynamic
  range behind `kräftewahl1`** (so the dropdown shows only the features of the
  character's currently-selected class/archetype).
- **`Kliste2`** = `$U$83:$X$427` — a second category index (e.g. domain/subdomain
  groups: `Adel`, `Befreiung`, `Böses`, `Dämonen`…).
- Columns to the far right (M…onward up to col 274/426) hold the per-group
  feature sub-lists themselves, addressed by the column letter from `KListe1!N`.

So **features are grouped per class/archetype as vertical sub-lists**, and a
group-title→(column,row,count) routing table (`KListe1`) lets a single dropdown
re-target itself via INDIRECT. Picks resolve to the `Liste` (`G`) name, then to
`Ort`/`Beschreibung` via `ZaBesch`.

**Templates:** `Schablonenkräfte` (dynamic, §3) draws from this DB filtered by the
chosen template (`Schablone` = `Kräfte!F64`; `SchabloneListe` = `Listen!HC48:HC73`;
`SchablonenTab` = `Listen!HC47:IC73`). `KListe1` col 7 is used in the
template-ability validity check `F74 = IF(VLOOKUP($D$72,KListe1,7,FALSE)>I61,1,0)`.

---

## 5. Sonjas Spruchliste — example custom spell list (hidden, 383×3)

A **hard-coded 3-column example spell list** (no formulas): col A = Grad (circle
0–4), col B = spell name, col C = short description. Rows are sorted by circle
then name (rows 1–8 are circle 0: *Ahnungsloser Verbündeter, Aufblitzen,
Ausbessern, Aussieben, Benommenheit, Botschaft, Funken, Geisterhaftes Geräusch*…;
last rows are circle 4). The contents match the **Bardenzauber** list (circle
0–4 only → a low-level Bard). It is a **demo / personal spell list** ("Sonja's
spell list" — a sample character), not part of the live engine — no named range
references it. Safe to treat as sample data, not a system table.

---

## Open questions / ambiguities to resolve before/with implementation

1. **`BF` packed-description parsing.** Need the full delimiter + abbreviation
   spec to split casting time / components / range / area / target / duration /
   save reliably. `AbkListe` (`ZauberListen!CY44:CZ134`) expands range/target
   tokens; verify it covers component (`~vgm`) and time (`=A`) tokens too.
   **No standalone spell-resistance field exists** — confirm whether SR is in the
   text or simply omitted in this German sheet.
2. **High-index list column offsets** (idx ≥17 in §1a) drift by a column in spots
   due to merged spacers — confirm each pair against row 2 on import.
3. **Dynamic named ranges** `kräftewahl1/2/3` and `Schablonenkräfte` are empty in
   `named_ranges.json`; their membership must be reconstructed from `KListe1`
   routing (`E6:E8` INDIRECT). Same caution for any OFFSET/INDIRECT name.
4. **School-code casing** is inconsistent (`Hv`/`HV`, `Ne`/`NE`, `Ba`/`BA`) and a
   few junk values (`0`, `tt`) appear — normalize/clean on import.
5. The `ZaListe` extract is capped at row 1212 while the master table runs to
   13285; confirm 1212 is the true max class-list length (longest single list).
