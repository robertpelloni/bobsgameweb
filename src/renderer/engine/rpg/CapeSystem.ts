/**
 * CapeSystem — dynamic, physics-based cosmetic capes.
 *
 * Features:
 * - Cape tiers (Common to Legendary)
 * - Custom patterns and emblems
 * - Physics properties (Stiffness, Drag, Length)
 * - Rarity-based glow and particles
 * - Wind response
 */

export interface CapeConfig {
    id: string;
    name: string;
    color: number;
    pattern?: string;
    rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
    length: number;
    stiffness: number;
    glow?: number;
}

export class CapeSystem {
    private equippedCape: CapeConfig | null = null;
    private owned: CapeConfig[] = [];

    private presets: CapeConfig[] = [
        { id: "red", name: "Red Cloak", color: 0xff4444, rarity: "common", length: 1, stiffness: 0.8 },
        { id: "dragon", name: "Dragon Cape", color: 0xaa0000, pattern: "dragon", rarity: "epic", length: 1.2, stiffness: 0.6, glow: 0xff0000 },
        { id: "hero", name: "Hero's Mantle", color: 0xffffcc, rarity: "legendary", length: 1.5, stiffness: 0.5, glow: 0xffffaa },
    ];

    unlock(id: string): void {
        const p = this.presets.find(c => c.id === id);
        if (p && !this.owned.find(o => o.id === id)) {
            this.owned.push(p);
        }
    }

    equip(id: string): boolean {
        const cape = this.owned.find(c => c.id === id);
        if (cape) {
            this.equippedCape = cape;
            return true;
        }
        return false;
    }

    /** Mock physics update */
    getPhysicsPoints(dt: number, velocity: number): { x: number, y: number }[] {
        if (!this.equippedCape) return [];
        
        // Simple 3-point segment mock
        return [
            { x: 0, y: 0 },
            { x: -velocity * 2, y: this.equippedCape.length * 0.5 },
            { x: -velocity * 4, y: this.equippedCape.length }
        ];
    }

    getEquipped() { return this.equippedCape; }
}
