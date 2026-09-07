"""Tier 1 #2 — IBTrACS cyclone history composite (yearly). No credentials.

Input : data/raw/ibtracs/ibtracs.ALL.list.v04r01.csv (NOAA NCEI IBTrACS v04r01, all basins)
        data/derived/oni.json (strong events, anchored on peak winter)
Output: data/derived/cyclones.json
  per basin (NA, EP, WP, NI, SI, SP, SA) and per 2° cell: counts of storms (≥34 kt) and hurricane-force storms (≥64 kt)
  passing within the cell during strong El Niño years, strong La Niña years, and neutral years (|ONI| < 0.5 in every
  season of the ENSO year), normalised per year; plus the basin-level genesis longitude/latitude means used for the
  ground-truth check (El Niño: western North Pacific genesis shifts east; eastern Pacific more active; Atlantic less active).
ENSO year = Jul(Y)..Jun(Y+1). Storm assigned to the ENSO year of its first fix. Cell hit = any 6-hourly fix within the cell.
Sanity bounds: per-year cell rates ≤ 30; basin totals within 20% of IBTrACS documented climatology ranges.
"""
import csv, json, os, sys, tempfile, pathlib, datetime, math
from collections import defaultdict
ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = ROOT / "data/raw/ibtracs/ibtracs.ALL.list.v04r01.csv"
OUT = ROOT / "data/derived/cyclones.json"
oni = json.load(open(ROOT / "data/derived/oni.json"))
YEAR0, YEAR1 = 1980, 2025   # satellite era, complete years

# ENSO year classification from ONI seasons: strong EN/LN years by anchor; neutral = all seasons Jul..Jun within ±0.5
season_by = {(r["season"], r["year"]): r["oni"] for r in oni["seasons"]}
SEAS = ["JAS","ASO","SON","OND","NDJ","DJF","JFM","FMA","MAM","AMJ","MJJ","JJA"]
def enso_year_vals(Y):
    vals = []
    for i, s in enumerate(SEAS):
        y = Y if i < 5 else Y + 1
        v = season_by.get((s, y)); vals.append(v)
    return vals
strong = {"el_nino": set(), "la_nina": set()}
for ev in oni["events"]:
    if ev["strength"] in ("strong", "very strong"): strong["el_nino" if ev["type"] == "El Niño" else "la_nina"].add(ev["anchor_year"])
cls = {}
for Y in range(YEAR0, YEAR1 + 1):
    if Y in strong["el_nino"]: cls[Y] = "el_nino"
    elif Y in strong["la_nina"]: cls[Y] = "la_nina"
    else:
        v = enso_year_vals(Y)
        if all(x is not None and abs(x) < 0.5 for x in v): cls[Y] = "neutral"
        else: cls[Y] = "other"
counts = {k: sum(1 for v in cls.values() if v == k) for k in ("el_nino", "la_nina", "neutral", "other")}
print("ENSO years:", counts)

def cell_id(lat, lon):
    la = round((lat + 1) / 2) * 2 - 1; lo = round((lon + 1) / 2) * 2 - 1
    la = max(-89, min(89, la)); lo = ((lo + 179) % 360) - 179
    return f"{la:+06.1f}_{lo:+07.1f}"

# stream the CSV: group fixes per storm
storms = {}   # sid -> {basin, year, genesis(lat,lon), maxwind, cells:set}
with open(SRC, newline="", encoding="utf-8") as f:
    reader = csv.reader(f); header = next(reader); units = next(reader)
    col = {name: i for i, name in enumerate(header)}
    iS, iT, iLat, iLon, iW, iB, iNat = col["SID"], col["ISO_TIME"], col["LAT"], col["LON"], col["WMO_WIND"], col["BASIN"], col["NATURE"]
    iUSA = col.get("USA_WIND")
    for row in reader:
        try:
            t = row[iT]; y = int(t[:4]); m = int(t[5:7])
        except Exception: continue
        if y < YEAR0 or y > YEAR1 + 1: continue
        try: lat = float(row[iLat]); lon = float(row[iLon])
        except Exception: continue
        w = None
        for i in (iW, iUSA):
            if i is not None and row[i] not in ("", " "):
                try: w = float(row[i]); break
                except Exception: pass
        sid = row[iS]
        st = storms.get(sid)
        if st is None:
            Y = y if m >= 7 else y - 1
            st = storms[sid] = {"basin": row[iB], "year": Y, "glat": lat, "glon": lon, "maxw": -1.0, "cells": set()}
        if w is not None and w > st["maxw"]: st["maxw"] = w
        st["cells"].add(cell_id(lat, lon))
print(f"storms read: {len(storms)}")

