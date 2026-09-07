"""Layer 4 — current conditions (weekly). No credentials needed.

  A. Recent rainfall vs normal, global: CHIRPS v2.0 monthly (final + preliminary) from the IRI Data Library,
     box-averaged to 2°, last 3 complete months as percent of the 1991-2020 normal for the same months.
  B. US Drought Monitor (weekly, Thursdays): drought category D0-D4 per 2° cell centre inside the USDM polygons.
  (Global Drought Observatory is added when its download endpoint is confirmed; see DATA_SOURCES.md.)

Output data/derived/conditions.json with provenance. Dead-man's switch: any fetch/schema/bounds failure keeps
the last-good file and exits non-zero. Bounds: recent-rain percent in [0, 500]; USDM category in 0-4.
"""
import json, os, sys, pathlib, tempfile, datetime, urllib.request, io
import numpy as np
ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "data/derived/conditions.json"
LATS = np.arange(-89.0, 90.0, 2.0); LONS = np.arange(-179.0, 180.0, 2.0)
def cid(lat, lon): return f"{lat:+06.1f}_{lon:+07.1f}"
def fail(msg): print(f"CONDITIONS INGEST FAILED: {msg}. Keeping last-good {OUT.name}.", file=sys.stderr); sys.exit(2)
UA = {"User-Agent": "enso-ready-global/0.2 (open-source civic project)"}

def fetch(url, timeout=600, tries=3):
    last = None
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=timeout) as r: return r.read()
        except Exception as e:
            last = e; print(f"  fetch attempt {attempt+1} failed: {type(e).__name__}", file=sys.stderr)
    raise last

