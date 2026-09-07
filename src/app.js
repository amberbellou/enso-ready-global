// ENSO Ready — client. One screen at a time. All state in localStorage. No tracking.
import { buildFacts, renderBriefing, renderRadio, renderSMS, cellIdFor } from "./engine.js";

const $ = (s, el = document) => el.querySelector(s);
const state = { lang: "en", strings: null, place: null, livelihood: "all", stepIdx: 0, done: {}, screen: "home", data: {} };
const LS = { get(k, d) { try { return JSON.parse(localStorage.getItem("er:" + k)) ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem("er:" + k, JSON.stringify(v)); } catch {} } };
const BASE = document.documentElement.dataset.base || ".";

async function getJSON(p) { const r = await fetch(`${BASE}/${p}`); if (!r.ok) throw new Error(p + " " + r.status); return r.json(); }
function norm(s) { return s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, "").trim(); }
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
  root.dataset.size = s.size || "normal"; root.dataset.contrast = s.contrast || "normal"; root.dataset.easy = s.easy ? "1" : "0";
}
function settingsPanel() {
  const s = LS.get("settings", {});
  const set = (k, v) => { s[k] = v; LS.set("settings", s); applySettings(); render(); };
  return h("details", { class: "card" }, h("summary", {}, "⚙️ " + ui("settings")),
    h("label", {}, ui("text_size")), h("div", { class: "row" }, ["normal", "large", "xlarge"].map(v => h("button", { class: "btn secondary", "aria-pressed": String((s.size || "normal") === v), onclick: () => set("size", v) }, v === "normal" ? "A" : v === "large" ? "A+" : "A++"))),
    h("div", { class: "row" },
      h("button", { class: "btn secondary", "aria-pressed": String(s.contrast === "high"), onclick: () => set("contrast", s.contrast === "high" ? "normal" : "high") }, ui("high_contrast")),
      h("button", { class: "btn secondary", "aria-pressed": String(!!s.easy), onclick: () => set("easy", !s.easy) }, ui("easy_read"))));
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
function statusBanner() {
  const st = state.data.status; if (!st) return null;
  return h("div", { class: "banner", role: "status" }, h("div", { class: "label" }, ui("app_name") + " · " + (st.issued || "")), h("div", {}, h("strong", {}, st.status), " — ", st.synopsis), h("div", { class: "src" }, h("a", { href: st.source_url, rel: "noopener" }, st.source)));
}
function homeScreen() {
  const input = h("input", { type: "search", id: "q", autocomplete: "off", placeholder: ui("search_placeholder"), "aria-label": ui("search_label") });
  const list = h("ul", { class: "results", "aria-live": "polite" });
  let timer;
  input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(() => search(input.value, list), 150); });
  const geo = h("button", { class: "btn secondary block", onclick: () => navigator.geolocation?.getCurrentPosition(p => choosePlace({ name: null, lat: p.coords.latitude, lon: p.coords.longitude, cc: null }), () => alert(ui("no_results"))) }, "📍 " + ui("use_location"));
  return h("main", {}, h("div", { class: "row" }, langPicker()), mtBanner(), h("h1", {}, ui("tagline")), statusBanner(), h("div", { class: "card" }, h("label", { for: "q" }, ui("search_label")), input, list, geo), settingsPanel(),
    h("p", { class: "muted" }, h("a", { href: `${BASE}/methodology.html` }, ui("methodology")), " · ", h("a", { href: `${BASE}/countries/` }, "Browse by country")));
}
async function search(q, list) {
  const n = norm(q); list.replaceChildren();
  if (n.length < 2) return;
  const shard = /^[a-z0-9]{2}/.test(n) ? n.slice(0, 2) : "_";
  let rows; try { rows = state.data["geo:" + shard] ||= await getJSON(`geo/${shard}.json`); } catch { rows = []; }
  const countries = state.data.countries ||= await getJSON("geo/countries.json");
  const hits = []; const seen = new Set();
  for (const r of rows) { if (r[0].startsWith(n)) { const k = r[1] + r[2] + r[3]; if (!seen.has(k)) { seen.add(k); hits.push(r); } } if (hits.length >= 8) break; }
  if (!hits.length) { list.append(h("li", { class: "muted" }, ui("no_results"))); return; }
  for (const r of hits) list.append(h("li", {}, h("button", { onclick: () => choosePlace({ name: r[1], cc: r[2], lat: r[3], lon: r[4] }) }, r[1], h("small", {}, (countries[r[2]] || {}).name || r[2]))));
}
function choosePlace(p) { state.place = p; LS.set("place", p); state.screen = LS.get("livelihood") ? "briefing" : "who"; state.livelihood = LS.get("livelihood", "all"); render(); }
function whoScreen() {
  const pick = (v) => { state.livelihood = v; LS.set("livelihood", v); state.screen = "briefing"; render(); };
  return h("main", {}, h("h1", {}, ui("livelihood_q")), h("div", { class: "choices" }, ["farmer", "coastal", "urban", "all"].map(v => h("button", { onclick: () => pick(v) }, ui("livelihood_" + v)))));
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
  main.append(h("h1", { class: "headline " + cls }, head.text));
  const paras = blocks.filter(b => b.type === "para");
  const lead = paras.filter(b => b.key === "risks" || b.key === "timing" || b.key === "neutral");
  for (const b of lead) main.append(h("p", {}, b.text));
  const fc = blocks.find(b => b.type === "forecast");
  if (fc) main.append(h("p", {}, "📈 ", fc.text, fc.partial ? " " + fc.partial : "", " ", h("a", { class: "src", href: fc.source.url, rel: "noopener" }, "[" + fc.source.label + "]")));
  else if (state.forecastFailed && facts.region) main.append(h("p", { class: "muted" }, ui("forecast_unavailable")));
  const more = h("details", {}, h("summary", {}, ui("tell_more")));
  for (const b of paras.filter(b => !lead.includes(b))) more.append(h("p", {}, b.text, b.source ? [" ", h("a", { class: "src", href: b.source.url, rel: "noopener" }, "[" + b.source.id + "]")] : null));
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
  const steps = block.steps; const wrap = h("section", { class: "card" }, h("h2", {}, block.title));
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
