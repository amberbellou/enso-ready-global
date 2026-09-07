# ENSO Ready Global — Product Spec & Build Plan
*A worldwide El Niño / La Niña personal impact briefing, built for distribution by international agencies*

---

## 1. Vision

El Niño and La Niña are the single biggest recurring driver of floods, droughts, failed harvests, and disease outbreaks across the planet — affecting billions of people — yet the forecasts live in technical bulletins from WMO, NOAA, and ECMWF that ordinary people never see. ENSO Ready Global translates official international climate data into a personalized, plain-language seasonal briefing and preparation plan for **any location on Earth, in the user's own language**.

**One-line pitch:** "Tell us where you live. See what this El Niño means for you — in your language — and what to do about it."

**Distribution thesis:** The UN system (WMO, UNDRR, OCHA) and national agencies already invest heavily in "anticipatory action" — acting before forecasted disasters. This app is the **citizen-facing layer of anticipatory action**: the same forecasts those agencies use, made personal and readable. That is the pitch for institutional adoption.

**Why now:** A very strong El Niño is underway, forecast to peak winter 2026–27 (>90% probability per NOAA; WMO issued its advisory June 2026). Global need peaks in the coming 9 months.

---

## 2. Who it serves (global personas)

| User | Region example | Need |
|---|---|---|
| Smallholder farmer | Kenya, Indonesia, India | Will the rains come? Plant early/late/drought-tolerant? |
| Coastal family | Peru, Philippines, Bangladesh | Flood/typhoon risk window, evacuation prep |
| City resident | São Paulo, Manila, Los Angeles | Water shortages, storms, heat |
| Local official / teacher / NGO worker | Anywhere | A shareable one-page regional outlook in the local language |
| Aid & Red Cross volunteers | Anywhere | Consistent plain-language messaging aligned with official forecasts |

---

## 3. Core user flow

1. **Landing** — global ENSO status banner (from latest WMO update) + location entry (search any city/village, or use device location; works by region if exact place unknown).
2. **Optional personalization (on-device only)** — farmer / coastal / urban; household details; livelihood type.
3. **Personal Briefing**
   - **Headline** in the user's language: what this event means for their region and season.
   - **What to expect:** rain/temperature outlook vs normal with confidence level.
   - **When:** timeline (onset → peak → fade), aligned to local seasons (e.g., "long rains," monsoon, typhoon season).
   - **Historical analogs:** what happened locally in 1982–83, 1997–98, 2015–16.
   - **Prep checklist** tailored to hazard + livelihood (crop timing for farmers, water storage in drought zones, document/evac prep in flood zones, dengue/cholera awareness where relevant).
4. **Monthly refresh** as WMO/IRI/ECMWF issue updated outlooks.
5. **Official alert deferral** — always link to the user's national meteorological service (WMO maintains the registry of all of them) as the authoritative warning source.

---

## 4. Global data sources (all free/public)

| Source | Provides | Notes |
|---|---|---|
| **WMO El Niño/La Niña Updates** | Official global ENSO status & probabilities | UN agency — ideal for UN-aligned messaging |
| **IRI/CPC ENSO forecast plume** (Columbia Univ.) | Monthly probabilistic ENSO forecast | Long-standing standard |
| **ECMWF / Copernicus Climate Data Store (C3S)** | Seasonal forecasts (precip, temp) for the whole planet, multi-model | Free API; the backbone of global coverage |
| **NOAA CPC / ONI** | Event strength history & classification | For historical analogs |
| **CHIRPS (UCSB)** | Global historical rainfall grids since 1981 | Compute per-region ENSO analog anomalies worldwide |
| **ERA5 reanalysis (Copernicus)** | Global historical temperature | Analog composites |
| **Regional Climate Outlook Forums (RCOFs)** | Consensus regional outlooks (GHACOF for East Africa, ASEANCOF, etc.) | Credibility with regional agencies |
| **WMO registry of national met services** | Official warning source per country | For the "defer to your national service" link |
| **UNDRR / EM-DAT historical disaster records** | Past ENSO-linked disasters by country | Grounds the "what happened last time" section |
| **GeoNames / OpenStreetMap** | Global place search → coordinates | Location entry for anywhere on Earth |