def recent_rain():
    import netCDF4
    # last 3 months of CHIRPS (final or prelim) + the 1991-2020 climatology for the same calendar months, all box-averaged to 2°
    base = "https://iridl.ldeo.columbia.edu/SOURCES/.UCSB/.CHIRPS/.v2p0/.monthly/.global/.precipitation/X/2/boxAverage/Y/2/boxAverage/"
    # 1. latest available month
    lastm = fetch(base + "T/last/VALUE/data.nc")
    dl = netCDF4.Dataset("lastm", memory=lastm); TL = dl.variables["T"]
    tunits = getattr(TL, "units", "months since 1960-01-01"); y0 = int(tunits.split("since ")[1][:4])
    idx = int(float(TL[:][0])); yl, ml = y0 + idx // 12, idx % 12 + 1; dl.close()
    # 2. explicit 3-month range ending there
    def ym(y, m, k):  # k months earlier
        i = y * 12 + (m - 1) - k; return i // 12, i % 12 + 1
    y1, m1 = ym(yl, ml, 2)
    mon = lambda m: datetime.date(2000, m, 1).strftime("%b")
    last = fetch(base + f"T/({mon(m1)}%20{y1})/({mon(ml)}%20{yl})/RANGE/data.nc")
    d = netCDF4.Dataset("last3", memory=last)
    P = np.array(d.variables["precipitation"][:].filled(np.nan), dtype=np.float32); T = d.variables["T"]
    tv = [float(x) for x in T[:]]
    X = d.variables["X"][:].astype(float); Y = d.variables["Y"][:].astype(float); d.close()
    months = sorted({(y0 + int(v) // 12, int(v) % 12 + 1) for v in tv})
    if len(months) != 3: fail(f"expected 3 months, got {months}")
    if (datetime.date.today() - datetime.date(months[-1][0], months[-1][1], 1)).days > 120: fail(f"latest CHIRPS month {months[-1]} is too old")
    # climatology 1991-2020 for the same calendar months from the local CHIRPS 2° archive (same IRI box-average product)
    arch = ROOT / "data/raw/chirps_2deg_monthly.nc"
    if not arch.exists(): fail("local CHIRPS archive missing (data/raw/chirps_2deg_monthly.nc)")
    da = netCDF4.Dataset(arch); TA = da.variables["T"]; tva = [float(x) for x in TA[:]]
    ya = int(getattr(TA, "units", "months since 1960-01-01").split("since ")[1][:4])
    PA = da.variables["precipitation"]
    if list(da.variables["X"][:].astype(float)) != list(X) or list(da.variables["Y"][:].astype(float)) != list(Y): fail("archive grid differs from live grid")
    clim = []
    for (_, m) in months:
        sel = [k for k, v in enumerate(tva) if (ya + int(v) // 12) in range(1991, 2021) and (int(v) % 12 + 1) == m]
        if len(sel) < 25: fail(f"climatology months missing for month {m}")
        clim.append(np.nanmean(np.stack([np.array(PA[k].filled(np.nan) if hasattr(PA[k], "filled") else PA[k], dtype=np.float32) for k in sel]), axis=0))
    da.close()
    tot = np.nansum(P, axis=0); ctot = np.nansum(np.stack(clim), axis=0)
    with np.errstate(divide="ignore", invalid="ignore"):
        pct = np.where(ctot > 15.0, 100.0 * tot / ctot, np.nan)   # % of normal; skip near-zero normals (< 15 mm / 3 months)
    yi = [int(np.argmin(np.abs(LATS - yy))) for yy in Y]; xi = [int(np.argmin(np.abs(LONS - xx))) for xx in X]
    cells = {}
    for a, i in enumerate(yi):
        for b, j in enumerate(xi):
            v = pct[a, b]
            if np.isfinite(v):
                v = float(min(500.0, max(0.0, round(v))))
                cells[cid(LATS[i], LONS[j])] = v
    return {"months": [f"{y}-{m:02d}" for y, m in months], "pct_of_normal": cells,
            "provenance": {"name": "CHIRPS v2.0 monthly (final + preliminary), 2° box average via IRI Data Library", "version": f"through {months[-1][0]}-{months[-1][1]:02d}",
                           "retrieved_at": datetime.date.today().isoformat(), "url": "https://iridl.ldeo.columbia.edu/SOURCES/.UCSB/.CHIRPS/.v2p0/.monthly/.global/.precipitation/",
                           "licence": "Public domain (CHC/UCSB)", "note": "Latest month may be preliminary."}}

def usdm():
    from shapely.geometry import shape, Point
    from shapely.strtree import STRtree
    from shapely import prepared
    raw = fetch("https://droughtmonitor.unl.edu/data/json/usdm_current.json")
    gj = json.loads(raw)
    feats = gj.get("features", [])
    if not (3 <= len(feats) <= 6): fail(f"USDM: expected 3-6 category polygons, got {len(feats)}")
    geoms, cats = [], []
    for f in feats:
        dm = f.get("properties", {}).get("DM")
        if dm is None: fail("USDM: feature without DM category")
        geoms.append(shape(f["geometry"])); cats.append(int(dm))
    if any(c < 0 or c > 4 for c in cats): fail("USDM: category out of 0-4")
    tree = STRtree(geoms); prep = [prepared.prep(g) for g in geoms]
    cells = {}
    for la in LATS:
        if la < 17 or la > 72: continue
        for lo in LONS:
            if lo < -180 or lo > -64: continue
            pt = Point(lo, la); best = None
            for gi in tree.query(pt):
                if prep[gi].contains(pt): best = cats[gi] if best is None else max(best, cats[gi])
            if best is not None: cells[cid(la, lo)] = best
    # the feed carries no date; USDM maps are valid on Tuesdays and released Thursdays, so the current map's date is the latest Tuesday
    today = datetime.date.today(); date = today - datetime.timedelta(days=(today.weekday() - 1) % 7)
    if today.weekday() in (2,):   # Wednesday: Thursday release not out yet, still previous Tuesday's map
        date = date - datetime.timedelta(days=7)
    date = date.isoformat()
    return {"categories": cells, "map_date": date,
            "provenance": {"name": "U.S. Drought Monitor (NDMC, USDA, NOAA)", "version": str(date) if date else None, "retrieved_at": datetime.date.today().isoformat(),
                           "url": "https://droughtmonitor.unl.edu/", "licence": "Public domain; cite as 'The U.S. Drought Monitor is jointly produced by NDMC, USDA and NOAA'."}}

def main():
    out = {"schema": 1, "fetched_at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}
    try: out["recent_rain"] = recent_rain()
    except SystemExit: raise
    except Exception as e: fail(f"recent rain: {type(e).__name__}: {str(e)[:200]}")
    try: out["usdm"] = usdm()
    except SystemExit: raise
    except Exception as e: fail(f"USDM: {type(e).__name__}: {str(e)[:200]}")
    if len(out["recent_rain"]["pct_of_normal"]) < 2000: fail("too few recent-rain cells")
    if len(out["usdm"]["categories"]) < 50: fail("too few USDM cells")
    with tempfile.NamedTemporaryFile("w", dir=OUT.parent, delete=False, suffix=".tmp") as f:
        json.dump(out, f, separators=(",", ":")); name = f.name
    os.replace(name, OUT)
    print(f"wrote {OUT.name}: recent rain {len(out['recent_rain']['pct_of_normal'])} cells (months {out['recent_rain']['months']}), USDM {len(out['usdm']['categories'])} cells (map {out['usdm']['map_date']})")

if __name__ == "__main__":
    main()
