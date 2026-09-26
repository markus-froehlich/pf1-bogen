"""Domänenzauber -> data/domain_spells.json + app/src/data/domain_spells.json.

Quellen (siehe AGENTS.md „Regel-Autorität"):
  - Grundregelwerk S. 56-63: 33 Domänen, „Domänenzauber: 1 – … 9 – …" (maßgeblich).
  - Excel „Listen" (Spalte „**Sprüche: 1-…"): Domänen + Unterdomänen, Druiden-Domänen,
    Paladin-Eide („gegen …") und Schamanen-Geister (Zusatz „T") — für alles außerhalb des GRW.
Stimmen GRW-Domäne und Excel nicht überein, gilt das GRW; Abweichungen werden ausgegeben.
Zaubernamen werden auf spells.json-IDs abgebildet (Vergleich nur über Buchstaben, Aliasse unten).
Aufruf: python3 tools/build_domain_spells.py
"""
import csv, glob, json, os, re, subprocess

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_PDF_DIR = next(d for d in glob.glob(os.path.join(os.path.dirname(_ROOT), "*PDFs")) if os.path.isdir(d))
GRW = glob.glob(os.path.join(_PDF_DIR, "US50001*.pdf"))[0]
LISTEN = os.path.join(_ROOT, "extraction", "sheets_values", "Listen.csv")
SPELLS = os.path.join(_ROOT, "app", "src", "data", "spells.json")
OUTS = [os.path.join(_ROOT, "data", "domain_spells.json"), os.path.join(_ROOT, "app", "src", "data", "domain_spells.json")]

# Genitiv in „Domäne des/der X" -> Name wie in der Excel-Liste
GRW_NAME = {"Adels": "Adel", "Bösen": "Böses", "Guten": "Gutes", "Glücks": "Glück", "Todes": "Tod", "Wahnsinns": "Wahnsinn",
            "Wassers": "Wasser", "Wetters": "Wetter", "Wissens": "Wissen", "Schutzes": "Schutz", "Feuers": "Feuer",
            "Krieges": "Krieg", "Handwerks": "Handwerk", "Pflanze": "Pflanzen", "Rune": "Runen"}
# Schreibweisen in den Listen -> Name in spells.json (nur wo nachweislich derselbe Zauber)
# (links: Schreibweise in Domänenliste/Excel; rechts: Name in spells.json — im GRW-Zauberkapitel geprüft)
ALIAS = {"Segen": "Segnen", "Rechtschaffenes bannen": "Rechtschaffendes bannen",
         "Undurchdringliche Dunkelheit": "Tiefere Dunkelheit",   # Dunkelheit 3 = Tiefere Dunkelheit (GRW-Zauberkapitel)
         "Luftwandeln": "Luftweg", "Schwächerer Bindender Ruf": "Schwacher Bindender Ruf",
         "Tier beherrschen": "Tiere beherrschen", "Flammen erzeugen": "Flamme erzeugen",
         "Furcht verursachen": "Furcht auslösen", "Diemensionstür": "Dimensionstür",
         "Energien wiederstehen": "Energien widerstehen", "Gegenstand beleben": "Gegenstände beleben",
         "Göttlicher Gefallen": "Göttliche Gunst",
         "Monster herbeirufen V (ruft 1W3 Schatten herbei)": "Monster herbeizaubern V"}


def norm(s):
    """Vergleichsschlüssel: nur Buchstaben — Trenn-/Doppelpunkte und Zeilenumbruch-Trennungen egal."""
    return re.sub(r"[^a-zäöüß]", "", (s or "").replace("­", "").replace("ﬀ", "ff").lower())


def grw_lists():
    raw = subprocess.run(["pdftotext", "-f", "50", "-l", "70", GRW, "-"], capture_output=True, text=True, check=True).stdout
    t = re.sub(r"\s+", " ", raw.replace("­", ""))
    out, prev = {}, 0
    for m in re.finditer(r"Domänenzauber: (1 ?[–-].*?9 ?[–-] ?[^.]*?)\.", t):
        heads = re.findall(r"Domäne (?:der|des) ([A-ZÄÖÜ][a-zäöüß]+)", t[prev:m.start()])
        prev = m.end()
        name = GRW_NAME.get(heads[-1], heads[-1])
        # Gedankenstrich fehlt im PDF vereinzelt („3 Tier beherrschen")
        out[name] = {int(n): s.strip() for n, s in re.findall(r"(\d) ?[–-]? ?(.*?)(?=, \d ?[–-]? ?[A-ZÄÖÜ]|$)", m.group(1))}
    return out


