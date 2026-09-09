// Annex D.7 acceptance tests, run against the built static index in site/geo (skipped if not built).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { norm, pickShard, rank, nearest, cellIdFor2deg, expand, topShard, placeKey } from "../src/search.js";
const ROOT = fileURLToPath(new URL("../", import.meta.url));
const GEO = path.join(ROOT, "geo-site");
const built = fs.existsSync(path.join(GEO, "index.json"));
const idx = built ? new Set(JSON.parse(fs.readFileSync(path.join(GEO, "index.json"), "utf8")).shards) : new Set();
const cache = {};
function search(q, limit = 8) {
  const n = norm(q); const sh = pickShard(n, idx); if (!sh) return rank(n, fs.existsSync(path.join(GEO, "top", topShard(n) + ".json")) ? JSON.parse(fs.readFileSync(path.join(GEO, "top", topShard(n) + ".json"), "utf8")) : [], limit);
  const rows = cache[sh] ||= expand(JSON.parse(fs.readFileSync(path.join(GEO, sh + ".json"), "utf8")));
  const tf = path.join(GEO, "top", topShard(n) + ".json");
  const major = fs.existsSync(tf) ? (cache["top:" + tf] ||= JSON.parse(fs.readFileSync(tf, "utf8"))) : [];
  return rank(n, [...rows, ...major], limit);
}
const top = (q) => search(q, 3).map(r => `${r[1]} (${r[2]})`);
// [query, expected country, expected admin1 substring or null]
const VILLAGES = [["Kakuma", "KE", "Turkana"], ["Wau", "SS", null], ["Goroka", "PG", null], ["Kundiawa", "PG", null], ["Tabubil", "PG", null],
  ["Timbuktu", "ML", null], ["Agadez", "NE", null], ["Maiduguri", "NG", "Borno"], ["Leticia", "CO", "Amazonas"], ["Tefé", "BR", "Amazonas"],
  ["Funafuti", "TV", null], ["Betio", "KI", null], ["Majuro", "MH", null], ["Namche Bazar", "NP", null], ["Jomsom", "NP", null],
  ["Lodwar", "KE", "Turkana"], ["Beledweyne", "SO", null], ["Gode", "ET", null], ["Chipata", "ZM", null], ["Tete", "MZ", null],
  ["Piura", "PE", null], ["Sullana", "PE", "Piura"], ["Iquitos", "PE", "Loreto"], ["Jayapura", "ID", null], ["Palangkaraya", "ID", null],
  ["Tacloban", "PH", null], ["Cotabato", "PH", null], ["Ca Mau", "VN", null], ["Battambang", "KH", null], ["Sittwe", "MM", null],
  ["Cox's Bazar", "BD", null], ["Barisal", "BD", null], ["Jacobabad", "PK", "Sindh"], ["Bhuj", "IN", "Gujarat"], ["Nuku'alofa", "TO", null],
  ["Luganville", "VU", null], ["Honiara", "SB", null], ["Labasa", "FJ", null], ["Toliara", "MG", null], ["Nacala", "MZ", null],
  ["Chinandega", "NI", null], ["Choluteca", "HN", null], ["Jérémie", "HT", null], ["Trujillo", "PE", null], ["Guayaquil", "EC", null],
  ["Alice Springs", "AU", null], ["Kununurra", "AU", null], ["Broken Hill", "AU", null], ["Oodnadatta", "AU", null], ["Tabora", "TZ", null]];
