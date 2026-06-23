"""
build_feats.py — Extrahiert Talente/Wundersame Zeichen aus ZaBesch (ZauberListen!BA:BF)
Output: data/feats.json
"""
import csv, json, re, unicodedata, sys
from pathlib import Path

ROOT   = Path(__file__).resolve().parent.parent
SRC    = ROOT / 'extraction/sheets_values/ZauberListen.csv'
OUT    = ROOT / 'data/feats.json'

# ZauberListen.csv columns (0-indexed): A=0 … BA=52 BB=53 BC=54 BD=55 BE=56 BF=57
BA, BB, BC, BD, BE, BF = 52, 53, 54, 55, 56, 57

# Name-Suffix → Typ-Mapping (PF1e Konvention)
SUFFIX_TYPE = {
    ' K':  'Kampf',
    ' M':  'Metamagie',
    ' E':  'Erschaffung',
    ' T':  'Teamwork',
    ' V':  'Volk',
}

# ZaBesch-Subtyp → Typ-Mapping
SUBTYPE_MAP = {
    'Tal':  None,     # → via Suffix-Erkennung, sonst Allgemein
    'WZ':   'WZ',     # Wundersames Zeichen
    'NT':   'Nachteil',
    'QT':   'Sonstige',
    'AF':   'Sonstige',
    'Kla':  'Klasse',
    'Wg':   'Sonstige',
    'Be':   'Sonstige',
    '':     'Sonstige',
}

def slug(name: str) -> str:
    s = unicodedata.normalize('NFKD', name.lower())
    s = re.sub(r'[^a-z0-9äöüß\-]', '_', s)
    s = re.sub(r'_+', '_', s).strip('_')
    return 'feat_' + s

def detect_type(name: str, subtype: str) -> str:
    base = SUBTYPE_MAP.get(subtype, 'Sonstige')
    if base is not None and base != 'Tal':
        return base
    # suffix detection
    for suf, typ in SUFFIX_TYPE.items():
        if name.endswith(suf):
            return typ
    return 'Allgemein'

def run():
    seen_ids   = {}  # id → index in feats list (for dedup)
    feats      = []

    with open(SRC, encoding='utf-8') as f:
        r = csv.reader(f)
        next(r)  # header row
        for row in r:
            if len(row) <= BF:
                continue
            if row[BA].strip() != 'Tal-WZ':
                continue
            name    = row[BB].strip()
            source  = row[BD].strip()
            subtype = row[BE].strip()
            desc    = row[BF].strip()

            if not name or name.startswith('#'):
                continue  # skip error rows

            feat_type = detect_type(name, subtype)
            fid       = slug(name)

            # Deduplicate: keep first occurrence; if same id+different source, append source ref
            if fid in seen_ids:
                idx = seen_ids[fid]
                existing = feats[idx]
                # Merge source refs if different
                existing_src = existing.get('source', '')
                if source and source not in existing_src.split('/'):
                    existing['source'] = (existing_src + '/' + source).strip('/')
                continue

            seen_ids[fid] = len(feats)
            feats.append({
                'id':     fid,
                'name':   {'de': name},
                'type':   feat_type,
                'source': source,
                'desc':   {'de': desc},
            })

    # Sort by name
    feats.sort(key=lambda f: f['name']['de'].lower())

    result = {
        '_meta': {
            'source':  'ZauberListen!BA:BF (Tal-WZ entries)',
            'total':   len(feats),
        },
        'feats': feats,
    }
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'Wrote {len(feats)} feats → {OUT}')

    # Stats
    from collections import Counter
    types = Counter(f['type'] for f in feats)
    for t, n in sorted(types.items(), key=lambda x: -x[1]):
        print(f'  {t:20s} {n}')

if __name__ == '__main__':
    run()
