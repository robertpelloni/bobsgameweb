/**
 * GameSave — persistent save state for the RPG.
 *
 * Ported from okgame C++ Engine shared/database.
 * Stores flags, skills, dialogues, items, wallet, map state, and play time.
 */
import { EventManager } from '../event/EventManager';
import { MapState } from '../../map/MapState';

export interface SaveSlot {
    slotIndex: number;
    timestamp: number;
    playTimeSeconds: number;
    playerName: string;
    currentMapID: number;
    playerX: number;
    playerY: number;

    // Event system state
    flags: Record<string, unknown>[];
    skills: Record<string, unknown>[];
    dialogues: Record<string, unknown>[];
    strings: Record<string, unknown>[];

    // RPG state
    money: number;
    items: Record<string, unknown>[];
    inventory: { itemId: number; quantity: number }[];

    // Map states
    mapStates: Record<string, unknown>[];

    // Clock
    gameDay: number;
    gameHour: number;
    gameMinute: number;
    gameSecond: number;
}

export class GameSave {
    private static STORAGE_KEY = 'bobsgame_save';

    /**
     * Create a save snapshot from the current game state.
     */
    static createSnapshot(options: {
        eventManager: EventManager;
        mapStates?: MapState[];
        playerName?: string;
        currentMapID?: number;
        playerX?: number;
        playerY?: number;
        money?: number;
        playTimeSeconds?: number;
        clock?: { day: number; hour: number; minute: number; second: number };
    }): SaveSlot {
        const saveData = options.eventManager.getSaveData();
        return {
            slotIndex: 0,
            timestamp: Date.now(),
            playTimeSeconds: options.playTimeSeconds ?? 0,
            playerName: options.playerName ?? 'Player',
            currentMapID: options.currentMapID ?? 0,
            playerX: options.playerX ?? 0,
            playerY: options.playerY ?? 0,
            flags: saveData.flags as Record<string, unknown>[],
            skills: saveData.skills as Record<string, unknown>[],
            dialogues: saveData.dialogues as Record<string, unknown>[],
            strings: saveData.strings as Record<string, unknown>[],
            money: options.money ?? 0,
            items: [],
            inventory: [],
            mapStates: (options.mapStates ?? []).map(s => s.toJSON()),
            gameDay: options.clock?.day ?? 0,
            gameHour: options.clock?.hour ?? 0,
            gameMinute: options.clock?.minute ?? 0,
            gameSecond: options.clock?.second ?? 0,
        };
    }

    /**
     * Save to localStorage.
     */
    static saveToLocal(slot: SaveSlot): void {
        const key = `${GameSave.STORAGE_KEY}_${slot.slotIndex}`;
        localStorage.setItem(key, JSON.stringify(slot));
    }

    /**
     * Load from localStorage.
     */
    static loadFromLocal(slotIndex: number): SaveSlot | null {
        const key = `${GameSave.STORAGE_KEY}_${slotIndex}`;
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        try {
            return JSON.parse(raw) as SaveSlot;
        } catch {
            return null;
        }
    }

    /**
     * Apply save data to the EventManager.
     */
    static applyToEventManager(save: SaveSlot, eventManager: EventManager): void {
        eventManager.loadFromSave({
            flags: save.flags,
            skills: save.skills,
            dialogues: save.dialogues,
            strings: save.strings,
        });
    }

    /**
     * Get all save slot indices.
     */
    static getSaveSlots(): number[] {
        const slots: number[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(GameSave.STORAGE_KEY + '_')) {
                const idx = parseInt(key.split('_').pop() ?? '');
                if (!isNaN(idx)) slots.push(idx);
            }
        }
        return slots.sort();
    }

    /**
     * Delete a save slot.
     */
    static deleteSlot(slotIndex: number): void {
        localStorage.removeItem(`${GameSave.STORAGE_KEY}_${slotIndex}`);
    }

    /**
     * Check if a save exists.
     */
    static hasSave(slotIndex = 0): boolean {
        return localStorage.getItem(`${GameSave.STORAGE_KEY}_${slotIndex}`) !== null;
    }
}
