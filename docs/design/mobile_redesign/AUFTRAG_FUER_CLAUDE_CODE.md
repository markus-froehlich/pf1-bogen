# Auftrag: Mobile-/Tablet-/Desktop-Redesign umsetzen

Dieser Ordner ist ein Design-Handoff. Er gehört nach `docs/design/mobile_redesign/` im Repo.

## 0. Vorbereitung
1. Falls der Ordner noch auf dem Schreibtisch liegt: `~/Desktop/design_handoff_mobile_redesign.zip` entpacken und den Inhalt nach `docs/design/mobile_redesign/` kopieren (ZIP selbst nicht committen).
2. Neuen Branch anlegen: `git checkout -b redesign/mobile-nocturne`. **Nur dort arbeiten.** Nicht auf `main` mergen, `./deploy` **nicht** ausführen.
3. AGENTS.md-Regeln gelten weiter (verbotene Begriffe – der Pre-Commit-Hook prüft das; Rechnen 1:1 wie Excel/PDF).

## 1. Verstehen
- `README.md` in diesem Ordner **komplett** lesen. Es ist die Spezifikation.
- Den Prototyp ansehen: im Ordner `npx serve .` starten, `Mobile Redesign.dc.html` öffnen. Oben über dem Gerät gibt es Umschalter für Handy/Tablet/Desktop und das Kontrast-Theme.
- Der Prototyp ist **Design-Referenz, kein Produktionscode**. Seine Rechenwerte sind Beispiele. Maßgeblich bleiben `app/src/engine`, `app/src/data` und der Store.

## 2. Umsetzen – schrittweise, je Schritt ein Commit
Alle Schritte **ohne Zwischenstopp** nacheinander umsetzen (nicht nach jedem Schritt auf Rückmeldung warten). Je Schritt ein Commit. Erst am Ende **eine** Gesamtzusammenfassung aller Schritte inkl. offener Fragen/Abweichungen. (Geändert auf Wunsch des Nutzers, 2026-09-25.)
1. Tokens (beide Themes als CSS-Variablen), Phosphor-Icons statt Emoji, App-Hülle: Kopf, 5-Tab-Leiste (Handy), Navigationsschiene (Tablet/Desktop), Breakpoints, Ein-/Ausblenden beim Scrollen, Sheets bzw. Seitenpanel, Toast mit Rückgängig.
2. Kampf-Tab: alle Bereiche einklapp-/sortierbar, TP mit Zahlenfeld, Werte mit Buff/Zustand-Tags, Aufschlüsselung inkl. „Sonstiges"-Feldern, Tablet-Masonry, Desktop-Dashboard.
3. Bearbeiten-Sheet (einheitlich) für Buff (mit Bonus-Typ und Stapelregel), Ressource, Waffe, Ausrüstung; Bereich „Verteidigung · Bewegung".
4. Char-Tab (Attribute mit Aufschlüsselung, Klassen/Archetypen, EP, Person, Tiergefährte) und Charakter-Assistent.
5. Fähigkeiten-Tab (Fertigkeiten + Talente).
6. Zauber-Tab je Klassentyp (vorbereitet/Klassenliste, Zauberbuch, spontan, hybrid, Multiklasse, keine Zauberklasse) – Werte aus `spell_progression.json`.
7. Inventar, Mehr (Kontakte, Sonderfähigkeiten, Gifte, Schablonen, Daten, Einstellungen inkl. Darstellung Standard/Kontrast).

## 3. Prüfen (bei jedem Schritt)
- Breiten 360, 375, 390 (Handy), 744, 820, 1024 (Tablet), 1180, 1280, 1440 (Desktop); jeweils Schriftgröße M und XL; beide Themes.
- Kein horizontales Überlaufen, alle Touch-Ziele ≥ 44px, Eingabefelder ≥ 16px Schrift (iOS-Zoom).
- Safari (iOS + macOS) und Chrome (Android + Desktop). Safe-Areas, `100dvh`, Hover nur bei `(hover:hover)`.
- Bestehende Funktionen dürfen nicht wegfallen. Keine Datenformat-Änderung ohne Migration (`deepMerge`).

- **Abschluss-Pflicht (Wunsch des Nutzers, 2026-09-26):** Bevor „fertig" gemeldet wird, muss **alles** durchgetestet sein – jeder Tab und jede Funktion in **Handy, Tablet und Desktop** (inkl. Hoch/Quer, Schrift M + XL, beide Themes), im Browser tatsächlich bedient (nicht nur gebaut). Gefundene Fehler zuerst beheben, dann erneut testen. Die Zusammenfassung nennt, was getestet wurde.

## 4. Abweichungen
Weicht etwas im Code vom Design ab oder fehlt im Design eine Angabe: nicht erfinden, sondern die naheliegendste Lösung im Sinne von README.md wählen, weiterarbeiten und die Frage in der Schlusszusammenfassung auflisten. Kleine Design-Probleme (Abstände, Umbrüche) selbst im Sinne der Tokens und Muster aus README.md lösen.
