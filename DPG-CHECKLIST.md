# Digital Public Good checklist

This file maps the nine indicators of the Digital Public Goods Alliance standard to evidence in this repository. Each line names a file path or says "gap". Status words: **Met**, **Partly**, **Gap**. Last checked 7 September 2026, against the local working copy.

The project is not yet registered with the DPG Alliance. Registration needs the owner (see the gap list at the end).

## 1. Relevance to the Sustainable Development Goals

**Status: Partly.**

- The product gives plain-language seasonal outlooks and preparation steps for any place on Earth. This serves SDG 13 (climate action, target 13.1 on resilience and early warning), SDG 2 (food security) and SDG 11 (disaster losses, target 11.5).
- Evidence: `README.md` (vision and how it works), `enso-ready-global-spec.md` section 7 (alignment with UN Early Warnings for All), `docs/methodology.html`.
- Gap: no written SDG statement in the repo. The spec asks for an `/alignment` page (Annex E.B.6). It does not exist yet.

## 2. Use of approved open licences

**Status: Met.**

- Code: MIT, in `LICENSE` and `package.json`.
- Data: every source has its licence recorded in `data/derived/composites.json` (`provenance` block), `README.md` (data sources table) and `ADAPTATION_NOTES.md` section 0 (licence review of reused projects).
- Attribution to CC BY 4.0 sources (Open-Meteo, GeoNames) is printed in the site footer by `scripts/build-site.js` and on `docs/methodology.html`.
- Note: curated content in `data/curated/` and the templates in `i18n/` are covered by the MIT licence. A data-specific licence (for example CC BY 4.0) would be clearer for reusers. Owner decision.

## 3. Clear ownership

**Status: Partly.**

- Copyright holder is named in `LICENSE` (Amber Bellou, 2026). The repository lives at github.com/amberbellou/enso-ready-global.
- Gap: no `GOVERNANCE.md` or `CONTRIBUTING.md`. No stated succession plan if the solo maintainer stops. No contact route other than GitHub issues. [An email alias will be added by the owner.]

## 4. Platform independence

**Status: Met.**

- The site is static HTML, CSS and vanilla ES modules with no framework and no runtime server (`src/`, `scripts/build-site.js`). It can be served from any web host, not only GitHub Pages.
- Build tools are open source: Node 22 and Python 3 with numpy and netCDF4 (`README.md`, Develop section).
- Optional external calls are all replaceable: Open-Meteo for the live forecast (`src/app.js`, with a working fallback when it fails), OpenStreetMap tiles for the map, and a second static site for the place index (`ops/deploy-geo.sh`).
- Note: the map picker loads Leaflet from cdnjs.cloudflare.com (`src/app.js` around line 117). This is a third-party dependency at run time, only when the map is tapped. It could be vendored into the repo.

## 5. Documentation

**Status: Met.**

- `README.md`: purpose, data flow, sources, repo layout, build and test commands.
- `docs/methodology.html`: public explanation of the method, limits and privacy.
- `docs/SPEC.md` and `enso-ready-global-spec.md`: product specification.
- `ADAPTATION_NOTES.md`: design decisions and what was refused from other projects.
- `ops/README.md`: deployment.
- Tests: `tests/engine.test.js`, `tests/gazetteer.test.js`, `tests/i18n.test.js`.
- Gap: `DATA_SOURCES.md`, `STYLE.md` and `GAPS.md` are named in the spec (Annex E.B) but not yet written.

## 6. Mechanism for extracting data

**Status: Met.**

- All generated data is plain JSON in the repo: `data/derived/composites.json`, `data/derived/oni.json`, `data/derived/enso_status.json`, and the published copies under `site/data/` (`meta.json`, `freshness.json`, `status.json`, per-cell files in `site/data/cells/`).
- Every file carries a schema number, units and provenance (`composites.json`, `schema: 3`).
- Users hold no account data. Their place and settings live only in the browser's localStorage under keys starting with `er:` (`src/app.js`, line 7). They can clear them from browser settings. Each briefing can also be copied as a radio script or SMS text (`src/engine.js`, `renderRadio`, `renderSMS`).
- Curated inputs (`data/curated/*.json`) are editable JSON with an `_about` field.

## 7. Adherence to privacy and applicable laws

**Status: Partly.**

- No accounts, no cookies, no analytics, no ads. Stated in `docs/methodology.html` (Privacy), the site footer (`scripts/build-site.js`) and the first line of `src/app.js`.
- No server receives search terms: place search runs in the browser over static shards (`src/search.js`, `README.md` Location system).
- Network calls made by the page: the site itself, the place-index site, Open-Meteo (when a briefing opens), OpenStreetMap tiles and cdnjs (only when the map is tapped). Each of these sees the visitor's IP address and, for Open-Meteo, the coordinates of the chosen place.
- Gap: no `/privacy` page and no `/terms` page. The spec requires both (Annex E.B.2). The Open-Meteo and cdnjs calls should be disclosed there.
- Gap: no statement of which law applies. [Jurisdiction to be confirmed by the owner.]

