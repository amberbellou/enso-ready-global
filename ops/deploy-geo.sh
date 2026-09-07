#!/usr/bin/env bash
# Quarterly gazetteer deploy (Annex D): force-push geo-site/ as a single-commit gh-pages branch of amberbellou/enso-ready-geo.
set -euo pipefail
cd "$(dirname "$0")/.."
[ -s geo-site/index.json ] || { echo "geo-site/ not built; run scripts/build_gazetteer.py"; exit 1; }
tmp=$(mktemp -d)
cp -R geo-site/. "$tmp"/
printf 'ENSO Ready Global location index. Built from GeoNames (CC BY 4.0). Served for https://amberbellou.github.io/enso-ready-global/. See that repo.\n' > "$tmp/README.md"
touch "$tmp/.nojekyll"
( cd "$tmp" && git init -q && git checkout -q -b gh-pages && git add -A \
  && git -c user.name="enso-ready-deploy" -c user.email="amberbellou@gmail.com" commit -qm "gazetteer $(date -u +%Y-%m-%d)" \
  && git push -f -q "https://github.com/amberbellou/enso-ready-geo.git" gh-pages )
rm -rf "$tmp"
echo "deployed enso-ready-geo"
