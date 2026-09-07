"""Historical ENSO rainfall composites on a 2-degree global grid (schema v2).

Sources
  CHIRPS v2.0 monthly, box-averaged to 2 deg by the IRI Data Library (land, 50S-50N, 1981-2025)
  GPCP v2.3 monthly 2.5 deg (global, 1979-present), bilinearly interpolated to the 2 deg grid
  and used wherever CHIRPS has no data (ocean, |lat|>50, small gaps).
  Natural Earth 50m admin-0 (public domain) for on_land and ISO 3166 numeric region_id.
  NOAA CPC ONI events from data/derived/oni.json.

Per cell, per phase (en/ln), per 3-month season:
  pct         mean % anomaly vs the 1991-2020 normal across strong events (clipped -100..300)
  wetter_frac % of those events wetter than normal
  std         spread (standard deviation of the per-event % anomalies)
  n           number of events with data
  recent      per-event % anomaly for the three most recent strong events
null (never 0) where a value is undefined. Sanity bounds are asserted before writing.
"""
import json, glob, re, pathlib, os, tempfile
import numpy as np, netCDF4
from shapely.geometry import shape, Point
from shapely.strtree import STRtree
from shapely import prepared

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "data/derived/composites.json"
oni = json.load(open(ROOT / "data/derived/oni.json"))
SEASONS = ["DJF","JFM","FMA","MAM","AMJ","MJJ","JJA","JAS","ASO","SON","OND","NDJ"]
BASE0, BASE1 = 1991, 2020
MIN_EVENTS = 3

# ---- target grid: 2 deg, centers at odd degrees ----
LATS = np.arange(-89.0, 90.0, 2.0)   # 90
LONS = np.arange(-179.0, 180.0, 2.0) # 180

# ---- GPCP (mm/day) -> dict (year,month) -> 2-deg array (mm/month) ----
def bilinear_to_grid(a, glats, glons):
    """a: (nlat, nlon) on regular grid glats (asc), glons (0..360 asc). Returns (90,180) on LATS/LONS."""
    lon360 = np.where(LONS < 0, LONS + 360, LONS)
    # wrap lon for interpolation
    glons_w = np.concatenate([glons, [glons[0] + 360]])
    a_w = np.concatenate([a, a[:, :1]], axis=1)
    li = np.clip(np.searchsorted(glats, LATS) - 1, 0, len(glats) - 2)
    lj = np.clip(np.searchsorted(glons_w, lon360) - 1, 0, len(glons_w) - 2)
    ly = (LATS - glats[li]) / (glats[li + 1] - glats[li]); ly = np.clip(ly, 0, 1)
    lx = (lon360 - glons_w[lj]) / (glons_w[lj + 1] - glons_w[lj]); lx = np.clip(lx, 0, 1)
    LI, LJ = np.meshgrid(li, lj, indexing="ij"); LY, LX = np.meshgrid(ly, lx, indexing="ij")
    q = (a_w[LI, LJ] * (1 - LY) * (1 - LX) + a_w[LI + 1, LJ] * LY * (1 - LX)
         + a_w[LI, LJ + 1] * (1 - LY) * LX + a_w[LI + 1, LJ + 1] * LY * LX)
    return q.astype(np.float32)

gpcp = {}
files = sorted(glob.glob(str(ROOT / "data/raw/gpcp/gpcp_v02r03_monthly_d*.nc")))
for f in files:
    ym = re.search(r"_d(\d{4})(\d{2})_", f); y, m = int(ym.group(1)), int(ym.group(2))
    d = netCDF4.Dataset(f)
    v = np.array(d.variables["precip"][0].filled(np.nan), dtype=np.float32)
    v[(v < 0) | (v > 500)] = np.nan
    if not gpcp: glats = d.variables["latitude"][:].astype(float); glons = d.variables["longitude"][:].astype(float)
    d.close()
    days = [31, 29 if (y % 4 == 0 and (y % 100 != 0 or y % 400 == 0)) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]
    gpcp[(y, m)] = bilinear_to_grid(v * days, glats, glons)
print(f"GPCP: {len(gpcp)} months")

