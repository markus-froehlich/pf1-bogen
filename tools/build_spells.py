#!/usr/bin/env python3
"""
Extract spells from ZauberListen:
  - Descriptions: ZABeschS (BB4:BF2239) — name, school, page, description
  - Class levels:  ZaListe  (A3:AY1212) — per-class (level, spell_name) column pairs
Writes data/spells.json
"""
import sys, os, json, re
sys.path.insert(0, os.path.dirname(__file__))
from dump_util import grid

# ZaListe column pairs: (level_col_idx, name_col_idx, class_id, class_name_de)
# Indices are 0-based from column A
CLASSES = [
    (1,  2,  'barde',       'Barde'),
    (3,  4,  'druide',      'Druide'),
    (5,  6,  'hxm_magier',  'Hxm./Magier'),
    (7,  8,  'kleriker',    'Kleriker'),
    (9,  10, 'paladin',     'Paladin'),
    (11, 12, 'waldlaeufer', 'Waldläufer'),
    (13, 14, 'alchemist',   'Alchemist'),
    (15, 16, 'hexe',        'Hexe'),
    (17, 18, 'inquisitor',  'Inquisitor'),
    (19, 20, 'paktmagier',  'Paktmagier'),
    # (21,22 = Liste 1/2 = custom, skip)
    (25, 26, 'adept',       'Adept'),
    (27, 28, 'kampfmagier', 'Kampfmagier'),
    (29, 30, 'antipaladin', 'Antipaladin'),
    (31, 32, 'arkanist',    'Arkanist'),
    (33, 34, 'blutwueter',  'Blutwüter'),
    (35, 36, 'ermittler',   'Ermittler'),
    (37, 38, 'jaeger',      'Jäger'),
    (39, 40, 'kriegspriester', 'Kriegspriester'),
    (41, 42, 'mystiker',    'Mystiker'),
    (43, 44, 'schamane',    'Schamane'),
    (45, 46, 'skalde',      'Skalde'),
    # (47,48 = Legendär = epic, keep)
    (47, 48, 'legendaer',   'Legendär'),
]

SCHOOL_MAP = {
    'Bann': 'Bannung', 'Be': 'Beschwörung', 'BeK': 'Beschwörung/Kreation',
    'Er': 'Erkennungsmagie', 'Hrv': 'Hervorrufung', 'Hv': 'Hervorrufung',
    'Il': 'Illusion', 'Mk': 'Magie', 'Nk': 'Nekromantie', 'Sn': 'Nekromantie',
    'Tr': 'Transmutation', 'Vz': 'Verzauberung', 'Vw': 'Verwandlung',
    'Wb': 'Wahrsagerei', 'Wk': 'Wirkungsbereich',
    'Hv Fe': 'Hervorrufung (Feuer)', 'Hv El': 'Hervorrufung (Elektrizität)',
    'Hv Kä': 'Hervorrufung (Kälte)', 'Hv Sä': 'Hervorrufung (Säure)',
}

def normalize(name):
    """Normalize spell name for matching between ZaListe and ZABeschS."""
    if not name: return ''
    s = str(name).strip()
    # Remove trailing " Lg" suffix used for spell-like abilities
    return s

def make_id(name, seen):
    s = str(name).strip().lower()
    s = s.replace('ä','ae').replace('ö','oe').replace('ü','ue').replace('ß','ss')
    s = re.sub(r'[^a-z0-9]', '_', s)
    s = re.sub(r'_+', '_', s).strip('_')
    s = s[:60]
    seen[s] = seen.get(s, 0) + 1
    return s if seen[s] == 1 else f'{s}_{seen[s]}'

