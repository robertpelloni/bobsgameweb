import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, Notification } from 'electron';
import { join } from 'path';
import { spawn, ChildProcess } from 'child_process';
import { existsSync } from 'fs';

/**
 * Check if squirrel startup on Windows needs an early quit.
 */
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Ensure single-instance lock to avoid multiple daemon instances and tray conflicts
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let aiProxyProcess: ChildProcess | null = null;
let wsServerProcess: ChildProcess | null = null;
let isQuitting = false;

const showNotification = (title: string, body: string): void => {
  if (Notification.isSupported()) {
    new Notification({ title, body, silent: true }).show();
  }
};

/**
 * Spawns the local Node/Express AI Proxy server on port 8080 if not already running.
 * This runs in background to serve local generative AI endpoints for editor tooling.
 */
const startAiProxyServer = (): void => {
  if (aiProxyProcess) {
    console.log('[Main] AI Proxy server is already running.');
    return;
  }

  const serverPath = join(__dirname, '../../server/ai_proxy.js');
  if (existsSync(serverPath)) {
    try {
      aiProxyProcess = spawn('node', [serverPath], {
        stdio: 'pipe',
        detached: false,
      });

      aiProxyProcess.stdout?.on('data', (data) => {
        console.log(`[AI Proxy STDOUT]: ${data}`);
      });

      aiProxyProcess.stderr?.on('data', (data) => {
        console.error(`[AI Proxy STDERR]: ${data}`);
      });

      aiProxyProcess.on('close', (code) => {
        console.log(`[Main] AI Proxy server exited with code ${code}`);
        aiProxyProcess = null;
        updateTrayMenu();
      });

      console.log('[Main] AI Proxy server process spawned successfully.');
      showNotification("bob's game AI Proxy", "Server daemon started on port 8080.");
    } catch (err) {
      console.error('[Main] Failed to spawn AI proxy process:', err);
    }
  } else {
    console.warn(`[Main] AI Proxy server file not found at ${serverPath}`);
  }
};

/**
 * Stops the background AI proxy server process gracefully.
 */
const stopAiProxyServer = (): void => {
  if (aiProxyProcess) {
    console.log('[Main] Terminating AI Proxy server process...');
    aiProxyProcess.kill('SIGTERM');
    aiProxyProcess = null;
    showNotification("bob's game AI Proxy", "Server daemon terminated.");
  }
};

/**
 * Spawns the multiplayer Socket.io game server (server/index.js, port 6065).
 * Previously the tray only managed the AI proxy, so the actual game server
 * could not be started, stopped, or quit from the tray at all.
 */
const startWsServer = (): void => {
  if (wsServerProcess) {
    console.log('[Main] WS game server is already running.');
    return;
  }
  const serverPath = join(__dirname, '../../server/index.js');
  if (!existsSync(serverPath)) {
    console.warn(`[Main] WS game server file not found at ${serverPath}`);
    return;
  }
  try {
    wsServerProcess = spawn('node', [serverPath], { stdio: 'pipe', detached: false });
    wsServerProcess.stdout?.on('data', (d) => console.log(`[WS Server STDOUT]: ${d}`));
    wsServerProcess.stderr?.on('data', (d) => console.error(`[WS Server STDERR]: ${d}`));
    wsServerProcess.on('close', (code) => {
      console.log(`[Main] WS game server exited with code ${code}`);
      wsServerProcess = null;
      updateTrayMenu();
    });
    console.log('[Main] WS game server process spawned successfully.');
    showNotification("bob's game WS Server", 'Game server daemon started on port 6065.');
  } catch (err) {
    console.error('[Main] Failed to spawn WS game server:', err);
  }
};

const stopWsServer = (): void => {
  if (wsServerProcess) {
    console.log('[Main] Terminating WS game server process...');
    wsServerProcess.kill('SIGTERM');
    wsServerProcess = null;
    showNotification("bob's game WS Server", 'Game server daemon terminated.');
  }
};

