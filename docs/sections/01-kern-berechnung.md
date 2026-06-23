# 01 – Kern-Berechnungsengine (Bogen, Fertig, Klasse)

Dokumentiert, wie aus den **Eingaben** (Volk; bis zu 3 Klassen + Stufen; 6 rohe
Attributwerte; Größe) alle abgeleiteten Kennwerte berechnet werden. Strukturiert
nach Ausgabewert. Pro Wert: benannter Bereich/Zelle · Formel · Abhängigkeiten ·
implementierte PF1e-Regel (Plausibilitätsprüfung).

> Konvention der Quelldateien: Werte = `sheets_values/<Sheet>.csv`,
> Formeln = `sheets_formulas/<Sheet>.tsv`, Namen = `named_ranges.json`.
> Zellangaben sind A1-Notation; benannte Bereiche sind **fett** kursiv.

---

## 0. Die zentralen Eingaben & ihre Speicherorte

| Eingabe | Zelle / Named Range | Hinweis |
|---|---|---|
| 6 rohe Attribute | `Bogen!M26` ST, `M32` GE, `M38` KO, `M44` IN, `M50` WE, `M56` CH | Named: **ST/GE/KO/IN/WE/CH**. Reine Eingabe (Default 10). |
| Temp-Override Attribute | `Bogen!AA26/32/38/44/50/56` | Named: **sttmp/getmp/kotmp/intmp/wetmp/chtmp**. Leer = kein Override. |
| Klasse 1/2/3 (Name) | `Bogen!DO3` → **Klasse1**; **Klasse2**=`EJ10`, **Klasse3**=`EJ16` | Klasse2/3 = `IF(DO9="","-",DO9)` etc. |
| Klassen-Nr (1–N) | **Klasse1Nr**=`Bogen!EJ3` = `VLOOKUP(Klasse1,Klatab,2,FALSE)` | analog Klasse2Nr/Klasse3Nr. 0 = keine Klasse. |
| Klassen-Stufe | **Klasse1Lev**=`Bogen!EK3`; **Klasse2Lev**=`EQ9`=`IF(Klasse2Nr=0,0,MAX(EK9,1))`; **Klasse3Lev**=`EQ15` | Stufen liegen physisch auf **Klasse!B5:B7** als Stufen-bezogene Datenzeilen (siehe §2). |
| Größe (Kategorie) | **Groekat**=`Bogen!CW9` = `+GroeKatKorrigiert` | **GroeKatKorrigiert**=`Volk!N50` (Volk-Default, ggf. durch Schablone/Größenänderung korrigiert). |

**Klatab** (`Klasse!BO2:EP162`) ordnet jedem Klassennamen eine `Nr` zu — diese `Nr`
ist der Schlüssel für die gesamte Klassen-Progressionstabelle (siehe §2).

---

## 1. Attributwerte & Modifikatoren (inkl. Temp-Override)

### 1.1 Roh-Modifikator (Bonus aus Tabelle, mit Buff)
- **T-Spalte (Roh-Mod)**: `Bogen!T26` (ST)
  `=IF(ISERROR(VLOOKUP(ST,Attributtab,2,FALSE)),0,VLOOKUP(ST+BuffST,Attributtab,2,FALSE))`
  Analog `T32` (GE), `T38` (KO), `T44` (IN), `T50` (WE), `T56` (CH).
- **Attributtab** = `Listen!IE5:IS54`: Spalte 1 = Attributwert, **Spalte 2 = Modifikator**
  (Standard-PF1e: `(Wert−10) abgerundet / 2`). Spalten 13/14/15 = Tragkraft (siehe §11).
- **BuffST/BuffGE/BuffKO/BuffIN/BuffWE/BuffCH** = `Tools!AN45/AO45/AP45/AQ45/AR45/AS45`,
  je `=SUMIF($AL18:$AL44,1,<Spalte>18:<Spalte>44)` — Summe aller **aktiven** (Flag-Spalte
  `AL`=1) temporären Attribut-Buffs (Zauber/Tränke/Effekte). Der Buff wird **auf den Wert
  addiert, bevor** der Modifikator nachgeschlagen wird (`ST+BuffST`).

> Plausibilität: korrekt — PF1e-Buffs (Stierkraft etc.) erhöhen den Attributwert, der
> Modifikator folgt aus der Standardtabelle. ⚠️ **Hinweis/Ambiguität:** Die `ISERROR`-Hülle
> nutzt `ST` (ohne Buff), der eigentliche Lookup `ST+BuffST` — bei sehr hohem Buff am
> Tabellenrand könnte das divergieren; in der Praxis irrelevant.

