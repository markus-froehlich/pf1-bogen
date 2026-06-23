#!/usr/bin/env python3
"""Extract armor and shield data from Waffe sheet -> data/armor.json + data/shields.json"""
import sys, os, json, re
sys.path.insert(0, os.path.dirname(__file__))
from dump_util import grid

VALID_ARMOR_TYPES = {'Leicht', 'Mittel', 'Schwer'}
VALID_SHIELD_TYPES = {'Leicht', 'Schwer', 'Arm', 'Turm'}

def make_id(name: str) -> str:
    name = name.strip().lstrip()
    name = re.sub(r'[^a-zA-Z0-9äöüÄÖÜß]', '_', name)
    name = re.sub(r'_+', '_', name).strip('_')
    return name.lower()

def parse_num(v, default=None):
    if v is None or v == '' or v == 'None':
        return default
    try:
        f = float(str(v).replace(',', '.'))
        return int(f) if f == int(f) else f
    except (ValueError, TypeError):
        return default

def max_dex(v):
    """99 in Excel = no max dex cap. Excel uses 0.1 for 'effectively 0'."""
    n = parse_num(v, None)
    if n is None: return None
    if n >= 99: return None
    return 0 if n < 1 else int(n)

def extract_armor():
    rows = grid('Waffe', 'M547:T655', 'val')
    items = []
    for row in rows:
        if not row or not row[0]:
            continue
        name_raw = str(row[0])
        if not name_raw.startswith('     '):
            continue  # skip category headers
        art = str(row[1]) if len(row) > 1 else ''
        if art not in VALID_ARMOR_TYPES:
            continue  # skip material rows and empty
        name = name_raw.strip()
        bonus  = parse_num(row[2] if len(row) > 2 else None, 0)
        maxge  = max_dex(row[3] if len(row) > 3 else None)
        malus  = parse_num(row[4] if len(row) > 4 else None, 0)
        patzer = parse_num(row[5] if len(row) > 5 else None, 0)
        weight = parse_num(row[6] if len(row) > 6 else None, 0)
        page   = str(row[7]).strip() if len(row) > 7 and row[7] else ''
        items.append({
            'id':      make_id(name),
            'name':    {'de': name, 'en': name},
            'type':    art,
            'bonus':   bonus,
            'max_dex': maxge,
            'check_penalty': malus,
            'spell_failure': patzer,
            'weight_kg': weight,
            'page_ref': page,
        })
    return items

def extract_shields():
    rows = grid('Waffe', 'M666:T697', 'val')
    items = []
    for row in rows:
        if not row or not row[0]:
            continue
        name_raw = str(row[0])
        if not name_raw.startswith('     '):
            continue
        art = str(row[1]) if len(row) > 1 else ''
        if art not in VALID_SHIELD_TYPES:
            continue
        name = name_raw.strip()
        bonus  = parse_num(row[2] if len(row) > 2 else None, 0)
        malus  = parse_num(row[4] if len(row) > 4 else None, 0)
        patzer = parse_num(row[5] if len(row) > 5 else None, 0)
        weight = parse_num(row[6] if len(row) > 6 else None, 0)
        page   = str(row[7]).strip() if len(row) > 7 and row[7] else ''
        items.append({
            'id':      make_id(name),
            'name':    {'de': name, 'en': name},
            'type':    art,
            'bonus':   bonus,
            'check_penalty': malus,
            'spell_failure': patzer,
            'weight_kg': weight,
            'page_ref': page,
        })
    return items

if __name__ == '__main__':
    armor   = extract_armor()
    shields = extract_shields()
    print(f'Armor: {len(armor)} entries, Shields: {len(shields)} entries')

    out_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
    os.makedirs(out_dir, exist_ok=True)

    with open(os.path.join(out_dir, 'armor.json'), 'w', encoding='utf-8') as f:
        json.dump({'armor': armor}, f, ensure_ascii=False, indent=2)
    with open(os.path.join(out_dir, 'shields.json'), 'w', encoding='utf-8') as f:
        json.dump({'shields': shields}, f, ensure_ascii=False, indent=2)

    print('Wrote data/armor.json and data/shields.json')
    print('\nArmor sample:',   json.dumps(armor[:2],   ensure_ascii=False))
    print('Shield sample:',  json.dumps(shields[:2],  ensure_ascii=False))
