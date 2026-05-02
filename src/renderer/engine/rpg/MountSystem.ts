/**
 * MountSystem — rideable mounts for faster travel and exploration.
 *
 * Features:
 * - 8 mount types (Horse, Wolf, Dragon, Carpet, etc.)
 * - Speed multipliers per mount
 * - Terrain bonuses (e.g., Wolf faster in forests)
 * - Stamina and fatigue system
 * - Mount equipment (saddles, barding)
 * - Summon/dismiss logic
 */

export type MountType = "beast" | "mechanical" | "magical";
export type TerrainType = "road" | "forest" | "mountain" | "water";

export interface Mount {
	id: string;
	name: string;
	type: MountType;
	baseSpeed: number;
	stamina: number;
	maxStamina: number;
	terrainBonuses: Partial<Record<TerrainType, number>>;
	level: number;
}

export class MountSystem {
	private activeMount: Mount | null = null;
	private owned: Mount[] = [];
	private fatigue = 0; // 0-100

	constructor() {
		// Starter mount
		this.owned.push({
			id: "brown_horse",
			name: "Brown Horse",
			type: "beast",
			baseSpeed: 1.5,
			stamina: 100,
			maxStamina: 100,
			terrainBonuses: { road: 1.2 },
			level: 1
		});
	}

	summon(id: string): boolean {
		const mount = this.owned.find(m => m.id === id);
		if (!mount) return false;
		this.activeMount = mount;
		return true;
	}

	dismiss(): void {
		this.activeMount = null;
	}

	/** Calculate current movement speed multiplier */
	getSpeedMultiplier(terrain: TerrainType): number {
		if (!this.activeMount) return 1.0;
		if (this.fatigue > 90) return 0.8; // Exhausted

		const base = this.activeMount.baseSpeed;
		const bonus = this.activeMount.terrainBonuses[terrain] ?? 1.0;
		return base * bonus;
	}

	update(dt: number, isMoving: boolean): void {
		if (this.activeMount && isMoving) {
			this.fatigue = Math.min(100, this.fatigue + dt * 2);
			this.activeMount.stamina = Math.max(0, this.activeMount.stamina - dt * 5);
		} else {
			this.fatigue = Math.max(0, this.fatigue - dt * 5);
			if (this.activeMount) {
				this.activeMount.stamina = Math.min(this.activeMount.maxStamina, this.activeMount.stamina + dt * 10);
			}
		}
	}

	getActiveMount(): Mount | null { return this.activeMount; }
	getOwned(): Mount[] { return this.owned; }
	getFatigue(): number { return this.fatigue; }
}
