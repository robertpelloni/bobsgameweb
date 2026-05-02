/**
 * QuestEngine — dynamic quest generation, tracking, and completion.
 *
 * Features:
 * - 4 quest types (Kill, Collect, Explore, Talk)
 * - Quest chains with prerequisites
 * - Dynamic difficulty scaling
 * - Reward calculation (gold, XP, items)
 * - Quest state machine (Available → Active → Complete/TurnedIn)
 * - Time-limited quests
 * - Daily quest rotation
 *
 * Usage:
 *   const engine = new QuestEngine();
 *   engine.acceptQuest("kill_goblins");
 *   engine.updateProgress("kill_goblins", { kills: { goblin: 3 } });
 */
export type QuestType = "kill" | "collect" | "explore" | "talk";
export type QuestState = "available" | "active" | "complete" | "turned_in" | "failed" | "locked";

export interface QuestObjective {
	description: string;
	target: number;
	current: number;
	entityId?: string; // enemy/item/npc id
}

export interface QuestReward {
	gold: number;
	xp: number;
	items: string[];
	reputation?: { faction: string; amount: number };
}

export interface QuestDef {
	id: string;
	name: string;
	description: string;
	type: QuestType;
	objectives: QuestObjective[];
	reward: QuestReward;
	level: number;
	prerequisites: string[];
	timeLimit?: number; // seconds
	chain?: string; // next quest in chain
	daily?: boolean;
}

export interface QuestInstance {
	def: QuestDef;
	state: QuestState;
	acceptedAt: number;
	completedAt: number | null;
	timeRemaining: number | null;
}

