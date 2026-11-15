/**
 * bob's game — Sandboxed Preload IPC Bridge (`window.electronAPI`)
 *
 * Exposes strictly typed IPC methods for desktop path inspection and live
 * Hetzner Cloud (`https://ws.bobsgame.com`) status telemetry. Zero local
 * servers are spawned or managed on the client host.
 */
import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronCloudStatus {
  version: string;
  cloudUrl: string;
  cloudOnline: boolean;
}

contextBridge.exposeInMainWorld('electronAPI', {
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
  getServerStatus: () => ipcRenderer.invoke('get-server-status'),
  platform: process.platform,
});

declare global {
  interface Window {
    electronAPI?: {
      getAppPath: () => Promise<string>;
      getUserDataPath: () => Promise<string>;
      getServerStatus: () => Promise<ElectronCloudStatus>;
      platform: NodeJS.Platform;
    };
  }
}
