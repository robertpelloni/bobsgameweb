/**
 * bob's game — Electron Desktop Shell & System Tray (Hetzner Live-Only Client)
 *
 * ARCHITECTURE & DESIGN RATIONALE (v3.0.36):
 * 1. Zero Local Servers:
 *    Per project architecture, no local Node/WebSocket/AI proxy daemons are
 *    spawned on the client machine. The Electron desktop client and System Tray
 *    connect directly to live Hetzner Cloud (`https://bobsgame.com` and
 *    `https://ws.bobsgame.com`), falling back cleanly to bundled `dist/renderer`
 *    assets (which also connect directly to `https://ws.bobsgame.com`).
 * 2. CommonJS Compilation Target (`dist/main/index.js` + `dist/main/package.json`):
 *    Ensures reliable `__dirname` resolution and sandboxed `preload.js`
 *    execution alongside the root `"type": "module"` Vite workspace.
 * 3. BelowNormal Process Scheduling:
 *    Lowers Windows scheduling priority (`BelowNormal`) so background audio
 *    or minimized tray presence never starves desktop responsiveness.
 */
import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell } from 'electron';
import { join, resolve } from 'path';
import { spawn } from 'child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { get as httpsGet } from 'https';

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  if (require('electron-squirrel-startup')) {
    app.quit();
  }
} catch {
  // Expected in portable / NSIS / development layouts where Squirrel is absent.
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

const LIVE_FRONTEND_URL = (process.env.BG_LIVE_URL || 'https://bobsgame.com').replace(/\/+$/, '');
const LIVE_CLOUD_URL = (process.env.BG_CLOUD_WS_URL || 'https://ws.bobsgame.com').replace(/\/+$/, '');

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let cloudOnline = false;
let cloudVersion = '';
let isQuitting = false;
let statusPollTimer: NodeJS.Timeout | null = null;

const resolveMainAppVersion = (): string => {
  const candidates = [
    resolve(__dirname, '../../VERSION.md'),
    resolve(app.getAppPath(), 'VERSION.md'),
  ];
  for (const candidate of candidates) {
    try {
      if (existsSync(candidate)) {
        const raw = readFileSync(candidate, 'utf-8').trim();
        if (raw) return raw.replace(/^v/i, '');
      }
    } catch {
      // Fall through
    }
  }
  return '3.0.36';
};

const APP_VERSION = resolveMainAppVersion();

const logMain = (msg: string): void => {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try {
    const logDir = resolve(__dirname, '../../logs');
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }
    appendFileSync(join(logDir, 'local-electron.log'), `${line}\n`, 'utf-8');
  } catch {
    // Non-fatal in read-only packaged directories.
  }
};

const lowerProcessPriority = (pid: number | undefined): void => {
  if (!pid || pid <= 0) return;
  try {
    if (process.platform === 'win32') {
      const ps = spawn(
        'powershell.exe',
        [
          '-NoProfile',
          '-NonInteractive',
          '-WindowStyle',
          'Hidden',
          '-Command',
          `$p = Get-Process -Id ${pid} -ErrorAction SilentlyContinue; if ($p) { $p.PriorityClass = 'BelowNormal' }`,
        ],
        { stdio: 'ignore', windowsHide: true },
      );
      ps.unref();
    }
  } catch {
    // Non-fatal best-effort scheduling hint.
  }
};

const probeHetznerCloud = (timeoutMs = 3500): Promise<{ online: boolean; version: string }> =>
  new Promise((resolveProbe) => {
    let settled = false;
    const finish = (online: boolean, version = ''): void => {
      if (settled) return;
      settled = true;
      resolveProbe({ online, version });
    };
    const req = httpsGet(`${LIVE_CLOUD_URL}/healthz`, { timeout: timeoutMs }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        finish(false);
        return;
      }
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        raw += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw) as { ok?: boolean; version?: string };
          finish(Boolean(parsed.ok), parsed.version || '');
        } catch {
          finish(false);
        }
      });
    });
    req.on('timeout', () => {
      req.destroy();
      finish(false);
    });
    req.on('error', () => finish(false));
  });

const refreshCloudState = async (): Promise<void> => {
  const res = await probeHetznerCloud();
  const changed = res.online !== cloudOnline || res.version !== cloudVersion;
  cloudOnline = res.online;
  cloudVersion = res.version;
  if (changed) {
    updateTrayMenu();
  }
};

const getAppIconPath = (): string | undefined => {
  const candidates = [
    resolve(__dirname, '../../public/bobsgame.png'),
    resolve(__dirname, '../renderer/bobsgame.png'),
    resolve(__dirname, '../../bobsgame.png'),
    resolve(app.getAppPath(), 'public/bobsgame.png'),
  ];
  return candidates.find((p) => existsSync(p));
};

