/**
 * ArtifactSystem — ancient, unique items with evolving powers.
 *
 * Features:
 * - Soulbinding to player
 * - Leveling artifact through use (Xp/Souls)
 * - Awakening hidden properties at level milestones
 * - Choice-based upgrades (Talent tree for the item)
 * - Visual transformations based on level
 */

export interface ArtifactAbility {
    name: string;
    description: string;
    unlockedAt: number;
}

export interface Artifact {
    id: string;
    name: string;
    level: number;
    xp: number;
    awakened: boolean;
    abilities: ArtifactAbility[];
    basePower: number;
}

export class ArtifactSystem {
    private activeArtifact: Artifact | null = null;
    private library: Artifact[] = [];

    /** Discover a new artifact */
    discover(id: string, name: string): Artifact {
        const artifact: Artifact = {
            id,
            name,
            level: 1,
            xp: 0,
            awakened: false,
            basePower: 10,
            abilities: [
                { name: "Ancient Glow", description: "Provides light in dark areas.", unlockedAt: 1 }
            ]
        };
        this.library.push(artifact);
        return artifact;
    }

    /** Add XP to current artifact */
    addXp(amount: number): { leveled: boolean; awakened: boolean } {
        if (!this.activeArtifact) return { leveled: false, awakened: false };
        
        const a = this.activeArtifact;
        a.xp += amount;
        let leveled = false;
        let awakened = false;

        while (a.xp >= a.level * 100) {
            a.xp -= a.level * 100;
            a.level++;
            leveled = true;
            
            if (a.level === 10 && !a.awakened) {
                a.awakened = true;
                awakened = true;
                a.abilities.push({ name: "True Form", description: "Doubles base power.", unlockedAt: 10 });
                a.basePower *= 2;
            }
        }
        return { leveled, awakened };
    }

    equip(id: string): void {
        this.activeArtifact = this.library.find(a => a.id === id) || null;
    }

    getActive() { return this.activeArtifact; }
    getPower() { return this.activeArtifact ? this.activeArtifact.basePower * (1 + this.activeArtifact.level * 0.1) : 0; }
}