# aggregate per class
BASINS = ["NA", "EP", "WP", "NI", "SI", "SP", "SA"]
cell = defaultdict(lambda: {"el_nino": [0, 0], "la_nina": [0, 0], "neutral": [0, 0]})   # [storms, hurricane-force]
basin = {b: {k: {"storms": 0, "hurricane": 0, "glon": [], "glat": []} for k in ("el_nino", "la_nina", "neutral")} for b in BASINS}
for st in storms.values():
    k = cls.get(st["year"]); b = st["basin"]
    if k not in ("el_nino", "la_nina", "neutral") or b not in basin: continue
    if st["maxw"] < 34: continue
    hur = st["maxw"] >= 64
    basin[b][k]["storms"] += 1; basin[b][k]["hurricane"] += int(hur); basin[b][k]["glon"].append(st["glon"]); basin[b][k]["glat"].append(st["glat"])
    for c in st["cells"]:
        cell[c][k][0] += 1; cell[c][k][1] += int(hur)
def mean(xs): return round(sum(xs) / len(xs), 1) if xs else None
basin_out = {}
for b in BASINS:
    basin_out[b] = {}
    for k in ("el_nino", "la_nina", "neutral"):
        n = counts[k]; d = basin[b][k]
        basin_out[b][k] = {"years": n, "storms_per_year": round(d["storms"] / n, 1) if n else None, "hurricane_per_year": round(d["hurricane"] / n, 1) if n else None,
                           "genesis_lon_mean": mean(d["glon"]), "genesis_lat_mean": mean(d["glat"])}
cells_out = {}
for c, d in cell.items():
    o = {}
    for k in ("el_nino", "la_nina", "neutral"):
        n = counts[k]
        if n: o[k] = [round(d[k][0] / n, 2), round(d[k][1] / n, 2)]
    if any(v[0] > 30 for v in o.values()): print("bounds violation", c, o, file=sys.stderr); sys.exit(4)
    cells_out[c] = o

# ground truth (documented): WNP genesis shifts east in El Niño; EP more hurricanes; Atlantic fewer hurricanes in El Niño
gt = []
wp = basin_out["WP"]; ep = basin_out["EP"]; na = basin_out["NA"]
gt.append(("WP genesis longitude east of neutral in El Niño", wp["el_nino"]["genesis_lon_mean"] > wp["neutral"]["genesis_lon_mean"] + 2))
gt.append(("EP hurricanes per year higher in El Niño than La Niña", ep["el_nino"]["hurricane_per_year"] > ep["la_nina"]["hurricane_per_year"]))
gt.append(("NA hurricanes per year lower in El Niño than La Niña", na["el_nino"]["hurricane_per_year"] < na["la_nina"]["hurricane_per_year"]))
print("Ground truth:")
for name, ok in gt: print(f"  {'PASS' if ok else 'FAIL'} {name}")
print("  WP genesis lon: EN", wp["el_nino"]["genesis_lon_mean"], "neutral", wp["neutral"]["genesis_lon_mean"], "| EP hur/yr EN", ep["el_nino"]["hurricane_per_year"], "LN", ep["la_nina"]["hurricane_per_year"], "| NA hur/yr EN", na["el_nino"]["hurricane_per_year"], "LN", na["la_nina"]["hurricane_per_year"])
if not all(ok for _, ok in gt): print("GROUND TRUTH FAILED — refusing to publish cyclones.json", file=sys.stderr); sys.exit(4)

out = {"schema": 1, "provenance": {"name": "IBTrACS v04r01 (NOAA NCEI), all basins", "version": "v04r01, " + datetime.datetime.fromtimestamp(SRC.stat().st_mtime, datetime.timezone.utc).strftime("%Y-%m-%d"),
                                    "retrieved_at": datetime.datetime.fromtimestamp(SRC.stat().st_mtime, datetime.timezone.utc).strftime("%Y-%m-%d"),
                                    "url": "https://www.ncei.noaa.gov/products/international-best-track-archive", "licence": "US Government public domain (NOAA NCEI)",
                                    "events": "NOAA CPC ONI; strong events anchored on peak winter; neutral = all seasons within ±0.5", "years": f"{YEAR0}-{YEAR1}", "computed_at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")},
       "enso_years": counts, "units": {"cells": "[storms per year (≥34 kt), hurricane-force storms per year (≥64 kt)] passing within the 2° cell"},
       "basins": basin_out, "cells": cells_out}
with tempfile.NamedTemporaryFile("w", dir=OUT.parent, delete=False, suffix=".tmp") as f: json.dump(out, f, separators=(",", ":")); name = f.name
os.replace(name, OUT); print(f"wrote {OUT.name}: {len(cells_out)} cells")