const navigateToHash = (hash: string): void => {
  if (!mainWindow) {
    createWindow(hash);
    return;
  }
  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }
  mainWindow.focus();
  void mainWindow.webContents.executeJavaScript(
    `window.location.hash = ${JSON.stringify(hash)};`,
  );
  updateTrayMenu();
};

const updateTrayMenu = (): void => {
  if (!tray) return;

  const cloudStatusLabel = cloudOnline
    ? `Hetzner Cloud: ONLINE${cloudVersion ? ` (v${cloudVersion})` : ''}`
    : 'Hetzner Cloud: Checking / Offline';

  const contextMenu = Menu.buildFromTemplate([
    { label: `bob's game — Omni-Engine v${APP_VERSION}`, enabled: false },
    { label: cloudStatusLabel, enabled: false },
    { type: 'separator' },
    {
      label: mainWindow?.isVisible() ? 'Hide Game Window' : 'Show Game Window',
      click: () => {
        if (!mainWindow) {
          createWindow('#menu');
        } else if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
        updateTrayMenu();
      },
    },
    {
      label: 'Open Consolidated Dashboard (#menu)',
      click: () => navigateToHash('#menu'),
    },
    {
      label: 'Jump into MMO World (#world)',
      click: () => navigateToHash('#world'),
    },
    {
      label: 'Open Live https://bobsgame.com in Browser',
      click: () => void shell.openExternal(LIVE_FRONTEND_URL),
    },
    { type: 'separator' },
    {
      label: 'Refresh Hetzner Cloud Status',
      click: () => void refreshCloudState(),
    },
    { type: 'separator' },
    {
      label: 'Exit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip(
    `bob's game v${APP_VERSION} | Hetzner Cloud: ${cloudOnline ? 'ONLINE' : 'OFFLINE'}`,
  );
  tray.setContextMenu(contextMenu);
};

const createTray = (): void => {
  const iconPath = getAppIconPath();
  const trayIcon =
    iconPath && existsSync(iconPath)
      ? nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
      : nativeImage.createEmpty();

  tray = new Tray(trayIcon);
  tray.on('double-click', () => {
    if (!mainWindow) {
      createWindow('#menu');
    } else if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
    updateTrayMenu();
  });

  updateTrayMenu();
  logMain(
    `[Main] System Tray initialized (version=v${APP_VERSION}, cloud=${LIVE_CLOUD_URL}, empty=${trayIcon.isEmpty()})`,
  );
};

const createWindow = (initialHash = '#menu'): void => {
  const isSmokeHidden = Boolean(process.env.BG_TRAY_SMOKE_EXIT_MS);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 760,
    minWidth: 640,
    minHeight: 480,
    show: !isSmokeHidden,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: getAppIconPath(),
    title: `bob's game — Omni-Engine v${APP_VERSION}`,
    backgroundColor: '#0a0a1a',
  });

  const indexHtml = resolve(__dirname, '../renderer/index.html');
  if (process.env.BG_USE_BUNDLED_RENDERER === '1' && existsSync(indexHtml)) {
    void mainWindow.loadFile(indexHtml, { hash: initialHash.replace(/^#/, '') });
  } else {
    void mainWindow.loadURL(`${LIVE_FRONTEND_URL}/${initialHash}`);
  }

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
      updateTrayMenu();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.on('did-finish-load', () => {
    logMain(`[Main] BrowserWindow finished loading URL: ${mainWindow?.webContents.getURL()}`);
  });

  mainWindow.on('show', () => updateTrayMenu());
  mainWindow.on('hide', () => updateTrayMenu());
};

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  }
});

app.whenReady().then(async () => {
  lowerProcessPriority(process.pid);
  await refreshCloudState();
  createTray();
  createWindow(process.env.BG_START_HASH || '#menu');

  statusPollTimer = setInterval(() => {
    void refreshCloudState();
  }, 15000);
  statusPollTimer.unref();

  const smokeExitMs = Number(process.env.BG_TRAY_SMOKE_EXIT_MS || '0');
  if (smokeExitMs > 0) {
    logMain(`[Main] Smoke-test mode active (cloudOnline=${cloudOnline}). Exiting in ${smokeExitMs}ms.`);
    setTimeout(() => {
      isQuitting = true;
      app.quit();
    }, smokeExitMs);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow('#menu');
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  if (statusPollTimer) {
    clearInterval(statusPollTimer);
    statusPollTimer = null;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && !tray) {
    app.quit();
  }
});

ipcMain.handle('get-app-path', () => app.getAppPath());
ipcMain.handle('get-user-data-path', () => app.getPath('userData'));
ipcMain.handle('get-server-status', async () => {
  await refreshCloudState();
  return {
    version: APP_VERSION,
    cloudUrl: LIVE_CLOUD_URL,
    cloudOnline,
  };
});
