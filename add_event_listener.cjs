const fs = require('fs');
let code = fs.readFileSync('src/renderer/index.ts', 'utf8');

const eventListenerCode = `
  // Global Event Listener for Submodule Tool Launching
  document.addEventListener('launch-external-tool', (e: Event) => {
    const customEvent = e as CustomEvent;
    const tool = customEvent.detail?.tool;
    console.log(\`[Engine] Received request to launch external tool: \${tool}\`);
    if (isElectron) {
      console.log(\`[Engine] Sending IPC message to launch \${tool} natively.\`);
      // window.electronAPI.launchTool(tool);
    } else {
      console.log(\`[Engine] Browser mode detected. Mocking iframe launch for \${tool}...\`);
      // Here we will eventually overlay an iframe containing the WASM/web port of the requested submodule tool.
    }
  });
`;

code = code.replace(
  '  await game.init();',
  `${eventListenerCode}\n  await game.init();`
);

fs.writeFileSync('src/renderer/index.ts', code);
console.log('Added top-level launch-external-tool event listener.');