### 1.2 Effektiver Modifikator mit Temp-Override
- **STmod** = `Bogen!Z26` = `=IF(sttmp="",T26,AH26)`
  (analog **GEmod** `Z32`, **KOmod** `Z38`, **INmod** `Z44`, **WEmod** `Z50`, **CHmod** `Z56`).
- **AH26** = `=IF(sttmp="","",VLOOKUP(sttmp,Attributtab,2,FALSE))` — Modifikator des
  Override-Werts (analog AH32/38/44/50/56).
- Logik: Ist die Temp-Zelle (`sttmp` = `Bogen!AA26` …) **leer**, gilt der reguläre
  Roh-Mod `T26`; ist sie gesetzt, gilt der aus dem Override-Wert berechnete Mod `AH26`.

> Plausibilität: korrekt. Diese `**mod`-Named-Ranges sind die **einzige** Modifikator-
> Quelle, die der Rest des Blatts referenziert (Saves, RK, KMB/KMV, Fertigkeiten, INI).
> Eine Web-App sollte denselben Indirektionspunkt nachbilden: `effMod = tempSet ? modOf(temp) : modOf(raw+buff)`.

---

## 2. Klassen-Progressionstabelle (Datenblock auf Klasse) — Fundament für GAB & RW

Alle Klassenwerte werden per `INDIRECT` aus einem Datenblock auf **Klasse** gezogen.
Pro Klasse belegt der Block ein **20-Zeilen-Band**: `Zeile = Klasse<n>Nr * 20 + Stufe`
(Stufen 1–20). Z. B. Barbar = `KlaNr 1` → Band Zeilen 21–40; Kleriker = `KlaNr 6` → Zeilen 121–140.

Belegte Datenspalten (verifiziert an Barbar/Kleriker):

| Spalte | Inhalt | Beispiel Barbar (gut. Zäh) | Beispiel Kleriker (3/4-GAB) |
|---|---|---|---|
| `B` | Stufe (1–20) | 1,2,…,20 | 1,2,…,20 |
| `C` | **GAB / BAB** (1. Iteration) | 1,2,5,10,…,20 (volle) | 0,1,3,7,…,15 (¾) |
| `D`,`E`,`F` | iterative Angriffsschwellen | ab Lvl 6/11/16 | – |
| `G` | **RW Reflex** (Basis) | 0,0,1,3,6 (schwach) | poor |
| `H` | **RW Willen** (Basis) | schwach | gut |
| `I` | **RW Zähigkeit** (Basis) | 2,3,4,7,12 (gut) | gut |
| `AX` (+3-Offset) | Zauber-Attribut-Mod-Verweis (G15 etc.) | – | Casting-Stat |
| `AY` (+1-Offset) | Magie-Flag (`Kl1Mag`) | – | – |
| `BA` (+1) | „alle Zauber" / Vorbereiter-Flag (`Kla1MagAlle`) | – | – |
| `BB` (+1) | Zauber-bezogener Wert (`I15`) | – | – |

> Plausibilität: korrekt. Spalten G/H/I codieren die **good/poor-Save-Progression** je
> Klasse direkt als fertige Tabellenwerte (good = `2 + Stufe/2`, poor = `Stufe/3`,
> jeweils abgerundet). Die Web-App kann diese 20×N-Tabelle 1:1 als Daten übernehmen statt
> die Formeln nachzubilden.

---

## 3. Grund-GAB / BAB & iterative Angriffe (multiclass-fähig)

### 3.1 Pro-Klasse-Zeilen (Klasse!C5:F7)
- **C5** (GAB Klasse 1):
  `=IF(Vertrauter=1,GABMeister,IF(GABSchablone=0,INDIRECT("c"&(Klasse1Nr*20−IF(AND(Klasse1Nr=6,Heiliger_Krieger=1),20,0))+Klasse1Lev),GABSchablone))`
  - Normalfall: `INDIRECT("c"&Klasse1Nr*20+Klasse1Lev)` → GAB aus dem Datenblock (§2).
  - **Vertrauter=1** (Tiergefährte/Vertrauter): GAB = **GABMeister** (`Bogen!CA119`, GAB des Meisters).
  - **GABSchablone≠0** (Schablone/Monster wie Untot): überschreibt mit `GABSchablone`
    (`Listen!IB76` = `VLOOKUP(Schablone,SchablonenTab,26)`).
  - Sonderfall `Heiliger_Krieger`: bei Klasse-Nr 6 (Paladin/Kleriker-Slot) wird das Band um
    20 Zeilen verschoben (alternative Progression). **Heiliger_Krieger** = `Klasse!BD123`.
