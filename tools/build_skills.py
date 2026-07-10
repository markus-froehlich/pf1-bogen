#!/usr/bin/env python3
"""
build_skills.py - Extract and normalize skill data from Bogen 6.61 Spieler.xlsx

Extracts from Fertig sheet (rows 2-36) and produces data/skills.json with:
- Skill ID, German name, English name
- Ability score (ST/GE/KO/IN/WE/CH)
- Trained-only flag (marked with * in name)
- Armor check penalty flag (marked with # in name)
- Has subskills flag (Beruf/Handwerk/Wissen have multiple specializations)

Markers in skill names:
  *  = trained only (TrainedOnly = True)
  #  = armor check penalty (ArmorCheckPenalty = True)
  *# = both

Standard PF1e ability-to-skill mappings (using German abbreviations):
  ST (Stärke)      = Strength: Klettern, Schwimmen, Reiten, Überlebenskunst
  GE (Geschick)    = Dexterity: Akrobatik, Entfesselungskunst, Fingerfertigkeit,
                                 Fliegen, Heimlichkeit, Mechanismus ausschalten, Reiten
  KO (Konstitution)= Constitution: (none directly, mostly added to checks)
  IN (Intelligenz) = Intelligence: Magiekunde, Sprachenkunde, Wissen*, Zauberkunde
  WE (Weisheit)    = Wisdom: Heilkunde, Motiv erkennen, Überlebenskunst, Wahrnehmung,
                               Tiere bezirzen
  CH (Charisma)    = Charisma: Auftreten, Bluffen, Diplomatie, Einschüchtern, Verkleiden

Note: Some skills have two valid abilities. Reiten/Überlebenskunst can use GE or ST.
For consistency with the Excel "Fertig" sheet logic, we pick the primary ability used
in calculating bonuses. Falls back to standard PF1e mappings.
"""

import sys
import json
from pathlib import Path

# Add the tools directory to path
sys.path.insert(0, str(Path(__file__).parent))
from dump_util import grid

# Skill ability mappings (German skill name -> primary ability)
SKILL_ABILITIES = {
    "Akrobatik": "GE",
    "Auftreten": "CH",
    "Beruf": "IN",
    "Bluffen": "CH",
    "Diplomatie": "CH",
    "Einschüchtern": "CH",
    "Entfesselungskunst": "GE",
    "Fingerfertigkeit": "GE",
    "Fliegen": "GE",
    "Handwerk": "IN",
    "Heilkunde": "WE",
    "Heimlichkeit": "GE",
    "Klettern": "ST",
    "Magischen Gegenstand benutzen": "CH",
    "Mechanismus ausschalten": "GE",
    "Mit Tieren umgehen": "WE",
    "Motiv erkennen": "WE",
    "Reiten": "GE",
    "Schätzen": "IN",
    "Schwimmen": "ST",
    "Sprachenkunde": "IN",
    "Überlebenskunst": "WE",
    "Verkleiden": "CH",
    "Wahrnehmung": "WE",
    "Wissen Adel": "IN",
    "W. Arkanes": "IN",
    "W. Baukunst": "IN",
    "Wissen Die Ebenen": "IN",
    "Wissen Geographie": "IN",
    "Wissen Geschichte": "IN",
    "Wissen Gewölbekunde": "IN",
    "Wissen Lokales": "IN",
    "Wissen Natur": "IN",
    "Wissen Religion": "IN",
    "Zauberkunde": "IN",
}

# English translations (PF1e standard)
# Note: Abbreviated "W. Arkanes" forms are expanded to full names for English mapping
SKILL_NAMES_EN = {
    "Akrobatik": "Acrobatics",
    "Auftreten": "Perform",
    "Beruf": "Profession",
    "Bluffen": "Bluff",
    "Diplomatie": "Diplomacy",
    "Einschüchtern": "Intimidate",
    "Entfesselungskunst": "Escape Artist",
    "Fingerfertigkeit": "Sleight of Hand",
    "Fliegen": "Fly",
    "Handwerk": "Craft",
    "Heilkunde": "Heal",
    "Heimlichkeit": "Stealth",
    "Klettern": "Climb",
    "Magischen Gegenstand benutzen": "Use Magic Device",
    "Mechanismus ausschalten": "Disable Device",
    "Mit Tieren umgehen": "Handle Animal",
    "Motiv erkennen": "Sense Motive",
    "Reiten": "Ride",
    "Schätzen": "Appraise",
    "Schwimmen": "Swim",
    "Sprachenkunde": "Linguistics",
    "Überlebenskunst": "Survival",
    "Verkleiden": "Disguise",
    "Wahrnehmung": "Perception",
    "Wissen Adel": "Knowledge (Nobility)",
    "Wissen Arkanes": "Knowledge (Arcana)",
    "Wissen Baukunst": "Knowledge (Architecture)",
    "Wissen Die Ebenen": "Knowledge (Planes)",
    "Wissen Geographie": "Knowledge (Geography)",
    "Wissen Geschichte": "Knowledge (History)",
    "Wissen Gewölbekunde": "Knowledge (Dungeoneering)",
    "Wissen Lokales": "Knowledge (Local)",
    "Wissen Natur": "Knowledge (Nature)",
    "Wissen Religion": "Knowledge (Religion)",
    "Zauberkunde": "Spellcraft",
}

