# 05 – Infrastruktur- / Support-Blätter (Listen, Tools, Eigene, Speicher, Einstellungen u. a.)

Dokumentiert die **Nachschlage-, Hilfs- und Datenhaltungs-Blätter**, die die
Berechnungsengine (§01–§04) mit Stammdaten versorgen und den Charakter speichern.
Pro Tabelle: benannter Bereich · Zelle/Range · Inhalt · Mechanik · ggf. Ambiguität.

> Quellen wie in §01: Werte = `sheets_values/<Sheet>.csv`, Formeln =
> `sheets_formulas/<Sheet>.tsv`, Namen = `named_ranges.json`. A1-Notation;
> benannte Bereiche **fett**.
>
> ⚠️ **Extraktions-Hinweis (global):** Die `sheets_values/*.csv` sind auf die
> **letzte berechnete, nicht-leere** Zeile/Spalte getrimmt. `Tools.csv` endet z. B.
> bei Zeile 602, obwohl `workbook_overview` `max_row=867` meldet und benannte
> Bereiche bis Zeile 654 reichen (`ZustandTab` = `Tools!I625:L654`). Solche Tabellen
> sind im Wert-CSV **leer/abgeschnitten**, in der Originaldatei aber vorhanden. Für
> die Web-App müssen diese Inhalte ggf. direkt aus der `.xlsx` nachgezogen werden.
> Betroffen u. a.: `ZustandTab` (Tools 625–654), Teile von `Listentab`/`spruchtab`.

---

## 1. Blatt **Listen** (versteckt · 8320 Zeilen × 257 Spalten · Spalte A…IW)

Das zentrale „Datenbank"-Blatt: 266 benannte Bereiche, Catch-all für alle
Nachschlagetabellen. Layout ist nach Funktionsgruppen in Spaltenbänder geordnet.

### 1.1 Würfeltabellen (Spalten HN–HV, ~Zeile 4–22)
Einzelwürfe per `RAND()`, Summen per `SUM`.
- Einzelwürfel: **Dice4**=`HN4` `=ROUNDDOWN(RAND()*4+1,0)`, **Dice6**=`HO4`,
  **Dice8**=`HP4`, **Dice10**=`HQ4`, **Dice12**=`HR4`, **Dice20**=`HS4`,
  **Dice100**=`HT4` (analog).
- Mehrfachwürfe (Summen über die Einzelwurf-Spalten): **_2w6**=`HO14`=`SUM(HO4:HO5)`,
  **_3w6**=`HO15`, … **_10w6**=`HO22`=`SUM(HO4:HO13)`; ebenso **_2w4**, **_2w8**,
  **_2w10**, **_2w12**, **_2w20**, **_2w100**…**_6w100**, **_3w20**, **_5w20** usw.
- Zweite Würfelgruppe **_2w4_2…_2w12_2** (`HV4:HV8`) für unabhängige Zweitwürfe.

### 1.2 Größentabelle / Belastungs-Größenmod
- **groetab** = `Volk!A61:G69` (nicht auf Listen!). 9 Kategorien Kolossal→Mini.
  Spalten: A=Name, B=Größen-Mod (AC/Angriff, Kolossal −8 … Mini +8), C=Tragkraft-Faktor
  (×16 … ×0.125), D=Spez-Mod, E=Flugmod, F=Raum-Faktor, G=KMB/KMV-Mod (−16…+16).
- **Gewichtmod** = `Volk!N4` = `VLOOKUP(Groekat,groetab,3,FALSE)` — Tragkraft-Skalierung.
- **GroeKatSchabListe** = `Volk!D74:I828` — Größen-/Schablonen-Korrekturliste.
- **Gr_GewTab** = `Listen!GX83:HA156` — Volk/Geschlecht → Default-Größe, -Gewicht.
  Zeilen `MenschM/MenschW/ElfM/…`, Spalten GY/GZ/HA = Größe/Gewicht-Werte.

### 1.3 Attribut-Modifikator- & Tragkrafttabelle
- **Attributtab** = `Listen!IE5:IS54`. Spalte 1 (IE) = Attributwert 1…50,
  **Spalte 2 (IF) = Modifikator** (PF1e `(Wert−10)/2` abger.), **Spalten 13/14/15
  (IQ/IR/IS) = leichte / mittlere / schwere Last** in lbs (Wert 10 → 33/66/100).
  Zentrale Quelle für alle Attribut-Mods (siehe §01.1) und die Belastungsschwellen.