**Core derived dataset:** a precomputed global grid (or ~1,000 named regions) of **historical ENSO impact composites** — observed rainfall/temperature anomalies during past strong El Niño and La Niña seasons, computed from CHIRPS + ERA5. This is what turns "El Niño is here" into "your region's short rains averaged 40% heavier in the last three strong events."

---

## 5. The briefing engine (global version)

```
place name / GPS → region cell (grid or named region)
  → current seasonal forecast for that cell (Copernicus multi-model)
  → historical ENSO analog stats for that cell (CHIRPS/ERA5 composites)
  → known regional teleconnection pattern (curated impact map)
  → hazard & livelihood context (flood/drought propensity, farming calendar)
  → structured facts → deterministic template → LLM polish & translate
  → briefing in user's language
```

**The curated teleconnection layer** (small, hand-built, high value): a reviewed table of well-established regional ENSO impacts with scientific confidence ratings — e.g., El Niño → wetter coastal Peru (high confidence), drier Maritime Continent (high), weaker Indian monsoon (medium), wetter East African short rains (high), drier Southern Africa DJF (high), more intense western Pacific typhoons reaching farther east (medium-high), drier/hotter Australia (high), wetter southern US (high). Every briefing blends: known pattern + this event's live forecast + local history, and says when signals disagree.

**Language rules:**
- All numbers and probabilities come from the deterministic pipeline; the LLM only rephrases and translates — it never generates facts.
- Confidence is always stated in words ("likely," "leaning," "uncertain") calibrated to probability bands.
- Reading level ~8th grade equivalent in every language; reviewed by at least one native speaker per launch language.

**Launch languages (phased):**
1. UN six: English, Spanish, French, Arabic, Chinese, Russian
2. High-impact additions: Portuguese, Hindi, Bahasa Indonesia, Tagalog, Swahili, Amharic, Vietnamese, Thai, Urdu, Hausa
3. Community-contributed translations via open-source repo

---

## 6. Access & equity requirements (non-negotiable for UN-grade distribution)

- **Ultra-light web app:** first load under ~500KB, works on low-end Android and 2G/3G; server-rendered HTML fallback with no JavaScript required for the core briefing.
- **Offline:** last briefing cached on device; clearly stamped with its date.
- **Zero-cost privacy:** no accounts, no tracking; location used transiently; household details stay in localStorage.
- **Channel expansion path:** the same briefing engine can output to
  - a WhatsApp/Telegram bot ("send your town name, get your briefing"),
  - SMS summaries (160-char outlook + prep tip) via aggregators used by NGOs,
  - a printable one-page PDF per region for offices, schools, churches, radio stations.
- **Accessibility:** WCAG 2.1 AA; RTL layout support (Arabic, Urdu); fonts covering all launch scripts.
- **Radio-ready text:** every regional briefing includes a 30-second read-aloud version — community radio is the dominant channel in many affected regions.

---

## 7. Trust & governance (what makes the UN/US comfortable promoting it)

- [ ] Every fact traceable to WMO, Copernicus, NOAA, or an RCOF with a visible link
- [ ] Prominent statement: *"For warnings and emergencies, follow your national meteorological service"* — auto-linked to the right agency per country
- [ ] Methodology page + open-source code (Apache/MIT) + open data pipeline
- [ ] No ads, no paywalls, no data sale — funded (if ever) by grants only
- [ ] Tone standard: probabilistic, calm, action-oriented; no doom UI
- [ ] Scientific review: recruit 2–3 climate scientists as volunteer advisors (IRI, university groups, and Red Cross Climate Centre staff are realistic to reach as an open-source civic project)
- [ ] Alignment with the UN "Early Warnings for All" initiative — cite it in the pitch; the app directly serves its goal of universal warning access

---

## 8. Architecture

