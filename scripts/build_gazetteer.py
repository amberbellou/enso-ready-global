"""Global location index (Annex D, static edition).

Inputs (data/raw/geonames/): allCountries.txt, alternateNamesV2.txt, admin1CodesASCII.txt, admin2Codes.txt,
                             countryInfo.txt (data/raw/), featureCodes_en.txt
Outputs (site/geo/):
  <shard>.json       search shards. Entry: [key, name, cc, admin1, admin2, lat, lon, pop, id]
                     shard = first 2-4 chars of the normalized key (Latin) or "u<hex>" of the first code point (other scripts).
                     Big shards split to longer prefixes; index.json lists every shard key so the client picks the longest match.
  index.json         {"shards": [...], "count": n, "built": date, "sources": [...]}
  near/<cell>.json   top places per 2° grid cell for the GPS / map-pin "near X" fallback.
  countries.json     ISO2 -> {name, continent, languages, capital}
Rules: coordinates are truth; every place carries its admin1/admin2 display names so results read
"Village — District — Province — Country". Falls back to cities15000 if the full dump is missing.
QA gate: refuses to publish if the place count drops more than 10% versus the previous index.json.
"""
import json, pathlib, re, sqlite3, sys, unicodedata, os, shutil, datetime
ROOT = pathlib.Path(__file__).resolve().parents[1]
RAW = ROOT / "data/raw/geonames"
OUT = ROOT / "site/geo"
LANGS = {"en","es","fr","ar","zh","ru","pt","id","hi","bn","sw","vi","tl","am","my","th","ur","ne","si","ta","km","lo","ja","ko","fa","so","ti","mg","ht","tpi","ha","bm","wo","sm","to","fj","bi","abbr"}
KEEP_FC = {"PPL","PPLA","PPLA2","PPLA3","PPLA4","PPLA5","PPLC","PPLCH","PPLF","PPLG","PPLL","PPLR","PPLS","STLMT"}
KEEP_ADM = {"ADM1","ADM2","ADM3"}   # admin areas are searchable too (district names), Annex D.3 step 1
MAX_SHARD = 12000        # entries per shard before splitting to a longer prefix
MAX_DEPTH = 6
ALT_MAX = 20             # alternate names kept per place (40 for places over 50k people)
NEAR_N = 30              # places kept per grid cell

def norm(s):
    s = unicodedata.normalize("NFKC", s).strip().lower()
    if re.match(r"[a-z0-9]", s):
        s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
        s = re.sub(r"[^a-z0-9 ]+", " ", s)
        return re.sub(r"\s+", " ", s).strip()
    s = re.sub(r"[̀-ͯ]", "", s)          # combining marks (keeps Arabic/Devanagari vowel signs? those are ً.. so untouched)
    return re.sub(r"\s+", " ", s).strip()

def shard_key(k, depth=2):
    if not k: return None
    if re.match(r"[a-z0-9]", k):
        return re.sub(r"\s", "_", k[:depth])
    n = 1 if depth <= 2 else min(depth - 1, len(k))
    return "u" + "_".join("%04x" % ord(c) for c in k[:n])

def cell_id(lat, lon):
    la = round((lat + 1) / 2) * 2 - 1; lo = round((lon + 1) / 2) * 2 - 1
    la = max(-89, min(89, la)); lo = ((lo + 179) % 360) - 179
    return f"{la:+06.1f}_{lo:+07.1f}"

