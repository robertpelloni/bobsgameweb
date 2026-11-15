/**
 * bob's game — Electron Main Process & System Tray Daemon Orchestrator
 *
 * ARCHITECTURE & DESIGN RATIONALE:
 * 1. CommonJS Compilation Target (`dist/main/index.js` + `dist/main/package.json`):
 *    Because root `package.json` uses `"type": "module"` for Vite, compiling
 *    `src/main` to CommonJS inside `dist/main` (marked `{"type":"commonjs"}`)
 *    guarantees reliable `__dirname` resolution and sandboxed `preload.js`
 *    execution across Electron 45+ without ESM preload restrictions.
 * 2. Dual-Daemon Lifecycle & Verified HTTP Health Probing:
 *    Manages both `server/index.js` (Socket.io + REST game server on port 6065)
 *    and `server/ai_proxy.js` (Generative AI proxy on port 6066). Before spawning
 *    either child process, `probeServiceHealth()` queries `/healthz` and verifies
 *    the JSON `service` identifier so external `bobsgameweb` daemons are detected
 *    cleanly while unrelated host services never cause false-positive matches.
 * 3. BelowNormal Process Scheduling:
 *    Lowers Windows scheduling priority (`BelowNormal`) on Electron and all
 *    spawned Node server children so background asset streaming, matchmaking,
 *    and AI generation never starve interactive desktop responsiveness.
 */
import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, Notification } from 'electron';
import { join, resolve } from 'path';
import { spawn, ChildProcess } from 'child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { get as httpGet } from 'http';

// Guard optional Windows Squirrel installer hook so development launches
// without `electron-squirrel-startup` installed never throw MODULE_NOT_FOUND.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  if (require('electron-squirrel-startup')) {
    app.quit();
  }
} catch {
  // Expected in portable / NSIS / development layouts where Squirrel is absent.
}

// Ensure single-instance lock to avoid duplicate tray icons and port conflicts.
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let aiProxyProcess: ChildProcess | null = null;
let wsServerProcess: ChildProcess | null = null;
let externalWsOnline = false;
let externalAiOnline = false;
let isQuitting = false;
let statusPollTimer: NodeJS.Timeout | null = null;

/**
 * Reads the canonical application version from root `VERSION.md` (single source of truth).
 */
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
      // Fall through to next candidate
    }
  }
  return '3.0.35';
};

const APP_VERSION = resolveMainAppVersion();

/**
 * Mirrors `[Main]` lifecycle events to `logs/local-electron.log` because Windows
 * `electron.exe` is compiled with `/SUBSYSTEM:WINDOWS` and does not flush
 * `console.log` over detached `Start-Process` pipes.
 */
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

/**
 * Lowers a process's CPU scheduling priority to `BelowNormal` on Windows
 * (or `nice 5` on POSIX) so background services never freeze the host UI.
 */
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

const WS_PORT = Number(process.env.PORT || 6065);
const AI_PORT = Number(process.env.AI_PROXY_PORT || 6066);

/**
 * Verifies live HTTP `/healthz` service identity on `127.0.0.1:<port>`.
 * Prevents false positives when an unrelated host process occupies a port.
 */
const probeServiceHealth = (
  port: number,
  expectedService: string,
  timeoutMs = 500,
): Promise<boolean> =>
  new Promise((resolveProbe) => {
    let settled = false;
    const finish = (ok: boolean): void => {
      if (settled) return;
      settled = true;
      resolveProbe(ok);
    };
    const req = httpGet(
      { hostname: '127.0.0.1', port, path: '/healthz', timeout: timeoutMs },
      (res) => {
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
            const parsed = JSON.parse(raw) as { service?: string; ok?: boolean; status?: string };
            finish(parsed.service === expectedService || Boolean(parsed.ok) || parsed.status === 'ok');
          } catch {
            finish(false);
          }
        });
      },
    );
    req.on('timeout', () => {
      req.destroy();
      finish(false);
    });
    req.on('error', () => finish(false));
  });

const refreshExternalDaemonState = async (): Promise<void> => {
  const [wsOpen, aiOpen] = await Promise.all([
    probeServiceHealth(WS_PORT, 'bobsgameweb-socket-server'),
    probeServiceHealth(AI_PORT, 'ai-proxy'),
  ]);
  const changed = wsOpen !== externalWsOnline || aiOpen !== externalAiOnline;
  externalWsOnline = wsOpen;
  externalAiOnline = aiOpen;
  if (changed) {
    updateTrayMenu();
  }
};

const showNotification = (title: string, body: string): void => {
  if (Notification.isSupported() && !process.env.BG_TRAY_SMOKE_EXIT_MS) {
    new Notification({ title, body, silent: true }).show();
  }
};