test("index built", { skip: !built }, () => { assert.ok(idx.size > 1000, "expected >1000 shards"); });
test("50-village world test: correct country (and admin1 where given) in top 3", { skip: !built }, () => {
  const fails = [];
  for (const [q, cc, a1] of VILLAGES) {
    const hits = search(q, 3);
    const ok = hits.some(r => r[2] === cc && (!a1 || (r[3] || "").includes(a1)));
    if (!ok) fails.push(`${q}: got ${top(q).join(", ")}`);
  }
  assert.deepEqual(fails, []);
});
test("script test: non-Latin queries resolve", { skip: !built }, () => {
  const cases = [["القاهرة", "EG"], ["አዲስ አበባ", "ET"], ["ရန်ကုန်", "MM"], ["กรุงเทพ", "TH"], ["मुंबई", "IN"], ["Хабаровск", "RU"], ["北京", "CN"], ["東京", "JP"], ["서울", "KR"], ["ঢাকা", "BD"]];
  const fails = cases.filter(([q, cc]) => !search(q, 3).some(r => r[2] === cc)).map(([q]) => `${q}: ${top(q).join(", ") || "no hits"}`);
  assert.deepEqual(fails, []);
});
test("typo test: misspellings resolve in top 3", { skip: !built }, () => {
  const cases = [["Nairoby", "KE"], ["Jakartta", "ID"], ["Manilla", "PH"], ["Adis Ababa", "ET"], ["Mombassa", "KE"], ["Limaa", "PE"], ["Kathmandoo", "NP"], ["Dhakka", "BD"], ["Sao Paolo", "BR"], ["Mogadisho", "SO"],
    ["Porto Alegre", "BR"], ["Guatamala", "GT"], ["Tegucigalpa", "HN"], ["Antananarivo", "MG"], ["Harrare", "ZW"], ["Lusakka", "ZM"], ["Maputo", "MZ"], ["Colombo", "LK"], ["Cebu", "PH"], ["Hanoi", "VN"]];
  const fails = cases.filter(([q, cc]) => !search(q, 3).some(r => r[2] === cc)).map(([q]) => `${q}: ${top(q).join(", ") || "no hits"}`);
  assert.deepEqual(fails, []);
});
test("ambiguity test: common names return several countries", { skip: !built }, () => {
  for (const q of ["Santa Cruz", "San José", "Springfield"]) {
    const ccs = new Set(search(q, 8).map(r => r[2]));
    assert.ok(ccs.size >= 3, `${q}: only ${[...ccs].join(",")}`);
  }
});
test("nowhere test: mid-ocean and remote pins still resolve to a cell, and 'near X' works on land", { skip: !built }, () => {
  const ocean = cellIdFor2deg(-30, -120); assert.match(ocean, /^[-+]\d{3}\.\d_[-+]\d{4}\.\d$/);
  const f = path.join(GEO, "near", cellIdFor2deg(7.7, 28.0) + ".json"); // near Wau, South Sudan
  assert.ok(fs.existsSync(f), "near-cell file for South Sudan");
  const nr = nearest(7.7, 28.0, JSON.parse(fs.readFileSync(f, "utf8")));
  assert.ok(nr && nr.place[1] === "SS", "nearest place is in South Sudan");
});
test("no duplicate places: one row per real-world place", { skip: !built }, () => {
  // GeoNames carries several ids for one city (Nairobi 184745 and the "Nairobi area" polygon 184742), which
  // used to render as two identical rows the user had to choose between.
  for (const q of ["Nairobi", "Jakarta", "Manila", "Lima", "Bangkok"]) {
    const seen = new Map();
    for (const r of search(q, 8)) {
      const k = placeKey(r);
      assert.ok(!seen.has(k), `${q}: "${r[1]}, ${r[2]}" (id ${r[8]}) duplicates id ${seen.get(k)}`);
      seen.set(k, r[8]);
    }
  }
});
test("a town name leads with the town, not the district that contains it", { skip: !built }, () => {
  // ADM1/ADM2 rows carry the whole district's population, which outranked the city inside them: "Piura"
  // led with "Departamento de Piura", "Jakarta" with "Daerah Khusus Ibukota Jakarta".
  for (const [q, cc] of [["Piura", "PE"], ["Jakarta", "ID"], ["Lima", "PE"], ["Nairobi", "KE"]]) {
    const first = search(q, 1)[0];
    assert.ok(first, `${q}: no hits`);
    assert.equal(norm(first[1]), norm(q), `${q}: led with "${first[1]}" (${first[2]})`);
    assert.equal(first[2], cc, `${q}: led with country ${first[2]}`);
  }
});
test("a short alternate name does not match a longer query", { skip: !built }, () => {
  // "nairo" is an alternate name of Gastello, Russia. Deletions alone must not bridge "nairobi" -> "nairo".
  assert.ok(!search("Nairobi", 8).some(r => r[2] === "RU"), "Gastello (RU) surfaced on a search for Nairobi");
  assert.ok(search("Nairo", 8).some(r => r[2] === "RU"), "Gastello should still match its own alternate name");
});
