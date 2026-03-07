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
      emptyOutDir: true,
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
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
