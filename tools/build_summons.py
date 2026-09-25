"""Herbeizauber-Daten aus den PDFs -> data/summons.json + app/src/data/summons.json.

Quellen (maßgeblich, siehe AGENTS.md „Regel-Autorität"):
  - Grundregelwerk Tabelle 10-1 „Monster herbeizaubern" und 10-2 „Verbündeten der Natur
    herbeizaubern" (Kreaturen je Grad, * = celestische/infernalische Schablone).
  - Monsterhandbuch I + II: Werteblöcke (nur Spielwerte, keine Beschreibungstexte) und
    Schablonen Celestisch/Infernalisch (MHB I S. 294-295).

Die PDFs liegen im Nachbarordner des Repos (Ordnername endet auf „PDFs"); gesucht wird per
Dateinamen-Präfix US50001 / US50002 / US50006. Braucht `pdftotext` (poppler).
Aufruf: python3 tools/build_summons.py
"""
import concurrent.futures as cf
import glob, json, os, re, subprocess

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_PDF_DIR = next(d for d in glob.glob(os.path.join(os.path.dirname(_ROOT), "*PDFs")) if os.path.isdir(d))
GRW = glob.glob(os.path.join(_PDF_DIR, "US50001*.pdf"))[0]
MHB = {"MHB I": glob.glob(os.path.join(_PDF_DIR, "US50002*.pdf"))[0],
       "MHB II": glob.glob(os.path.join(_PDF_DIR, "US50006*.pdf"))[0]}
OUTS = ([os.environ["SUMMONS_OUT"]] if os.environ.get("SUMMONS_OUT") else
        [os.path.join(_ROOT, "data", "summons.json"), os.path.join(_ROOT, "app", "src", "data", "summons.json")])

def text(pdf, page, x=None, layout=False):
    cmd = ["pdftotext", "-f", str(page), "-l", str(page)]
    if layout: cmd.append("-layout")
    if x is not None: cmd += ["-x", str(x), "-y", "0", "-W", "302", "-H", "800"]
    return subprocess.run(cmd + [pdf, "-"], capture_output=True, text=True, check=True).stdout

def page_count(pdf):
    info = subprocess.run(["pdfinfo", pdf], capture_output=True, text=True, check=True).stdout
    return int(re.search(r"Pages:\s+(\d+)", info)[1])

# ---------------------------------------------------------------- Tabellen 10-1 / 10-2
def parse_table(chunks):
    grade, out = None, []
    for chunk in chunks:
        for line in chunk.split("\n"):
            s = line.strip()
            if grade == 9 and re.match(r"(Reichweite|Ziel|Schule|Zeitaufwand):", s): break
            m = re.match(r"(\d)\. Stufe\s+Unterart", s)
            if m: grade = int(m[1]); continue
            if not grade or not s or s.startswith(("*", "Wenn du", "Tabelle", "Zauber")) or re.fullmatch(r"\d{3}", s): continue
            m = re.match(r"^n?\s*(.*?)(\*?)\s{2,}(—|[A-ZÄÖÜ][\w ,äöü]+)$", s) or re.match(r"^n?\s*(.+?)(\*?)$", s)
            if not m: continue
            name, star, sub = m[1].strip().rstrip(" —"), bool(m[2]), (m[3] if m.lastindex >= 3 else None)
            if not name and sub: name, sub = sub, None          # Spalte verrutscht („Riesenameise, Drohne")
            if not name or name == "—" or re.search(r"[a-z]{3,} [a-z]{3,} [a-z]{3,}", name) and "Pixie" not in name: continue
            out.append({"grade": grade, "name": name, "template": star, "subtype": None if sub in (None, "—") else sub})
    return out

# GRW PDF-Seite 310/311 = Tab. 10-1, 355 = Tab. 10-2 (gedruckte Seite = PDF-Seite - 1)
T_MONSTER = parse_table([text(GRW, 310, 0, True), text(GRW, 310, 301, True), text(GRW, 311, 0, True)])
T_NATUR = parse_table([text(GRW, 355, 0, True), text(GRW, 355, 301, True)])

# ---------------------------------------------------------------- Werteblöcke MHB I/II
ALIGN = r"(?:RG|NG|CG|RN|N|CN|RB|NB|CB|immer \w+|meist \w+)"
LABELS = ["INI", "Aura", "RK", "TP", "REF", "Verteidigungsfähigkeiten", "SR", "Immunitäten", "Resistenzen", "ZR", "Schwächen",
          "Bewegungsrate", "Nahkampf", "Fernkampf", "Angriffsfläche", "Besondere Angriffe", "Zauberähnliche Fähigkeiten",
          "Bekannte Zauber", "Vorbereitete Zauber", "ST", "GAB", "Talente", "Fertigkeiten", "Sprachen", "Besondere Eigenschaften"]
