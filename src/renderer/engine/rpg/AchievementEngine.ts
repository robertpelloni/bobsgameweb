/**
 * AchievementEngine — tracks and unlocks achievements across all game systems.
 *
 * Features:
 * - 30 achievements across 6 categories
 * - Progressive achievements (track progress toward goal)
 * - Hidden achievements (revealed on unlock)
 * - Achievement points system
 * - Notification on unlock
 * - Serialization for save/load
 *
 * Usage:
 *   const engine = new AchievementEngine();
 *   engine.trackProgress("kill_enemies", 1);
 *   engine.unlock("first_blood");
 */
import { EventEmitter } from "events";

export type AchievementCategory = "combat" | "exploration" | "social" | "crafting" | "collection" | "mastery";

export interface Achievement {
	id: string;
	name: string;
	description: string;
	category: AchievementCategory;
	icon: string;
	points: number;
	hidden: boolean;
	unlocked: boolean;
	unlockedAt: number | null;
	progressGoal: number;
	progressCurrent: number;
	requirements?: string[];
}

export interface AchievementUnlock {
	achievement: Achievement;
	timestamp: number;
	totalPoints: number;
}

const ACHIEVEMENTS: Achievement[] = [
	// Combat (8)
	{ id: "first_blood", name: "First Blood", description: "Defeat your first enemy", category: "combat", icon: "⚔", points: 5, hidden: false, unlocked: false, unlockedAt: null, progressGoal: 1, progressCurrent: 0 },
	{ id: "slayer_10", name: "Slayer", description: "Defeat 10 enemies", category: "combat", icon: "🗡", points: 10, hidden: false, unlocked: false, unlockedAt: null, progressGoal: 10, progressCurrent: 0 },
	{ id: "slayer_100", name: "Centurion", description: "Defeat 100 enemies", category: "combat", icon: "💀", points: 25, hidden: false, unlocked: false, unlockedAt: null, progressGoal: 100, progressCurrent: 0 },
	{ id: "dragon_slayer", name: "Dragon Slayer", description: "Defeat the Ancient Dragon", category: "combat", icon: "🐉", points: 50, hidden: true, unlocked: false, unlockedAt: null, progressGoal: 1, progressCurrent: 0 },
	{ id: "arena_champion", name: "Arena Champion", description: "Win the tournament", category: "combat", icon: "🏆", points: 30, hidden: false, unlocked: false, unlockedAt: null, progressGoal: 1, progressCurrent: 0 },
	{ id: "no_damage", name: "Untouchable", description: "Win a battle without taking damage", category: "combat", icon: "🛡", points: 20, hidden: true, unlocked: false, unlockedAt: null, progressGoal: 1, progressCurrent: 0 },
	{ id: "kill_all_types", name: "Bestiary Master", description: "Defeat one of every enemy type", category: "combat", icon: "📖", points: 40, hidden: true, unlocked: false, unlockedAt: null, progressGoal: 11, progressCurrent: 0 },
	{ id: "kill_boss", name: "Boss Hunter", description: "Defeat 5 bosses", category: "combat", icon: "👑", points: 35, hidden: false, unlocked: false, unlockedAt: null, progressGoal: 5, progressCurrent: 0 },

	// Exploration (6)
	{ id: "first_step", name: "First Step", description: "Leave TOWNYUU for the first time", category: "exploration", icon: "👣", points: 5, hidden: false, unlocked: false, unlockedAt: null, progressGoal: 1, progressCurrent: 0 },
	{ id: "all_maps", name: "World Explorer", description: "Visit all 4 locations", category: "exploration", icon: "🗺", points: 20, hidden: false, unlocked: false, unlockedAt: null, progressGoal: 4, progressCurrent: 0 },
	{ id: "dragon_lair", name: "Fearless", description: "Enter the Dragon's Lair", category: "exploration", icon: "🌋", points: 15, hidden: false, unlocked: false, unlockedAt: null, progressGoal: 1, progressCurrent: 0 },
	{ id: "secret_area", name: "Pathfinder", description: "Discover a secret area", category: "exploration", icon: "❓", points: 25, hidden: true, unlocked: false, unlockedAt: null, progressGoal: 1, progressCurrent: 0 },
	{ id: "chests_20", name: "Treasure Hunter", description: "Open 20 chests", category: "exploration", icon: "📦", points: 15, hidden: false, unlocked: false, unlockedAt: null, progressGoal: 20, progressCurrent: 0 },
	{ id: "walk_10000", name: "Marathon Runner", description: "Walk 10,000 steps", category: "exploration", icon: "🏃", points: 10, hidden: false, unlocked: false, unlockedAt: null, progressGoal: 10000, progressCurrent: 0 },

	// Social (4)
	{ id: "first_talk", name: "Friendly", description: "Talk to your first NPC", category: "social", icon: "💬", points: 5, hidden: false, unlocked: false, unlockedAt: null, progressGoal: 1, progressCurrent: 0 },
	{ id: "all_npcs", name: "Social Butterfly", description: "Talk to all NPCs", category: "social", icon: "🗣", points: 20, hidden: false, unlocked: false, unlockedAt: null, progressGoal: 8, progressCurrent: 0 },
	{ id: "guild_create", name: "Guild Founder", description: "Create a guild", category: "social", icon: "⚔", points: 15, hidden: false, unlocked: false, unlockedAt: null, progressGoal: 1, progressCurrent: 0 },
	{ id: "trade_first", name: "Merchant", description: "Complete your first trade", category: "social", icon: "🤝", points: 10, hidden: false, unlocked: false, unlockedAt: null, progressGoal: 1, progressCurrent: 0 },

	// Crafting (4)
	{ id: "first_craft", name: "Apprentice", description: "Craft your first item", category: "crafting", icon: "🔨", points: 5, hidden: false, unlocked: false, unlockedAt: null, progressGoal: 1, progressCurrent: 0 },
	{ id: "craft_50", name: "Artisan", description: "Craft 50 items", category: "crafting", icon: "⚒", points: 20, hidden: false, unlocked: false, unlockedAt: null, progressGoal: 50, progressCurrent: 0 },
	{ id: "enchant_7", name: "Enchanter", description: "Enchant an item to +7", category: "crafting", icon: "✨", points: 30, hidden: true, unlocked: false, unlockedAt: null, progressGoal: 1, progressCurrent: 0 },
	{ id: "enchant_10", name: "Grand Enchanter", description: "Enchant an item to +10", category: "crafting", icon: "💎", points: 50, hidden: true, unlocked: false, unlockedAt: null, progressGoal: 1, progressCurrent: 0 },

	// Collection (4)
	{ id: "first_fish", name: "Angler", description: "Catch your first fish", category: "collection", icon: "🐟", points: 5, hidden: false, unlocked: false, unlockedAt: null, progressGoal: 1, progressCurrent: 0 },
	{ id: "all_fish", name: "Master Fisher", description: "Catch all 12 fish species", category: "collection", icon: "🎣", points: 40, hidden: true, unlocked: false, unlockedAt: null, progressGoal: 12, progressCurrent: 0 },
	{ id: "gold_10000", name: "Wealthy", description: "Accumulate 10,000 gold", category: "collection", icon: "💰", points: 15, hidden: false, unlocked: false, unlockedAt: null, progressGoal: 10000, progressCurrent: 0 },
	{ id: "gold_100000", name: "Tycoon", description: "Accumulate 100,000 gold", category: "collection", icon: "👑", points: 30, hidden: false, unlocked: false, unlockedAt: null, progressGoal: 100000, progressCurrent: 0 },

	// Mastery (4)
	{ id: "level_10", name: "Adventurer", description: "Reach level 10", category: "mastery", icon: "⭐", points: 10, hidden: false, unlocked: false, unlockedAt: null, progressGoal: 10, progressCurrent: 0 },
	{ id: "level_50", name: "Legend", description: "Reach level 50", category: "mastery", icon: "🌟", points: 50, hidden: false, unlocked: false, unlockedAt: null, progressGoal: 50, progressCurrent: 0 },
	{ id: "quest_20", name: "Questor", description: "Complete 20 quests", category: "mastery", icon: "📜", points: 20, hidden: false, unlocked: false, unlockedAt: null, progressGoal: 20, progressCurrent: 0 },
	{ id: "all_achievements", name: "Completionist", description: "Unlock all other achievements", category: "mastery", icon: "💯", points: 100, hidden: true, unlocked: false, unlockedAt: null, progressGoal: 29, progressCurrent: 0 },
];