- **C6/C7**: Klasse 2/3, je `=IF(OR(Klasse2Nr=0,Klasse2Lev=0),0,INDIRECT("c"&…+Klasse2Lev))`.
- **D5/E5/F5** (Vertrauter-Zweig): `MAX(GABMeister−5/−10/−15,0)`; sonst `INDIRECT("d"/"e"/"f"…)`.
- **D6:F7**: weitere Iterationen aus dem Datenblock (Spalten d/e/f).

### 3.2 Aggregation (multiclass = Summe)
- **_GAB1** = `Klasse!C8` = `=SUM(C5:C7)` — **Gesamt-GAB = Summe der GAB aller 3 Klassen**.
- **_GAB2** = `D8` = `=IF(_GAB1>5,_GAB1−5,0)` (2. Iteration), **_GAB3** = `E8` = `IF(_GAB2>5,_GAB2−5,0)`,
  **_GAB4** = `F8` = `IF(_GAB3>5,_GAB3−5,0)`.
- **Grundgab** = `Klasse!C9` = `=+_GAB1`.
- **GAB** (Anzeige-String) = `Klasse!C10` =
  `=CONCATENATE(C9,D9,E9,F9,)` wobei
  `D9 =IF(TGF=1,"",IF(_GAB2=0,"",CONCATENATE("/",_GAB2+BuffTWAllg)))` (analog E9/F9).
  → Ergebnis z. B. `"+11/+6/+1"`. **BuffTWAllg** (`Tools!AT45`) = aktiver allg. Angriffs-Buff.
  `TGF` (Tiergefährte, `Volk!V2`) unterdrückt Iterationen.

> Plausibilität: korrekt. PF1e: Multiclass-BAB = **Summe** der einzelnen Klassen-BAB
> (nicht gerundet pro Klasse — durch die fertigen Tabellenwerte pro Stufe gewahrt).
> Iterative Angriffe bei BAB > 5/10/15 → +1 Angriff bei −5/−10/−15. Vollständig multiclass-aware.

---

## 4. Rettungswürfe Zäh / Ref / Wil (multiclass-fähig)

### 4.1 Basis-Save je Klasse (Klasse!G5:I7) und Aggregation
- Pro-Klasse-Werte: `G5 =INDIRECT("g"&(Klasse1Nr*20)+Klasse1Lev)` (Reflex),
  `H5 =INDIRECT("h"&…)` (Willen), `I5 =INDIRECT("i"&…)` (Zähigkeit); G6/H6/I6, G7/H7/I7
  analog für Klasse 2/3 mit 0-Guard.
- **Aggregierte Basis-Saves** (Summe über alle Klassen, mit Untoten-Sonderfall):
  - **REf** = `Klasse!G8` = `=IF(RWUntote=1,UntotRWRef,SUM(G5:G7))`
  - **Willen** = `Klasse!H8` = `=IF(RWUntote=1,UntotRWWil,SUM(H5:H7))`
  - **Zaeh** = `Klasse!I8` = `=IF(RWUntote=1,UntotRWZäh,SUM(I5:I7))`
  - **RWUntote** = `Klasse!BE40` = `=IF(Schablone="   Untot",1,0)`. Bei Untoten ersetzen
    feste Tabellenwerte (`UntotRWRef/Wil/Zäh` = `Klasse!BE42/43/44`, je
    `VLOOKUP(BE41,UntotRWTab,…)`) die Klassensummen.

> ⚠️ **Achtung Spalten-/Namens-Mapping:** Trotz der Reihenfolge der Named Ranges gilt:
> **I8 = Zähigkeit (Fort)**, **G8 = Reflex**, **H8 = Willen** — verifiziert über die
> Datenblock-Werte (Barbar: I-Spalte = good-Progression = Zäh; G/H = poor).

### 4.2 Finaler Save (Anzeige auf Bogen = Basis + Attribut-Mod + Sonstiges)
- **Reflex**: `Bogen!X85` = `=+AF85+AM85+AT85+BA85+BH85+BuffRef+GöttlicheWürde`
  mit `AF85 =IF(RefSchab=0,REf,RefSchab)` (Klassenbasis o. Schablonen-Override),
  `AM85 =IF(ISERROR(GEmod),0,GEmod)` (**GE-Mod**).
