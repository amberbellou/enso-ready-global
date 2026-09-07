// Build the static site into site/ (deployed to GitHub Pages).
// - copies engine + client + strings
// - writes data/status.json, data/grid.json, data/cells/<id>.json (10k small files)
// - pre-renders English briefing pages for cities >= 100k people (no-JS + shareable)
// - country index pages (no-JS path), methodology page
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildFacts, renderBriefing, renderRadio, renderSMS, cellIdFor } from "../src/engine.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site");
const J = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
// atomic write: temp file then rename, so a failed build never leaves a half-written file (Open-Meteo idea)
const W = (p, s) => { const f = path.join(SITE, p); fs.mkdirSync(path.dirname(f), { recursive: true }); const t = f + ".tmp"; fs.writeFileSync(t, s); fs.renameSync(t, f); };
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const composites = J("data/derived/composites.json");
const tele = J("data/curated/teleconnections.json");
const checklists = J("data/curated/prep_checklists.json");
const met = J("data/curated/met_services.json");
const status = J("data/derived/enso_status.json");
const oni = J("data/derived/oni.json");
const strings = J("i18n/en.json");
const bands = J("data/curated/wording_bands.json");
const conditions = fs.existsSync(path.join(ROOT, "data/derived/conditions.json")) ? J("data/derived/conditions.json") : null;
const skillData = fs.existsSync(path.join(ROOT, "data/derived/skill.json")) ? J("data/derived/skill.json") : null;
const countries = fs.existsSync(path.join(ROOT, "geo-site/countries.json")) ? J("geo-site/countries.json") : J("site/geo/countries.json");
const buildDate = new Date().toISOString().slice(0, 10);

