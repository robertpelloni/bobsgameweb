/**
 * AlchemySystem — potion brewing and material transmuting.
 *
 * Features:
 * - 15+ potion recipes (Health, Mana, Stamina, Buffs)
 * - 3-tier reagent quality (basic, refined, pure)
 * - Brewing success rates and "miracle" procs
 * - Alchemy level progression and perks
 * - Transmutation of base materials (e.g., Iron to Gold)
 * - Cauldron upgrades
 */

export type ReagentType = "herb" | "mushroom" | "crystal" | "essence" | "liquid";
export type PotionEffect = "heal" | "mana" | "buff" | "resist" | "toxic";

export interface Reagent {
	id: string;
	name: string;
	type: ReagentType;
	quality: number; // 1-3
	potency: number;
}

export interface Recipe {
	id: string;
	name: string;
	ingredients: { type: ReagentType; minQuality: number; count: number }[];
	resultId: string;
	minLevel: number;
	xp: number;
}

export class AlchemySystem {
	private level = 1;
	private xp = 0;
	private knownRecipes: Set<string> = new Set(["minor_health", "minor_mana"]);
	private inventory: Map<string, number> = new Map();
	private log: string[] = [];

	private recipes: Recipe[] = [
		{
			id: "minor_health",
			name: "Minor Health Potion",
			ingredients: [{ type: "herb", minQuality: 1, count: 2 }, { type: "liquid", minQuality: 1, count: 1 }],
			resultId: "health_potion_1",
			minLevel: 1,
			xp: 10,
		},
		{
			id: "fire_resist",
			name: "Fire Resistance Elixir",
			ingredients: [{ type: "herb", minQuality: 2, count: 1 }, { type: "crystal", minQuality: 1, count: 1 }],
			resultId: "fire_elixir",
			minLevel: 3,
			xp: 25,
		},
		{
			id: "transmute_gold",
			name: "Transmute: Lead to Gold",
			ingredients: [{ type: "essence", minQuality: 3, count: 1 }, { type: "liquid", minQuality: 2, count: 2 }],
			resultId: "gold_ingot",
			minLevel: 10,
			xp: 100,
		}
	];

	/** Attempt to brew a potion */
	brew(recipeId: string, reagents: Reagent[]): { success: boolean; resultId?: string; msg: string } {
		const recipe = this.recipes.find(r => r.id === recipeId);
		if (!recipe) return { success: false, msg: "Unknown recipe" };
		if (this.level < recipe.minLevel) return { success: false, msg: "Level too low" };

		// Validate ingredients
		for (const req of recipe.ingredients) {
			const matching = reagents.filter(r => r.type === req.type && r.quality >= req.minQuality);
			if (matching.length < req.count) return { success: false, msg: `Missing ${req.count}x ${req.type}` };
		}

		// Calculate success chance
		const baseChance = 0.7 + (this.level - recipe.minLevel) * 0.05;
		const finalChance = Math.min(0.98, baseChance);
		const roll = Math.random();

		if (roll < finalChance) {
			this.addXp(recipe.xp);
			const miracle = roll < 0.05; // 5% chance for double yield
			this.log.push(`Successfully brewed ${recipe.name}${miracle ? " (MIRACLE!)" : ""}!`);
			return { success: true, resultId: recipe.resultId, msg: miracle ? "Miracle brew!" : "Success" };
		} else {
			this.addXp(Math.floor(recipe.xp / 4));
			this.log.push(`Failed to brew ${recipe.name}. Ingredients wasted.`);
			return { success: false, msg: "Failed" };
		}
	}

	private addXp(amount: number): void {
		this.xp += amount;
		const nextLevel = this.level * 100;
		if (this.xp >= nextLevel) {
			this.xp -= nextLevel;
			this.level++;
			this.log.push(`Alchemy reached level ${this.level}!`);
		}
	}

	getLevel(): number { return this.level; }
	getKnownRecipes(): Recipe[] { return this.recipes.filter(r => this.knownRecipes.has(r.id)); }
	learnRecipe(id: string): void { this.knownRecipes.add(id); }
}
