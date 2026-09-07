"""Tier 1 #3 — WorldPop population per 2° cell (internal only; never shown to users).

Input : data/raw/worldpop/ppp_2020_1km_Aggregated.tif (WorldPop 2020, 1 km, people per pixel, CC BY 4.0)
Output: data/derived/population.json  {cells: {cell_id: people}, provenance}
Used for: ordering translation review and QA by people affected; nothing user-facing (spec E.A.3).
Validation: global total within 7.4-8.2 billion; no negative cells; else keep last-good and exit non-zero.
"""
import json, os, sys, pathlib, tempfile, datetime
import numpy as np
ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = ROOT / "data/raw/worldpop/ppp_2020_1km_Aggregated.tif"
OUT = ROOT / "data/derived/population.json"
LATS = np.arange(-89.0, 90.0, 2.0); LONS = np.arange(-179.0, 180.0, 2.0)
def cid(lat, lon): return f"{lat:+06.1f}_{lon:+07.1f}"
def fail(msg): print(f"POPULATION FAILED: {msg}. Keeping last-good.", file=sys.stderr); sys.exit(2)

def main():
    import rasterio
    from rasterio.windows import Window
    if not SRC.exists(): fail("WorldPop GeoTIFF missing")
    ds = rasterio.open(SRC)
    if ds.count != 1: fail("unexpected band count")
    tr = ds.transform; W, H = ds.width, ds.height
    nodata = ds.nodata
    cells = {}
    # read in row blocks; accumulate pixel sums into 2° cells using integer index math (pixel centre -> cell)
    block = 512
    for r0 in range(0, H, block):
        rows = min(block, H - r0)
        a = ds.read(1, window=Window(0, r0, W, rows)).astype(np.float64)
        if nodata is not None: a[a == nodata] = 0.0
        a[a < 0] = 0.0
        ys = tr.f + tr.e * (np.arange(r0, r0 + rows) + 0.5)       # latitude of each row centre
        xs = tr.c + tr.a * (np.arange(W) + 0.5)                   # longitude of each column centre
        li = np.clip(np.round((ys + 1) / 2).astype(int) * 2 - 1, -89, 89)
        lj = (((np.round((xs + 1) / 2).astype(int) * 2 - 1) + 179) % 360) - 179
        # sum columns into 2° longitude bins first (180 bins), then rows
        colbin = ((lj + 179) // 2).astype(int)
        summed = np.zeros((rows, 180))
        for b in range(180):
            m = colbin == b
            if m.any(): summed[:, b] = a[:, m].sum(axis=1)
        for i, la in enumerate(li):
            rb = int((la + 89) // 2)
            for b in range(180):
                v = summed[i, b]
                if v > 0:
                    key = cid(LATS[rb], LONS[b]); cells[key] = cells.get(key, 0.0) + v
    ds.close()
    total = sum(cells.values())
    if not (7.4e9 <= total <= 8.2e9): fail(f"global total {total/1e9:.2f} billion out of bounds")
    out = {"schema": 1, "total": int(total), "cells": {k: int(round(v)) for k, v in cells.items() if v >= 1},
           "provenance": {"name": "WorldPop 2020 global population, 1 km (unconstrained, UN-adjusted mosaic)", "version": "2020, 1 km aggregated", "retrieved_at": datetime.datetime.fromtimestamp(SRC.stat().st_mtime, datetime.timezone.utc).strftime("%Y-%m-%d"),
                          "url": "https://www.worldpop.org/", "licence": "CC BY 4.0", "use": "internal prioritisation only; never displayed"}}
    with tempfile.NamedTemporaryFile("w", dir=OUT.parent, delete=False, suffix=".tmp") as f: json.dump(out, f, separators=(",", ":")); name = f.name
    os.replace(name, OUT); print(f"wrote population.json: {len(out['cells'])} cells, total {total/1e9:.2f} billion")

if __name__ == "__main__":
    main()
