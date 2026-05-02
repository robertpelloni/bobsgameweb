/**
 * ReputationSystem — tracks player reputation with factions and NPCs.
 *
 * Features:
 * - 5 factions (Town, Forest, Beach, Dragon, Underground)
 * - Reputation levels (Hated → Exalted)
 * - Faction-specific rewards at thresholds
 * - Actions affect reputation (kill enemies, complete quests, trade)
 * - Cross-faction effects (helping one may anger another)
 * - NPC individual disposition tracking
 *
 * Usage:
 *   const rep = new ReputationSystem();
 *   rep.addReputation("town", 50);
 *   rep.getLevel("town"); // "Friendly"
 */

export type FactionId = "town" | "forest" | "beach" | "dragon" | "underground";

export type ReputationLevel =
	| "hated"     // -3000 to -1000
	| "hostile"   // -999 to -500
	| "unfriendly" // -499 to -100
	| "neutral"   // -99 to 99
	| "friendly"  // 100 to 499
	| "honored"   // 500 to 1499
	| "revered"   // 1500 to 2999
	| "exalted";  // 3000+

export interface FactionData {
	id: FactionId;
	name: string;
	description: string;
	color: number;
	icon: string;
	value: number;
}

export interface NPCDisposition {
	npcId: string;
	npcName: string;
	faction: FactionId;
	affinity: number; // -100 to 100
	questGiven: boolean;
	questComplete: boolean;
}

export interface ReputationReward {
	faction: FactionId;
	requiredLevel: ReputationLevel;
	reward: string;
	description: string;
	claimed: boolean;
}

const FACTION_DATA: Record<FactionId, Omit<FactionData, "value">> = {
	town:         { id: "town", name: "TOWNYUU Guard", description: "The town guard and citizens of TOWNYUU.", color: 0x44ff88, icon: "🏘" },
	forest:       { id: "forest", name: "Forest Rangers", description: "Elven rangers who protect the Dark Forest.", color: 0x22aa44, icon: "🌲" },
	beach:        { id: "beach", name: "Coastal Traders", description: "Merchants and fishermen of Sunset Beach.", color: 0x44aaff, icon: "🏖" },
	dragon:       { id: "dragon", name: "Dragon Cult", description: "Followers of the Ancient Dragon.", color: 0xff4422, icon: "🐉" },
	underground:  { id: "underground", name: "Thieves Guild", description: "The shadowy underground network.", color: 0xaa44ff, icon: "🗡" },
};

const REP_THRESHOLDS: { min: number; level: ReputationLevel }[] = [
	{ min: -Infinity, level: "hated" },
	{ min: -1000, level: "hostile" },
	{ min: -500, level: "unfriendly" },
	{ min: -100, level: "neutral" },
	{ min: 100, level: "friendly" },
	{ min: 500, level: "honored" },
	{ min: 1500, level: "revered" },
	{ min: 3000, level: "exalted" },
];

const REP_REWARDS: ReputationReward[] = [
	{ faction: "town", requiredLevel: "friendly", reward: "town_discount", description: "10% shop discount in TOWNYUU", claimed: false },
	{ faction: "town", requiredLevel: "honored", reward: "town_guard_ally", description: "Guard assistance in battle", claimed: false },
	{ faction: "town", requiredLevel: "exalted", reward: "town_champion", description: "Champion title + legendary weapon", claimed: false },
	{ faction: "forest", requiredLevel: "friendly", reward: "forest_path", description: "Secret forest paths revealed", claimed: false },
	{ faction: "forest", requiredLevel: "honored", reward: "forest_ally", description: "Forest creatures won't attack", claimed: false },
	{ faction: "beach", requiredLevel: "friendly", reward: "beach_fish", description: "Better fishing spots", claimed: false },
	{ faction: "beach", requiredLevel: "honored", reward: "beach_trade", description: "Access to rare trade goods", claimed: false },
	{ faction: "dragon", requiredLevel: "honored", reward: "dragon_ally", description: "Dragon whelps become allies", claimed: false },
	{ faction: "underground", requiredLevel: "friendly", reward: "ug_smuggler", description: "Access to black market", claimed: false },
];

// Cross-faction effects: helping one faction may affect another
const CROSS_EFFECTS: Record<FactionId, { faction: FactionId; multiplier: number }[]> = {
	town: [{ faction: "underground", multiplier: -0.3 }],
	forest: [{ faction: "dragon", multiplier: -0.2 }],
	beach: [],
	dragon: [{ faction: "town", multiplier: -0.3 }, { faction: "forest", multiplier: -0.2 }],
	underground: [{ faction: "town", multiplier: -0.2 }],
};

