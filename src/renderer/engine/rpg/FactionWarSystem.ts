/**
 * FactionWarSystem — persistent world-wide conflict between major factions.
 *
 * Features:
 * - Territory control (Capture Points)
 * - Faction-wide buffs based on territory ownership
 * - War effort contributions (Resource donation, PvP kills)
 * - Season-based rewards and reset
 * - Faction chat and leadership roles
 */

export type FactionId = "order" | "chaos" | "neutral";

export interface Territory {
    id: string;
    name: string;
    owner: FactionId;
    influence: Record<FactionId, number>; // 0-100
    buff: { stat: string; value: number };
}

export interface FactionStats {
    id: FactionId;
    totalPoints: number;
    territoriesOwned: number;
    membersActive: number;
}

export class FactionWarSystem {
    private territories: Territory[] = [
        { id: "capital", name: "Sunfire Capital", owner: "order", influence: { order: 100, chaos: 0, neutral: 0 }, buff: { stat: "exp", value: 1.1 } },
        { id: "wasteland", name: "Dread Wasteland", owner: "chaos", influence: { order: 0, chaos: 100, neutral: 0 }, buff: { stat: "atk", value: 1.05 } },
        { id: "border", name: "Borderlands", owner: "neutral", influence: { order: 30, chaos: 30, neutral: 40 }, buff: { stat: "gold", value: 1.2 } },
    ];

    private stats: Record<FactionId, FactionStats> = {
        order: { id: "order", totalPoints: 1000, territoriesOwned: 1, membersActive: 50 },
        chaos: { id: "chaos", totalPoints: 1000, territoriesOwned: 1, membersActive: 48 },
        neutral: { id: "neutral", totalPoints: 500, territoriesOwned: 1, membersActive: 20 },
    };

    /** Contribute to a territory's influence */
    contribute(faction: FactionId, territoryId: string, amount: number): void {
        const territory = this.territories.find(t => t.id === territoryId);
        if (!territory) return;

        territory.influence[faction] += amount;
        this.stats[faction].totalPoints += amount;

        // Check for flip
        const currentOwner = territory.owner;
        let bestFaction = currentOwner;
        let maxInfluence = territory.influence[currentOwner];

        for (const f of Object.keys(territory.influence) as FactionId[]) {
            if (territory.influence[f] > maxInfluence) {
                maxInfluence = territory.influence[f];
                bestFaction = f;
            }
        }

        if (bestFaction !== currentOwner) {
            territory.owner = bestFaction;
            this.stats[currentOwner].territoriesOwned--;
            this.stats[bestFaction].territoriesOwned++;
        }
    }

    getBuffsForFaction(faction: FactionId): { stat: string; value: number }[] {
        return this.territories
            .filter(t => t.owner === faction)
            .map(t => t.buff);
    }

    getStats() { return this.stats; }
    getTerritories() { return this.territories; }
}