## 8. Adherence to standards and best practices

**Status: Partly.**

- Data: ISO 3166 country codes (`data/curated/countries/<CC>.json`), hazard codes shared with the IFRC GO taxonomy (`ADAPTATION_NOTES.md` section 2.1), WMO Members directory for official services (`data/curated/met_services.json`).
- Accessibility: WCAG 2.1 AA and W3C COGA guidance are the design target (spec Annex B). Skip link, focus management, reduce-motion, dyslexia spacing and Easy Read mode are in `src/app.js` and `src/style.css`. RTL is set per language from `i18n/<lang>.json` (`_dir`).
- Engineering: schema validation with last-good fallback (`scripts/ingest-enso-status.js`, `validate`), staleness stamps (`site/data/freshness.json`), timeouts on every CI step (`.github/workflows/deploy.yml`), tests run in CI.
- Gap: one test fails today (`tests/i18n.test.js`, slot mismatch in `i18n/ar.json`, key `forecast_partial`). CI should be red until fixed.
- Gap: no `security.txt`, no dependency audit in CI, no link checker (`scripts/check-links.js` is referenced in `met_services.json` but does not exist). No screen-reader or keyboard test record yet.
- Gap: no CAP (Common Alerting Protocol) output. Planned in spec Annex E.

## 9. Do no harm by design

### 9a. Data privacy and security

**Status: Gap.** See section 7 for the privacy design. Two problems need the owner now:

- Two files in the repository root have names that begin with `.envsk-ant-` and appear to contain an API key in the file name. They are tracked by git (commit `96ad212`) and the remote is public. The keys must be revoked, the files removed, and git history rewritten. `.gitignore` covers `.env` but not these names.
- `scripts/__pycache__/*.pyc` files are tracked. They should be ignored.

### 9b. Inappropriate and illegal content

**Status: Met.**

- No user-generated content exists on the site. Users cannot post anything. Corrections go to GitHub issues, which GitHub moderates under its own terms.
- All briefing text comes from fixed templates in `i18n/<lang>.json`. No free-form AI text ships (`docs/methodology.html`, `README.md`). Machine-translated strings carry `mt: true` and show a banner with a fix link (`src/app.js`, line 35).
- Gap: place names come from GeoNames. Disputed names and borders follow UN practice in principle (spec Annex D.5), but no boundary disclaimer is on the methodology page yet.

### 9c. Protection from harassment

**Status: Met.** There is no messaging, no profiles and no way for one user to reach another. A code of conduct for contributors is missing (`CODE_OF_CONDUCT.md`). The planned WhatsApp bot (spec roadmap) will need its own review.

## Do-no-harm design note

**Severity that does not frighten.** Every risk line is a calm fact followed by an action. Confidence uses three words only: likely, leaning that way, uncertain (`data/curated/wording_bands.json`). There are no countdowns, sirens, red screens or doom images (spec Annex B.5). A "What should I do right now?" shortcut always leads to a short list (`i18n/en.json`, `what_now`). Fewer than three past events means no local average is shown, so weak evidence is never dressed up as a forecast.

**No identification of users.** No account, no cookie, no server log of searches. Location is used in the browser and stored only there. The only outside service that learns a place is Open-Meteo, and only its coordinates, not who asked.

**Misuse risks.** Someone could present a briefing as an official warning. Every page says it is not one and links the national meteorological service (`data/curated/met_services.json`). Someone could read a seasonal tendency as a daily forecast; the methodology page states this limit. A stale page could be mistaken for current; the dead-man's switch stamps the date and shows a staleness banner. Machine translation could invert a meaning; the banner and `mt: true` flag exist for this, but human review is still needed per language.

## Gaps that need the owner

1. Revoke the two leaked API keys, remove the files, rewrite history, extend `.gitignore`.
2. Fix the failing `tests/i18n.test.js` case so CI is green.
3. Write `/privacy`, `/terms`, `/accessibility`, `/contact`, `/about` and `/alignment` pages.
4. Write `GOVERNANCE.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `DATA_SOURCES.md`, `STYLE.md`, `GAPS.md`.
5. Add `security.txt`, a dependency audit step and a link checker to CI.
6. Decide whether to vendor Leaflet instead of loading it from cdnjs.
7. Decide on a data licence for `data/curated/` and `i18n/`.
8. Add a boundary disclaimer to the methodology page.
9. Confirm the applicable jurisdiction and add the contact email alias.
10. Apply to the DPG Alliance registry once items 1 to 5 are done.
