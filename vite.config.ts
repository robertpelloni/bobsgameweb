import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

export default defineConfig(({ command, mode }) => {
  const isElectron = process.env.ELECTRON === 'true';

  // =========================================================================
  // Single-Source Version Governance (`VERSION.md` -> `__APP_VERSION__`)
  // =========================================================================
  // WHAT: Reads `VERSION.md` from the repository root at Vite startup/build
  //       time, strips any leading `v` prefix, and injects `__APP_VERSION__`
  //       as a compile-time constant into the renderer and Electron bundles.
  // WHY:  Prevents version drift between `VERSION.md`, `src/shared/Config.ts`,
  //       `MainMenuScene`, `SettingsScene`, and `HelpScene`. Updating
  //       `VERSION.md` automatically propagates across the entire client UI.
  let appVersion = '3.0.35';
  try {
    const rawVersion = readFileSync(resolve(__dirname, 'VERSION.md'), 'utf-8').trim();
    if (rawVersion) {
      appVersion = rawVersion.replace(/^v/i, '');
    }
  } catch {
    // Fallback to default version string when VERSION.md cannot be read.
  }

  // =========================================================================
  // Public Asset Copy Optimization (`data/` -> `dist/renderer/`)
  // =========================================================================
  // WHAT: Dynamically controls `build.copyPublicDir` so `vite build` skips
  //       re-copying the ~2.5 GB `data/` folder (including `lancedb/` and
  //       `maps/`) when `dist/renderer/maps_v2` is already populated on disk,
  //       unless `VITE_COPY_PUBLIC_DIR=true` is explicitly requested.
  // WHY:  During `vite` dev mode, `publicDir: 'data'` serves `/maps_v2/*`,
  //       `/sprites/*`, and `/audio/*` directly from `data/` with zero copy.
  //       During `vite build`, unconditionally copying 2.5 GB on every build
  //       caused multi-minute stalls and deployment upload timeouts.
  // SIDE EFFECTS & ALTERNATE METHODS:
  //       - Combined with `emptyOutDir: false`, existing static assets inside
  //         `dist/renderer/` remain intact across incremental builds.
  //       - Set `VITE_COPY_PUBLIC_DIR=true` to force a full asset sync, or
  //         `VITE_COPY_PUBLIC_DIR=false` on CI/CD frontend-only bundle builds.
  const copyPublicOverride = process.env.VITE_COPY_PUBLIC_DIR;
  const hasHydratedPublicAssets = existsSync(
    resolve(__dirname, 'dist/renderer/maps_v2'),
  );
  const shouldCopyPublicDir =
    copyPublicOverride === 'true'
      ? true
      : copyPublicOverride === 'false'
        ? false
        : !hasHydratedPublicAssets;

  return {
    // Relative asset base ensures `dist/renderer/index.html` works identically on
    // both `https://bobsgame.com/` (hash-routed SPA) and Electron `file://` loads.
    base: './',
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@shared': resolve(__dirname, 'src/shared'),
        '@renderer': resolve(__dirname, 'src/renderer'),
        '@main': resolve(__dirname, 'src/main'),
      },
    },
    build: {
      outDir: 'dist/renderer',
      emptyOutDir: false,
      copyPublicDir: shouldCopyPublicDir,
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
        },
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (id.includes('pixi.js')) return 'pixi';
            if (id.includes('pako')) return 'compression-vendor';
            if (id.includes('howler') || id.includes('@pixi/sound') || id.includes('chiptune3') || id.includes('butterchurn')) return 'audio-vendor';
            return 'vendor';
          },
        },
      },
    },
    plugins: isElectron
      ? [
          electron([
            {
              entry: 'src/main/index.ts',
              vite: {
                build: {
                  outDir: 'dist/main',
                  rollupOptions: {
                    external: ['electron', 'electron-squirrel-startup'],
                  },
                },
              },
            },
            {
              entry: 'src/main/preload.ts',
              onstart(options) {
                options.reload();
              },
              vite: {
                build: {
                  outDir: 'dist/main',
                },
              },
            },
          ]),
          renderer(),
        ]
      : [],
    optimizeDeps: {
      // Restrict dependency discovery to root `index.html` so Vite never crawls
      // `.html` files inside `submodules/` (bobui/juce/ultimatepp) or `dist/`.
      entries: ['index.html'],
    },
    server: {
      port: 3000,
      watch: {
        // Prevent chokidar from watching the ~2.5 GB `data/` asset directory,
        // `submodules/`, `dist/`, and `logs/` during local development.
        ignored: [
          '**/data/**',
          '**/submodules/**',
          '**/dist/**',
          '**/cpp_port/**',
          '**/logs/**',
        ],
      },
    },
    preview: {
      port: 3000,
    },
    publicDir: 'data',
  };
});
