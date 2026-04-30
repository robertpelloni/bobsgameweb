export interface ElectronAPI {
  getAppPath: () => Promise<string>;
  getUserDataPath: () => Promise<string>;
  platform: NodeJS.Platform;
}

export type Platform = 'browser' | 'electron';

export function getPlatform(): Platform {
  return typeof window !== 'undefined' && window.electronAPI ? 'electron' : 'browser';
}

export function isElectron(): boolean {
  return getPlatform() === 'electron';
}

export function isBrowser(): boolean {
  return getPlatform() === 'browser';
}

export function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function isTouch(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}
