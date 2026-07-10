"""Normalize Waffentab (Waffe!M5:IH534) -> data/weapons.json. Faithful to Excel."""
import json, re, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dump_util import grid

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(_ROOT, "data", "weapons.json")

def slug(s):
    if not s: return ""
    s = str(s).strip().lower()
    repl = {"ä":"ae","ö":"oe","ü":"ue","ß":"ss"," ":"_","-":"_","/":"_","(":"",")":" ","'":"","\"":"","ä":"ae"}
    for k, v in repl.items(): s = s.replace(k, v)
    return re.sub(r"[^a-z0-9_]", "", s).strip("_")

def clean(v):
    if v is None or v == "" or v == 0: return None
    if isinstance(v, str): v = v.strip()
    if v in ("-", "–", "—", "#N/A", "0"): return None
    return v

def num(v):
    try: return float(v) if v not in (None, "", "-") else None
    except (ValueError, TypeError): return None

# Read headers (row 5) and data (rows 6-534)
headers = grid("Waffe", "M5:IH5", "val")[0]
rows    = grid("Waffe", "M6:IH534", "val")

# Column indices (0-based offset from col M)
C_NAME    = 0
C_ATTR    = 1   # TWAttrib: which ability for damage (ST/GE)
C_THROWN  = 2   # Geworfen
C_DAM_SK  = 3   # Schaden SK (Sehr Klein)
C_DAM_K   = 4   # Schaden K (Klein)
C_DAM_M   = 5   # Schaden M (Mittel) — primary
C_DAM_G   = 6   # Schaden G (Groß)
C_DAM_R   = 7   # Schaden R (Riesig)
C_CRIT    = 8   # Kritischer (e.g. "x2", "19-20/x2")
C_RANGE   = 9   # Grundreichweite
C_WEIGHT  = 10  # Gewicht
C_SPECIAL = 11  # Speziell
C_STmult  = 12  # ST-Bonus Multiplikator (0=none,1=full,1.5=2H bonus)
C_2HTYPE  = 13  # Zweihand Art
C_PAGE    = 14  # Seite
C_UNTRAINED = 16  # Abzug ungeübt
C_TRAINED   = 17  # Geübt (proficiency group)
C_ARTTYP  = 32  # Art+Typ (e.g. "E/H" = Einfach/Hieb)
C_VALUE   = 33  # Wert (GP)

def get(row, idx):
    if idx >= len(row): return None
    return row[idx]

weapons, skipped = [], []
current_category = ""
seen_ids = {}

for row in rows:
    name_raw = get(row, C_NAME)
    if name_raw is None or str(name_raw).strip() == "":
        continue

    name = str(name_raw).strip()

    # Category header rows (no indentation in col 1 data, bold headers)
    if get(row, C_ARTTYP) is None and get(row, C_DAM_M) is None and get(row, C_CRIT) is None:
        # Likely a category line (e.g. "Einfache Waffenlose", "Kriegswaffen")
        current_category = name.strip()
        continue

    art_typ = clean(get(row, C_ARTTYP))
    damage_m = clean(get(row, C_DAM_M))

    if damage_m is None and art_typ is None:
        # Skip empty/spacer rows
        skipped.append(name)
        continue

    # Parse Art+Typ: e.g. "E/H" -> category=Einfach, type=Hieb
    cat_code, typ_code = "", ""
    if art_typ:
        parts = str(art_typ).split("/")
        cat_code = parts[0].strip() if len(parts) > 0 else ""
        typ_code = parts[1].strip() if len(parts) > 1 else ""

    # Category code mapping
    cat_map = {"E":"Einfach","K":"Kriegs","E ":"Einfach","K ":"Kriegs","EK":"Exotisch"}
    typ_map = {"H":"Hieb","S":"Stich","H/S":"Hieb/Stich","S/H":"Stich/Hieb","F":"Fernkampf","W":"Wucht","SH":"Stich/Hieb"}

    trained_raw = clean(get(row, C_TRAINED))

    w = {
        "id": slug(name),
        "name": {"de": name.lstrip(), "en": None},
        "category": current_category,
        "proficiency": cat_map.get(cat_code, cat_code),
        "damage_type": typ_map.get(typ_code, typ_code),
        "damage": {
            "sk": clean(get(row, C_DAM_SK)),
            "k":  clean(get(row, C_DAM_K)),
            "m":  damage_m,
            "g":  clean(get(row, C_DAM_G)),
            "r":  clean(get(row, C_DAM_R)),
        },
        "crit": clean(get(row, C_CRIT)),
        "range_m": num(clean(get(row, C_RANGE))),
        "weight_kg": num(clean(get(row, C_WEIGHT))),
        "special": clean(get(row, C_SPECIAL)),
        "str_bonus_mult": num(get(row, C_STmult)),
        "two_hand_type": clean(get(row, C_2HTYPE)),
        "thrown": bool(get(row, C_THROWN)),
        "ability": "GE" if str(clean(get(row, C_ATTR)) or "").upper() == "GE" else "ST",
        "proficiency_group": trained_raw,
        "value_gp": num(clean(get(row, C_VALUE))),
        "page_ref": clean(get(row, C_PAGE)),
    }
    # Ensure unique IDs
    base_id = w['id']
    seen_ids[base_id] = seen_ids.get(base_id, 0) + 1
    if seen_ids[base_id] > 1:
        w['id'] = f"{base_id}_{seen_ids[base_id]}"
    weapons.append(w)

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w") as f:
    json.dump({
        "_meta": {
            "source": "Waffe!M5:IH534 (Waffentab)",
            "faithful_to": "Bogen 6.61 Spieler.xlsx",
            "count": len(weapons),
            "damage_sizes": "SK=Sehr Klein, K=Klein, M=Mittel(standard), G=Groß, R=Riesig",
            "str_bonus_mult": "0=keiner, 1=voll, 1.5=Zweihand-Bonus",
        },
        "weapons": weapons
    }, f, ensure_ascii=False, indent=2)

print(f"weapons written: {len(weapons)}  -> {OUT}")
print(f"skipped: {len(skipped)}")
print("\nSample (first 10 with damage):")
for w in weapons[:10]:
    print(f"  {w['id'][:25]:<25} {w['proficiency']:<10} {(w['damage']['m'] or '?'):<8} crit={w['crit']}")
