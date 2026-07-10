"""Phase 1b: cached value extraction. read_only + data_only streams low-memory.
Writes one CSV per sheet (rectangular, trimmed to used bounds)."""
import openpyxl, os, csv, warnings
warnings.simplefilter("ignore")

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(_ROOT, "Version 6.61", "Bogen 6.61 Spieler.xlsx")
OUT = os.path.join(_ROOT, "extraction", "sheets_values")
os.makedirs(OUT, exist_ok=True)

print("loading (values, read_only)...")
wb = openpyxl.load_workbook(SRC, data_only=True, read_only=True)
for ws in wb.worksheets:
    safe = ws.title.replace("/","_").replace(" ","_")
    # find last non-empty row/col to trim trailing emptiness
    max_c = 0
    buffered = []
    last_nonempty_row = 0
    for ridx, row in enumerate(ws.iter_rows(values_only=True), start=1):
        # trim trailing None in row
        rl = list(row)
        while rl and rl[-1] is None:
            rl.pop()
        if rl:
            last_nonempty_row = ridx
            max_c = max(max_c, len(rl))
        buffered.append(rl)
    # write trimmed
    with open(f"{OUT}/{safe}.csv","w",newline="") as f:
        w = csv.writer(f)
        for rl in buffered[:last_nonempty_row]:
            # pad to max_c for rectangular shape
            w.writerow(rl + [None]*(max_c-len(rl)))
    print(f"  {ws.title:<22} rows={last_nonempty_row:>6} cols={max_c:>4}")
print("DONE values")