```
Frontend: Next.js, server-rendered, i18n (next-intl), Tailwind,
          lightweight charts; no-JS HTML fallback route
Backend:  API routes  /briefing?place=…&lang=…   /enso-status   /region/:id
Data:     Postgres + PostGIS
          Tables: region_grid, analog_composites, current_forecast,
                  teleconnections, country_met_services, translations
Jobs:     monthly  ingest-wmo-update, ingest-iri-plume, ingest-c3s-forecast
          yearly   rebuild-analog-composites (CHIRPS/ERA5)
          on-deploy validate-translations
Hosting:  static/ISR pages per region → near-zero marginal cost at
          global scale; CDN edge caching worldwide
LLM:      Claude API for prose polish, translation drafts, and the
          follow-up Q&A chat ("what does this mean for my maize crop?"),
          always grounded in the structured facts payload
```

Scale logic: there are only ~1,000–5,000 distinct region briefings per month × languages — all pre-generated and cached. Serving a billion users is a CDN problem, not a compute problem.

---

## 9. Build plan with Claude Code

**Phase 1 — Global engine MVP (3–4 weeks)**
1. Scaffold app + Postgres/PostGIS; GeoNames place search.
2. Ingest ONI history; define region grid (start: 2°×2° cells + named regions for top 50 impact zones).
3. Compute analog composites from CHIRPS (precip) for all cells; validate against known history (Peru wet 1997–98, Indonesia dry, East Africa short-rains wet).
4. Curate the teleconnection table (~40 regions, sourced from WMO/IRI literature).
5. Briefing endpoint + UI in English; deterministic templates.
6. Wire Copernicus seasonal forecast for the live-outlook layer.

**Phase 2 — Multilingual + light (2–3 weeks)**
7. i18n framework; translate UI + templates into UN six via Claude, with native-speaker review passes.
8. Performance budget enforcement; no-JS fallback; offline caching.
9. Country met-service directory + deferral links.
10. Printable/radio one-pagers per region.

**Phase 3 — Channels & credibility**
11. WhatsApp bot prototype; shareable region cards.
12. Methodology page, open-source release, advisor recruitment.
13. Outreach: Red Cross Climate Centre, WMO Early Warnings for All team, UNDRR PreventionWeb, IRI, civic-tech networks. Ship a live demo link + one-page brief; agencies engage far more with working software than proposals.

---

## 10. Success metrics

- A briefing exists for any inhabited point on Earth, in <2s, in 6+ languages
- Every number traceable to an official international source
- Test users on 4+ continents report learning something actionable
- One NGO, national met service, school network, or community radio station adopts or redistributes briefings

## 11. Honest risks

| Risk | Mitigation |
|---|---|
| Seasonal forecasts are genuinely uncertain in many regions | Confidence labels everywhere; show when signals are weak; never overstate |
| Translation errors in low-resource languages | Native review before launch of each language; community correction channel |
| Being mistaken for an official warning service | Persistent deferral banner; naming/branding clearly independent |
| Institutional adoption is slow | Ship direct-to-users first; institutions follow traction, not pitches |
| Solo-builder scope creep | Phases are strict; Phase 1 alone is already a useful global product |

---

## Annex A — Global impact map & language coverage plan

### A.1 Impacted countries by region (strong El Niño composite)

| Region | Typical impact | Countries |
|---|---|---|
| South America (west coast) | Torrential rain, coastal flooding | Peru, Ecuador, Colombia (coast) |
| South America (north/east) | Drought, fire risk | Venezuela, Guyana, Suriname, northern Brazil, Colombia (interior) |
| South America (south) | Heavy rain, floods | southern Brazil, Argentina, Uruguay, Paraguay, Chile (central) |
| Andean | Mixed; glacier/water stress | Bolivia, Peru (highlands) |
| Central America "Dry Corridor" | Drought, crop failure | Guatemala, Honduras, El Salvador, Nicaragua, Costa Rica, Panama, southern Mexico |
| Caribbean | Drier; suppressed hurricanes | Cuba, Haiti, Dominican Republic, Jamaica |
| North America | Wet/stormy south, mild north | United States, Canada, northern Mexico |
| South Asia | Weakened monsoon, heat, water stress | India, Pakistan, Bangladesh, Sri Lanka, Nepal |
| Maritime Southeast Asia | Severe drought, fires, haze | Indonesia, Malaysia, Timor-Leste, Brunei, Singapore, Philippines (also typhoons) |
| Mainland Southeast Asia | Drought, Mekong low flow | Vietnam, Thailand, Cambodia, Laos, Myanmar |
| East Asia | Yangtze flooding, shifted typhoon tracks | China, Japan, South Korea, North Korea, Taiwan |
| Pacific Islands | Drought west, cyclone shifts east, sea-level swings | Papua New Guinea, Fiji, Vanuatu, Solomon Is., Samoa, Tonga, Kiribati, Tuvalu, Marshall Is., Micronesia, Palau |
| Oceania | Drought, heat, bushfire | Australia, New Zealand (drier north) |
| East Africa / Horn | Heavy "short rains," floods, disease risk | Kenya, Ethiopia, Somalia, Tanzania, Uganda, Rwanda, Burundi, South Sudan, Djibouti, Eritrea |
| Southern Africa | DJF drought, crop failure | South Africa, Zimbabwe, Zambia, Malawi, Mozambique, Botswana, Namibia, Angola, Lesotho, Eswatini, Madagascar |
| Sahel / West Africa | Weakened wet-season rains | Nigeria (north), Niger, Mali, Burkina Faso, Senegal, Chad, Sudan |
| Middle East | Wetter-leaning signal | Iran, Yemen, Arabian Peninsula (parts) |

