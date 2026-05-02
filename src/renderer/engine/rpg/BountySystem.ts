/**
 * BountySystem — hunting rare monsters and criminals for rewards.
 *
 * Features:
 * - Daily bounty rotations
 * - Rank-based difficulty (E, D, C, B, A, S)
 * - Track/Hunt/Capture mechanics
 * - Wanted posters UI data
 * - Hunter's Guild progression
 */

export type BountyRank = "E" | "D" | "C" | "B" | "A" | "S";

export interface Bounty {
	id: string;
	targetName: string;
	rank: BountyRank;
	location: string;
	rewardGold: number;
	rewardXp: number;
	description: string;
	isCompleted: boolean;
}

export class BountySystem {
	private activeBounties: Bounty[] = [];
	private hunterRank = 1;
	private guildXp = 0;

	generateDailyBounties(): void {
		this.activeBounties = [
			{ id: "b1", targetName: "Ironjaw Wolf", rank: "E", location: "Forest Edge", rewardGold: 50, rewardXp: 100, description: "A nuisance to local farmers.", isCompleted: false },
			{ id: "b2", targetName: "Shadow Thief", rank: "D", location: "Docks", rewardGold: 150, rewardXp: 300, description: "Stealing rare artifacts.", isCompleted: false },
			{ id: "b3", targetName: "Fire Wyrm", rank: "B", location: "Volcano", rewardGold: 1000, rewardXp: 2000, description: "Terrorizing the mountain pass.", isCompleted: false },
		];
	}

	completeBounty(id: string): { success: boolean, msg: string } {
		const bounty = this.activeBounties.find(b => b.id === id);
		if (!bounty || bounty.isCompleted) return { success: false, msg: "Bounty not found or already done" };

		bounty.isCompleted = true;
		this.guildXp += bounty.rewardXp;
		
		const leveledUp = this.checkRankUp();
		return { 
			success: true, 
			msg: `Claimed reward for ${bounty.targetName}!${leveledUp ? " Hunter Rank Up!" : ""}` 
		};
	}

	private checkRankUp(): boolean {
		const nextLvl = this.hunterRank * 500;
		if (this.guildXp >= nextLvl) {
			this.guildXp -= nextLvl;
			this.hunterRank++;
			return true;
		}
		return false;
	}

	getActiveBounties(): Bounty[] { return this.activeBounties; }
	getRank(): number { return this.hunterRank; }
}
