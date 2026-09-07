// Keep generated sections of i18n/en.json in step with the curated data files:
//   steps.<id>.text / .why   from data/curated/prep_checklists.json
//   regions.<id>.name / .note from data/curated/teleconnections.json
//   local_seasons.<english>   from data/curated/countries/*.json
// Run before translating. English data files stay the source of truth; other languages get these keys via translate.py.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = fileURLToPath(new URL("../", import.meta.url));
const J = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const en = J("i18n/en.json");
const ck = J("data/curated/prep_checklists.json"); const tele = J("data/curated/teleconnections.json");
en.steps = {};
for (const list of [...Object.values(ck.hazards), ck.always]) for (const s of list) en.steps[s.id] = { text: s.text, why: s.why };
en.regions = {};
for (const r of tele.regions) en.regions[r.id] = { name: r.name, el_nino_note: r.el_nino.note, la_nina_note: r.la_nina.note };
en.local_seasons = {};
const cdir = path.join(ROOT, "data/curated/countries");
for (const f of fs.readdirSync(cdir)) for (const v of Object.values(J("data/curated/countries/" + f).season_names || {})) en.local_seasons[v] = v;
fs.writeFileSync(path.join(ROOT, "i18n/en.json"), JSON.stringify(en, null, 2));
console.log(`en.json synced: ${Object.keys(en.steps).length} steps, ${Object.keys(en.regions).length} regions, ${Object.keys(en.local_seasons).length} local seasons`);