SECTION_END = re.compile(r"^(LEBENSWEISE|ÖKOLOGIE|BESONDERE FÄHIGKEITEN|Umgebung |Organisation )")
HGRE = r"HG ([\d½⅓¼⅙⅛]+(?:/\d+)?)"
FRAC = {"½": "1/2", "⅓": "1/3", "¼": "1/4", "⅙": "1/6", "⅛": "1/8"}

def fix_merged(text):
    # „SR 5/–" + Überschrift verschmelzen beim Spaltenschnitt zu „SR 5/ANGRIFF"
    return re.sub(r"/(ANGRIFF|VERTEIDIGUNG|SPIELWERTE)$", "/–", text)

def entries_of(lines):
    entries, cur = [], None
    for l in lines:
        if l in ("VERTEIDIGUNG", "ANGRIFF", "SPIELWERTE", "TAKTIK"): cur = None; continue
        lab = next((L for L in LABELS if l.startswith(L + " ") or l.startswith(L + ":") or l == L), None)
        if re.match(ALIGN + " ", l) and not any(e[0] in ("Typ", "INI") for e in entries): lab = "Typ"
        if lab:
            cur = [lab, fix_merged(l if lab == "Typ" else l[len(lab):].strip())]; entries.append(cur)
        elif cur is not None:
            if cur[1].endswith("-") and not cur[1].endswith(" -"):
                # Trennstrich am Zeilenende: echter Bindestrich bleibt, wenn das Wort schon einen hat („Zu-Fall-bringen")
                word = cur[1].rsplit(" ", 1)[-1]
                cur[1] = cur[1] + l if "-" in word[:-1] or l[:1].isupper() else cur[1][:-1] + l
            else:
                cur[1] = cur[1] + " " + l
    return entries

def statblocks():
    blocks = []
    for book, pdf in MHB.items():
        jobs = [(p, x) for p in range(1, page_count(pdf) + 1) for x in (0, 301)]
        with cf.ThreadPoolExecutor(8) as ex: cols = list(ex.map(lambda j: text(pdf, j[0], j[1]), jobs))
        raw, pages = [], []
        for (p, _), t in zip(jobs, cols):
            for l in t.split("\n"): raw.append(l); pages.append(p)
        for i, l in enumerate(raw):
            if not re.fullmatch(r"EP [\d.]+", l.strip()): continue
            name, hg = None, None
            for x in (y.strip() for y in reversed(raw[max(0, i - 8):i])):
                if not x or x.startswith("Illustration") or re.fullmatch(r"\d{1,3}", x): continue
                m = re.fullmatch(HGRE, x)
                if m and not hg: hg = m[1]; continue
                m = re.fullmatch(r"(.+?) " + HGRE, x)
                if m: name, hg = m[1], hg or m[2]; break
                name = x; break
            if not hg:
                hg = next((m[1] for y in raw[i + 1:i + 6] if (m := re.fullmatch(HGRE, y.strip()))), None)
            body = []
            for x in raw[i + 1:i + 160]:
                xs = x.strip().replace("­", "")
                if re.fullmatch(r"EP [\d.]+", xs) or SECTION_END.match(xs): break
                # Name des nächsten Blocks (GROSSBUCHSTABEN, auch angeschnitten) beendet den Block
                if re.fullmatch(r"[A-ZÄÖÜ][A-ZÄÖÜß ,()\-]{1,}", xs) and xs not in ("VERTEIDIGUNG", "ANGRIFF", "SPIELWERTE", "TAKTIK", "ST", "GE", "KO", "IN", "WE", "CH"): break
                if xs and not xs.startswith("Illustration") and not re.fullmatch(r"\d{1,3}", xs) and not re.fullmatch(HGRE, xs):
                    body.append(xs)
            blocks.append({"book": book, "page": pages[i] - 1, "name": (name or "").strip(), "hg": FRAC.get(hg, hg),
                           "ep": l.strip()[3:], "entries": entries_of(body), "_raw_after": raw[i:i + 900]})
    return blocks

BLOCKS = statblocks()
# HG aus EP, wenn im Text keine HG-Zeile steht: MHB I Tabelle 1-7 (EP- und GM-Werte nach HG), 800 EP = HG 3
EP_HG = {"50": "1/8", "65": "1/6", "100": "1/4", "135": "1/3", "200": "1/2", "400": "1", "600": "2", "800": "3", "1.200": "4",
         "1.600": "5", "2.400": "6", "3.200": "7", "4.800": "8", "6.400": "9"}
for b in BLOCKS:
    if not b["hg"] and b["ep"] in EP_HG: b["hg"], b["hg_from_ep"] = EP_HG[b["ep"]], True

