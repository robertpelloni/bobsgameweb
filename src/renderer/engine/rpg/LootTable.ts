/**
 * LootTableSystem — weighted random drop tables for enemies, chests, and quests.
 *
 * Features:
 * - Weighted random item selection
 * - Multiple rarity tiers (common, uncommon, rare, epic, legendary)
 * - Drop guarantees (at least 1 item)
 * - Conditional drops (requires flag/quest)
 * - Gold drop ranges
 * - Loot table composition and merging
 *
 * Usage:
 *   const table = new LootTable("goblin_drops");
 *   table.addItem("rusty_sword", 1.0, "common");
 *   table.addItem("health_potion", 0.5, "common");
 *   table.addGold(5, 15);
 *   const loot = table.roll();
 */

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export interface LootItem {
	id: string;
	name: string;
	rarity: Rarity;
	weight: number;
	minQuantity: number;
	maxQuantity: number;
	condition?: string; // flag required
}

export interface GoldDrop {
	min: number;
	max: number;
	chance: number; // 0-1
}

export interface LootResult {
	items: { id: string; name: string; quantity: number; rarity: Rarity }[];
	gold: number;
	totalValue: number;
}

export const RARITY_COLORS: Record<Rarity, number> = {
	common: 0xaaaaaa,
	uncommon: 0x44ff44,
	rare: 0x4488ff,
	epic: 0xaa44ff,
	legendary: 0xffaa00,
};

export const RARITY_ORDER: Record<Rarity, number> = {
	common: 0,
	uncommon: 1,
	rare: 2,
	epic: 3,
	legendary: 4,
};

export class LootTable {
	public id: string;
	public items: LootItem[] = [];
	public goldDrop: GoldDrop = { min: 0, max: 0, chance: 0 };
	public guaranteedDrop = false;
	public maxDrops = 3;

	constructor(id: string) {
		this.id = id;
	}

	addItem(id: string, weight: number, rarity: Rarity, name = id, minQty = 1, maxQty = 1, condition?: string): this {
		this.items.push({ id, name, rarity, weight, minQuantity: minQty, maxQuantity: maxQty, condition });
		return this;
	}

	addGold(min: number, max: number, chance = 1.0): this {
		this.goldDrop = { min, max, chance };
		return this;
	}

	setGuaranteed(value: boolean): this {
		this.guaranteedDrop = value;
		return this;
	}

	setMaxDrops(max: number): this {
		this.maxDrops = max;
		return this;
	}

	/** Roll the loot table and get results */
	roll(flags?: Set<string>): LootResult {
		const result: LootResult = { items: [], gold: 0, totalValue: 0 };

		// Roll gold
		if (Math.random() < this.goldDrop.chance) {
			const { min, max } = this.goldDrop;
			result.gold = min + Math.floor(Math.random() * (max - min + 1));
		}

		// Roll items
		const eligible = this.items.filter(item => {
			if (item.condition && flags && !flags.has(item.condition)) return false;
			return true;
		});

		if (eligible.length === 0) return result;

		// Weighted selection
		const totalWeight = eligible.reduce((sum, item) => sum + item.weight, 0);
		let drops = 0;

		for (const item of eligible) {
			if (drops >= this.maxDrops) break;

			const dropChance = item.weight / totalWeight;
			if (Math.random() < dropChance || (this.guaranteedDrop && drops === 0)) {
				const quantity = item.minQuantity + Math.floor(Math.random() * (item.maxQuantity - item.minQuantity + 1));
				result.items.push({
					id: item.id,
					name: item.name,
					quantity,
					rarity: item.rarity,
				});
				drops++;
			}
		}

		// Calculate total value estimate
		result.totalValue = result.gold + result.items.reduce((sum, item) => {
			const rarityMultiplier = 1 + RARITY_ORDER[item.rarity] * 2;
			return sum + item.quantity * rarityMultiplier * 10;
		}, 0);

		return result;
	}

	/** Get all possible items */
	getAllItems(): LootItem[] {
		return [...this.items];
	}

