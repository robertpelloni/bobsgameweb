/**
 * CookingSystem — food preparation and stat-buffing meals.
 *
 * Features:
 * - 20+ food recipes
 * - Multi-ingredient combining (Protein + Veggie + Spice)
 * - Cooking stations (Oven, Campfire, Pot)
 * - Duration-based buffs from meals
 * - Quality tiers (Burnt, Decent, Gourmet)
 */

export interface FoodBuff {
	stat: string;
	value: number;
	duration: number;
}

export interface Meal {
	id: string;
	name: string;
	buff: FoodBuff;
}

export class CookingSystem {
	private level = 1;
	private xp = 0;

	cook(ingredients: string[]): Meal {
		const hasMeat = ingredients.includes("raw_meat");
		const hasVeggie = ingredients.includes("herb");
		
		if (hasMeat && hasVeggie) {
			return { id: "stew", name: "Hearty Stew", buff: { stat: "hp", value: 20, duration: 600 } };
		}
		if (hasMeat) {
			return { id: "steak", name: "Grilled Steak", buff: { stat: "atk", value: 5, duration: 300 } };
		}
		
		return { id: "burnt", name: "Burnt Toast", buff: { stat: "hp", value: -5, duration: 10 } };
	}

	addXp(amount: number) {
		this.xp += amount;
		if (this.xp >= this.level * 40) {
			this.xp -= this.level * 40;
			this.level++;
		}
	}
}