def norm(s): return re.sub(r"[^a-zäöüß]", "", (s or "").lower().replace("ß", "ss"))
BY_NAME = {}
for i, b in enumerate(BLOCKS): BY_NAME.setdefault(norm(b["name"]), []).append(i)

# ---------------------------------------------------------------- Zuordnung Tabelle -> Block
SIZES = {"klein": "KLEINER", "mittelgroß": "MITTELGROSSER", "mittel": "MITTELGROSSER", "groß": "GROSSER",
         "riesig": "RIESIGER", "mächtiger": "MÄCHTIGER", "älterer": "ÄLTERER"}
MANUAL = {  # Tabellenname -> Blockname(n) im MHB, wo der Name abweicht
    "Orca (Delphin)": ["SCHWERTWAL"], "Delphin (Orca)": ["SCHWERTWAL"], "Auerochse (Herdentier)": ["AUREROCHSE"],
    "Bartteufel": ["BARTTEUFEL (BARBAZU)"], "Eisteufel": ["EISTEUFEL (GELUGON)"], "Klingenteufel": ["KLINGENTEUFEL (HAMATULA)"],
    "Knochenteufel": ["KNOCHENTEUFEL (OSYLUTH)"], "Erynnie (Teufel)": ["ERINNYE"], "Lemur (Teufel)": ["LEMURE"],
    "Bralani Azata": ["BRALANI"], "Ghaele Azata": ["GHAELE"], "Lillend Azata": ["LILLEND"], "Menschenaffe": ["GORILLA"],
    "Schreckensmenschenaffe": ["SCHRECKENSAFFE (GIGANTOPITHECUS)"], "Schreckensaffe": ["SCHRECKENSAFFE (GIGANTOPITHECUS)"],
    "Riesenameise, Arbeiter": ["RIESENAMEISE"], "Riesenameise, Soldat": ["RIESENAMEISE"], "Riesenameise, Drohne": ["RIESENAMEISE"],
    "Roc": ["ROCH"], "Schreckensbär": ["SCHRECKENSBÄR (HÖHLENBÄR)"], "Schreckenseber": ["SCHRECKENSEBER (DAEODON)"],
    "Schreckenswildschwein": ["SCHRECKENSEBER (DAEODON)"], "Schreckenshai": ["SCHRECKENSHAI (MEGALODON)"],
    "Schreckenslöwe": ["SCHRECKENSLÖWE (GEFLECKTER LÖWE)"], "Schreckenstiger": ["SCHRECKENSTIGER (SMILODON)"],
    "Triceratops (Dinosaurier)": ["TRIZERATOPS"],
    "Bebelith (Dämon)": [], "Schreckensrabe": [],   # in MHB I/II nicht enthalten
}
VARIANT = {"Riesenameise, Arbeiter": "Arbeiter", "Riesenameise, Drohne": "Drohne", "Riesenameise, Soldat": "Soldat"}

def lookup(name):
    if name in MANUAL: names = MANUAL[name]
    elif name.startswith("Elementar, "):
        size = SIZES[name.split(", ")[1]]
        names = [f"{size} {e}ELEMENTAR" for e in ("ERD", "FEUER", "LUFT", "WASSER")]
    else:
        base = re.sub(r"\s*\(.*\)", "", name)
        cands = [name, base] + re.findall(r"\((.*?)\)", name)
        if ", " in base: a, b = base.split(", ", 1); cands.append(f"{b} {a}")   # „Archon, Leuchtender"
        hit = next((c for c in cands if norm(c) in BY_NAME), None)
        names = [hit] if hit else None
    if names is None: raise SystemExit(f"Keine Zuordnung für {name!r} — MANUAL ergänzen")
    ids = []
    for n in names:
        idx = [i for i in BY_NAME.get(norm(n), []) if BLOCKS[i]["book"] == "MHB I"] or BY_NAME.get(norm(n), [])
        if not idx: raise SystemExit(f"Block {n!r} (für {name!r}) nicht gefunden")
        ids.append(idx[0])
    return ids

def cid(b): return re.sub(r"[^a-z0-9]+", "_", norm(b["name"]).replace("ä", "ae").replace("ö", "oe").replace("ü", "ue")).strip("_")

