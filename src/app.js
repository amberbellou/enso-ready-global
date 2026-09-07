// ENSO Ready — client. One screen at a time. All state in localStorage. No tracking.
import { buildFacts, renderBriefing, renderRadio, renderSMS, cellIdFor } from "./engine.js";
import { norm, pickShard, rank, label, nearest, cellIdFor2deg, expand, topShard } from "./search.js";

const $ = (s, el = document) => el.querySelector(s);
const state = { lang: "en", strings: null, place: null, livelihood: "all", stepIdx: 0, done: {}, screen: "home", data: {} };
const LS = { get(k, d) { try { return JSON.parse(localStorage.getItem("er:" + k)) ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem("er:" + k, JSON.stringify(v)); } catch {} } };
const BASE = document.documentElement.dataset.base || ".";
// The gazetteer (~850 MB of static shards) lives on its own Pages site, refreshed quarterly (Annex D).
const GEO = document.documentElement.dataset.geo || "https://amberbellou.github.io/enso-ready-geo";

async function getJSON(p) { const base = p.startsWith("geo/") ? GEO + "/" + p.slice(4) : `${BASE}/${p}`; const r = await fetch(p.startsWith("geo/") ? base : base); if (!r.ok) throw new Error(p + " " + r.status); return r.json(); }
function ui(k, vars = {}) { const t = (state.strings.ui || {})[k] || k; return t.replace(/\{(\w+)\}/g, (_, n) => vars[n] ?? ""); }
function h(tag, attrs = {}, ...kids) { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === "onclick") e.addEventListener("click", v); else if (k === "html") e.innerHTML = v; else e.setAttribute(k, v); } for (const c of kids.flat()) if (c != null) e.append(c.nodeType ? c : document.createTextNode(String(c))); return e; }

// --- language (template-first i18n; machine-translated languages carry a banner, Annex C.2.2) ---
async function setLang(lang) {
  state.lang = lang; LS.set("lang", lang);
  state.strings = await getJSON(`i18n/${lang}.json`);
  document.documentElement.lang = lang; document.documentElement.dir = state.strings._dir || "ltr";
  render();
}
function langPicker() {
  const idx = state.data.langs || [];
  const sel = h("select", { "aria-label": "Language", class: "lang" });
  for (const l of idx) { const o = h("option", { value: l.code }, l.name); if (l.code === state.lang) o.selected = true; sel.append(o); }
  sel.addEventListener("change", () => setLang(sel.value));
  return sel;
}
function mtBanner() {
  if (!state.strings || state.strings._status !== "machine") return null;
  return h("p", { class: "mt" }, h("a", { href: `https://github.com/amberbellou/enso-ready-global/issues/new?title=${encodeURIComponent("Translation fix (" + state.lang + ")")}`, rel: "noopener" }, ui("mt_banner")));
}

// --- settings (Annex B.4) ---
function applySettings() {
  const s = LS.get("settings", {});
  const root = document.documentElement;
  root.dataset.size = s.size || "normal"; root.dataset.contrast = s.contrast || "normal"; root.dataset.easy = s.easy ? "1" : "0"; root.dataset.dys = s.dys ? "1" : "0"; root.dataset.motion = s.motion === false ? "0" : "1";
}
function settingsPanel() {
  const s = LS.get("settings", {});
  const set = (k, v) => { s[k] = v; LS.set("settings", s); applySettings(); render(); };
  return h("details", { class: "card" }, h("summary", {}, "⚙️ " + ui("settings")),
    h("label", {}, ui("text_size")), h("div", { class: "row" }, ["normal", "large", "xlarge"].map(v => h("button", { class: "btn secondary", "aria-pressed": String((s.size || "normal") === v), onclick: () => set("size", v) }, v === "normal" ? "A" : v === "large" ? "A+" : "A++"))),
    h("div", { class: "row" },
      h("button", { class: "btn secondary", "aria-pressed": String(s.contrast === "high"), onclick: () => set("contrast", s.contrast === "high" ? "normal" : "high") }, ui("high_contrast")),
      h("button", { class: "btn secondary", "aria-pressed": String(!!s.easy), onclick: () => set("easy", !s.easy) }, ui("easy_read")),
      h("button", { class: "btn secondary", "aria-pressed": String(!!s.dys), onclick: () => set("dys", !s.dys) }, ui("dyslexia")),
      h("button", { class: "btn secondary", "aria-pressed": String(s.motion === false), onclick: () => set("motion", s.motion === false ? true : false) }, ui("reduce_motion"))));
}

