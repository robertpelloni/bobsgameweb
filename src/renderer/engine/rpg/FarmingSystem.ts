/**
 * FarmingSystem — crop growth and harvesting.
 *
 * Features:
 * - Soil preparation and watering
 * - Growth stages (Seed → Sprout → Mature)
 * - Season-based crops
 * - Soil quality (fertilizer)
 * - Yield multipliers
 */

export type GrowthStage = "seed" | "sprout" | "mature" | "withered";

export interface Crop {
	id: string;
	name: string;
	growTime: number; // in seconds
	yieldId: string;
	season: "spring" | "summer" | "fall" | "winter" | "all";
}

export interface Plot {
	cropId: string | null;
	startTime: number;
	lastWatered: number;
	isWatered: boolean;
	quality: number;
}

export class FarmingSystem {
	private plots: Plot[] = Array(9).fill(0).map(() => ({ cropId: null, startTime: 0, lastWatered: 0, isWatered: false, quality: 1.0 }));
	private crops: Crop[] = [
		{ id: "wheat", name: "Wheat", growTime: 60, yieldId: "wheat_item", season: "all" },
		{ id: "tomato", name: "Tomato", growTime: 120, yieldId: "tomato_item", season: "summer" },
		{ id: "pumpkin", name: "Pumpkin", growTime: 300, yieldId: "pumpkin_item", season: "fall" },
	];

	plant(index: number, cropId: string): boolean {
		if (index < 0 || index >= this.plots.length) return false;
		if (this.plots[index]!.cropId !== null) return false;
		
		this.plots[index]!.cropId = cropId;
		this.plots[index]!.startTime = Date.now();
		this.plots[index]!.isWatered = false;
		return true;
	}

	water(index: number): void {
		if (this.plots[index]) {
			this.plots[index]!.isWatered = true;
			this.plots[index]!.lastWatered = Date.now();
		}
	}

	getStage(index: number): GrowthStage {
		const plot = this.plots[index]!;
		if (!plot.cropId) return "seed"; // technically empty
		
		const crop = this.crops.find(c => c.id === plot.cropId)!;
		const elapsed = (Date.now() - plot.startTime) / 1000;
		
		if (!plot.isWatered && elapsed > crop.growTime * 0.5) return "withered";
		if (elapsed >= crop.growTime) return "mature";
		if (elapsed >= crop.growTime * 0.3) return "sprout";
		return "seed";
	}

	harvest(index: number): string | null {
		if (this.getStage(index) === "mature") {
			const id = this.plots[index]!.cropId;
			const crop = this.crops.find(c => c.id === id)!;
			this.plots[index]!.cropId = null;
			return crop.yieldId;
		}
		return null;
	}
}
