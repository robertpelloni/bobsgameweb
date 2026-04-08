/**
 * GlobalSettings — persistent game settings stored in localStorage.
 *
 * Ported from okgame C++ Puzzle/GlobalSettings.h.
 * Manages audio, video, controls, and gameplay preferences.
 */

export interface GlobalSettingsData {
    // Audio
    masterVolume: number;
    musicVolume: number;
    sfxVolume: number;

    // Video
    fullscreen: boolean;
    vsync: boolean;
    showFPS: boolean;
    screenWidth: number;
    screenHeight: number;
    pixelPerfect: boolean;

    // Controls
    keyUp: string;
    keyDown: string;
    keyLeft: string;
    keyRight: string;
    keyRotateCW: string;
    keyRotateCCW: string;
    keyHold: string;
    keySlam: string;
    keyPause: string;

    // Gameplay
    startingLevel: number;
    defaultDifficulty: string;
    showGhost: boolean;
    showGrid: boolean;
    showNextPiece: boolean;
    dasDelay: number;
    dasRate: number;

    // Network
    username: string;
    autoLogin: boolean;
    region: string;

    // Theme
    gridBorderColor: number;
    screenBackgroundColor: number;
}

const STORAGE_KEY = 'bobsgame-settings';

export const DEFAULT_SETTINGS: GlobalSettingsData = {
    masterVolume: 0.8,
    musicVolume: 0.7,
    sfxVolume: 1.0,
    fullscreen: false,
    vsync: true,
    showFPS: false,
    screenWidth: 1280,
    screenHeight: 720,
    pixelPerfect: true,
    keyUp: 'ArrowUp',
    keyDown: 'ArrowDown',
    keyLeft: 'ArrowLeft',
    keyRight: 'ArrowRight',
    keyRotateCW: 'KeyX',
    keyRotateCCW: 'KeyZ',
    keyHold: 'KeyC',
    keySlam: 'Space',
    keyPause: 'Escape',
    startingLevel: 1,
    defaultDifficulty: 'Normal',
    showGhost: true,
    showGrid: true,
    showNextPiece: true,
    dasDelay: 170,
    dasRate: 50,
    username: '',
    autoLogin: false,
    region: 'auto',
    gridBorderColor: 0x4466aa,
    screenBackgroundColor: 0x000008,
};

export class GlobalSettings {
    private data: GlobalSettingsData;

    constructor() {
        this.data = { ...DEFAULT_SETTINGS };
        this.load();
    }

    // ============================================================
    // Load/Save
    // ============================================================

    load(): void {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                this.data = { ...DEFAULT_SETTINGS, ...parsed };
            }
        } catch {
            console.warn('[GlobalSettings] Failed to load, using defaults');
        }
    }

    save(): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        } catch {
            console.warn('[GlobalSettings] Failed to save');
        }
    }

    reset(): void {
        this.data = { ...DEFAULT_SETTINGS };
        this.save();
    }

    // ============================================================
    // Getters/Setters
    // ============================================================

    get<K extends keyof GlobalSettingsData>(key: K): GlobalSettingsData[K] {
        return this.data[key];
    }

    set<K extends keyof GlobalSettingsData>(key: K, value: GlobalSettingsData[K]): void {
        this.data[key] = value;
        this.save();
    }

    getAll(): Readonly<GlobalSettingsData> {
        return this.data;
    }

    update(partial: Partial<GlobalSettingsData>): void {
        Object.assign(this.data, partial);
        this.save();
    }

    // ============================================================
    // Audio
    // ============================================================

    getMasterVolume(): number { return this.data.masterVolume; }
    setMasterVolume(v: number): void { this.set('masterVolume', Math.max(0, Math.min(1, v))); }
    getMusicVolume(): number { return this.data.musicVolume; }
    setMusicVolume(v: number): void { this.set('musicVolume', Math.max(0, Math.min(1, v))); }
    getSFXVolume(): number { return this.data.sfxVolume; }
    setSFXVolume(v: number): void { this.set('sfxVolume', Math.max(0, Math.min(1, v))); }

    // ============================================================
    // Video
    // ============================================================

    isFullscreen(): boolean { return this.data.fullscreen; }
    setFullscreen(v: boolean): void { this.set('fullscreen', v); }
    isShowFPS(): boolean { return this.data.showFPS; }
    setShowFPS(v: boolean): void { this.set('showFPS', v); }
    isPixelPerfect(): boolean { return this.data.pixelPerfect; }
    setPixelPerfect(v: boolean): void { this.set('pixelPerfect', v); }

    // ============================================================
    // Controls
    // ============================================================

    getKeyBinding(action: string): string {
        const key = `key${action}` as keyof GlobalSettingsData;
        return (this.data[key] as string) ?? '';
    }

    setKeyBinding(action: string, key: string): void {
        this.set(`key${action}` as keyof GlobalSettingsData, key);
    }

    // ============================================================
    // Gameplay
    // ============================================================

    getStartingLevel(): number { return this.data.startingLevel; }
    setStartingLevel(v: number): void { this.set('startingLevel', v); }
    getDefaultDifficulty(): string { return this.data.defaultDifficulty; }
    setDefaultDifficulty(v: string): void { this.set('defaultDifficulty', v); }
    isShowGhost(): boolean { return this.data.showGhost; }
    setShowGhost(v: boolean): void { this.set('showGhost', v); }
    getDASDelay(): number { return this.data.dasDelay; }
    setDASDelay(v: number): void { this.set('dasDelay', v); }
    getDASRate(): number { return this.data.dasRate; }
    setDASRate(v: number): void { this.set('dasRate', v); }
}