# ---- CHIRPS 2 deg (mm/month), Y 49..-49, X -179.025.. ----
chirps = {}
cp = ROOT / "data/raw/chirps_2deg_monthly.nc"
if cp.exists():
    d = netCDF4.Dataset(cp)
    X = d.variables["X"][:].astype(float); Y = d.variables["Y"][:].astype(float)
    T = d.variables["T"]
    P = d.variables["precipitation"]
    # T is "months since 1960-01-01" (IRI); derive calendar
    tunits = getattr(T, "units", "months since 1960-01-01")
    t0y, t0m = 1960, 1
    mm = re.search(r"since (\d{4})-(\d{2})", tunits)
    if mm: t0y, t0m = int(mm.group(1)), int(mm.group(2))
    tv = np.array(T[:], dtype=float)
    yi = np.array([int(np.argmin(np.abs(LATS - yy))) for yy in Y]); xi = np.array([int(np.argmin(np.abs(LONS - xx))) for xx in X])
    for k in range(len(tv)):
        idx = int(round(tv[k] - 0.5)) if (tv[k] % 1) else int(tv[k])
        y = t0y + (t0m - 1 + idx) // 12; m = (t0m - 1 + idx) % 12 + 1
        a = np.array(P[k].filled(np.nan) if hasattr(P[k], "filled") else P[k], dtype=np.float32)
        a[(a < 0) | (a > 5000)] = np.nan
        g = np.full((90, 180), np.nan, np.float32)
        g[np.ix_(yi, xi)] = a
        chirps[(y, m)] = g
    d.close()
    print(f"CHIRPS: {len(chirps)} months {min(chirps)}..{max(chirps)}")

# ---- land mask + region id (Natural Earth) ----
ne = json.load(open(ROOT / "data/raw/ne_50m_admin_0_countries.geojson"))
geoms, props = [], []
for f in ne["features"]:
    geoms.append(shape(f["geometry"])); props.append(f["properties"])
tree = STRtree(geoms)
prep = [prepared.prep(g) for g in geoms]
on_land = np.zeros((90, 180), bool); region_n3 = np.zeros((90, 180), np.int32); iso2 = np.full((90, 180), "", object)
for i, la in enumerate(LATS):
    for j, lo in enumerate(LONS):
        pt = Point(lo, la)
        for gi in tree.query(pt):
            if prep[gi].contains(pt):
                on_land[i, j] = True
                p = props[gi]; n3 = p.get("ISO_N3") or "-99"
                region_n3[i, j] = int(n3) if n3.lstrip("-").isdigit() and int(n3) > 0 else 900
                iso2[i, j] = p.get("ISO_A2_EH") or ""
                break
# CHIRPS coverage implies land too (small islands not resolved by 50m polygons at 2 deg)
chirps_cov = np.zeros((90, 180), bool)
if chirps:
    stack = np.stack([chirps[k] for k in list(chirps)[:24]])
    chirps_cov = np.isfinite(stack).any(axis=0)
print(f"land cells: {on_land.sum()} (NE) / {(on_land | chirps_cov).sum()} (NE or CHIRPS)")

# ---- climatologies ----
def clim_for(src):
    c = np.full((12, 90, 180), np.nan, np.float32)
    for m in range(1, 13):
        sel = [src[(y, m)] for y in range(BASE0, BASE1 + 1) if (y, m) in src]
        if sel: c[m - 1] = np.nanmean(np.stack(sel), axis=0)
    return c
clim_g = clim_for(gpcp); clim_c = clim_for(chirps) if chirps else None

def season_months(k): return [((k - 1 + off) % 12) or 12 for off in (0, 1, 2)]
def season_total(src, clim, y_first, k):
    ms = season_months(k); tot = np.zeros((90, 180), np.float32); ctot = np.zeros((90, 180), np.float32); y = y_first
    for j, m in enumerate(ms):
        if j > 0 and m < ms[j - 1]: y += 1
        if (y, m) not in src: return None, None
        tot += src[(y, m)]; ctot += clim[m - 1]
    return tot, ctot
def event_year_for_season(ev, k):
    return ev["anchor_year"] if season_months(k)[0] >= 7 else ev["anchor_year"] + 1

strong = {"El Niño": [], "La Niña": []}
for ev in oni["events"]:
    if ev["strength"] in ("strong", "very strong") and ev["start_year"] >= 1979: strong[ev["type"]].append(ev)
labels = {t: [e["analog_label"] for e in evs] for t, evs in strong.items()}
assert all(len(set(v)) == len(v) for v in labels.values()), "duplicate event labels"
print({t: v for t, v in labels.items()})

def pct_stack(src, clim, evs, k):
    rows = []
    for ev in evs:
        tot, ctot = season_total(src, clim, event_year_for_season(ev, k), k)
        if tot is None: rows.append(np.full((90, 180), np.nan, np.float32)); continue
        with np.errstate(divide="ignore", invalid="ignore"):
            r = np.where(ctot > 5.0, (tot / ctot - 1.0) * 100.0, np.nan)  # skip climatology < 5 mm/season
        rows.append(np.clip(r, -100, 300).astype(np.float32))
    return np.stack(rows)

pct = {"gpcp": {}, "chirps": {}}
for t, evs in strong.items():
    pct["gpcp"][t] = [pct_stack(gpcp, clim_g, evs, k) for k in range(12)]
    if chirps: pct["chirps"][t] = [pct_stack(chirps, clim_c, evs, k) for k in range(12)]

def clean(x): return None if (x is None or not np.isfinite(x)) else float(round(float(x), 0))
def cid(lat, lon): return f"{lat:+06.1f}_{lon:+07.1f}"

