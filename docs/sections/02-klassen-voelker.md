# 02 — Content Data Tables: Classes (Klasse) & Races (Volk)

Source workbook: *Bogen 6.61 Spieler* (Pathfinder 1e, German, Ulisses).
Extraction base: `extraction/sheets_values/`, `extraction/sheets_formulas/`,
`extraction/named_ranges.json`. All cell refs are 1-based Excel coordinates.

This section documents the **content databases** for classes and races (not the
per-character calc, which lives in rows 1–17 of `Klasse`). For each, it shows the
storage layout and how the calc sheets look values up.

---

## 1. Classes — `Klasse` sheet (hidden, 2600 × 172)

The `Klasse` sheet contains **two distinct regions**:

| Region | Rows | Purpose |
|---|---|---|
| Per-character calc block | 1 – 17 | Aggregates the active character's 1–3 classes (BAB total, save totals, spell-slot table, concentration, cantrips). |
| **Class progression DATABASE** | 19 – ~1140 | One 20-row block per class (level 1–20 progression). |
| **Master class table `Klatab`** | `BO2:EP162` | Class metadata + per-race favored-class bonus text. |

### 1.1 The progression database (the core mechanic)

Each class occupies **exactly 20 consecutive rows**, one per character level, indexed
by its class number `KlaNr`. The block for `KlaNr=n` spans **Excel rows `n*20+1 … n*20+20`**
(level = row − n*20). Headers are at rows 19–20. Examples:

- Barbar (`KlaNr 1`) → rows 21–40 (label "   Barbar" / "KlaNr: 1" at A21/A22).
- Magier (`KlaNr 7`) → rows 121–140.
- Inquisitor (`KlaNr 14`) → rows 281–300.

The lookup is done with `INDIRECT`, e.g. the active character's first-class BAB:

```
Gab1Kla1  (Klasse!C5) =
  IF(Vertrauter=1, GABMeister,
     IF(GABSchablone=0,
        INDIRECT("c" & (Klasse1Nr*20 - IF(AND(Klasse1Nr=6,Heiliger_Krieger=1),20,0)) + Klasse1Lev),
        GABSchablone))
```
i.e. `column C, row = KlaNr*20 + Level`. (The `-20` shift for `KlaNr=6` swaps the
Kleriker block for a "Heiliger Krieger" variant.) `Gab1Kla2`/`Gab1Kla3` (C6/C7) do the
same for the 2nd/3rd multiclass.

#### Column meaning inside each 20-row block

(Header text at rows 19–20; verified against Kämpfer/Barde/Magier level-20 rows.)

| Col | Header | Meaning |
|---|---|---|
| A | (class name on row1, "KlaNr: n" on row2) | block label only |
| **B** | `Lev` | character level 1–20 |
| **C** | `GAB` / `1` | **BAB, full value** for that level |
| **D** | `2` | 2nd iterative-attack BAB (= C−5 when >5, via `_GAB2`) |
| **E** | `3` | 3rd iterative (C−10) |
| **F** | `4` | 4th iterative (C−15) |
| **G** | `REF` | **Reflex save** base |
| **H** | `WIL` | **Will save** base |
| **I** | `ZÄH` | **Fortitude (Zähigkeit) save** base |

> **Important:** BAB type (full / ¾ / ½) and save type (good / poor) are **not stored
> as a code** — the *final per-level numbers* are pre-baked into columns C and G/H/I.
> Verified at level 20: Kämpfer/Barbar C=20 (full); Barde/Schurke/Kleriker C=15 (¾);
> Magier C=10 (½). Good save tops at 12, poor at 6. A reimplementation can either copy
> these tables verbatim or recompute from the standard PF formulas
> (full=L, ¾=⌊3L/4⌋, ½=⌊L/2⌋; good=2+⌊L/2⌋, poor=⌊L/3⌋).

#### Spell-slot sub-blocks (same 20 rows)

Columns K–AW hold **spells-per-day** progressions, split into three casting "tracks"
(headers row 19: `Arkane` at K, `Göttliche` at U, `Bekannte`/known at AE,
`Domäne-Bonus` at AO). Row 20 labels each column with its spell circle 0–9:

| Block | Cols | Spell circle 0→9 | Role |
|---|---|---|---|
| Arkane Zauber/Tag | **K–T** | K=0 … T=9 | arcane slots/day |
| Göttliche Zauber/Tag | **U–AD** | U=0 … AD=9 | divine slots/day |
| Bekannte (known) | **AE–AN** | AE=0 … AN=9 | spells-known |
| Domänen-Bonus | **AO–AW** | AO=1 … AW=9 | bonus domain slots |