Confidence varies by region; the teleconnection table (§5) carries per-region confidence ratings and the briefing engine must surface them.

### A.2 Impacted countries NOT effectively covered by the UN six languages

The UN six (EN, ES, FR, AR, ZH, RU) cover the Americas, China, Russia, North/West-African officialdom, and elites elsewhere — but "official language" ≠ "language people actually understand." Countries where none of the six reaches the general population:

| Country / area | Language(s) actually needed |
|---|---|
| Brazil, Mozambique, Angola, Timor-Leste | Portuguese |
| Indonesia | Bahasa Indonesia |
| India | Hindi (+ regional: Tamil, Telugu, Marathi, Bengali…) |
| Pakistan | Urdu |
| Bangladesh | Bengali |
| Nepal | Nepali |
| Sri Lanka | Sinhala, Tamil |
| Vietnam | Vietnamese |
| Thailand | Thai |
| Cambodia | Khmer |
| Laos | Lao |
| Myanmar | Burmese |
| Japan | Japanese |
| South Korea / North Korea | Korean |
| Iran | Persian (Farsi) |
| Ethiopia | Amharic (+ Oromo, Tigrinya) |
| Somalia / Djibouti | Somali |
| Eritrea | Tigrinya |
| Tanzania / East Africa lingua franca | Swahili |
| Madagascar | Malagasy |
| Haiti | Haitian Creole |
| Philippines | Filipino/Tagalog (+ Cebuano) |
| Papua New Guinea | Tok Pisin |
| Fiji | Fijian, Fiji Hindi |
| Samoa / Tonga / Kiribati / Tuvalu / Vanuatu | Samoan, Tongan, Gilbertese, Tuvaluan, Bislama |
| Northern Nigeria / Niger | Hausa |
| Mali | Bambara |
| Senegal | Wolof |

### A.3 Language rollout tiers

| Tier | Languages | Rationale |
|---|---|---|
| 1 (launch) | English, Spanish, French, Arabic, Chinese, Russian | UN six — institutional alignment + Americas/China coverage |
| 2 (fast follow) | Portuguese, Bahasa Indonesia, Hindi, Bengali, Swahili, Vietnamese, Filipino/Tagalog, Amharic, Burmese, Thai | Largest impacted populations per language |
| 3 (event-driven) | Urdu, Nepali, Sinhala, Tamil, Khmer, Lao, Japanese, Korean, Persian, Somali, Tigrinya, Malagasy, Haitian Creole, Tok Pisin, Hausa, Bambara, Wolof, Pacific languages | Prioritize dynamically by forecast severity (e.g., Horn-of-Africa flood signal → Somali jumps queue) |

**Implementation notes**
- Template-based architecture makes each new language ~200 strings + number/date formatting; LLM produces drafts, a native speaker reviews before launch (recruit via NGO/translator networks, e.g. Translators without Borders).
- Scripts to support beyond Latin/Cyrillic: Arabic (RTL), Devanagari, Bengali, Sinhala, Tamil, Thai, Khmer, Lao, Burmese, CJK, Ge'ez (Amharic/Tigrinya), Hangul.
- Radio one-pagers (§6) matter most exactly in Tier-2/3 regions — pair every new language with its 30-second read-aloud script.

