#!/bin/bash
# Concept stub for compiling submodule tools to WASM.

echo "============================================="
echo "Omni-Engine WASM Toolchain Builder (Stub)"
echo "============================================="

# For Aseprite:
# Needs Emscripten SDK (emsdk)
# mkdir -p build_wasm
# cd build_wasm
# emcmake cmake -DCMAKE_BUILD_TYPE=Release ..
# emmake make -j8
# cp aseprite.html ../../../public/tools/aseprite-wasm/index.html

# For Tilemap Studio:
# ...

echo "Emscripten SDK not found. Skipping tool builds for now."
