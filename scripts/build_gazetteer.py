"""Build a sharded place-search index from GeoNames cities15000.txt.

Output: site/geo/<shard>.json  where shard = first 2 letters of the normalized
ASCII name (a-z, else '_'). Each entry: [name, country_code, admin1, lat, lon, pop].
Also site/geo/countries.json: {cc: {name, continent, languages, capital}}.
Client loads only the shard for what the user typed -> tiny transfers on 2G.
"""
import json, pathlib, re, unicodedata
ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = ROOT / "data/raw/cities15000.txt"
CI = ROOT / "data/raw/countryInfo.txt"
OUT = ROOT / "site/geo"
OUT.mkdir(parents=True, exist_ok=True)

def norm(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9 ]", "", s).strip()

countries = {}
for line in CI.read_text(encoding="utf-8").splitlines():
    if line.startswith("#") or not line.strip(): continue
    p = line.split("\t")
    countries[p[0]] = {"name": p[4], "continent": p[8], "languages": p[15], "capital": p[5]}
(OUT / "countries.json").write_text(json.dumps(countries, ensure_ascii=False, separators=(",", ":")))

shards = {}
n = 0
for line in SRC.read_text(encoding="utf-8").splitlines():
    p = line.split("\t")
    name, ascii_name, alts = p[1], p[2], p[3]
    lat, lon, cc, pop = float(p[4]), float(p[5]), p[8], int(p[14] or 0)
    admin1 = p[10]
    entry = [name, cc, round(lat, 3), round(lon, 3), pop]
    # index under the display name and the ascii name; alt names only for big places
    keys = {norm(name), norm(ascii_name)}
    if pop >= 100000:
        for a in alts.split(",")[:40]:
            k = norm(a)
            if len(k) >= 3: keys.add(k)
    for k in keys:
        if len(k) < 2: continue
        shard = k[:2] if re.fullmatch(r"[a-z0-9]{2}", k[:2]) else "_"
        shards.setdefault(shard, []).append([k] + entry)
    n += 1

for shard, rows in shards.items():
    rows.sort(key=lambda r: -r[5])
    # de-dup identical (key, name, cc)
    seen, out = set(), []
    for r in rows:
        t = (r[0], r[1], r[2])
        if t in seen: continue
        seen.add(t); out.append(r)
    (OUT / f"{shard}.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
sizes = sorted(((f.stat().st_size, f.name) for f in OUT.glob("*.json")), reverse=True)
print(f"{n} places, {len(shards)} shards; largest:", sizes[:4])
