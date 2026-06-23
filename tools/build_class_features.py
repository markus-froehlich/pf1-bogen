#!/usr/bin/env python3
"""
build_class_features.py
Extract class features (BesFähig) from ZauberListen.jsonl,
excluding racial traits (already in racial_traits.json).
Output: data/class_features.json  AND  app/src/data/class_features.json
"""

import json
import re
import os
from collections import defaultdict

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

JSONL_PATH  = os.path.join(BASE, "extraction", "sheets_full", "ZauberListen.jsonl")
CLASSES_PATH = os.path.join(BASE, "app", "src", "data", "classes.json")
OUT_DATA    = os.path.join(BASE, "data", "class_features.json")
OUT_APP     = os.path.join(BASE, "app", "src", "data", "class_features.json")

# ── Race names to exclude ──────────────────────────────────────────────────
RACE_NAMES = {
    "Elf", "Gnom", "Halb-Elf", "Halb-Ork", "Halbling", "Mensch", "Zwerg",
    "Aasimar", "Drow", "Gestrandete", "Goblin", "Halb-Vampir", "Hobgoblin",
    "Katzenvolk", "Kobold", "Oreade", "Tiefling", "Grippli", "Kitsune",
    "Svirfneblin", "Rattenvolk", "Tengus", "Strix", "Suli", "Samsaran",
    "Nagaji", "Vanara", "Vischkanya", "Wayang", "Wechselbalg", "Sukkubus",
    "Kiemenmensch", "Duergar", "Undine", "Sylphen", "Pyrier",
}

# ── Load class names ──────────────────────────────────────────────────────
with open(CLASSES_PATH, encoding="utf-8") as f:
    classes_data = json.load(f)

class_names = []
for cls in classes_data.get("classes", []):
    name_de = cls.get("name", {}).get("de")
    if name_de:
        class_names.append(name_de)

# Sort longest first so greedy suffix matching picks the most specific name
class_names_sorted = sorted(class_names, key=len, reverse=True)

print(f"Loaded {len(class_names_sorted)} class names")

# ── Helper: resolve cell value ────────────────────────────────────────────
def cell_val(obj):
    """Return the plain string value of a cell, or None."""
    v = obj.get("val")
    if v is not None and isinstance(v, str) and not v.startswith("="):
        return v.strip() or None
    r = obj.get("raw")
    if r is not None and isinstance(r, str) and not r.startswith("="):
        return r.strip() or None
    if v is not None and not isinstance(v, str):
        return str(v)
    return None

# ── Pass 1: collect BesFähig row numbers ─────────────────────────────────
bef_rows = set()
with open(JSONL_PATH, encoding="utf-8") as f:
    for line in f:
        obj = json.loads(line)
        m = re.match(r"^([A-Z]+)(\d+)$", obj["c"])
        if not m:
            continue
        col, row = m.group(1), int(m.group(2))
        if col == "BA" and obj.get("val") == "BesFähig":
            bef_rows.add(row)

print(f"Found {len(bef_rows)} BesFähig rows")

# ── Pass 2: collect BB (name) and BF (desc) for those rows ───────────────
row_data: dict[int, dict] = {}
with open(JSONL_PATH, encoding="utf-8") as f:
    for line in f:
        obj = json.loads(line)
        m = re.match(r"^([A-Z]+)(\d+)$", obj["c"])
        if not m:
            continue
        col, row = m.group(1), int(m.group(2))
        if row not in bef_rows:
            continue
        if col in ("BB", "BF"):
            if row not in row_data:
                row_data[row] = {}
            row_data[row][col] = cell_val(obj)

print(f"Collected data for {len(row_data)} rows")

# ── Helper: extract source class from name suffix ─────────────────────────
def extract_source(name: str):
    """
    Try to find a class name (or race name) as a suffix of `name`.
    Returns (trait, source) where source is "" if no class found.
    """
    stripped = name.strip()
    # Try each class name (longest first)
    for cn in class_names_sorted:
        if stripped.endswith(" " + cn):
            trait = stripped[: -(len(cn) + 1)].strip()
            return trait, cn
        # Also handle suffix without space separator but with different casing
        if stripped.lower().endswith(" " + cn.lower()):
            trait = stripped[: -(len(cn) + 1)].strip()
            return trait, cn
    return stripped, ""

# ── Build feature list ────────────────────────────────────────────────────
features = []
skipped_race = 0
skipped_empty = 0

for row in sorted(row_data.keys()):
    entry = row_data[row]
    name_raw = entry.get("BB", "")
    desc_raw = entry.get("BF", "") or ""

    if not name_raw:
        skipped_empty += 1
        continue

    name = name_raw.strip()
    if not name:
        skipped_empty += 1
        continue

    desc = desc_raw.strip()

    # Check if this name ends with a race name → skip
    is_racial = False
    for rn in RACE_NAMES:
        if name.endswith(" " + rn) or name == rn:
            is_racial = True
            break
    if is_racial:
        skipped_race += 1
        continue

    trait, source = extract_source(name)

    features.append({
        "name": name,
        "trait": trait,
        "source": source,
        "desc": desc,
    })

print(f"Skipped {skipped_race} racial entries, {skipped_empty} empty entries")
print(f"Total features before sort: {len(features)}")

# ── Sort: source (blank last), then trait ────────────────────────────────
features.sort(key=lambda x: (x["source"] == "", x["source"].lower(), x["trait"].lower()))

# ── Summary ───────────────────────────────────────────────────────────────
by_source = defaultdict(int)
for f in features:
    key = f["source"] if f["source"] else "(keine Klasse)"
    by_source[key] += 1

top10 = sorted(by_source.items(), key=lambda x: -x[1])[:10]
print("\nTop 10 source classes by count:")
for src, cnt in top10:
    print(f"  {src:30s} {cnt}")

# ── Write output ──────────────────────────────────────────────────────────
out = {
    "features": features,
    "_meta": {"count": len(features)},
}

for path in (OUT_DATA, OUT_APP):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"\nWrote {len(features)} features to {path}")