def build_class_levels():
    """Build reverse map: spell_name (normalized) -> {class_id: level}"""
    print('Reading ZaListe (A3:AY1212)...')
    rows = grid('ZauberListen', 'A3:AY1212', 'val')
    level_map = {}  # normalized_name -> {class_id: level}
    counts = {cls_id: 0 for _, _, cls_id, _ in CLASSES}

    for row in rows:
        for lev_idx, name_idx, cls_id, _ in CLASSES:
            if name_idx >= len(row):
                continue
            name_val = row[name_idx] if len(row) > name_idx else None
            lev_val  = row[lev_idx]  if len(row) > lev_idx  else None
            if not name_val or not str(name_val).strip():
                continue
            # Skip header rows (name = class name like "Bardenzauber")
            name_str = str(name_val).strip()
            if name_str in ('Bardenzauber','Druidenzauber','Hexenmeister-und Magierzauber',
                            'Klerikerzauber','Paladinzauber','Waldläuferzauber',
                            'Alchemistenformeln','Hexenzauber','Inquisitorzauber',
                            'Paktmagierzauber','Adept','Kampfmagier','Antipaladin',
                            'Arkanist','Blutwüter','Ermittler','Jäger','Kriegspriester',
                            'Mystiker','Schamane','Skalde','Legendär','.'):
                continue
            try:
                level = int(float(lev_val)) if lev_val is not None and lev_val != '' else 0
            except (ValueError, TypeError):
                level = 0

            key = normalize(name_str)
            if key not in level_map:
                level_map[key] = {}
            level_map[key][cls_id] = level
            counts[cls_id] += 1

    print(f'Class spell counts: {counts}')
    return level_map

def build_descriptions():
    """Read ZABeschS: BA4:BF2239 — type, name, ?, page, school, description"""
    print('Reading ZABeschS (BA4:BF2239)...')
    rows = grid('ZauberListen', 'BA4:BF2239', 'val')
    descs = {}  # normalized_name -> {page, school, school_de, desc}
    for row in rows:
        if len(row) < 2: continue
        typ  = str(row[0]).strip() if row[0] else ''
        name = str(row[1]).strip() if len(row)>1 and row[1] else ''
        if typ != 'Spruch' or not name: continue
        page       = str(row[3]).strip() if len(row)>3 and row[3] else ''
        school_raw = str(row[4]).strip() if len(row)>4 and row[4] else ''
        desc       = str(row[5]).strip() if len(row)>5 and row[5] else ''
        key = normalize(name)
        descs[key] = {
            'name_de':   name,
            'page':      page,
            'school':    school_raw,
            'school_de': SCHOOL_MAP.get(school_raw, school_raw),
            'desc':      desc,
        }
    print(f'Descriptions loaded: {len(descs)}')
    return descs

if __name__ == '__main__':
    level_map = build_class_levels()
    descs     = build_descriptions()

    # Merge: start from level_map (class-listed spells) + add desc data
    all_names = set(level_map.keys()) | set(descs.keys())
    print(f'Unique spell names (union): {len(all_names)}')

    seen_ids = {}
    spells = []
    for key in sorted(all_names):
        d = descs.get(key, {})
        cl = level_map.get(key, {})
        name = d.get('name_de') or key
        spells.append({
            'id':           make_id(name, seen_ids),
            'name':         {'de': name, 'en': None},
            'school':       d.get('school', ''),
            'school_de':    d.get('school_de', ''),
            'page':         d.get('page', ''),
            'desc':         d.get('desc', ''),
            'class_levels': cl,
        })

    with_cls = sum(1 for s in spells if s['class_levels'])
    print(f'Total spells: {len(spells)}, with class levels: {with_cls}')

    out_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, 'spells.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        class_meta = {cls_id: {'de': cls_de} for _, _, cls_id, cls_de in CLASSES}
        json.dump({
            '_meta': {
                'source_desc': 'ZauberListen!BA4:BF2239 (ZABeschS)',
                'source_levels': 'ZauberListen!A3:AY1212 (ZaListe)',
                'classes': class_meta,
                'count': len(spells),
            },
            'spells': spells,
        }, f, ensure_ascii=False, indent=2)
    print(f'Wrote {out_path} ({os.path.getsize(out_path)//1024} KB)')
    print('\nSample (Feuerball):')
    fb = next((s for s in spells if 'feuerball' == s['id']), None)
    if fb: print(json.dumps(fb, ensure_ascii=False))
