// Apply verified review fixes to language files, via i18n-diff apply (keeps _meta hashes and mt flags).
// Usage: node scripts/i18n-apply-fixes.js <fixes.json>
//   fixes.json: [{lang, overall, proposed, accepted: [{key, fix, severity, problem}]}]
// Also appends each language's review summary to docs/TRANSLATION_REVIEW.md for future native-speaker reviewers.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const ROOT = fileURLToPath(new URL("../", import.meta.url));
const results = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const en = JSON.parse(fs.readFileSync(path.join(ROOT, "i18n/en.json"), "utf8"));
const flat = (o, p = "") => { const out = {}; for (const [k, v] of Object.entries(o)) { if (k.startsWith("_")) continue; if (v && typeof v === "object" && !Array.isArray(v)) Object.assign(out, flat(v, p + k + ".")); else out[p + k] = v; } return out; };
const enF = flat(en);
const slots = (s) => (String(s).match(/\{(\w+)\}/g) || []).sort().join(",");
const logPath = path.join(ROOT, "docs/TRANSLATION_REVIEW.md");
let logText = fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8") : "# Translation review log\n\nAutomated second-pass reviews of machine-translated language files (two independent verifiers per fix). Every key stays flagged machine-translated until a native speaker reviews it.\n";
let total = 0;
for (const r of results) {
  const apply = {}; let skipped = 0;
  for (const f of r.accepted || []) {
    if (!(f.key in enF)) { skipped++; continue; }
    const src = Array.isArray(enF[f.key]) ? enF[f.key].join(" | ") : enF[f.key];
    if (slots(f.fix) !== slots(src)) { skipped++; continue; }
    apply[f.key] = Array.isArray(enF[f.key]) ? f.fix.split("|").map(s => s.trim()) : f.fix;
  }
  const n = Object.keys(apply).length; total += n;
  if (n) {
    const tmp = path.join(ROOT, `i18n/.${r.lang}.fixes.json`);
    fs.writeFileSync(tmp, JSON.stringify(apply));
    execFileSync("node", [path.join(ROOT, "scripts/i18n-diff.js"), r.lang, "apply", tmp], { stdio: "inherit" });
    fs.unlinkSync(tmp);
  }
  logText += `\n## ${r.lang} — ${new Date().toISOString().slice(0, 10)}\n\n${r.overall || ""}\n\nProposed ${r.proposed ?? "?"}, applied ${n}${skipped ? `, skipped ${skipped} (unknown key or placeholder mismatch)` : ""}.\n`;
  for (const f of r.accepted || []) if (f.key in apply) logText += `- \`${f.key}\` (${f.severity}): ${f.problem}\n`;
  console.log(`${r.lang}: applied ${n}${skipped ? `, skipped ${skipped}` : ""}`);
}
fs.mkdirSync(path.dirname(logPath), { recursive: true });
fs.writeFileSync(logPath, logText);
console.log(`total fixes applied: ${total}; log: docs/TRANSLATION_REVIEW.md`);
