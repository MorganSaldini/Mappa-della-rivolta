#!/usr/bin/env bash
# Prepara la copia della mappa da mettere sugli specchi, nella cartella indicata (default: _site).
# Toglie quello che sugli specchi non serve o non funziona: area moderatori, guide .md, regole _headers di Cloudflare.
set -euo pipefail
DEST="${1:-_site}"
rm -rf "$DEST"
mkdir -p "$DEST"
cp -R public/. "$DEST"/
rm -f "$DEST"/modera.html "$DEST"/modera.js "$DEST"/modera.css "$DEST"/_headers
find "$DEST" -name '*.md' -delete
# Nessun "Jekyll" su GitHub Pages: i file si servono così come sono
touch "$DEST/.nojekyll"
echo "Copia pronta in $DEST ($(find "$DEST" -type f | wc -l) file)"
