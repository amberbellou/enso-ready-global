import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildFacts, renderBriefing, renderRadio, renderSMS, parseSeason, seasonIndexFor, seasonTiming, cellIdFor } from "../src/engine.js";

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
  assert.equal(cellIdFor(-1.3, 36.8, composites.grid), "-01.25_+036.25");
  assert.ok(composites.cells[cellIdFor(34.05, -118.24, composites.grid)]);
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
test("Unlisted country falls back to WMO directory", () => {
  const f = facts(50.85, 4.35, "BE");
  assert.match(f.met_service.url, /wmo\.int/);
});
test("every number in the payload is finite or null", () => {
  const f = facts(28.6, 77.2, "IN");
  const walk = (o) => { for (const v of Object.values(o)) { if (typeof v === "number") assert.ok(Number.isFinite(v)); else if (v && typeof v === "object") walk(v); } };
  walk(f);
});
