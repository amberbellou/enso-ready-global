# ENSO Ready Global

Plain-language El Niño / La Niña briefings for any place on Earth: what this event means for your area, when, and what to do about it. Built as the citizen-facing layer of anticipatory action, using the same public forecasts and records that WMO, NOAA and national agencies use.

**Live site:** https://amberbellou.github.io/enso-ready-global/

Independent, open source (MIT), no accounts, no ads, no tracking. Not a warning service: every briefing defers to the user's national meteorological service.

## How it works

```
place (search / GPS)
  -> 2.5° grid cell (GPCP)            -> local rainfall record in past strong events
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
| GPCP v2.3 monthly precipitation (NOAA NCEI) | per-cell historical composites | `scripts/composites.py` |
| CHIRPS v2 (UCSB, via IRI Data Library) | planned higher-resolution land composites | `data/raw/chirps_2deg_monthly.nc` |
| NOAA / IRI / BoM / WMO impact literature | curated teleconnection table | `data/curated/teleconnections.json` |
| GeoNames (CC BY 4.0) | place search | `scripts/build_gazetteer.py` |
| WMO Members directory | national met services | `data/curated/met_services.json` |

## Repo layout

```
src/engine.js          briefing engine (runs in Node at build time and in the browser)
src/app.js, style.css  client: one screen at a time, localStorage only
i18n/en.json           sentence templates + UI strings
data/curated/          teleconnections, prep checklists, met services (hand-reviewed)
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

Rebuilding the composites (yearly, or when a new strong event ends) needs the GPCP monthly files in `data/raw/gpcp/` (see the URL list logic in the session notes) and then:

```bash
.venv/bin/python scripts/oni_events.py && .venv/bin/python scripts/composites.py
```

## Safety rules

- Ingestion validates schema and bounds; on failure the last-good file is kept and the page is stamped with its date.
- Confidence is only ever "likely", "leaning that way" or "uncertain".
- Every number links to its source.

## Roadmap

1. Global engine + English web (this repo, Phase 1)
2. Template i18n for the UN six, then Tier 2 and Tier 3 languages, with machine-translation banners
3. WhatsApp reply bot
4. Hardening and testing with neurodivergent testers

See `docs/` for the product spec.