The calc block (rows 7–16) sums these per circle into named ranges
`Kla1AnzLev0 … Kla1AnzLev9` (`BC7:BC16`), `Kla2AnzLev*` (`BD`), `Kla3AnzLev*` (`BE`),
e.g. `Kla1AnzLev1 (BC8) = TRUNC(L8+O8+AB8+AE8 & …)`. Cantrips:
`Kla1Cantrips (BF7)`, "∞" when slot value = 99 (e.g. Barde row 41 col K = 99).

#### Per-class casting metadata (columns AX–BB, read from the level-1 row)

Read by the calc block via `INDIRECT(<col> & (KlasseNr*20)+1)`:

| Col | Named range (calc) | Meaning |
|---|---|---|
| AX | (used by `IN`/`INmod` formulas) | max spell-level cap helper (=10 for casters) |
| **AY** | `Kl1Mag (B15) = INDIRECT("ay"&Klasse1Nr*20+1)` | **spell-list / casting-attribute ID** (0 = non-caster). Distinct per caster: Barde 1, Druide 2, Hexenmeister 3, Kleriker 4, Paladin 5, Waldläufer 6, Alchemist 7, Inquisitor 9. |
| AZ | — | `IF(IN-10<1,0,IN-10)` helper |
| **BA** | `Kla1MagAlle (C15) = INDIRECT("ba"&…)` | **"all spells known" flag** (1 = prepared/whole-list caster, e.g. Druide/Kleriker/Paladin/Waldläufer = 1; spontaneous Magier/Hexenmeister = 0) |
| **BB** | `CantripAlle1 (I15) = INDIRECT("bb"&…)` | **"all cantrips known" flag** |

Related calc outputs: `Kla1MagMax (F15)=MIN(D15:E15)` (max castable circle from
attribute vs level), `Kla1KonW (H15)` concentration check, `Kla1MagPlus (Bogen!ER3)`.
Multiclass arcane/divine counts: `AnzArkKlassen (N3)=SUM(L4:N4)`,
`AnzGottKlassen (AD3)=SUM(AB4:AD4)` — drive the "−"-joined display when >1 caster class.

#### Domain block (Kleriker etc.)

To the right of Magier's block (cols BB/BC around rows 122–133) sits the domain
picker text ("Keine Domäne", "Einzeldomäne:", "Herr der Untoten", "Klosterbruder",
"Theologe", …). The actual domain spell/power lookup uses a separate table
**`DomKlatab = Listen!ET18:FA162`** (`Dom1Kl … Dom4Kl` via `VLOOKUP(ETxx,DomKlatab,n)`;
col 2 = class, 5 = short name, 6 = start, 7 = end).

### 1.2 Master class table `Klatab` (`Klasse!BO2:EP162`)

Row-2/3 = headers. This is the table the **Bogen** sheet VLOOKUPs against by class name.

| `Klatab` col idx | Sheet col | Header | Meaning | Consumed by |
|---|---|---|---|---|
| 1 | BO | (name) | class display name (lookup key, leading spaces) | — |
| **2** | BP | — | **`KlaNr`** (class number → the *20 index above) | `Klasse1Nr (Bogen!EJ3)=VLOOKUP(Klasse1,Klatab,2,FALSE)` |
| **3** | BQ | — | sourcebook **page references** | `SeiteKla1 (Klasse!BE36)=VLOOKUP(Klasse1,Klatab,3,…)` |
| **4** | BR | — | category/group flag (1/2/3) | `VLOOKUP(neue_Klasse,Klatab,4,…)` |
| **5** | BS | — | **starting gold** (Barbar 100, Kämpfer 140, Magier 90, Mönch 60…) | `setgeld (Listen!HI137)=VLOOKUP(...,Klatab,5,…)` |
| 7 + | BU, BW, BY, … | race names (Elf, Gnom, Halb-Elf, …) | **favored-class bonus text per race** (pairs: text col + a code col like BV/BX) | favored-class display |

Named sub-ranges of this table:
- `KlaListe = BO2:BO77` — full selectable class list incl. category separators.
- `Klalistekurz = BO3:BO54`, `_kla1…_kla48` = individual class-name cells.
- `KlaTextTab = Listen!FO7:GO1128` — long descriptive text per class
  (`Klassestart1/Klasseende1` = `VLOOKUP(Klasse1,KlaTextTab,3|4)`).

