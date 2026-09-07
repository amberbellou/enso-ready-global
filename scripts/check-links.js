// Link checker for source URLs in curated data, DATA_SOURCES.md and met services. Reports; exits 1 only with LINKS_STRICT=1.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = fileURLToPath(new URL("../", import.meta.url));
const J = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const urls = new Map(); const add = (u, w) => { if (/^https?:\/\//.test(u || "")) urls.set(u, w); };
const tele = J("data/curated/teleconnections.json"); for (const [k, u] of Object.entries(tele._sources)) add(u, "tele." + k);
for (const r of tele.regions) for (const c of r.citations || []) add(c.url, "tele." + r.id);
const met = J("data/curated/met_services.json"); for (const [cc, s] of Object.entries(met.services)) add(s.url, "met." + cc); add(met.fallback.url, "met.fallback");
for (const m of fs.readFileSync(path.join(ROOT, "DATA_SOURCES.md"), "utf8").matchAll(/https?:\/\/[^\s|)`]+/g)) add(m[0].replace(/[.,]$/, ""), "DATA_SOURCES.md");
const check = async (u) => { for (const method of ["HEAD", "GET"]) { try { const r = await fetch(u, { method, redirect: "follow", signal: AbortSignal.timeout(20000), headers: { "user-agent": "enso-ready-global link check" } }); if (r.status < 400 || (method === "GET")) return { ok: r.status < 400, status: r.status }; } catch (e) { if (method === "GET") return { ok: false, status: e.name }; } } };
const list = [...urls.entries()]; const results = [];
for (let i = 0; i < list.length; i += 8) await Promise.all(list.slice(i, i + 8).map(async ([u, w]) => { let r = await check(u); if (!r.ok) r = await check(u); results.push({ url: u, where: w, ...r }); }));
const bad = results.filter(r => !r.ok);
console.log(`link check: ${results.length} URLs, ${bad.length} failing`); for (const b of bad) console.log(`  ${b.status}  ${b.url}  (${b.where})`);
fs.writeFileSync(path.join(ROOT, "data/derived/link_check.json"), JSON.stringify({ checked_at: new Date().toISOString(), results }, null, 1));
if (bad.length && process.env.LINKS_STRICT) process.exit(1);
