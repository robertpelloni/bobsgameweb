import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
  startAiServer: () => ipcRenderer.invoke('start-ai-server'),
  stopAiServer: () => ipcRenderer.invoke('stop-ai-server'),
  platform: process.platform,
});

declare global {
  interface Window {
    electronAPI?: {
      getAppPath: () => Promise<string>;
      getUserDataPath: () => Promise<string>;
      startAiServer: () => Promise<boolean>;
      stopAiServer: () => Promise<boolean>;
      platform: NodeJS.Platform;
    };
  }
}