---

## Annex B — Cognitive & neurodivergent-friendly UI standard

Design target: usable by people with ADHD, dyslexia, autism, anxiety, intellectual disabilities, low literacy — and by anyone under stress (disasters impair everyone's working memory). This is the app's primary design philosophy, not an accessibility add-on. Reference standard: W3C WCAG + COGA (Cognitive Accessibility) guidance.

### B.1 Core rules
1. **One thing per screen.** One question, one answer, or one action. Never a multi-widget dashboard.
2. **Answer first.** The verdict appears in the first line ("More rain than usual this winter → likely floods"), before any explanation. Details are collapsible below.
3. **Progressive disclosure.** Summary → "tell me more" → full detail. No screen shows more than ~3 chunks of information at once.
4. **One primary button per screen**, visually dominant, verb-labeled ("See my briefing", "Next step").
5. **Nothing moves unless asked.** No autoplay animation, parallax, carousels, or surprise popups. Global "reduce motion" honored and toggleable.
6. **Forgiving by default.** All state auto-saves; back always works; nothing is lost by leaving mid-flow; no timeouts.
7. **No dark patterns, no gamification pressure.** No streaks, badges, or guilt mechanics; no notification nagging (alerts are opt-in and strictly hazard-related).

### B.2 Reading & language
- Short sentences (≤ 15 words target). One idea per sentence. Bullet chunks of 3–5.
- Literal, concrete wording; no idioms or metaphors (also improves translatability).
- Left-aligned, never justified; line length ≤ ~65 characters; line height ≥ 1.5.
- Readable humanist sans-serif; no all-caps blocks; minimal italics.
- Every key concept paired with a consistent icon (☔ rain, 🌡 heat, ✅ prep step).
- **Easy Read mode:** ~5th-grade language, one sentence per line, larger icons — a first-class mode, one tap from settings, available in every language.
- **Read-aloud button** on every briefing (same text powers the radio scripts in §6).

### B.3 Checklists & tasks (ADHD-critical)
- Prep checklist shows **one step at a time** with a progress bar ("Step 2 of 6"), with a "show all steps" option.
- Each step: icon + one sentence + optional "why this matters" expander.
- Steps are checkable, persist locally, and can be done in any order.
- Time estimates on each step ("~10 minutes") to aid task initiation.

### B.4 Visual & sensory
- Calm, muted palette; alerts use color + icon + word (never color alone).
- Identical, predictable layout across all screens and languages (RTL mirrors logically).
- Generous white space and touch targets (≥ 44px).
- No sound by default, ever, except explicit read-aloud.
- Settings toggles: text size, high contrast, reduce motion, Easy Read, dyslexia-friendly spacing preset.

### B.5 Anxiety-safe severity design
- Severity communicated as calm fact + action, never drama: "Flood risk is higher than normal. Here are 3 things to do." No countdowns, sirens, red full-screen takeovers, or doom imagery.
- Every risk statement is immediately followed by an actionable step — information without agency fuels anxiety.
- A persistent "What should I do right now?" shortcut that always resolves to a short concrete list.

### B.6 Testing bar
- [ ] Task test: a first-time user finds their briefing and first prep step in under 60 seconds
- [ ] Include neurodivergent testers in every usability round (recruit via ADHD/autism community orgs)
- [ ] Screen-reader pass + keyboard-only pass per release
- [ ] Easy Read parity check for every language at launch
- [ ] "Stress test" review: would this screen make sense to someone panicking on a slow phone at night?

---

## Annex C — Build decisions, constraints & risk register
*Locked in with the builder, September 2026*

### C.1 Builder profile & decisions

| Decision | Choice |
|---|---|
| Builder | Solo, comfortable coding, 5–10 hrs/week |
| Budget | ≤ $25/month total (hosting + data + AI) |
| v1 coverage | Whole world |
| v1 languages | All ~36 (UN six + Tier 2 + Tier 3), AI-translated |
| Channels | Web app + user-initiated WhatsApp bot |
| Updates | Fully automatic monthly refresh |
| Pre-launch testing | Friends + online communities |
| 6-month priority | 1) Real users helped 2) NGO adoption 3) UN promotion 4) Portfolio |
| Launch target | Late Nov–Dec 2026 (before El Niño winter peak) |

