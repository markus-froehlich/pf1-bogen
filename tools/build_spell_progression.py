"""Klasse-Blatt -> data/spell_progression.json (Zauber pro Tag / bekannte Zauber je Klasse).

Jede Klasse ist ein 20-Zeilen-Block (Namenszeile = Stufe 1). Spalten (0-basiert):
  10-19  arkane Zauber pro Tag, Grad 0-9
  20-29  goettliche Zauber pro Tag, Grad 0-9
  30-39  bekannte Zauber, Grad 0-9 (Spontanzauberer)
  40-48  Zusatz-Slot je Grad 1-9 (Domaene / Geist)
Excel-Kodierung wird unveraendert uebernommen:
  99  = unbegrenzt (Grad 0 bei Spontanzauberern)
  0.1 = Grad zugaenglich, aber 0 Grundzauber (nur Bonuszauber durch Attribut)
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dump_util import grid

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTS = [os.path.join(_ROOT, "data", "spell_progression.json"),
        os.path.join(_ROOT, "app", "src", "data", "spell_progression.json")]
CLASSES = os.path.join(_ROOT, "app", "src", "data", "classes.json")

# Bekannte Excel-Tippfehler (gegen Grundregelwerk geprueft): (klasse, stufe, spalte, richtig)
FIXES = [
    ("magier", 16, 12, 4),  # Excel: 6 Zauber 2. Grades auf Stufe 16; Tabelle 3-x: 4
]

def num(v):
    if v in (None, "", " "): return 0
    try:
        f = float(v)
    except (TypeError, ValueError):
        return 0
    return int(f) if f.is_integer() else f

def main():
    rows = grid("Klasse", "A1:AW2500", "val")
    classes = json.load(open(CLASSES, encoding="utf-8"))
    classes = classes["classes"] if isinstance(classes, dict) else classes
    by_name = {c["name"]["de"].strip(): c["id"] for c in classes}

    out = {}
    for i in range(len(rows) - 1):
        nxt = str(rows[i + 1][0] or "")
        if not nxt.startswith("KlaNr"):
            continue
        name = str(rows[i][0] or "").strip()
        block = [[num(v) for v in r] for r in rows[i:i + 20]]
        if len(block) < 20:
            continue
        cols = lambda a, b: [r[a:b] for r in block]
        arcane, divine, known, extra = cols(10, 20), cols(20, 30), cols(30, 40), cols(40, 49)
        has = lambda t: any(v for r in t for v in r)
        day = arcane if has(arcane) else divine if has(divine) else None
        if day is None:
            continue
        cid = by_name.get(name)
        if not cid:
            print("WARN: keine Klassen-ID fuer", name)
            continue
        entry = {
            "source": "arcane" if day is arcane else "divine",
            "day": day,
            "known": known if has(known) else None,
            "extra": extra if has(extra) else None,
        }
        out[cid] = entry

    for cid, lvl, col, val in FIXES:
        if cid in out:
            out[cid]["day"][lvl - 1][col - 10] = val

    for p in OUTS:
        with open(p, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, indent=1)
    print(len(out), "Zauberklassen:", ", ".join(sorted(out)))

if __name__ == "__main__":
    main()
