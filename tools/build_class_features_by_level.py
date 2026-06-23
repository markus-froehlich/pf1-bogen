#!/usr/bin/env python3
"""
build_class_features_by_level.py
Extract per-level class feature progressions from Kräftelisten.jsonl.

The sheet has multiple blocks (Teil 1, Teil 2, ...) arranged in column groups.
Each block has:
  - Header row: class name in the first column of each group
  - Feature rows: cells with '1NN text' prefix (NN = 2-digit level, e.g. 101 = Lv1, 107 = Lv7)
    - First column of group: base class features
    - Subsequent columns: archetype variants (ignored here, we only want base class)

Strategy:
  - Scan ALL cells for pattern '101   <ClassName>' (level-1 header of base class)
  - Group them: class name → list of (col, row) anchors
  - For each anchor, read that column rows anchor..anchor+30 for '1NN' prefixed entries
  - Map NN → feature name, cleaned up

Output: data/class_features_by_level.json + app/src/data/class_features_by_level.json
"""

import json
import re
import os
from collections import defaultdict

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSONL = os.path.join(BASE, "extraction", "sheets_full", "Kräftelisten.jsonl")
CLASSES = os.path.join(BASE, "app", "src", "data", "classes.json")
OUT_DATA = os.path.join(BASE, "data", "class_features_by_level.json")
OUT_APP  = os.path.join(BASE, "app", "src", "data", "class_features_by_level.json")


def col_num(col):
    n = 0
    for c in col:
        n = n * 26 + (ord(c) - ord('A') + 1)
    return n


def cell_val(obj):
    v = obj.get("val")
    if v is not None and isinstance(v, str) and not v.startswith("=") and not v.startswith("#"):
        return v.strip() or None
    r = obj.get("raw")
    if r is not None and isinstance(r, str) and not r.startswith("=") and not r.startswith("#"):
        return r.strip() or None
    return None


# ── Load class IDs → German names ─────────────────────────────────────────
with open(CLASSES, encoding="utf-8") as f:
    classes_data = json.load(f)

# Build: german_name_lower → class_id
name_to_id = {}
for cls in classes_data.get("classes", []):
    name_de = cls.get("name", {}).get("de", "")
    if name_de:
        name_to_id[name_de.lower()] = cls["id"]
    # Also try without umlauts / common abbreviations
    name_en = cls.get("name", {}).get("en", "")
    if name_en:
        name_to_id[name_en.lower()] = cls["id"]

print(f"Loaded {len(name_to_id)} class name→ID mappings")

# ── Load all cells ─────────────────────────────────────────────────────────
cells = {}   # (col_str, row_int) → value_str
with open(JSONL, encoding="utf-8") as f:
    for line in f:
        obj = json.loads(line)
        m = re.match(r'^([A-Z]+)(\d+)$', obj["c"])
        if not m:
            continue
        col, row = m.group(1), int(m.group(2))
        v = cell_val(obj)
        if v:
            cells[(col, row)] = v

print(f"Loaded {len(cells)} non-empty cells")

# ── Find all base-class level-1 anchors: '101   <ClassName>' ──────────────
# Pattern: value starts with '101' followed by spaces and the class name (no archetype suffix)
# Base class cell has form '101   Barbar' or '101   Schurke' etc.
# Archetype cells look like '101   Barbar Abergläubisch' (have extra word)

# Collect anchor candidates: (col, row, raw_value)
anchors = []
for (col, row), v in cells.items():
    # Match '101   <Name>' — level prefix 101 + spaces + name
    m = re.match(r'^101\s+(.+)$', v)
    if not m:
        continue
    raw_name = m.group(1).strip()
    # Only want base class entries (no archetype suffix):
    # Heuristic: known class names are in name_to_id, and the raw_name matches exactly
    if raw_name.lower() in name_to_id:
        class_id = name_to_id[raw_name.lower()]
        anchors.append((col, row, raw_name, class_id))
    # Also handle compound names like 'Mystischer Ritter' → mystischer_ritter
    # These are already in name_to_id

print(f"Found {len(anchors)} base-class anchors:")
for col, row, name, cid in sorted(anchors, key=lambda x: (x[0], x[1])):
    print(f"  [{col}{row}] {name} → {cid}")

# ── For each anchor, extract features from that column ──────────────────────
# Feature cells contain '1NN text' where NN = 01-20
# We scan from anchor_row to anchor_row + 25 in the same column

FEAT_RE = re.compile(r'^1(\d{2})\s*(.+)$')

def clean_feature(raw: str, class_id: str) -> str:
    """Remove trailing class abbreviation and (AF)/(ÜF) etc. suffixes."""
    # Remove trailing space + short abbreviations like 'Bbr', 'Bar', 'Brd', 'Kle' etc.
    # These are 2-4 char uppercase abbreviations at the end
    t = raw.strip()
    # Remove '(AF)' and '(ÜF)' type markers — keep name clean
    # t = re.sub(r'\s*\([^)]+\)\s*$', '', t).strip()
    # Remove trailing class abbrev (2-4 uppercase chars, possibly with space)
    t = re.sub(r'\s+[A-ZÄÖÜ][a-zäöüA-ZÄÖÜ]{1,4}$', lambda m: '' if len(m.group().strip()) <= 4 else m.group(), t).strip()
    return t


by_class_candidates = defaultdict(list)  # class_id → list of (levels_dict, class_name)

for col, anchor_row, class_name, class_id in anchors:
    levels = defaultdict(list)
    # Scan anchor_row to anchor_row + 30 for features in this column
    for dr in range(0, 31):
        row = anchor_row + dr
        v = cells.get((col, row))
        if not v:
            continue
        fm = FEAT_RE.match(v)
        if not fm:
            continue
        level_str = fm.group(1)
        feat_raw = fm.group(2).strip()
        # Skip if this cell is just the class header itself ('101   Barbar' etc.)
        if re.match(r'^\s+\w', feat_raw) or feat_raw.lower() == class_name.lower():
            continue
        # Skip weapon proficiency rows ('Waffen ClassName')
        if feat_raw.startswith('Waffen '):
            continue
        # Skip bare dots
        if feat_raw in ('.', '..', '...'):
            continue
        level = int(level_str)
        # Clean trailing class abbreviations
        feat = clean_feature(feat_raw, class_id)
        if feat and feat not in ('.', '..'):
            levels[str(level)].append(feat)

    if levels:
        by_class_candidates[class_id].append((dict(levels), class_name))

# Deduplicate: for each class, prefer proper level-spread over level-1 lookup blocks
# Score: (distinct_levels, -total_if_only_level1)
def candidate_score(c):
    levels_dict = c[0]
    n_levels = len(levels_dict)
    if n_levels == 1 and '1' in levels_dict:
        # Flat lookup block — prefer real progressions
        return (0, -len(levels_dict.get('1', [])))
    return (n_levels, 0)

by_class = {}
for class_id, candidates in by_class_candidates.items():
    best = max(candidates, key=candidate_score)
    levels_dict, class_name = best
    by_class[class_id] = {"name": class_name, "levels": levels_dict}
    total = sum(len(v) for v in levels_dict.values())
    print(f"  {class_id:20s}: {total} features across levels {sorted(levels_dict.keys(), key=int)}")

print(f"\nTotal classes with features: {len(by_class)}")

# ── Write output ─────────────────────────────────────────────────────────────
out = {"by_class": by_class, "_meta": {"class_count": len(by_class)}}

for path in (OUT_DATA, OUT_APP):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"Wrote to {path}")