### C.2 Architectural consequences (non-negotiable given the above)

1. **Template-first language system.** The LLM translates the sentence *templates* once per language (~200–400 strings). Monthly refreshes only fill numeric/severity slots. Consequences: 36 languages cost ~one-time API spend; monthly updates cost ≈ $0; translation errors are fixable once, permanently. Free-form LLM prose NEVER ships to production briefings.
2. **Machine-translation transparency.** Every AI-translated language shows a small banner in that language: "Machine-translated — tap to suggest a fix." Corrections flow to a GitHub issue/form. Languages graduate to "reviewed" status as native speakers verify them.
3. **Automation with a dead-man's switch.** Every ingestion job validates schema + sanity bounds (e.g., |precip anomaly| ≤ 300%). On any failure: keep serving last-good data, stamp "Updated as of <date>", email the maintainer. Nothing unvalidated ever auto-publishes.
4. **WhatsApp = reply-bot only in v1.** User texts a location → bot replies with the briefing. No proactive broadcasts (cost + spam risk). Meta Cloud API, user-initiated conversation window.
5. **Cost architecture for ≤ $25/month:** static/ISR pre-generated pages on a free-tier host + CDN; SQLite or free-tier Postgres; GitHub Actions (free) for all cron jobs; LLM spend reserved for (a) one-time template translation, (b) optional Q&A chat behind a soft rate limit that can be disabled entirely if costs creep.

### C.3 Revised phase plan (5–10 hrs/week)

| Phase | Weeks | Deliverable |
|---|---|---|
| 1. Global engine + English web | 6–8 | Any location → briefing; analog composites; teleconnection table; auto-ingestion with dead-man's switch |
| 2. Template i18n blitz | 2 | All 36 languages live with MT banners; RTL + script support; Easy Read parity |
| 3. WhatsApp bot | 2 | Location-in → briefing-out reply bot |
| 4. Hardening + testing | 2 | Friends + online community test round incl. neurodivergent testers (Annex B bar); fix cycle |
| Launch | ~Dec 2026 | Public launch + open-source repo flip |
| Post-launch | ongoing | Community translation review; NGO outreach with live product + usage numbers |

### C.4 Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Upstream format change breaks ingestion | High (eventually) | Dead-man's switch (C.2.3); prefer structured APIs (Copernicus) over scraped pages |
| MT error in low-resource language misleads users | Medium | Template-only text (errors are enumerable), MT banner, correction channel, prioritize native review for Tier 2 within 60 days of launch |
| LLM/API costs exceed budget | Medium | Template architecture; Q&A rate-limited + kill switch; cost alert at $15 |
| WhatsApp API approval friction | Medium | Start web-only if blocked; bot is Phase 3, not launch-critical |
| Solo-builder burnout / stall | Medium | Phases sized to 5–10 hrs/wk; each phase independently shippable; Phase 1 alone is a real product |
| Forecast misinterpretation blame | Low–Med | Probabilistic wording standard (§5), NWS/national-service deferral on every screen, clear ToS/disclaimer page |
| Launch slips past Dec peak | Medium | El Niño impacts run through ~April 2027; late launch still valuable; app generalizes to all future ENSO events |

### C.5 Definition of "robust & highest quality" (acceptance checklist)

- [ ] Any location on Earth returns a briefing in < 2s, in all 36 languages
- [ ] Zero free-form LLM text in production briefings
- [ ] Ingestion failure produces stale-but-labeled data, never wrong data
- [ ] Every number links to its official source
- [ ] Annex B cognitive-UI bar passes with real testers
- [ ] Total monthly cost ≤ $25 verified over one full update cycle
- [ ] Repo public, methodology page live, correction channel working

---

## Annex D — Global location system (gazetteer, boundaries, search)