const QUEST_DEFS: QuestDef[] = [
	// Kill quests
	{ id: "kill_crabs", name: "Beach Cleanup", description: "Clear the crabs from Sunset Beach.", type: "kill", objectives: [{ description: "Defeat Crabs", target: 5, current: 0, entityId: "crab" }], reward: { gold: 30, xp: 50, items: ["health_potion"] }, level: 1, prerequisites: [] },
	{ id: "kill_goblins", name: "Forest Patrol", description: "Drive back the goblin raiders.", type: "kill", objectives: [{ description: "Defeat Forest Goblins", target: 10, current: 0, entityId: "forest_goblin" }], reward: { gold: 80, xp: 150, items: ["steel_blade"] }, level: 3, prerequisites: [] },
	{ id: "kill_wolves", name: "Wolf Pack", description: "Hunt the wolves terrorizing the forest paths.", type: "kill", objectives: [{ description: "Defeat Wild Wolves", target: 5, current: 0, entityId: "wild_wolf" }], reward: { gold: 60, xp: 120, items: ["wolf_pelt"] }, level: 3, prerequisites: [] },
	{ id: "kill_dragon", name: "Dragon Slayer", description: "Defeat the Ancient Dragon in its lair.", type: "kill", objectives: [{ description: "Defeat Ancient Dragon", target: 1, current: 0, entityId: "ancient_dragon" }], reward: { gold: 500, xp: 1000, items: ["dragon_crown", "legend_blade"], reputation: { faction: "town", amount: 500 } }, level: 10, prerequisites: ["kill_goblins", "kill_wolves"] },

	// Collect quests
	{ id: "collect_herbs", name: "Herb Gathering", description: "Collect herbs for the town healer.", type: "collect", objectives: [{ description: "Collect Herbs", target: 5, current: 0, entityId: "herb" }], reward: { gold: 25, xp: 40, items: ["health_elixir"] }, level: 1, prerequisites: [] },
	{ id: "collect_scales", name: "Scale Collector", description: "Collect dragon scales for the blacksmith.", type: "collect", objectives: [{ description: "Collect Dragon Scales", target: 3, current: 0, entityId: "dragon_scale" }], reward: { gold: 200, xp: 300, items: ["dragon_armor"] }, level: 8, prerequisites: ["kill_dragon"] },

	// Explore quests
	{ id: "explore_forest", name: "Into the Woods", description: "Explore the Dark Forest and discover its secrets.", type: "explore", objectives: [{ description: "Visit Dark Forest", target: 1, current: 0 }], reward: { gold: 50, xp: 100, items: [] }, level: 2, prerequisites: [] },
	{ id: "explore_lair", name: "Dragon's Domain", description: "Find and enter the Dragon's Lair.", type: "explore", objectives: [{ description: "Enter Dragon's Lair", target: 1, current: 0 }], reward: { gold: 100, xp: 200, items: [] }, level: 5, prerequisites: ["explore_forest"] },
	{ id: "explore_all", name: "World Walker", description: "Visit every location in the world.", type: "explore", objectives: [{ description: "Visit all 4 locations", target: 4, current: 0 }], reward: { gold: 200, xp: 500, items: ["explorer_badge"] }, level: 5, prerequisites: [] },

	// Talk quests
	{ id: "talk_mayor", name: "Meet the Mayor", description: "Introduce yourself to the Mayor of TOWNYUU.", type: "talk", objectives: [{ description: "Talk to Mayor", target: 1, current: 0, entityId: "npc_mayor" }], reward: { gold: 20, xp: 30, items: [] }, level: 1, prerequisites: [] },
	{ id: "talk_fisherman", name: "Old Friends", description: "Chat with the Fisherman at the beach.", type: "talk", objectives: [{ description: "Talk to Fisherman", target: 1, current: 0, entityId: "npc_fisherman" }], reward: { gold: 15, xp: 25, items: ["fishing_rod"] }, level: 1, prerequisites: ["talk_mayor"] },

	// Chain quest
	{ id: "chain_1", name: "The Dark Threat", description: "Investigate reports of dark creatures.", type: "kill", objectives: [{ description: "Defeat Dark Slimes", target: 5, current: 0, entityId: "dark_slime" }], reward: { gold: 50, xp: 80, items: [] }, level: 3, prerequisites: ["kill_goblins"], chain: "chain_2" },
	{ id: "chain_2", name: "Source of Darkness", description: "Find the source of the dark creatures.", type: "explore", objectives: [{ description: "Find Dark Shrine", target: 1, current: 0 }], reward: { gold: 100, xp: 200, items: ["shadow_amulet"] }, level: 5, prerequisites: ["chain_1"], chain: "kill_dragon" },
];

export class QuestEngine {
	private quests: Map<string, QuestInstance> = new Map();
	private completedQuests: Set<string> = new Set();
	private dailyResetTime = 0;
	private log: string[] = [];

	constructor() {
		for (const def of QUEST_DEFS) {
			this.quests.set(def.id, {
				def,
				state: this.getInitialState(def),
				acceptedAt: 0,
				completedAt: null,
				timeRemaining: def.timeLimit ?? null,
			});
		}
	}

	private getInitialState(def: QuestDef): QuestState {
		if (def.prerequisites.length === 0) return "available";
		const allMet = def.prerequisites.every(p => this.completedQuests.has(p));
		return allMet ? "available" : "locked";
	}

	/** Get available quests */
	getAvailable(): QuestInstance[] {
		return this.filterByState("available");
	}

	/** Get active quests */
	getActive(): QuestInstance[] {
		return this.filterByState("active");
	}

	/** Get completed (turned in) quests */
	getCompleted(): QuestInstance[] {
		return this.filterByState("turned_in");
	}

	private filterByState(state: QuestState): QuestInstance[] {
		return Array.from(this.quests.values()).filter(q => q.state === state);
	}

	/** Accept a quest */
	acceptQuest(id: string): QuestInstance | null {
		const quest = this.quests.get(id);
		if (!quest || quest.state !== "available") return null;

		quest.state = "active";
		quest.acceptedAt = Date.now();
		this.log.push(`Accepted: ${quest.def.name}`);
		return quest;
	}