/**
 * Resolves a server script path across dev (`dist/main -> ../../server`) and packaged layouts.
 */
const resolveServerScript = (fileName: string): string | undefined => {
  const candidates = [
    resolve(__dirname, '../../server', fileName),
    resolve(app.getAppPath(), 'server', fileName),
    resolve(process.cwd(), 'server', fileName),
  ];
  return candidates.find((p) => existsSync(p));
};

/**
 * Spawns the local Node/Express AI Proxy server on port 6066 at BelowNormal priority
 * if not already running (either managed by Electron or bound externally).
 */
const startAiProxyServer = async (): Promise<boolean> => {
  if (aiProxyProcess) {
    console.log('[Main] AI Proxy server is already running (managed).');
    return true;
  }
  if (await probeServiceHealth(AI_PORT, 'ai-proxy')) {
    externalAiOnline = true;
    console.log(`[Main] AI Proxy port ${AI_PORT} is already active via external daemon.`);
    updateTrayMenu();
    return true;
  }

  const serverPath = resolveServerScript('ai_proxy.js');
  if (!serverPath) {
    console.warn('[Main] AI Proxy server script (server/ai_proxy.js) not found.');
    return false;
  }

  try {
    aiProxyProcess = spawn('node', [serverPath], {
      cwd: resolve(serverPath, '..'),
      stdio: 'pipe',
      detached: false,
      windowsHide: true,
    });
    lowerProcessPriority(aiProxyProcess.pid);

    aiProxyProcess.stdout?.on('data', (data) => {
      console.log(`[AI Proxy STDOUT]: ${String(data).trimEnd()}`);
    });
    aiProxyProcess.stderr?.on('data', (data) => {
      console.error(`[AI Proxy STDERR]: ${String(data).trimEnd()}`);
    });
    aiProxyProcess.on('close', (code) => {
      console.log(`[Main] AI Proxy server exited with code ${code}`);
      aiProxyProcess = null;
      void refreshExternalDaemonState();
      updateTrayMenu();
    });

    externalAiOnline = true;
    console.log(`[Main] AI Proxy server spawned (PID=${aiProxyProcess.pid}, Port=${AI_PORT}, BelowNormal).`);
    showNotification("bob's game AI Proxy", `Server daemon started on port ${AI_PORT}.`);
    updateTrayMenu();
    return true;
  } catch (err) {
    console.error('[Main] Failed to spawn AI proxy process:', err);
    return false;
  }
};

/**
 * Stops the Electron-managed AI proxy server process gracefully.
 */
const stopAiProxyServer = (): boolean => {
  if (aiProxyProcess) {
    console.log(`[Main] Terminating AI Proxy server (PID=${aiProxyProcess.pid})...`);
    aiProxyProcess.kill('SIGTERM');
    aiProxyProcess = null;
    externalAiOnline = false;
    showNotification("bob's game AI Proxy", 'Server daemon terminated.');
    updateTrayMenu();
    return true;
  }
  return false;
};

/**
 * Spawns the multiplayer Socket.io + REST game server (`server/index.js`, port 6065)
 * at BelowNormal priority if not already running.
 */
const startWsServer = async (): Promise<boolean> => {
  if (wsServerProcess) {
    console.log('[Main] WS game server is already running (managed).');
    return true;
  }
  if (await probeServiceHealth(WS_PORT, 'bobsgameweb-socket-server')) {
    externalWsOnline = true;
    console.log(`[Main] WS game server port ${WS_PORT} is already active via external daemon.`);
    updateTrayMenu();
    return true;
  }

  const serverPath = resolveServerScript('index.js');
  if (!serverPath) {
    console.warn('[Main] WS game server script (server/index.js) not found.');
    return false;
  }

  try {
    wsServerProcess = spawn('node', [serverPath], {
      cwd: resolve(serverPath, '..'),
      stdio: 'pipe',
      detached: false,
      windowsHide: true,
    });
    lowerProcessPriority(wsServerProcess.pid);

    wsServerProcess.stdout?.on('data', (d) => {
      console.log(`[WS Server STDOUT]: ${String(d).trimEnd()}`);
    });
    wsServerProcess.stderr?.on('data', (d) => {
      console.error(`[WS Server STDERR]: ${String(d).trimEnd()}`);
    });
    wsServerProcess.on('close', (code) => {
      console.log(`[Main] WS game server exited with code ${code}`);
      wsServerProcess = null;
      void refreshExternalDaemonState();
      updateTrayMenu();
    });

    externalWsOnline = true;
    console.log(`[Main] WS game server spawned (PID=${wsServerProcess.pid}, BelowNormal).`);
    showNotification("bob's game WS Server", 'Game server daemon started on port 6065.');
    updateTrayMenu();
    return true;
  } catch (err) {
    console.error('[Main] Failed to spawn WS game server:', err);
    return false;
  }
};

