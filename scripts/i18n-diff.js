// Translation delta tool (IFRC GO "translation migrations" idea, simplified).
// Usage: node scripts/i18n-diff.js <lang>        -> prints JSON of keys needing (re)translation
//        node scripts/i18n-diff.js <lang> apply <translated.json>  -> merges translations, stamps hashes + mt flags
// Each language file keeps _meta[key] = { hash: <hash of English source>, mt: true|false }.
// A key needs translation when it is missing or its English source hash changed. Reviewed keys (mt:false)
// keep their translation but are re-flagged mt:true if the source changed.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
const ROOT = fileURLToPath(new URL("../", import.meta.url));
const [lang, mode, file] = process.argv.slice(2);
if (!lang) { console.error("usage: i18n-diff.js <lang> [apply <translated.json>]"); process.exit(1); }
const en = JSON.parse(fs.readFileSync(path.join(ROOT, "i18n/en.json"), "utf8"));
const H = (s) => crypto.createHash("sha1").update(String(s)).digest("hex").slice(0, 10);
const flat = (o, p = "") => { const out = {}; for (const [k, v] of Object.entries(o)) { if (k.startsWith("_")) continue; if (v && typeof v === "object" && !Array.isArray(v)) Object.assign(out, flat(v, p + k + ".")); else out[p + k] = v; } return out; };
const unflat = (f) => { const o = {}; for (const [k, v] of Object.entries(f)) { const parts = k.split("."); let cur = o; parts.slice(0, -1).forEach(p => cur = (cur[p] ||= {})); cur[parts.at(-1)] = v; } return o; };
const target = path.join(ROOT, `i18n/${lang}.json`);
const existing = fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, "utf8")) : { _lang: lang, _status: "machine", _meta: {} };
const meta = existing._meta || {};
const enF = flat(en), curF = flat(existing);
if (mode !== "apply") {
  const need = {};
  for (const [k, v] of Object.entries(enF)) { if (typeof v !== "string") continue; if (!(k in curF) || !meta[k] || meta[k].hash !== H(v)) need[k] = v; }
  const stale = Object.keys(curF).filter(k => !(k in enF));
  process.stdout.write(JSON.stringify({ lang, needs_translation: need, stale_keys: stale, count: Object.keys(need).length }, null, 1));
} else {
  const tr = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const [k, v] of Object.entries(tr)) { if (!(k in enF)) continue; curF[k] = v; meta[k] = { hash: H(enF[k]), mt: true }; }
  for (const k of Object.keys(curF)) if (!(k in enF)) { delete curF[k]; delete meta[k]; }
  for (const [k, v] of Object.entries(enF)) if (typeof v !== "string") curF[k] = v; // arrays like months copied if untranslated? keep explicit
  const out = { _lang: lang, _name: existing._name || lang, _dir: existing._dir || "ltr", _status: existing._status || "machine", ...unflat(curF), _meta: meta };
  fs.writeFileSync(target, JSON.stringify(out, null, 2));
  console.log(`wrote ${target}: ${Object.keys(tr).length} keys applied`);
}