export class ReputationSystem {
	private factions: Map<FactionId, FactionData> = new Map();
	private npcs: Map<string, NPCDisposition> = new Map();
	private rewards: ReputationReward[] = [];
	private log: string[] = [];

	constructor() {
		this.reset();
	}

	/** Reset all reputation */
	reset(): void {
		for (const [id, data] of Object.entries(FACTION_DATA)) {
			this.factions.set(id as FactionId, { ...data, value: 0 });
		}
		this.rewards = REP_REWARDS.map(r => ({ ...r }));
	}

	/** Add reputation to a faction */
	addReputation(faction: FactionId, amount: number, reason = ""): void {
		const f = this.factions.get(faction);
		if (!f) return;

		const prevLevel = this.getLevel(faction);
		f.value = Math.max(-5000, Math.min(10000, f.value + amount));
		const newLevel = this.getLevel(faction);

		this.log.push(`${reason || 'Action'}: ${amount > 0 ? '+' : ''}${amount} ${f.name} (${prevLevel} → ${newLevel})`);

		// Cross-faction effects
		const effects = CROSS_EFFECTS[faction] ?? [];
		for (const effect of effects) {
			const target = this.factions.get(effect.faction);
			if (target) {
				target.value = Math.max(-5000, Math.min(10000, target.value + Math.floor(amount * effect.multiplier)));
			}
		}
	}

	/** Get reputation value */
	getValue(faction: FactionId): number {
		return this.factions.get(faction)?.value ?? 0;
	}

	/** Get reputation level */
	getLevel(faction: FactionId): ReputationLevel {
		const value = this.getValue(faction);
		let level: ReputationLevel = "hated";
		for (const threshold of REP_THRESHOLDS) {
			if (value >= threshold.min) level = threshold.level;
		}
		return level;
	}

	/** Check if reputation meets a threshold */
	meetsRequirement(faction: FactionId, required: ReputationLevel): boolean {
		const levels: ReputationLevel[] = ["hated", "hostile", "unfriendly", "neutral", "friendly", "honored", "revered", "exalted"];
		const current = levels.indexOf(this.getLevel(faction));
		const needed = levels.indexOf(required);
		return current >= needed;
	}

	/** Get available rewards */
	getAvailableRewards(faction?: FactionId): ReputationReward[] {
		return this.rewards.filter(r => {
			if (r.claimed) return false;
			if (faction && r.faction !== faction) return false;
			return this.meetsRequirement(r.faction, r.requiredLevel);
		});
	}

	/** Claim a reward */
	claimReward(rewardId: string): ReputationReward | null {
		const reward = this.rewards.find(r => r.reward === rewardId && !r.claimed);
		if (!reward) return null;
		if (!this.meetsRequirement(reward.faction, reward.requiredLevel)) return null;
		reward.claimed = true;
		return reward;
	}

	/** Register NPC */
	registerNPC(npcId: string, name: string, faction: FactionId): void {
		this.npcs.set(npcId, { npcId, npcName: name, faction, affinity: 0, questGiven: false, questComplete: false });
	}

	/** Modify NPC affinity */
	modifyNPCAffinity(npcId: string, amount: number): void {
		const npc = this.npcs.get(npcId);
		if (!npc) return;
		npc.affinity = Math.max(-100, Math.min(100, npc.affinity + amount));
		// NPC affinity also affects faction
		this.addReputation(npc.faction, Math.floor(amount * 0.5), `NPC: ${npc.npcName}`);
	}

	/** Get NPC data */
	getNPC(npcId: string): NPCDisposition | undefined {
		return this.npcs.get(npcId);
	}

	/** Get all faction data */
	getAllFactions(): FactionData[] {
		return Array.from(this.factions.values());
	}

	/** Get log */
	getLog(): string[] { return [...this.log]; }

	/** Serialize */
	toJSON(): object {
		return {
			factions: Array.from(this.factions.entries()).map(([id, f]) => ({ id, value: f.value })),
			npcs: Array.from(this.npcs.values()),
			rewards: this.rewards,
		};
	}

	/** Deserialize */
	static fromJSON(data: any): ReputationSystem {
		const sys = new ReputationSystem();
		if (data.factions) {
			for (const f of data.factions) {
				const faction = sys.factions.get(f.id as FactionId);
				if (faction) faction.value = f.value;
			}
		}
		return sys;
	}
}
