/**
 * EnchantmentSystem — weapon/armor enhancement via enchantments.
 *
 * Features:
 * - 6 enchantment types (Fire, Ice, Lightning, Holy, Shadow, Nature)
 * - Upgrade levels (+1 to +10) with increasing cost
 * - Success rate decreases with level
 * - Failure can downgrade or destroy (above +7)
 * - Elemental damage bonuses
 * - Visual glow effects per element
 * - Enchantment scrolls as consumables
 *
 * Usage:
 *   const sys = new EnchantmentSystem();
 *   sys.enchant("iron_sword", "fire"); // attempt +1
 *   sys.getBonus("iron_sword"); // { attack: 2, fireDamage: 5 }
 */

export type EnchantmentType = "fire" | "ice" | "lightning" | "holy" | "shadow" | "nature";

export interface EnchantedItem {
	itemId: string;
	enchantment: EnchantmentType;
	level: number; // +0 to +10
}

export interface EnchantResult {
	success: boolean;
	previousLevel: number;
	newLevel: number;
	destroyed: boolean;
	message: string;
}

export interface EnchantBonus {
	attack: number;
	defense: number;
	elementalDamage: number;
	critBonus: number;
	speedBonus: number;
}

const ENCHANT_CONFIG: Record<EnchantmentType, {
	color: number;
	icon: string;
	damageType: string;
	attackBonus: number;
	specialBonus: string;
}> = {
	fire:       { color: 0xff4422, icon: "🔥", damageType: "Burn", attackBonus: 0.05, specialBonus: "20% chance to burn" },
	ice:        { color: 0x44ccff, icon: "❄",  damageType: "Freeze", attackBonus: 0.04, specialBonus: "15% chance to freeze" },
	lightning:  { color: 0xffcc44, icon: "⚡", damageType: "Shock", attackBonus: 0.06, specialBonus: "25% chance to stun" },
	holy:       { color: 0xffffaa, icon: "✨", damageType: "Radiant", attackBonus: 0.03, specialBonus: "+50% vs undead" },
	shadow:     { color: 0xaa44ff, icon: "🌑", damageType: "Shadow", attackBonus: 0.07, specialBonus: "30% crit damage" },
	nature:     { color: 0x44ff88, icon: "🌿", damageType: "Poison", attackBonus: 0.04, specialBonus: "15% life steal" },
};

const UPGRADE_COST: Record<number, number> = {
	1: 50, 2: 100, 3: 200, 4: 400, 5: 800,
	6: 1600, 7: 3200, 8: 6400, 9: 12800, 10: 25600,
};

const BASE_SUCCESS_RATE: Record<number, number> = {
	1: 1.0, 2: 0.9, 3: 0.8, 4: 0.7, 5: 0.6,
	6: 0.5, 7: 0.4, 8: 0.3, 9: 0.2, 10: 0.1,
};

export class EnchantmentSystem {
	private items: Map<string, EnchantedItem> = new Map();
	private log: string[] = [];

	/** Attempt to enchant an item */
	enchant(itemId: string, type: EnchantmentType, luckBonus = 0): EnchantResult {
		let item = this.items.get(itemId);
		const previousLevel = item?.level ?? 0;

		// New item
		if (!item) {
			this.items.set(itemId, { itemId, enchantment: type, level: 1 });
			const msg = `${itemId} enchanted with ${type}! (+1)`;
			this.log.push(msg);
			return { success: true, previousLevel: 0, newLevel: 1, destroyed: false, message: msg };
		}

		// Already max level
		if (item.level >= 10) {
			return { success: false, previousLevel: 10, newLevel: 10, destroyed: false, message: "Already at max level (+10)!" };
		}

		// Must use same element
		if (item.enchantment !== type) {
			return { success: false, previousLevel, newLevel: previousLevel, destroyed: false, message: `Already enchanted with ${item.enchantment}!` };
		}

		const targetLevel = item.level + 1;
		const baseRate = BASE_SUCCESS_RATE[targetLevel] ?? 0.1;
		const successRate = Math.min(1, baseRate + luckBonus);

		if (Math.random() < successRate) {
			item.level = targetLevel;
			const msg = `SUCCESS! ${itemId} upgraded to +${targetLevel}!`;
			this.log.push(msg);
			return { success: true, previousLevel, newLevel: targetLevel, destroyed: false, message: msg };
		}

		// Failure — downgrade or destroy
		if (targetLevel >= 8 && Math.random() < 0.3) {
			// Destroy!
			this.items.delete(itemId);
			const msg = `DESTROYED! ${itemId} shattered at +${previousLevel}!`;
			this.log.push(msg);
			return { success: false, previousLevel, newLevel: 0, destroyed: true, message: msg };
		}

		if (item.level > 1) {
			item.level--;
			const msg = `FAILED! ${itemId} downgraded to +${item.level}`;
			this.log.push(msg);
			return { success: false, previousLevel, newLevel: item.level, destroyed: false, message: msg };
		}

		this.log.push(`FAILED! ${itemId} stayed at +${item.level}`);
		return { success: false, previousLevel, newLevel: item.level, destroyed: false, message: `FAILED! No change.` };
	}

	/** Get enchantment bonus for an item */
	getBonus(itemId: string): EnchantBonus {
		const item = this.items.get(itemId);
		if (!item) return { attack: 0, defense: 0, elementalDamage: 0, critBonus: 0, speedBonus: 0 };

		const config = ENCHANT_CONFIG[item.enchantment];
		const level = item.level;

		return {
			attack: Math.floor(level * (1 + config.attackBonus) * 2),
			defense: Math.floor(level * 0.5),
			elementalDamage: level * 5,
			critBonus: item.enchantment === "shadow" ? level * 0.02 : 0,
			speedBonus: item.enchantment === "lightning" ? level * 0.01 : 0,
		};
	}

	/** Get item info */
	getItem(itemId: string): EnchantedItem | null {
		return this.items.get(itemId) ?? null;
	}

	/** Get enchantment config */
	static getConfig(type: EnchantmentType) {
		return ENCHANT_CONFIG[type];
	}

	/** Get upgrade cost */
	static getUpgradeCost(currentLevel: number): number {
		return UPGRADE_COST[currentLevel + 1] ?? 99999;
	}

	/** Get success rate */
	static getSuccessRate(targetLevel: number, luckBonus = 0): number {
		return Math.min(1, (BASE_SUCCESS_RATE[targetLevel] ?? 0.1) + luckBonus);
	}

	/** Get all enchantment types */
	static getAllTypes(): EnchantmentType[] {
		return ["fire", "ice", "lightning", "holy", "shadow", "nature"];
	}

	/** Get log */
	getLog(): string[] { return [...this.log]; }

	/** Remove enchantment */
	removeEnchant(itemId: string): boolean {
		return this.items.delete(itemId);
	}
}