- **Willen**: `Bogen!X91` = `=+AF91+AM91+AT91+BA91+BH91+BuffWil+GöttlicheWürde`,
  `AM91 = WEmod` (**WE-Mod**).
- **Zähigkeit**: `Bogen!X97` = `=IF(RWUntote=1,"",AF97+AM97+AT97+BA97+BH97+BuffZäh+GöttlicheWürde)`,
  `AM97 =IF(SchabloneUntot="Untot",CHmod,KOmod)` (**KO-Mod**, bei Untoten CH-Mod).
- Gemeinsame Zusatzspalten: `AT*` (Resistenz-Bonus), `BA*`/`BH*` (weitere Modifikatoren/
  Sonstige), `Buff*` (aktive Save-Buffs aus Tools), `GöttlicheWürde` (`Klasse!BC198` =
  CHa-Mod auf alle Saves bei Paladin > Stufe 1: `IF(Klasse*Nr=9 AND Lev>1, MAX(CHmod,0),0)`).

> Plausibilität: korrekt. PF1e finaler Save = Basis (gut/schwach pro Klasse, summiert) +
> Attribut-Mod (Ref=GE, Wil=WE, Zäh=KO) + situative Boni. Untoten-Schablone nutzt CH statt
> KO für Zäh — korrekt für untote Kreaturen. Multiclass-aware via `SUM(G5:G7)` etc.

---

## 5. Trefferpunkte / TP (Trefferwürfel)

Das Blatt berechnet **keine** numerische Max-TP automatisch — es zeigt einen
**Trefferwürfel-Text**, die tatsächlichen TP trägt der Spieler manuell ein.

- Anzeige: `Bogen!BA27` = `=+TPText`.
- **TPText** = `Listen!IG91` = `=IG87&IG88&IG89&IG90` mit
  - `IG87 ="Trefferwürfel"` (Label)
  - `IG88 =" 1:"&IF(L1Lev>0,"","w")&IF(EigeneTW1="",Kla1TW,EigeneTW1)&IF(L1Lev>0,"TP","")`
  - `IG89/IG90` analog für Klasse 2/3 (mit `Kla2TW`-/`Kla3TW`-Guard auf 0).
- **Kla1TW** = `Fertig!BZ2` = `=IF(Schablone="   Untot",8,VLOOKUP(Klasse1,FerTab,38,FALSE))`
  → **FerTab Spalte 38 = Trefferwürfel-Typ** (z. B. 6/8/10/12) der Klasse; Untot = w8.
  `Kla2TW`/`Kla3TW` = `Fertig!BZ3/BZ4` (0 wenn keine 2./3. Klasse).
- **EigeneTW1/2/3** = `Bogen!CL27/CP27/CT27` — optionaler manueller TW-Override pro Klasse.
- `L1Lev>0` (`Listen!IM87`, Liste-Klasse wie Tiergefährte mit fixen TP) schaltet von „wX" auf
  feste „TP" um.

> ⚠️ **Ambiguität / Designentscheidung für die Web-App:** Es gibt **keine** automatische
> max-TP-Summe (`TW + KOmod` pro Stufe). Das Blatt liefert nur den Würfel-Ausdruck; die
> max-TP-Eingabe erfolgt anderswo manuell. Bei der Reimplementierung klären: TP automatisch
> rollen/summieren (würfelbasiert oder Durchschnitt) oder wie hier nur den TW-Text anzeigen.

---

## 6. Konzentration (zaubernde Klassen, multiclass-fähig)

- Pro Klasse: **Kla1KonW** = `Klasse!H15` = `=IF(Kl1Mag=0,0,Klasse1Lev+Kla1MagPlus+G15)`
  (analog `H16`/`H17`). = Zaubererklassenstufe + Zauberstufen-Plus + Zauber-Attribut-Mod
  (`G15 =INDIRECT("ax"&(Klasse1Nr*20)+3)` zieht den Casting-Stat-Mod aus dem Datenblock).
  **Kl1Mag** (`Klasse!B15` = `INDIRECT("ay"&Klasse1Nr*20+1)`) = Magie-Flag der Klasse.
- **Konmax** = `Klasse!H18` = `=SUM(H15:H17)` (höchster/summierter KonW), **Konzahl** =
  `Klasse!H13` = `=COUNTIF(H15:H17,0)` (Anzahl nicht-zaubernder Klassen).
