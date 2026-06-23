"""Helper to slice a rectangular region out of a sheets_full/<sheet>.jsonl dump.
Usage: python dump_util.py <Sheet> <A1:Range> [raw|val]
Prints a TSV grid. Sheet name uses the on-disk safe form (underscores)."""
import json, sys, re
FULL = "/Users/froema/Documents/Rollenspiel/Pathfinder/Pathinder Web App/extraction/sheets_full"

def col_to_num(s):
    n = 0
    for ch in s: n = n*26 + (ord(ch)-64)
    return n
def split_coord(c):
    m = re.match(r"([A-Z]+)(\d+)", c)
    return col_to_num(m.group(1)), int(m.group(2))

def load(sheet):
    d = {}
    with open(f"{FULL}/{sheet}.jsonl") as f:
        for line in f:
            o = json.loads(line)
            d[o["c"]] = o
    return d

def grid(sheet, rng, field="raw"):
    d = load(sheet)
    a, b = rng.split(":")
    c1, r1 = split_coord(a); c2, r2 = split_coord(b)
    out = []
    for r in range(r1, r2+1):
        row = []
        for cn in range(c1, c2+1):
            # reverse col num to letters
            s = ""; n = cn
            while n: n, rem = divmod(n-1, 26); s = chr(65+rem)+s
            o = d.get(f"{s}{r}")
            row.append("" if o is None else o.get(field))
        out.append(row)
    return out

if __name__ == "__main__":
    sheet, rng = sys.argv[1], sys.argv[2]
    field = sys.argv[3] if len(sys.argv) > 3 else "raw"
    for row in grid(sheet, rng, field):
        print("\t".join("" if x is None else str(x) for x in row))
