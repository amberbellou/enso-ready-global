"""Tier 1 #1 — FAO Crop Calendar (static; refresh yearly). No credentials.

API (discovered 2026-09-07 from the app bundle): https://api-cropcalendar.apps.fao.org/api/v1/
  countries?language=en ; cropCalendar?countries=<ISO2>&language=en  -> records {crop, aez, sessions[{early_sowing, later_sowing, early_harvest, late_harvest}]}
Output data/derived/crop_calendars.json: per ISO2 country, per crop: sowing months and harvest months (union over zones and
sessions), plus which crops are staples (used for the farmer-context sentence). Coverage is FAO's: ~58 countries; everywhere
else the sentence is omitted. Validation: months 1-12; >= 40 countries; each record has at least one window; else keep last-good.
"""
import json, os, sys, tempfile, pathlib, datetime, urllib.request, time
ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "data/derived/crop_calendars.json"
BASE = "https://api-cropcalendar.apps.fao.org/api/v1"
STAPLES = {"maize": ["maize", "corn"], "rice": ["rice"], "wheat": ["wheat"], "sorghum": ["sorghum"], "millet": ["millet"], "beans": ["bean"], "cassava": ["cassava", "manioc"],
           "potato": ["potato"], "groundnut": ["groundnut", "peanut"], "soybean": ["soy"], "cowpea": ["cowpea"], "teff": ["teff"], "barley": ["barley"], "banana": ["banana", "plantain"], "cotton": ["cotton"], "coffee": ["coffee"]}
def fail(m): print(f"CROP CALENDAR INGEST FAILED: {m}. Keeping last-good.", file=sys.stderr); sys.exit(2)
def get(u, tries=3):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "enso-ready-global/0.2"}), timeout=120) as r: return json.loads(r.read())
        except Exception as e:
            if i == tries - 1: raise
            time.sleep(2)
def months_between(a, b):
    if not a or not b: return []
    a, b = int(a), int(b); out = []; m = a
    for _ in range(12):
        out.append(m)
        if m == b: break
        m = m % 12 + 1
    return out
def staple_of(name):
    n = (name or "").lower()
    for s, keys in STAPLES.items():
        if any(k in n for k in keys): return s
    return None
def main():
    try: countries = get(BASE + "/countries?language=en")
    except Exception as e: fail(f"countries: {e}")
    if not (40 <= len(countries) <= 250): fail(f"country count {len(countries)}")
    out_c = {}
    for c in countries:
        iso2 = c["id"]
        try: recs = get(BASE + f"/cropCalendar?countries={iso2}&language=en")
        except Exception as e: print(f"  {iso2}: fetch failed ({type(e).__name__}); skipped", file=sys.stderr); continue
        crops = {}
        for r in recs:
            name = (r.get("crop") or {}).get("name") or ""
            key = name.strip()
            if not key: continue
            entry = crops.setdefault(key, {"staple": staple_of(name), "sowing": set(), "harvest": set(), "zones": set(), "all_year": False})
            entry["zones"].add((r.get("aez") or {}).get("name") or "")
            for s in r.get("sessions") or []:
                if str(s.get("all_year", "no")).lower() == "yes": entry["all_year"] = True
                es, ls = (s.get("early_sowing") or {}).get("month"), (s.get("later_sowing") or {}).get("month")
                eh, lh = (s.get("early_harvest") or {}).get("month"), (s.get("late_harvest") or {}).get("month")
                for m in months_between(es, ls or es): entry["sowing"].add(int(m))
                for m in months_between(eh, lh or eh): entry["harvest"].add(int(m))
        clean = {}
        for k, e in crops.items():
            if any(m < 1 or m > 12 for m in e["sowing"] | e["harvest"]): fail(f"month out of range for {iso2} {k}")
            if not e["sowing"] and not e["harvest"] and not e["all_year"]: continue
            clean[k] = {"staple": e["staple"], "sowing": sorted(e["sowing"]), "harvest": sorted(e["harvest"]), "zones": len([z for z in e["zones"] if z]), "all_year": e["all_year"]}
        if clean: out_c[iso2] = {"name": c["name"], "crops": clean, "staples": sorted({v["staple"] for v in clean.values() if v["staple"]})}
        print(f"  {iso2} {c['name']}: {len(clean)} crops, staples {out_c.get(iso2, {}).get('staples')}")
    if len(out_c) < 40: fail(f"only {len(out_c)} countries with calendars")
    out = {"schema": 1, "countries": out_c,
           "provenance": {"name": "FAO Crop Calendar (FAO Land and Water Division)", "version": f"API v1, fetched {datetime.date.today().isoformat()}", "retrieved_at": datetime.date.today().isoformat(),
                          "url": "https://cropcalendar.apps.fao.org/", "licence": "FAO; terms to be confirmed for redistribution of derived windows (see GAPS.md)", "coverage": f"{len(out_c)} countries"}}
    with tempfile.NamedTemporaryFile("w", dir=OUT.parent, delete=False, suffix=".tmp") as f: json.dump(out, f, ensure_ascii=False, separators=(",", ":")); nm = f.name
    os.replace(nm, OUT); print(f"wrote crop_calendars.json: {len(out_c)} countries")
if __name__ == "__main__": main()