const stopAllServers = (): void => {
  stopAiProxyServer();
  stopWsServer();
};

/**
 * Updates the System Tray context menu with dynamic states (e.g., server status, window visibility).
 */
const updateTrayMenu = (): void => {
  if (!tray) return;

  const isWindowVisible = mainWindow ? mainWindow.isVisible() : false;
  const isServerRunning = aiProxyProcess !== null;
  const isWsRunning = wsServerProcess !== null;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "bob's game Omni-Engine",
      enabled: false,
    },
    { type: 'separator' },
    {
      label: isWindowVisible ? 'Hide Window' : 'Show Window',
      click: () => {
        if (!mainWindow) {
          createWindow();
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
      label: 'Focus Main Window',
      click: () => {
        if (!mainWindow) {
          createWindow();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: `Local AI Server: ${isServerRunning ? 'Running (Port 8080)' : 'Stopped'}`,
      enabled: false,
    },
    {
      label: isServerRunning ? 'Stop Local AI Server' : 'Start Local AI Server',
      click: () => {
        if (isServerRunning) {
          stopAiProxyServer();
        } else {
          startAiProxyServer();
        }
        updateTrayMenu();
      },
    },
    { type: 'separator' },
    {
      label: `Game Server (WS): ${isWsRunning ? 'Running (Port 6065)' : 'Stopped'}`,
      enabled: false,
    },
    {
      label: isWsRunning ? 'Stop Game Server (WS)' : 'Start Game Server (WS)',
      click: () => {
        if (isWsRunning) {
          stopWsServer();
        } else {
          startWsServer();
        }
        updateTrayMenu();
      },
    },
    {
      label: 'Restart All Servers',
      click: () => {
        stopAllServers();
        setTimeout(() => {
          startAiProxyServer();
          startWsServer();
          updateTrayMenu();
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

  tray.setContextMenu(contextMenu);
};

/**
 * Helper to locate the application icon across development and production layouts.
 */
const getAppIconPath = (): string | undefined => {
  const candidates = [
    join(__dirname, '../../public/bobsgame.png'),
    join(__dirname, '../renderer/bobsgame.png'),
    join(__dirname, '../../bobsgame.png'),
    join(app.getAppPath(), 'public/bobsgame.png'),
  ];
  return candidates.find((p) => existsSync(p));
};

/**
 * Initializes the Electron System Tray with app icon and context menu.
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
  tray.setToolTip("bob's game - Omni-Engine Dashboard");

  tray.on('double-click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
      updateTrayMenu();
    }
  });

  updateTrayMenu();
};

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 480,
    minHeight: 320,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: getAppIconPath(),
    title: "bob's game",
    backgroundColor: '#000000',
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // Intercept window close to minimize to system tray unless explicitly quitting
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

  mainWindow.on('show', () => updateTrayMenu());
  mainWindow.on('hide', () => updateTrayMenu());
};

app.on('second-instance', () => {
  // If a second instance is launched, focus existing main window
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  }
});

app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  stopAllServers();
});

app.on('window-all-closed', () => {
  // If system tray is active, keep running in tray; otherwise quit
  if (process.platform !== 'darwin' && !tray) {
    app.quit();
  }
});

ipcMain.handle('get-app-path', () => app.getAppPath());
ipcMain.handle('get-user-data-path', () => app.getPath('userData'));
ipcMain.handle('start-ai-server', () => {
  startAiProxyServer();
  return aiProxyProcess !== null;
});
ipcMain.handle('stop-ai-server', () => {
  stopAiProxyServer();
  return true;
});
ipcMain.handle('start-ws-server', () => {
  startWsServer();
  return wsServerProcess !== null;
});
ipcMain.handle('stop-ws-server', () => {
  stopWsServer();
  return true;
});
ipcMain.handle('get-server-status', () => ({
  aiProxy: aiProxyProcess !== null,
  wsServer: wsServerProcess !== null,
}));