// --- live seasonal forecast: ECMWF SEAS5 monthly anomaly via Open-Meteo (CC BY 4.0). Per-user IP, no key. ---
async function fetchForecast(lat, lon) {
  const key = `fc:${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = LS.get(key); if (cached && Date.now() - cached.t < 24 * 3600 * 1000) return cached.v;
  try {
    const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 7000);
    const r = await fetch(`https://seasonal-api.open-meteo.com/v1/seasonal?latitude=${lat}&longitude=${lon}&monthly=precipitation_anomaly,precipitation_mean&models=ecmwf_seas5`, { signal: ctl.signal });
    clearTimeout(timer); if (!r.ok) return null;
    const d = await r.json(); const m = d.monthly || {};
    if (!Array.isArray(m.time) || !Array.isArray(m.precipitation_anomaly)) return null;
    const months = m.time.map((t, i) => ({ ym: t.slice(0, 7), anomaly: m.precipitation_anomaly[i], mean: m.precipitation_mean[i] }))
      .filter(x => Number.isFinite(x.anomaly) && Number.isFinite(x.mean) && Math.abs(x.anomaly) < 5000);
    if (!months.length) return null;
    const v = { months, source: "ECMWF SEAS5 seasonal forecast via Open-Meteo (CC BY 4.0)", source_url: "https://open-meteo.com/", issued: m.time[0] };
    LS.set(key, { t: Date.now(), v }); return v;
  } catch { return null; }
}