// --- static assets & data ---
fs.copyFileSync(path.join(ROOT, "src/engine.js"), path.join(SITE, "engine.js"));
fs.copyFileSync(path.join(ROOT, "src/app.js"), path.join(SITE, "app.js"));
fs.copyFileSync(path.join(ROOT, "src/search.js"), path.join(SITE, "search.js"));
fs.copyFileSync(path.join(ROOT, "src/style.css"), path.join(SITE, "style.css"));
fs.mkdirSync(path.join(SITE, "i18n"), { recursive: true });
const langIndex = [];
const flatKeys = (o, p = "") => Object.entries(o).flatMap(([k, v]) => k.startsWith("_") ? [] : (v && typeof v === "object" && !Array.isArray(v)) ? flatKeys(v, p + k + ".") : [p + k]);
const enKeys = new Set(flatKeys(strings));
for (const f of fs.readdirSync(path.join(ROOT, "i18n"))) { if (!f.endsWith(".json") || f.startsWith(".")) continue; fs.copyFileSync(path.join(ROOT, "i18n", f), path.join(SITE, "i18n", f)); const L = J("i18n/" + f); const have = new Set(flatKeys(L)); const pending = [...enKeys].filter(k => !have.has(k)).length; langIndex.push({ code: f.replace(".json", ""), name: L._name || f, dir: L._dir || "ltr", status: L._status || "machine", pending }); }
langIndex.sort((a, b) => (a.code === "en" ? -1 : b.code === "en" ? 1 : a.name.localeCompare(b.name)));
W("i18n/index.json", JSON.stringify(langIndex));
W("data/status.json", JSON.stringify(status));
W("data/wording_bands.json", JSON.stringify(bands));
if (conditions) W("data/conditions.json", JSON.stringify(conditions));
if (skillData) W("data/skill.json", JSON.stringify(skillData));
// provenance registry: every dataset behind any fact, with version + retrieval date (drives /methodology and the chips)
const registry = [];
for (const [k, p] of Object.entries(composites.provenance || {})) if (p && typeof p === "object" && p.name) registry.push({ layer: "history", key: k, ...p });
registry.push({ layer: "status", key: "cpc", name: status.source, version: status.issued, retrieved_at: status.fetched_at ? status.fetched_at.slice(0, 10) : null, url: status.source_url, licence: "US Government public domain" });
if (conditions) { for (const [k, sec] of Object.entries(conditions)) if (sec && sec.provenance) registry.push({ layer: "conditions", key: k, ...sec.provenance }); }
registry.push({ layer: "forecast", key: "seas5_openmeteo", name: "ECMWF SEAS5 seasonal forecast via Open-Meteo", version: "latest run, fetched per briefing", retrieved_at: null, url: "https://open-meteo.com/", licence: "CC BY 4.0 (Open-Meteo); ECMWF data" });
registry.push({ layer: "places", key: "geonames", name: "GeoNames", version: "full dump", retrieved_at: buildDate, url: "https://www.geonames.org/", licence: "CC BY 4.0" });
registry.push({ layer: "pattern", key: "teleconnections", name: "Curated teleconnection table (cited)", version: buildDate, retrieved_at: buildDate, url: "https://github.com/amberbellou/enso-ready-global/blob/main/data/curated/teleconnections.json", licence: "MIT (this project)" });
W("data/provenance.json", JSON.stringify({ built_at: new Date().toISOString(), datasets: registry }, null, 1));
W("data/grid.json", JSON.stringify(composites.grid));
W("data/teleconnections.json", JSON.stringify(tele));
W("data/prep_checklists.json", JSON.stringify(checklists));
W("data/met_services.json", JSON.stringify(met));
W("data/oni.json", JSON.stringify({ source: oni.source, source_url: oni.source_url, latest_season: oni.latest_season, latest_oni: oni.latest_oni, events: oni.events }));
const countryDir = path.join(ROOT, "data/curated/countries");
const countryOverrides = {};
for (const f of fs.existsSync(countryDir) ? fs.readdirSync(countryDir) : []) { const cc = f.replace(".json", ""); countryOverrides[cc] = J("data/curated/countries/" + f); W(`data/countries/${cc}.json`, JSON.stringify(countryOverrides[cc])); }
let nCells = 0;
const cellMeta = { schema: composites.schema, units: composites.units, baseline: [composites.baseline_start, composites.baseline_end], min_events: composites.min_events };
// only cells that can be requested: land, or ocean within 2 cells of land (engine snaps coasts to land)
const G = composites.grid, GW = G.lons.length;
const nearLand = (i, j) => { for (let di = -2; di <= 2; di++) for (let dj = -2; dj <= 2; dj++) { const ii = i + di, jj = (j + dj + GW) % GW; if (ii >= 0 && ii < G.lats.length && G.land[ii * GW + jj] === "1") return true; } return false; };
for (const [id, cell] of Object.entries(composites.cells)) {
  const i = G.lats.indexOf(parseFloat(id.split("_")[0])), j = G.lons.indexOf(parseFloat(id.split("_")[1]));
  if (!cell.on_land && !nearLand(i, j)) continue;
  W(`data/cells/${id}.json`, JSON.stringify({ ...cellMeta, cell, events: composites.events, sources: composites.sources }));
  nCells++;
}
// freshness metadata (dead-man's switch made visible)
const statusIssued = new Date(Date.parse(status.issued + " UTC") || Date.now());
W("data/meta.json", JSON.stringify({
  built_at: new Date().toISOString(),
  status: { issued: status.issued, fetched_at: status.fetched_at, update_interval_days: 31, stale_after: new Date(statusIssued.getTime() + 45 * 86400000).toISOString() },
  composites: { schema: composites.schema, baseline: [composites.baseline_start, composites.baseline_end], events: composites.events, rebuild_interval_days: 365 },
  sources: composites.sources,
}, null, 1));

