# Alignment with Early Warnings for All and Sendai Target G

This page is for reviewers at WMO, UNDRR, the Red Cross Red Crescent Climate Centre and national services. It maps ENSO Ready Global to the four pillars of the UN Early Warnings for All initiative and to Sendai Framework Target G. It states what the app does, what it does not do, and where the evidence sits in the [repository](https://github.com/amberbellou/enso-ready-global).

## What this app is

ENSO Ready Global is a citizen-facing layer. It turns public seasonal climate data into a plain-language briefing for any place on Earth. It complements national meteorological and hydrological services. It never replaces them. It is not a warning service. Every briefing names the national service as the source of warnings and links to it.

The app is a static website. It is open source under the MIT licence. It has no accounts, cookies, analytics or advertising. It is maintained by one person.

## Pillar 1. Disaster risk knowledge

**Today.** For each 2 degree grid cell, the app stores how rainfall behaved in past strong El Niño and La Niña events, against a 1991 to 2020 normal (CHIRPS on land, GPCP elsewhere). A reviewed table of 44 regions summarises established impacts from NOAA, IRI, the Australian Bureau of Meteorology and WMO, each with a confidence rating. Country files add local season names and hazards. Preparation steps are keyed by hazard code and livelihood.

**Not done on purpose.** No exposure or vulnerability mapping. No population-at-risk figures. No loss or damage records. No claims about a particular village, because a cell is about 220 km wide.

**Evidence.** `scripts/composites.py`, `scripts/oni_events.py`, `data/curated/teleconnections.json`, `data/curated/countries/`, `data/curated/prep_checklists.json`, `docs/methodology.html`.

## Pillar 2. Detection, observation, monitoring, analysis and forecasting

**Today.** The app reads the NOAA Climate Prediction Center ENSO status once a month. When a user opens a briefing, the browser fetches the ECMWF SEAS5 seasonal anomaly for that point from Open-Meteo (CC BY 4.0). Forecast wording is chosen from fixed bands. Confidence is stated in three words only: likely, leaning that way, uncertain. If a data refresh fails validation, the last good file is kept and the page is stamped with its date.

**Not done on purpose.** The app runs no observation network and no model. It issues no forecast of its own. It gives no daily weather and no alerts. A weekly conditions script (recent rainfall, US Drought Monitor) exists but is not yet in the deploy workflow. Copernicus C3S ingestion is scripted for a later version.

**Evidence.** `scripts/ingest-enso-status.js`, `src/engine.js`, `data/curated/wording_bands.json`, `scripts/freshness-check.js`, `.github/workflows/deploy.yml`, `tests/engine.test.js`.

## Pillar 3. Warning dissemination and communication

**Today.** Briefings use fixed sentence templates. No free-form AI text ships. Templates exist in 13 languages, with 36 planned. Machine-translated languages show a banner and a link to suggest a fix. Each briefing has an Easy Read mode, a read-aloud button, a 30-second radio script and an SMS version. The last briefing is cached offline with its date. The app defers to the national service on every briefing screen.

**Not done on purpose.** No push notifications and no broadcasts. No CAP feeds yet. The app is not registered with any alerting authority and does not present itself as one.

**Evidence.** `i18n/`, `src/app.js`, `src/engine.js` (`renderRadio`, `renderSMS`), `data/curated/met_services.json`, `tests/i18n.test.js`.

## Pillar 4. Preparedness and response capabilities

**Today.** A checklist shows one step at a time, with a time estimate and a short reason. Steps depend on the hazard and on what the user does for a living. A shortcut called "What should I do right now?" always leads to a short list. One step in every list is to follow the national service.

**Not done on purpose.** No evacuation orders. No response coordination. No anticipatory action triggers. No contact with responders.

**Evidence.** `data/curated/prep_checklists.json`, `src/app.js`.

## Sendai Framework Target G

Target G concerns the availability of, and access to, multi-hazard early warning systems and disaster risk information. The app is not a multi-hazard early warning system. It may help with access to understandable risk information, which is the concern of indicators G-5 and G-6. Whether it counts towards any national report is for the Member State to decide. No such decision has been made. [No national service or UN body has reviewed this app.]

## How to review

- Code, data pipeline and tests: the repository.
- Method and sources: the methodology page.
- Known gaps: `GAPS.md` in the repository.
- Corrections and questions: GitHub issues, or amberbellou@gse.harvard.edu.