### 1.3 Full class list (`KlaListe`, BO2:BO77) with `KlaNr` (`BP`)

48 selectable classes (excluding the 7 category-separator rows). Grouped as in the sheet:

**Grundklassen (core):** Barbar 1, Barde 2, Druide 3, Hexenmeister 4, Kämpfer 5,
Kleriker 6, Magier 7, Mönch 8, Paladin 9, Schurke 10, Waldläufer 11, Antipaladin 49.

**Basisklassen (base/APG+):** Alchemist 12, Hexe 13, Inquisitor 14, Mystiker 15,
Paktmagier 16, Ritter 17.

**Ausbauklassen:** Kampfmagus 44, Ninja 46, Samurai 47, Schütze 45.

**Mischklassen (hybrid/ACG):** Arkanist 56, Attentäter 57, Blutwüter 58, Draufgänger 59,
Ermittler 60, Jäger 61, Kriegspriester 63, Raufbold 68, Schamane 69, Skalde 70.

**Legendäre (mythic):** Erzmagier 50, Hierophant 51, Marschall 52, Streiter 53,
Trickser 54, Wächter 55.

**NSC:** Adept 38, Adeliger 39, Bürgerlicher 40, Experte 41, Krieger 42.

**Eigene Klassen (user/custom):** "test1" 18, "e2" 19 (placeholders; `_kla18/_kla19` =
`"   "&EKlasse1`/`EKlasse2`).

**Prestigeklassen:** Ark. Betrüger 20, Ark. Bogenschütze 21, Assassine 22,
Bote des Zorn 30, Drachenjünger 23, Duellant 24, Glaubenskrieger 31, Hüter der Natur 32,
Kluftwächter 103, Kreuzfahrer der Erbin 124, Kriegsherold 33, Kundsch.-Chronist 25,
Kundsch.-Geleh. 48, Meisterspion 34, Mutierter 35, Mystischer Ritter 26,
Mystischer Theurg 27, Niederer Templer 120, Schattentänzer 28, Standh. Verteidiger 36,
Weltengänger 37, Wissenshüter 29.

> Note: `KlaNr` is **not contiguous** (core uses 1–11+49, prestige jumps to 20–37 then
> 103/120/124). The numbers index directly into the *20 progression rows, so the DB
> physically has blocks for KlaNr up to ~129 (matching `max_row ≈ 2600 ≈ 129*20`).
> Tiergefährte (animal companion) is `_kla43 (BO162) = IF(Volk="Tiergefährte",Klasse1,"Tier Gefährte")`.

### 1.4 Archetypes / class-feature modifications

Archetypes are **not separate classes**. The character picks up to three feature/archetype
names stored in `merkmal1 / merkmal2 / merkmal3` (Bogen inputs). Two mechanisms key off them:

1. **BAB/casting swaps inside `Klasse`** via boolean flags, e.g.
   - `Heiliger_Krieger (BD123)`, `Heiliger_Pal (BE192)` — toggle the −20 block swap in `Gab1Kla1`.
   - `Kensai1/2/3 (BD20–22)` — `IF(OR(merkmalN="Kensai","Seelenschmied","Skirnir","Zauberstreiter"),…)`.
   - `Klosterbruder1/2/3 (BD31–33)` — `IF(OR(merkmalN="Klosterbruder","Kreuzfahrer"),1,0)`.

2. **Class-skill list modification via `FertTabArche = Fertig!AE433:BP582`**:
   - Col **AE** = archetype name (lookup key); 150 entries (Archivar, Arkaner Duellant,
     Hofbarde, Stadtdruide, Stadtbarbar, Gladiator, Klosterbruder, Schwertmeister, …).
   - Col **AD** = an active-toggle (0/1), set by named ranges like
     `Klosterbruder (Fertig!AD527)=IF(OR(merkmal1=AE527,merkmal2=…,merkmal3=…),1,0)` and
     `Schwertmeister (AD538)`.
   - Cols **AF…BN** = one column **per skill** (37 skills, positional). Each modification
     cell is `=+$AD$<row>` (add skill as class skill) or `=-$AD$<row>` (remove it).
     E.g. row 527 (Klosterbruder) sets BF/BH/BJ/BK/BL `=+$AD$527`; row 538 (Schwertmeister)
     sets BA/BL `=$AD538`, BB/BJ `=-$AD538`.

   → Effect: when an archetype is selected, its row's AD=1 flips the indicated skills'
   class-skill status (+/−) on top of the base class-skill list. The skill→column mapping
   header is on the main Fertig skill table (see the Skills section); FertTabArche reuses
   the same column order.

