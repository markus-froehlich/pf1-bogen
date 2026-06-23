#!/usr/bin/env python3
"""
build_racial_traits.py — Extract BesFähig racial trait entries from ZauberListen.jsonl
Output: data/racial_traits.json + app/src/data/racial_traits.json
"""

import json
import re
import os
from pathlib import Path

BASE = Path(__file__).parent.parent

JSONL = BASE / "extraction" / "sheets_full" / "ZauberListen.jsonl"
OUT_DATA   = BASE / "data" / "racial_traits.json"
OUT_APP    = BASE / "app" / "src" / "data" / "racial_traits.json"

RACE_NAMES = [
    "Elf", "Gnom", "Halb-Elf", "Halb-Ork", "Halbling", "Mensch", "Zwerg",
    "Aasimar", "Drow", "Gestrandete", "Goblin", "Halb-Vampir", "Hobgoblin",
    "Katzenvolk", "Kobold", "Oreade", "Tiefling", "Grippli", "Kitsune",
    "Svirfneblin", "Rattenvolk", "Tengus", "Strix", "Suli", "Samsaran",
    "Nagaji", "Vanara", "Vischkanya", "Wayang", "Wechselbalg", "Sukkubus",
    "Kiemenmensch", "Duergar", "Undine", "Sylphen", "Pyrier",
]

def race_id(name: str) -> str:
    return re.sub(r'[^a-z0-9]', '_', name.lower())

# Sort by longest first to avoid partial matches (e.g. "Elf" matching "Halb-Elf")
RACE_NAMES_SORTED = sorted(RACE_NAMES, key=lambda n: -len(n))

def parse_rows(path: Path) -> dict:
    """Read JSONL and group cells by row, keeping BA/BB/BC/BF columns."""
    rows: dict[str, dict] = {}
    with open(path, encoding="utf-8") as f:
        for line in f:
            obj = json.loads(line)
            c = obj.get("c", "")
            m = re.match(r"([A-Z]+)(\d+)", c)
            if not m:
                continue
            col, row = m.group(1), m.group(2)
            if col not in ("BA", "BB", "BC", "BF"):
                continue
            if row not in rows:
                rows[row] = {}
            rows[row][col] = obj.get("val", obj.get("raw", ""))
    return rows

def main():
    print(f"Reading {JSONL} ...")
    rows = parse_rows(JSONL)
    print(f"  Total rows with relevant columns: {len(rows)}")

    by_race: dict[str, list] = {}
    total = 0

    for _row_num, cols in sorted(rows.items(), key=lambda x: int(x[0])):
        ba = str(cols.get("BA", "")).strip()
        if ba != "BesFähig":
            continue
        bb = str(cols.get("BB", "")).strip()
        bf = str(cols.get("BF", "")).strip()

        matched_race = None
        trait_name = None
        for race in RACE_NAMES_SORTED:
            suffix = " " + race
            if bb.endswith(suffix):
                matched_race = race
                trait_name = bb[: -len(suffix)].strip()
                break

        if matched_race is None:
            continue

        rid = race_id(matched_race)
        entry = {
            "name": bb,
            "trait": trait_name,
            "desc": bf,
        }
        by_race.setdefault(rid, []).append(entry)
        total += 1

    result = {
        "by_race": by_race,
        "_meta": {
            "count": total,
            "races": len(by_race),
        },
    }

    for out in (OUT_DATA, OUT_APP):
        out.parent.mkdir(parents=True, exist_ok=True)
        with open(out, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"  Written: {out}  ({total} traits across {len(by_race)} races)")

    # Summary per race
    print("\nTraits per race:")
    for rid, traits in sorted(by_race.items()):
        print(f"  {rid:20s}: {len(traits)}")

if __name__ == "__main__":
    main()
