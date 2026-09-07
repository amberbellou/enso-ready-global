// Location search over the static gazetteer shards (Annex D, static edition). Pure ES module: browser + Node tests.
// Entry: [key, name, cc, admin1, admin2, lat, lon, pop, id]
export function norm(s) {
  s = String(s || "").normalize("NFKC").trim().toLowerCase();
  if (/^[a-z0-9]/.test(s)) {
    s = s.normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^\x00-\x7f]/g, "");
    return s.replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  }
  return s.replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
}
export function shardKey(k, depth = 2) {
  if (!k) return null;
  if (/^[a-z0-9]/.test(k)) return k.slice(0, depth).replace(/\s/g, "_");
  const n = depth <= 2 ? 1 : Math.min(depth - 1, [...k].length);
  return "u" + [...k].slice(0, n).map(c => c.codePointAt(0).toString(16).padStart(4, "0")).join("_");
}
// Pick the shard file for a query, given index.json's shard list. Longest matching prefix wins.
export function pickShard(q, shards) {
  const set = shards instanceof Set ? shards : new Set(shards);
  for (const d of [6, 5, 4, 3, 2]) { if ([...q].length >= d || d === 2) { const k = shardKey(q, d); if (set.has(k)) return k; } }
  return null;
}
// Damerau-Levenshtein (optimal string alignment), early exit above max.
export function editDistance(a, b, max = 2) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev2 = [], prev = [], cur = [];
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i; let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v; if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    for (let j = 0; j <= b.length; j++) { prev2[j] = prev[j]; prev[j] = cur[j]; }
  }
  return prev[b.length];
}
// Rank entries for a normalized query. Exact prefix first, then fuzzy prefix (distance ≤ 1, or 2 for long queries), then population.
export function rank(q, rows, limit = 8) {
  const maxD = q.length >= 7 ? 2 : q.length >= 4 ? 1 : 0;
  const scored = new Map();
  for (const r of rows) {
    const k = r[0]; let score = null;
    if (k.startsWith(q)) score = 0;
    else if (maxD && Math.abs(k.length - q.length) <= maxD + 3) { const d = editDistance(q, k.slice(0, q.length), maxD); if (d <= maxD) score = d; }
    if (score === null) continue;
    const prevBest = scored.get(r[8]);
    if (!prevBest || score < prevBest.score) scored.set(r[8], { score, r });
  }
  // population-weighted: an exact big city beats a tiny exact match, a big city with one typo still shows near the top;
  // at most 3 results per country so ambiguous names ("Santa Cruz") show several countries
  const ranked = [...scored.values()].map(x => ({ r: x.r, w: x.score * 2.5 - Math.log10((x.r[7] || 0) + 1) - (x.r[3] ? 0 : 0.3) })).sort((a, b) => a.w - b.w);
  const out = [], perCc = {};
  for (const x of ranked) { const cc = x.r[2]; if ((perCc[cc] || 0) >= 3) continue; perCc[cc] = (perCc[cc] || 0) + 1; out.push(x.r); if (out.length >= limit) break; }
  return out;
}
export function label(r, countries) {
  const parts = [r[4], r[3], (countries && countries[r[2]] && countries[r[2]].name) || r[2]].filter(Boolean);
  return [...new Set(parts)].join(" — ");
}
export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = Math.PI / 180, dLat = (lat2 - lat1) * R, dLon = (lon2 - lon1) * R;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * R) * Math.cos(lat2 * R) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}
export function nearest(lat, lon, list) {
  let best = null, bd = 1e9;
  for (const p of list || []) { const d = haversineKm(lat, lon, p[3], p[4]); if (d < bd) { bd = d; best = p; } }
  return best ? { place: best, km: Math.round(bd) } : null;
}
// Grid cell id (must match scripts/build_gazetteer.py and the composites grid)
export function cellIdFor2deg(lat, lon) {
  let la = Math.round((lat + 1) / 2) * 2 - 1, lo = Math.round((lon + 1) / 2) * 2 - 1;
  la = Math.max(-89, Math.min(89, la)); lo = ((lo + 179) % 360 + 360) % 360 - 179;
  const s = (x, w) => (x < 0 ? "-" : "+") + Math.abs(x).toFixed(1).padStart(w, "0");
  return `${s(la, 5)}_${s(lo, 6)}`;
}