- Anzeige: `Bogen!EJ319` = `=IF(Konzahl=3,"",IF(Konzahl=2,Konmax,CONCATENATE(... Kla1KonW ...)))`
  → bei einer Zauberklasse Einzelwert, bei mehreren eine „a − b − c"-Liste.

> Plausibilität: korrekt. PF1e Konzentrationsbonus = Zauberstufe + Zauberattribut-Mod. Pro
> Klasse getrennt (verschiedene Zauberattribute möglich). `Kla1MagPlus` (`Bogen!ER3`) = manuelle
> Zauberstufenanpassung (z. B. Prestigeklassen-Verstärkung).

---

## 7. Rüstungsklasse / RK

- **RK** = `Bogen!M64` =
  `=10+Z64+AG64+GEmodRK+AU64+NatRue+Ablenkung+RueSonstige+TempRK+BuffRK`

| Komponente | Zelle / Named | Bedeutung & Herkunft |
|---|---|---|
| `10` | konstant | RK-Basis |
| `Z64` | `Bogen!Z64` | **Rüstungsbonus**: `=+RueBon+IF(Schablone="   Geist",CHmod−RueBon,0)+MönchRK+IF(Vertrauter=1,VertrauterRK,0)`. **RueBon**=`Bogen!AS279`=`SUM(AS249:AY273)` (getragene Rüstung). Geist-Schablone → Ablenkungsbonus aus CH statt Rüstung. **MönchRK**=`Waffe!JV55` (Mönch-AC-Bonus, +WE wenn unbelastet). **VertrauterRK**=`Listen!HP135` (Vertrauter-NatRK nach Meisterstufe). |
| `AG64` | `Bogen!AG64` | **Schildbonus**: `=Schildbon−IF(Schablone="   Geist",Schildbon,0)`. **Schildbon**=`Bogen!AW279`=`IF(AS274="",0,AS274)`. |
| `GEmodRK` | `Bogen!AN64` | **GE-Mod, gekappt**: `=MIN(GEmod,maxgemod)`. **maxgemod**=`Bogen!BU279` = max. GE-Bonus der getragenen Rüstung (99 = unbegrenzt; aus `Ruesttab`/`Schildtab` Spalte 4, abzgl. Rüstungstraining — siehe §11.4). |
| `AU64` | `Bogen!AU64` | **Größenmodifikator**: `=+Groemod`. **Groemod**=`Volk!N3`=`VLOOKUP(Groekat,groetab,2,FALSE)` (Klein +1, Groß −1, …). |
| `NatRue` | `Bogen!BB64` | natürliche Rüstung (Eingabe/Effekt). |
| `Ablenkung` | `Bogen!BI64` | Ablenkungsbonus (deflection). |
| `RueSonstige` | `Bogen!BP64` | sonstiger RK-Bonus. |
| `TempRK` | `Bogen!BW64` | temporärer RK-Bonus (Eingabe). |
| `BuffRK` | `Tools!AZ45` | `=SUMIF($AL18:$AL44,1,AZ18:AZ44)` — aktive RK-Buffs. |

> Plausibilität: korrekt — exakte PF1e-AC-Formel: 10 + Rüstung + Schild + Dex(gekappt) +
> Größe + Natürlich + Ablenkung + Sonstige. Geist/Mönch/Vertrauter-Sonderfälle korrekt
> abgebildet. Berührungs-RK und Auf-dem-falschen-Fuß-RK ergeben sich aus Teilmengen
> (ohne Rüstung/Schild/Nat bzw. ohne Dex) — Komponenten sind einzeln vorhanden.

---

## 8. Initiative / INI

- **INIBonus** = `Fertig!U159` = `=SUM(U125:U158)` — Summe der INI-relevanten Talente/
  Effekte. Jede Zeile: `U125 =IF(ISERROR(VLOOKUP(S125,Kraftliste,1,FALSE)),0,T125)` —
  trägt Bonus aus Spalte `T` bei, falls die in Spalte `S` benannte Fähigkeit in der
  `Kraftliste` des Charakters vorhanden ist (z. B. „Verb. Initiative" +4, „Elfische Reflexe" +2).
- Anzeige-Komponente: `Bogen!BI56` = `=+GEmod+BY56+INIBonus` → **INI = GE-Mod + Sonstiges
  (BY56) + INIBonus**.

> Plausibilität: korrekt. PF1e INI = Dex-Mod + Boni (Improved Initiative +4 etc.). Multiclass
> irrelevant (Talent-/Attribut-basiert).