// --- page shell ---
const shell = ({ title, body, base = ".", lang = "en", dir = "ltr", desc = "" }) => `<!doctype html>
<html lang="${lang}" dir="${dir}" data-base="${base}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="stylesheet" href="${base}/style.css">
<meta name="color-scheme" content="light">
</head>
<body>
<header class="top"><a class="brand" href="${base}/">🌦️ ENSO Ready</a><a href="${base}/methodology.html">${esc(strings.ui.methodology)}</a></header>
${body}
<footer>${esc(strings.ui.updated.replace("{date}", buildDate))} · Independent, open-source, no ads, no tracking. Not an official warning service. <a href="https://github.com/amberbellou/enso-ready-global">Source code</a><br>Data: <a href="https://www.chc.ucsb.edu/data/chirps">CHIRPS (UCSB CHC)</a>, <a href="https://www.ncei.noaa.gov/products/global-precipitation-climatology-project">GPCP (NOAA)</a>, <a href="https://www.cpc.ncep.noaa.gov/">NOAA CPC</a>, <a href="https://open-meteo.com/">ECMWF SEAS5 via Open-Meteo (CC BY 4.0)</a>, <a href="https://www.geonames.org/">GeoNames (CC BY 4.0)</a>, <a href="https://www.naturalearthdata.com/">Natural Earth</a>.</footer>
</body></html>`;

// --- landing ---
W("index.html", shell({ title: "ENSO Ready — your El Niño briefing", desc: strings.ui.tagline, body: `
<div id="app"><main>
<h1>${esc(strings.ui.tagline)}</h1>
<div class="banner"><div class="label">${esc(status.source)} · ${esc(status.issued)}</div><strong>${esc(status.status)}</strong> — ${esc(status.synopsis)}</div>
<noscript><p class="mt">${esc(strings.ui.no_js)}</p><p><a class="btn" href="./countries/">Browse by country</a></p></noscript>
</main></div>
<script type="module" src="./app.js"></script>` }));

