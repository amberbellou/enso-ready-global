import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildFacts, renderBriefing, renderRadio, renderSMS, parseSeason, seasonIndexFor, seasonTiming, cellIdFor, forecastPct, seasonYearMonths } from "../src/engine.js";

const J = (p) => JSON.parse(fs.readFileSync(new URL("../" + p, import.meta.url), "utf8"));
const composites = J("data/derived/composites.json");
const tele = J("data/curated/teleconnections.json");
const checklists = J("data/curated/prep_checklists.json");
const met = J("data/curated/met_services.json");
const status = J("data/derived/enso_status.json");
const strings = J("i18n/en.json");
const now = new Date("2026-09-07T00:00:00Z");
const facts = (lat, lon, cc, livelihood = "all") => buildFacts({ lat, lon, cc, status, composites, tele, checklists, met, livelihood, now });

test("season parsing", () => {
  assert.deepEqual(parseSeason("Oct-Dec"), [10, 11, 12]);
  assert.deepEqual(parseSeason("Dec-Mar"), [12, 1, 2, 3]);
  assert.equal(seasonIndexFor([10, 11, 12]), 10); // OND
  assert.equal(seasonIndexFor([12, 1, 2, 3]), 0);  // DJF (middle month Jan)
  assert.equal(seasonTiming([10, 11, 12], now).state, "coming");
  assert.equal(seasonTiming([6, 7, 8], now).state, "passed");
});
test("cell ids are stable and on-grid", () => {
  assert.equal(cellIdFor(-1.3, 36.8, composites.grid), "-001.0_+0037.0");
  assert.ok(composites.cells[cellIdFor(34.05, -118.24, composites.grid)]);
  // a point whose nearest cell is ocean, with land within 2 cells, snaps to a land cell
  const g = composites.grid; const W = g.lons.length; let found = 0;
  for (let i = 10; i < g.lats.length - 10 && found < 5; i++) for (let j = 2; j < W - 2 && found < 5; j++) {
    if (g.land[i * W + j] === "1") continue;
    const nearLand = [-1, 0, 1].some(di => [-1, 0, 1].some(dj => g.land[(i + di) * W + j + dj] === "1"));
    if (!nearLand) continue;
    const snapped = cellIdFor(g.lats[i], g.lons[j], g);
    assert.equal(composites.cells[snapped].on_land, true, `snap from ocean ${g.lats[i]},${g.lons[j]}`);
    assert.notEqual(snapped, cellIdFor(g.lats[i], g.lons[j], g, { preferLand: false }));
    found++;
  }
  assert.ok(found >= 5);
});
test("Nairobi farmer: wetter short rains, farmer steps, Kenya met service", () => {
  const f = facts(-1.29, 36.82, "KE", "farmer");
  assert.equal(f.region.id, "east-africa-short-rains");
  assert.match(f.signal.rain, /wetter/);
  assert.equal(f.signal.timing.state, "coming");
  assert.ok(f.history.composite_pct > 0);
  assert.ok(f.steps.some(s => s.for.includes("farmer")));
  assert.equal(f.met_service.name, "Kenya Meteorological Department");
  const b = renderBriefing(f, strings, { placeName: "Nairobi" });
  assert.match(b[0].text, /^Nairobi: (much )?more rain than usual is (likely|leaning that way|uncertain) in Oct–Dec 2026\.$/);
  assert.ok(renderRadio(f, strings, "Nairobi").split(" ").length < 110);
  assert.ok(renderSMS(f, strings, "Nairobi").length <= 160);
});
test("Jakarta: drier, high confidence", () => {
  const f = facts(-6.2, 106.8, "ID");
  assert.equal(f.region.id, "maritime-continent");
  assert.equal(f.confidence, "likely");
});
test("Piura coast beats generic South America box", () => {
  const f = facts(-5.19, -80.63, "PE");
  assert.equal(f.region.id, "peru-ecuador-coast");
});
test("forecast blending: agreeing forecast raises confidence, disagreeing lowers it", () => {
  const months = [{ ym: "2026-10", anomaly: 40, mean: 140 }, { ym: "2026-11", anomaly: 50, mean: 170 }, { ym: "2026-12", anomaly: 20, mean: 80 }];
  const r = forecastPct(months, ["2026-10", "2026-11", "2026-12"]);
  assert.equal(r.pct, Math.round(100 * 110 / 280));
  const desert = forecastPct([{ ym: "2026-10", anomaly: 60, mean: 66 }], ["2026-10"]);
  assert.equal(desert, null); // normal 6 mm: no percentage
  const huge = forecastPct([{ ym: "2026-10", anomaly: 200, mean: 220 }], ["2026-10"]);
  assert.equal(huge.pct, 300); assert.equal(huge.capped, true);
  assert.deepEqual(seasonYearMonths([10, 11, 12], { startYear: 2026, endYear: 2026 }), ["2026-10", "2026-11", "2026-12"]);
  const base = facts(-1.29, 36.82, "KE");
  const up = buildFacts({ lat: -1.29, lon: 36.82, cc: "KE", status, composites, tele, checklists, met, now, forecast: { months, source: "test", source_url: "x" } });
  assert.ok(up.forecast && up.forecast.pct > 0); assert.equal(up.forecast_agreement, "agree");
  const down = buildFacts({ lat: -1.29, lon: 36.82, cc: "KE", status, composites, tele, checklists, met, now, forecast: { months: months.map(m => ({ ...m, anomaly: -m.anomaly })), source: "test", source_url: "x" } });
  assert.equal(down.forecast_agreement, "disagree");
  const order = ["uncertain", "leaning", "likely"];
  assert.ok(order.indexOf(down.confidence) <= order.indexOf(base.confidence));
  const b = renderBriefing(up, strings, { placeName: "Nairobi" });
  assert.ok(b.some(x => x.type === "forecast" && /above normal/.test(x.text)));
});
test("country override adds local season name and extra hazard", () => {
  const country = J("data/curated/countries/KE.json");
  const f = buildFacts({ lat: -1.29, lon: 36.82, cc: "KE", status, composites, tele, checklists, met, country, now, livelihood: "farmer" });
  assert.equal(f.signal.local_season, "the short rains");
  assert.ok(f.signal.hazards.includes("RVF"));
  assert.match(renderBriefing(f, strings, { placeName: "Nairobi" })[0].text, /the short rains/);
});
test("too few events yields no local average, never a fake number", () => {
  const f = facts(80, 0, "GL"); // high Arctic cell
  if (f.history) assert.ok(f.history.too_few || f.history.n_events >= 3);
});
test("layer 2 skill bands: unknown skill never trusts the forecast over history; good skill does", () => {
  const bands = J("data/curated/wording_bands.json");
  const months = [{ ym: "2026-10", anomaly: -60, mean: 100 }, { ym: "2026-11", anomaly: -70, mean: 110 }, { ym: "2026-12", anomaly: -40, mean: 60 }]; // dry forecast vs wet pattern in Nairobi
  const base = { lat: -1.29, lon: 36.82, cc: "KE", status, composites, tele, checklists, met, now, bands, forecast: { months, source: "t", source_url: "x" } };
  const unknown = buildFacts({ ...base, skill: null });
  assert.equal(unknown.skill_class, "unknown"); assert.equal(unknown.forecast.disagreement, "trust_history");
  const good = buildFacts({ ...base, skill: { correlation: 0.7, roc: 0.8 } });
  assert.equal(good.skill_class, "good"); assert.equal(good.forecast.disagreement, "trust_forecast");
  const poor = buildFacts({ ...base, skill: { correlation: 0.1, roc: 0.5 } });
  assert.equal(poor.skill_class, "poor");
  const b = renderBriefing(good, strings, { placeName: "Nairobi" }).find(x => x.type === "forecast");
  assert.match(b.text, /trust the forecast this time/);
  assert.match(renderBriefing(unknown, strings, { placeName: "Nairobi" }).find(x => x.type === "forecast").text, /trust the pattern of past events/);
});
test("sample-size honesty: history sentence counts events", () => {
  const bands = J("data/curated/wording_bands.json");
  const f = buildFacts({ lat: -1.29, lon: 36.82, cc: "KE", status, composites, tele, checklists, met, now, bands });
  assert.ok(f.consistency && f.consistency.n >= 3 && f.consistency.k <= f.consistency.n);
  const hb = renderBriefing(f, strings, { placeName: "Nairobi" }).find(x => x.type === "history");
  assert.match(hb.text, /In (\d+) of the last (\d+) strong El Niño events|went both ways/);
});
test("layer 4 conditions render only when data exists for the cell", () => {
  const cellId = cellIdFor(-1.29, 36.82, composites.grid);
  const conditions = { recent_rain: { months: ["2026-06", "2026-07", "2026-08"], pct_of_normal: { [cellId]: 62 }, provenance: { name: "CHIRPS", url: "u" } }, usdm: { categories: {}, provenance: { name: "USDM", url: "v" } } };
  const withC = buildFacts({ lat: -1.29, lon: 36.82, cc: "KE", status, composites, tele, checklists, met, now, conditions, bands: J("data/curated/wording_bands.json") });
  assert.equal(withC.conditions.recent_rain_pct, 62); assert.equal(withC.conditions.usdm, null);
  const blk = renderBriefing(withC, strings, { placeName: "Nairobi" }).find(x => x.key === "conditions");
  assert.match(blk.text, /38% below normal/); assert.doesNotMatch(blk.text, /Drought Monitor/);
  const without = buildFacts({ lat: -1.29, lon: 36.82, cc: "KE", status, composites, tele, checklists, met, now, conditions: { recent_rain: { pct_of_normal: {} }, usdm: { categories: {} } } });
  assert.equal(without.conditions, null);
  assert.ok(!renderBriefing(without, strings, { placeName: "Nairobi" }).some(x => x.key === "conditions"));
  assert.ok(withC.provenance.some(p => p.layer === "conditions") && withC.provenance.some(p => p.layer === "history" && p.as_of));
});
test("Unlisted country falls back to WMO directory", () => {
  const f = facts(50.85, 4.35, "BE");
  assert.match(f.met_service.url, /wmo\.int/);
});
test("every number in the payload is finite or null", () => {
  const f = facts(28.6, 77.2, "IN");
  const walk = (o) => { for (const v of Object.values(o)) { if (typeof v === "number") assert.ok(Number.isFinite(v)); else if (v && typeof v === "object") walk(v); } };
  walk(f);
});
