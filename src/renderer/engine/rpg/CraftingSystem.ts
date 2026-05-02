/**
 * CraftingSystem — combine items to create new items.
 *
 * Features:
 * - Recipe-based crafting (input items → output item)
 * - Category filters
 * - Material checking (shows what you have / need)
 * - Success/failure with rarity-based odds
 * - Discovery system (learn recipes by finding them)
 *
 * Usage:
 *   const crafting = new CraftingSystem(inventory);
 *   const result = crafting.craft("iron_sword");
 */
export interface CraftingRecipe {
	id: string;
	name: string;
	description: string;
	category: "weapon" | "armor" | "item" | "special";
	ingredients: { itemId: string; quantity: number }[];
	result: { itemId: string; quantity: number; rarity: string };
	successRate: number; // 0-1
	discovered: boolean;
}

export interface InventoryItem {
	id: string;
	name: string;
	quantity: number;
}

export class CraftingSystem {
	private recipes: CraftingRecipe[];
	private inventory: InventoryItem[];

	constructor(inventory: InventoryItem[], recipes?: CraftingRecipe[]) {
		this.inventory = inventory;
		this.recipes = recipes ?? CraftingSystem.DEFAULT_RECIPES;
	}

	/** Get all recipes (optionally filtered by discovered) */
	getRecipes(options?: { category?: string; discovered?: boolean }): CraftingRecipe[] {
		let filtered = [...this.recipes];
		if (options?.category) {
			filtered = filtered.filter(r => r.category === options.category);
		}
		if (options?.discovered !== undefined) {
			filtered = filtered.filter(r => r.discovered === options.discovered);
		}
		return filtered;
	}

	/** Check if player can craft a recipe */
	canCraft(recipeId: string): { canCraft: boolean; missing: string[] } {
		const recipe = this.recipes.find(r => r.id === recipeId);
		if (!recipe) return { canCraft: false, missing: ["Unknown recipe"] };

		const missing: string[] = [];

		for (const ing of recipe.ingredients) {
			const owned = this.inventory.find(i => i.id === ing.itemId);
			const ownedQty = owned?.quantity ?? 0;
			if (ownedQty < ing.quantity) {
				missing.push(`${ing.itemId} (need ${ing.quantity}, have ${ownedQty})`);
			}
		}

		return { canCraft: missing.length === 0, missing };
	}

	/** Attempt to craft a recipe. Returns result or null. */
	craft(recipeId: string): { success: boolean; result?: InventoryItem; message: string } {
		const recipe = this.recipes.find(r => r.id === recipeId);
		if (!recipe) return { success: false, message: "Unknown recipe" };

		const { canCraft, missing } = this.canCraft(recipeId);
		if (!canCraft) {
			return {
				success: false,
				message: `Missing materials: ${missing.join(", ")}`,
			};
		}

		// Consume ingredients
		for (const ing of recipe.ingredients) {
			const owned = this.inventory.find(i => i.id === ing.itemId);
			if (owned) {
				owned.quantity -= ing.quantity;
				if (owned.quantity <= 0) {
					this.inventory = this.inventory.filter(i => i.id !== ing.itemId);
				}
			}
		}

		// Roll for success
		const roll = Math.random();
		if (roll > recipe.successRate) {
			return {
				success: false,
				message: `Crafting failed! ${recipe.name} materials lost.`,
			};
		}

		// Add result to inventory
		const resultItem: InventoryItem = {
			id: recipe.result.itemId,
			name: recipe.name,
			quantity: recipe.result.quantity,
		};

		const existing = this.inventory.find(i => i.id === resultItem.id);
		if (existing) {
			existing.quantity += resultItem.quantity;
		} else {
			this.inventory.push(resultItem);
		}

		return {
			success: true,
			result: resultItem,
			message: `Crafted ${recipe.name}! (${recipe.result.rarity})`,
		};
	}

	/** Discover a recipe (from found scroll, NPC, etc.) */
	discoverRecipe(recipeId: string): boolean {
		const recipe = this.recipes.find(r => r.id === recipeId);
		if (!recipe || recipe.discovered) return false;
		recipe.discovered = true;
		return true;
	}

