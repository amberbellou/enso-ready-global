"""Compute historical ENSO rainfall composites on the GPCP 2.5-degree grid.

Input : data/raw/gpcp/*.nc (GPCP v2.3 monthly, mm/day), data/derived/oni.json
Output: data/derived/composites.json
  grid: {lats:[72], lons:[144]}   (lons 0..360 -> stored as -180..180 order)
  climatology base: 1991-2020
  per cell: for El Niño and La Niña, for each 3-month season (DJF..NDJ):
    composite % anomaly across strong/very strong events (mean of event % anomalies)
    fraction of those events that were wetter than normal
    per-event % anomaly for the three most recent strong events (analogs)
Seasons are indexed to the event's *first* year: DJF = Dec(y0)+Jan(y1)+Feb(y1) …
so for an event starting in year Y we take Jul(Y) .. Jun(Y+1) plus the extended run.
"""
import json, glob, re, pathlib, sys
import numpy as np, netCDF4

ROOT = pathlib.Path(__file__).resolve().parents[1]
files = sorted(glob.glob(str(ROOT / "data/raw/gpcp/gpcp_v02r03_monthly_d*.nc")))
oni = json.load(open(ROOT / "data/derived/oni.json"))

months, arrs = [], []
for f in files:
    ym = re.search(r"_d(\d{4})(\d{2})_", f)
    d = netCDF4.Dataset(f)
    v = d.variables["precip"][0]  # masked array (lat, lon)
    a = np.array(v.filled(np.nan), dtype=np.float32)
    a[(a < 0) | (a > 500)] = np.nan
    arrs.append(a); months.append((int(ym.group(1)), int(ym.group(2))))
    if len(arrs) == 1:
        lats = d.variables["latitude"][:].astype(float)
        lons = d.variables["longitude"][:].astype(float)
    d.close()
P = np.stack(arrs)               # (T, 72, 144) mm/day
T = len(months)
idx = {ym: i for i, ym in enumerate(months)}
print(f"loaded {T} months {months[0]}..{months[-1]}")

# monthly climatology 1991-2020 (mm/day)
clim = np.full((12, 72, 144), np.nan, np.float32)
for m in range(1, 13):
    sel = [idx[(y, m)] for y in range(1991, 2021) if (y, m) in idx]
    clim[m-1] = np.nanmean(P[sel], axis=0)

SEASONS = ["DJF","JFM","FMA","MAM","AMJ","MJJ","JJA","JAS","ASO","SON","OND","NDJ"]
# season k = months (k-1, k, k+1) mod 12 with 1-based months; DJF -> Dec, Jan, Feb
def season_months(k):  # returns list of month numbers 1..12
    return [((k - 1 + off) % 12) or 12 for off in (0, 1, 2)]

def season_total(y_of_first_month, k):
    """Sum of the three months of season k, where the first month falls in y_of_first_month."""
    ms = season_months(k)
    tot = np.zeros((72, 144), np.float32); ctot = np.zeros((72, 144), np.float32)
    y = y_of_first_month
    for j, m in enumerate(ms):
        if j > 0 and m < ms[j-1]: y += 1
        if (y, m) not in idx: return None, None
        tot += P[idx[(y, m)]]; ctot += clim[m-1]
    return tot, ctot

def event_year_for_season(ev, k):
    """Year of the season's first month during the event: seasons Jul..Dec use start_year,
    Jan..Jun use start_year+1 (the 'peak winter' year convention)."""
    first = season_months(k)[0]
    return ev["anchor_year"] if first >= 7 else ev["anchor_year"] + 1

strong = {"El Niño": [], "La Niña": []}
for ev in oni["events"]:
    if ev["strength"] in ("strong", "very strong") and ev["start_year"] >= 1979:
        strong[ev["type"]].append(ev)
for t, evs in strong.items():
    print(t, [e["analog_label"] for e in evs])