---

## 9. KMB / KMV (Kampfmanöver) — größenabhängig

### 9.1 KMB (CMB)
- **X111** = `Bogen!X111` = `=+AF111+AM111+AT111+BA111+BuffKMB`
  - `AF111 =IF(Mönch=1,MönchKMB,_GAB1)` → **GAB** (oder Mönch-spezifisch).
  - `AM111 =IF(GroeKatKMB=1,GEmod,STmod)` → **ST-Mod**, bei sehr kleinen/großen Sondergrößen
    GE-Mod (**GroeKatKMB**=`Volk!N54`=`IF(Groemod>1,1,0)`).
  - `AT111 =+KMBmod` → **Größen-Mod für Manöver**. **KMBmod**=`Volk!N5`=`VLOOKUP(Groekat,groetab,4,FALSE)`
    (Spalte 4 von **groetab** `Volk!A61:G69`: Mittelgroß 0, Groß +1, Klein −1, …).
  - `BA111` Sonstige, `BuffKMB`=`Tools!BG45` aktive Buffs.

### 9.2 KMV (CMD)
- **X119** = `Bogen!X119` = `=+AF119+AM119+AT119+BA119+BO119+BH119+BuffKMV`
  - `BO119 = 10` (Konstante, **die KMV-Basis** — als fester Zellwert, nicht im Named Range sichtbar).
  - `AF119 =+_GAB1+MönchRK` → GAB (+Mönch-RK-Bonus).
  - `AM119 =+STmod`, `BA119 =+GEmod`, `AT119 =+KMBmod` (Größe), `BH119` Sonstige,
    `BuffKMV`=`Tools!BH45`.
  - Verifiziert: bei allen Attributen 10 und Stufe-1-Kämpfer ist X119 = `10+1+0+0+0 = 11`.

> Plausibilität: korrekt. PF1e: KMB = BAB + ST-Mod + Größenmod; KMV = 10 + BAB + ST-Mod +
> GE-Mod + Größenmod (+ Sonstiges). ⚠️ **Hinweis:** Das Größen-KMV-Vorzeichen ist gegenüber
> der RK-Größe **invertiert** (Groß = +1 auf KMB/KMV statt −1 auf RK) — über die separate
> groetab-Spalte 4 (KMBmod) korrekt gelöst. **GABMeister** (`Bogen!CA119`) speist KMB/KMV
> für Begleiter/Vertraute via §3-Pfad. Multiclass über `_GAB1` (Summe) abgedeckt.

---

## 10. Fertigkeiten / Skills

### 10.1 Einzel-Fertigkeit: Gesamtwert
- Anzeige (Beispiel Zeile 207): `Bogen!DR207` =
  `=IF(CJ207="","",IF(AND(EL207="",DP207="*"),"-",+EB207+EG207+EL207+EP207+EU207))`
  → **Gesamt = Attribut-Mod (EB) + Rüstungsmalus (EG) + Ränge (EL) + Klassen-Bonus (EP) + Sonstiges (EU)**.
  `DP="*"` = nur-ausgebildet-Fertigkeit → „−" ohne Ränge.
- **EL** = Eingabezelle (Ränge, der Spieler tippt sie).
- **Attribut-Mod**: `Bogen!EB207` = `=VLOOKUP(DW207,Fertmodtab,2,FALSE)` — `DW207` hält das
  Attribut-Kürzel (ST/GE/KO/IN/WE/CH), **Fertmodtab** (`Bogen!CG215:CH220`) mappt
  Kürzel → aktuellen Attribut-Mod (Spalte 1 = Kürzel, Spalte 2 = `*mod`).
- **+3 Klassen-Bonus**: `Bogen!EP207` = `=IF(AND(CG207="X",EL207>0),3,0)` — exakt PF1e:
  +3 nur wenn Klassenfertigkeit **und** ≥ 1 Rang.
- **Rüstungsmalus**: `Bogen!EG207` = `=IF(DN207="#",RueMal,0)` — Rüstungsmalus auf
  ST/GE-gebundene Fertigkeiten (Flag `#`).

### 10.2 Klassenfertigkeits-Flag (FertigAdds)
- **FertigAdds** = `Fertig!A2:Q36`: Matrix, Zeile = Fertigkeit, Spalten = Quellen
  (Klasse 1/2/3 via `VLOOKUP(KlasseX,FerTab,col)`, Domänen, Schablone, Eigene-Override ±100).
  Flag-Spalte `O`: `O2 =IF(SUM(B2:N2)>0,1,0)` → 1 = Klassenfertigkeit (speist `CG="X"`).

