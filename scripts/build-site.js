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
const W = (p, s) => { const f = path.join(SITE, p); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); };
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const composites = J("data/derived/composites.json");
const tele = J("data/curated/teleconnections.json");
const checklists = J("data/curated/prep_checklists.json");
const met = J("data/curated/met_services.json");
const status = J("data/derived/enso_status.json");
const oni = J("data/derived/oni.json");
const strings = J("i18n/en.json");
const countries = J("site/geo/countries.json");
const buildDate = new Date().toISOString().slice(0, 10);

// --- static assets & data ---
fs.copyFileSync(path.join(ROOT, "src/engine.js"), path.join(SITE, "engine.js"));
fs.copyFileSync(path.join(ROOT, "src/app.js"), path.join(SITE, "app.js"));
fs.copyFileSync(path.join(ROOT, "src/style.css"), path.join(SITE, "style.css"));
fs.mkdirSync(path.join(SITE, "i18n"), { recursive: true });
for (const f of fs.readdirSync(path.join(ROOT, "i18n"))) fs.copyFileSync(path.join(ROOT, "i18n", f), path.join(SITE, "i18n", f));
W("data/status.json", JSON.stringify(status));
W("data/grid.json", JSON.stringify(composites.grid));
W("data/teleconnections.json", JSON.stringify(tele));
W("data/prep_checklists.json", JSON.stringify(checklists));
W("data/met_services.json", JSON.stringify(met));
W("data/oni.json", JSON.stringify({ source: oni.source, source_url: oni.source_url, latest_season: oni.latest_season, latest_oni: oni.latest_oni, events: oni.events }));
let nCells = 0;
for (const [id, cell] of Object.entries(composites.cells)) {
  W(`data/cells/${id}.json`, JSON.stringify({ cell, events: composites.events, source: composites.source, source_url: composites.source_url }));
  nCells++;
}

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
<footer>${esc(strings.ui.updated.replace("{date}", buildDate))} · Independent, open-source, no ads, no tracking. Not an official warning service. <a href="https://github.com/amberbellou/enso-ready-global">Source code</a></footer>
</body></html>`;

// --- landing ---
W("index.html", shell({ title: "ENSO Ready — your El Niño briefing", desc: strings.ui.tagline, body: `
<div id="app"><main>
<h1>${esc(strings.ui.tagline)}</h1>
<div class="banner"><div class="label">${esc(status.source)} · ${esc(status.issued)}</div><strong>${esc(status.status)}</strong> — ${esc(status.synopsis)}</div>
<noscript><p class="mt">${esc(strings.ui.no_js)}</p><p><a class="btn" href="./countries/">Browse by country</a></p></noscript>
</main></div>
<script type="module" src="./app.js"></script>` }));

// --- pre-rendered city pages (English) ---
const cities = fs.readFileSync(path.join(ROOT, "data/raw/cities15000.txt"), "utf8").split("\n").map(l => l.split("\t")).filter(p => p.length > 14 && +p[14] >= 100000);
const byCountry = {};
let nPages = 0;
for (const p of cities) {
  const [id, name, , , lat, lon, , , cc] = p; const pop = +p[14];
  const facts = buildFacts({ lat: +lat, lon: +lon, cc, status, composites, tele, checklists, met, livelihood: "all" });
  const blocks = renderBriefing(facts, strings, { placeName: name });
  const head = blocks.find(b => b.type === "headline").text;
  const paras = blocks.filter(b => b.type === "para");
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
<section class="card"><h2>${esc(steps.title)}</h2><ol>${steps.steps.map(s => `<li><span aria-hidden="true">${s.icon}</span> ${esc(s.text)} <span class="muted">(${esc(strings.ui.minutes.replace("{n}", s.minutes))})</span><details><summary>${esc(strings.ui.why_matters)}</summary><p>${esc(s.why)}</p></details></li>`).join("")}</ol></section>
<div class="banner">📢 ${esc(defer.text)} <a href="${defer.url}" rel="noopener">${esc(defer.url.replace(/^https?:\/\//, "").replace(/\/$/, ""))}</a></div>
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
W("methodology.html", shell({ title: "How this works — ENSO Ready", body: fs.readFileSync(path.join(ROOT, "docs/methodology.html"), "utf8") }));
W(".nojekyll", "");
W("robots.txt", "User-agent: *\nAllow: /\n");
console.log(`built: ${nCells} cell files, ${nPages} city pages, ${ccList.length} country pages`);
