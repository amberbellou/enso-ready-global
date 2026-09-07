#!/usr/bin/env bash
# Fetch the GeoNames gazetteer inputs (CC BY 4.0, https://www.geonames.org/).
set -euo pipefail
cd "$(dirname "$0")/../data/raw"
curl -sSf -o cities15000.zip https://download.geonames.org/export/dump/cities15000.zip
curl -sSf -o countryInfo.txt https://download.geonames.org/export/dump/countryInfo.txt
unzip -oq cities15000.zip
echo "geonames: $(wc -l < cities15000.txt) places"
