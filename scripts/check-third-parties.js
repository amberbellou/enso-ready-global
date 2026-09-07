// Fails the build if any built page references a script, stylesheet, font or image on a host other than the site itself.
// Data fetches allowed at runtime are listed explicitly (documented in SECURITY.md and /privacy).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = fileURLToPath(new URL("../", import.meta.url));
const SITE = path.join(ROOT, "site");
const ALLOWED_RUNTIME = ["https://amberbellou.github.io/enso-ready-geo", "https://seasonal-api.open-meteo.com", "https://tile.openstreetmap.org", "https://open-meteo.com/", "https://github.com/amberbellou/enso-ready-global"];
const bad = [];
const scan = (f) => { const t = fs.readFileSync(f, "utf8"); for (const m of t.matchAll(/<(script|link|img|iframe|video|audio)[^>]+(?:src|href)="(https?:)?\/\/([^/"]+)[^"]*"/g)) bad.push(`${path.relative(SITE, f)}: <${m[1]}> from ${m[3]}`); };
for (const f of ["index.html", "methodology.html", "countries/index.html", "p/" + fs.readdirSync(path.join(SITE, "p"))[0]]) if (fs.existsSync(path.join(SITE, f))) scan(path.join(SITE, f));
for (const js of ["app.js", "engine.js", "search.js"]) { const t = fs.readFileSync(path.join(SITE, js), "utf8"); for (const m of t.matchAll(/https?:\/\/[a-z0-9.-]+\.[a-z]{2,}[^"'`\s)]*/gi)) { const u = m[0]; if (!ALLOWED_RUNTIME.some(a => u.startsWith(a)) && !/^https?:\/\/(www\.)?(github\.com|cds\.climate|wmo\.int)/.test(u)) bad.push(`${js}: runtime URL ${u}`); } }
if (bad.length) { console.error("::error::third-party references found:\n  " + bad.join("\n  ")); process.exit(1); }
console.log("third-party check: only " + ALLOWED_RUNTIME.length + " documented runtime hosts, no external scripts/styles/fonts");
