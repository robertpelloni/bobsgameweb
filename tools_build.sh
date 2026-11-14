#!/usr/bin/env bash
# ==============================================================================
# bob's game web (okgame) — Native / WASM Submodule & Porting Layer Builder
# ==============================================================================
# Builds:
#   1. submodules/bobui (BQt Go runtime kernel) when `go` is installed.
#   2. cpp_port/ WASM physics bridge (`public/wasm/bobsgame_cpp.{js,wasm}`) when
#      the Emscripten SDK (`emcmake` / `emmake`) is active in PATH.
# Never cleans or purges existing compiled binaries.
# ==============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "============================================="
echo "Omni-Engine Submodule & WASM Toolchain Builder"
echo "============================================="

if [ -f "submodules/bobui/go.mod" ] && command -v go >/dev/null 2>&1; then
  echo "[1/2] Building BQt Go runtime in submodules/bobui..."
  (cd "submodules/bobui" && go build -buildvcs=false .)
else
  echo "[1/2] Skipping submodules/bobui Go build (Go toolchain or submodule absent)."
fi

if [ -d "cpp_port" ] && command -v emcmake >/dev/null 2>&1; then
  echo "[2/2] Compiling cpp_port to WebAssembly via Emscripten..."
  mkdir -p cpp_port/build_wasm public/wasm
  (
    cd cpp_port/build_wasm
    emcmake cmake -DCMAKE_BUILD_TYPE=Release ..
    emmake make -j4
  )
else
  echo "[2/2] Emscripten SDK (emcmake) not active in PATH; preserving prebuilt public/wasm artifacts."
fi

echo "Done."