### 10.3 Fertigkeitspunkte-Budget (multiclass-fähig)
- **Kla1FerPunkte** = `Fertig!BU2` = `=IF(SchablonenFP<>99,SchablonenFP,VLOOKUP(Klasse1,FerTab,37,FALSE))`
  → **FerTab Spalte 37 = Fertigkeitspunkte/Stufe** der Klasse (Kämpfer 2, Schurke 8, Barbar 4).
  `BU3`/`BU4` = Klasse 2/3. **SchablonenFP** (`Listen!IC77`) = Schablonen-Override (≠99).
- Pro-Klasse-Akkumulation (eine Zeile je Klasse):
  - `Fertig!BW2 =+Klasse1Lev*Kla1FerPunkte` (Stufen × FP/Stufe)
  - `Fertig!BX2 =+Klasse1Lev*INmod` (Stufen × **INT-Mod**, pro Klassenstufe)
- **FertPunkte** (gesamt verfügbar) = `Fertig!BY5` = `=SUM(BY2:BY4)`, je
  `BY2 =IF(L1Lev>0,0,SUM(BW2:BX2))` → Summe (FP + INT) **über alle 3 Klassen**.
- **Mensch/Lieblingsklasse +1**: **VolkFertPunkte** = `Volk!N6` =
  `=IF(ISERROR(VLOOKUP("Doppelte Begabung",Kraftliste,1,FALSE)),VLOOKUP(Volk,VolkTab,5,FALSE)*Level−IF(Volk="Mensch",LKlasseLev,0),0)`
  → VolkTab Spalte 5 = 1 für Mensch → +1 FP/Stufe (×Stufe), unterdrückt bei „Doppelte Begabung".

> Plausibilität: korrekt. PF1e: FP/Stufe = Klassenwert + INT-Mod (min. 1), pro Klassenstufe;
> Mensch +1; +3 Klassenfertigkeit nur bei ≥1 Rang. Vollständig multiclass-aware (Summe über BW/BX 2–4).

---

## 11. Bewegung / Belastung (Tragkraft)

### 11.1 Grund- und Rüstungsbewegung
- **Bewegung** (unbelastet) = `Volk!N16` = `=SUM(N11:N15)+BuffBew`,
  `N11 =VLOOKUP(Volk,VolkTab,3,FALSE)` (**VolkTab Spalte 3 = Grundtempo** in Metern, Mensch/Elf 9 m).
- **BewegungRüstung** (gerüstet) = `Volk!O16` = `=SUM(O11:O15)+BuffBew`,
  `O11 =VLOOKUP(Volk,VolkTab,4,FALSE)` (**Spalte 4 = reduziertes Tempo**, Mensch/Elf 6 m;
  Zwerg bleibt 6 m — Rüstung verlangsamt Zwerge nicht). Die 9→6 m (30→20 ft) Reduktion ist
  in der Tabelle hinterlegt, nicht zur Laufzeit berechnet.
- **BewegungsMod** = `Fertig!CA7` = `=SUM(CA2:CA4)+IF(CD4+CD5+CD6>0,3,0)+CD8+CD9+CD10`,
  `CA2 =VLOOKUP(Klasse1,FerTab,39,FALSE)+CB23` → **FerTab Spalte 39 = Klassen-Tempobonus**
  (Barbar +3 m); CD-Terme = Domänen/Talente.
- **BuffBew** = `Tools!AM45` (aktive Tempo-Buffs).
- Anzeige: `Bogen!CY22 =+Bewegung` (Grund), `Bogen!DR22 =IF(BewegungRüstung=0,"",BewegungRüstung)` (gerüstet).

> **Einheit:** Tempi in **Metern** (dt. PF1e: 9 m = 30 ft, 6 m = 20 ft).

### 11.2 Tragkraft (STR → max. Last)
- Effektive STR: `Listen!IV7 =+ST+TrageST` (`TrageST`=`Bogen!U444`).
- **Leichte Last** = `Listen!IV8` = `=TRUNC(VLOOKUP(IV7,Attributtab,13,FALSE)*Gewichtmod,0)`;
  Mittel = `IV9` (Attributtab Sp. 14); **schwere** = `IV10` (Sp. 15).
- **Attributtab** Spalten 13/14/15 = leichte/mittlere/schwere Maximallast (lbs) nach STR
  (PF1e-Tabelle: STR 10 → 33/66/100; STR 15 → 66/133/200; …).
