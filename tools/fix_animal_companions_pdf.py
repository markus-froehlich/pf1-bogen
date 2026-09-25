"""PDF-Korrekturen für app/src/data/animal_companions.json (idempotent).

Quelle der Daten ist das Excel (Volk-Blatt, Tiergefährtenliste). Maßgeblich sind aber die
PDFs: Grundregelwerk S. 43-44 ("Spielwerte zu Beginn" / "Aufstieg auf die ... Stufe") sowie
Monsterhandbuch I + II ("... als Tiergefährten"). Abgleich 2026-09-25: 57 Arten geprüft,
die folgenden Einträge wichen ab. Arten aus Monsterhandbuch III (Quelle "3M…") und anderen
Bänden liegen nicht als PDF vor und bleiben bei den Excel-Werten.
"""
import json, os

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
import sys
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(_ROOT, "app", "src", "data", "animal_companions.json")

# name -> list of (field, old, new); field = "base" | "speed" | level number (1-20)
FIXES = {
    "Hai":            [("base", "Zauber teilen, ST13", "Zauber teilen, Schwimmen 18m, ST13")],  # GRW: Schwimmen 18 m
    "Affe":           [(4, "nat RK+1 Biss", "nat RK+2 Biss")],                                  # GRW: RK +2
    "Deinonychus":    [(7, "nat RK+1,", "nat RK+2,")],
    "Velociraptor":   [(7, "nat RK+1,", "nat RK+2,")],
    "Löwe":           [(7, "nat RK+1,", "nat RK+2,")],
    "Tiger":          [(7, "nat RK+1,", "nat RK+2,")],
    "Gepard":         [(4, "TW:4 (+1), Biss", "TW:4 (+1), nat RK+2, Biss")],
    "Leopard":        [(4, "TW:4 (+1), Biss", "TW:4 (+1), nat RK+2, Biss")],
    "Krokodil":       [(1, "nat RK+4 Biss", "Biss"),                                             # stand in Stufe 1 -> nicht gezählt
                       ("base", "Dämmersicht", "Dämmersicht, nat RK+4")],
    "Pony":           [("base", "CH4", "CH6"), (4, "Kampfsicher", "Kampfausbildung")],
    "Würgeschlange":  [("base", "Zauber teilen, 1W3, ", "Zauber teilen, "), ("base", "CH2", "CH6")],
    "Zitteraal":      [("base", ", nat.RK+5", "")],   # MHB I S. 7: keine nat. RK zu Beginn (+2 erst mit Stufe 4)
    "Tyrannosaurus":  [("speed", "12", "9")],   # MHB I S. 58 (dt.) nennt 9 m
    "Frosch":         [("speed", "3", "9")],    # MHB I S. 118: 9 m, Schwimmen 9 m
    "Nashorn":        [(7, "GE-4", "GE-2")],    # MHB I S. 197
    "Riesenschnappschildkröte": [("base", "nat.RK+1", "nat.RK+10")],  # MHB II S. 222
    "Mantarochen":    [("speed", "18", "")],    # MHB II: nur Schwimmen 18 m
    "Stachelrochen":  [("speed", "12", "")],    # MHB II: nur Schwimmen 12 m
}

raw = open(PATH, encoding="utf-8").read()
data = json.loads(raw)
by_name = {c["name"]["de"]: c for c in data["companions"]}
changed = 0
for name, fixes in FIXES.items():
    c = by_name[name]
    for field, old, new in fixes:
        if field in ("base", "speed"):
            cur = str(c[field] if c[field] is not None else "")
            if field == "speed":
                if cur == new: continue
                assert cur == old, (name, field, cur)
                c[field] = new; changed += 1; continue
            text = cur
        else:
            text = c["levels"][field - 1]
        # schon angewendet? (new enthält old -> zuerst auf new prüfen, sonst auf old)
        if old in new and new in text: continue
        if old not in text:
            assert not new or new in text, (name, field, old, text)
            continue
        text = text.replace(old, new, 1)
        if field == "base": c["base"] = text
        else: c["levels"][field - 1] = text
        changed += 1
data["_meta"]["pdf_checked"] = "2026-09-25: 57 Arten gegen GRW S. 43-44 + MHB I/II geprüft, Korrekturen siehe tools/fix_animal_companions_pdf.py"
with open(PATH, "w", encoding="utf-8") as f:
    f.write(json.dumps(data, ensure_ascii=False, indent=2 if '\n  "' in raw else None) + ("\n" if raw.endswith("\n") else ""))
print("Änderungen:", changed)
