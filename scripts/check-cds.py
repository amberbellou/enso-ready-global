"""Verify CDS credentials from .env (never printed). Exit 0 when a tiny request is accepted."""
import os, pathlib, sys
for line in (pathlib.Path(__file__).resolve().parents[1] / ".env").read_text().splitlines():
    if "=" in line and not line.startswith("#"): k, v = line.split("=", 1); os.environ.setdefault(k.strip(), v.strip())
if not os.environ.get("CDSAPI_KEY"): print("no CDSAPI_KEY in .env"); sys.exit(2)
import cdsapi
try:
    c = cdsapi.Client(url=os.environ.get("CDSAPI_URL", "https://cds.climate.copernicus.eu/api"), key=os.environ["CDSAPI_KEY"], quiet=True)
    c.client.check_authentication() if hasattr(c, "client") else None
    print("CDS credentials accepted")
except Exception as e:
    msg = str(e); print("CDS check failed:", "401 (token wrong)" if "401" in msg else "403 (licence not accepted)" if "403" in msg else msg[:160]); sys.exit(1)