def normalize_skill_name(raw_name: str) -> tuple:
    """
    Parse skill name, removing markers (* and #) and returning clean name + flags.

    Returns: (clean_name, trained_only, armor_check_penalty)
    """
    clean_name = raw_name.strip()
    trained_only = "*" in clean_name
    armor_check_penalty = "#" in clean_name

    # Remove markers
    clean_name = clean_name.replace("*", "").replace("#", "").strip()

    return clean_name, trained_only, armor_check_penalty

def expand_abbreviated_wissen(name: str) -> str:
    """Expand abbreviated Wissen skills (W. Arkanes -> Wissen Arkanes)."""
    if name.startswith("W. "):
        return name.replace("W. ", "Wissen ")
    return name

def skill_id(name: str) -> str:
    """Generate a stable, lowercase ID from skill name."""
    # Expand abbreviated names first
    name = expand_abbreviated_wissen(name)
    
    # Replace spaces and special chars with underscores
    return name.lower().replace(" ", "_").replace("ü", "u").replace("ä", "a").replace("ö", "o").replace("ß", "ss")

def build_skills_json():
    """Extract skills from Fertig sheet and build skills.json."""

    # Extract from Fertig sheet, rows 2-36 (rows numbered from 1)
    rows = grid("Fertig", "A2:B36", "val")

    skills = []

    for row in rows:
        if not row or not row[0]:
            continue

        raw_name = row[0]
        trained_only_flag = row[1] if len(row) > 1 else 0

        # Parse the skill name
        clean_name, has_trained_marker, has_acp_marker = normalize_skill_name(raw_name)

        if not clean_name:
            continue

        # Determine trained-only from both marker and column B value
        trained_only = has_trained_marker or (trained_only_flag == 1)

        # Get ability
        ability = SKILL_ABILITIES.get(clean_name, "?")

        # Check if skill has subskills
        has_subskills = clean_name in ("Beruf", "Handwerk", "Wissen Adel", "W. Arkanes",
                                       "W. Baukunst", "Wissen Die Ebenen", "Wissen Geographie",
                                       "Wissen Geschichte", "Wissen Gewölbekunde", "Wissen Lokales",
                                       "Wissen Natur", "Wissen Religion")

        # Expand abbreviated names (W. Arkanes -> Wissen Arkanes)
        display_name = expand_abbreviated_wissen(clean_name)

        # Get English name
        english_name = SKILL_NAMES_EN.get(display_name, clean_name)

        # Build skill entry
        skill = {
            "id": skill_id(display_name),
            "name": {
                "de": display_name,
                "en": english_name,
            },
            "ability": ability,
            "trained_only": trained_only,
            "armor_check_penalty": has_acp_marker,
        }

        if has_subskills:
            skill["has_subskills"] = True

        skills.append(skill)

    # Build final output
    output = {
        "_meta": {
            "source": "Fertig sheet",
            "count": len(skills),
            "faithful_to": "Bogen 6.61 Spieler.xlsx",
            "note": "Skills extracted from Fertig sheet rows 2-36. Markers: * = trained only, # = armor check penalty",
        },
        "skills": skills,
    }

    return output

def main():
    # Build the skills data
    skills_data = build_skills_json()

    # Write to data/skills.json
    output_path = Path(__file__).parent.parent / "data" / "skills.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(skills_data, f, indent=2, ensure_ascii=False)

    print(f"✓ Written {len(skills_data['skills'])} skills to {output_path}")
    print()
    print("Skills extracted:")
    print("=" * 80)
    for skill in skills_data['skills']:
        markers = []
        if skill['trained_only']:
            markers.append("trained-only")
        if skill['armor_check_penalty']:
            markers.append("ACP")
        marker_str = f" [{', '.join(markers)}]" if markers else ""
        subskill_str = " *subskills" if skill.get('has_subskills') else ""
        print(f"  {skill['name']['de']:30s} ({skill['ability']}) | EN: {skill['name']['en']}{marker_str}{subskill_str}")

    print()
    print(f"Total: {len(skills_data['skills'])} skills")

if __name__ == "__main__":
    main()