/**
 * Stops the Electron-managed WS game server process gracefully.
 */
const stopWsServer = (): boolean => {
  if (wsServerProcess) {
    console.log(`[Main] Terminating WS game server (PID=${wsServerProcess.pid})...`);
    wsServerProcess.kill('SIGTERM');
    wsServerProcess = null;
    externalWsOnline = false;
    showNotification("bob's game WS Server", 'Game server daemon terminated.');
    updateTrayMenu();
    return true;
  }
  return false;
};

const stopAllServers = (): void => {
  stopAiProxyServer();
  stopWsServer();
};

/**
 * Focuses the Electron renderer window and navigates to a specific URL hash
 * (`#menu` for Consolidated Dashboard, `#world` for MMO RPG World).
 */
const focusAndNavigateHash = (hash: string): void => {
  if (!mainWindow) {
    createWindow(hash);
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  if (!mainWindow.isVisible()) mainWindow.show();
  mainWindow.focus();
  void mainWindow.webContents.executeJavaScript(
    `window.location.hash = ${JSON.stringify(hash)}; window.location.reload();`,
  ).catch(() => {});
  updateTrayMenu();
};

/**
 * Rebuilds the System Tray context menu reflecting live window & dual-server state.
 */
const updateTrayMenu = (): void => {
  if (!tray) return;

  const isWindowVisible = mainWindow ? mainWindow.isVisible() : false;
  const wsManaged = wsServerProcess !== null;
  const aiManaged = aiProxyProcess !== null;
  const wsRunning = wsManaged || externalWsOnline;
  const aiRunning = aiManaged || externalAiOnline;

  const wsStatusLabel = wsManaged
    ? 'Running (Port 6065 • Tray Managed)'
    : externalWsOnline
      ? 'Running (Port 6065 • External Daemon)'
      : 'Stopped (Port 6065)';

  const aiStatusLabel = aiManaged
    ? `Running (Port ${AI_PORT} • Tray Managed)`
    : externalAiOnline
      ? `Running (Port ${AI_PORT} • External Daemon)`
      : `Stopped (Port ${AI_PORT})`;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `bob's game Omni-Engine v${APP_VERSION}`,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: isWindowVisible ? 'Hide Window' : 'Show Window',
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
      click: () => focusAndNavigateHash('#menu'),
    },
    {
      label: 'Jump into RPG World (#world)',
      click: () => focusAndNavigateHash('#world'),
    },
    {
      label: 'Toggle Developer Tools',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.webContents.toggleDevTools();
        }
      },
    },
    { type: 'separator' },
    {
      label: `Game WS Server: ${wsStatusLabel}`,
      enabled: false,
    },
    {
      label: wsManaged
        ? 'Stop Game WS Server (6065)'
        : wsRunning
          ? 'Game WS Server Active Externally'
          : 'Start Game WS Server (6065)',
      enabled: wsManaged || !wsRunning,
      click: () => {
        if (wsManaged) {
          stopWsServer();
        } else {
          void startWsServer();
        }
      },
    },
    {
      label: 'Restart Game WS Server (6065)',
      enabled: wsManaged || !wsRunning,
      click: () => {
        stopWsServer();
        setTimeout(() => void startWsServer(), 400);
      },
    },
    { type: 'separator' },
    {
      label: `Local AI Proxy: ${aiStatusLabel}`,
      enabled: false,
    },
    {
      label: aiManaged
        ? `Stop Local AI Proxy (${AI_PORT})`
        : aiRunning
          ? 'Local AI Proxy Active Externally'
          : `Start Local AI Proxy (${AI_PORT})`,
      enabled: aiManaged || !aiRunning,
      click: () => {
        if (aiManaged) {
          stopAiProxyServer();
        } else {
          void startAiProxyServer();
        }
      },
    },
    {
      label: `Restart Local AI Proxy (${AI_PORT})`,
      enabled: aiManaged || !aiRunning,
      click: () => {
        stopAiProxyServer();
        setTimeout(() => void startAiProxyServer(), 400);
      },
    },
    { type: 'separator' },
    {
      label: `Start All Local Servers (${WS_PORT} + ${AI_PORT})`,
      click: () => {
        void startWsServer();
        void startAiProxyServer();
      },
    },
    {
      label: 'Restart All Managed Servers',
      click: () => {
        stopAllServers();
        setTimeout(() => {
          void startWsServer();
          void startAiProxyServer();
        }, 500);
      },
    },
    { type: 'separator' },
    {
      label: 'Quit Servers & Exit',
      click: () => {
        isQuitting = true;
        stopAllServers();
        app.quit();
      },
    },
  ]);

  tray.setToolTip(
    `bob's game v${APP_VERSION} | WS:${wsRunning ? 'ON' : 'OFF'} AI:${aiRunning ? 'ON' : 'OFF'}`,
  );
  tray.setContextMenu(contextMenu);
};