def variants(b):
    """Varianten-Regeln direkt aus dem Text nach dem Block (Riesenameise, Mephit)."""
    t = "\n".join(x.strip() for x in b["_raw_after"]).replace("\u00ad\n", "").replace("\u00ad", "")
    if b["name"] == "RIESENAMEISE":
        out = {}
        for key in ("Arbeiter", "Drohne", "Königin"):
            m = re.search(key + r" \(([+–-]\d) HG\) (.+?)(?=\n(?:Arbeiter|Drohne|Königin) \(|\n\n|$)", t, re.S)
            if m: out[key] = {"hg_delta": int(m[1].replace("–", "-")), "text": re.sub(r"\s+", " ", m[2].replace("­", "")).strip()}
        return out
    if b["name"] == "MEPHIT":
        out, cur = {}, None
        for line in t.split("\n"):
            line = line.replace("­", "").strip()
            m = re.fullmatch(r"(\w+mephit) \((\w+)\)", line)
            if m: cur = m[1]; out[cur] = {"element": m[2], "text": []}; continue
            if re.fullmatch(r"EP [\d.]+", line) and out: break          # nächster Werteblock
            if line in ("LEBENSWEISE", "ÖKOLOGIE"): cur = None; continue  # Pause bis zur nächsten Art
            if cur and line and not line.startswith(("@@", "Illustration", "Menschenaffe")) and not re.fullmatch(r"\d{1,3}", line):
                out[cur]["text"].append(line)
        for v in out.values():
            joined = " ".join(v["text"])
            v["text"] = [re.sub(r"\s+", " ", p).strip() for p in joined.split("•")[1:]]
        return out
    return None

def creature(b):
    tp = next((e[1] for e in b["entries"] if e[0] == "TP"), "")
    dice = re.search(r"\(([^)]*)\)", tp)
    tw = sum(int(n) for n in re.findall(r"(\d+)W\d+", dice[1])) if dice else None
    attrs = next((e[1] for e in b["entries"] if e[0] == "ST"), "")
    ch = re.search(r"CH (\d+|—|–)", "ST " + attrs)
    c = {"id": cid(b), "name": b["name"].title(), "book": b["book"], "page": b["page"], "hg": b["hg"], "ep": b["ep"],
         "tw": tw, "ch": int(ch[1]) if ch and ch[1].isdigit() else None,
         "lines": [[k, v] for k, v in b["entries"] if k != "?"]}
    if b.get("hg_from_ep"): c["hg_from_ep"] = True
    v = variants(b)
    if v: c["variants"] = v
    return c

creatures = {}
def build_list(table):
    out = []
    for e in table:
        ids = lookup(e["name"])
        for i in ids: creatures.setdefault(cid(BLOCKS[i]), creature(BLOCKS[i]))
        entry = {**e, "creatures": [cid(BLOCKS[i]) for i in ids]}
        if e["name"] in VARIANT: entry["variant"] = VARIANT[e["name"]]
        if e["name"].startswith("Mephit"): entry["variant"] = "any"
        out.append(entry)
    return out

lists = {"monster": build_list(T_MONSTER), "natur": build_list(T_NATUR)}
TEMPLATES = {  # MHB I S. 294-295, Tabellen „Verteidigungsfähigkeiten einer celestischen/infernalischen Kreatur"
    "celestisch": {"name": "Celestisch", "page": 294, "resist": "Säure, Kälte und Elektrizität", "sr_vs": "Böses",
                   "smite": "Böses niederstrecken", "smite_vs": "böse"},
    "infernalisch": {"name": "Infernalisch", "page": 294, "resist": "Kälte und Feuer", "sr_vs": "Gutes",
                     "smite": "Gutes niederstrecken", "smite_vs": "gute"},
    "_rules": {"hg_plus_one_from_tw": 5, "darkvision_m": 18, "zr": "neuer HG + 5",
               "by_tw": [{"max": 4, "resist": 5, "sr": None}, {"max": 10, "resist": 10, "sr": 5}, {"max": 999, "resist": 15, "sr": 10}]},
}
SPELLS = {  # Anzahl je Zaubergrad (GRW S. 308/352: gleicher Grad 1, Grad-1 1W3, niedriger 1W4+1)
    "count_same": "1", "count_minus1": "1W3", "count_lower": "1W4+1", "duration": "1 Runde/Stufe",
    "monster": {"name": "Monster herbeizaubern", "classes": "BAR, KLE, HXM/MAG", "page": 308, "table": "10-1", "table_page": 309},
    "natur": {"name": "Verbündeten der Natur herbeizaubern", "classes": "DRU, WAL", "page": 352, "table": "10-2", "table_page": 354},
}
data = {"_meta": {"source": "GRW Tab. 10-1/10-2 (S. 309/354), Werte aus Monsterhandbuch I/II, Schablonen MHB I S. 294-295",
                  "built_by": "tools/build_summons.py", "note": "nur Spielwerte, keine Beschreibungstexte"},
        "spells": SPELLS, "templates": TEMPLATES, "lists": lists, "creatures": creatures}
for out in OUTS:
    with open(out, "w", encoding="utf-8") as f: json.dump(data, f, ensure_ascii=False, indent=1)
missing = sorted({e["name"] for l in lists.values() for e in l if not e["creatures"]})
print(f"10-1: {len(lists['monster'])} Einträge, 10-2: {len(lists['natur'])} Einträge, {len(creatures)} Werteblöcke")
print("ohne Werteblock (nicht in MHB I/II):", missing)
