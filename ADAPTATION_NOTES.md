# ADAPTATION_NOTES — what we take from the reference projects, and what we refuse

*Study phase, 7 September 2026. Five repos cloned shallowly into `reference/` (git-ignored). Findings marked **verified** were read in the source; anything inferred is flagged.*

**Ground rule (from the spec):** Annex B (cognitive-accessibility UI) and Annex C (budget, static pre-generation, template-only language, dead-man's switch) override every pattern below. Where a reference project solved a problem better than our first instinct, we adopt the idea. Where its context differs (analyst dashboards, institutional servers, map-first UI), we do not.

**Current state to be honest about:** Phase 1 steps 1–5 were already scaffolded and deployed before this study (engine, GPCP composites, 44-region teleconnection table, English site at amberbellou.github.io/enso-ready-global). The adaptations below are therefore a **retrofit list** applied to that build, not a greenfield plan. Nothing further is built until you approve this document.

---

## 0. License summary (verified from each LICENSE file)

| Repo | License | Code copying into our MIT repo? | Ideas / architecture? |
|---|---|---|---|
| WFP-VAM/prism-app | **MIT** (root). Sub-packages diverge: `common/` CC0-1.0, `api/` Apache-2.0, `frontend/` no license field | Yes, with attribution ("World Food Programme, MIT") | Yes |
| IFRCGo/go-web-app | **MIT** (root and every package.json) | Yes, with attribution ("GO, MIT"). Not the Red Cross emblem or GO wordmark (treaty/trademark protected) | Yes |
| open-meteo/open-meteo | **AGPL-3.0** | **No.** Not even line-by-line ports. Their **data** is CC BY 4.0 with a mandatory attribution link | Yes |
| CLIMADA-project/climada_python | **GPL-3.0** | **No** | Yes |
| DahyannAraya/copernicus-seasonal-forecast-tools | **GPL-3.0-or-later** | **No.** Importing it from CI would be legal but we recommend not depending on it at all (see §4) | Yes |

Your note that WFP-VAM repos may be AGPL was worth checking: this one is MIT at the root, but the per-folder licenses are inconsistent and there are no nested LICENSE files. Rule applied: we reuse PRISM **frontend config data** (MIT root) and treat `api/` code as Apache-2.0 if ever touched. We copy nothing from the three GPL/AGPL repos; where an idea is worth having we reimplement from scratch.

---

## 1. WFP PRISM (prism-app)

*What it is:* a React SPA map viewer for analysts, one build per country (33 countries), WMS layers from WFP's data hub, FastAPI backend for zonal statistics, Postgres-backed threshold email alerts. Born in the 2015–16 El Niño response.

### Adopt

1. **The five-concept date model** (`docs/dates.md`: reference date, available dates, validity period, coverage window, query date). *Why it fits:* our status banner and forecast layer need exactly this to say "issued 13 Aug, valid until the next CPC update, stale after that" and to drive the dead-man's-switch stamp. Implement as fields in `data/status.json` and a `meta.json` per data product.
2. **Precomputed availability files instead of runtime discovery** (`preprocessed-layer-dates.json`, built by a script for countries that opt in). *Why:* identical to our "pre-generate everything, serve static" rule; we formalize it as `site/data/meta.json`.
3. **Translation coverage test** (`config.test.ts`: extract every `t('…')` key from code plus every label key from config JSON, assert each language file covers them). *Why:* with 36 machine-translated languages, missing keys are our most likely silent failure. Port the idea as `tests/i18n.test.js` (our own implementation, not their code): every key in `en.json` must exist in every other language, and `{slot}` names must match exactly.
4. **Shared config plus per-country override, merged at build time** (`shared/layers.json` merged with `<country>/layers.json`). *Why:* our teleconnection regions are global, but local season names ("short rains", "kiremt", "canícula"), met-service links and country-specific hazards are national. Add `data/curated/countries/<ISO2>.json` overrides merged over the region defaults, at build time only, never all bundled into the client.
5. **Impact = hazard × exposure gated by a threshold** (`"type": "impact"` layers). *Why:* it validates our hazard × livelihood checklist matrix; we add a threshold concept so a step only appears when the composite anomaly or forecast probability crosses a band, instead of always showing every hazard step.
6. **Universal admin-name translations as data** (see §6). *Why:* localized place names for search results and headlines in the UN five, at zero LLM cost.

### Do NOT copy

- **The runtime.** React 19 + Redux + MUI v4 + MapLibre + seven deck.gl packages + Chart.js + jsPDF + html2canvas: 82 runtime dependencies, no code splitting, all 33 country configs statically imported into one bundle. Multi-megabyte first load. Violates our <500 KB budget outright.
- **Map-first, multi-widget dashboards.** Violates Annex B.1 (one thing per screen).
- **Runtime WMS/WCS dependency** on `api.earthobservation.vam.wfp.org`. Every briefing would depend on a third-party server at request time; our rule is pre-generated static pages with no live dependency for the core briefing.
- **Their alerting stack** (Postgres, host crontab into Docker Compose, Playwright screenshots, SMTP). Violates the $25 ceiling and Annex C.2.4 (reply-only, no proactive broadcasts in v1). The one transferable idea is the dedup rule `skip if last_triggered >= max_date`, which we mirror in the WhatsApp bot later.
- **PostHog and Sentry** in the frontend. Violates "no tracking" (§6).
- **RTL:** they have none (verified: no `dir="rtl"` anywhere). Not a model for our Arabic/Urdu requirement.
- **Bounding-box convention trap:** their `map.boundingBox` is `[lonMin, latMin, lonMax, latMax]`; ours is `[latMin, latMax, lonMin, lonMax]`. Do not paste boxes across.

---

## 2. IFRC GO (go-web-app)

*What it is:* the Red Cross emergency-operations platform: pnpm monorepo (app + published `@ifrc-go/ui` component library + Storybook), Vite, CSS Modules, a custom translation system with a server-side string store.

### Adopt

1. **Language-independent hazard codes.** Their `EQ, FL, TC, EP, FI, SS, DR, TS, CD, WF` taxonomy (`app/src/utils/domain/risk.ts`). *Why:* our `prep_checklists.json` currently keys hazards by English strings ("river flood"), which will break the moment we translate. Retrofit: hazards become stable codes (`FL`, `FLR`, `FF`, `LS`, `DR`, `WS`, `WF`, `HZ`, `HT`, `EP`, `CH`, `RVF`, `CS`, `CF`, `FI`, `TC`, `ST`, `HS`, `SI`, `FR`, `SN`, `CD`, `MW`, `CU`) with labels in `i18n/<lang>.json`.
2. **Translation migrations as a delta log** (`translationMigrations/NNNNNN-<epoch>.json`, each a list of add/remove/update actions linked by `parent`). *Why:* with 36 languages refreshed by an LLM, we must only ever re-translate the keys that changed, and know which keys in each language are still machine-drafted. We implement a simpler cousin: `i18n/en.json` is the source of truth; `scripts/i18n-diff.js` compares each language file's `_source_hash` per key and emits only the new/changed keys for translation; every translated key records `mt: true` until a reviewer clears it. This is what makes the C.2.2 "machine-translated, tap to fix" banner truthful per key.
3. **Co-located string usage lint** (their custom ESLint rule flags unused and unknown keys). *Why:* dead strings cost LLM money per language and confuse reviewers. Fold into `tests/i18n.test.js`.
4. **The CI trick "fail if generating a migration succeeds"** (a forgotten migration is caught by CI). *Why:* cheap guard that `en.json` and the language files never drift; add as a GitHub Actions job once the workflow scope is granted.
5. **Design tokens derived from two base scalars with a responsive base** (`--base-font-size`, `--base-spacing`, redefined under a 40 rem media query) and the `--variant-color` local-remap pattern. *Why:* our text-size and high-contrast toggles become two variable swaps instead of dozens of overrides. Reimplement in `src/style.css`; do not import their CSS.
6. **`typos` CI job and a PR template** with "no secrets, no console.log" checks. *Why:* free, and our repo is public.

### Do NOT copy

- **Their accessibility layer.** Verified gaps: no skip link, no `prefers-reduced-motion` handling, ARIA on six attributes across 92 components, form errors not linked with `aria-describedby`, modal `closeOnEscape` defaults to false, `--go-ui-color-text-light` fails 4.5:1 on their background (calculated, not stated in repo). Annex B is stricter than GO on every one of these. We exceed them; we do not model on them.
- **Page reload on language change** (`window.location.reload()` for Arabic). Violates Annex B.6 (nothing lost by switching) and B.1.5.
- **Server-side string store** ("cacheppuccino") with runtime fetch. Strings ship in the static build.
- **Bundle:** Mapbox GL, exceljs, xlsx, TinyMCE, PowerBI client, three render-blocking Google Fonts stylesheets, Google Analytics + Hotjar + Sentry. All violate budget or no-tracking.
- **React + pnpm monorepo + Storybook + Chromatic.** Fine for a 10-person team; for a solo builder at 5–10 hrs/week it is overhead with no user-facing benefit. Vanilla ES modules stay.
- **Their hazard colors as text colors.** They are muted map fills; several fail text contrast. Use as icon-background accents only, never as the only signal (Annex B.4).

---

## 3. Open-Meteo

*What it is:* a free global weather API run by a tiny team: Swift/Vapor server, a custom time-series-chunked compressed file format, memory-mapped reads, mirrored on AWS Open Data. AGPL code, CC BY 4.0 data.

### Adopt (ideas only, code never)

1. **Use their seasonal API client-side as our v1 live-forecast layer.** `seasonal-api.open-meteo.com/v1/seasonal?latitude=…&longitude=…&monthly=precipitation_anomaly,precipitation_mean&models=ecmwf_seas5` returns ECMWF SEAS5 monthly precipitation anomalies per point, free, no key, CORS `*`. *Why it fits:* Phase 1 step 6 ("wire Copernicus seasonal forecast") becomes a browser fetch with zero server cost, and the rate limit is per **user** IP, so it scales with users, not with us. The briefing must still render fully from history + pattern when the call fails or the user is offline. Attribution link is mandatory and goes on every briefing that uses it. **This needs your decision (see §7, decision 1).**
2. **A `meta.json` freshness artifact** (`last_run_initialisation_time`, `data_end_time`, `update_interval_seconds`). *Why:* it is the dead-man's switch made visible: pages stamp "data as of" from it and show a staleness banner when `now > data_end + interval`.
3. **Write to a temp file, then atomic rename.** *Why:* a failed build can never leave a half-written cell file; last-good stays intact. Apply to every writer in `scripts/`.
4. **Hard watchdogs on every ingestion job** (they `alarm()` every downloader). *Why:* CDS and NOAA jobs hang; a hung Actions job wastes the free minutes. `timeout-minutes` on every step, plus "silent on success, print the log on failure".
5. **`cell_selection=land|sea|nearest` semantics.** *Why:* coastal cities on a 2.5° grid often snap to an ocean cell. Add an `on_land` mask per cell (Natural Earth, public domain) and snap coastal places to the nearest land cell by default.
6. **A `units` block and schema version in every data file**, and lossy integer quantization (their int16 scale factor). *Why:* traceability and size. We already round to whole percent; we add `schema: 1` and `units` fields so a future format change is detectable by the validator.
7. **Retry rules tuned to upstream races** (minimum size check, 404-means-not-yet-published backoff, global deadline). *Why:* NOAA CPC publishes mid-month at variable times; our monthly job should retry within a deadline rather than fail once.

### Do NOT copy

- **Any Swift source, the om file format, memory-mapped serving, Prometheus metrics, rate limiter.** AGPL; and we have no server to run them on.
- **Running an API at all.** Their whole design assumes a box with NVMe and 16 GB RAM. Ours is a CDN.
- **Server-side pre-generation from Open-Meteo in Actions.** One IP, 10 k cells: it would trip their fair-use limit and make us a bad citizen. Client-side only, or Copernicus CDS for bulk.
- **Treating Open-Meteo as the official source.** Spec §7 requires traceability to WMO/Copernicus/NOAA. We label it "ECMWF SEAS5 via Open-Meteo" and keep the CDS multi-system product as the v2 official path.

---

## 4. copernicus-seasonal-forecast-tools

*What it is:* a JOSS-stage academic package (v0.1.2) that downloads raw 6-hourly ECMWF/DWD seasonal ensemble members from CDS and computes **heat indices** into CLIMADA hazards.

### Recommendation: do not depend on it. Write our own ~150-line CDS script for v2.

Verified reasons:
- **Wrong product and wrong variable.** It only calls `seasonal-original-single-levels` with `leadtime_hour` (raw sub-daily members) and only for 2 m temperature, dewpoint and wind. No precipitation anywhere in the code or tests. No anomalies, no hindcast climatology, no terciles. We would download orders of magnitude more data than we need and still write the tercile logic ourselves.
- **C3S publishes the reduced product we want** (monthly anomalies and tercile probabilities in `seasonal-postprocessed-single-levels` / the multi-system products). Exact `product_type` strings to be confirmed on the CDS download tab; not verified in this repo.
- **No retries, no rate-limit handling, no timeouts** (grep confirmed). CDS queue times regularly exceed a GitHub Actions job; their pipeline would hard-fail on every stall.
- **Heavy install** (cartopy, geopandas, cfgrib/ecCodes) for a bounding-box helper we do not need. No test CI in the repo; a docstring references a module that does not exist.
- **GPL-3.0.** Legal from CI, but pointless friction for zero benefit.

### Adopt (ideas)

1. Their **CDS error-message mapping** (401 = bad key, 403 = dataset licence not accepted, with the exact "accept terms" URL, 404 = wrong dataset id, 400 = bad request). Reimplement in our script; it will save the first hour of debugging.
2. **File-exists-skip caching** keyed by centre/system/year/init-month/area. Same idea as our last-good rule.
3. **Request key spellings** for cdsapi v2 (`data_format`, `originating_centre`, `system`, `variable`, `year`, `month`, `leadtime_month`, `area` as `[N, W, S, E]`).
4. **Plan the one-time human step**: a CDS account, accepting the dataset licence in the web UI, and storing `CDSAPI_URL`/`CDSAPI_KEY` as Actions secrets.

---

## 5. CLIMADA (skim)

*What it is:* ETH Zurich's probabilistic climate-risk engine: a `Hazard` (events × centroids sparse intensity and fraction), `Centroids` (a GeoDataFrame with `region_id`, `on_land`, distance to coast), `Exposures`, and piecewise-linear impact functions. No drought or precipitation-anomaly hazard in core (it lives in climada_petals, not cloned).

### Adopt into our composites schema (ideas only)

1. **Never store a mean without its population.** Add `n_events` per phase and refuse to state a composite below a minimum count; store `null`, never 0, where undefined.
2. **Keep the sign-agreement fraction as a separate field from the mean** (mirrors `fraction` beside `intensity`). We already do; keep them from being blended into one score.
3. **Spread across events** (`std` or interquartile range) per season, so the briefing can say "past events disagreed" from data rather than from a mean near zero.
4. **`on_land` boolean and `region_id`** (ISO 3166 numeric, ocean = 0) per cell, from Natural Earth. Enables land-snapping (§3.5) and country joins without a second lookup.
5. **Explicit baseline metadata at the top level**: `baseline_start`, `baseline_end`, `anomaly_type: "percent"`, `units`. The unit is never implicit.
6. **Event id uniqueness check** in `oni_events.py` (their `Hazard.check()` raises on duplicates).

### Do NOT copy

- Any code (GPL). Not `lon_normalize`, not the nearest-neighbour matchers, not the sparse-matrix handling. Re-derive from `scipy.spatial.cKDTree` if we ever need it.
- The full Hazard/Exposure/ImpactFunc machinery. We are not computing monetary damage.
- **EM-DAT.** The spec lists it as a source; CLIMADA only ships a reader. EM-DAT requires an account and forbids redistribution. We will not publish EM-DAT-derived values. Historical-impact sentences stay in our curated notes citing WMO/ReliefWeb/national reports.

---

## 6. "Steal their homework": openly licensed data and endpoints directly reusable

| Asset | Where | License | Use for us |
|---|---|---|---|
| **Admin-area name translations**, 265 countries × ar/es/fr/ru/zh | `prism-app/frontend/src/config/universal/translations/<ISO3>/<lang>.json` | MIT (root) | Localized region/province names in search results and headlines for the UN five, no LLM cost |
| 60 shared WMS layer definitions with SPI/rainfall-anomaly legends and thresholds | `prism-app/frontend/src/config/shared/layers.json`, `legends.json` | MIT | Calibrate our anomaly wording bands ("much drier" etc.) to WFP's published SPI/anomaly classes |
| Global admin boundaries (adm0–adm3) as PMTiles | `prism-app/.../shared/universal-admin-boundaries.json` → S3 PMTiles URL | Not stated in repo; third-party | Reference only until license confirmed; we do not need maps |
| WFP HDC OGC endpoint (CHIRPS-derived layers) | `https://api.earthobservation.vam.wfp.org/ows/` | Not stated | Not for runtime; possible offline source for CHIRPS composites if IRI DL is slow |
| Hazard taxonomy and risk categories | `go-web-app/app/src/utils/domain/risk.ts`, `utils/constants.ts` | MIT | Hazard codes (§2.1) |
| Open-Meteo seasonal API (ECMWF SEAS5 monthly precipitation anomaly, per point) | `https://seasonal-api.open-meteo.com/v1/seasonal` | Data CC BY 4.0, attribution link required; free tier <10 k calls/day per IP | v1 live-forecast layer, client-side (§3.1) |
| Open-Meteo archive API (ERA5 precipitation/temperature per point, 1940–) | `https://archive-api.open-meteo.com/v1/archive` | CC BY 4.0 | Optional per-point "what happened here in 1997-98" temperature line |
| Natural Earth admin-0 (via CLIMADA's usage) | public download | Public domain | `on_land` mask and ISO numeric `region_id` per cell |
| CDS dataset ids and request shape | copernicus tools `seasonal_forecast.py` | Ideas only | v2 official forecast ingestion |
| GeoNames cities and countryInfo (already in use) | download.geonames.org | CC BY 4.0 | Add attribution to methodology page (currently missing) |
| GPCP v2.3, NOAA ONI, CPC discussion (already in use) | NOAA NCEI / CPC | US public domain | Already cited |

Not reusable: EM-DAT (closed terms), `@ifrc-go/icons` (license not verifiable from the clone), Red Cross emblems, NASA FIRMS URLs embedding an API key.

---

## 7. Decisions that need your approval

1. **Live forecast layer for v1: Open-Meteo client-side (free, CC BY, "SEAS5 via Open-Meteo") now, Copernicus CDS multi-system terciles in v2.** Alternative: CDS-only from the start, which needs a CDS account, licence acceptance, secrets in Actions, and tolerance for queue stalls. My recommendation is the two-step path.
2. **Hazards become codes** (breaking change to `prep_checklists.json` and `teleconnections.json`, with labels moved into `i18n/`). Recommended; required before any translation.
3. **Translation delta model** (`_source_hash` per key, `mt: true` flags, `scripts/i18n-diff.js`) instead of re-translating whole files. Recommended.
4. **Composites schema v2** with `n_events`, spread, `on_land`, `region_id`, baseline metadata, `null` discipline, plus land-snapping for coastal places. Recommended; requires a one-off recompute.
5. **Per-country override files** for season names, hazards and met services. Recommended; starts with the 30 highest-impact countries from Annex A.
6. **Drop EM-DAT** from the source list; keep historical-impact sentences curated with open citations. Recommended.
7. **Attribution block** on every briefing and the methodology page: GPCP/NOAA, GeoNames (CC BY 4.0), Open-Meteo (CC BY 4.0), Natural Earth, WFP PRISM (MIT, for place-name translations). Required by licenses, not optional.

Everything else in "Adopt" is internal engineering that stays within the spec and needs no decision from you. Nothing in "Do NOT copy" will be built.

---

## 8. Retrofit order once approved (maps to Annex C Phase 1)

1. Hazard codes + i18n labels; i18n coverage test (§1.3, §2.1, §2.3).
2. Composites v2 schema, land mask, region ids, atomic writes, `meta.json` (§3.2, §3.3, §5).
3. Country override files for the Annex A countries (§1.4).
4. Open-Meteo forecast layer in the client with offline fallback and attribution (§3.1). This completes Phase 1 step 6.
5. Translation delta tooling, then the UN-six template pass (Phase 2), each key flagged `mt: true`.
6. Actions workflow with watchdog timeouts and log-on-failure, once the `workflow` scope is granted (§3.4).

The standing question, asked at each step: did the reference projects solve this better than my instinct? Where yes, it is listed above. Where their answer costs bundle size, servers, tracking, or cognitive load, the spec wins.
