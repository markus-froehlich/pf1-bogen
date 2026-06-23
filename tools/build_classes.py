"""Normalize class progression data (Klasse!C21:I* + FerTab) -> data/classes.json.
Faithful to Excel. Progression data (BAB, saves) per level 1-20."""
import json, re, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dump_util import grid

OUT = "/Users/froema/Documents/Rollenspiel/Pathfinder/Pathinder Web App/data/classes.json"

def slug(s):
    """Convert class name to lowercase URL-safe slug."""
    s = s.lower()
    repl = {"ä":"ae","ö":"oe","ü":"ue","ß":"ss"," ":"_","-":"_",".":""}
    for k,v in repl.items():
        s = s.replace(k,v)
    return re.sub(r"[^a-z0-9_]","", s)

def parse_hit_die(tg_value):
    """Convert numeric die value (6,8,10,12) to string 'W6','W8','W10','W12'."""
    if tg_value in (None, ""):
        return None
    try:
        val = int(tg_value)
        if val in (6, 8, 10, 12):
            return f"W{val}"
    except (ValueError, TypeError):
        pass
    return None

def num(x):
    """Safe float/int conversion."""
    try:
        return int(x) if x not in (None,"") else None
    except (ValueError, TypeError):
        return None

# ==================== Step 1: Load class metadata from Klatab ====================
# Klatab is at Klasse!BO2:BP77 (includes headers at row 2-3, data starts row 4)
# BO = class name (key for lookup)
# BP = KlasseNr (index for progression rows)

klatab = grid("Klasse", "BO2:BP77", "val")
class_metadata = {}  # keyed by KlasseNr

for i, row in enumerate(klatab):
    name = row[0]  # Col BO
    kla_nr = row[1]  # Col BP

    if not name or not isinstance(kla_nr, int) or kla_nr <= 0:
        continue
    if name.endswith("klassen") or name.startswith("-") or name == "0":
        continue

    class_metadata[kla_nr] = {
        "name": name.strip(),
        "kla_nr": kla_nr
    }

# ==================== Step 2: Load FerTab for hit die + skill points ====================
# FerTab is at Fertig!AE2:BQ131
# Column 1 (AE) = class name (lookup key)
# Column 37 (BO) = Punkte pro Level (skill points per level)
# Column 38 (BP) = Trefferwürfel (hit die as numeric: 6,8,10,12)

fertab = grid("Fertig", "AE2:BP50", "val")  # Class names through BP
fertab_data = {}  # keyed by class name

for row in fertab:
    class_name = row[0]
    if not class_name or class_name.strip() == "-":
        continue

    class_name = str(class_name).strip()
    fp_per_level = num(row[36])  # BO is column 37 from AE, so index 36
    hit_die_num = num(row[37])   # BP is column 38 from AE, so index 37
    hit_die = parse_hit_die(hit_die_num)

    fertab_data[class_name] = {
        "skill_points_per_level": fp_per_level,
        "hit_die": hit_die,
        "hit_die_size": hit_die_num
    }

# ==================== Step 3: Load progression data (C, G, H, I per KlasseNr) ====================
# For each class (KlasseNr), load 20 rows of progression
# Row = KlasseNr * 20 + Level (Level 1-20)
# Col C = GAB (base attack bonus)
# Col G = Ref (reflex save)
# Col H = Wil (will save)
# Col I = Zäh (fortitude save)

def load_progression(kla_nr):
    """Load 20-row progression block for a given KlasseNr."""
    start_row = kla_nr * 20 + 1
    end_row = kla_nr * 20 + 20

    gab = grid("Klasse", f"C{start_row}:C{end_row}", "val")
    ref = grid("Klasse", f"G{start_row}:G{end_row}", "val")
    will = grid("Klasse", f"H{start_row}:H{end_row}", "val")
    fort = grid("Klasse", f"I{start_row}:I{end_row}", "val")

    progression = []
    for lv in range(1, 21):
        progression.append({
            "level": lv,
            "bab": num(gab[lv-1][0]),
            "ref": num(ref[lv-1][0]),
            "will": num(will[lv-1][0]),
            "fort": num(fort[lv-1][0])
        })

    return progression

# ==================== Step 4: Merge and build output ====================
classes = []

for kla_nr in sorted(class_metadata.keys()):
    meta = class_metadata[kla_nr]
    name = meta["name"]

    # Look up hit die and skill points in FerTab
    fert = fertab_data.get(name, {})

    progression = load_progression(kla_nr)

    classes.append({
        "id": slug(name),
        "kla_nr": kla_nr,
        "name": {"de": name, "en": None},
        "hit_die": fert.get("hit_die"),
        "skill_points_per_level": fert.get("skill_points_per_level"),
        "progression": progression,
        "_source": {
            "klatab_row": 2 + [idx for idx, (k, v) in enumerate(class_metadata.items()) if k == kla_nr][0] if kla_nr in class_metadata else None,
            "fertab_name": name,
            "progression_rows": f"Klasse!C{kla_nr*20+1}:I{kla_nr*20+20}"
        }
    })

# ==================== Step 5: Write output ====================
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump({
    "_meta": {
        "source": "Klasse sheet (progression) + Fertig sheet (FerTab)",
        "progression_source": "Klasse!C:I (20 rows per class, indexed by KlasseNr*20+Level)",
        "hit_die_source": "Fertig!BP (FerTab col 38)",
        "skill_points_source": "Fertig!BO (FerTab col 37)",
        "faithful_to": "Bogen 6.61 Spieler.xlsx",
        "count": len(classes),
        "note": ("BAB, Ref, Will, Fort values are pre-baked per level "
                 "(not computed from formulas). BAB types: full=20@L20, ¾=15@L20, ½=10@L20. "
                 "Save types: good=12@L20, poor=6@L20. Hit die in W6/W8/W10/W12 notation.")
    },
    "classes": classes
}, open(OUT, "w"), ensure_ascii=False, indent=2)

print(f"classes written: {len(classes)} -> {OUT}")

# ==================== Verification samples ====================
print("\nVerification samples:")
print("\nFirst class (should be Barbar/Kämpfer-like):")
if classes:
    c = classes[0]
    print(f"  {c['id']:20s} TW={c['hit_die']:>3s} FP={c['skill_points_per_level']} KlaNr={c['kla_nr']}")
    prog = c['progression']
    print(f"    Lv1:  BAB={prog[0]['bab']}, Ref={prog[0]['ref']}, Will={prog[0]['will']}, Fort={prog[0]['fort']}")
    print(f"    Lv20: BAB={prog[19]['bab']}, Ref={prog[19]['ref']}, Will={prog[19]['will']}, Fort={prog[19]['fort']}")

print("\nSample classes (various types):")
sample_ids = ["barbar", "magier", "schurke", "kleriker"]
for sid in sample_ids:
    for c in classes:
        if c['id'] == sid:
            prog = c['progression']
            print(f"  {c['id']:20s} TW={c['hit_die']:>3s} FP={c['skill_points_per_level']} "
                  f"  L1: BAB={prog[0]['bab']}, L20: BAB={prog[19]['bab']}, Ref(20)={prog[19]['ref']}")
            break
