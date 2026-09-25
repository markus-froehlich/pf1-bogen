# Handoff: Mobile-Redesign PF1e-Bogen (Nocturne)

Ablage im Repo: `docs/design/mobile_redesign/` (diesen ganzen Ordner dorthin kopieren).

## Überblick
Mobile-first-Redesign der bestehenden PWA (`app/src`). Alle Funktionen bleiben erhalten; es ändern sich Navigation, visuelle Sprache (dunkles „Nocturne"-Theme statt #000/#111 + Emoji) und die Art, wie Herkunft von Werten, Zustände/Buffs und Zauber je Klassentyp dargestellt werden.

## Über die Design-Dateien
`Mobile Redesign.dc.html` ist eine **Design-Referenz in HTML** – ein klickbarer Prototyp, der Aussehen und Verhalten zeigt. **Nicht** direkt übernehmen. Aufgabe ist, das Design in der bestehenden React+Vite-App mit ihren Komponenten, der Engine (`app/src/engine/*`) und dem Store (`useCharacters.js`) nachzubauen. Der Prototyp rechnet mit vereinfachten Beispieldaten (Isaure Dornwald, Halb-Elf Druide 7) – **maßgeblich bleiben Engine, `data/*.json` und AGENTS.md („1:1 wie Excel", PDF-Regelautorität)**.

Öffnen: Ordner per lokalem Server ausliefern (`npx serve .`) und die `.dc.html` öffnen. Oben rechts im Host gibt es Tweaks; ohne Host die Defaults. Tweak-Optionen (für Varianten): `access` (Navigation), `caster` (Zauber-Demo), `device`, `fontScale`, `hideOnScroll`, `navLabels`, `showDeltas`.

## Fidelity
**High-fidelity.** Farben, Typografie, Abstände, Radien und Interaktionen sind final. Pixelgenau nachbauen; Icons: Phosphor (`@phosphor-icons/react` oder Web-Font) statt Emoji.

## Design Tokens (aus `_ds/.../styles.css` – als CSS-Variablen in `index.css` übernehmen)
- Grund `--color-bg #161826`, Fläche `--color-surface #232532`, Text `--color-text #e9e9ed`, Akzent `--color-accent #9184d9`, Divider `color-mix(#e9e9ed 16%, transparent)`
- Neutral-Rampe 100–900: `#f3f5fe #e4e7f5 #cfd3e5 #b2b6ca #9397ab #75798c #595d6c #3f424d #292b31`
- Akzent-Rampe 100–900: `#f5f4ff #e7e5fe #d2cefd #b5abfc #968ae0 #796cbf #5d5294 #423a6a #2b2741`
- Semantik (neu, OKLCH passend zur Rampe): Zustand/negativ Text `oklch(0.74 0.11 25)`, Zustand-Tag-Fläche `oklch(0.33 0.07 25)` mit Text `oklch(0.9 0.05 25)`; Warnung `oklch(0.82 0.1 75)`
- Buff-Tag: Fläche `--color-accent-800`, Text `--color-accent-100`
- Schrift: Inter 400/500 (max. 500 für Überschriften). Größen: Label 11px uppercase letter-spacing .08em (neutral-500); Body 14px; Zeilentitel 15px/500; Werte 20–24px/500 tabular-nums; HP 46px/500
- Radien: 4 / 8 (`--radius-md`) / 14px (`--radius-lg`, Karten HP + Sheets); Chips 15–20px
- Schatten: `--shadow-sm: 0 0 0 1px #3f424d`, `--shadow-md`, `--shadow-lg` (siehe styles.css)
- Touch-Targets ≥ 40–44px. Primärbutton = Akzent-**Outline**, nie gefüllt. Aktive Tabs/Toggles: 2px Akzent-Linie + Glow `0 0 10px var(--color-accent)`.
- Trenner blenden an den Enden aus (48px Verlauf) – siehe `.hr` / Tabellenzeilen.

## App-Shell
- Kopf (Höhe ~60px): Avatar 40px (Initialen, accent-900/-200) + Name 17px/500 + Unterzeile „Volk · Klasse Stufe · Spieler" 12px; Tipp öffnet Charakter-Sheet (ersetzt `CharacterDrawer`). Rechts: Notizen-Icon, ⋯ (= „Mehr").
- Untere Navigation 5 Tabs: **Kampf · Char · Fähigk. · Zauber · Inventar** (Icons sword, user, list-checks, magic-wand, backpack; aktiv = fill-Variante, accent-300, Linie oben mit Glow).
- **Beim Scrollen nach unten** klappen Kopf und Navigation weg (max-height-Transition 250ms), beim Hochscrollen/oben wieder da. Sticky-Header der Fertigkeiten bleibt.
- Sheets von unten (Radius 14px oben, Griff 36×4, Backdrop 62%) statt Modals für: Zahlenfeld, Zustände, Charakterwahl, Aufschlüsselung, Anordnen, Suche.
- Schriftgröße S/M/L/XL skaliert den ganzen Inhalt (0.9/1/1.12/1.25). Bestehende `fs-*`-Klassen können bleiben; Layout muss bei XL auf 375px ohne Überlauf funktionieren (alle Flex-Kinder `min-width:0`, Texte `nowrap + ellipsis`).

## Theme „Hoher Kontrast" (umschaltbar)
Mehr → Einstellungen → **Darstellung: Standard | Kontrast** (in localStorage speichern und ins Gist-Backup über `PREF_KEYS`). Zusätzlich beim ersten Start automatisch aktivieren, wenn `@media (prefers-contrast: more)` oder `(forced-colors: active)` zutrifft. Umsetzung: nur CSS-Variablen auf der App-Wurzel überschreiben (z. B. `[data-theme="kontrast"]`), keine Komponenten ändern.
- Grund `#000000`, Fläche `#0f0f11` **plus 1px-Rand `#8f8f8f` um jede Fläche/Karte** (Trennung über Kanten statt Tonwert), Text `#ffffff`, Divider `rgba(255,255,255,.6)`
- Neutral 100–900: `#fff #fff #f2f2f2 #e6e6e6 #d6d6d6 #bdbdbd #8f8f8f #3d3d42 #2a2a2e` (gedämpfte Texte bleiben ≥ 12:1)
- Akzent `#c7bdff`; Rampe 100–900: `#fff #f1eeff #ddd6ff #d3caff #c7bdff #a99cf5 #7d6fe0 #3a2f86 #1f1850`
- Negativ/Zustand `#ff9a8f`, Tag-Fläche `#5c1109` + Text `#fff`; Warnung `#ffd84d`, Fläche `#4a3a00` + Text `#fff`
- Schatten: sm `0 0 0 1px #8f8f8f`, md `0 0 0 1px #bdbdbd, 0 6px 18px rgba(0,0,0,.8)`, lg `0 0 0 2px #fff, 0 16px 40px rgba(0,0,0,.9)`; kein Verlauf im App-Hintergrund
- Bedeutung nie nur über Farbe: Buff/Zustand-Tags tragen immer Icon (✦ / ⚠), Zustände zusätzlich Text.
- Mit Schriftgröße XL kombinierbar.
- Im Standard-Theme die semantischen Farben ebenfalls als Variablen führen: `--c-neg oklch(0.74 0.11 25)`, `--c-neg-bg oklch(0.33 0.07 25)`, `--c-neg-fg oklch(0.9 0.05 25)`, `--c-warn oklch(0.82 0.1 75)`, `--c-warn-bg oklch(0.34 0.06 70)`, `--c-warn-fg oklch(0.9 0.06 75)`.

## Responsive: Handy · Tablet · Desktop (eine App, drei Layouts)
Umschaltung nur über die **verfügbare Breite** (nicht über User-Agent), gemessen in CSS-px nach Schriftskalierung. Tweak `device` zeigt alle Zielgeräte (iPhone SE/mini/15, Android 360, iPad mini/Air/Pro 11/Pro 13 hoch+quer, Android-Tablet hoch+quer, Safari/Chrome 1024–1440).
- **Handy** (< 700px): wie unten beschrieben – Kopf + untere 5-Tab-Leiste, Sheets von unten, Ein-/Ausblenden beim Scrollen.
- **Tablet** (700–1099px, z. B. iPad hochkant, Android-Tablet hochkant): **Navigationsschiene links** (88px, Icon + Label, aktiv = accent-900-Fläche + 3×26px-Akzentstrich links mit Glow). Kampf-Tab **zweispaltig als Masonry** (Bereiche fließen in die kürzere Spalte, Reihenfolge aus „Bereiche anordnen"; Umsetzung per CSS-Grid mit `grid-auto-rows:2px` + gemessener Höhe via ResizeObserver, oder zwei Flex-Spalten). Andere Tabs einspaltig, max. 820px, linksbündig. Attribute 3 Spalten. Sheets werden **Seitenpanel rechts** (400px, 16px Abstand, Radius 14px, Backdrop 38 %), Toast unten rechts 360px. Kein Ausblenden beim Scrollen.
- **Desktop / Tablet quer** (≥ 1100px, z. B. iPad quer, Safari/Chrome): Schiene links + **Dashboard mit 3 unabhängig scrollenden Spalten** `1.05fr | 1fr | 0.95fr`: links immer **Kampf**, rechts immer **Zauber**, Mitte wählbar über die Schiene (**Char · Fähigk. · Inventar · Mehr**). Spaltentrenner 1px neutral-900. Tastatur: **Esc** schließt Panel, **⌘/Strg + K** öffnet die Suche.
- Übergänge: Breakpoints als Container-/Media-Queries; derselbe State (aktiver Tab = Mitte auf Desktop; Kampf/Zauber-Tab fällt auf Desktop auf „Char" zurück).

### Browser-/Plattform-Details
- **iOS Safari**: alle Eingabefelder **≥ 16px** Schrift (sonst Auto-Zoom beim Fokus). `height: 100dvh` statt `100vh`; `padding: env(safe-area-inset-*)` für Notch/Home-Indikator (untere Leiste) und iPad-Ränder; `viewport-fit=cover` im Meta-Viewport. `-webkit-tap-highlight-color: transparent`. `overscroll-behavior: contain` auf Scroll-Containern/Panels (kein Durchscrollen/Pull-to-Refresh im Panel).
- **Hover** nur für Zeigergeräte: Hover-Stile in `@media (hover:hover) and (pointer:fine)`, sonst bleiben auf Touch „klebrige" Hover-Zustände. Touch-Ziele ≥ 44px bleiben auch auf Desktop.
- **Chrome/Android**: `inputmode="numeric"/"decimal"` für Zahlen; Scrollbalken dezent (`scrollbar-width: thin`, `scrollbar-color: var(--color-neutral-800) transparent`); PWA-`theme-color` = `#161826`.
- **Schriftgröße** (S–XL) wirkt vor der Breakpoint-Berechnung: iPad hochkant mit XL fällt z. B. korrekt ins Tablet-Layout, Handy mit XL bleibt Handy.
- Querformat Handy: bleibt Handy-Layout (Breite < 700 nach Skalierung meist knapp darüber → dann Tablet-Layout mit Schiene – gewollt).

## Bearbeiten, Hinzufügen, Rückgängig (überall gleich)
Ein **Bearbeiten-Sheet** (Handy: von unten; Tablet/Desktop: Seitenpanel rechts) für alle Listen. Aufbau immer: Titel (+ „Löschen" bei bestehenden Einträgen) → optionale **Vorlagen-Chips** → Felder → **Vorschau** (berechnetes Ergebnis) → Abbrechen | Speichern. Feldtypen: Text, Mehrzeilig, Stepper (−/Wert/+, 40px), Chips (Einfach- oder Mehrfachwahl), Bonus-Liste.
- **Buff** (Kampf → Buffs → „Buff anlegen" / Stift je Zeile): Name, Dauer, **Bonus-Typ** (Verbesserung, Moral, Glück, Kompetenz, Heilig, Widerstand, Ablenkung, Ausweichen, Größe, Ungetypt), Liste „Ziel + Wert" (ST…CH, Angriff, Schaden, RK, Nat. Rüstung, Ablenkung, Ausweichen, Zäh/Ref/Wil, Alle RW, Initiative, Fertigkeiten). Vorlagen: Segen, Heldenmut, Bärenstärke, Katzenhafte Anmut, Rindenhaut, Schild des Glaubens, Göttliche Gunst, Kampfrausch. **Stapelregel:** gleicher Typ + gleiches Ziel → nur der höchste zählt; Ausweichen, ungetypt und alle Mali stapeln. Überlagerte Boni zeigt die Buff-Zeile als „stapelt nicht: Angriff (Moral, Heldenmut)". Die Aufschlüsselung verteilt Buffs in Reihenfolge (Summe stimmt immer).
- **Ressource** (Kampf → Ressourcen): Vorschläge je Klasse als Chips (aus ResourcesPanel-Logik), Name, Quelle, Maximum, **Zurücksetzen: Rast / Neuer Tag / Nie**. ≤ 6 → Punkte, sonst Zähler. „Rast" setzt alles außer „Nie" zurück. Zauberstäbe = Ressource mit „Nie" (oder eigener Bereich im Zauber-Tab).
- **Waffe** (Kampf → Angriffe → „Waffe hinzufügen" / Stift): Auswahl aus Waffenliste (377) setzt Würfel, Krit, Art, Schadensart, Reichweite, ST-auf-Schaden; dann Name, Nah/Fern, Verzauberung, Angriff+, Schaden+, Zusatzschaden, Meisterarbeit/Waffenfinesse/Nebenhand/Zweihändig, Notiz. Vorschau „Angriff +6/+1 · 1W8+2 · ×3". Iterative Angriffe ab GAB 6.
- **Ausrüstung** (Kampf → „Verteidigung · Bewegung"): Art Rüstung/Schild/Ring/Umhang/Sonstiges, Liste aus Rüstungs-/Schild-/Ringdaten; Rüstungs-/Schildbonus, Verzauberung, Meisterarbeit (RM −1 weniger), Max. GE, Kategorie (mittel/schwer → Bewegung 6 m), Rüstungsmalus, Zauberpatzer; Ring: Ablenkung; Umhang: Widerstand. Fließt in RK/Berührung/Fuß, KMV, Rettungswürfe, Fertigkeiten (RM), Bewegung.
- **Bereich „Verteidigung · Bewegung"** (neu, sortier-/einklappbar): Ausrüstungsliste, Größe (Auswahl, setzt RK/Angriff/KMB/KMV), Fliegen/Schwimmen/Klettern/Graben (m), Schadensreduzierung, Resistenzen, Immunitäten (Text).
- **Sonstiges-Felder**: in der Aufschlüsselung von RK, Initiative, KMB, KMV, Zäh/Ref/Wil und jeder Fertigkeit: Stepper „Sonstiges" + Notiz. Wert erscheint als eigene Zeile „Sonstiges · Notiz". Entspricht `init_misc`, `*_misc`, `*_note`, `rk_misc` usw. im Store.
- **Kontakt / Sonderfähigkeit** (Mehr): Karte antippen = bearbeiten; „anlegen"-Buttons; Verhältnis- bzw. Quellen-Chips.
- **Klasse**: Klassenkarte antippen → Archetypen (Mehrfachwahl, max. 3); „Weitere Klasse" → Klasse + Stufe (Multiklasse, eigene Karte mit ×).
- **Rückgängig**: Löschen, Schaden/Heilung/Temp/NL, EP, Rast und Klasse entfernen zeigen einen Toast mit „Rückgängig" (5 s). Stellt den vorherigen Wert wieder her.
- **Leerzustände**: jede Liste zeigt „Keine … angelegt." + Hinzufügen-Zeile; Zauber-Tab ohne Zauberklasse zeigt eine Karte mit Erklärung und „Ressource anlegen" (Demo: Tweak `caster = keiner`).
- **Zahlenfeld**: Schnellwerte-Chips über der Tastatur (zuletzt benutzte + 1/5/10).

## Charakter anlegen (Assistent)
Charakter-Sheet → „Neuer Charakter": 4 Schritte mit Fortschrittsbalken. 1 Name + Spieler · 2 Volk (Liste mit Größe, Bewegung, Attributsmods, Merkmalen; alle 38 + Homebrew) · 3 Klasse (TW, FP, GAB, gute RW, Kurzprofil) · 4 Attribute per **Kaufsystem 15/20/25** (Kosten 7=−4 … 18=17, Restpunkte farbig, Volksmods automatisch, Wahl-Bonus +2 bei Mensch/Halb-Elf/Halb-Ork). „Weiter" ist gesperrt, bis der Schritt gültig ist. Ergebnis: neuer Charakter in der Liste (`newChar()`), Stufe 1.

## Kleine Anpassungen
Abschnitts-Labels 12px, neutral-400 (vorher 11px, zu blass). RK-Wert 32px (wichtigster Wert), übrige Kacheln 24px.

## Screens

### Kampf (`CombatTab.jsx` + Panels)
Bereiche, jeweils **ein-/ausklappbar** (Tipp auf Überschrift, Caret rotiert) und **sortierbar** über Button „Bereiche anordnen" → Sheet mit ↑/↓ + Auge. Eingeklappt zeigt die Kopfzeile eine Zusammenfassung (z. B. „41/58 TP", „RK 18 · Init +2 · KMB +6"). Persistenz wie heute (`useSectionOrder`, `pf1_combat_order` / collapsed).
1. **Trefferpunkte**: Karte (radius-lg, shadow-sm). Aktuell 46px + „/ Max", Temp-Tag. Buttons „Schaden" (secondary) / „Heilen" (primary) → Zahlenfeld-Sheet mit Modus-Segment Schaden/Heilung/Temp./NL, Tastenfeld 3×4 (52px hoch), Bestätigen-Button mit Klartext („12 Schaden nehmen"). Schaden zieht zuerst Temp-TP ab. Balken 6px: Akzent, ≤50 % Warnung, ≤25 % rot. Meta: „Tot bei −KO" · „NL-Schaden n".
2. **Kampfwerte** 3×2 Kacheln: RK (Ber./Fuß), Initiative, GAB, KMB, KMV, Bewegung.
3. **Rettungswürfe** 3 Kacheln.
4. **Angriffe**: Zeilen je Waffe (Icon-Kachel, Name, „Nahkampf · Hieb · 18–20/×2", rechts Angriff 20px + Schaden). Iterative Angriffe als „+11/+6/+1".
5. **Zustände**: aktive als rote Chips (× entfernt) + Wirkungstext; „Bearbeiten" → Sheet mit allen 21 Chips. Verwirrt: W%-Button + Tabelle mit hervorgehobener Zeile.
6. **Buffs**: Zeilen mit Toggle-Schalter (42×24, an = Akzent-Rand + Glow).
7. **Ressourcen**: ≤6 als Punkte (antippen), sonst Zähler −/+; „Rast" setzt Tagesressourcen zurück.

**Herkunft von Werten (wichtig):** Jede Zahl mit Modifikatoren zeigt kleine Tags neben dem Wert: `✦ +2` (Buff, Akzent) und `⚠ −2` (Zustand, rot) – Icon + Farbe, damit ohne Farbe unterscheidbar. **Antippen** eines Werts (RK, Init, KMB, KMV, RW, Angriff, jede Fertigkeit) öffnet das **Aufschlüsselungs-Sheet**: Titel + Gesamt groß, dann eine Zeile je Posten (Icon · Name · Quelle · Wert): Basis, Ausrüstung, Attribut, Klasse, jeder aktive Buff, jeder Zustand einzeln, unten „Gesamt". Ersetzt die heutigen `title`-Tooltips (`DetailTag.jsx`), die auf Touch nicht funktionieren. Daten dafür: `condMods.sources`, `buffAnnot`, `combat._components`.
**Noch offen / Vorschlag:** Alle manuellen Felder (init_misc, *_misc + *_note, rk_natural/deflect/misc, speed_fly/swim/climb, dr/resist/immunity, Größe) kommen **unten in das Aufschlüsselungs-Sheet** („Sonstiges"-Feld + Notiz) bzw. für SR/Resist./Bewegung in einen eigenen einklappbaren Bereich „Verteidigung & Bewegung". Waffen-Details (Verzauberung, Angriff+/Schaden+, Zusatzwürfel, MA/Finesse/Nebenhand/FK, Notiz) und Rüstungs-/Schild-/Ring-Slots öffnen per Tipp auf die Zeile ein Bearbeiten-Sheet.

### Char (Attribute-Tab)
Identitätsliste (Name, Spieler, Volk, Gesinnung, Gottheit – Label links, Wert rechts, eine Zeile). Klassen-Karte (Name, „W8 · 4 FP/Stufe · GAB ¾", Stufe groß, Archetyp-Tags) + „Weitere Klasse". Attribute 2×3: Kürzel, Name, Mod-Pille (Akzentrand bei positiv, rot bei Zustandsabzug), Wert mit −/+ (40px), Tags ✦ → 16 (Buff auf Wert) und ⚠ Mod −1 (Zustand). Tipp auf Kürzel/Mod öffnet die Aufschlüsselung: Buff-Zeilen „Wert +4“ (zählen in den Wert), Zeile „Modifikator aus Wert 16“ (Untertitel „Grundwert 12 +4 Bärenstärke“), Zustands-Zeilen auf den Modifikator, Gesamt = Modifikator. EP: Zahl + Balken + „+ EP" (Zahlenfeld) + Tempo-Segment; Warnung wenn EP-Stufe ≠ Klassenstufe. Tiergefährte-Karte (öffnet Gefährten-Charakter). Klassenmerkmale als Chips. Person als 2-Spalten-Kacheln, Sprachen.

### Fähigkeiten (Fertigkeiten + Talente)
Segment oben: **Fertigkeiten | Talente n/4**.
- Fertigkeiten: sticky Kopf mit FP-Balken („28 / 28 · 0 frei", Farbe warn/ok/rot), Suche, Filter Alle/Klasse/Mit Rängen, Hinweis Rüstungsmalus. Zeile: Name (ellipsis) + Meta „WE · Klasse · RM · geübt", Ränge −/+ (max. Stufe), Gesamt 20px (rot bei Zustandsabzug, „—" wenn nur geübt ohne Ränge). Tipp auf Name/Gesamt → Aufschlüsselung.
- Talente: Budget-Zeile, Eingabe mit Autocomplete (≥2 Zeichen, aus `feats.json`), Karten mit Name, Typ-Tag, DB-Beschreibung, Löschen.

### Zauber – je Klassentyp (`SpellsTab.jsx`, `engine/spellSlots.js`)
Kopfkarte: „Klasse Stufe", Typ-Tag, „WE +4 · ZS 7 · Konz. +11", Regel-Hinweis, „Neuer Tag". Bei Multiklasse oben Pillen je Zauberklasse (eigene Plätze/ZS). Grad-Kacheln (Grad, verbleibend/gesamt, SG) – Grad 0 = ∞. Modi je Typ:
- **Vorbereitet, Klassenliste** (Druide, Kleriker, Paladin…): Vorbereitet | Klassenliste. Vorbereitet = Instanzen mit Kästchen „gewirkt", Duplikate erlaubt, freie Plätze als gestrichelte Zeilen. **Domänen-/Schulplatz** als eigener Platz mit Tag, Filter in der Liste.
- **Vorbereitet, Zauberbuch** (Magier, Hexe/Patron analog): Vorbereitet | Zauberbuch | Nachschlagen. Vorbereiten nur aus dem Buch; Nachschlagen → „Ins Buch" mit Kosten (Grad²×10 GM). Gegnerschule-Tag, belegt 2 Plätze. Schulplatz.
- **Spontan** (Hexenmeister, Barde, Orakel, Paktmagier…): Bekannt | Lernen. Platz-Punkte je Grad oben, „Wirken" verbraucht einen Platz; bekannt n/max, Lernen gesperrt wenn voll; Bonuszauber (Blutlinie/Mysterium) mit Tag, zählt nicht mit.
- **Hybrid** (Arkanist): Bereit | Zauberbuch | Nachschlagen; bereitgelegte Zauber spontan mit Plätzen wirken.
Werte aus `spell_progression.json` (inkl. `99`/`0.1`-Kodierung) + Bonuszauber-Formel; die Zahlen im Prototyp sind Beispiele. Zauberstäbe (`setWands`) fehlen im Prototyp noch – als eigener Bereich unter dem Zauberbuch vorsehen.

### Inventar (eigener Tab)
Münzen 4 Kacheln (PM/GM/SM/KM, direkt editierbar) + „≈ GM · Münzgewicht". Traglast-Karte: Gesamt + Stufe (LEICHT/MITTEL/SCHWER farbig) + 3 Segmentbalken. Gegenstände-Liste mit Gewicht, ×, Schnell-Hinzufügen (Name + Pfd.). Magische Slots 2×6-Raster.

### Mehr (⋯ im Kopf)
Liste: Notizen, Bekanntschaftsbuch, Sonderfähigkeiten, Gifte, Schablonen (Referenzlisten mit Suche + aufklappbarem Detail). Daten: Exportieren, Importieren, Drucken, Homebrew, Backup (Status). Einstellungen: Profil SP/SL, Schriftgröße, Links App/Browser, Sprache.

## Interaktionen & Zustand
- Transitions: 200–350ms ease (Balken width, Toggle-Knopf left, Caret rotate, Kopf/Nav max-height).
- Toast unten (neutral-800, shadow-md) für Bestätigungen, 2,2s.
- Neuer UI-State (nur lokal/localStorage, ggf. in `PREF_KEYS` fürs Gist-Backup): Reihenfolge + eingeklappte Bereiche Kampf, aktiver Zauber-Modus je Klasse, Fähigkeiten-Segment, Schriftgröße. Charakterdaten-Schema bleibt unverändert; neu nur ggf. `spellbook.book[lv]` (Magier-Zauberbuch) und `spellbook.used[lv]` (Spontan-Plätze), falls noch nicht vorhanden.

## Assets
Keine Bilder. Icons: Phosphor Regular/Fill. Schrift: Inter (Google Fonts).

## Dateien
- `Mobile Redesign.dc.html` – der Prototyp (Template + Logik in einer Datei)
- `support.js` – Laufzeit für den Prototyp (nur zum Ansehen)
- `_ds/nocturne-…/styles.css` – Token- und Komponenten-Stylesheet (Quelle der Tokens)