// --- screens ---
// Easy Read (Annex B.2): one sentence per line
function sentences(text) { return String(text).split(/(?<=[.!?。؟])\s+/).filter(Boolean); }
function para(text, ...extra) { const easy = LS.get("settings", {}).easy; if (!easy) return h("p", {}, text, ...extra); const wrap = h("div", { class: "easy" }); for (const t of sentences(text)) wrap.append(h("p", {}, t)); if (extra.length) wrap.append(h("p", {}, ...extra)); return wrap; }
function statusBanner() {
  const st = state.data.status; if (!st) return null;
  return h("div", { class: "banner", role: "status" }, h("div", { class: "label" }, ui("app_name") + " · " + (st.issued || "")), h("div", {}, h("strong", {}, st.status), " — ", st.synopsis), h("div", { class: "src" }, h("a", { href: st.source_url, rel: "noopener" }, st.source)));
}
function homeScreen() {
  const input = h("input", { type: "search", id: "q", autocomplete: "off", placeholder: ui("search_placeholder"), "aria-label": ui("search_label") });
  const list = h("ul", { class: "results", "aria-live": "polite" });
  let timer;
  input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(() => search(input.value, list), 150); });
  const geo = h("button", { class: "btn secondary block", onclick: () => navigator.geolocation?.getCurrentPosition(p => chooseCoords(p.coords.latitude, p.coords.longitude), () => alert(ui("no_results"))) }, "📍 " + ui("use_location"));
  const mapBtn = h("button", { class: "btn secondary block", onclick: () => openMap().catch(() => alert(ui("no_results"))) }, "🗺️ " + ui("pick_map"));
  return h("main", {}, h("div", { class: "row" }, langPicker()), mtBanner(), h("h1", { id: "main", tabindex: "-1" }, ui("tagline")), statusBanner(), h("div", { class: "card" }, h("label", { for: "q" }, ui("search_label")), input, list, geo, mapBtn), settingsPanel(),
    h("p", { class: "muted" }, h("a", { href: `${BASE}/methodology.html` }, ui("methodology")), " · ", h("a", { href: `${BASE}/countries/` }, "Browse by country")));
}
async function search(q, list) {
  const n = norm(q); list.replaceChildren();
  if (n.length < 2) return;
  const idx = state.data.geoIndex ||= new Set(((await getJSON("geo/index.json").catch(() => ({ shards: [] }))).shards));
  const shard = pickShard(n, idx);
  let rows = []; if (shard) { try { rows = state.data["geo:" + shard] ||= await getJSON(`geo/${shard}.json`); } catch { rows = []; } }
  let major = []; try { major = state.data["top:" + topShard(n)] ||= await getJSON(`geo/top/${topShard(n)}.json`); } catch { major = []; }
  const countries = state.data.countries ||= await getJSON("geo/countries.json");
  const hits = rank(n, [...expand(rows), ...major], 8);
  if (!hits.length) { list.append(h("li", { class: "muted" }, ui("no_results"))); return; }
  for (const r of hits) list.append(h("li", {}, h("button", { onclick: () => choosePlace({ name: r[1], cc: r[2], lat: r[5], lon: r[6], admin1: r[3] }) }, r[1], h("small", {}, label(r, countries)))));
}
// GPS / map pin: name the point after the nearest known place ("near Wau"), else fall back to the grid cell.
async function nameFromCoords(lat, lon) {
  try {
    const list = await getJSON(`geo/near/${cellIdFor2deg(lat, lon)}.json`);
    const nr = nearest(lat, lon, list);
    if (nr) return { name: ui("near", { name: nr.place[0] }), cc: nr.place[1] };
  } catch {}
  return { name: `${lat.toFixed(2)}, ${lon.toFixed(2)}`, cc: null };
}
async function chooseCoords(lat, lon) { const nm = await nameFromCoords(lat, lon); choosePlace({ name: nm.name, cc: nm.cc, lat, lon }); }
// Map picker: Leaflet + OpenStreetMap tiles, loaded only when tapped (never in the first load).
async function openMap() {
  if (!window.L) {
    await new Promise((res, rej) => { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"; document.head.append(l);
      const sc = document.createElement("script"); sc.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"; sc.onload = res; sc.onerror = rej; document.head.append(sc); });
  }
  const root = $("#app"); const box = h("main", {}, h("p", {}, ui("map_hint")), h("div", { id: "map", style: "height:60vh;border-radius:12px;border:1px solid var(--line)" }),
    h("p", { class: "src" }, "© OpenStreetMap contributors"), h("button", { class: "btn secondary block", onclick: () => render() }, ui("back")));
  root.replaceChildren(box);
  const last = LS.get("place"); const map = L.map("map", { zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false }).setView(last ? [last.lat, last.lon] : [10, 20], last ? 6 : 2);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 12, attribution: "© OpenStreetMap contributors" }).addTo(map);
  map.on("click", (e) => chooseCoords(e.latlng.lat, e.latlng.lng));
}
function choosePlace(p) { state.place = p; LS.set("place", p); state.screen = LS.get("livelihood") ? "briefing" : "who"; state.livelihood = LS.get("livelihood", "all"); render(); }
function whoScreen() {
  const pick = (v) => { state.livelihood = v; LS.set("livelihood", v); state.screen = "briefing"; render(); };
  return h("main", {}, h("h1", { id: "main", tabindex: "-1" }, ui("livelihood_q")), h("div", { class: "choices" }, ["farmer", "coastal", "urban", "all"].map(v => h("button", { onclick: () => pick(v) }, ui("livelihood_" + v)))));
}
async function briefingScreen() {
  const p = state.place; const S = state.strings;
  const grid = state.data.grid ||= await getJSON("data/grid.json");
  const cellId = cellIdFor(p.lat, p.lon, grid);
  let cell; try { cell = state.data["cell:" + cellId] ||= await getJSON(`data/cells/${cellId}.json`); } catch { cell = null; }
  const tele = state.data.tele ||= await getJSON("data/teleconnections.json");
  const checklists = state.data.checklists ||= await getJSON("data/prep_checklists.json");
  const met = state.data.met ||= await getJSON("data/met_services.json");
  let country = null; if (p.cc) { try { country = state.data["country:" + p.cc] ||= await getJSON(`data/countries/${p.cc}.json`); } catch { country = null; } }
  const forecast = await fetchForecast(p.lat, p.lon);
  const composites = { grid, cells: cell ? { [cellId]: cell.cell } : {}, events: cell ? cell.events : { "El Niño": [], "La Niña": [] }, sources: cell ? cell.sources : {} };
  const facts = buildFacts({ lat: p.lat, lon: p.lon, cc: p.cc, status: state.data.status, composites, tele, checklists, met, country, forecast, livelihood: state.livelihood });
  state.forecastFailed = !forecast;
  const blocks = renderBriefing(facts, S, { placeName: p.name });
  LS.set("last", { place: p, blocks, date: new Date().toISOString(), radio: renderRadio(facts, S, p.name), sms: renderSMS(facts, S, p.name) });
  return renderBlocks(blocks, facts, p, { radio: renderRadio(facts, S, p.name), sms: renderSMS(facts, S, p.name) });
}
function renderBlocks(blocks, facts, p, extra) {
  const head = blocks.find(b => b.type === "headline");
  const cls = /more rain|wetter|flood/i.test(head.text) ? "wet" : /less rain|drier|drought/i.test(head.text) ? "dry" : "";
  const main = h("main", {});
  const banner = mtBanner(); if (banner) main.append(banner);
  main.append(h("p", { class: "muted" }, h("a", { href: "#", onclick: (e) => { e.preventDefault(); state.screen = "home"; render(); } }, "← " + ui("change_place")), facts.region ? ` · ${ui("region_label")}: ${((state.strings.regions || {})[facts.region.id] || {}).name || facts.region.name}` : ""));
  main.append(h("h1", { class: "headline " + cls, tabindex: "-1", id: "main" }, head.text));
  const paras = blocks.filter(b => b.type === "para");
  const lead = paras.filter(b => b.key === "risks" || b.key === "timing" || b.key === "neutral");
  if (lead.length) main.append(para(lead.map(b => b.text).join(" ")));   // one chunk: risks + timing
  const fc = blocks.find(b => b.type === "forecast");
  if (fc) main.append(para("📈 " + fc.text + (fc.partial ? " " + fc.partial : ""), " ", h("a", { class: "src", href: fc.source.url, rel: "noopener" }, "[" + fc.source.label + "]")));
  else if (state.forecastFailed && facts.region) main.append(h("p", { class: "muted" }, ui("forecast_unavailable")));
  main.append(h("button", { class: "btn block whatnow", onclick: () => { const el = document.getElementById("steps"); if (el) { el.scrollIntoView({ block: "start" }); const b = el.querySelector("button"); if (b) b.focus(); } } }, "✅ " + ui("what_now")));
  const more = h("details", {}, h("summary", {}, ui("tell_more")));
  for (const b of paras.filter(b => !lead.includes(b))) more.append(para(b.text, ...(b.source ? [" ", h("a", { class: "src", href: b.source.url, rel: "noopener" }, "[" + b.source.id + "]")] : [])));
  const hist = blocks.find(b => b.type === "history");
  if (hist) more.append(h("p", {}, hist.text), h("p", {}, hist.recent, " ", h("a", { class: "src", href: hist.source.url, rel: "noopener" }, "[" + hist.source.label + "]")));
  const st = blocks.find(b => b.type === "status");
  more.append(h("p", { class: "muted" }, st.text, " ", h("a", { class: "src", href: st.source.url, rel: "noopener" }, "[NOAA CPC]")));
  main.append(more);
  main.append(stepsWidget(blocks.find(b => b.type === "steps")));
  const d = blocks.find(b => b.type === "defer");
  main.append(h("div", { class: "banner" }, "📢 ", d.text, " ", h("a", { href: d.url, rel: "noopener" }, d.url.replace(/^https?:\/\//, "").replace(/\/$/, ""))));
  const tools = h("details", {}, h("summary", {}, "📻 " + ui("radio_script") + " / " + ui("sms_text")));
  tools.append(h("pre", { class: "script" }, extra.radio), h("pre", { class: "script" }, extra.sms));
  main.append(tools);
  const src = blocks.find(b => b.type === "sources");
  if (src) { const sp = h("p", { class: "src" }, src.title + ": "); src.items.forEach((it, i) => { if (i) sp.append(" · "); sp.append(h("a", { href: it.url, rel: "noopener" }, it.label)); }); main.append(sp); }
  if ("speechSynthesis" in window) main.append(h("button", { class: "btn secondary", onclick: () => { const u = new SpeechSynthesisUtterance(extra.radio); u.lang = state.lang; speechSynthesis.cancel(); speechSynthesis.speak(u); } }, "🔊 " + ui("read_aloud")));
  main.append(settingsPanel());
  return main;
}
function stepsWidget(block) {
  const steps = block.steps; const wrap = h("section", { class: "card", id: "steps", "aria-labelledby": "steps-h" }, h("h2", { id: "steps-h" }, block.title));
  const done = LS.get("done", {});
  let i = Math.min(state.stepIdx, steps.length - 1); let showAll = false;
  const body = h("div", {});
  const draw = () => {
    body.replaceChildren();
    const nDone = steps.filter(s => done[s.id]).length;
    body.append(h("div", { class: "muted" }, ui("step_of", { i: i + 1, n: steps.length })), h("div", { class: "progress", role: "progressbar", "aria-valuenow": nDone, "aria-valuemax": steps.length }, h("span", { style: `width:${100 * nDone / steps.length}%` })));
    const list = showAll ? steps : [steps[i]];
    for (const s of list) {
      const el = h("div", { class: "step" + (done[s.id] ? " stepdone" : "") }, h("div", { class: "icon", "aria-hidden": "true" }, s.icon), h("div", { class: "text" }, s.text), h("div", { class: "meta" }, ui("minutes", { n: s.minutes })),
        h("details", {}, h("summary", {}, ui("why_matters")), h("p", {}, s.why)),
        h("div", { class: "row" }, h("button", { class: "btn", "aria-pressed": String(!!done[s.id]), onclick: () => { done[s.id] = !done[s.id]; LS.set("done", done); draw(); } }, "✅ " + ui("done")),
          showAll ? null : h("button", { class: "btn secondary", disabled: i >= steps.length - 1 ? "true" : null, onclick: () => { i++; state.stepIdx = i; draw(); } }, ui("next_step") + " →")));
      body.append(el);
    }
    body.append(h("button", { class: "btn secondary", onclick: () => { showAll = !showAll; draw(); } }, showAll ? ui("show_less") : ui("show_all_steps")));
  };
  draw(); wrap.append(body); return wrap;
}

async function render() {
  const root = $("#app");
  if (!$("#skip")) { const sk = h("a", { id: "skip", class: "skip", href: "#main" }, ui("skip")); document.body.prepend(sk); }
  try {
    if (state.screen === "home") root.replaceChildren(homeScreen());
    else if (state.screen === "who") root.replaceChildren(whoScreen());
    else root.replaceChildren(await briefingScreen());
  } catch (e) {
    const last = LS.get("last");
    if (last && state.screen === "briefing") { root.replaceChildren(h("main", {}, h("p", { class: "mt" }, ui("offline_note", { date: last.date.slice(0, 10) })), renderBlocks(last.blocks, { region: null }, last.place, { radio: last.radio, sms: last.sms }))); }
    else root.replaceChildren(h("main", {}, h("p", {}, "Something went wrong: " + e.message)));
  }
  window.scrollTo(0, 0);
  const focusTarget = root.querySelector("h1"); if (focusTarget) { focusTarget.id = "main"; focusTarget.tabIndex = -1; focusTarget.focus({ preventScroll: true }); }
}
(async function init() {
  applySettings();
  try { state.data.langs = await getJSON("i18n/index.json"); } catch { state.data.langs = [{ code: "en", name: "English" }]; }
  const params0 = new URLSearchParams(location.search);
  const wanted = params0.get("lang") || LS.get("lang") || (navigator.language || "en").slice(0, 2);
  state.lang = state.data.langs.some(l => l.code === wanted) ? wanted : "en";
  state.strings = await getJSON(`i18n/${state.lang}.json`);
  document.documentElement.lang = state.lang; document.documentElement.dir = state.strings._dir || "ltr";
  try { state.data.status = await getJSON("data/status.json"); } catch { state.data.status = null; }
  const params = new URLSearchParams(location.search);
  if (params.get("lat") && params.get("lon")) choosePlace({ name: params.get("name"), cc: params.get("cc"), lat: +params.get("lat"), lon: +params.get("lon") });
  else { const p = LS.get("place"); if (p) { state.place = p; state.livelihood = LS.get("livelihood", "all"); } render(); }
})();
