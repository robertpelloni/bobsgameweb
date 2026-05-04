const fs = require('fs');

// Bump package.json to 2.2.12
let pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.version = '2.2.12';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));

// Update VERSION.md
fs.writeFileSync('VERSION.md', '2.2.12\n');

// Update CHANGELOG.md
let changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
const newLog = `## [2.2.12]
- Implemented global top-level IPC event listener for invoking native submodule desktop binaries or falling back to iframes.

`;
fs.writeFileSync('CHANGELOG.md', newLog + changelog);

// Update HANDOFF.md
let handoff = `
# HANDOFF.md

## Current State

The agent successfully implemented the top-level generic IPC event listener inside \`src/renderer/index.ts\`. This listener securely intercepts \`launch-external-tool\` CustomEvents emitted anywhere from the PIXI rendering pipeline. It checks the deployment context (\`isElectron\`) to dynamically decide whether to trigger native OS-level IPC hooks (for tools like desktop Aseprite) or render generic fallback iframes for browser builds.
The Custom Game Editor successfully triggers these hooks now using standalone PIXI UI buttons.

## Next Steps

1. In the Web context, when a user attempts to launch "aseprite", build the actual Iframe overlay that opens a simulated or compiled WASM version of the editor inside the browser.
2. The \`bobui\` CMake configuration still requires an intricate build process repair. The next agent should focus deeply on fixing the \`cmake/BobQSubmodules.cmake\` bridging logic so \`bgeditor\` can actually compile the \`#include <BobQUltimatePPHost.h>\` directives natively into Qt.
3. Continue migrating remaining legacy DOM UI flows (like the Main Menu or Lobby) over to pure PIXI structures.
`;
fs.writeFileSync('HANDOFF.md', handoff.trim() + '\n');
console.log("Docs updated successfully.");
