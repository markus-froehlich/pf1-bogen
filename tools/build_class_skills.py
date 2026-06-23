#!/usr/bin/env python3
"""
Extract class skills from FertTabArche and update skills.json with class_skills arrays.

FerTab (Fertig!AE3:BQ130):
- Column AE: class names
- Columns AF:BO (35 cols): skill markers (1, 'x', or empty = class skill)
- Last 3 cols: skill_points, hit_die, something

Output: adds "class_skills" field to each skill in data/skills.json
"""

import sys
import json
sys.path.insert(0, '.')
from tools.dump_util import grid

def normalize_skill_name(name):
    """Remove skill markers and normalize abbreviations"""
    # Remove markers (* = trained only, # = armor check penalty)
    clean = name.replace(" *", "").replace(" #", "").replace("*", "").replace("#", "").strip()

    # Expand common abbreviations used in the sheet
    abbreviations = {
        "w. arkanes": "Wissen Arkanes",
        "w. baukunst": "Wissen Baukunst",
    }

    lower = clean.lower()
    for abbr, full in abbreviations.items():
        if lower.startswith(abbr):
            # Replace abbreviation with full form (preserve original casing)
            clean = full + clean[len(abbr):]
            break

    return clean

def normalize_class_name(name):
    """Normalize class name from sheet (remove leading spaces)"""
    return name.strip()

def load_skills():
    """Load skills.json"""
    with open("data/skills.json") as f:
        data = json.load(f)
    return data["skills"]

def load_classes():
    """Load classes.json and build name->id map"""
    with open("data/classes.json") as f:
        data = json.load(f)

    # Build mappings
    class_id_map = {}
    class_name_map = {}
    for cls in data["classes"]:
        class_id_map[cls["kla_nr"]] = cls["id"]
        class_name_map[cls["name"]["de"]] = cls["id"]

    return data["classes"], class_id_map, class_name_map

def extract_class_skills():
    """Extract class skills from FerTab"""

    skills = load_skills()
    classes, class_id_map, class_name_map = load_classes()

    # Get skill names from sheet (A2:A36)
    skill_names_from_sheet = grid("Fertig", "A2:A36", "val")
    sheet_skills = []
    for row in skill_names_from_sheet:
        name = row[0] if row and row[0] else ""
        clean = normalize_skill_name(name)
        if clean:
            sheet_skills.append(clean)

    print(f"Loaded {len(sheet_skills)} skills from sheet")
    print(f"First 5 skills: {sheet_skills[:5]}")

    # Build mapping from normalized name to skill id
    skill_name_to_id = {}
    for skill in skills:
        de_name = skill["name"]["de"]
        clean_name = normalize_skill_name(de_name)
        skill_name_to_id[clean_name] = skill["id"]

    # Get class data from FerTab (AE3:BO130)
    # Column AE = class names
    # Columns AF:BO (35 cols) = skill markers
    print("\nReading FerTab...")
    class_rows = grid("Fertig", "AE3:BO130", "val")

    class_skills_map = {}  # {skill_id: [class_ids]}

    # Initialize all skills with empty arrays
    for skill in skills:
        class_skills_map[skill["id"]] = []

    classes_processed = 0
    for row_idx, row in enumerate(class_rows, start=3):
        if not row or not row[0]:
            continue

        class_name = normalize_class_name(row[0])
        if not class_name:
            continue

        # Try to find matching class ID
        class_id = class_name_map.get(class_name)

        if not class_id:
            # Try fuzzy match by removing "Ark. " prefix or other markers
            for test_name, test_id in class_name_map.items():
                if test_name.lower() in class_name.lower() or class_name.lower() in test_name.lower():
                    class_id = test_id
                    break

        if not class_id:
            print(f"  WARNING: Could not find class ID for '{class_name}' at row {row_idx}")
            continue

        classes_processed += 1

        # Process skill columns (1-35, starting from index 1 in row)
        for skill_idx in range(min(35, len(row) - 1)):
            marker = row[1 + skill_idx]

            # Marker is class skill if it's truthy (1, 'x', etc)
            if marker and marker != 0 and marker != '0':
                if skill_idx < len(sheet_skills):
                    skill_name = sheet_skills[skill_idx]
                    skill_id = skill_name_to_id.get(skill_name)
                    if skill_id:
                        class_skills_map[skill_id].append(class_id)

    print(f"Processed {classes_processed} classes from FerTab")

    return class_skills_map

def update_skills_json(class_skills_map):
    """Update skills.json with class_skills arrays"""

    with open("data/skills.json") as f:
        data = json.load(f)

    # Add class_skills to each skill
    for skill in data["skills"]:
        skill_id = skill["id"]
        skill["class_skills"] = sorted(class_skills_map.get(skill_id, []))

    # Write back
    with open("data/skills.json", "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    # Also update app copy
    with open("app/src/data/skills.json", "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print("\nUpdated data/skills.json and app/src/data/skills.json")

def verify_output(class_skills_map):
    """Print verification: sample classes and their skills"""

    with open("data/skills.json") as f:
        skills_by_id = {s["id"]: s for s in json.load(f)["skills"]}

    with open("data/classes.json") as f:
        classes_by_id = {c["id"]: c for c in json.load(f)["classes"]}

    print("\n" + "="*60)
    print("VERIFICATION: Sample Class Skills")
    print("="*60)

    sample_classes = ["kaempfer", "magier", "schurke", "barbar", "kleriker"]

    for class_id in sample_classes:
        if class_id not in classes_by_id:
            continue

        class_name = classes_by_id[class_id]["name"]["de"]

        # Get all skills that have this class in their class_skills
        class_skills = [s for s in skills_by_id.values()
                       if class_id in s.get("class_skills", [])]

        print(f"\n{class_name} ({class_id}):")
        print(f"  {len(class_skills)} class skills:")
        for skill in sorted(class_skills, key=lambda s: s["name"]["de"]):
            print(f"    - {skill['name']['de']}")

def main():
    print("Extracting class skills from FerTab...")
    class_skills_map = extract_class_skills()

    print(f"\nBuilding class_skills arrays...")
    # Count how many classes per skill
    for skill_id, class_ids in list(class_skills_map.items())[:5]:
        print(f"  {skill_id}: {len(class_ids)} classes")

    print(f"\nUpdating skills.json...")
    update_skills_json(class_skills_map)

    verify_output(class_skills_map)

    print("\n" + "="*60)
    print("SUCCESS: class_skills arrays added to skills.json")
    print("="*60)

if __name__ == "__main__":
    main()
