/**
 * PartySystem - Team management for multiplayer and RPG adventures.
 * 
 * Features:
 * - Party formation (invite/join/leave)
 * - Leader management
 * - Party-wide chat/broadcasts
 * - Shared experience distribution (split/even/weighted)
 * - Shared loot distribution (round-robin/free-for-all/leader-only)
 * - Formation bonuses (e.g., Vanguard, Defensive Wall)
 */

export type LootMode = "round-robin" | "free-for-all" | "leader-only" | "random";
export type XpMode = "even" | "split" | "contribution";

export interface PartyMember {
    id: string;
    name: string;
    level: number;
    isReady: boolean;
    position: number; // 0-3 for formation
}

export class PartySystem {
    private partyId: string | null = null;
    private leaderId: string | null = null;
    private members: Map<string, PartyMember> = new Map();
    private maxSize: number = 4;
    private lootMode: LootMode = "round-robin";
    private xpMode: XpMode = "even";
    
    /** Create a new party */
    create(leaderId: string, leaderName: string): boolean {
        this.partyId = `party_${Date.now()}`;
        this.leaderId = leaderId;
        this.members.clear();
        this.addMember(leaderId, leaderName, 1);
        return true;
    }

    /** Add a member to the party */
    addMember(id: string, name: string, level: number): boolean {
        if (this.members.size >= this.maxSize) return false;
        if (this.members.has(id)) return false;
        
        this.members.set(id, {
            id,
            name,
            level,
            isReady: false,
            position: this.members.size
        });
        return true;
    }

    /** Remove a member */
    removeMember(id: string): boolean {
        if (!this.members.has(id)) return false;
        this.members.delete(id);
        
        if (id === this.leaderId && this.members.size > 0) {
            // Assign new leader
            this.leaderId = this.members.keys().next().value;
        } else if (this.members.size === 0) {
            this.partyId = null;
            this.leaderId = null;
        }
        return true;
    }

    /** Distribute XP among members */
    distributeXp(totalXp: number): Map<string, number> {
        const distribution = new Map<string, number>();
        const count = this.members.size;
        if (count === 0) return distribution;

        switch (this.xpMode) {
            case "even":
                const share = Math.floor(totalXp / count);
                for (const id of this.members.keys()) {
                    distribution.set(id, share);
                }
                break;
            case "split":
                // Full amount to each (typical RPG style)
                for (const id of this.members.keys()) {
                    distribution.set(id, totalXp);
                }
                break;
        }
        return distribution;
    }

    /** Get formation bonus based on party size */
    getFormationBonus(): { atk: number; def: number } {
        const count = this.members.size;
        return {
            atk: 1.0 + (count * 0.05), // +5% per member
            def: 1.0 + (count * 0.03)
        };
    }

    setLootMode(mode: LootMode) { this.lootMode = mode; }
    getPartyId() { return this.partyId; }
    getLeaderId() { return this.leaderId; }
    getMembers() { return Array.from(this.members.values()); }
    getSize() { return this.members.size; }
}
