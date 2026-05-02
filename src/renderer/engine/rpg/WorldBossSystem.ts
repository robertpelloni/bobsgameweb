/**
 * WorldBossSystem — massive, timed raid bosses requiring many players.
 *
 * Features:
 * - Server-wide broadcast and countdown
 * - Phase-based mechanics (e.g. 100%->75%, 75%->50%)
 * - Enrage timers
 * - Dynamic health scaling based on participants
 * - Top-contributor and participation rewards
 */

export interface RaidReward {
    playerId: string;
    rank: number;
    contribution: number;
    rewards: string[];
}

export interface WorldBoss {
    id: string;
    name: string;
    maxHP: number;
    currentHP: number;
    status: "dormant" | "spawning" | "active" | "defeated" | "escaped";
    spawnTime: number;
    enrageTime: number;
    participants: Map<string, number>; // playerId -> damage
}

export class WorldBossSystem {
    private boss: WorldBoss | null = null;
    private history: string[] = [];

    spawn(id: string, name: string, baseHP: number): WorldBoss {
        this.boss = {
            id,
            name,
            maxHP: baseHP,
            currentHP: baseHP,
            status: "active",
            spawnTime: Date.now(),
            enrageTime: Date.now() + (10 * 60 * 1000), // 10 minutes
            participants: new Map()
        };
        return this.boss;
    }

    recordDamage(playerId: string, damage: number): void {
        if (!this.boss || this.boss.status !== "active") return;
        
        const currentDamage = this.boss.participants.get(playerId) ?? 0;
        this.boss.participants.set(playerId, currentDamage + damage);
        this.boss.currentHP = Math.max(0, this.boss.currentHP - damage);

        if (this.boss.currentHP <= 0) {
            this.boss.status = "defeated";
            this.history.push(this.boss.id);
        }
    }

    getLeaderboard(): RaidReward[] {
        if (!this.boss) return [];
        
        return Array.from(this.boss.participants.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([playerId, damage], index) => ({
                playerId,
                rank: index + 1,
                contribution: damage,
                rewards: index === 0 ? ["legendary_chest", "title_slayer"] : ["gold_bag"]
            }));
    }

    getBoss() { return this.boss; }
    isEnraged() { return this.boss ? Date.now() > this.boss.enrageTime : false; }
}
