// ENSO Ready Global — briefing engine (schema v2).
// Pure ES module: runs unchanged in Node (build time) and in the browser (client).
// Turns structured data into a *facts payload*; rendering fills fixed templates.
// No free-form prose is generated here. Every number has a source id.

export const SEASONS = ["DJF","JFM","FMA","MAM","AMJ","MJJ","JJA","JAS","ASO","SON","OND","NDJ"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MIN_EVENTS = 3;

// --- grid ----------------------------------------------------------------
export function fmtCell(lat, lon) {
  const s = (x, w) => (x < 0 ? "-" : "+") + Math.abs(x).toFixed(1).padStart(w, "0");
  return `${s(lat, 5)}_${s(lon, 6)}`;
}
function nearestIndex(arr, v) { let bi = 0, bd = 1e9; for (let i = 0; i < arr.length; i++) { const d = Math.abs(arr[i] - v); if (d < bd) { bd = d; bi = i; } } return bi; }
function haversine(lat1, lon1, lat2, lon2) {
  const r = Math.PI / 180, dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}
// Nearest cell; if it is an ocean cell and a land cell exists within 2 cells, prefer the nearest land cell
// (Open-Meteo "cell_selection=land" idea). Coastal towns must not inherit ocean rainfall statistics.
export function cellIdFor(lat, lon, grid, { preferLand = true } = {}) {
  const lats = grid.lats, lons = grid.lons;
  const lonN = ((lon + 180) % 360 + 360) % 360 - 180;
  const i0 = nearestIndex(lats, lat), j0 = nearestIndex(lons, lonN);
  const isLand = (i, j) => grid.land ? grid.land[i * lons.length + j] === "1" : true;
  if (!preferLand || !grid.land || isLand(i0, j0)) return fmtCell(lats[i0], lons[j0]);
  let best = null, bd = 1e9;
  for (let di = -2; di <= 2; di++) for (let dj = -2; dj <= 2; dj++) {
    const i = i0 + di, j = (j0 + dj + lons.length) % lons.length;
    if (i < 0 || i >= lats.length || !isLand(i, j)) continue;
    const d = haversine(lat, lonN, lats[i], lons[j]);
    if (d < bd) { bd = d; best = [i, j]; }
  }
  return best ? fmtCell(lats[best[0]], lons[best[1]]) : fmtCell(lats[i0], lons[j0]);
}

// --- teleconnection regions ------------------------------------------------
export function regionsFor(lat, lon, tele) {
  const out = [];
  for (const r of tele.regions) for (const [a, b, c, d] of r.boxes) if (lat >= a && lat <= b && lon >= c && lon <= d) { out.push(r); break; }
  return out.sort((x, y) => y.priority - x.priority);
}
export function parseSeason(s) {
  if (!s || /all year/i.test(s)) return MONTHS.map((_, i) => i + 1);
  const m = s.match(/([A-Z][a-z]{2})-([A-Z][a-z]{2})/); if (!m) return [];
  const a = MONTHS.indexOf(m[1]) + 1, b = MONTHS.indexOf(m[2]) + 1; const out = []; let x = a;
  for (let i = 0; i < 12; i++) { out.push(x); if (x === b) break; x = (x % 12) + 1; }
  return out;
}
export function seasonIndexFor(months) { if (!months.length) return null; const mid = months[Math.floor((months.length - 1) / 2)]; return (mid - 1 + 12) % 12; }
export function seasonTiming(months, now) {
  if (!months.length) return { state: "unknown" };
  const y = now.getUTCFullYear(), m = now.getUTCMonth() + 1;
  if (months.length === 12) return { state: "now", startYear: y, endYear: y };
  const first = months[0], nowIdx = y * 12 + m - 1;
  for (const sy of [y - 1, y, y + 1]) {
    const startIdx = sy * 12 + first - 1, endIdx = startIdx + months.length - 1;
    if (nowIdx >= startIdx && nowIdx <= endIdx) return { state: "now", startYear: sy, endYear: Math.floor(endIdx / 12) };
    if (startIdx > nowIdx && startIdx - nowIdx <= 6) return { state: "coming", startYear: sy, endYear: Math.floor(endIdx / 12), monthsAway: startIdx - nowIdx };
  }
  const sy = (first > m) ? y : y + 1;
  return { state: "passed", startYear: sy, endYear: Math.floor((sy * 12 + first - 1 + months.length - 1) / 12) };
}
// calendar months (as "YYYY-MM") covered by the impact season for a given timing
export function seasonYearMonths(months, timing) {
  if (!months.length || !timing.startYear) return [];
  let y = timing.startYear; const out = [];
  months.forEach((m, i) => { if (i > 0 && m < months[i - 1]) y += 1; out.push(`${y}-${String(m).padStart(2, "0")}`); });
  return out;
}

// --- confidence --------------------------------------------------------
export function confidenceWord(curated, agreement) {
  if (curated === "high") return agreement === "disagree" ? "leaning" : "likely";
  if (curated === "medium") return agreement === "agree" ? "leaning" : "uncertain";
  return "uncertain";
}
const STEP_DOWN = { likely: "leaning", leaning: "uncertain", uncertain: "uncertain" };
const STEP_UP = { uncertain: "leaning", leaning: "likely", likely: "likely" };
export function rainSign(rainWord) { if (/wetter/i.test(rainWord)) return 1; if (/drier/i.test(rainWord)) return -1; return 0; }
function agreementOf(pct, sign, std) {
  if (pct === null || pct === undefined || sign === 0) return "none";
  if (Math.abs(pct) <= 5 || (std && Math.abs(pct) < std / 2)) return "weak";
  return ((pct > 0) === (sign > 0)) ? "agree" : "disagree";
}

// --- forecast reduction (Open-Meteo / C3S monthly anomaly + mean, in mm) ---
// months: [{ym:"2026-10", anomaly, mean}]; wanted: ["2026-10","2026-11","2026-12"]
export function forecastPct(forecastMonths, wanted) {
  const rows = (forecastMonths || []).filter(r => wanted.includes(r.ym) && Number.isFinite(r.anomaly) && Number.isFinite(r.mean));
  if (!rows.length) return null;
  const anom = rows.reduce((s, r) => s + r.anomaly, 0), mean = rows.reduce((s, r) => s + r.mean, 0);
  const normal = mean - anom;
  if (normal < 10) return null;                     // desert-dry normals make percentages meaningless
  const raw = Math.round(100 * anom / normal);
  const monthly = rows.map(r => { const nrm = r.mean - r.anomaly; return { ym: r.ym, pct: nrm >= 5 ? Math.max(-100, Math.min(300, Math.round(100 * r.anomaly / nrm))) : null }; });
  return { pct: Math.max(-100, Math.min(300, raw)), capped: raw > 300, n_months: rows.length, of_months: wanted.length, normal_mm: Math.round(normal), anomaly_mm: Math.round(anom), monthly };
}

// --- facts payload -----------------------------------------------------
// --- layer 2: skill band -> wording rule (data/curated/wording_bands.json) ---
export function skillClass(skill, bands) {
  if (!skill || skill.correlation === undefined || skill.correlation === null) return "unknown";
  const sc = bands.skill_classes;
  if (skill.correlation >= sc.good.min_correlation && (skill.roc === undefined || skill.roc >= sc.good.min_roc)) return "good";
  if (skill.correlation >= sc.fair.min_correlation && (skill.roc === undefined || skill.roc >= sc.fair.min_roc)) return "fair";
  return "poor";
}
export function probabilityBand(pct, bands) {
  const pb = bands.probability_bands;
  if (pct === null || pct === undefined) return null;
  return pct >= pb.strong.min_pct ? "strong" : pct >= pb.moderate.min_pct ? "moderate" : "weak";
}
export function wordingRule(skill, band, bands) { return bands.rules.find(r => r.skill === skill && r.band === band) || null; }
// sample-size honesty: "in k of the last n strong El Niños"
export function consistency(h, bands) {
  if (!h || h.too_few) return null;
  const n = h.n_events, share = h.wetter_frac / 100;
  const sameDir = h.composite_pct >= 0 ? share : 1 - share;
  const k = Math.round(sameDir * n);
  const hc = bands.history_consistency;
  return { k, n, direction: h.composite_pct >= 0 ? "wetter" : "drier", cls: sameDir >= hc.consistent_min_share ? "consistent" : sameDir <= hc.mixed_max_share ? "mixed" : "leaning" };
}

// --- Tier 1: farmer context (FAO crop calendars) and cyclone history (IBTrACS) ---
const STAPLE_ORDER = ["maize", "rice", "wheat", "sorghum", "millet", "beans", "cassava", "potato", "groundnut", "soybean"];
function circularRun(months, anchor) { // contiguous run (wrapping Dec->Jan) of month numbers that contains anchor
  const set = new Set(months); if (!set.has(anchor)) return null;
  let a = anchor, b = anchor;
  while (set.has(((a - 2 + 12) % 12) + 1) && b - a < 11) a = ((a - 2 + 12) % 12) + 1;
  while (set.has((b % 12) + 1) && ((b % 12) + 1) !== a) b = (b % 12) + 1;
  const out = []; let m = a; for (let i = 0; i < 12; i++) { out.push(m); if (m === b) break; m = (m % 12) + 1; }
  return out;
}
export function farmerContext(cropCal, seasonMonths, rainSignValue) {
  if (!cropCal || !cropCal.crops || !seasonMonths.length || !rainSignValue) return null;
  const entries = Object.entries(cropCal.crops);
  const ranked = [...entries].sort((x, y) => { const ax = STAPLE_ORDER.indexOf(x[1].staple), ay = STAPLE_ORDER.indexOf(y[1].staple); return (ax < 0 ? 99 : ax) - (ay < 0 ? 99 : ay) || (y[1].zones || 0) - (x[1].zones || 0); });
  for (const stage of ["sowing", "harvest"]) {
    const hits = [];
    for (const [name, c] of ranked) {
      if (c.all_year) continue;
      const overlap = (c[stage] || []).find(m => seasonMonths.includes(m));
      if (overlap === undefined) continue;
      const crop = c.staple || name.toLowerCase();
      if (!hits.some(h => h.crop === crop)) hits.push({ crop, window: circularRun(c[stage], overlap) });
      if (hits.length === 3) break;
    }
    if (hits.length) return { crop: hits[0].crop, crops: hits.map(h => h.crop), stage: stage === "sowing" ? "planting" : "harvest", window: hits[0].window, direction: rainSignValue > 0 ? "wetter" : "drier" };
  }
  return null;
}
export function cycloneHistory(cell, lat, lon, meta) {
  if (!cell || !cell.neutral || cell.neutral[0] < 0.33) return null;   // meaningful climatology only
  const wnp = lon >= 100 && lon <= 180 && lat >= 0 && lat <= 35;
  return { en_rate: cell.el_nino[0], neutral_rate: cell.neutral[0], en_years: meta.enso_years.el_nino, neutral_years: meta.enso_years.neutral, wnp, period: meta.period || "1980-2025" };
}

export function buildFacts({ lat, lon, cc, status, composites, tele, checklists, met, country = null, forecast = null, conditions = null, skill = null, bands = null, cropCal = null, cyclones = null, livelihood = "all", rural = false, now = new Date() }) {
  const cellId = cellIdFor(lat, lon, composites.grid);
  const cell = composites.cells[cellId];
  const regions = regionsFor(lat, lon, tele);
  const region = regions[0] || null;
  const phase = status.phase;
  const key = phase === "el_nino" ? "en" : phase === "la_nina" ? "ln" : null;
  const phaseKey = key === "en" ? "el_nino" : "la_nina";
  const sig = region && key ? region[phaseKey] : null;

  let history = null, agreement = "none", seasonIdx = null, months = [], timing = { state: "unknown" }, fc = null, fcAgreement = "none";
  if (sig) {
    months = parseSeason(sig.season); seasonIdx = seasonIndexFor(months); timing = seasonTiming(months, now);
    const s = rainSign(sig.rain);
    if (cell && key && seasonIdx !== null) {
      const c = cell[key]; const n = c.n[seasonIdx];
      const events = composites.events[key === "en" ? "El Niño" : "La Niña"];
      const recent = c.recent[seasonIdx].map((v, i) => ({ label: events[events.length - 3 + i], pct: v })).filter(r => r.pct !== null);
      if (n >= MIN_EVENTS && c.pct[seasonIdx] !== null) {
        const all = (c.events && c.events[seasonIdx]) ? c.events[seasonIdx].map((v, i) => ({ label: events[i], pct: v })).filter(r => r.pct !== null) : [];
        history = { season: SEASONS[seasonIdx], composite_pct: c.pct[seasonIdx], wetter_frac: c.wetter_frac[seasonIdx], std: c.std[seasonIdx], n_events: n, recent, all,
                    src: cell.src, source: composites.sources[cell.src] };
        agreement = agreementOf(c.pct[seasonIdx], s, c.std[seasonIdx]);
      } else history = { too_few: true, n_events: n, recent, src: cell.src, source: composites.sources[cell.src] };
    }
    if (forecast && forecast.months) {
      const wanted = seasonYearMonths(months, timing);
      const r = forecastPct(forecast.months, wanted);
      if (r) { fc = { ...r, season_months: wanted, source: forecast.source, source_url: forecast.source_url, issued: forecast.issued, probability_pct: forecast.probability_pct ?? null }; fcAgreement = agreementOf(r.pct, s, null); }
    }
  }
  let confidence = sig ? confidenceWord(sig.confidence, agreement) : "uncertain";
  // layer 2: skill-aware forecast wording. Without a skill file every cell is "unknown": the forecast is shown but never trusted over history.
  let fcRule = null, skillCls = null;
  if (fc && bands) {
    skillCls = skillClass(skill, bands);
    const band = probabilityBand(fc.probability_pct !== null ? fc.probability_pct : (Math.abs(fc.pct) >= 25 ? 60 : Math.abs(fc.pct) >= 10 ? 45 : 0), bands);
    fcRule = wordingRule(skillCls, band, bands);
    if (fcRule) {
      if (fcAgreement === "disagree") {
        const d = bands.disagreement;
        fc.disagreement = d.trust_forecast_if_skill.includes(skillCls) ? "trust_forecast" : d.trust_history_if_skill.includes(skillCls) ? "trust_history" : "say_both";
        confidence = fc.disagreement === "trust_forecast" ? fcRule.confidence : STEP_DOWN[confidence];
      } else if (fcAgreement === "agree" && agreement !== "disagree") {
        confidence = fcRule.lean_on === "history" ? confidence : (skillCls === "good" ? STEP_UP[confidence] : confidence);
      } else if (fcRule.lean_on === "forecast" && agreement === "none") confidence = fcRule.confidence;
    }
  } else if (fc) { if (fcAgreement === "disagree") confidence = STEP_DOWN[confidence]; else if (fcAgreement === "agree" && agreement !== "disagree") confidence = STEP_UP[confidence]; }
  // layer 4: current conditions for this cell (weekly)
  let cond = null;
  if (conditions) {
    const rr = conditions.recent_rain && conditions.recent_rain.pct_of_normal ? conditions.recent_rain.pct_of_normal[cellId] : undefined;
    const dm = conditions.usdm && conditions.usdm.categories ? conditions.usdm.categories[cellId] : undefined;
    if (rr !== undefined || dm !== undefined) cond = { recent_rain_pct: rr ?? null, recent_months: conditions.recent_rain ? conditions.recent_rain.months : null, usdm: dm ?? null,
      sources: [conditions.recent_rain && rr !== undefined ? conditions.recent_rain.provenance : null, conditions.usdm && dm !== undefined ? conditions.usdm.provenance : null].filter(Boolean) };
  }

  // hazards: region defaults + country additions
  let hazards = sig ? [...sig.hazards] : [];
  if (country && country.hazards_add && country.hazards_add[phaseKey]) for (const h of country.hazards_add[phaseKey]) if (!hazards.includes(h)) hazards.push(h);
  const steps = []; const seen = new Set();
  const pick = (list) => { for (const st of list || []) { if (seen.has(st.id)) continue; if (!(st.for.includes("all") || st.for.includes(livelihood))) continue; seen.add(st.id); steps.push(st); } };
  for (const h of hazards) pick(checklists.hazards[h]);
  pick(checklists.always);

  const service = (met.services && met.services[cc]) || met.fallback;
  const farmer = (livelihood === "farmer" || rural) && sig ? farmerContext(cropCal, months, rainSign(sig.rain)) : null;
  const cyc = cyclones && cyclones.cells ? cycloneHistory(cyclones.cells[cellId], lat, lon, cyclones) : null;
  const localSeason = country && country.season_names && region ? country.season_names[region.id] || null : null;
  const sources = [];
  if (history) sources.push({ id: history.src, ...history.source });
  sources.push({ id: "oni", ...composites.sources.events });
  sources.push({ id: "cpc", label: status.source, url: status.source_url });
  if (sig) for (const k of region.sources || []) sources.push({ id: k, label: (tele._source_labels || {})[k] || k, url: tele._sources[k] });
  if (fc) sources.push({ id: "forecast", label: fc.source, url: fc.source_url });
  if (cond) for (const p of cond.sources) sources.push({ id: "conditions", label: p.name, url: p.url });
  // provenance chips: layer -> source, as-of date, url (spec: every fact traceable to dataset, version, retrieval date)
  const P = composites.provenance || {};
  const provenance = [];
  if (fc) provenance.push({ layer: "forecast", source: fc.source, as_of: fc.issued, url: fc.source_url, skill: skillCls });
  provenance.push({ layer: "status", source: status.source, as_of: status.issued, url: status.source_url });
  if (history && P[history.src]) provenance.push({ layer: "history", source: P[history.src].name, as_of: P[history.src].version, retrieved: P[history.src].retrieved_at, url: P[history.src].url });
  if (P.oni) provenance.push({ layer: "events", source: P.oni.name, as_of: P.oni.version, url: P.oni.url });
  if (cond) for (const p of cond.sources) provenance.push({ layer: "conditions", source: p.name, as_of: p.version, retrieved: p.retrieved_at, url: p.url });
  if (farmer && cropCal && cropCal.provenance) provenance.push({ layer: "crops", source: cropCal.provenance.name, as_of: cropCal.provenance.version, url: cropCal.provenance.url });
  if (cyc && cyclones.provenance) provenance.push({ layer: "cyclones", source: cyclones.provenance.name, as_of: cyclones.provenance.version, url: cyclones.provenance.url });
  return {
    generated_at: now.toISOString(),
    place: { lat, lon, cc, cell_id: cellId, on_land: cell ? cell.on_land : null },
    status: { phase, level: status.level, status_line: status.status, expected_strength: status.expected_strength, probability_pct: status.headline_probability_pct,
              issued: status.issued, synopsis: status.synopsis, source: status.source, source_url: status.source_url },
    region: region ? { id: region.id, name: region.name, confidence: sig ? sig.confidence : null } : null,
    signal: sig ? { rain: sig.rain, temp: sig.temp, season: sig.season, local_season: localSeason, months, timing, hazards, note: sig.note,
                    sources: (region.sources || []).map(k => ({ id: k, url: tele._sources[k] })) } : null,
    agreement, confidence, history, consistency: bands ? consistency(history, bands) : null, forecast: fc, forecast_rule: fcRule, skill_class: skillCls, conditions: cond,
    forecast_agreement: fcAgreement, provenance, farmer, cyclones: cyc,
    steps: steps.slice(0, 10), met_service: service, other_regions: regions.slice(1, 3).map(r => r.name), sources,
  };
}

// --- rendering -----------------------------------------------------------
export function fill(t, vars) { return t.replace(/\{(\w+)\}/g, (_, k) => (vars[k] === undefined || vars[k] === null) ? "" : String(vars[k])); }
function monthName(S, m) { return S.months[m - 1]; }
function seasonLabel(S, months, years) {
  if (!months.length) return "";
  if (months.length === 12) return S.all_year;
  const a = monthName(S, months[0]), b = monthName(S, months[months.length - 1]);
  const yr = years && years.startYear ? (years.startYear === years.endYear ? ` ${years.startYear}` : ` ${years.startYear}-${String(years.endYear).slice(2)}`) : "";
  return `${a}–${b}${yr}`;
}
function pctPhrase(S, pct) {
  if (pct === null || pct === undefined) return S.no_data;
  const a = Math.abs(Math.round(pct)); if (a < 5) return S.near_normal;
  return fill(pct > 0 ? S.pct_more_rain : S.pct_less_rain, { n: a });
}
function listJoin(S, items) { return items.length <= 1 ? items.join("") : items.slice(0, -1).join(S.list_sep || ", ") + (S.list_last || " and ") + items[items.length - 1]; }

export function renderBriefing(facts, strings, { placeName = null } = {}) {
  const S = strings; const name = placeName || S.this_area; const ph = facts.status.phase;
  const phaseName = ph === "el_nino" ? S.el_nino : ph === "la_nina" ? S.la_nina : S.neutral;
  const blocks = [];
  if (!facts.signal && ph !== "neutral" && S.headline_noregion) {
    blocks.push({ type: "headline", text: fill(S.headline_noregion, { name }) });
    blocks.push({ type: "para", key: "neutral", text: S.noregion_explain });
  } else if (!facts.signal || ph === "neutral") {
    blocks.push({ type: "headline", text: fill(S.headline_neutral, { name }) });
    blocks.push({ type: "para", key: "neutral", text: S.neutral_explain });
  } else {
    const Tplain = seasonLabel(S, facts.signal.months, facts.signal.timing); let T = Tplain;
    if (facts.signal.local_season) T = fill(S.season_with_local, { season: T, local: (S.local_seasons || {})[facts.signal.local_season] || facts.signal.local_season });
    const rainText = S["rain_" + facts.signal.rain.replace(/[^a-z]/g, "_")] || facts.signal.rain;
    blocks.push({ type: "headline", text: fill(S.headline, { name, rain: rainText, season: T, conf: S["conf_" + facts.confidence] }) });
    const hz = facts.signal.hazards.map(h => ((S.hazard_icons || {})[h] ? (S.hazard_icons[h] + " ") : "") + ((S.hazards || {})[h] || h)).filter(Boolean);
    if (hz.length) blocks.push({ type: "para", key: "risks", text: fill(S.risks, { list: listJoin(S, hz.slice(0, 4)) }) });
    const tm = facts.signal.timing;
    if (tm.state === "now") blocks.push({ type: "para", key: "timing", text: fill(S.timing_now, { season: Tplain }) });
    else if (tm.state === "coming") blocks.push({ type: "para", key: "timing", text: fill(tm.monthsAway <= 1 ? S.timing_coming_one : S.timing_coming, { season: Tplain, n: tm.monthsAway }) });
    else if (tm.state === "passed") blocks.push({ type: "para", key: "timing", text: fill(S.timing_passed, { season: Tplain }) });
    if (facts.forecast) {
      const f = facts.forecast;
      const pctText = f.capped ? fill(S.pct_more_rain_cap, { n: 300 }) : pctPhrase(S, f.pct);
      let text = fill(S.forecast_says, { season: seasonLabel(S, facts.signal.months), pct: pctText });
      if (f.disagreement) text += " " + (S["disagreement_" + f.disagreement] || "");
      else text += " " + (S["forecast_" + facts.forecast_agreement] || "");
      if (facts.forecast_rule && S[facts.forecast_rule.template]) text += " " + S[facts.forecast_rule.template];
      if (f.monthly && f.monthly.length > 1 && S.forecast_monthly) blocks.push({ type: "para", key: "forecast_monthly", text: fill(S.forecast_monthly, { list: f.monthly.map(m => `${S.months[parseInt(m.ym.slice(5), 10) - 1]} ${m.pct === null ? S.no_data : (m.pct > 0 ? "+" : "") + m.pct + "%"}`).join(", ") }) });
      blocks.push({ type: "forecast", key: "forecast", text, partial: f.n_months < f.of_months ? fill(S.forecast_partial, { n: f.n_months, of: f.of_months }) : null, source: { id: "forecast", label: f.source, url: f.source_url } });
    }
    if (facts.farmer && S.farmer_planting) {
      const f = facts.farmer; const win = seasonLabel(S, f.window);
      const cropNames = listJoin(S, (f.crops || [f.crop]).map(c => (S.crops || {})[c] || c));
      blocks.push({ type: "para", key: "farmer", text: fill(f.stage === "planting" ? S.farmer_planting : S.farmer_harvest, { dir: f.direction === "wetter" ? S.dir_wetter : S.dir_drier, season: seasonLabel(S, facts.signal.months), crop: cropNames, window: win }) });
    }
    if (facts.cyclones && S.cyclone_history) {
      const c = facts.cyclones;
      let text = fill(S.cyclone_history, { n_en: c.en_rate.toFixed(1), n_neutral: c.neutral_rate.toFixed(1), years: c.period });
      if (c.wnp && S.cyclone_wnp) text += " " + S.cyclone_wnp;
      blocks.push({ type: "para", key: "cyclones", text });
    }
    if (facts.conditions) {
      const c = facts.conditions; const parts = [];
      if (c.recent_rain_pct !== null) parts.push(fill(S.conditions_rain, { pct: pctPhrase(S, c.recent_rain_pct - 100) }));
      if (c.usdm !== null && S.usdm_levels) parts.push(fill(S.conditions_usdm, { level: S.usdm_levels[c.usdm] }));
      if (parts.length) blocks.push({ type: "para", key: "conditions", text: parts.join(" "), source: c.sources[0] ? { id: "conditions", url: c.sources[0].url } : null });
    }
    const R = (S.regions || {})[facts.region.id] || {};
    blocks.push({ type: "para", key: "expect", text: fill(S.expect, { phase: phaseName, region: R.name || facts.region.name, rain: rainText, temp: S["temp_" + facts.signal.temp.replace(/[^a-z]/g, "_")] || facts.signal.temp }) });
    blocks.push({ type: "para", key: "note", text: (ph === "el_nino" ? R.el_nino_note : R.la_nina_note) || facts.signal.note, source: facts.signal.sources[0] });
    blocks.push({ type: "para", key: "confidence", text: fill(S["agreement_" + facts.agreement] || S.agreement_none, { conf: S["conf_" + facts.confidence] }) });
    if (facts.history && !facts.history.too_few) {
      const h = facts.history; const recent = h.recent.map(r => `${r.label}: ${pctPhrase(S, r.pct)}`).join("; ");
      const cs = facts.consistency;
      const lead = cs && S.history_count ? fill(cs.cls === "mixed" ? S.history_mixed : S.history_count, { k: cs.k, n: cs.n, phase: phaseName, season: seasonLabel(S, facts.signal.months), dir: cs.direction === "wetter" ? S.dir_heavier : S.dir_lighter }) + " " : "";
      blocks.push({ type: "history", key: "history", text: lead + fill(S.history, { season: seasonLabel(S, facts.signal.months), n: h.n_events, phase: phaseName, pct: pctPhrase(S, h.composite_pct), wet: Math.round(h.wetter_frac) }),
                    recent: fill(S.history_recent, { recent }), all: h.all && h.all.length > 3 && S.history_all ? fill(S.history_all, { phase: phaseName, list: h.all.map(r => `${r.label} ${r.pct > 0 ? "+" : ""}${r.pct}%`).join(", ") }) : null, source: { id: h.src, url: h.source.url, label: h.source.label } });
    } else if (facts.history && facts.history.too_few) blocks.push({ type: "para", key: "history", text: S.history_few });
  }
  blocks.push({ type: "status", key: "status", text: fill(S.status_line, { status: facts.status.status_line, issued: facts.status.issued }), synopsis: facts.status.synopsis, source: { url: facts.status.source_url, label: facts.status.source } });
  blocks.push({ type: "steps", key: "steps", title: S.steps_title, steps: facts.steps.map(st => ({ id: st.id, icon: st.icon, text: (S.steps && S.steps[st.id]) ? S.steps[st.id].text : st.text, why: (S.steps && S.steps[st.id]) ? S.steps[st.id].why : st.why, minutes: st.minutes })) });
  blocks.push({ type: "defer", key: "defer", text: fill(S.defer, { service: facts.met_service.name }), url: facts.met_service.url });
  blocks.push({ type: "sources", key: "sources", title: S.ui ? S.ui.sources : "Sources", items: facts.sources });
  if (facts.provenance && facts.provenance.length) blocks.push({ type: "provenance", key: "provenance", items: facts.provenance.map(p => ({ ...p, label: fill(S.prov_chip || "{layer}: {source}, {as_of}", { layer: (S.layers || {})[p.layer] || p.layer, source: p.source, as_of: p.as_of || "" }) })) });
  return blocks;
}
export function renderRadio(facts, strings, placeName) {
  const b = renderBriefing(facts, strings, { placeName });
  const get = (k) => (b.find(x => x.key === k || x.type === k) || {}).text || "";
  const steps = b.find(x => x.type === "steps").steps.slice(0, 2).map(s => s.text).join(" ");
  return [get("headline"), get("risks"), get("timing"), steps, get("defer")].filter(Boolean).join(" ");
}
export function renderSMS(facts, strings, placeName) {
  const b = renderBriefing(facts, strings, { placeName });
  const head = b.find(x => x.type === "headline").text; const step = b.find(x => x.type === "steps").steps[0];
  const s = `${head} ${step ? step.text : ""}`.trim();
  return s.length <= 160 ? s : s.slice(0, 157) + "...";
}
