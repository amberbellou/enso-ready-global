#!/usr/bin/env bash
# Manual deploy: build the site and force-push it as a single-commit gh-pages branch.
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/build-site.js
tmp=$(mktemp -d)
cp -R site/. "$tmp"/
( cd "$tmp" && git init -q && git checkout -q -b gh-pages && git add -A \
  && git -c user.name="enso-ready-deploy" -c user.email="amberbellou@gmail.com" commit -qm "deploy $(date -u +%Y-%m-%d)" \
  && git push -f -q "https://github.com/amberbellou/enso-ready-global.git" gh-pages )
rm -rf "$tmp"
echo "deployed gh-pages"
