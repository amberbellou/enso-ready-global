# ENSO Ready Global — Product Spec & Build Plan (summary)

The full spec was written September 2026. Key points, kept here so the repo is self-describing.

## Vision
El Niño and La Niña are the biggest recurring driver of floods, droughts, failed harvests and disease outbreaks worldwide, yet the forecasts live in technical bulletins. ENSO Ready Global translates official international climate data into a personalized, plain-language seasonal briefing and preparation plan for any location on Earth, in the user's own language. It is the citizen-facing layer of anticipatory action, aligned with the UN "Early Warnings for All" initiative.

## Core flow
1. Landing: global ENSO status banner + location entry (search or device location).
2. Optional on-device personalization: farmer / coastal / urban.
3. Briefing: headline verdict first; what to expect; when (aligned to local seasons); historical analogs; prep checklist one step at a time.
4. Monthly refresh from official outlooks.
5. Persistent deferral to the national meteorological service.

## Data sources
WMO updates, IRI/CPC plume, Copernicus C3S seasonal forecasts (planned), NOAA CPC ONI, GPCP / CHIRPS rainfall, ERA5 (planned), RCOFs, WMO met-service registry, GeoNames.

## Language rules
- Numbers and probabilities come only from the deterministic pipeline. The LLM only translates templates; it never generates facts.
- Confidence is always stated in words calibrated to probability bands.
- Reading level ~8th grade; native-speaker review per launch language.
- Languages: UN six first; then Portuguese, Bahasa Indonesia, Hindi, Bengali, Swahili, Vietnamese, Filipino, Amharic, Burmese, Thai; then event-driven Tier 3 (~36 total), all with machine-translation banners until reviewed.

## Access & equity (non-negotiable)
Ultra-light (first load < 500 KB, 2G/3G), no-JS fallback for the core briefing, offline last-briefing cache, no accounts or tracking, WCAG 2.1 AA, RTL, radio-ready 30-second script and SMS version per briefing, printable one-pagers.

## Cognitive & neurodivergent-friendly UI standard (Annex B)
One thing per screen; answer first; progressive disclosure; one primary button; nothing moves unless asked; forgiving by default; no dark patterns. Short literal sentences, consistent icons, Easy Read mode, read-aloud. Checklist one step at a time with progress and time estimates. Calm palette, alerts never by color alone, touch targets ≥ 44 px. Anxiety-safe severity: every risk statement is followed by an action.

## Build decisions (Annex C)
Solo builder, 5–10 hrs/week, ≤ $25/month, whole world at v1, template-first i18n, dead-man's switch on every ingestion job, WhatsApp reply-bot only, static pre-generated pages on a free-tier host, GitHub Actions for cron. Launch target late Nov–Dec 2026, before the El Niño winter peak.

## Acceptance checklist
- [ ] Any location on Earth returns a briefing in < 2 s, in all launch languages
- [ ] Zero free-form LLM text in production briefings
- [ ] Ingestion failure produces stale-but-labeled data, never wrong data
- [ ] Every number links to its official source
- [ ] Annex B cognitive-UI bar passes with real testers
- [ ] Total monthly cost ≤ $25 verified over one full update cycle
- [ ] Repo public, methodology page live, correction channel working
