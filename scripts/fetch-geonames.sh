#!/usr/bin/env bash
# Fetch the GeoNames gazetteer inputs (CC BY 4.0, https://www.geonames.org/). Full dumps (~625 MB zipped) for Annex D.
set -euo pipefail
cd "$(dirname "$0")/../data/raw"
curl -sSf -o countryInfo.txt https://download.geonames.org/export/dump/countryInfo.txt
mkdir -p geonames && cd geonames
for f in allCountries.zip alternateNamesV2.zip admin1CodesASCII.txt admin2Codes.txt; do
  [ -s "$f" ] || curl -sSf -o "$f" "https://download.geonames.org/export/dump/$f"
done
[ -s allCountries.txt ] || unzip -oq allCountries.zip
[ -s alternateNamesV2.txt ] || unzip -oq alternateNamesV2.zip
echo "geonames: $(wc -l < allCountries.txt) features, $(wc -l < alternateNamesV2.txt) alternate names"
