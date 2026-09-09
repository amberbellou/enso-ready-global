# Copernicus CDS setup (one-time, free)

Unlocks: the official multi-system seasonal forecast (layer 1) and the forecast-skill layer (layer 2).

1. Create an ECMWF account at https://cds.climate.copernicus.eu/ (top-right, Login/Register), and confirm the email.
2. Logged in, open https://cds.climate.copernicus.eu/profile and copy your **Personal Access Token**.
3. Accept the licence once for each dataset (open the page, "Download" tab, tick the licence): `seasonal-monthly-single-levels`, `seasonal-postprocessed-single-levels`, `reanalysis-era5-single-levels-monthly-means`.
4. In the Terminal tab, paste the token inside the quotes and press Enter:

```bash
printf 'CDSAPI_URL=https://cds.climate.copernicus.eu/api\nCDSAPI_KEY=PASTE-TOKEN-HERE\n' >> "/Users/amberbellou/env set up/enso-ready-global/.env"
```

5. Tell me "cds done". I run `scripts/check-cds.py` to confirm access, then the first forecast and hindcast pulls.

For GitHub Actions, the same two values go in the repository's Settings → Secrets as `CDSAPI_URL` and `CDSAPI_KEY`.