> **Ambiguity flagged:** the per-class *base* class-skill list and the per-class *skill
> points/level* and *hit die (TW)* are **not** in `Klatab` or in the AX–BB metadata. They
> are computed on the **Fertig** (skills) and **Bogen** (HP) sheets respectively and were
> not located in this section's scope. `VolkFertPunkte` (race skill pts) exists, but the
> class skill-points-per-level and class hit-die appear to be resolved elsewhere (likely a
> table on Fertig keyed by class, plus the Bogen HP block). **This should be confirmed when
> documenting the Skills and HP sections.** No `Kla*TW` / `Kla*FertPunkte` named range exists.

---

## 2. Races — `Volk` sheet (hidden, 343 × 59)

### 2.1 Master race table `VolkTab` (`Volk!A3:J54`)

Headers at rows 1–2. This is the table the calc sheets VLOOKUP by race name (`Volk`).

| `VolkTab` col idx | Sheet col | Header (rows 1–2) | Meaning | Consumed by |
|---|---|---|---|---|
| 1 | A | `Volk` | race name (lookup key) | — |
| **2** | B | `G-Kat` | **size category** ("Mittelgroß"/"Klein"/…) | `VLOOKUP(Volk,VolkTab,2)` |
| **3** | C | `Bewegung … ohne Rüstung` | **base speed**, unarmored (metres: 9 = 30 ft, 6 = 20 ft) | `VLOOKUP(...,3)` |
| **4** | D | `Bewegung … mit Rüstung` | speed when armored (e.g. Zwerg 6/6 — no penalty) | `VLOOKUP(...,4)` |
| **5** | E | `Fertigkeits-Pkt Extra/Level` | **extra skill points per level** (Mensch = 1, else 0) | `VolkFertPunkte (Volk!N6) = VLOOKUP(Volk,VolkTab,5)*Level - IF(Volk="Mensch",LKlasseLev,0)` |
| **6** | F | `Speziell` | **ability-score modifiers, display text** ("GE+2, IN+2, KO-2"; "1 Attribut +2" for flexible races) | display only |
| **7** | G | `Dämmersicht` | **low-light vision flag** (1/0) | `VLOOKUP(...,7)` |
| **8** | H | `Spalte auf Kräfte` | **column-letter pointer** into the racial-abilities region on the `Kräfte` sheet | `INDIRECT(VLOOKUP(Volk,VolkTab,8)&ROW())` — used **48×** to pull racial traits |
| **9** | I | `Seite im Buch` | sourcebook **page refs** ("(G21, E10, V10)") | `Volkseite (Volk!I56)=VLOOKUP(Volk,VolkTab,9)` |
| **10** | J | `Spalte Opti.` (Volksmerkmal) | **favored-class-bonus column index** into `Klatab` | `Opti_Spalte (Volk!J57)=VLOOKUP(Volk,VolkTab,10)`; then `VLOOKUP(Klasse1,Klatab,Opti_Spalte[+1])` |

Beyond col J the `Volk` sheet holds working/scratch columns: ability-mod calc helpers
(M–T: "Volks-Modifikatoren", "Größenmod", "Bewegungsmod", "Rüstungsgewicht",
size-number, KMB mod, template/"Schablone"), a **Tiergefährte (animal companion)** stat
table (cols W–AH: name, size, speed, ability scores `ST10, GE15…`, and per-level
advancement "Stufe1…Stufe8"), and a TGF/familiar selector (cols R–U: Vertrauter,
Eidolon, Pflanzengefährte, Monstergefährte, etc.).

> **Ability-mod application:** col F is **display text only**. The numeric STR/DEX/… racial
> bonuses are applied through the **`Kräfte` sheet** via the col-8 `INDIRECT` pointer
> (`Spalte auf Kräfte`), not parsed from the "GE+2" string. Exact attribute wiring lives in
> the Kräfte section — flagged for that section. Flexible races ("1 Attribut +2",
> e.g. Mensch/Halb-Elf/Halb-Ork) get a player-chosen +2 handled there.

### 2.2 Racial traits, spells & page text (off-sheet tables)

- **`VolkFaehigkeiten = ZauberListen!BB11915:BB12043`** (129 rows) — racial special
  abilities list.
- **`VolkZauberListe = ZauberListen!BW98:BW196`** (99 rows) — racial/SLA spell list.
- **`VolkTextTab = Listen!FH7:FL442`** — long race description text;
  `Volkstart (Listen!FJ4)=VLOOKUP(Volk,VolkTextTab,2)`, `Volkende (FJ5)=…,3)`,
  `Stunkvolk (FL6)` compares cols 5.
