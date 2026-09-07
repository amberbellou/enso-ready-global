# Data sources

Every fact a user sees comes from one of the datasets below. Each derived file carries a `provenance` block (name, version, retrieval date, URL, licence), which also generates the table on the public methodology page. Rows marked *pending* have working ingest code but no credentials or no confirmed endpoint yet; their sentences are omitted from briefings until they exist (Annex C: say less, never guess).

| Layer | Dataset | Provider | Cadence | Endpoint | Licence | Ingest | Validation / fallback |
|---|---|---|---|---|---|---|---|
| Event status | ENSO Diagnostic Discussion | NOAA CPC | monthly (2nd Thursday) | https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.shtml | US Gov public domain | `scripts/ingest-enso-status.js` | parse must yield status, date, synopsis; probability in 0–100; else keep last-good |
| Event status | IRI/CPC ENSO forecast plume | IRI Columbia | monthly (mid-month) | *pending endpoint confirmation (research in progress)* | IRI terms | – | – |
| Event status | El Niño/La Niña Update | WMO | when issued | https://wmo.int/topics/el-nino-la-nina | WMO | reference link | – |
| Past events | Oceanic Niño Index v5 | NOAA CPC | monthly | https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt | US Gov public domain | `scripts/oni_events.py` | ≥5-season rule; unique event labels |
| History (rain) | CHIRPS v2.0 monthly, 2° box average | UCSB CHC via IRI Data Library | yearly rebuild | https://iridl.ldeo.columbia.edu/SOURCES/.UCSB/.CHIRPS/.v2p0/.monthly/.global/.precipitation/ | Public domain | `scripts/composites.py` | anomalies in [-100, 300]%, wetter share in [0,100]; n<3 → null; ground-truth gate (Peru 1997-98 wet, Kalimantan & Sumatra 1997-98/2015-16 dry, Nairobi 1997-98 wet) fails the build |
| History (rain) | GPCP v2.3 monthly | NOAA NCEI | yearly rebuild | https://www.ncei.noaa.gov/data/global-precipitation-climatology-project-gpcp-monthly/access/ | US Gov public domain | `scripts/composites.py` (cells without CHIRPS) | as above |
| History (temperature) | ERA5 monthly 2 m temperature | Copernicus C3S | yearly rebuild | CDS `reanalysis-era5-single-levels-monthly-means` | Copernicus licence | *pending CDS credentials* | – |
| Land / country | Natural Earth 50m admin-0 | Natural Earth | static | https://www.naturalearthdata.com/ | Public domain | `scripts/composites.py` | – |
| Forecast (interim) | ECMWF SEAS5 monthly precipitation anomaly | Open-Meteo (serving ECMWF) | monthly, fetched per briefing in the browser | https://seasonal-api.open-meteo.com/v1/seasonal | CC BY 4.0 (attribution shown) | `src/app.js` | normal ≥10 mm; anomaly capped at ±300%; missing → sentence omitted |
| Forecast (official) | C3S multi-system seasonal forecast, tercile probabilities | Copernicus C3S | monthly (~13th) | CDS `seasonal-*` datasets (exact ids from research) | Copernicus licence, per-dataset acceptance | `scripts/ingest-c3s.py` *pending CDS credentials* | probabilities sum to 100±2; queue deadline; keep last-good |
| Forecast skill | Hindcast verification (correlation, ROC) vs CHIRPS | computed from C3S hindcasts | yearly | – | – | *pending CDS credentials*; until then every cell is skill "unknown" and the forecast never overrides history (`data/curated/wording_bands.json`) | – |
| Current conditions | CHIRPS last 3 months vs 1991–2020 normal | UCSB CHC via IRI DL | weekly | as above, `T/last/VALUE` then 3-month RANGE | Public domain | `scripts/ingest-conditions.py` | 3 months, ≤120 days old, % in [0,500], ≥2000 cells |
| Current conditions | U.S. Drought Monitor | NDMC / USDA / NOAA | weekly (Thursday) | https://droughtmonitor.unl.edu/data/json/usdm_current.json | Public domain, cite jointly | `scripts/ingest-conditions.py` | 3–6 category polygons, DM in 0–4, ≥50 cells |
| Current conditions | Global Drought Observatory | Copernicus EMS / JRC | 10-daily | *pending endpoint confirmation* | JRC / Copernicus | – | – |
| Pattern | Curated teleconnection table with citations | WMO, NOAA, IRI, BoM, national services | static, reviewed | `data/curated/teleconnections.json`, review file `docs/TELECONNECTIONS_REVIEW.md` | MIT (this repo) | – | every row cites a fetched, re-checked source |
| Regional consensus | RCOF statements (GHACOF, SARCOF, PRESASS, ASEANCOF, SASCOF, PICOF, CariCOF, CIIFEN, FOCRAII) | each forum | seasonal | `data/curated/rcof.json` (links, dates) | each forum | link liveness check | – |
| Cyclones | IBTrACS v04r01 | NOAA NCEI | yearly rebuild | https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs/v04r01/access/csv/ | US Gov public domain | `scripts/cyclones.py` | per-cell rate ≤30/yr; ground-truth gate: WNP genesis shifts east, EP more / NA fewer hurricanes in El Niño |
| Crop calendars | FAO Crop Calendar (57 countries; crop × agro-ecological zone × season, sowing and harvest windows) | FAO Land and Water Division | yearly | https://api-cropcalendar.apps.fao.org/api/v1/cropCalendar?countries=<ISO2>&language=en (discovered from the app; no key, CORS) | FAO terms; redistribution of derived windows to be confirmed (GAPS.md) | `scripts/ingest-crop-calendars.py` | months 1–12; ≥40 countries; each crop has a window; else keep last-good; sentence omitted outside coverage |
| Population (internal) | WorldPop 2020 1 km global | WorldPop | static | https://data.worldpop.org/GIS/Population/Global_2000_2020/2020/0_Mosaicked/ppp_2020_1km_Aggregated.tif | CC BY 4.0 | `scripts/population.py` (internal only) | never shown to users |
| Vulnerability (internal) | INFORM Risk Index (latest release via Workflows/Default; currently INFORM Risk Mid 2026, 191 countries) | JRC / IASC | twice a year (March, September) | https://drmkc.jrc.ec.europa.eu/Inform-Index/API/InformAPI/Countries/Scores/?WorkflowId=<id>&IndicatorId=INFORM,HA,VU,CC (no key, CORS *) | EU open data (CC BY 4.0 per data.europa.eu record) | `scripts/ingest-inform.py` | 150–220 countries; scores 0–10; INFORM ≈ geometric mean of HA, VU, CC (±0.3); one calm context line max |
| Places | GeoNames full dump + alternate names | GeoNames | quarterly | https://download.geonames.org/export/dump/ | CC BY 4.0 | `scripts/build_gazetteer.py` | count within ±10% of previous; 50-village, script, typo, ambiguity, nowhere tests |
| Met services | National services directory | WMO Members / curated | reviewed | `data/curated/met_services.json` | – | link check | – |

## Freshness thresholds (Annex C dead-man's switch)

| Layer | Stale after | Behaviour when stale |
|---|---|---|
| Event status | 45 days | briefing shows "last updated" warning; CI opens an issue |
| Forecast | 45 days | forecast sentence omitted; warning |
| Current conditions | 21 days | conditions sentence omitted |
| Composites | 400 days | rebuild reminder issue |

`scripts/freshness-check.js` writes `site/data/freshness.json` and exits non-zero when any live layer is stale.

## Excluded on purpose

- **EM-DAT**: licence forbids redistribution. Historical impact sentences cite public sources only.
- **GADM**: redistribution-restricted (Annex D).
