// Native-speaker review kit: one CSV per language (key, English, current translation, status) that a reviewer
// can edit in any spreadsheet; import with: node scripts/i18n-review-kit.js import <lang> <file.csv>
// Imported rows are marked mt:false (reviewed). When no mt:true keys remain, the language's _status becomes "reviewed".
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"; import { execFileSync } from "node:child_process";
const ROOT = fileURLToPath(new URL("../", import.meta.url));
const J = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const flat = (o, p = "") => { const out = {}; for (const [k, v] of Object.entries(o)) { if (k.startsWith("_")) continue; if (v && typeof v === "object" && !Array.isArray(v)) Object.assign(out, flat(v, p + k + ".")); else out[p + k] = Array.isArray(v) ? v.join(" | ") : v; } return out; };
const csvq = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
const [mode, lang, file] = process.argv.slice(2);
const en = flat(J("i18n/en.json"));
if (mode === "import") {
  const rows = fs.readFileSync(file, "utf8").split(/\r?\n/).slice(1).filter(Boolean).map(l => { const m = [...l.matchAll(/"((?:[^"]|"")*)"/g)].map(x => x[1].replace(/""/g, '"')); return m; });
  const tr = {}; for (const [key, , translation] of rows) if (key in en && translation && translation.trim()) tr[key] = translation.trim();
  const tmp = path.join(ROOT, `i18n/.${lang}.review.json`); fs.writeFileSync(tmp, JSON.stringify(tr));
  execFileSync("node", [path.join(ROOT, "scripts/i18n-diff.js"), lang, "apply", tmp], { stdio: "inherit" }); fs.unlinkSync(tmp);
  const f = path.join(ROOT, `i18n/${lang}.json`); const d = JSON.parse(fs.readFileSync(f, "utf8"));
  for (const k of Object.keys(tr)) if (d._meta[k]) d._meta[k].mt = false;
  if (!Object.values(d._meta).some(m => m.mt)) d._status = "reviewed";
  fs.writeFileSync(f, JSON.stringify(d, null, 2)); console.log(`${lang}: ${Object.keys(tr).length} reviewed keys imported; status ${d._status}`);
} else {
  const langs = fs.readdirSync(path.join(ROOT, "i18n")).filter(f => f.endsWith(".json") && f !== "en.json").map(f => f.replace(".json", ""));
  for (const l of langs) {
    const d = J(`i18n/${l}.json`); const cur = flat(d);
    const lines = ["key,english,translation,status"]; for (const k of Object.keys(en)) lines.push([k, en[k], cur[k] ?? "", (d._meta || {})[k] ? ((d._meta[k].mt) ? "machine" : "reviewed") : "pending"].map(csvq).join(","));
    fs.writeFileSync(path.join(ROOT, `i18n/review/${l}.csv`), "﻿" + lines.join("\n"));
  }
  console.log(`review sheets: ${langs.length} languages in i18n/review/`);
}
