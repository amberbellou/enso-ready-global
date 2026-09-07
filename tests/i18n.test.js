// Every language file must cover every key in en.json (recursively) with matching {slot} names,
// and every string key the engine/client references must exist in en.json. (PRISM + IFRC GO ideas.)
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = fileURLToPath(new URL("../", import.meta.url));
const en = JSON.parse(fs.readFileSync(path.join(ROOT, "i18n/en.json"), "utf8"));
const slots = (s) => (String(s).match(/\{(\w+)\}/g) || []).sort().join(",");
function flat(o, p = "") { const out = {}; for (const [k, v] of Object.entries(o)) { if (k.startsWith("_")) continue; if (v && typeof v === "object" && !Array.isArray(v)) Object.assign(out, flat(v, p + k + ".")); else out[p + k] = v; } return out; }
const enFlat = flat(en);
test("every language covers every English key with the same slots", () => {
  for (const f of fs.readdirSync(path.join(ROOT, "i18n"))) {
    if (!f.endsWith(".json") || f === "en.json") continue;
    const L = flat(JSON.parse(fs.readFileSync(path.join(ROOT, "i18n", f), "utf8")));
    const missing = Object.keys(enFlat).filter(k => !(k in L) && !k.startsWith("steps.") && !k.startsWith("local_seasons."));
    assert.deepEqual(missing, [], `${f} missing keys`);
    for (const k of Object.keys(L)) if (k in enFlat && typeof enFlat[k] === "string") assert.equal(slots(L[k]), slots(enFlat[k]), `${f}:${k} slot mismatch`);
  }
});
test("keys referenced in engine.js and app.js exist in en.json", () => {
  const eng = fs.readFileSync(path.join(ROOT, "src/engine.js"), "utf8");
  const app = fs.readFileSync(path.join(ROOT, "src/app.js"), "utf8");
  const used = new Set([...eng.matchAll(/\bS\.([a-z_]+)\b/g)].map(m => m[1]).filter(k => !["months", "hazards", "steps", "local_seasons", "ui"].includes(k)));
  for (const k of used) assert.ok(k in en, `engine uses S.${k} but en.json lacks it`);
  for (const m of app.matchAll(/\bui\("([a-z_]+)"\s*[,)]/g)) assert.ok(m[1] in en.ui, `app uses ui("${m[1]}") but en.json.ui lacks it`);
});
test("hazard codes in curated data all have English labels", () => {
  const tele = JSON.parse(fs.readFileSync(path.join(ROOT, "data/curated/teleconnections.json"), "utf8"));
  const ck = JSON.parse(fs.readFileSync(path.join(ROOT, "data/curated/prep_checklists.json"), "utf8"));
  const codes = new Set(Object.keys(ck.hazards));
  for (const r of tele.regions) for (const ph of ["el_nino", "la_nina"]) for (const h of r[ph].hazards) { assert.ok(en.hazards[h], `no label for hazard ${h}`); assert.ok(codes.has(h), `no checklist for hazard ${h} (${r.id})`); }
});