	/** Get current inventory */
	getInventory(): InventoryItem[] {
		return this.inventory;
	}

	/** Default recipes */
	static readonly DEFAULT_RECIPES: CraftingRecipe[] = [
		{
			id: "craft_iron_sword",
			name: "Iron Sword",
			description: "Forge a sturdy iron blade.",
			category: "weapon",
			ingredients: [
				{ itemId: "iron_ore", quantity: 3 },
				{ itemId: "wood", quantity: 1 },
			],
			result: { itemId: "iron_sword", quantity: 1, rarity: "uncommon" },
			successRate: 0.9,
			discovered: true,
		},
		{
			id: "craft_steel_blade",
			name: "Steel Blade",
			description: "A superior steel weapon.",
			category: "weapon",
			ingredients: [
				{ itemId: "iron_ore", quantity: 5 },
				{ itemId: "coal", quantity: 3 },
			],
			result: { itemId: "steel_blade", quantity: 1, rarity: "rare" },
			successRate: 0.7,
			discovered: true,
		},
		{
			id: "craft_health_potion",
			name: "Health Potion",
			description: "Brew a healing potion from herbs.",
			category: "item",
			ingredients: [
				{ itemId: "herb", quantity: 2 },
				{ itemId: "water_flask", quantity: 1 },
			],
			result: { itemId: "health_potion", quantity: 3, rarity: "common" },
			successRate: 1.0,
			discovered: true,
		},
		{
			id: "craft_mana_potion",
			name: "Mana Potion",
			description: "Brew a mana restoration potion.",
			category: "item",
			ingredients: [
				{ itemId: "magic_dust", quantity: 2 },
				{ itemId: "water_flask", quantity: 1 },
			],
			result: { itemId: "mana_potion", quantity: 3, rarity: "common" },
			successRate: 1.0,
			discovered: true,
		},
		{
			id: "craft_leather_armor",
			name: "Leather Armor",
			description: "Craft basic leather protection.",
			category: "armor",
			ingredients: [
				{ itemId: "leather", quantity: 4 },
				{ itemId: "thread", quantity: 2 },
			],
			result: { itemId: "leather_armor", quantity: 1, rarity: "common" },
			successRate: 0.95,
			discovered: true,
		},
		{
			id: "craft_chain_mail",
			name: "Chain Mail",
			description: "Link metal rings into sturdy armor.",
			category: "armor",
			ingredients: [
				{ itemId: "iron_ore", quantity: 8 },
				{ itemId: "coal", quantity: 2 },
			],
			result: { itemId: "chain_mail", quantity: 1, rarity: "uncommon" },
			successRate: 0.75,
			discovered: false,
		},
		{
			id: "craft_elixir",
			name: "Elixir",
			description: "A powerful restorative elixir.",
			category: "item",
			ingredients: [
				{ itemId: "health_potion", quantity: 1 },
				{ itemId: "mana_potion", quantity: 1 },
				{ itemId: "magic_dust", quantity: 3 },
			],
			result: { itemId: "elixir", quantity: 1, rarity: "rare" },
			successRate: 0.6,
			discovered: false,
		},
		{
			id: "craft_flame_blade",
			name: "Flame Blade",
			description: "Infuse a blade with fire magic.",
			category: "weapon",
			ingredients: [
				{ itemId: "steel_blade", quantity: 1 },
				{ itemId: "fire_gem", quantity: 1 },
				{ itemId: "magic_dust", quantity: 5 },
			],
			result: { itemId: "flame_blade", quantity: 1, rarity: "rare" },
			successRate: 0.5,
			discovered: false,
		},
		{
			id: "craft_antidote",
			name: "Antidote",
			description: "Cures poison status.",
			category: "item",
			ingredients: [
				{ itemId: "herb", quantity: 1 },
				{ itemId: "water_flask", quantity: 1 },
			],
			result: { itemId: "antidote", quantity: 2, rarity: "common" },
			successRate: 1.0,
			discovered: true,
		},
	];
}