- **`VolkSeitenTab = Listen!EW181:EX198`** — race→page-number map.
- **`Volkmerkmal (Bogen!EE325)`** — the selected **racial-trait variant**
  ("Alternativ" toggles the alternate racial trait set; col-8 `INDIRECT` then reads the
  alternate column on Kräfte).

### 2.3 Full race list (`Volkliste`, A3:A53) — count

**38 playable races** (rows 3–42, excluding separators and the `Tiergefährte`/`Tier
Gefährte` companion placeholders and the `Sukkubus` monster row):

Elf, Gnom, Halb-Elf, Halb-Ork, Halbling, Mensch, Zwerg *(7 core)*; Aasimar, Drow,
Gestrandete, Goblin, Halb-Vampir, Hobgoblin, Katzenvolk, Kobold, Oreade, Ork, Pyrier,
Rattenvolk, Sylphen, Tengus, Tiefling, Undine, Duergar, Grippli, Kiemenmensch, Kitsune,
Meervolk, Nagaji, Samsaran, Strix, Suli, Svirfneblin, Vanara, Vischkanya, Wayang,
Wechselbalg *(31 featured/uncommon)*.

Plus special entries in column A: `Tiergefährte` (A10) and `Tier Gefährte` (A54) =
animal-companion modes, `Sukkubus` (A44, monster, page "(MHB1 50)"), and the rows 28/43/52
"**********" separators. So:
- **Selectable PC races: 38.**
- VolkTab data rows incl. companion/monster placeholders: 40.

> **Ambiguity flagged:** the `VolkTab` named range is defined as **A3:J54** but the visible
> race data extends through row 42 (Wechselbalg) with companion/monster rows after; row 54
> is the "Tier Gefährte" placeholder. The named range covers the lookup span; rows 45–53 are
> blank/zero filler. `Volkliste` (the selectable dropdown) is **A3:A53**.

---

## 3. How the calc sheets resolve a selection (summary)

**Class** (active 1st class; 2nd/3rd analogous with `Klasse2*/Klasse3*`):
1. User picks name → `Klasse1 (Bogen!DO3)`.
2. `Klasse1Nr (Bogen!EJ3) = VLOOKUP(Klasse1, Klatab, 2, FALSE)` → the `KlaNr`.
3. `Klasse1Lev (Bogen!EK3)` = chosen level.
4. Per-level stats pulled from the 20-row block by `INDIRECT(<col> & (Klasse1Nr*20 + Klasse1Lev))`:
   BAB from col **C** (`Gab1Kla1`), spells/day from cols **K–AW** summed into `Kla1AnzLev0–9`.
5. Casting metadata from level-1 row: `Kl1Mag`=col AY, `Kla1MagAlle`=col BA, `CantripAlle1`=col BB.
6. Saves: the **Bogen** save totals add the per-level G/H/I values across all 1–3 classes.
7. Archetypes (`merkmalN`) flip BAB-block swaps and skill class-status via `FertTabArche`.

**Race:**
1. User picks name → `Volk (Bogen!CW3)`.
2. Direct `VLOOKUP(Volk, VolkTab, idx, FALSE)`: size=2, speed=3/4, extra-skill-pts=5,
   low-light=7, page=9.
3. Racial traits/SLAs: `INDIRECT(VLOOKUP(Volk,VolkTab,8)&ROW())` reads the per-race column
   on the `Kräfte` sheet (and the alternate column when `Volkmerkmal="Alternativ"`).
4. Favored-class bonus: `Opti_Spalte = VLOOKUP(Volk,VolkTab,10)` gives the column index into
   `Klatab`, then `VLOOKUP(Klasse1, Klatab, Opti_Spalte[+1])` reads the bonus text for that race.
5. Long descriptions/pages: `VolkTextTab`, `VolkSeitenTab`.

---

## 4. Open items for the reimplementation

- **Class hit die (TW)** and **class skill-points/level** were not found in `Klasse`/`Klatab`;
  confirm in the HP (Bogen) and Skills (Fertig) sections.
- **Class base-skill lists** live on `Fertig` (FertTabArche only stores the *archetype deltas*).
- **Racial ability-score numeric application** is on the `Kräfte` sheet (col-8 pointer);
  document the attribute cell wiring there.
- BAB/save progressions are stored as **final per-level numbers**, not type codes — decide
  whether to copy verbatim or recompute via standard PF formulas.
