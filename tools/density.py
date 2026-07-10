import openpyxl, re, time, os
from collections import Counter
_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
path = os.path.join(_ROOT, "Version 6.61", "Bogen 6.61 Spieler.xlsx")
wb = openpyxl.load_workbook(path, data_only=False, read_only=True)
func_re = re.compile(r"([A-Z][A-Z0-9\.]+)\(")
print(f"{'sheet':<22}{'state':<10}{'cells':>9}{'formula':>9}{'value':>9}{'%form':>7}")
grand_funcs = Counter()
per_sheet_funcs = {}
for ws in wb.worksheets:
    t=time.time()
    nf=nv=nc=0
    funcs=Counter()
    for row in ws.iter_rows():
        for c in row:
            v=c.value
            if v is None: continue
            nc+=1
            if c.data_type=='f' or (isinstance(v,str) and v.startswith('=')):
                nf+=1
                for m in func_re.findall(str(v)):
                    funcs[m]+=1
            else:
                nv+=1
    grand_funcs.update(funcs)
    per_sheet_funcs[ws.title]=funcs
    pct = (100*nf/nc) if nc else 0
    print(f"{ws.title:<22}{ws.sheet_state:<10}{nc:>9}{nf:>9}{nv:>9}{pct:>6.0f}%  ({time.time()-t:.1f}s)")
print("\n=== Top functions used across whole workbook ===")
for fn,ct in grand_funcs.most_common(40):
    print(f"  {fn:<14}{ct}")