- **AttKosten** = `Listen!GZ28:HA39` — Punktekauf-Kosten (Wert 7=−4 … 18=+17;
  Standard-PF1e-Pointbuy).

### 1.4 Fertigkeiten (SKILL-Liste) → liegt auf **Fertig**, nicht Listen
- **FerTab** = `Fertig!AE2:BQ131`. **Matrix Klasse × Fertigkeit.**
  - Spalte AE = **125 Klassen-/Archetyp-/Gefährten-Zeilen** (Grundklassen, Prestige,
    „Tier Gefährte", NSC-Klassen Adeliger/Experte/Krieger…).
  - **Kopfzeile 1, Spalten AF–BN = 35 Fertigkeiten** (Akrobatik, Auftreten, Beruf,
    Bluffen, … Wissen(Adel..Religion), Zauberkunde). Zellwert `1` = Klassenfertigkeit
    für diese Klasse.
  - **BO** = Fertigkeitspunkte/Stufe, **BP** = Trefferwürfel, **BQ** = Bewegungsmod.
- **Fertmodtab** = `Bogen!CG215:CH220` — kleine Mod-Hilfstabelle auf Bogen.
- Weitere `FertTab*`-Blöcke auf Fertig: **FertTabDom** (`AE136:BP154`),
  **FertTabArche** (`AE433:BP582`) — Domänen-/Archetyp-spezifische Skill-Zusätze.

### 1.5 Zustände (Conditions) → liegen auf **Tools**
- **ZustandTab** = `Tools!I625:L654` (30 Zeilen), **ZustandListe** = `Tools!I625:I654`
  (nur Namens-Spalte, für Dropdown). ⚠️ Im Wert-CSV leer (siehe Extraktions-Hinweis).
  Spalten J/K/L = numerische Mods je Zustand.

### 1.6 Talente (FEAT-Liste) → liegt auf **ZauberListen**
- **Talentliste** / **Talente** = `ZauberListen!BB8267:BB11914`.
  **≈ 3613 Feat-Einträge** (Spalte BB), alphabetisch ab „Aasfresser". Suffixe
  `(WZ)`=Wesenszug, `(NT)`/`(AF)` markieren Sonderformen.
- **TalenteAuswahlListe** = `Bogen!DP352:ET414` — die im Bogen wählbaren Talent-Slots
  (gefiltert auf den Charakter).

### 1.7 Effekte (temporäre Größen-/Kampfeffekte)
- **Effliste** = `Listen!HC26:HC38` (Namen): vergrößert, verkleinert, Kampfrausch,
  Star./Mäch. Kampfrausch, Erschöpft, Heftiger Angriff(srausch), Vergrößert/Verkleinert Lg.
- **EffTab** = `Listen!HC27:HR39` (16 Spalten Mods). Die zahlreichen `*Eff1..5`-Named
  (z. B. **STEff1**=`HV29`=`VLOOKUP(HV26,EffTab,2,…)`, **GEEff**, **TWEff**, **WKatEff**,
  **NKSWEFF**, **NKTWEFF**) ziehen pro Waffenslot 1–5 die Effekt-Mods (ST/GE/Trefferwurf/
  Waffenkategorie/Schaden) aus EffTab. → Effekt-Engine analog zu Buffs (siehe §2).

### 1.8 Belastung / Encumbrance
- **Belastung** = `Bogen!AP425` = `IF(ST=0,0,SUM(AK292:AO424)+SUM(BN249:BT274))`
  — Summe aller getragenen Gewichte (Bogen-Inventar).
- **ARGewicht** = `Ausrüstung!T2` = `ROUND(SUM(T3:T52),1)` — Ausrüstungsgewicht.
- Schwellen kommen aus **Attributtab** Sp. 13/14/15 × **Gewichtmod** (Größe).
  Hilfszellen **Leichte/Mittlere/schwere** (`Listen!IV8:IV10`) und **…2** (`IW8:IW10`).

### 1.9 Geld / Münzen
- **hundert** = `Listen!GQ9:GQ107` — Zähl-/Umrechnungsliste.
- **PrGrZahl** = `Auswahl!AD75` (auf Auswahl, Preis-Größenberechnung über `BonusTab`).
- Münz-Umrechnung (KM/SM/GM/PM) primär auf Ausrüstung/Bogen (siehe §03/04).

### 1.10 Gefährten / Monster (Begleiter)
- **TGTab** = `Volk!R7:S14` — Begleiter-**Typen**: 0=Leer, 1=Vertrauter, 2=Verb.
  Vertrauter, 7=Tiergefährte, 3=Ungeziefer-, 4=Monster-, 5=Eidolon, 6=Pflanzengefährte.
- **TierGFListe** = `Volk!W3:AU202` — **200 Tiergefährten** (Adler, Affe, Bär … ab
  Zeile 4; W3 = Überschrift), Spalten X–AU = Werteblock je Begleiter.
- **EidolonTab** = `Listen!HR89:HS108`, **EPtab** = `Listen!HV89:HY108` (Eidolon-/EP-Tab.),
  **VertrauterRKTab** = `Listen!HO115:HP134`. Eine eigene `MonsterTab` existiert **nicht**
  als benannter Bereich (Monster-Stammdaten stehen auf Tools, A262:ae328 / A414:ae491).

### 1.11 Alter
- **Altertab** = `Listen!HD90:HM126` — Volk → Alters-Schwellen. Spalten: Volk, dann
  Modifikatoren für Erwachsen / Mittelalt / Alt / Ehrwürdig + Max-Würfel (z. B. Elf
  `11,15,31,110,175,263`). **setalter** = `HI134` schlägt mit `Altertab` nach.
- **AlterListe** = `Listen!HG3:HG7`, **Alter2Tab** = `HG3:HI7`: Stufen Erwachsen,
  Mittelalt, Alt, Ehrwürdig, Maximal (→ Tools-Altersrechner, §2.3).

### 1.12 Klassen-/Volk-/Domänen-Textmaschinerie (Auszug)
- **Klatab** (Bogen→Klasse-Verweis, §01), **KlaTextTab** = `Listen!FO7:GO1128`,
  **VolkTextTab** = `Listen!FH7:FL442`, **DomKlatab** = `Listen!ET18:FA162`,
  **DomTab** = `CN11:CP566`, **stunktab** = `DU11:EO494`, **SchablonenTab** =
  `HC47:IC73` (+ `Schablone…`-Named für Größenschablonen wie Untote). Diese erzeugen
  die langen Fließtexte (Klassen-/Volks-/Domänenbeschreibung) und gehören thematisch
  zu §02; hier nur als Verortung.
- **LngTab** = `Listen!GZ4:HA6`, **LngListe** = `GZ5:GZ6`, **Lng** = `HA8` —
  Sprachumschaltung (Deutsch/…), gespeist aus `Einstellungen!C6` (siehe §5).
- **ListeWaffen** = `Listen!F3:BU166`, **ListeRuest** = `F168:BU200`,
  **ListeSchild** = `F202:BU220` — gefilterte Waffen-/Rüstungs-/Schild-Auswahllisten
  (Detail-Stammdaten auf Waffe/Ausrüstung, §03/04).

---

## 2. Blatt **Tools** (sichtbar · 602+ Zeilen × 139 Spalten · viel gemergt)

Spieler-Werkzeugkasten: Buff-/Effekt-Manager, Würfler, Alters-/Hilfsrechner,
Druck-Auswahl. 40 benannte Bereiche.

### 2.1 BUFFS — temporäre Effekte, die direkt in den Bogen einrechnen
**Eingabebereich** `Tools!AK18:BH44` (27 Buff-Slots, Kopfzeile 17):
| Spalte | Kopf | Bedeutung |
|---|---|---|
| AK | „Was" | Name des Buffs (Freitext, Slot-Bezeichnung) |
| **AL** | „An=1" | **Aktiv-Flag**: `1` = wirkt, sonst aus |
| AM | Bew. | Bewegungs-Mod |
| AN–AS | ST/GE/KO/IN/WE/CH | Attribut-Buffs |
| AT/AU/AV | Trefferwurf Allg/NK/FK | Angriffs-Boni |
| AZ | RK | Rüstungsklasse |
| BA/BB/BC | Ref/Will/Zäh | Rettungswurf-Boni |
| BD–BH | RwSpez/TP/SR/KMB/KMV | Spezial-RW-Text, Trefferpunkte, Zauberresistenz, KMB, KMV |

**Aggregation (Zeile 45):** Jeder Stat hat einen Named, der nur die **aktiven** Slots
summiert: **BuffST** = `AN45` = `SUMIF($AL18:$AL44,1,AN18:AN44)`; analog **BuffGE,
BuffKO, BuffIN, BuffWE, BuffCH, BuffBew, BuffRK, BuffRef, BuffWil, BuffZäh, BuffTP,
BuffKMB, BuffKMV, BuffTWAllg/NK/FK, BuffSWAllg/NK/FK**. Text-Buffs (**BuffRwSpez**=`BD45`,
**BuffSR**=`BF45`) konkatenieren die Slots.
→ **Mechanik:** Der Bogen liest ausschließlich die `Buff*`-Aggregate (z. B. wird der
Attribut-Buff `ST+BuffST` **vor** dem Mod-Lookup addiert, siehe §01.1). Für die Web-App:
Buff = `{name, active, st,ge,ko,in,we,ch, bew, twAllg/Nk/Fk, rk, ref,will,zäh, tp,sr,kmb,kmv, rwText}`; Engine summiert die aktiven.
- **Verstärkungen** (Waffen/Rüstungs-Verzauberungen) hängen mit **Eigene_Verstärkungen**
  zusammen (Link „zu Eigene Verstärkungen" in `AK16`).

### 2.2 EFFEKTE (Druck-/Referenzlisten) & Zustände
- **ZustandTab/ZustandListe** = `Tools!I625:L654` — 30 Zustände (Conditions) mit
  Mods, gespiegelt als Skill-/Mod-Quelle (⚠️ im Wert-CSV leer).
- **ToolListe** = `Tools!AH2:AI19` — Druck-Module mit ihrem Zeilenbereich:
  Effekte+Kräfte (`A15:ae83`), Aktionen im Kampf (`A492:ae588`), Verbündete der Natur
  (`A189:ae261`), Monster herbeizaubern (`A262:ae328`), Wetter+Gefahren (`A329:ae413`),
  Monsterregeln (`A414:ae491`), Gifte (`A84:ae188`). Start/Ende-Marker je Sektion:
  Named **S_Effekte/E_Effekte, S_Gifte/E_Gifte, S_Monster/E_Monster, S_Verbündete,
  S_Wetter, S_Monsterregeln, S_Kampf** (`=ROW()`). Dies sind **statische Regel-Cheatsheets**
  zum Ausdrucken, keine Charakterdaten.

### 2.3 Alters-, Linear- & Meisterarbeits-Helfer
- **Alters-Rechner:** `Tools!AK7` = `IF(AO4="Erwachsen","Anfangsalter:","Alter")`;
  greift auf **AlterListe/Alter2Tab/Altertab** (§1.11) zu, um aus Volk + Alterskategorie
  ein Würfel-Alter zu erzeugen.
- **Linearwert-Helfer:** **LinearListe** = `Listen!HK3:HK4` (`Linear`/`Unabhängig`),
  **Linearwert** = `Listen!HD10` = `IF(HE132="Linear",0,1)` — schaltet zwischen
  linearer und tabellengebundener Wertentwicklung.
- **Meisterarbeit:** **MWListe** = `Listen!HK6:HK7` (`M`/`W` = Meisterarbeit ja/nein),
  **Nulleins** = `Listen!HK13:HK14` (`1`/`0`) als generischer Ja/Nein-Toggle für Dropdowns.

---

## 3. Blatt **Eigene** (sichtbar · 677/708 Zeilen × 203 Spalten · 3890 gemergt)

**Benutzer-Eigeninhalte.** Der Spieler trägt hier homebrew Stammdaten ein; die
Haupt-Stammblätter referenzieren diese Zeilen, sodass sie in den Auswahllisten
erscheinen. 23 benannte Bereiche (Sektions-Anker).

| Sektion (Named) | Anker | Inhalt / Spalten (Kopf) |
|---|---|---|
| **Eigene_Klassen** | `A8` | Klasse1/Klasse2 (Sp. A=Slot, C=Name, F=TW/Trefferwürfel, G=Bewegungsmod ±m/Runde, J=Zauberspruch-Liste, K=Magie/Attribut-Bonus). |
| **Eigene_Völker** | `A60` | Völker, dazu Slots **EVolk1…EVolk10** (`A64:A73`, z. B. „Sukkubus"). |
| **Eigene_Sprüche** | `A75` | Eigene Zaubersprüche (Spalte U → `ZaBesch`-Lookup, AE/AU = Beschreibung). |
| **Eigene_Spruchlisten** | `S75` | Eigene Spruchlisten; **EListe1**=`U79`, **EListe2**=`AK79`. |
| **Eigene_Waffen** | `BE8` | Eigene Waffen (Spaltenblock ab BE). |
| **Eigene_Rüstungen** | `BD44` | Eigene Rüstungen. |
| **Eigene_Schilde** | `BD58` | Eigene Schilde. |
| **Eigene_Verstärkungen** | `CZ2` | Eigene Waffen-/Rüstungs-Verzauberungen (→ Buff/Effekt-System §2.1). |

**Merge-Mechanik:** Die Stammblätter ziehen Eigene-Zeilen per **direkter Zellreferenz**
ein (kein dynamisches Append). Belegt in `sheets_formulas/`: **Volk, Klasse, Waffe,
ZauberListen, Listen, Fertig, Info** enthalten Formeln wie `…Eigene!BL27 … Eigene!BL41`
(je 8 Treffer ⇒ feste Anzahl reservierter Eigene-Zeilen, die an die jeweilige Liste
angehängt sind). D. h.: Es gibt eine **feste Obergrenze** an Custom-Einträgen je Kategorie;
leere Eigene-Zeilen erzeugen leere Listeneinträge.
→ **Web-App:** Eigene-Inhalte als eigene Tabelle modellieren und beim Listenaufbau an
die jeweilige Stammliste *anhängen* (statt fester Referenzslots — Limit aufheben).
⚠️ Ambiguität: Genaue Spaltenbelegung je Custom-Kategorie (welche Spalte = welcher
Werteintrag) muss beim Implementieren der jeweiligen Liste (§02/§03) verifiziert werden;
hier nur die Anker/Mechanik.

---

## 4. Blatt **Speicher** (versteckt · 5010 Zeilen × 100 Spalten · KEINE Formeln, reine Daten)

**Der Charakter-Speicher (Save/Load-Lager).** Reine Werte, **kein** einziger
benannter Bereich, **keine** Formel im ganzen Blatt; auch **kein** anderes Blatt
referenziert `Speicher!` per Formel. ⇒ Lesen/Schreiben erfolgt **ausschließlich über
ein VBA-Makro** (im extrahierten Material nicht enthalten). Die im Task genannten
Namen `MasterLager/Lager/Lagernr/SchabloneLager…` existieren **nicht** als Named
Ranges — sie sind Makro-/VBA-interne Variablen.

**Layout — Spalten = Speicherslots, Zeilen = Charakterfelder:**
- Es gibt **bis zu 100 Slot-Spalten (A…CV)**. Belegt im aktuellen Stand:
  **80 Slot-Titel** in Zeile 3 (bis Spalte CV), **68 mit Charakternamen** in Zeile 6
  (bis CH) — der Rest sind reservierte/leere Slots. ⇒ Praktisch **~68–80 Speicherplätze**.
- **Ein vollständiger Charakter = eine Spalte**, vertikal serialisiert über bis zu
  **5010 Zeilen** (dünn besetzt — pro Charakter ~150–200 belegte Felder).
- **Kopf:** `A1`=`alle`, `A2`=`6.60` (Versions-/Format-Marker; `B2`=`66000`),
  **Zeile 3 = Slot-Bezeichnung** (Freitext, z. B. „Zorn NSC Anevia Tirabade Sch3").
- **Feld-Map (verifiziert an Spalte A):**

| Zeile | Feld | Beispiel (Slot A) |
|---|---|---|
| 3 | Slot-Label | Zorn NSC Anevia Tirabade Sch3 |
| 4 | Charaktertyp | NSC |
| 5 | Kampagne | Zorn der Gerechten |
| 6 | **Name** | Anevia Tirabade |
| 7 | **Volk** | Mensch |
| 8/9 | Region / Gottheit | Kenabres / Iomedae |
| 10 | Gesinnung | RG / CG / N … |
| 11 | Geschlecht | W / M |
| 12 | Alter | 23 |
| 13 | Größe (cm) | 170 |
| 14 | Gewicht | 165 |
| 15 | Haar | Braun |
| 16 | Augen | Braun |
| 17 | **Klasse 1** | „   Schurke" |
| 18 | **Stufe 1** | 3 |
| 19/20 | Klasse 2 / Stufe 2 | „-" / 0 |
| 21/22 | Klasse 3 / Stufe 3 | „-" / 0 |
| 25,27,29,31,33,35 | **ST, GE, KO, IN, WE, CH** (je 1 Zeile, dazwischen leer) | 12,17,10,14,8,13 |
| 37,39,… | weitere Werte (HP, Skills, Inventar, Zauber …) | dünn besetzt bis Z. 5010 |

  Die belegten Felder verteilen sich in **Blöcken** über das ganze 5010-Zeilen-Band
  (Häufung in Z. 1–500, ~1500–2000, ~2500–3000, ~4000–5000) — je Block ein logischer
  Charakterabschnitt (Stammdaten, Fertigkeiten, Ausrüstung, Zauberauswahl …).

→ **Web-App-Datenmodell:** Ein Charakter = ein flacher Schlüssel-Wert-Vektor (Zeile→Feld).
Speicher = Liste solcher Vektoren. Das transponierte Spalten-Schema des Excel (Charakter
in Spalte) ist nur ein Implementierungsdetail des VBA-Makros; für die App genügt
`Character[]` mit denselben Feldern. ⚠️ **Wichtig:** Die exakte Zeile→Feld-Abbildung über
alle ~200 Felder muss aus dem VBA-Save-Makro (nicht vorhanden) oder durch Diffen mehrerer
gespeicherter Charaktere rekonstruiert werden, bevor Save/Load 1:1 nachgebaut wird.

---

## 5. Sonstige Blätter (kurz)

### 5.1 **Einstellungen** (sichtbar · 200 Z. × 68 Sp.)
Globale Schalter. Toggle-Spalte **C**, Label in **B**. 21 benannte Bereiche.
- **Sprache:** `C6` = Sprache des Bogens („Deutsch") → **Lng** (`Listen!HA8`), **Sprache**=`N6`.
- **Anzeige-Toggles (Ja/Nein → N-Spalte 1/0):** `C4` **Nurgeübte** („nur geübte
  Waffen/Rüstungen/Schilde", **geübte**=`N4`); `C5` **Linien** auf dem Bogen; `C7/C8/C9`
  Schwarz-Weiß-Varianten (→ **Bsw**=`N7`, **BSistW**=`N8`).
- **Regelwerks-Schalter** (`B11`/`C11` „Auswahl der Regelwerke"): `C12`–`C19`
  → **Grundregeln** (Regel implizit), **Regel_Ex** (`N13`, Experten), **Regel_Ma**
  (`N14`, Ausbau Magie), **Regeln_Ka** (`N15`, Ausbau Kampf), **Regel_V** (`N16`,
  Völker), **Regel_L** (`N17`, Legenden), **Regel_AR** (`N18`, Abenteurers Rüstkammer),
  **Regel_Go** (`N19`, Golarion alle Bücher). Diese filtern Zauber-/Waffen-/Rüstungslisten.
- **Wesenszug-/Kampagnen-Schalter** `C24:C30` (Werte „immer"/„nie": Unter Piraten,
  Runenherrscher, Zorn der Gerechten, …) — schalten kampagnenspezifische Wesenszüge frei.
- **Waffen-Quellen** `C34:C40`: Ausbauregeln Kampf, Fernöstliche Waffen+Rüstungen,
  Feuerwaffen, Gladiatoren-, Primitive Waffen (`C39`=Ja), Belagerungsgeräte (`C40`=Ja)
  → **Regel_Ka_fo/fw/gl/pr/bl** (`N36:N40`).
- **Spezial** `C43` „GAB vom SC statt von Schablone" → **UntotGAB**=`N43` (greift in
  Schablonen-GAB, §02).
- **LngListe** = `Listen!GZ5:GZ6` liefert die Sprach-Dropdown-Werte.

### 5.2 **Legende** (sichtbar · 68 Z.) — Schlüssel/Abkürzungen
- **TypTab** = `I10:J26` (17 Waffen-Typkürzel: EW/EL/EE/EZ/EF einfach, KL/KE/KZ/KF
  Kriegs-, XL/XE/XZ/XF exotisch, MG magisch, EF/ZF Feuerwaffen, BG Belagerung),
  **TypListe** = `I10:I26`.
- **Spezieltab** = `I28:J42` (15 Waffen-Sondereigenschaften: A=Abwehr, B=Blockierend,
  D=Doppel, E=Entwaffnen, F=Zu Fall bringen, I=Injektion, M=Mönch, N=Nicht tödlich,
  R=Reichweite, Rk=Ringkampf, S=Streuwaffe, Sk=Schaukampf, T=siehe Text, Tö=Tödlich,
  Z=Zerbrechlich), **Spezielliste** = `I28:I42`. → Dekodiert die Kürzel der Waffenliste (§03).

### 5.3 **Info** (sichtbar · 505 Z.) — Bedienungs-/Versions-Hinweise & Hilfetexte
(referenziert Eigene; reines Doku-/Hilfeblatt, keine Berechnungslogik).

### 5.4 **Impressum** (sichtbar · 268 Z.) — Credits, Lizenz, Quellen. Keine Logik.

### 5.5 **Kompakt** (sichtbar · 70 Z. × 19 Sp.) — kompakte Bogen-Ansicht
Zieht den fertigen Charakter zusammengefasst (`B1`=„, Mensch,   Kämpfer St.1",
„Zauberbuch Kompakt", Spalten Kräfte/Effekte, Q2/R2/S2 = Klasse1/2/3). Reine
Darstellungsschicht über §01–§04 (Druck-/Übersichtsansicht).

### 5.6 **Tabelle1** (versteckt · 176 Z. × 1 Sp.) — Quellenbuch-Liste
Spalte A: Namen der Regelwerke/Almanache/Handbücher (`A1`=„__GR12 Alternativregeln",
dann „Almanach der …", „Handbuch - …"). Stamm-Liste für die Regelwerks-/Quellen-Auswahl
(verknüpft mit den Einstellungs-Schaltern §5.1 und Zauber-/Waffenquellen).

### 5.7 **Einkauf** (versteckt · 18 Z. × 47 Sp.) — privates Gruppen-Notizblatt
Freitext-Einkaufs-/Wunschliste der Spielgruppe (Spalten: Spielername A, „Plus"-Wunsch B,
Dauer C, „Minus"/Abgabe D — z. B. „Markus | gestärktes Stahlschild +2 | 4 Tage").
**Kein** Teil der Charakterlogik — Gruppen-Organisations-Artefakt; für die Web-App irrelevant.

---

## 6. Zusammenfassung für die Web-App-Implementierung

1. **Stammdaten (read-only Lookup):** Listen/Fertig/Volk/Tools/ZauberListen liefern
   Würfel, Größentabelle (`groetab`), Attribut→Mod/Tragkraft (`Attributtab`),
   35-Skill×125-Klassen-Matrix (`FerTab`), ~3613 Feats (`Talentliste`), Zustände,
   Effekte, Alters- und Gefährtentabellen. → als statische JSON-Datenbanken abbilden.
2. **Buffs/Effekte (dynamisch):** Tools-Buffmatrix → `Buff[]` mit Aktiv-Flag; Engine
   summiert aktive Slots in die `Buff*`-Aggregate (Attribut-Buffs **vor** Mod-Lookup).
3. **Eigene (homebrew):** an die Stammlisten *anhängen*; im Excel feste Referenzslots
   (Limit) — in der App dynamisch lösen.
4. **Speicher (Save/Load):** Charakter = flacher Feldvektor (Zeile→Feld), Lager = Array
   davon (~68–80 Slots), Format-Marker `6.60`. Mechanik im VBA — exakte Feld-Map muss
   noch vollständig rekonstruiert werden (⚠️ kritisch, da nicht in der Extraktion).
5. **Einstellungen:** Sprache + Regelwerks-/Quellen-Filter steuern, welche Listen-
   einträge sichtbar sind.