- **Gewichtmod** = `Volk!N4` = `=VLOOKUP(Groekat,groetab,3,FALSE)` (Größenmultiplikator:
  Mittel ×1, Klein ×0.75, Groß ×2 …).

### 11.3 Aktuelle Last (Belastung)
- **Belastung** = `Bogen!AP425` = `=IF(ST=0,0,SUM(AK292:AO424)+SUM(BN249:BT274))`
  — Summe Ausrüstungsgewichte + getragene Rüstung/Schild.

### 11.4 Belastungskategorie & Wirkung
- Kategorie-Test (Beispiel): `Mönchlast` = `Fertig!BX22` = `=IF(ST=0,0,IF(OR(Belastung>Leichte,BX20>0),1,0))`.
- **maxgemod** (max. GE-Bonus auf RK) = `Bogen!BU279` = `=IF(maxGEMaluskorrigiert=0.1,0,maxGEMaluskorrigiert)`
  ← `maxGEMaluskorrigiert`=`Waffe!KP28`, getrieben durch die **getragene Rüstung**
  (`Ruesttab`/`Schildtab` Spalte 4 = Max-Dex), nicht durch die Belastungskategorie.

> ⚠️ **Ambiguität / unvollständige Regelabbildung (Bitte mit Nutzer klären):**
> 1. Die **mittlere/schwere Last** scheint **nicht** in `BewegungRüstung` (nur getragene
>    Rüstung über VolkTab Sp. 4) oder `maxgemod` (nur Rüstungs-Max-Dex) einzufließen. PF1e
>    würde bei mittlerer Last Tempo 30→20, Max-Dex +3, Malus −3 und bei schwerer Last −6
>    erzwingen. Diese **lasten­abhängige** Penalisierung fehlt offenbar bzw. ist nur für den
>    Mönch-Bonus-Check verdrahtet.
> 2. TP werden nicht automatisch summiert (siehe §5).
> 3. Mehrere RK/Save-Zusatzspalten (`NatRue`, `Ablenkung`, `TempRK`, `AT/BA/BH`-Spalten) sind
>    **Eingabe-/Effektzellen** ohne Formel — beim Reimplementieren als manuelle Felder bzw.
>    Buff-Aggregat behandeln.

---

## 12. Berechnungs-Abhängigkeitsgraph (Kurzfassung für die Web-App)

```
Eingaben: Volk · {Klasse1..3, Stufe1..3} · {ST,GE,KO,IN,WE,CH} (+tmp,+Buffs) · Größe
   │
   ├─ Attribut-Mods  STmod…CHmod = IF(tmp,"",modOf(raw+buff))           [§1]
   │
   ├─ Klassen-Nr (Klatab) ──► Progressionsband Zeile = Nr*20+Stufe       [§2]
   │      ├─ C-Spalte ► _GAB1=Σ ► Grundgab/GAB ► (KMB,KMV)               [§3,§9]
   │      ├─ G/H/I ► Basis-Saves Σ ► +Mod(GE/WE/KO)+Buff = Final-Save    [§4]
   │      ├─ FerTab Sp.37 ► FP/Stufe ; Sp.38 ► TW ; Sp.39 ► Tempobonus   [§5,§10,§11]
   │      └─ ax ► Casting-Mod ► Konzentration                            [§6]
   │
   ├─ Größe (groetab): Sp.2 Groemod(RK) · Sp.3 Gewichtmod · Sp.4 KMBmod   [§7,§9,§11]
   │
   ├─ RK = 10 + Rüstung + Schild + min(GE,maxDex) + Größe + Nat + ...     [§7]
   ├─ INI = GEmod + INIBonus(Talente)                                    [§8]
   └─ Bewegung/Belastung: VolkTab Sp.3/4 + Mods ; Tragkraft = Attributtab Sp.13-15 × Gewichtmod  [§11]
```

**Reimplementierungs-Empfehlung:** Den 20-Zeilen-Klassen-Datenblock (§2) und die Tabellen
`Attributtab`, `groetab`, `VolkTab`, `FerTab`, `SchablonenTab` als **statische Daten**
übernehmen; die `INDIRECT`/`VLOOKUP`-Indirektion durch einfache Array-/Map-Lookups ersetzen.
Den Temp-Override- und Buff-Aggregationspunkt (`Tools!*45`-SUMIF) als zentralen Effekt-Layer modellieren.
