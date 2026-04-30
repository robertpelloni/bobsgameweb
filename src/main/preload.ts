import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
  platform: process.platform,
});

declare global {
  interface Window {
    electronAPI?: {
      getAppPath: () => Promise<string>;
      getUserDataPath: () => Promise<string>;
      platform: NodeJS.Platform;
    };
  }
}