const CATEGORY_COLORS: Record<AchievementCategory, number> = {
	combat: 0xff4444, exploration: 0x44ff88, social: 0x44aaff,
	crafting: 0xffaa44, collection: 0xffcc44, mastery: 0xaa44ff,
};

export class AchievementEngine extends EventEmitter {
	private achievements: Map<string, Achievement> = new Map();
	private totalPoints = 0;
	private unlockedCount = 0;

	constructor() {
		super();
		for (const a of ACHIEVEMENTS) {
			this.achievements.set(a.id, { ...a });
		}
	}

	/** Track progress toward an achievement */
	trackProgress(id: string, amount: number): Achievement | null {
		const a = this.achievements.get(id);
		if (!a || a.unlocked) return null;

		a.progressCurrent = Math.min(a.progressCurrent + amount, a.progressGoal);

		if (a.progressCurrent >= a.progressGoal) {
			return this.unlock(id);
		}
		return null;
	}

	/** Set absolute progress */
	setProgress(id: string, value: number): Achievement | null {
		const a = this.achievements.get(id);
		if (!a || a.unlocked) return null;

		a.progressCurrent = Math.min(value, a.progressGoal);

		if (a.progressCurrent >= a.progressGoal) {
			return this.unlock(id);
		}
		return null;
	}

