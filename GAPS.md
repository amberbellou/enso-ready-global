# GAPS — decisions needed from the owner (UN-quality bar)

Updated 7 September 2026. Items are ordered by how much they block release. Each is a decision only you can make; everything else in Annex E is either done or in progress without you.

## Blocking

1. **API key exposure (act today).** Two stray files created by mis-pasted terminal commands were committed in `96ad212` with API keys in their *file names*, one of them the key currently in `.env`. The files are deleted and the history rewritten and force-pushed, but GitHub may keep the old commit reachable by hash for a while. Revoke the current key at console.anthropic.com, create a new one, save it with the terminal command in the chat, and optionally ask GitHub Support to purge the dangling commit.
2. **Copernicus CDS account.** Layers 1 (official multi-system forecast) and 2 (forecast skill) cannot run without it. Create an ECMWF/CDS account, accept the licence on the seasonal datasets, and save the token in `.env` as `CDSAPI_URL=https://cds.climate.copernicus.eu/api` and `CDSAPI_KEY=…` (never commit). Until then the forecast sentence uses ECMWF SEAS5 via Open-Meteo and every cell is skill "unknown", so forecasts never override history.
3. **Contact email alias.** Six pages carry the placeholder `[email alias to be added by the owner]`. Provide one, or decide to route everything through GitHub issues only.
4. **Jurisdiction for /terms and /privacy.** Choose the governing law (usually your country of residence) or delete the sentence.
5. **Teleconnection table review.** `docs/TELECONNECTIONS_REVIEW.md`: 37 of 44 rows have researcher-fetched citations; 7 rows have none yet (Uruguay/Pampas, US Southwest, Europe, Japan, southern Tanzania, North Africa, southeast Brazil); none has passed the second-agent re-check because the subagent budget ran out. Suggested confidence and wording changes are listed per row. Decide row by row; rows without citations should drop to "low" or be removed before release.

## Needed before public launch

6. **Sentence templates for approval** (farmer context, cyclone history): see the chat message; nothing is wired until you approve the wording.
7. **Native-speaker review.** 16 languages are machine-translated; 148 fixes from the automated review were applied to 7 of them (Chinese, Portuguese and Bengali received none because verification agents failed). Decide how sign-off is recorded when a language moves to `reviewed` (a field in the language file is simplest).
8. **WCAG claim.** The accessibility statement says "target: WCAG 2.1 AA" because no audit has been done. Decide when to run a screen-reader and neurodivergent-tester round (Annex B.6) and whether to fund an external audit.
9. **Data licence for `data/curated/` and `i18n/`.** MIT covers code; curated data and translations would be clearer under CC BY 4.0. Your call.
10. **Naming.** Whether the About and Terms pages name you, or say "the maintainer".
11. **Redistribution terms** for briefing text and radio scripts (the About draft says NGOs and radio may copy and read them out with the date and source line kept).
12. **"Forget my place and settings" button.** The privacy page tells users to clear site data in the browser, which is hard for the Annex B audience. Approve adding a one-tap reset in Settings.

## Data gaps with a proposed default (say no if you disagree)

13. **Temperature composites.** ERA5 needs the CDS account. No-key alternative: NASA GISTEMP 2°×2° gridded anomalies (public domain, 1880–present, exactly our grid). Default: add GISTEMP as the temperature source and label it as such.
14. **Global Drought Observatory.** Endpoint research did not complete. Default: ship current conditions from CHIRPS recent rain (global) plus the US Drought Monitor, and add GDO when a stable download is confirmed.
15. **GloFAS, CAMS, FIRMS.** GloFAS and CAMS need CDS/ADS accounts; FIRMS needs a free MAP_KEY (register at firms.modaps.eosdis.nasa.gov). Default: FIRMS next, once you register; CAMS via Open-Meteo Air Quality (CC BY) as the interim haze signal.
16. **CAP pilot countries.** Research did not complete. Default proposal: United States (api.weather.gov), Australia (BoM), Philippines (PAGASA via WMO Severe Weather Information Centre), Kenya (KMD via the WMO Alert Hub), Indonesia (BMKG). To be verified before wiring.
17. **INFORM class line.** INFORM Risk Mid 2026 is ingested for 191 countries. Default wording for the single context line, high/very-high classes only: "This country is rated {class} on the INFORM risk index, which means recovering from shocks tends to be harder here." Approve or edit.

## Not gaps, for the record

- Zero third-party scripts, styles, fonts or CDNs: enforced by `scripts/check-third-parties.js` in CI. Leaflet is vendored.
- HTTPS enforcement on GitHub Pages is requested; GitHub reports the certificate is still being issued.
- EM-DAT and GADM are excluded on licence grounds (Annexes D and earlier decisions).
