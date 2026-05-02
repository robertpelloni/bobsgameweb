/**
 * MiningSystem — resource extraction and material gathering.
 *
 * Features:
 * - Ore veins with durability and rarity
 * - Pickaxe tiers and efficiency
 * - Rare gem procs (Diamond, Emerald, etc.)
 * - Mining skill leveling
 * - Depth-based difficulty
 */

export interface OreVein {
	id: string;
	name: string;
	rarity: "common" | "uncommon" | "rare" | "epic";
	durability: number;
	yieldId: string;
	minLevel: number;
}

export class MiningSystem {
	private level = 1;
	private xp = 0;
	private logs: string[] = [];

	private veins: OreVein[] = [
		{ id: "iron", name: "Iron Vein", rarity: "common", durability: 5, yieldId: "iron_ore", minLevel: 1 },
		{ id: "coal", name: "Coal Seam", rarity: "common", durability: 3, yieldId: "coal", minLevel: 1 },
		{ id: "gold", name: "Gold Deposit", rarity: "uncommon", durability: 8, yieldId: "gold_ore", minLevel: 5 },
		{ id: "mithril", name: "Mithril Outcrop", rarity: "rare", durability: 12, yieldId: "mithril_ore", minLevel: 10 },
		{ id: "adamant", name: "Adamantite Lode", rarity: "epic", durability: 20, yieldId: "adamantite_ore", minLevel: 20 },
	];

	/** Swing pickaxe at a vein */
	mine(veinId: string, pickaxePower: number = 1): { damage: number; depleted: boolean; items: string[]; msg: string } {
		const vein = this.veins.find(v => v.id === veinId);
		if (!vein) return { damage: 0, depleted: false, items: [], msg: "No vein found" };
		if (this.level < vein.minLevel) return { damage: 0, depleted: false, items: [], msg: "Mining level too low" };

		const damage = pickaxePower;
		const items: string[] = [];
		
		// Small chance of finding the main item on each swing
		if (Math.random() < 0.4) items.push(vein.yieldId);

		// Rare gem procs
		if (Math.random() < 0.05) items.push("rough_gem");

		this.addXp(5);
		
		return {
			damage,
			depleted: false, // In a real system we'd track instance health
			items,
			msg: items.length > 0 ? `Found ${items.join(", ")}!` : "Clink!"
		};
	}

	private addXp(amount: number): void {
		this.xp += amount;
		if (this.xp >= this.level * 50) {
			this.xp -= this.level * 50;
			this.level++;
			this.logs.push(`Mining level ${this.level}!`);
		}
	}

	getLevel() { return this.level; }
}