def excel_lists():
    out = []
    for r in csv.reader(open(LISTEN, encoding="utf-8")):
        k = next((j for j, c in enumerate(r) if c.startswith("**Sprüche")), None)
        if k is None:
            continue
        raw_name = next(r[j].strip().rstrip(":").strip() for j in range(k - 1, -1, -1) if re.search(r": ?$", r[j]) and not r[j].startswith("*"))
        name = raw_name.rstrip(".")
        base = re.sub(r"\s+[TD]$", "", name)
        txt = " ".join(c for c in r[k:k + 12] if c).replace("**Sprüche:", "")
        spells = {int(n): sp.strip(" ,.") for n, sp in re.findall(r"(\d) ?- ?(.*?)(?=, ?\d ?-|$)", txt) if 1 <= int(n) <= 9}
        if spells:  # Excel-Rest nur am letzten Eintrag: „Sechster Sinn Wissen 0", „Steinhaut . gegen Drachen"
            last, short = max(spells), re.sub(r"\s*\(.*\)$", "", base)
            spells[last] = re.sub(r"\s*\.?\s+(" + re.escape(base) + "|" + re.escape(short) + r")(\s+[TD])?\.?(\s+0)*\s*$", "", spells[last])
        spells = {lv: re.sub(r"(\s+0)+\s*$", "", sp).strip(" ,.") for lv, sp in spells.items()}
        group = "geist" if re.search(r"\sT$", name) else "eid" if name.startswith("gegen ") else "domaene"
        out.append({"name": name, "group": group, "spells": spells})
    return out


def main():
    spells = json.load(open(SPELLS, encoding="utf-8"))["spells"]
    by_name = {norm(s["name"]["de"]): s["id"] for s in spells}

    def one(name):
        name = ALIAS.get(name.strip(), name.strip())
        return by_name.get(norm(name)) or by_name.get(norm(re.sub(r"\s*\(.*\)\s*$", "", name)))

    def spell_id(name):
        """ID oder Liste von IDs („Metall abkühlen, Metall erhitzen")."""
        if one(name):
            return one(name)
        parts = [p for p in re.split(r",\s*|\s+oder\s+", name) if p]
        ids = [one(p) for p in parts]
        return ids if len(parts) > 1 and all(ids) else None

    grw, exc = grw_lists(), excel_lists()
    diffs, domains, parent = [], {}, None
    for e in exc:
        # Excel-Reihenfolge: GRW-Domäne, danach ihre Unterdomänen (bis „Erschaffung" = Domänen anderer Bücher)
        if e["name"] == "Erschaffung":
            parent = None
        is_main = e["name"] in grw and e["name"] not in domains
        if is_main:
            parent = e["name"]
        name, spl, source = e["name"], e["spells"], "Excel"
        if name in grw and name not in domains:
            source = "GRW"
            for lv, s in grw[name].items():
                if norm(ALIAS.get(s, s)) != norm(ALIAS.get(spl.get(lv, ""), spl.get(lv, ""))):
                    diffs.append(f"{name} Grad {lv}: Excel „{spl.get(lv)}“ → GRW „{s}“")
            spl = grw[name]
        sub_of = None if is_main or e["group"] != "domaene" else parent
        key = f"{sub_of}/{name}" if sub_of else name
        n = 2
        while key in domains:  # gleicher Name mehrfach (z. B. „Höhlen" als Unterdomäne und Druiden-Domäne)
            key, n = f"{name} ({n})", n + 1
        domains[key] = {"name": name, "group": e["group"], "source": source,
                        "parent": sub_of,
                        "spells": {lv: {"name": s, "id": spell_id(s)} for lv, s in sorted(spl.items())}}
    missing = [n for n in grw if n not in domains]
    unmapped = sorted(f"{d['name']} {lv}: {v['name']}" for d in domains.values() for lv, v in d["spells"].items() if not v["id"])
    data = {"_meta": {"source": "GRW S. 56-63 (33 Domänen, maßgeblich) + Excel Listen (Unterdomänen, Druide, Eide, Geister)",
                      "count": len(domains), "grw_domains": len(grw), "unmapped": len(unmapped)}, "domains": domains}
    for p in OUTS:
        with open(p, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=1)
    print(f"{len(domains)} Einträge, {len(grw)} GRW-Domänen, ohne Excel-Zeile: {missing}")
    print(f"{len(diffs)} Abweichungen Excel → GRW (GRW übernommen):")
    for d in diffs:
        print("  ", d)
    print(f"{len(unmapped)} Zauber ohne spells.json-Treffer:")
    for u in unmapped:
        print("  ", u)


if __name__ == "__main__":
    main()
