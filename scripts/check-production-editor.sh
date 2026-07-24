#!/bin/bash
set -eu

# Verify that the live production frontend contains expected custom editor markers.
#
# Usage:
#   FRONTEND_URL=https://bobsgame.com ./scripts/check-production-editor.sh
#
# Optional:
#   EDITOR_MARKERS='Saved Template Slots|preset-slots-panel|block-conversion-list'

FRONTEND_URL="${FRONTEND_URL:-https://bobsgame.com}"
EDITOR_MARKERS="${EDITOR_MARKERS:-Saved Template Slots|preset-slots-panel|block-conversion-list|Saved current ruleset to preset slot|Loaded preset slot}"

TMP_HTML=$(mktemp)
TMP_SCAN=$(mktemp)
TMP_ASSETS=$(mktemp)
TMP_EXTRA=$(mktemp)
trap 'rm -f "$TMP_HTML" "$TMP_SCAN" "$TMP_ASSETS" "$TMP_EXTRA"' EXIT

echo "=== Checking production editor markers: $FRONTEND_URL ==="
curl -Lk --max-time 60 "$FRONTEND_URL" -o "$TMP_HTML"

grep -o 'assets/[^"]*\.js' "$TMP_HTML" | head -20 | sort -u > "$TMP_ASSETS" || true
if [[ ! -s "$TMP_ASSETS" ]]; then
  echo "[error] no JS asset references found in HTML"
  exit 1
fi

echo "[1/4] Referenced JS assets"
cat "$TMP_ASSETS"

echo
echo "[2/4] Downloading initial assets for marker scan"
while IFS= read -r asset; do
  [[ -z "$asset" ]] && continue
  asset_url="${FRONTEND_URL%/}/${asset}"
  curl -Lk --max-time 60 "$asset_url" >> "$TMP_SCAN"
done < "$TMP_ASSETS"

echo
echo "[3/4] Discovering lazy-loaded chunks referenced by the initial asset set"
grep -o 'assets/[A-Za-z0-9_.-]*\.js' "$TMP_SCAN" | sort -u > "$TMP_EXTRA" || true
while IFS= read -r asset; do
  [[ -z "$asset" ]] && continue
  if ! grep -Fxq "$asset" "$TMP_ASSETS"; then
    echo "[info] loading extra chunk: $asset"
    echo "$asset" >> "$TMP_ASSETS"
    asset_url="${FRONTEND_URL%/}/${asset}"
    curl -Lk --max-time 60 "$asset_url" >> "$TMP_SCAN"
  fi
done < "$TMP_EXTRA"

echo
echo "[4/4] Verifying expected editor markers"
IFS='|' read -r -a markers <<< "$EDITOR_MARKERS"
for marker in "${markers[@]}"; do
  if grep -Fq "$marker" "$TMP_SCAN"; then
    echo "[ok] found marker: $marker"
  else
    echo "[error] missing editor marker: $marker"
    exit 1
  fi
done

echo
echo "=== Production editor marker check complete ==="
