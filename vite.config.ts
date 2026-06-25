import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import { resolve } from 'path';

export default defineConfig(({ command, mode }) => {
  const isElectron = process.env.ELECTRON === 'true';

  return {
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
                    external: ['electron'],
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
    server: {
      port: 3000,
    },
    publicDir: 'data',
  };
});
