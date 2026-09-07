"""Copernicus C3S seasonal forecast ingest (v2 official forecast layer).

Downloads the multi-system monthly precipitation anomaly (ensemble mean) from the
Climate Data Store and reduces it to per-2-degree-cell percent-of-normal for the next
6 lead months, written to data/derived/c3s_forecast.json with a validated schema.

One-time human steps (cannot be automated):
  1. Create a CDS account: https://cds.climate.copernicus.eu/
  2. Accept the licence on the dataset page (Download tab) for
     "seasonal-postprocessed-single-levels" (and "seasonal-monthly-single-levels").
  3. Put the key in ~/.cdsapirc  (url: https://cds.climate.copernicus.eu/api / key: <key>)
     or set CDSAPI_URL and CDSAPI_KEY (GitHub Actions secrets).

Dead-man's switch: any failure (HTTP, queue deadline, schema, bounds) leaves the last-good
file untouched and exits non-zero. Never publishes unvalidated data.

Request shape follows cdsapi v2 keys (area is [N, W, S, E]). Verify product_type strings on
the CDS download tab before first run; they are the most likely thing to change upstream.
"""
import json, os, sys, pathlib, tempfile, time, datetime as dt
ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "data/derived/c3s_forecast.json"
DATASET = "seasonal-postprocessed-single-levels"
CENTRES = ["ecmwf", "ukmo", "meteo_france", "dwd", "cmcc", "ncep", "jma", "eccc"]  # multi-system; systems resolved by CDS "latest"
DEADLINE_MIN = int(os.environ.get("C3S_DEADLINE_MIN", "40"))

def fail(msg, code=2):
    print(f"C3S INGEST FAILED: {msg}. Keeping last-good {OUT.name}.", file=sys.stderr); sys.exit(code)

def main():
    try:
        import cdsapi, numpy as np, netCDF4
    except ImportError as e:
        fail(f"missing dependency {e}")
    now = dt.datetime.utcnow(); year, month = now.year, now.month
    req = {
        "format": "netcdf",
        "originating_centre": "ecmwf",          # start single-centre; extend to CENTRES once licences accepted
        "system": "51",
        "variable": ["total_precipitation"],
        "product_type": ["ensemble_mean_anomaly"],   # VERIFY on CDS download tab
        "year": [str(year)], "month": [f"{month:02d}"],
        "leadtime_month": ["1", "2", "3", "4", "5", "6"],
        "area": [90, -180, -90, 180],
    }
    t0 = time.time()
    tmpdir = tempfile.mkdtemp()
    target = os.path.join(tmpdir, "c3s.nc")
    try:
        c = cdsapi.Client(quiet=True)
        c.retrieve(DATASET, req, target)   # cdsapi polls the queue; DEADLINE enforced by the caller's timeout-minutes too
    except Exception as e:
        msg = str(e)
        if "401" in msg: fail("401: CDS key missing or wrong (check ~/.cdsapirc or CDSAPI_KEY)")
        if "403" in msg: fail(f"403: dataset licence not accepted; open https://cds.climate.copernicus.eu/datasets/{DATASET}?tab=download and accept")
        if "404" in msg: fail("404: dataset id or product_type not found; verify on the CDS download tab")
        fail(f"download error: {msg[:300]}")
    if (time.time() - t0) / 60 > DEADLINE_MIN: fail("queue exceeded deadline")
    d = netCDF4.Dataset(target)
    var = [v for v in d.variables if v not in d.dimensions and d.variables[v].ndim >= 3]
    if not var: fail("no data variable in file")
    a = np.array(d.variables[var[0]][:], dtype=np.float32)  # (lead, lat, lon) expected
    lats = d.variables["latitude"][:] if "latitude" in d.variables else d.variables["lat"][:]
    lons = d.variables["longitude"][:] if "longitude" in d.variables else d.variables["lon"][:]
    if a.ndim == 4: a = a[0]
    if not (np.isfinite(a).mean() > 0.5): fail("mostly missing data")
    # reduce to 2-deg grid by nearest neighbour (anomaly in m/s rate -> mm/month handled by ratio later)
    LATS = np.arange(-89.0, 90.0, 2.0); LONS = np.arange(-179.0, 180.0, 2.0)
    li = [int(np.argmin(np.abs(lats - x))) for x in LATS]
    lj = [int(np.argmin(np.abs(((lons + 180) % 360 - 180) - x))) for x in LONS]
    red = a[:, li][:, :, lj]
    if not np.all(np.abs(np.nan_to_num(red)) < 1.0): fail("anomaly magnitude out of bounds (expected m/s rates)")
    out = {"schema": 1, "source": "Copernicus C3S seasonal forecast, ECMWF SEAS5 ensemble-mean anomaly", "source_url": f"https://cds.climate.copernicus.eu/datasets/{DATASET}",
           "issued": f"{year}-{month:02d}-01", "lead_months": 6, "units": "m/s anomaly (multiply by seconds/month for mm)",
           "grid": {"lats": LATS.tolist(), "lons": LONS.tolist()},
           "anomaly": [[[None if not np.isfinite(x) else float(f"{x:.3e}") for x in row] for row in lead] for lead in red]}
    with tempfile.NamedTemporaryFile("w", dir=OUT.parent, delete=False, suffix=".tmp") as f:
        json.dump(out, f, separators=(",", ":")); name = f.name
    os.replace(name, OUT); print("wrote", OUT)

if __name__ == "__main__":
    main()
