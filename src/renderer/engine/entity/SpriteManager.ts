/**
 * SpriteManager — sprite asset registry with lookup by ID or name.
 *
 * Ported from okgame C++ Engine/entity/SpriteManager.
 */
import { SpriteData } from './SpriteData';

export class SpriteManager {
    private spriteByID: Map<number, SpriteData> = new Map();
    private spriteByName: Map<string, SpriteData> = new Map();

    /**
     * Register a sprite asset.
     */
    register(sprite: SpriteData): void {
        if (sprite.id >= 0) {
            this.spriteByID.set(sprite.id, sprite);
        }
        if (sprite.name && sprite.name !== 'none') {
            this.spriteByName.set(sprite.name, sprite);
        }
    }

    /**
     * Get a sprite by its numeric ID.
     */
    getByID(id: number): SpriteData | undefined {
        return this.spriteByID.get(id);
    }

    /**
     * Get a sprite by its name.
     */
    getByName(name: string): SpriteData | undefined {
        return this.spriteByName.get(name);
    }

    /**
     * Get or load a sprite by name. Returns undefined if not found.
     */
    getSprite(name: string): SpriteData | undefined {
        return this.spriteByName.get(name);
    }

    /**
     * Load sprite data from a JSON manifest.
     */
    loadFromManifest(sprites: Record<string, unknown>[]): void {
        for (const data of sprites) {
            const sprite = SpriteData.fromJSON(data);
            this.register(sprite);
        }
    }

    /**
     * Get all registered sprites.
     */
    getAll(): SpriteData[] {
        return [...this.spriteByID.values()];
    }

    /**
     * Get sprites by category.
     */
    getNPCs(): SpriteData[] {
        return this.getAll().filter(s => s.isNPC);
    }

    getItems(): SpriteData[] {
        return this.getAll().filter(s => s.isItem);
    }

    getDoors(): SpriteData[] {
        return this.getAll().filter(s => s.isDoor);
    }

    getGames(): SpriteData[] {
        return this.getAll().filter(s => s.isGame);
    }

    getCount(): number {
        return this.spriteByID.size;
    }

    clear(): void {
        this.spriteByID.clear();
        this.spriteByName.clear();
    }
}
