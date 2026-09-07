// Editorial enforcement (Annex E.B.3, STYLE.md): CI check on English templates and curated text.
//  1. urgency theater: banned words, exclamation marks, ALL-CAPS words, countdown phrasing  -> fail
//  2. reading level: Flesch-Kincaid grade on the corpus (target <= 8; fail > 10)
//  3. sentence length: warn over 22 words (target 15)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = fileURLToPath(new URL("../", import.meta.url));
const J = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const BANNED = /\b(urgent(ly)?|immediately|act now|right away|deadly|catastroph\w*|devastat\w*|doom\w*|horrif\w*|terrif\w*|panic|alarming|apocalyp\w*|unprecedented|nightmare|brace yourself|time is running out|last chance)\b/i;
const ALLOW_CAPS = new Set("ENSO NOAA CPC WMO IRI USDM GPCP CHIRPS SMS GPS ECMWF SEAS5 CC BY UCSB CHC NCEI US UK ID OK PDF FAO GIEWS IBTrACS INFORM GDACS CAP CAMS FIRMS GloFAS DJF JFM FMA MAM AMJ MJJ JJA JAS ASO SON OND NDJ RTL JSON API ONI USA UN ICPAC SADC ASEAN ADM1 ADM2 C3S PNG GHACOF SARCOF EN LN".split(" "));
const texts = [];
const walk = (o, p = "") => { for (const [k, v] of Object.entries(o)) { if (k.startsWith("_")) continue; if (v && typeof v === "object" && !Array.isArray(v)) walk(v, p + k + "."); else if (typeof v === "string") texts.push([p + k, v]); } };
walk(J("i18n/en.json"));
const tele = J("data/curated/teleconnections.json");
for (const r of tele.regions) { texts.push([`tele.${r.id}.en`, r.el_nino.note]); texts.push([`tele.${r.id}.ln`, r.la_nina.note]); }
const syll = (w) => { w = w.toLowerCase().replace(/[^a-z]/g, ""); if (!w) return 0; const m = w.replace(/e$/, "").match(/[aeiouy]+/g); return Math.max(1, m ? m.length : 1); };
const problems = []; let words = 0, sentences = 0, syllables = 0;
for (const [key, t] of texts) {
  const clean = t.replace(/\{\w+\}/g, "X").replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "");
  if (/!/.test(t)) problems.push(`FAIL ${key}: exclamation mark`);
  const b = clean.match(BANNED); if (b) problems.push(`FAIL ${key}: banned urgency word "${b[0]}"`);
  for (const w of clean.match(/\b[A-Z]{3,}\b/g) || []) if (!ALLOW_CAPS.has(w)) problems.push(`FAIL ${key}: all-caps word "${w}"`);
  if (/\b\d+\s*(seconds|minutes|hours|days) (left|remaining)\b/i.test(clean)) problems.push(`FAIL ${key}: countdown phrasing`);
  for (const s of clean.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 2)) { const ws = s.trim().split(/\s+/); words += ws.length; sentences++; for (const w of ws) syllables += syll(w); if (ws.length > 22) problems.push(`warn ${key}: ${ws.length}-word sentence`); }
}
const fk = 0.39 * (words / Math.max(1, sentences)) + 11.8 * (syllables / Math.max(1, words)) - 15.59;
console.log(`editorial lint: ${texts.length} strings, ${sentences} sentences, ${(words / sentences).toFixed(1)} words/sentence, Flesch-Kincaid grade ${fk.toFixed(1)} (target ≤ 8, fail > 10)`);
if (fk > 10) problems.push(`FAIL reading level grade ${fk.toFixed(1)}`);
for (const p of problems) console.log("  " + p);
if (problems.some(p => p.startsWith("FAIL"))) { console.error("::error::editorial lint failed"); process.exit(1); }