	/** Force unlock an achievement */
	unlock(id: string): Achievement | null {
		const a = this.achievements.get(id);
		if (!a || a.unlocked) return null;

		a.unlocked = true;
		a.unlockedAt = Date.now();
		a.progressCurrent = a.progressGoal;
		this.totalPoints += a.points;
		this.unlockedCount++;

		// Update completionist progress
		if (id !== "all_achievements") {
			const comp = this.achievements.get("all_achievements");
			if (comp && !comp.unlocked) {
				comp.progressCurrent = this.unlockedCount;
				if (comp.progressCurrent >= comp.progressGoal) {
					this.unlock("all_achievements");
				}
			}
		}

		const unlockData: AchievementUnlock = {
			achievement: { ...a },
			timestamp: a.unlockedAt,
			totalPoints: this.totalPoints,
		};

		this.emit("unlock", unlockData);
		return { ...a };
	}

	/** Get achievement */
	get(id: string): Achievement | null {
		const a = this.achievements.get(id);
		return a ? { ...a } : null;
	}

	/** Get all achievements */
	getAll(): Achievement[] {
		return Array.from(this.achievements.values()).map(a => ({ ...a }));
	}

	/** Get by category */
	getByCategory(cat: AchievementCategory): Achievement[] {
		return this.getAll().filter(a => a.category === cat);
	}

	/** Get unlocked */
	getUnlocked(): Achievement[] {
		return this.getAll().filter(a => a.unlocked);
	}

	/** Get locked (visible only) */
	getLocked(): Achievement[] {
		return this.getAll().filter(a => !a.unlocked && !a.hidden);
	}

	/** Get completion percentage */
	getCompletionPercent(): number {
		return (this.unlockedCount / this.achievements.size) * 100;
	}

	/** Get total points */
	getTotalPoints(): number { return this.totalPoints; }
	getUnlockedCount(): number { return this.unlockedCount; }
	getTotalCount(): number { return this.achievements.size; }

	/** Category colors */
	static getCategoryColor(cat: AchievementCategory): number {
		return CATEGORY_COLORS[cat];
	}

	/** All categories */
	static getCategories(): AchievementCategory[] {
		return ["combat", "exploration", "social", "crafting", "collection", "mastery"];
	}

	/** Serialize */
	toJSON(): object {
		return {
			achievements: this.getAll(),
			totalPoints: this.totalPoints,
			unlockedCount: this.unlockedCount,
		};
	}

	/** Deserialize */
	static fromJSON(data: any): AchievementEngine {
		const engine = new AchievementEngine();
		if (data.achievements) {
			for (const a of data.achievements) {
				const existing = engine.achievements.get(a.id);
				if (existing) {
					Object.assign(existing, a);
				}
			}
		}
		engine.totalPoints = data.totalPoints ?? 0;
		engine.unlockedCount = data.unlockedCount ?? 0;
		return engine;
	}
}
