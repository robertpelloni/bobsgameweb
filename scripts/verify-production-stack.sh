#!/bin/bash
set -eu

# Verify both the backend host and the production frontend after cutover.
#
# Usage:
#   BACKEND_URL=https://ws.bobsgame.com FRONTEND_URL=https://bobsgame.com ./scripts/verify-production-stack.sh

BACKEND_URL="${BACKEND_URL:-}"
FRONTEND_URL="${FRONTEND_URL:-https://bobsgame.com}"
EXPECTED_BACKEND_VERSION="${EXPECTED_BACKEND_VERSION:-}"
ALLOW_BACKEND_RUNTIME_DRIFT="${ALLOW_BACKEND_RUNTIME_DRIFT:-0}"

if [[ -z "$BACKEND_URL" ]]; then
  echo "[error] BACKEND_URL is required"
  exit 1
fi

BACKEND_URL="$BACKEND_URL" EXPECTED_BACKEND_VERSION="$EXPECTED_BACKEND_VERSION" ALLOW_BACKEND_RUNTIME_DRIFT="$ALLOW_BACKEND_RUNTIME_DRIFT" ./scripts/check-backend-host.sh
FRONTEND_URL="$FRONTEND_URL" EXPECTED_BACKEND="$BACKEND_URL" ./scripts/check-production-frontend.sh
FRONTEND_URL="$FRONTEND_URL" ./scripts/check-production-editor.sh
FRONTEND_URL="$FRONTEND_URL" ./scripts/check-production-runtime-chunks.sh

echo "=== Production stack verification complete ==="

echo "=== Checking WebGPU particle chunks ==="
TMP_WGSL_SCAN=$(mktemp)
TMP_HTML_SCAN=$(mktemp)

curl -skL --max-time 60 "$FRONTEND_URL" -o "$TMP_HTML_SCAN" || true

grep -o "assets/[A-Za-z0-9_.-]*\.js" "$TMP_HTML_SCAN" | head -20 | sort -u | while read -r asset; do
  curl -skL --max-time 60 "${FRONTEND_URL%/}/${asset}" >> "$TMP_WGSL_SCAN" || true
done

if grep -q 'particle.wgsl' "$TMP_WGSL_SCAN" || grep -qE 'computeShader|WebGPUParticleSystem' "$TMP_WGSL_SCAN"; then
  echo "[ok] WebGPU particle integration markers found in production chunks."
else
  echo "[info] Note: WebGPU WGSL markers not in initial payload, checking lazy chunks..."

  TMP_EXTRA=$(mktemp)
  grep -o "assets/[A-Za-z0-9_.-]*\.js" "$TMP_WGSL_SCAN" | sort -u > "$TMP_EXTRA" || true
  if [ -s "$TMP_EXTRA" ]; then
      while IFS= read -r lazy_asset; do
          [[ -z "$lazy_asset" ]] && continue
          curl -skL --max-time 60 "${FRONTEND_URL%/}/${lazy_asset}" >> "$TMP_WGSL_SCAN" || true
      done < "$TMP_EXTRA"

      if grep -q 'particle.wgsl' "$TMP_WGSL_SCAN" || grep -qE 'computeShader|WebGPUParticleSystem' "$TMP_WGSL_SCAN"; then
          echo "[ok] WebGPU markers found in lazy-loaded chunks."
      else
          echo "[error] WebGPU WGSL chunks are missing from production deploy!"
      fi
  else
      echo "[error] WebGPU chunks are missing and no lazy chunks were discoverable."
  fi
  rm -f "$TMP_EXTRA"
fi
rm -f "$TMP_WGSL_SCAN" "$TMP_HTML_SCAN"