const cellIdForPlace = (lat, lon) => cellIdFor(lat, lon, composites.grid);
// --- pre-rendered city pages (English) ---
// cities >= 100k: from the gazetteer build (data/derived/cities100k.json), else from the legacy cities15000 dump
let cities;
if (fs.existsSync(path.join(ROOT, "data/derived/cities100k.json"))) cities = J("data/derived/cities100k.json");
else cities = fs.readFileSync(path.join(ROOT, "data/raw/cities15000.txt"), "utf8").split("\n").map(l => l.split("\t")).filter(p => p.length > 14 && +p[14] >= 100000).map(p => [p[0], p[1], p[8], p[4], p[5], +p[14]]);
const byCountry = {};
let nPages = 0;
for (const [id, name, cc, lat, lon, pop] of cities) {
  const facts = buildFacts({ lat: +lat, lon: +lon, cc, status, composites, tele, checklists, met, country: countryOverrides[cc] || null, conditions, skill: skillData ? skillData.cells[cellIdForPlace(+lat, +lon)] : null, bands, livelihood: "all" });
  const blocks = renderBriefing(facts, strings, { placeName: name });
  const head = blocks.find(b => b.type === "headline").text;
  const paras = blocks.filter(b => b.type === "para");
  const srcs = blocks.find(b => b.type === "sources");
  const hist = blocks.find(b => b.type === "history");
  const st = blocks.find(b => b.type === "status");
  const steps = blocks.find(b => b.type === "steps");
  const defer = blocks.find(b => b.type === "defer");
  const cls = /more rain/.test(head) ? "wet" : /less rain/.test(head) ? "dry" : "";
  const body = `<main>
<p class="muted"><a href="../">← ${esc(strings.ui.change_place)}</a>${facts.region ? ` · ${esc(strings.ui.region_label)}: ${esc(facts.region.name)}` : ""}</p>
<h1 class="headline ${cls}">${esc(head)}</h1>
${paras.map(b => `<p>${esc(b.text)}${b.source ? ` <a class="src" href="${b.source.url}" rel="noopener">[${b.source.id}]</a>` : ""}</p>`).join("\n")}
${hist ? `<p>${esc(hist.text)}</p><p>${esc(hist.recent)} <a class="src" href="${hist.source.url}" rel="noopener">[${esc(hist.source.label)}]</a></p>` : ""}
<p class="muted">${esc(st.text)} <a class="src" href="${st.source.url}" rel="noopener">[NOAA CPC]</a></p>
<p class="muted">📈 ${esc(strings.ui.forecast_unavailable.split(".")[0])}: open the interactive version below for this season's ECMWF model forecast.</p>
<section class="card"><h2>${esc(steps.title)}</h2><ol>${steps.steps.map(s => `<li><span aria-hidden="true">${s.icon}</span> ${esc(s.text)} <span class="muted">(${esc(strings.ui.minutes.replace("{n}", s.minutes))})</span><details><summary>${esc(strings.ui.why_matters)}</summary><p>${esc(s.why)}</p></details></li>`).join("")}</ol></section>
<div class="banner">📢 ${esc(defer.text)} <a href="${defer.url}" rel="noopener">${esc(defer.url.replace(/^https?:\/\//, "").replace(/\/$/, ""))}</a></div>
<p class="src">${esc(srcs.title)}: ${srcs.items.map(it => `<a href="${it.url}" rel="noopener">${esc(it.label)}</a>`).join(" · ")}</p>
${(() => { const pv = blocks.find(b => b.type === "provenance"); return pv ? `<p class="chips">${pv.items.map(it => `<a class="chip" href="${it.url}" rel="noopener">${esc(it.label)}</a>`).join(" ")}</p>` : ""; })()}
<details><summary>📻 ${esc(strings.ui.radio_script)} / ${esc(strings.ui.sms_text)}</summary><pre class="script">${esc(renderRadio(facts, strings, name))}</pre><pre class="script">${esc(renderSMS(facts, strings, name))}</pre></details>
<p><a class="btn" href="../?lat=${lat}&lon=${lon}&cc=${cc}&name=${encodeURIComponent(name)}">${esc(strings.ui.see_briefing)} (interactive)</a></p>
</main>`;
  W(`p/${id}.html`, shell({ title: `${name}: El Niño outlook — ENSO Ready`, desc: head, base: "..", body }));
  (byCountry[cc] ||= []).push({ id, name, pop });
  nPages++;
}
// --- country index (no-JS path) ---
const ccList = Object.keys(byCountry).sort((a, b) => (countries[a]?.name || a).localeCompare(countries[b]?.name || b));
W("countries/index.html", shell({ title: "Browse by country — ENSO Ready", base: "..", body: `<main><h1>Pick your country</h1><ul class="countries">${ccList.map(cc => `<li><a href="./${cc}.html">${esc(countries[cc]?.name || cc)}</a></li>`).join("")}</ul></main>` }));
for (const cc of ccList) {
  const seenNames = new Set();
  const list = byCountry[cc].sort((a, b) => b.pop - a.pop).filter(c => !seenNames.has(c.name) && seenNames.add(c.name));
  const svc = met.services[cc] || met.fallback;
  W(`countries/${cc}.html`, shell({ title: `${countries[cc]?.name || cc} — ENSO Ready`, base: "..", body: `<main><p class="muted"><a href="./">← All countries</a></p><h1>${esc(countries[cc]?.name || cc)}</h1><p>Pick the nearest large town:</p><ul class="results">${list.map(c => `<li><a class="btn secondary block" href="../p/${c.id}.html">${esc(c.name)}</a></li>`).join("")}</ul><div class="banner">📢 Official warnings: <a href="${svc.url}" rel="noopener">${esc(svc.name)}</a></div></main>` }));
}
// --- methodology ---
const provTable = `<h2>Datasets behind every fact</h2><p>Generated from the provenance stored with each dataset at build time (${esc(buildDate)}).</p><div style="overflow-x:auto"><table><thead><tr><th>Layer</th><th>Dataset</th><th>Version / as of</th><th>Retrieved</th><th>Licence</th></tr></thead><tbody>${registry.map(r => `<tr><td>${esc(r.layer)}</td><td><a href="${r.url}" rel="noopener">${esc(r.name)}</a></td><td>${esc(r.version || "")}</td><td>${esc(r.retrieved_at || "")}</td><td>${esc(r.licence || "")}</td></tr>`).join("")}</tbody></table></div>`;
W("methodology.html", shell({ title: "How this works — ENSO Ready", body: fs.readFileSync(path.join(ROOT, "docs/methodology.html"), "utf8").replace("</main>", provTable + "</main>") }));
W(".nojekyll", "");
W("robots.txt", "User-agent: *\nAllow: /\n");
console.log(`built: ${nCells} cell files, ${nPages} city pages, ${ccList.length} country pages`);