**Goal:** any human on Earth can find their place — by typing, tapping, or texting — even misspelled, in their own language and script, down to village level, with a correct province/district label, and NO location ever returns "not found."

### D.1 Design principle: coordinates are truth, names are a courtesy
The briefing engine only truly needs a lat/lon → climate region mapping. Every name database on Earth has gaps, and the gaps cluster in exactly the remote regions this app serves most. Therefore: the gazetteer is a lookup layer on top of coordinates, never a gatekeeper. Ultimate fallback chain: named place → nearest known place ("near Wau, South Sudan") → map-pin/GPS → 2°×2° grid cell briefing. Every branch ends in a briefing.

### D.2 Data sources (all open)
| Layer | Source | License | Role |
|---|---|---|---|
| Place names (primary) | GeoNames full dump (allCountries + alternateNamesV2) | CC-BY 4.0 | ~12M places incl. villages, populations, admin codes, multilingual alternate names |
| Place names (enrichment) | OpenStreetMap places extract (place=city/town/village/hamlet + name:* tags) | ODbL | Fills rural gaps (esp. Africa, Asia, Pacific); freshest local names |
| Admin boundaries (primary) | OCHA COD-AB via HDX | Mostly CC-BY | The UN humanitarian system's own boundaries — aligns us with WFP/OCHA region naming |
| Admin boundaries (fallback) | geoBoundaries (ADM0–ADM2+) | CC-BY 4.0 | Coverage where COD-AB is missing/stale |
| Populated-place points (QA) | Natural Earth | Public domain | Sanity-check major cities |
| NOT USED | GADM | Redistribution-restricted | Incompatible with our open-source release |

