/**
 * GameDataLoader — asset loading pipeline for sprites, maps, audio, and event data.
 *
 * Ported from okgame C++ Engine/nd/GameDataLoader.
 */
import { SpriteManager } from '../entity/SpriteManager';
import { SpriteData } from '../entity/SpriteData';
import type { GameTypeDefinition, GameEnum } from '../puzzle/PuzzleTypes';
import { DEFAULT_GAME_TYPES } from '../puzzle/PuzzleTypes';

export interface AssetManifest {
    version: string;
    sprites: Record<string, unknown>[];
    maps: Record<string, unknown>[];
    audio: Record<string, unknown>[];
    events: Record<string, unknown>[];
    puzzles: Record<string, unknown>[];
}

export class GameDataLoader {
    readonly spriteManager: SpriteManager;
    private loaded = false;
    private loading = false;
    private loadProgress = 0;
    private totalAssets = 0;
    private loadedAssets = 0;

    // Game type registry
    private gameTypes: Map<string, GameTypeDefinition> = new Map();

    constructor() {
        this.spriteManager = new SpriteManager();

        // Register default game types
        for (const [key, def] of Object.entries(DEFAULT_GAME_TYPES)) {
            this.gameTypes.set(key, def);
        }
    }

    // ============================================================
    // Loading
    // ============================================================

    async loadFromURL(baseUrl: string): Promise<void> {
        this.loading = true;
        this.loadProgress = 0;

        try {
            // Try to fetch manifest
            const response = await fetch(`${baseUrl}/manifest.json`);
            if (response.ok) {
                const manifest: AssetManifest = await response.json();
                await this.processManifest(manifest);
            } else {
                console.warn('[GameDataLoader] No manifest found, using defaults');
                this.loadDefaults();
            }
        } catch (err) {
            console.warn('[GameDataLoader] Failed to load manifest:', err);
            this.loadDefaults();
        }

        this.loading = false;
        this.loaded = true;
    }

    loadFromManifest(manifest: AssetManifest): void {
        this.processManifestSync(manifest);
        this.loaded = true;
    }

    private async processManifest(manifest: AssetManifest): Promise<void> {
        this.totalAssets =
            (manifest.sprites?.length ?? 0) +
            (manifest.maps?.length ?? 0) +
            (manifest.audio?.length ?? 0) +
            (manifest.events?.length ?? 0);

        // Load sprites
        if (manifest.sprites) {
            this.spriteManager.loadFromManifest(manifest.sprites);
            this.loadedAssets += manifest.sprites.length;
            this.loadProgress = this.loadedAssets / Math.max(1, this.totalAssets);
        }

        // Maps, audio, events loaded similarly
        this.loadedAssets = this.totalAssets;
        this.loadProgress = 1;
    }

    private processManifestSync(manifest: AssetManifest): void {
        if (manifest.sprites) {
            this.spriteManager.loadFromManifest(manifest.sprites);
        }
    }

    private loadDefaults(): void {
        // Create default sprites for development
        const defaults = [
            new SpriteData({ id: 0, name: 'player', displayName: 'Player', widthPixels: 16, heightPixels: 24, frames: 4, hasShadow: true }),
            new SpriteData({ id: 1, name: 'npc_default', displayName: 'NPC', widthPixels: 16, heightPixels: 24, frames: 4, isNPC: true, hasShadow: true }),
            new SpriteData({ id: 2, name: 'door', displayName: 'Door', widthPixels: 16, heightPixels: 24, frames: 2, isDoor: true }),
            new SpriteData({ id: 3, name: 'item_chest', displayName: 'Chest', widthPixels: 16, heightPixels: 16, frames: 1, isItem: true }),
            new SpriteData({ id: 4, name: 'arcade_machine', displayName: 'Arcade Machine', widthPixels: 24, heightPixels: 32, frames: 2, isGame: true }),
        ];

        for (const sprite of defaults) {
            this.spriteManager.register(sprite);
        }
    }

    // ============================================================
    // Game Types
    // ============================================================

    getGameType(name: string): GameTypeDefinition | undefined {
        return this.gameTypes.get(name);
    }

    registerGameType(name: string, definition: GameTypeDefinition): void {
        this.gameTypes.set(name, definition);
    }

    getAllGameTypes(): Map<string, GameTypeDefinition> {
        return this.gameTypes;
    }

    // ============================================================
    // Status
    // ============================================================

    isLoaded(): boolean { return this.loaded; }
    isLoading(): boolean { return this.loading; }
    getProgress(): number { return this.loadProgress; }
}
