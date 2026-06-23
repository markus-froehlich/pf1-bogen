"""Extract Gift entries from ZauberListen.jsonl → data/poisons.json"""
import json, re, sys
from pathlib import Path

ROOT   = Path(__file__).parent.parent
JSONL  = ROOT / "extraction/sheets_full/ZauberListen.jsonl"
OUTPUT = ROOT / "data/poisons.json"

cells = {}
with open(JSONL, encoding="utf-8") as f:
    for line in f:
        c = json.loads(line)
        m = re.match(r'([A-Z]+)(\d+)', c['c'])
        if not m: continue
        col, row = m.group(1), int(m.group(2))
        cells.setdefault(col, {})[row] = str(c.get('val') or c.get('raw') or '').strip()

def col(name, row):
    return cells.get(name, {}).get(row, '') or ''

gift_rows = [r for r, v in cells.get('BA', {}).items() if v == 'Gift']

poisons = []
seen = set()
for row in sorted(gift_rows):
    name = col('BB', row)
    if not name or name.startswith('   ') or name in seen:
        continue
    desc = col('BF', row)
    page = col('BD', row)

    # Parse structured desc: A=..., SGZ=..., I=..., F=..., E=..., H=...
    parsed = {}
    if desc:
        for part in re.split(r',\s*(?=[A-ZÄÖÜ]+=)', desc):
            kv = part.split('=', 1)
            if len(kv) == 2:
                parsed[kv[0].strip()] = kv[1].strip()

    poisons.append({
        'id': re.sub(r'[^a-z0-9]', '_', name.lower().strip()).strip('_'),
        'name': name.strip(),
        'page': page,
        'type': parsed.get('A', ''),
        'dc': parsed.get('SGZ', '') or parsed.get('SG', ''),
        'onset': parsed.get('I', ''),
        'freq': parsed.get('F', ''),
        'effect': parsed.get('E', ''),
        'cure': parsed.get('H', ''),
        'desc': desc,
    })
    seen.add(name)

poisons.sort(key=lambda p: p['name'])
out = {'poisons': poisons, '_meta': {'count': len(poisons)}}
OUTPUT.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(f"Wrote {len(poisons)} poisons → {OUTPUT}")
