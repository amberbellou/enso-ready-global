// Freshness monitor (spec: alert if any live source is >45 days stale). Exit 3 when stale so CI can open an issue.
// Reads data/derived/*.json provenance, writes site/data/freshness.json for the client "last updated" warnings.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = fileURLToPath(new URL("../", import.meta.url));
const bands = JSON.parse(fs.readFileSync(path.join(ROOT, "data/curated/wording_bands.json"), "utf8")).freshness_days;
const now = process.env.FRESHNESS_NOW ? new Date(process.env.FRESHNESS_NOW) : new Date();
const days = (d) => d ? Math.round((now - new Date(d)) / 86400000) : null;
const J = (p) => fs.existsSync(path.join(ROOT, p)) ? JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8")) : null;
const report = [];
const status = J("data/derived/enso_status.json");
report.push({ layer: "status", source: status?.source, as_of: status?.fetched_at, issued: status?.issued, age_days: days(status?.fetched_at), max_days: bands.status });
const c3s = J("data/derived/c3s_forecast.json");
report.push({ layer: "forecast", source: c3s?.source || "Copernicus C3S (pending credentials)", as_of: c3s?.issued || null, age_days: days(c3s?.issued), max_days: bands.forecast, missing: !c3s });
const cond = J("data/derived/conditions.json");
report.push({ layer: "conditions", source: cond?.recent_rain?.provenance?.name, as_of: cond?.fetched_at, age_days: days(cond?.fetched_at), max_days: bands.conditions, missing: !cond });
const comp = J("data/derived/composites.json");
report.push({ layer: "composites", source: comp?.provenance?.chirps?.name, as_of: comp?.provenance?.computed_at, age_days: days(comp?.provenance?.computed_at), max_days: bands.composites, missing: !comp });
for (const r of report) r.stale = r.missing ? null : (r.age_days === null || r.age_days > r.max_days);
const out = { checked_at: now.toISOString(), layers: report };
fs.mkdirSync(path.join(ROOT, "site/data"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "site/data/freshness.json"), JSON.stringify(out, null, 1));
const stale = report.filter(r => r.stale), missing = report.filter(r => r.missing);
for (const r of report) console.log(`${r.stale ? "STALE  " : r.missing ? "MISSING" : "ok     "} ${r.layer.padEnd(11)} ${r.as_of || "-"} (${r.age_days ?? "-"} d, max ${r.max_days})`);
if (stale.length) { console.error("::warning::stale layers: " + stale.map(r => r.layer).join(", ")); process.exit(3); }