### D.3 Build pipeline (one-time + quarterly refresh job build-gazetteer)
1. Ingest GeoNames: feature classes P and A; retain geonameid, name, ascii name, lat/lon, country, admin1–admin4 codes, population, feature code.
2. Ingest alternateNamesV2: all language-tagged names + transliterations; mark preferred and short flags.
3. Ingest OSM places extract (Geofabrik); keep name + every name:xx tag + place rank.
4. Merge & dedupe: match OSM↔GeoNames by name-similarity within 5 km; prefer GeoNames ID as canonical; unmatched OSM places get new internal IDs.
5. Attach admin hierarchy: point-in-polygon against COD-AB (fallback geoBoundaries); store admin1/admin2 display names from the boundary files.
6. Precompute per place: climate region/grid-cell ID, country met-service link, timezone.
7. Emit artifacts: gazetteer table; search index; compact per-country JSON for client-side use.
8. QA gates: row-count deltas vs last build ≤ ±10% per country (else alert, don't publish); spot-check list of 100 known villages across 20 countries must all resolve.

### D.4 Search behavior
Engine: self-hosted Photon or a Typesense/Meilisearch index over the merged gazetteer, chosen by benchmarking both against the same 200-query set. No paid geocoding APIs. Must handle typos/fuzzy match; any script; diacritics-insensitive; local endonyms; disambiguation by population + admin context. Result display always shows Village — District — Province — Country. GPS and a tap-a-map picker are equal first-class citizens (map lazy-loaded on demand). WhatsApp bot: same index via text, numbered-list disambiguation, accepts "village, country" and GPS pins.

*Build note (7 Sep 2026): Annex C (static, no server, ≤ $25/month) overrides the server-side engine here. Implemented as script-aware sharded static JSON with in-shard fuzzy matching; same behaviour, zero servers.*

### D.5 Sensitive-geography rules
Disputed territories: follow UN cartographic practice — dual naming where contested, never assert sovereignty; replicate OCHA's boundary disclaimers on the methodology page. Country/admin names render in the UI language where translations exist, otherwise official local name. Never log or store searched locations tied to any identifier; analytics limited to aggregate country-level counts.

### D.6 Storage & performance budget
Full merged gazetteer ≈ 2–4 GB raw → filtered production index ≈ 300–800 MB. Search < 150 ms; autocomplete after 2 characters; works over 2G. Client bundle unaffected; no-JS fallback accepts a plain text form field.

### D.7 Acceptance tests
- [ ] 50-village world test (PNG highlands, Sahel, Amazon, Pacific atolls, Himalayan valleys) → correct place and district/province label
- [ ] Script test: Arabic, Amharic, Burmese, Thai, Devanagari, Cyrillic, Chinese queries resolve
- [ ] Typo test: 20 misspelled queries resolve to intended place in top 3
- [ ] Ambiguity test: "San José", "Springfield", "Santa Cruz" produce clear disambiguation lists
- [ ] Nowhere test: mid-ocean pin and unnamed-settlement pin both return a grid-cell briefing
- [ ] Alignment test: admin names match OCHA COD-AB for 10 sampled countries

---

## Annex E — Extended datasets and the UN-quality bar
*Added 7 September 2026. Annexes B, C, D still override defaults. Do not refactor unrelated code.*

### E.A Extended dataset integration (one dataset at a time, each fully validated before the next)

**Tier 1 — static, high content value (build now)**
1. FAO/GIEWS crop calendars: planting/harvest windows per crop per country. A farmer-context sentence renders only when (a) the user selected a farming livelihood or a rural place, and (b) the forecast/historical anomaly window overlaps a crop window — e.g. "The drier-than-normal period overlaps the main maize planting season (Oct–Dec)." Graceful omission everywhere else.
2. IBTrACS cyclone history: per coastal region, cyclone frequency/intensity in strong El Niño vs neutral years. History sentence only for regions with meaningful cyclone climatology.
3. WorldPop: population per region cell, stored internally (never shown as "X million at risk"), used to prioritise translation review and QA ordering.
4. INFORM Risk Index: country vulnerability scores → internal prioritisation + one calm context line max.

**Tier 2 — live layers (after Tier 1, each with full Annex C dead-man's-switch validation)**
5. GloFAS river flood forecast signal per region (elevated / not elevated only).
6. NASA FIRMS active-fire counts per region (7-day rolling).
7. CAMS haze/smoke signal for Maritime Southeast Asia and Australia.
8. CAP official-warning feeds: 5 pilot countries with reliable public CAP endpoints; rendered as "Your national weather service has issued warnings — view [link]" chips; registry file country → CAP feed URL → parser status.
9. GDACS live alerts as linked reference chips.
10. ReliefWeb API: latest situation-report link per country as a reference chip.

Rules for all of Part A: every datum stored with source/version/timestamp provenance; every new sentence goes through the fixed-template system; live layers may only sharpen the calm action-first tone (elevated signal → one calm sentence + one action + official link; never sirens or red takeovers); each dataset gets validation bounds, a freshness threshold, fallback behaviour and a DATA_SOURCES.md entry; ground-truth checks where possible (IBTrACS composite must show the documented eastward typhoon-genesis shift in El Niño years).

### E.B UN-quality bar
1. Design system: tokenised (one type scale, one spacing scale, the Annex B calm palette) as the single source of styling; migrate ad-hoc styles; patterns adapted from the GOV.UK Design System (no copied assets); real empty/loading/error states for every screen; RTL and all launch scripts verified; print stylesheet for one-page regional briefings.
2. Governance pages: /methodology (auto-generated from provenance metadata), /privacy, /terms with disclaimer, /accessibility, /contact with corrections form, /about. Plain language; reviewed by the builder.
3. Editorial enforcement: STYLE.md (calm register, no exclamation marks, every fact sourced, probabilistic wording bands) plus CI checks: reading-level check on English templates, banned-word/punctuation lint, link checker for source URLs.
4. DPG readiness: DPG-CHECKLIST.md mapping Digital Public Goods Alliance criteria to evidence in the repo; gaps flagged.
5. Security basics: HTTPS-only, security.txt, dependency audit in CI, zero third-party trackers/fonts/CDNs that phone home.
6. Alignment doc: /alignment mapping the app to UN Early Warnings for All pillars and Sendai Target G, for review.

**Deliverables:** Tier 1 live in briefings with tests; Tier 2 scaffolded with GloFAS + CAP pilot working; design system migrated; governance pages drafted; CI editorial checks green; DATA_SOURCES.md, STYLE.md, DPG-CHECKLIST.md; GAPS.md listing decisions needed. Commit per dataset/feature. Farmer-context and cyclone-history sentence templates are approved by the builder before wiring.
