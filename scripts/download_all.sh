#!/usr/bin/env bash
set -euo pipefail

SITE=${1:-${NEXT_PUBLIC_SITE_URL:-https://stats.tennismylife.org}}
OUTDIR=${2:-tml-data}

echo "Fetching file list from $SITE/api/data-files"

# prefer jq, fallback to python
if command -v jq >/dev/null 2>&1; then
  mkdir -p "$OUTDIR"
  curl -s "$SITE/api/data-files" | jq -r '.files[] | "\(.url)\t\(.name)"' | while IFS=$'\t' read -r url name; do
    echo "Downloading $name..."
    curl -sSL "$url" -o "$OUTDIR/$name"
  done
else
  # fallback to python
  python - <<PY
import sys, json, urllib.request
site = sys.argv[1]
outdir = sys.argv[2]
import os
os.makedirs(outdir, exist_ok=True)
resp = json.load(urllib.request.urlopen(site + '/api/data-files'))
for f in resp.get('files', []):
    url = f['url']; name = f['name']
    print('Downloading', name)
    try:
        urllib.request.urlretrieve(url, os.path.join(outdir, name))
    except Exception as e:
        print('Failed to download', name, e)
PY
fi

echo "Done. Files saved to: $OUTDIR"