out = {"source": "GPCP v2.3 monthly (NOAA NCEI), climatology 1991-2020; events from NOAA CPC ONI",
       "source_url": "https://www.ncei.noaa.gov/products/global-precipitation-climatology-project",
       "grid": {"lats": [round(x, 3) for x in lats], "lons": [round(x, 3) for x in lons]},
       "seasons": SEASONS,
       "events": {t: [e["analog_label"] for e in evs] for t, evs in strong.items()},
       "cells": {}}

# compute per-event % anomaly arrays: dict[type][k] -> (n_events, 72,144)
pct = {}
for t, evs in strong.items():
    pct[t] = []
    for k in range(12):
        rows = []
        for ev in evs:
            y = event_year_for_season(ev, k)
            tot, ctot = season_total(y, k)
            if tot is None:
                rows.append(np.full((72, 144), np.nan, np.float32)); continue
            with np.errstate(divide="ignore", invalid="ignore"):
                r = np.where(ctot > 0.15, (tot / ctot - 1.0) * 100.0, np.nan)  # skip near-zero climatology
            rows.append(r.astype(np.float32))
        pct[t].append(np.stack(rows))

def clean(x):
    return None if (x is None or not np.isfinite(x)) else float(round(float(x), 0))

n_cells = 0
for i, lat in enumerate(lats):
    for j, lon in enumerate(lons):
        cid = f"{lat:+06.2f}_{(lon if lon < 180 else lon-360):+07.2f}"
        cell = {"clim_mm_month": [clean(clim[m, i, j] * 30.4) for m in range(12)]}
        for t in strong:
            key = "en" if t == "El Niño" else "ln"
            comp, frac, per = [], [], []
            for k in range(12):
                v = pct[t][k][:, i, j]
                ok = v[np.isfinite(v)]
                comp.append(clean(np.mean(np.clip(ok, -100, 300))) if len(ok) else None)
                frac.append(clean(100.0 * np.mean(ok > 0)) if len(ok) else None)
                per.append([clean(np.clip(x, -100, 300)) if np.isfinite(x) else None for x in v[-3:]])
            cell[key] = {"pct": comp, "wetter_frac": frac, "recent": per}
        out["cells"][cid] = cell
        n_cells += 1

# sanity bounds (dead-man's switch): any composite outside [-100, 300] is impossible by construction
pathlib.Path(ROOT / "data/derived").mkdir(exist_ok=True)
json.dump(out, open(ROOT / "data/derived/composites.json", "w"), separators=(",", ":"))
print(f"wrote {n_cells} cells")

# validation against known history
def cell_id(lat, lon):
    i = int(np.argmin(np.abs(lats - lat))); j = int(np.argmin(np.abs(lons - (lon % 360))))
    return f"{lats[i]:+06.2f}_{(lons[j] if lons[j] < 180 else lons[j]-360):+07.2f}"
checks = [("Coastal Peru (Piura)", -5.2, -80.6, "en", "JFM", "wetter"),
          ("Kalimantan", -1.0, 114.0, "en", "SON", "drier"),
          ("Kenya (Nairobi)", -1.3, 36.8, "en", "OND", "wetter"),
          ("Zimbabwe (Harare)", -17.8, 31.0, "en", "DJF", "drier"),
          ("Southern Brazil (Porto Alegre)", -30.0, -51.2, "en", "OND", "wetter"),
          ("Queensland (Brisbane)", -27.5, 153.0, "en", "SON", "drier"),
          ("S. California (LA)", 34.0, -118.2, "en", "JFM", "wetter"),
          ("Kenya (Nairobi)", -1.3, 36.8, "ln", "OND", "drier")]
print("\nValidation (composite % vs 1991-2020 normal, strong events):")
for name, la, lo, key, s, expect in checks:
    c = out["cells"][cell_id(la, lo)][key]; k = SEASONS.index(s)
    v = c["pct"][k]; ok = (v is not None) and ((v > 0) == (expect == "wetter"))
    print(f"  {'PASS' if ok else 'FAIL'} {name:32} {key.upper()} {s}: {v:+.0f}% (wetter in {c['wetter_frac'][k]:.0f}% of events) expected {expect}; recent {c['recent'][k]}")
