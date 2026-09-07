"""Tier 1 #4 — INFORM Risk Index (JRC / IASC). Yearly + mid-year. No credentials, CORS *.

API (verified 2026-09-07): https://drmkc.jrc.ec.europa.eu/Inform-Index/API/InformAPI
  Workflows/Default -> current default workflow (latest release)      Countries/Scores/?WorkflowId=&IndicatorId=INFORM,HA,VU,CC
Output data/derived/inform.json: per ISO3 {inform, hazard, vulnerability, coping} on 0-10 scales + class, with provenance.
Use: internal prioritisation; at most one calm context line in briefings for countries in the High / Very High classes.
Validation: 150-220 countries; every score in 0-10; INFORM ≈ geometric mean of the three dimensions (±0.3); else keep last-good.
"""
import json, os, sys, tempfile, pathlib, datetime, urllib.request
ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "data/derived/inform.json"
BASE = "https://drmkc.jrc.ec.europa.eu/Inform-Index/API/InformAPI"
def fail(m): print(f"INFORM INGEST FAILED: {m}. Keeping last-good.", file=sys.stderr); sys.exit(2)
def get(u):
    with urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "enso-ready-global/0.2"}), timeout=120) as r: return json.loads(r.read())
def cls(x):  # INFORM published class thresholds (0-10 scale)
    return "very high" if x >= 6.5 else "high" if x >= 5.0 else "medium" if x >= 3.5 else "low" if x >= 2.0 else "very low"
def main():
    try:
        wf = get(BASE + "/Workflows/Default")
        wf = wf[0] if isinstance(wf, list) else wf
        wid = wf["WorkflowId"]; name = wf.get("Name"); wdate = str(wf.get("WorkflowDate", ""))[:10]
        rows = get(BASE + f"/Countries/Scores/?WorkflowId={wid}&IndicatorId=INFORM,HA,VU,CC")
    except Exception as e: fail(f"{type(e).__name__}: {str(e)[:200]}")
    by = {}
    for r in rows:
        iso = r.get("Iso3"); ind = r.get("IndicatorId"); v = r.get("IndicatorScore")
        if not iso or ind not in ("INFORM", "HA", "VU", "CC") or v is None: continue
        v = float(v)
        if not (0 <= v <= 10): fail(f"score out of range {iso} {ind} {v}")
        by.setdefault(iso, {})[{"INFORM": "inform", "HA": "hazard", "VU": "vulnerability", "CC": "coping"}[ind]] = round(v, 1)
    full = {k: v for k, v in by.items() if len(v) == 4}
    if not (150 <= len(full) <= 220): fail(f"country count {len(full)} out of bounds")
    bad = [k for k, v in full.items() if abs((v["hazard"] * v["vulnerability"] * v["coping"]) ** (1 / 3) - v["inform"]) > 0.3]
    if len(bad) > 5: fail(f"INFORM not consistent with geometric mean for {len(bad)} countries")
    for v in full.values(): v["class"] = cls(v["inform"])
    out = {"schema": 1, "workflow_id": wid, "release": name, "countries": full,
           "provenance": {"name": f"INFORM Risk Index ({name})", "version": f"WorkflowId {wid}, {wdate}", "retrieved_at": datetime.date.today().isoformat(),
                          "url": "https://drmkc.jrc.ec.europa.eu/inform-index", "licence": "European Commission JRC; reuse per EU open data (CC BY 4.0 stated in the EU open-data portal record)",
                          "use": "internal prioritisation; one calm context line max for high / very high classes"}}
    with tempfile.NamedTemporaryFile("w", dir=OUT.parent, delete=False, suffix=".tmp") as f: json.dump(out, f, separators=(",", ":")); nm = f.name
    os.replace(nm, OUT); print(f"wrote inform.json: {len(full)} countries from {name} (WorkflowId {wid}); very high: {sum(1 for v in full.values() if v['class']=='very high')}")
if __name__ == "__main__": main()
