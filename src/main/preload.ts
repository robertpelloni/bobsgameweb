/**
 * bob's game — Sandboxed Preload IPC Bridge (`window.electronAPI`)
 *
 * Exposes strictly typed IPC methods for inspecting, starting, stopping, and
 * restarting the local Multiplayer WebSocket Server (`6065`) and Generative AI
 * Proxy (`6066`) directly from the Consolidated Omni-Engine Dashboard UI.
 */
import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronServerStatus {
  version: string;
  aiProxy: boolean;
  aiManaged: boolean;
  wsServer: boolean;
  wsManaged: boolean;
}

contextBridge.exposeInMainWorld('electronAPI', {
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
  startAiServer: () => ipcRenderer.invoke('start-ai-server'),
  stopAiServer: () => ipcRenderer.invoke('stop-ai-server'),
  restartAiServer: () => ipcRenderer.invoke('restart-ai-server'),
  startWsServer: () => ipcRenderer.invoke('start-ws-server'),
  stopWsServer: () => ipcRenderer.invoke('stop-ws-server'),
  restartWsServer: () => ipcRenderer.invoke('restart-ws-server'),
  getServerStatus: () => ipcRenderer.invoke('get-server-status'),
  platform: process.platform,
});

declare global {
  interface Window {
    electronAPI?: {
      getAppPath: () => Promise<string>;
      getUserDataPath: () => Promise<string>;
      startAiServer: () => Promise<boolean>;
      stopAiServer: () => Promise<boolean>;
      restartAiServer: () => Promise<boolean>;
      startWsServer: () => Promise<boolean>;
      stopWsServer: () => Promise<boolean>;
      restartWsServer: () => Promise<boolean>;
      getServerStatus: () => Promise<ElectronServerStatus>;
      platform: NodeJS.Platform;
    };
  }
}
