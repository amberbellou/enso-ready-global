// Ingest the current global ENSO status from NOAA CPC's ENSO Diagnostic Discussion.
// Validates the parse (dead-man's switch): if any required field is missing the
// previous data/derived/enso_status.json is kept and the process exits non-zero.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "data/derived/enso_status.json");
const URL = "https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.shtml";

function decode(s) {
  return s.replace(/&ntilde;/g, "ñ").replace(/&Ntilde;/g, "Ñ").replace(/&#37;/g, "%")
    .replace(/&deg;/g, "°").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"');
}
function textOf(html) {
  return decode(html.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, "\n"))
    .split("\n").map(s => s.trim()).filter(Boolean);
}
export function parse(html) {
  const lines = textOf(html);
  const find = (re) => lines.find(l => re.test(l));
  const status = lines[lines.findIndex(l => /ENSO Alert System Status/i.test(l)) + 1];
  const synopsis = lines[lines.findIndex(l => /^Synopsis:?$/i.test(l)) + 1];
  const issued = find(/^\d{1,2} [A-Z][a-z]+ \d{4}$/);
  const probLine = lines.find(l => /chance/i.test(l) && /%/.test(l));
  const prob = probLine ? (probLine.match(/(\d{2,3})\s?%/) || [])[1] : null;
  let phase = "neutral";
  if (/El Niño/i.test(status || "")) phase = "el_nino";
  else if (/La Niña/i.test(status || "")) phase = "la_nina";
  const level = /Advisory/i.test(status || "") ? "advisory" : /Watch/i.test(status || "") ? "watch" : "none";
  const strengthWord = (synopsis || "").match(/(very strong|strong|moderate|weak)/i);
  return {
    source: "NOAA Climate Prediction Center, ENSO Diagnostic Discussion",
    source_url: URL,
    issued, status, phase, level,
    expected_strength: strengthWord ? strengthWord[1].toLowerCase() : null,
    headline_probability_pct: prob ? Number(prob) : null,
    synopsis,
    fetched_at: new Date().toISOString(),
  };
}
function validate(s) {
  const problems = [];
  if (!s.issued) problems.push("issued date missing");
  if (!s.status) problems.push("status line missing");
  if (!s.synopsis || s.synopsis.length < 20) problems.push("synopsis missing");
  if (s.headline_probability_pct !== null && (s.headline_probability_pct < 0 || s.headline_probability_pct > 100)) problems.push("probability out of bounds");
  return problems;
}
async function main() {
  let html;
  const local = process.argv[2];
  if (local) html = fs.readFileSync(local, "utf8");
  else {
    const r = await fetch(URL, { headers: { "user-agent": "enso-ready-global/0.1 (open-source civic project)" } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    html = await r.text();
  }
  const s = parse(html);
  const problems = validate(s);
  if (problems.length) {
    console.error("VALIDATION FAILED, keeping last-good file:", problems.join("; "));
    process.exit(2);
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(s, null, 1));
  console.log("wrote", OUT, "\n", JSON.stringify(s, null, 1));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch(e => { console.error(e); process.exit(1); });