cells = {}; n_chirps = 0
for i, la in enumerate(LATS):
    for j, lo in enumerate(LONS):
        use_c = bool(chirps) and chirps_cov[i, j] and np.isfinite(clim_c[:, i, j]).all()
        src = "chirps" if use_c else "gpcp"
        if use_c: n_chirps += 1
        clim = clim_c if use_c else clim_g
        cell = {"src": src, "on_land": bool(on_land[i, j] or chirps_cov[i, j]), "region_id": int(region_n3[i, j]),
                "cc": iso2[i, j] or None, "clim_mm_month": [clean(clim[m, i, j]) for m in range(12)]}
        for t in strong:
            key = "en" if t == "El Niño" else "ln"
            comp, frac, std, n, recent = [], [], [], [], []
            for k in range(12):
                v = pct[src][t][k][:, i, j]; ok = v[np.isfinite(v)]
                n.append(int(len(ok)))
                if len(ok) >= MIN_EVENTS:
                    comp.append(clean(np.mean(ok))); frac.append(clean(100.0 * np.mean(ok > 0))); std.append(clean(np.std(ok)))
                else:
                    comp.append(None); frac.append(None); std.append(None)
                recent.append([clean(x) for x in v[-3:]])
            cell[key] = {"pct": comp, "wetter_frac": frac, "std": std, "n": n, "recent": recent}
        cells[cid(la, lo)] = cell

# sanity bounds
for c in cells.values():
    for key in ("en", "ln"):
        for v in c[key]["pct"]:
            assert v is None or -100 <= v <= 300, v
        for v in c[key]["wetter_frac"]:
            assert v is None or 0 <= v <= 100, v

out = {"schema": 2, "units": {"pct": "% of 1991-2020 normal", "clim_mm_month": "mm/month", "std": "percentage points"},
       "baseline_start": BASE0, "baseline_end": BASE1, "anomaly_type": "percent", "min_events": MIN_EVENTS,
       "sources": {"chirps": {"label": "CHIRPS v2.0 monthly (UCSB Climate Hazards Center), 2° box average via IRI Data Library", "url": "https://www.chc.ucsb.edu/data/chirps"},
                   "gpcp": {"label": "GPCP v2.3 monthly (NOAA NCEI), interpolated to 2°", "url": "https://www.ncei.noaa.gov/products/global-precipitation-climatology-project"},
                   "events": {"label": "NOAA CPC Oceanic Niño Index", "url": "https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt"},
                   "land": {"label": "Natural Earth 50m admin-0 (public domain)", "url": "https://www.naturalearthdata.com/"}},
       "grid": {"lats": [float(x) for x in LATS], "lons": [float(x) for x in LONS],
                "land": "".join("1" if (on_land[i, j] or chirps_cov[i, j]) else "0" for i in range(90) for j in range(180))},
       "seasons": SEASONS, "events": labels, "cells": cells}
tmp = tempfile.NamedTemporaryFile("w", dir=OUT.parent, delete=False, suffix=".tmp"); json.dump(out, tmp, separators=(",", ":")); tmp.close()
os.replace(tmp.name, OUT)
print(f"wrote {len(cells)} cells ({n_chirps} CHIRPS, {len(cells)-n_chirps} GPCP)")

# validation against known history
def cell_id_for(lat, lon):
    i = int(np.argmin(np.abs(LATS - lat))); j = int(np.argmin(np.abs(LONS - lon))); return cid(LATS[i], LONS[j])
checks = [("Coastal Peru (Piura)", -5.2, -80.6, "en", "JFM", "wetter"), ("Kalimantan", -1.0, 114.0, "en", "SON", "drier"),
          ("Kenya (Nairobi)", -1.3, 36.8, "en", "OND", "wetter"), ("Zimbabwe (Harare)", -17.8, 31.0, "en", "DJF", "drier"),
          ("Southern Brazil (Porto Alegre)", -30.0, -51.2, "en", "OND", "wetter"), ("Queensland (Brisbane)", -27.5, 153.0, "en", "SON", "drier"),
          ("S. California (LA)", 34.0, -118.2, "en", "JFM", "wetter"), ("Kenya (Nairobi)", -1.3, 36.8, "ln", "OND", "drier"),
          ("Ethiopia (Addis)", 9.0, 38.7, "en", "JAS", "drier"), ("Philippines (Manila)", 14.6, 121.0, "en", "DJF", "drier")]
print("\nValidation:")
for name, la, lo, key, s, expect in checks:
    c = cells[cell_id_for(la, lo)]; k = SEASONS.index(s); v = c[key]["pct"][k]
    ok = v is not None and ((v > 0) == (expect == "wetter"))
    print(f"  {'PASS' if ok else 'FAIL'} {name:30} {c['src']:6} {c['cc']} {key.upper()} {s}: {v:+.0f}% (wet in {c[key]['wetter_frac'][k]:.0f}%, sd {c[key]['std'][k]:.0f}, n={c[key]['n'][k]}) exp {expect}")