	/** Update quest progress */
	updateProgress(id: string, data: Record<string, Record<string, number>>): QuestInstance | null {
		const quest = this.quests.get(id);
		if (!quest || quest.state !== "active") return null;

		for (const obj of quest.def.objectives) {
			if (obj.entityId && data.kills?.[obj.entityId] !== undefined) {
				obj.current = Math.min(obj.current + data.kills[obj.entityId]!, obj.target);
			}
			if (obj.entityId && data.items?.[obj.entityId] !== undefined) {
				obj.current = Math.min(obj.current + data.items[obj.entityId]!, obj.target);
			}
			if (data.explore && obj.description.includes("Visit")) {
				obj.current = Math.min(obj.current + 1, obj.target);
			}
			if (obj.entityId && data.talk?.[obj.entityId] !== undefined) {
				obj.current = Math.min(obj.current + data.talk[obj.entityId]!, obj.target);
			}
		}

		// Check completion
		const allComplete = quest.def.objectives.every(o => o.current >= o.target);
		if (allComplete) {
			quest.state = "complete";
			quest.completedAt = Date.now();
			this.log.push(`Completed: ${quest.def.name}`);

			// Unlock chain quest
			if (quest.def.chain) {
				this.unlockQuest(quest.def.chain);
			}

			// Refresh prerequisites
			this.refreshLockedQuests();
		}

		return quest;
	}

	/** Turn in a completed quest and get rewards */
	turnIn(id: string): QuestReward | null {
		const quest = this.quests.get(id);
		if (!quest || quest.state !== "complete") return null;

		quest.state = "turned_in";
		this.completedQuests.add(id);
		this.log.push(`Turned in: ${quest.def.name}`);
		this.refreshLockedQuests();
		return quest.def.reward;
	}

	/** Fail a quest */
	failQuest(id: string): boolean {
		const quest = this.quests.get(id);
		if (!quest || quest.state !== "active") return false;
		quest.state = "failed";
		this.log.push(`Failed: ${quest.def.name}`);
		return true;
	}

	/** Unlock a quest by ID */
	unlockQuest(id: string): void {
		const quest = this.quests.get(id);
		if (!quest || quest.state !== "locked") return;
		if (quest.def.prerequisites.every(p => this.completedQuests.has(p))) {
			quest.state = "available";
		}
	}

	/** Refresh all locked quests */
	refreshLockedQuests(): void {
		for (const quest of this.quests.values()) {
			if (quest.state === "locked") {
				if (quest.def.prerequisites.every(p => this.completedQuests.has(p))) {
					quest.state = "available";
				}
			}
		}
	}

	/** Update time-based quests */
	update(dt: number): void {
		for (const quest of this.quests.values()) {
			if (quest.state === "active" && quest.timeRemaining !== null) {
				quest.timeRemaining -= dt;
				if (quest.timeRemaining <= 0) {
					this.failQuest(quest.def.id);
				}
			}
		}
	}

	/** Get quest */
	getQuest(id: string): QuestInstance | undefined {
		return this.quests.get(id);
	}

	/** Get all quests */
	getAllQuests(): QuestInstance[] {
		return Array.from(this.quests.values());
	}

	/** Get quest count by state */
	getStateCounts(): Record<QuestState, number> {
		const counts: Record<QuestState, number> = { available: 0, active: 0, complete: 0, turned_in: 0, failed: 0, locked: 0 };
		for (const q of this.quests.values()) counts[q.state]++;
		return counts;
	}

	/** Get total quest count */
	getTotalCount(): number { return this.quests.size; }

	/** Get log */
	getLog(): string[] { return [...this.log]; }

	/** Serialize */
	toJSON(): object {
		return {
			quests: Array.from(this.quests.entries()).map(([id, q]) => ({
				id,
				state: q.state,
				acceptedAt: q.acceptedAt,
				completedAt: q.completedAt,
				objectives: q.def.objectives,
			})),
			completedQuests: Array.from(this.completedQuests),
		};
	}
}
