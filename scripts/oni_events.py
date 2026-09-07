"""Parse NOAA CPC ONI (oni.ascii.txt) and classify ENSO events.

Output: data/derived/oni.json
  - seasons: list of {season, year, oni}
  - events: list of {type, start, end, peak_oni, peak_season, strength, dj_year}
Rules (NOAA CPC): an event is >= 5 consecutive overlapping 3-month seasons with
ONI >= +0.5 (El Nino) or <= -0.5 (La Nina).
Strength by peak: weak 0.5-0.9, moderate 1.0-1.4, strong 1.5-1.9, very strong >= 2.0.
"""
import json, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = ROOT / "data/raw/oni.ascii.txt"
OUT = ROOT / "data/derived/oni.json"
SEASONS = ["DJF","JFM","FMA","MAM","AMJ","MJJ","JJA","JAS","ASO","SON","OND","NDJ"]

def strength(v):
    a = abs(v)
    if a >= 2.0: return "very strong"
    if a >= 1.5: return "strong"
    if a >= 1.0: return "moderate"
    return "weak"

rows = []
for line in SRC.read_text().splitlines()[1:]:
    p = line.split()
    if len(p) < 4: continue
    rows.append({"season": p[0], "year": int(p[1]), "oni": float(p[3])})

events = []
i = 0
while i < len(rows):
    v = rows[i]["oni"]
    sign = 1 if v >= 0.5 else (-1 if v <= -0.5 else 0)
    if sign == 0:
        i += 1; continue
    j = i
    while j < len(rows) and (rows[j]["oni"] * sign) >= 0.5:
        j += 1
    run = rows[i:j]
    if len(run) >= 5:
        peak = max(run, key=lambda r: r["oni"] * sign)
        # DJF year label: the year of the January in the peak winter
        # Convention: label events by the year the event began (e.g. 1997-98).
        start_year = run[0]["year"]
        end_year = run[-1]["year"]
        # anchor year: the July-June "ENSO year" containing the peak season
        pk = SEASONS.index(peak["season"]); mid_month = pk + 1
        anchor = peak["year"] if mid_month >= 7 else peak["year"] - 1
        events.append({
            "anchor_year": anchor,
            "analog_label": f"{anchor}-{str(anchor+1)[2:]}",
            "type": "El Niño" if sign > 0 else "La Niña",
            "start": f"{run[0]['season']} {start_year}",
            "end": f"{run[-1]['season']} {end_year}",
            "start_year": start_year,
            "end_year": end_year,
            "label": f"{start_year}-{str(end_year)[2:]}" if end_year != start_year else str(start_year),
            "peak_oni": peak["oni"],
            "peak_season": f"{peak['season']} {peak['year']}",
            "strength": strength(peak["oni"]),
            "n_seasons": len(run),
        })
    i = j

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps({
    "source": "NOAA Climate Prediction Center, Oceanic Niño Index (ONI) v5",
    "source_url": "https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt",
    "latest_season": f"{rows[-1]['season']} {rows[-1]['year']}",
    "latest_oni": rows[-1]["oni"],
    "seasons": rows,
    "events": events,
}, indent=1))
strong = [e for e in events if e["strength"] in ("strong","very strong")]
print(f"{len(rows)} seasons, {len(events)} events, {len(strong)} strong+:")
for e in strong: print(f"  {e['type']:8} {e['label']:8} peak {e['peak_oni']:+.1f} ({e['peak_season']}) {e['strength']}")
