"""Normalize VolkTab (Volk!A3:J54) -> data/races.json. Faithful to Excel.
Speeds are in METERS (German PF1e). Ability mods parsed from col F text."""
import json, re, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dump_util import grid

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(_ROOT, "data", "races.json")
ATTRS = {"ST","GE","KO","IN","WE","CH"}

def slug(s):
    s = s.lower()
    repl = {"ä":"ae","ö":"oe","ü":"ue","ß":"ss"," ":"_","-":"_"}
    for k,v in repl.items(): s = s.replace(k,v)
    return re.sub(r"[^a-z0-9_]","", s)

def parse_mods(text):
    """'GE+2, IN+2, KO-2' -> ({'GE':2,'IN':2,'KO':-2}, floating)"""
    mods, floating = {}, None
    if not text: return mods, floating
    t = str(text).strip()
    if "Attribut" in t:  # '1 Attribut +2'
        m = re.search(r"([+-]?\d+)", t)
        floating = int(m.group(1)) if m else 2
        return mods, floating
    for part in re.split(r"[,;]", t):
        m = re.match(r"\s*([A-ZÄÖÜ]{2})\s*([+-]\d+)", part.strip())
        if m and m.group(1) in ATTRS:
            mods[m.group(1)] = int(m.group(2))
    return mods, floating

def num(x):
    try: return float(x) if x not in (None,"") else None
    except (ValueError, TypeError): return None

rows = grid("Volk", "A3:J54", "val")
races, skipped = [], []
for r in rows:
    name = (str(r[0]).strip() if r[0] is not None else "")
    if not name or name.startswith("*") or name == "0" or name in ("Tiergefährte","Tier Gefährte"):
        skipped.append(name); continue
    mods, floating = parse_mods(r[5])
    speed_un = num(re.sub(r"[^\d.]","", str(r[2]))) if r[2] not in (None,"","#N/A") else None
    speed_ar = num(re.sub(r"[^\d.]","", str(r[3]))) if r[3] not in (None,"","#N/A") else None
    races.append({
        "id": slug(name),
        "name": {"de": name, "en": None},
        "size": {"de": (str(r[1]).strip() if r[1] not in (None,"#N/A") else None)},
        "speed_m": {"unarmored": speed_un, "armored": speed_ar},
        "extra_skill_points_per_level": int(num(r[4]) or 0),
        "ability_mods": mods,
        "ability_mod_floating": floating,
        "ability_mods_text": {"de": (str(r[5]).strip() if r[5] else None)},
        "low_light_or_darkvision": bool(num(r[6])),
        "_source": {"kraefte_col": (str(r[7]).strip() if r[7] else None),
                     "trait_ref": (str(r[8]).strip() if r[8] else None),
                     "merkmal_idx": num(r[9])},
        "traits": []  # to be enriched from Kräfte / ZauberListen (VolkFaehigkeiten)
    })

import os; os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump({"_meta":{"source":"Volk!A3:J54 (VolkTab)","speed_unit":"meters",
                     "faithful_to":"Bogen 6.61 Spieler.xlsx","count":len(races),
                     "ability_mods_are_display_only": True,
                     "note": ("Im Excel werden Volks-Attribut-Mods NICHT automatisch "
                              "angewendet: der Spieler tragt den fertigen Attributwert "
                              "(inkl. Volksbonus) direkt ein. 'ability_mods' / "
                              "'ability_mods_text' sind reiner Anzeige-/Hinweistext. "
                              "Verifiziert: Bogen!T26 = VLOOKUP(ST+BuffST,Attributtab,2) "
                              "ohne Volks-Term.")},
           "races":races}, open(OUT,"w"), ensure_ascii=False, indent=2)
print(f"races written: {len(races)}  -> {OUT}")
print("skipped rows:", [s for s in skipped if s])
print("\nsample (first 8):")
for x in races[:8]:
    print(f"  {x['id']:<14} mods={x['ability_mods']} float={x['ability_mod_floating']} "
          f"speed={x['speed_m']['unarmored']}m skill+={x['extra_skill_points_per_level']}")
