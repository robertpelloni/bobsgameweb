/**
 * MarriageSystem - Social bond system for players.
 * 
 * Features:
 * - Propose/Accept/Decline flow
 * - Shared housing benefits
 * - Teleport to spouse (cooldown-based)
 * - Combat buffs when in same party (Lover's Protection)
 * - Anniversary rewards
 * - Divorce (with resource split)
 */

export interface Marriage {
    spouseA: string;
    spouseB: string;
    anniversary: number;
    bondLevel: number;
    bondXp: number;
}

export class MarriageSystem {
    private marriages: Map<string, Marriage> = new Map(); // playerID -> Marriage
    private proposals: Map<string, string> = new Map(); // recipientID -> senderID

    propose(senderId: string, recipientId: string): boolean {
        if (this.marriages.has(senderId) || this.marriages.has(recipientId)) return false;
        this.proposals.set(recipientId, senderId);
        return true;
    }

    accept(recipientId: string): boolean {
        const senderId = this.proposals.get(recipientId);
        if (!senderId) return false;

        const marriage: Marriage = {
            spouseA: senderId,
            spouseB: recipientId,
            anniversary: Date.now(),
            bondLevel: 1,
            bondXp: 0
        };

        this.marriages.set(senderId, marriage);
        this.marriages.set(recipientId, marriage);
        this.proposals.delete(recipientId);
        return true;
    }

    getBondBuff(playerId: string, isSpouseNearby: boolean): { expMult: number; statMult: number } {
        const marriage = this.marriages.get(playerId);
        if (!marriage || !isSpouseNearby) return { expMult: 1.0, statMult: 1.0 };

        return {
            expMult: 1.0 + (marriage.bondLevel * 0.05),
            statMult: 1.0 + (marriage.bondLevel * 0.02)
        };
    }

    divorce(playerId: string): void {
        const marriage = this.marriages.get(playerId);
        if (marriage) {
            this.marriages.delete(marriage.spouseA);
            this.marriages.delete(marriage.spouseB);
        }
    }

    isMarried(playerId: string): boolean { return this.marriages.has(playerId); }
}