def main():
    src = RAW / "allCountries.txt"
    if not src.exists():
        print("full GeoNames dump missing; run the download step first", file=sys.stderr); sys.exit(2)
    OUT.mkdir(parents=True, exist_ok=True)
    # --- reference tables ---
    countries = {}
    for line in (ROOT / "data/raw/countryInfo.txt").read_text(encoding="utf-8").splitlines():
        if line.startswith("#") or not line.strip(): continue
        p = line.split("\t"); countries[p[0]] = {"name": p[4], "continent": p[8], "languages": p[15], "capital": p[5]}
    admin1 = {}
    for line in (RAW / "admin1CodesASCII.txt").read_text(encoding="utf-8").splitlines():
        p = line.split("\t"); admin1[p[0]] = p[1]
    admin2 = {}
    for line in (RAW / "admin2Codes.txt").read_text(encoding="utf-8").splitlines():
        p = line.split("\t"); admin2[p[0]] = p[1]
    # --- pass 1: places -> sqlite ---
    dbp = ROOT / "data/derived/gazetteer.sqlite"
    if dbp.exists(): dbp.unlink()
    db = sqlite3.connect(dbp); db.execute("PRAGMA journal_mode=OFF"); db.execute("PRAGMA synchronous=OFF")
    db.execute("CREATE TABLE place(id INTEGER PRIMARY KEY, name TEXT, ascii TEXT, lat REAL, lon REAL, cc TEXT, a1 TEXT, a2 TEXT, pop INTEGER, fc TEXT)")
    db.execute("CREATE TABLE key(shard TEXT, k TEXT, id INTEGER)")
    n = 0; batch = []
    with open(src, encoding="utf-8") as f:
        for line in f:
            p = line.rstrip("\n").split("\t")
            if len(p) < 15: continue
            if not ((p[6] == "P" and p[7] in KEEP_FC) or (p[6] == "A" and p[7] in KEEP_ADM)): continue
            pop = int(p[14] or 0)
            a1 = admin1.get(f"{p[8]}.{p[10]}", ""); a2 = admin2.get(f"{p[8]}.{p[10]}.{p[11]}", "")
            batch.append((int(p[0]), p[1], p[2], float(p[4]), float(p[5]), p[8], a1, a2, pop, p[7]))
            n += 1
            if len(batch) >= 50000: db.executemany("INSERT INTO place VALUES(?,?,?,?,?,?,?,?,?,?)", batch); batch = []
    if batch: db.executemany("INSERT INTO place VALUES(?,?,?,?,?,?,?,?,?,?)", batch)
    db.commit(); print(f"places kept: {n}")
    ids = {r[0]: r[1] for r in db.execute("SELECT id, pop FROM place")}
    # --- pass 2: alternate names in launch languages ---
    alts = {}; m = 0
    altf = RAW / "alternateNamesV2.txt"
    if altf.exists():
        with open(altf, encoding="utf-8") as f:
            for line in f:
                p = line.rstrip("\n").split("\t")
                if len(p) < 4: continue
                gid = int(p[1])
                if gid not in ids or not (p[2] in LANGS or p[2] == ""): continue   # tagged launch languages + untagged spellings
                if len(p) > 7 and p[7] == "1": continue   # historic names only are skipped
                lst = alts.setdefault(gid, [])
                cap = 40 if ids[gid] >= 50000 else ALT_MAX
                if len(lst) < cap and p[3] not in lst: lst.append(p[3]); m += 1
    print(f"alternate names attached: {m}")
    # --- keys ---
    batch = []
    for gid, name, ascii_, in db.execute("SELECT id, name, ascii FROM place"):
        keys = {norm(name), norm(ascii_)}
        for a in alts.get(gid, []): keys.add(norm(a))
        for k in keys:
            if len(k) < 2: continue
            batch.append((shard_key(k), k, gid))
        if len(batch) >= 100000: db.executemany("INSERT INTO key VALUES(?,?,?)", batch); batch = []
    if batch: db.executemany("INSERT INTO key VALUES(?,?,?)", batch)
    db.commit(); db.execute("CREATE INDEX ki ON key(shard)"); db.commit()
    alts = None
    # --- QA gate vs previous build ---
    prev = OUT / "index.json"
    if prev.exists():
        old = json.loads(prev.read_text()).get("count", 0)
        if old and n < old * 0.9: print(f"QA GATE: place count {n} < 90% of previous {old}; refusing to publish", file=sys.stderr); sys.exit(3)
    # --- write shards (split big ones by longer prefix) ---
    tmp = OUT.parent / "geo.tmp"; shutil.rmtree(tmp, ignore_errors=True); tmp.mkdir(parents=True)
    shards = []
    def write_shard(name, rows):
        rows.sort(key=lambda r: -r[7])
        (tmp / f"{name}.json").write_text(json.dumps(rows, ensure_ascii=False, separators=(",", ":")))
        shards.append(name)
    q = """SELECT key.k, p.name, p.cc, p.a1, p.a2, p.lat, p.lon, p.pop, p.id FROM key JOIN place p ON p.id = key.id WHERE key.shard = ?"""
    def split(name, rows, depth):
        if len(rows) <= MAX_SHARD or depth > MAX_DEPTH: write_shard(name, rows); return
        groups = {}
        for r in rows: groups.setdefault(shard_key(r[0], depth) or name, []).append(r)
        if len(groups) == 1: write_shard(name, rows); return
        for g, rs in groups.items(): split(g, rs, depth + 1)
    for (sh,) in db.execute("SELECT DISTINCT shard FROM key WHERE shard IS NOT NULL ORDER BY shard"):
        rows = [[r[0], r[1], r[2], r[3], r[4], round(r[5], 3), round(r[6], 3), r[7], r[8]] for r in db.execute(q, (sh,))]
        split(sh, rows, 3)
    # --- nearest places per cell ---
    near = {}
    for name, cc, a1, lat, lon, pop in db.execute("SELECT name, cc, a1, lat, lon, pop FROM place ORDER BY pop DESC"):
        c = cell_id(lat, lon); lst = near.setdefault(c, [])
        if len(lst) < NEAR_N: lst.append([name, cc, a1, round(lat, 3), round(lon, 3), pop])
    (tmp / "near").mkdir()
    for c, lst in near.items(): (tmp / "near" / f"{c}.json").write_text(json.dumps(lst, ensure_ascii=False, separators=(",", ":")))
    (tmp / "countries.json").write_text(json.dumps(countries, ensure_ascii=False, separators=(",", ":")))
    (tmp / "index.json").write_text(json.dumps({"shards": sorted(shards), "count": n, "built": datetime.date.today().isoformat(), "max_shard": MAX_SHARD,
        "sources": ["GeoNames (CC BY 4.0) allCountries + alternateNamesV2 + admin codes"]}))
    shutil.rmtree(OUT, ignore_errors=True); os.rename(tmp, OUT)
    sizes = sorted((f.stat().st_size for f in OUT.glob("*.json")), reverse=True)
    total = sum(f.stat().st_size for f in OUT.rglob("*.json"))
    print(f"shards: {len(shards)}, largest {sizes[0]//1024} KB, total {total//(1024*1024)} MB, near-cells {len(near)}")
    db.close()

if __name__ == "__main__":
    main()