	/** Get items by rarity */
	getItemsByRarity(rarity: Rarity): LootItem[] {
		return this.items.filter(i => i.rarity === rarity);
	}

	/** Get highest rarity item */
	getHighestRarity(): Rarity | null {
		if (this.items.length === 0) return null;
		let highest: Rarity = "common";
		for (const item of this.items) {
			if (RARITY_ORDER[item.rarity] > RARITY_ORDER[highest]) {
				highest = item.rarity;
			}
		}
		return highest;
	}
}

// ============================================================
// Preset Loot Tables
// ============================================================

export function createGoblinTable(): LootTable {
	return new LootTable("goblin_drops")
		.addItem("rusty_sword", 0.4, "common", "Rusty Sword")
		.addItem("health_potion", 0.3, "common", "Health Potion")
		.addItem("leather_scrap", 0.2, "common", "Leather Scrap", 1, 3)
		.addItem("goblin_ear", 0.1, "uncommon", "Goblin Ear")
		.addGold(3, 12);
}

export function createWolfTable(): LootTable {
	return new LootTable("wolf_drops")
		.addItem("wolf_pelt", 0.3, "common", "Wolf Pelt")
		.addItem("wolf_fang", 0.25, "common", "Wolf Fang", 1, 2)
		.addItem("health_potion", 0.2, "common", "Health Potion")
		.addItem("wolf_claw", 0.15, "uncommon", "Wolf Claw")
		.addItem("alpha_fang", 0.05, "rare", "Alpha Fang")
		.addGold(5, 18);
}

export function createDragonTable(): LootTable {
	return new LootTable("dragon_drops")
		.addItem("dragon_scale", 0.3, "rare", "Dragon Scale", 2, 5)
		.addItem("dragon_tooth", 0.25, "rare", "Dragon Tooth", 1, 3)
		.addItem("fire_essence", 0.2, "epic", "Fire Essence")
		.addItem("dragon_bone", 0.15, "epic", "Dragon Bone")
		.addItem("dragon_heart", 0.05, "legendary", "Dragon Heart")
		.addItem("ancient_recipe", 0.1, "epic", "Ancient Recipe", 1, 1, "found_shrine")
		.addGold(200, 600)
		.setGuaranteed(true)
		.setMaxDrops(4);
}

export function createChestTable(tier: "wood" | "iron" | "gold"): LootTable {
	const tables: Record<string, LootTable> = {
		wood: new LootTable("chest_wood")
			.addItem("health_potion", 0.4, "common", "Health Potion")
			.addItem("mana_potion", 0.3, "common", "Mana Potion")
			.addItem("iron_sword", 0.15, "uncommon", "Iron Sword")
			.addItem("silver_ring", 0.1, "uncommon", "Silver Ring")
			.addItem("mystery_scroll", 0.05, "rare", "Mystery Scroll")
			.addGold(10, 50),

		iron: new LootTable("chest_iron")
			.addItem("steel_blade", 0.3, "uncommon", "Steel Blade")
			.addItem("knight_shield", 0.25, "uncommon", "Knight Shield")
			.addItem("health_elixir", 0.2, "rare", "Health Elixir")
			.addItem("magic_staff", 0.15, "rare", "Magic Staff")
			.addItem("enchanted_gem", 0.1, "epic", "Enchanted Gem")
			.addGold(50, 200),

		gold: new LootTable("chest_gold")
			.addItem("legendary_blade", 0.2, "epic", "Legendary Blade")
			.addItem("dragon_crown", 0.15, "epic", "Dragon Crown")
			.addItem("phoenix_feather", 0.1, "epic", "Phoenix Feather")
			.addItem("ancient_artifact", 0.05, "legendary", "Ancient Artifact")
			.addItem("infinity_gem", 0.03, "legendary", "Infinity Gem")
			.addGold(200, 1000)
			.setGuaranteed(true)
			.setMaxDrops(3),
	};
	return tables[tier] ?? tables.wood!;
}