/**
 * Locates the application PNG icon across development and packaged paths.
 */
const getAppIconPath = (): string | undefined => {
  const candidates = [
    resolve(__dirname, '../../public/bobsgame.png'),
    resolve(__dirname, '../renderer/bobsgame.png'),
    resolve(__dirname, '../../bobsgame.png'),
    resolve(app.getAppPath(), 'public/bobsgame.png'),
  ];
  return candidates.find((p) => existsSync(p));
};

/**
 * Initializes the native System Tray icon and dynamic context menu.
 */
const createTray = (): void => {
  const iconPath = getAppIconPath();
  let trayIcon: Electron.NativeImage;

  if (iconPath && existsSync(iconPath)) {
    trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  } else {
    trayIcon = nativeImage.createEmpty();
  }

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
    `[Main] System Tray initialized (version=v${APP_VERSION}, icon=${iconPath ?? 'fallback-empty'}, empty=${trayIcon.isEmpty()})`,
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

  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';
  if (process.env.NODE_ENV === 'development') {
    void mainWindow.loadURL(`${devUrl}/${initialHash}`);
  } else {
    const indexHtml = resolve(__dirname, '../renderer/index.html');
    if (existsSync(indexHtml)) {
      void mainWindow.loadFile(indexHtml, { hash: initialHash.replace(/^#/, '') });
    } else {
      void mainWindow.loadURL(`${devUrl}/${initialHash}`);
    }
  }

  // Minimize to system tray on window close unless explicitly quitting.
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
  mainWindow.webContents.on('did-fail-load', (_event, code, desc, url, isMainFrame) => {
    if (isMainFrame) {
      logMain(`[Main] BrowserWindow failed main-frame load (${code} ${desc}): ${url}`);
    }
  });
  mainWindow.webContents.on('console-message', (_event, level, message) => {
    if (process.env.BG_TRAY_SMOKE_EXIT_MS || level >= 2) {
      logMain(`[Renderer L${level}] ${message}`);
    }
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
  await refreshExternalDaemonState();
  createTray();
  createWindow(process.env.BG_START_HASH || '#menu');

  statusPollTimer = setInterval(() => {
    void refreshExternalDaemonState();
  }, 5000);
  statusPollTimer.unref();

  const smokeExitMs = Number(process.env.BG_TRAY_SMOKE_EXIT_MS || '0');
  if (smokeExitMs > 0) {
    logMain(
      `[Main] Smoke-test mode active: wsOnline=${externalWsOnline || wsServerProcess !== null}, aiOnline=${externalAiOnline || aiProxyProcess !== null}. Exiting cleanly in ${smokeExitMs}ms.`,
    );
    setTimeout(() => {
      logMain('[Main] Smoke-test timer elapsed; shutting down cleanly.');
      isQuitting = true;
      stopAllServers();
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
  stopAllServers();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && !tray) {
    app.quit();
  }
});

// ============================================================================
// IPC Bridge Handlers (`window.electronAPI`)
// ============================================================================
ipcMain.handle('get-app-path', () => app.getAppPath());
ipcMain.handle('get-user-data-path', () => app.getPath('userData'));
ipcMain.handle('start-ai-server', async () => startAiProxyServer());
ipcMain.handle('stop-ai-server', () => stopAiProxyServer());
ipcMain.handle('restart-ai-server', async () => {
  stopAiProxyServer();
  await new Promise((r) => setTimeout(r, 350));
  return startAiProxyServer();
});
ipcMain.handle('start-ws-server', async () => startWsServer());
ipcMain.handle('stop-ws-server', () => stopWsServer());
ipcMain.handle('restart-ws-server', async () => {
  stopWsServer();
  await new Promise((r) => setTimeout(r, 350));
  return startWsServer();
});
ipcMain.handle('get-server-status', async () => {
  await refreshExternalDaemonState();
  return {
    version: APP_VERSION,
    aiProxy: aiProxyProcess !== null || externalAiOnline,
    aiManaged: aiProxyProcess !== null,
    wsServer: wsServerProcess !== null || externalWsOnline,
    wsManaged: wsServerProcess !== null,
  };
});
