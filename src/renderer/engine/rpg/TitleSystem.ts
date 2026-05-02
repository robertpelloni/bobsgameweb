/**
 * TitleSystem - Player titles and visual prestige.
 * 
 * Features:
 * - Prefix/Suffix titles (e.g. "DragonSlayer [Name]" or "[Name] the Brave")
 * - Unlock conditions (Boss kills, level reach, achievements)
 * - Stat bonuses for specific titles (minor)
 * - Rarity tiers for titles
 */

export interface Title {
    id: string;
    text: string;
    rarity: "common" | "rare" | "epic" | "legendary";
    bonus?: { stat: string; value: number };
}

export class TitleSystem {
    private unlocked: Set<string> = new Set(["novice"]);
    private activeTitleId: string | null = null;
    
    private allTitles: Title[] = [
        { id: "novice", text: "Novice", rarity: "common" },
        { id: "slayer", text: "Dragon Slayer", rarity: "epic", bonus: { stat: "atk", value: 5 } },
        { id: "tycoon", text: "Merchant Prince", rarity: "rare", bonus: { stat: "gold_gain", value: 1.1 } },
        { id: "legend", text: "Living Legend", rarity: "legendary", bonus: { stat: "all", value: 2 } }
    ];

    unlock(id: string): void {
        if (this.allTitles.find(t => t.id === id)) {
            this.unlocked.add(id);
        }
    }

    equip(id: string): boolean {
        if (this.unlocked.has(id)) {
            this.activeTitleId = id;
            return true;
        }
        return false;
    }

    getFormattedName(name: string): string {
        const title = this.allTitles.find(t => t.id === this.activeTitleId);
        if (!title) return name;
        return `${title.text} ${name}`;
    }

    getActiveBonus(): { stat: string; value: number } | null {
        return this.allTitles.find(t => t.id === this.activeTitleId)?.bonus ?? null;
    }
}
