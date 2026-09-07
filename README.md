# ENSO Ready Global

Plain-language El Niño / La Niña briefings for any place on Earth: what this event means for your area, when, and what to do about it. Built as the citizen-facing layer of anticipatory action, using the same public forecasts and records that WMO, NOAA and national agencies use.

**Live site:** https://amberbellou.github.io/enso-ready-global/

Independent, open source (MIT), no accounts, no ads, no tracking. Not a warning service: every briefing defers to the user's national meteorological service.

## How it works

```
place (search / GPS)
  -> 2° grid cell (CHIRPS on land, GPCP elsewhere; nearest land cell for coasts)
                                      -> local rainfall record in past strong events (n, mean, spread)
  -> country override (JSON)          -> local season names, extra hazards
  -> live ECMWF SEAS5 forecast        -> this season's anomaly (browser fetch via Open-Meteo, CC BY 4.0)
  -> curated teleconnection region    -> expected signal, season, hazards, confidence
  -> live global status (NOAA CPC)    -> phase and strength
  -> hazard x livelihood checklist    -> prep steps, one at a time
  -> fixed sentence templates         -> briefing, radio script, SMS
```

No free-form AI text ships in a briefing. Templates live in `i18n/<lang>.json`; a new language is ~120 strings.

## Data sources (all public)

| Source | Used for | File |
|---|---|---|
| NOAA CPC ENSO Diagnostic Discussion | live global status | `scripts/ingest-enso-status.js` |
| NOAA CPC Oceanic Niño Index | which past events were strong | `scripts/oni_events.py` |
| CHIRPS v2.0 monthly, 2° box average via IRI Data Library (UCSB CHC) | per-cell composites on land 50N-50S | `scripts/composites.py` |
| GPCP v2.3 monthly precipitation (NOAA NCEI) | per-cell composites elsewhere (interpolated to 2°) | `scripts/composites.py` |
| ECMWF SEAS5 via Open-Meteo (CC BY 4.0) | live seasonal forecast anomaly per point, client-side | `src/app.js` |
| Copernicus C3S seasonal (CDS) | v2 official multi-system forecast (needs a CDS account) | `scripts/ingest-c3s.py` |
| Natural Earth admin-0 (public domain) | land mask, ISO numeric country id per cell | `scripts/composites.py` |
| NOAA / IRI / BoM / WMO impact literature | curated teleconnection table | `data/curated/teleconnections.json` |
| GeoNames (CC BY 4.0) | place search | `scripts/build_gazetteer.py` |
| WMO Members directory | national met services | `data/curated/met_services.json` |

## Repo layout

```
src/engine.js          briefing engine (runs in Node at build time and in the browser)
src/app.js, style.css  client: one screen at a time, localStorage only
i18n/en.json           sentence templates + UI strings
data/curated/          teleconnections, prep checklists (hazard codes), met services, countries/<CC>.json overrides
ADAPTATION_NOTES.md    what was adopted / refused from PRISM, IFRC GO, Open-Meteo, CLIMADA, C3S tools
data/derived/          oni.json, composites.json, enso_status.json (generated)
scripts/               ingest + build scripts
docs/methodology.html  public methodology page
tests/                 engine tests against real data
.github/workflows      monthly refresh + GitHub Pages deploy
```

## Develop

```bash
python3 -m venv .venv && .venv/bin/pip install numpy netCDF4
bash scripts/fetch-geonames.sh && .venv/bin/python scripts/build_gazetteer.py
node scripts/ingest-enso-status.js
node --test tests/
node scripts/build-site.js
python3 -m http.server 8765 --directory site
```

Rebuilding the composites (yearly, or when a new strong event ends) needs `data/raw/gpcp/*.nc` (GPCP monthly from NCEI), `data/raw/chirps_2deg_monthly.nc` (IRI Data Library box-average request, see `scripts/composites.py` docstring), and `data/raw/ne_50m_admin_0_countries.geojson`, then:

```bash
.venv/bin/python scripts/oni_events.py && .venv/bin/python scripts/composites.py
```

## Safety rules

- Ingestion validates schema and bounds; on failure the last-good file is kept and the page is stamped with its date.
- Confidence is only ever "likely", "leaning that way" or "uncertain".
- Every number links to its source. Fewer than three past events: no local average is shown.
- Hazards are language-independent codes; all user-facing text lives in `i18n/<lang>.json`. `scripts/i18n-diff.js` lists only the keys whose English source changed, and every machine-translated key carries `mt: true` until reviewed.

## Roadmap

1. Global engine + English web (this repo, Phase 1)
2. Template i18n for the UN six, then Tier 2 and Tier 3 languages, with machine-translation banners
3. WhatsApp reply bot
4. Hardening and testing with neurodivergent testers

See `docs/` for the product spec.
