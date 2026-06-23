"""
build_archetypes.py — Extrahiert Archetypen aus ZaBesch (Titel-Einträge)
Output: data/archetypes.json  →  { class_id: [{name, source}] }
"""
import csv, json, unicodedata, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC  = ROOT / 'extraction/sheets_values/ZauberListen.csv'
OUT  = ROOT / 'data/archetypes.json'

BA, BB, BC, BD, BE, BF = 52, 53, 54, 55, 56, 57

# Manual overrides: ZaBesch header → class_id
MANUAL_MAP = {
    'e2':              'e2',
    'Kundsch.-Geleh.': 'kundsch_geleh',
    'Imp':             None,           # Familiar/companion subtypes — skip
    'Antipaladin':     'antipaladin',
    'Str.-Palas':      'streiter',     # Streiter-Paladin variant
    'Ritters':         'ritter',
    'Kampfm.':         'kampfmagus',
    'Mönch':           'moench',
    'Kleriker':        'kleriker',
    'Kämpfer':         'kaempfer',
    'Hexenmeister':    'hexenmeister',
    'Waldläufer':      'waldlaeufer',
    'Inquisitor':      'inquisitor',
}

def normalize(s):
    s = unicodedata.normalize('NFKD', s.lower())
    return re.sub(r'\s+', ' ', s).strip()

def build_class_map():
    with open(ROOT / 'data/classes.json') as f:
        d = json.load(f)
    m = {}
    for c in d['classes']:
        de = c['name']['de']
        if de:
            m[normalize(de)] = c['id']
        m[c['id']] = c['id']
    return m

def lookup(header, class_map):
    if header in MANUAL_MAP:
        return MANUAL_MAP[header]
    n = normalize(header)
    if n in class_map:
        return class_map[n]
    # Partial match
    for key, cid in class_map.items():
        if key.startswith(n[:5]) or n.startswith(key[:5]):
            return cid
    return None

def run():
    class_map = build_class_map()

    # Parse Titel entries
    raw_classes = {}  # header_name → [{name, source}]
    current = None

    with open(SRC, encoding='utf-8') as f:
        r = csv.reader(f)
        next(r)
        for row in r:
            if len(row) <= BF:
                continue
            if row[BA].strip() != 'Titel':
                continue
            name   = row[BB]
            source = row[BD].strip()
            stripped = name.strip()
            if not stripped:
                continue

            # Class header: starts with 3+ spaces
            if name.startswith('   ') or name.startswith('\t'):
                current = stripped
                if current not in raw_classes:
                    raw_classes[current] = []
            elif current is not None and stripped:
                # Skip racial archetype lines (e.g. "Zwerg Historiker 1")
                if re.match(r'^[A-ZÄÖÜ][a-zäöüß]+ [A-ZÄÖÜ]\S+ \d', stripped):
                    continue
                raw_classes[current].append({'name': stripped, 'source': source})

    # Map to class IDs
    result = {}
    skipped = []
    for header, archs in raw_classes.items():
        cid = lookup(header, class_map)
        if cid is None:
            skipped.append(header)
            continue
        if cid not in result:
            result[cid] = []
        # Deduplicate by name
        seen = {a['name'] for a in result[cid]}
        for a in archs:
            if a['name'] not in seen:
                result[cid].append(a)
                seen.add(a['name'])

    # Sort archetypes by name within each class
    for cid in result:
        result[cid].sort(key=lambda x: x['name'].lower())

    total = sum(len(v) for v in result.values())
    out_data = {
        '_meta': {
            'source': 'ZauberListen Titel-Einträge',
            'classes': len(result),
            'total':   total,
        },
        'archetypes': result,
    }
    OUT.write_text(json.dumps(out_data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'Wrote {total} archetypes across {len(result)} classes → {OUT}')
    if skipped:
        print(f'Skipped headers (no class match): {skipped}')
    # Sample
    for cid, archs in list(result.items())[:6]:
        print(f'  {cid}: {[a["name"] for a in archs[:4]]}')

if __name__ == '__main__':
    run()
