import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
  startAiServer: () => ipcRenderer.invoke('start-ai-server'),
  stopAiServer: () => ipcRenderer.invoke('stop-ai-server'),
  startWsServer: () => ipcRenderer.invoke('start-ws-server'),
  stopWsServer: () => ipcRenderer.invoke('stop-ws-server'),
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
      startWsServer: () => Promise<boolean>;
      stopWsServer: () => Promise<boolean>;
      getServerStatus: () => Promise<{ aiProxy: boolean; wsServer: boolean }>;
      platform: NodeJS.Platform;
    };
  }
}
