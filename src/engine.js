// ENSO Ready Global — briefing engine.
// Pure ES module: runs unchanged in Node (build time) and in the browser (client).
// Turns structured data into a *facts payload*; rendering fills fixed templates.
// No free-form prose is generated here. Every number has a source id.

export const SEASONS = ["DJF","JFM","FMA","MAM","AMJ","MJJ","JJA","JAS","ASO","SON","OND","NDJ"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// --- grid ----------------------------------------------------------------
export function cellIdFor(lat, lon, grid) {
  const lats = grid.lats, lons = grid.lons;
  let bi = 0, bd = 1e9;
  for (let i = 0; i < lats.length; i++) { const d = Math.abs(lats[i] - lat); if (d < bd) { bd = d; bi = i; } }
  const lon360 = ((lon % 360) + 360) % 360;
  let bj = 0; bd = 1e9;
  for (let j = 0; j < lons.length; j++) { let d = Math.abs(lons[j] - lon360); d = Math.min(d, 360 - d); if (d < bd) { bd = d; bj = j; } }
  return fmtCell(lats[bi], lons[bj]);
}
export function fmtCell(lat, lon) {
  const l = lon >= 180 ? lon - 360 : lon;
  const s = (x, w) => { const t = Math.abs(x).toFixed(2).padStart(w - 1, "0"); return (x < 0 ? "-" : "+") + t; };
  return `${s(lat, 6)}_${s(l, 7)}`;
}

// --- teleconnection regions ------------------------------------------------
export function regionsFor(lat, lon, tele) {
  const out = [];
  for (const r of tele.regions) {
    for (const [a, b, c, d] of r.boxes) {
      if (lat >= a && lat <= b && lon >= c && lon <= d) { out.push(r); break; }
    }
  }
  return out.sort((x, y) => y.priority - x.priority);
}

// "Oct-Dec" -> [10,11,12]; "Dec-Mar" -> [12,1,2,3]; "all year" -> 1..12
export function parseSeason(s) {
  if (!s || /all year/i.test(s)) return MONTHS.map((_, i) => i + 1);
  const m = s.match(/([A-Z][a-z]{2})-([A-Z][a-z]{2})/);
  if (!m) return [];
  const a = MONTHS.indexOf(m[1]) + 1, b = MONTHS.indexOf(m[2]) + 1;
  const out = []; let x = a;
  for (let i = 0; i < 12; i++) { out.push(x); if (x === b) break; x = (x % 12) + 1; }
  return out;
}
export function seasonIndexFor(months) {
  if (!months.length) return null;
  const mid = months[Math.floor((months.length - 1) / 2)]; // middle month (1-12)
  return (mid - 1 + 12) % 12; // season k has middle month k+1
}
// Where does the impact season sit relative to "now"? Returns {state, startYear}
export function seasonTiming(months, now) {
  if (!months.length) return { state: "unknown" };
  const y = now.getUTCFullYear(), m = now.getUTCMonth() + 1;
  if (months.length === 12) return { state: "now", startYear: y, endYear: y };
  const first = months[0], last = months[months.length - 1];
  // candidate start years: this year and next
  for (const sy of [y - 1, y, y + 1]) {
    const startIdx = sy * 12 + first - 1;
    const endIdx = startIdx + months.length - 1;
    const nowIdx = y * 12 + m - 1;
    if (nowIdx >= startIdx && nowIdx <= endIdx) return { state: "now", startYear: sy, endYear: Math.floor(endIdx / 12) };
    if (startIdx > nowIdx && startIdx - nowIdx <= 6) return { state: "coming", startYear: sy, endYear: Math.floor(endIdx / 12), monthsAway: startIdx - nowIdx };
  }
  // otherwise it passed recently; next occurrence
  const sy = (first > m) ? y : y + 1;
  return { state: "passed", startYear: sy, endYear: Math.floor((sy * 12 + first - 1 + months.length - 1) / 12) };
}

// --- confidence --------------------------------------------------------
// Curated confidence + local-history agreement -> a probability word.
export function confidenceWord(curated, agreement) {
  if (curated === "high") return agreement === "disagree" ? "leaning" : "likely";
  if (curated === "medium") return agreement === "agree" ? "leaning" : "uncertain";
  return "uncertain";
}
export function rainSign(rainWord) {
  if (/wetter/i.test(rainWord)) return 1;
  if (/drier/i.test(rainWord)) return -1;
  return 0;
}

// --- facts payload -----------------------------------------------------
export function buildFacts({ lat, lon, cc, status, composites, tele, checklists, met, livelihood = "all", now = new Date() }) {
  const cellId = cellIdFor(lat, lon, composites.grid);
  const cell = composites.cells[cellId];
  const regions = regionsFor(lat, lon, tele);
  const region = regions[0] || null;
  const phase = status.phase; // el_nino | la_nina | neutral
  const key = phase === "el_nino" ? "en" : phase === "la_nina" ? "ln" : null;
  const sig = region && key ? region[key === "en" ? "el_nino" : "la_nina"] : null;

  let history = null, agreement = "none", seasonIdx = null, months = [], timing = { state: "unknown" };
  if (sig) {
    months = parseSeason(sig.season);
    seasonIdx = seasonIndexFor(months);
    timing = seasonTiming(months, now);
    if (cell && key && seasonIdx !== null) {
      const c = cell[key];
      const pct = c.pct[seasonIdx], wf = c.wetter_frac[seasonIdx];
      const events = composites.events[key === "en" ? "El Niño" : "La Niña"];
      const recent = c.recent[seasonIdx].map((v, i) => ({ label: events[events.length - 3 + i], pct: v })).filter(r => r.pct !== null);
      history = { season: SEASONS[seasonIdx], composite_pct: pct, wetter_frac: wf, n_events: events.length, recent,
                  clim_mm_month: cell.clim_mm_month, source: composites.source, source_url: composites.source_url };
      const s = rainSign(sig.rain);
      if (pct === null || s === 0) agreement = "none";
      else if ((pct > 5 && s > 0) || (pct < -5 && s < 0)) agreement = "agree";
      else if (Math.abs(pct) <= 5) agreement = "weak";
      else agreement = "disagree";
    }
  }
  const confidence = sig ? confidenceWord(sig.confidence, agreement) : "uncertain";

  // prep steps
  const steps = [];
  const seen = new Set();
  const pick = (list) => { for (const st of list || []) {
    if (seen.has(st.id)) continue;
    if (!(st.for.includes("all") || st.for.includes(livelihood))) continue;
    seen.add(st.id); steps.push(st);
  } };
  if (sig) for (const h of sig.hazards) pick(checklists.hazards[h]);
  pick(checklists.always);

  const service = (met.services && met.services[cc]) || met.fallback;
  return {
    generated_at: now.toISOString(),
    place: { lat, lon, cc, cell_id: cellId },
    status: { phase, level: status.level, status_line: status.status, expected_strength: status.expected_strength,
              probability_pct: status.headline_probability_pct, issued: status.issued, synopsis: status.synopsis,
              source: status.source, source_url: status.source_url },
    region: region ? { id: region.id, name: region.name, confidence: sig ? sig.confidence : null } : null,
    signal: sig ? { rain: sig.rain, temp: sig.temp, season: sig.season, months, timing, hazards: sig.hazards, note: sig.note,
                    sources: (region.sources || []).map(k => ({ id: k, url: tele._sources[k] })) } : null,
    agreement, confidence, history,
    steps: steps.slice(0, 10),
    met_service: service,
    other_regions: regions.slice(1, 3).map(r => r.name),
  };
}

// --- rendering -----------------------------------------------------------
export function fill(t, vars) { return t.replace(/\{(\w+)\}/g, (_, k) => (vars[k] === undefined || vars[k] === null) ? "" : String(vars[k])); }

function monthName(strings, m) { return strings.months[m - 1]; }
function seasonLabel(strings, months, years) {
  if (!months.length) return "";
  if (months.length === 12) return strings.all_year;
  const a = monthName(strings, months[0]), b = monthName(strings, months[months.length - 1]);
  const yr = years ? (years.startYear === years.endYear ? ` ${years.startYear}` : ` ${years.startYear}-${String(years.endYear).slice(2)}`) : "";
  return `${a}–${b}${yr}`;
}
function pctPhrase(strings, pct) {
  if (pct === null || pct === undefined) return strings.no_data;
  const a = Math.abs(Math.round(pct));
  if (a < 5) return strings.near_normal;
  return fill(pct > 0 ? strings.pct_above : strings.pct_below, { n: a });
}

// Produces the briefing as an ordered list of blocks: {type, key, text, ...}
export function renderBriefing(facts, strings, { placeName = null, easyRead = false } = {}) {
  const S = strings;
  const name = placeName || S.this_area;
  const ph = facts.status.phase;
  const phaseName = ph === "el_nino" ? S.el_nino : ph === "la_nina" ? S.la_nina : S.neutral;
  const blocks = [];
  const T = facts.signal ? seasonLabel(S, facts.signal.months, facts.signal.timing) : "";

  if (!facts.signal || ph === "neutral") {
    blocks.push({ type: "headline", text: fill(S.headline_neutral, { name }) });
    blocks.push({ type: "para", text: S.neutral_explain });
  } else {
    const rainKey = "rain_" + facts.signal.rain.replace(/[^a-z]/g, "_");
    const rainText = S[rainKey] || facts.signal.rain;
    const conf = S["conf_" + facts.confidence];
    blocks.push({ type: "headline", text: fill(S.headline, { name, rain: rainText, season: T, conf }) });
    // timing sentence
    const tm = facts.signal.timing;
    if (tm.state === "now") blocks.push({ type: "para", key: "timing", text: fill(S.timing_now, { season: T }) });
    else if (tm.state === "coming") blocks.push({ type: "para", key: "timing", text: fill(tm.monthsAway <= 1 ? S.timing_coming_one : S.timing_coming, { season: T, n: tm.monthsAway }) });
    else if (tm.state === "passed") blocks.push({ type: "para", key: "timing", text: fill(S.timing_passed, { season: T }) });
    // what to expect
    const tempKey = "temp_" + facts.signal.temp.replace(/[^a-z]/g, "_");
    blocks.push({ type: "para", key: "expect", text: fill(S.expect, { phase: phaseName, region: facts.region.name, rain: rainText, temp: S[tempKey] || facts.signal.temp }) });
    blocks.push({ type: "para", key: "note", text: facts.signal.note, source: facts.signal.sources[0] });
    // confidence explanation
    blocks.push({ type: "para", key: "confidence", text: fill(S["agreement_" + facts.agreement] || S.agreement_none, { conf: S["conf_" + facts.confidence] }) });
    // history
    if (facts.history) {
      const h = facts.history;
      const recent = h.recent.map(r => `${r.label}: ${pctPhrase(S, r.pct)}`).join("; ");
      blocks.push({ type: "history", key: "history", text: fill(S.history, { season: seasonLabel(S, facts.signal.months), n: h.n_events, phase: phaseName, pct: pctPhrase(S, h.composite_pct), wet: Math.round(h.wetter_frac) }), recent: fill(S.history_recent, { recent }), source: { id: "gpcp", url: h.source_url, label: h.source } });
    }
  }
  // status
  blocks.push({ type: "status", key: "status", text: fill(S.status_line, { status: facts.status.status_line, issued: facts.status.issued }), synopsis: facts.status.synopsis, source: { url: facts.status.source_url, label: facts.status.source } });
  // steps
  blocks.push({ type: "steps", key: "steps", title: S.steps_title, steps: facts.steps.map(st => ({ id: st.id, icon: st.icon, text: st.text, why: st.why, minutes: st.minutes })) });
  // defer
  blocks.push({ type: "defer", key: "defer", text: fill(S.defer, { service: facts.met_service.name }), url: facts.met_service.url });
  return blocks;
}

// 30-second radio script (~70 words) and a 160-char SMS, from the same facts.
export function renderRadio(facts, strings, placeName) {
  const b = renderBriefing(facts, strings, { placeName });
  const head = b.find(x => x.type === "headline").text;
  const timing = (b.find(x => x.key === "timing") || {}).text || "";
  const steps = b.find(x => x.type === "steps").steps.slice(0, 2).map(s => s.text).join(" ");
  const defer = b.find(x => x.type === "defer").text;
  return [head, timing, steps, defer].filter(Boolean).join(" ");
}
export function renderSMS(facts, strings, placeName) {
  const b = renderBriefing(facts, strings, { placeName });
  const head = b.find(x => x.type === "headline").text;
  const step = b.find(x => x.type === "steps").steps[0];
  const s = `${head} ${step ? step.text : ""}`.trim();
  return s.length <= 160 ? s : s.slice(0, 157) + "...";
}
