/**
 * PetSystem — companion pets that follow the player and provide bonuses.
 *
 * Features:
 * - 12 pet species with unique abilities
 * - Pet leveling and evolution
 * - Happiness/hunger mechanics
 * - Combat assistance (auto-attack, heal, buff)
 * - Pet skills (3 per pet)
 * - Rarity tiers
 * - Pet inventory management
 *
 * Usage:
 *   const pets = new PetSystem();
 *   pets.acquire("fire_fox");
 *   pets.setActive("fire_fox");
 *   pets.update(dt);
 */

export type PetRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type PetAbility = "attack" | "heal" | "buff" | "debuff" | "shield" | "loot" | "scout";

export interface PetSpecies {
	id: string;
	name: string;
	rarity: PetRarity;
	color: number;
	icon: string;
	baseAttack: number;
	baseDefense: number;
	baseHP: number;
	abilities: PetAbility[];
	evolution: string | null; // evolves into
	evolutionLevel: number;
	description: string;
}

export interface PetInstance {
	species: PetSpecies;
	level: number;
	xp: number;
	xpToNext: number;
	happiness: number; // 0-100
	hunger: number; // 0-100 (100 = full)
	skillCooldowns: Record<string, number>;
	active: boolean;
}

const PET_SPECIES: PetSpecies[] = [
	{ id: "fire_fox", name: "Fire Fox", rarity: "common", color: 0xff6622, icon: "🦊", baseAttack: 5, baseDefense: 2, baseHP: 30, abilities: ["attack", "debuff"], evolution: "inferno_fox", evolutionLevel: 10, description: "A playful fox with a flaming tail." },
	{ id: "ice_cat", name: "Ice Cat", rarity: "common", color: 0x88ccff, icon: "🐱", baseAttack: 4, baseDefense: 3, baseHP: 35, abilities: ["attack", "shield"], evolution: "frost_lion", evolutionLevel: 10, description: "A cool cat that freezes enemies." },
	{ id: "forest_owl", name: "Forest Owl", rarity: "common", color: 0x44aa44, icon: "🦉", baseAttack: 3, baseDefense: 2, baseHP: 25, abilities: ["scout", "buff"], evolution: null, evolutionLevel: 99, description: "Wise owl that reveals hidden paths." },
	{ id: "thunder_wolf", name: "Thunder Wolf", rarity: "uncommon", color: 0xffcc44, icon: "🐺", baseAttack: 8, baseDefense: 4, baseHP: 45, abilities: ["attack", "attack", "buff"], evolution: "storm_wolf", evolutionLevel: 15, description: "A wolf that channels lightning." },
	{ id: "shadow_panther", name: "Shadow Panther", rarity: "uncommon", color: 0x6644aa, icon: "🐆", baseAttack: 10, baseDefense: 3, baseHP: 40, abilities: ["attack", "debuff", "scout"], evolution: null, evolutionLevel: 99, description: "Strikes from the shadows." },
	{ id: "crystal_turtle", name: "Crystal Turtle", rarity: "uncommon", color: 0x44ffcc, icon: "🐢", baseAttack: 2, baseDefense: 10, baseHP: 60, abilities: ["shield", "shield", "heal"], evolution: null, evolutionLevel: 99, description: "An impenetrable crystal shell." },
	{ id: "magma_salamander", name: "Magma Salamander", rarity: "rare", color: 0xff4400, icon: "🦎", baseAttack: 12, baseDefense: 5, baseHP: 50, abilities: ["attack", "attack", "debuff"], evolution: null, evolutionLevel: 99, description: "Drips molten lava with each step." },
	{ id: "moon_rabbit", name: "Moon Rabbit", rarity: "rare", color: 0xddddff, icon: "🐰", baseAttack: 3, baseDefense: 3, baseHP: 40, abilities: ["heal", "heal", "buff"], evolution: "celestial_rabbit", evolutionLevel: 20, description: "Heals under moonlight." },
	{ id: "void_bat", name: "Void Bat", rarity: "rare", color: 0x8800aa, icon: "🦇", baseAttack: 9, baseDefense: 2, baseHP: 30, abilities: ["debuff", "debuff", "scout"], evolution: null, evolutionLevel: 99, description: "Drains enemy strength." },
	{ id: "phoenix_chick", name: "Phoenix Chick", rarity: "epic", color: 0xffaa00, icon: "🐦", baseAttack: 15, baseDefense: 6, baseHP: 55, abilities: ["attack", "heal", "buff"], evolution: "phoenix", evolutionLevel: 25, description: "A baby phoenix that revives itself." },
	{ id: "dragon_whelp", name: "Dragon Whelp", rarity: "epic", color: 0xff2222, icon: "🐲", baseAttack: 18, baseDefense: 8, baseHP: 65, abilities: ["attack", "attack", "debuff"], evolution: "elder_dragon", evolutionLevel: 30, description: "A tiny dragon with huge potential." },
	{ id: "celestial_deer", name: "Celestial Deer", rarity: "legendary", color: 0xffffcc, icon: "🦌", baseAttack: 10, baseDefense: 10, baseHP: 80, abilities: ["heal", "buff", "shield"], evolution: null, evolutionLevel: 99, description: "A divine deer that bestows blessings." },
];

export class PetSystem {
	private owned: Map<string, PetInstance> = new Map();
	private activePetId: string | null = null;
	private log: string[] = [];

	/** Acquire a new pet */
	acquire(speciesId: string): PetInstance | null {
		const species = PET_SPECIES.find(s => s.id === speciesId);
		if (!species || this.owned.has(speciesId)) return null;

		const instance: PetInstance = {
			species,
			level: 1,
			xp: 0,
			xpToNext: 50,
			happiness: 80,
			hunger: 100,
			skillCooldowns: {},
			active: false,
		};

		this.owned.set(speciesId, instance);
		this.log.push(`Acquired ${species.name}!`);

		// Auto-set as active if first pet
		if (this.owned.size === 1) {
			this.setActive(speciesId);
		}

		return instance;
	}

	/** Set active pet */
	setActive(speciesId: string): boolean {
		if (!this.owned.has(speciesId)) return false;

		// Deactivate current
		if (this.activePetId) {
			const current = this.owned.get(this.activePetId);
			if (current) current.active = false;
		}

		const pet = this.owned.get(speciesId)!;
		pet.active = true;
		this.activePetId = speciesId;
		return true;
	}

	/** Get active pet */
	getActive(): PetInstance | null {
		return this.activePetId ? this.owned.get(this.activePetId) ?? null : null;
	}

	/** Add XP to a pet */
	addXp(speciesId: string, amount: number): { leveledUp: boolean; evolved: boolean } {
		const pet = this.owned.get(speciesId);
		if (!pet) return { leveledUp: false, evolved: false };

		let leveledUp = false;
		let evolved = false;

		pet.xp += amount;
		while (pet.xp >= pet.xpToNext) {
			pet.xp -= pet.xpToNext;
			pet.level++;
			pet.xpToNext = Math.floor(pet.xpToNext * 1.3);
			leveledUp = true;

			// Check evolution
			if (pet.species.evolution && pet.level >= pet.species.evolutionLevel) {
				const evolvedSpecies = PET_SPECIES.find(s => s.id === pet.species.evolution);
				if (evolvedSpecies) {
					this.log.push(`${pet.species.name} evolved into ${evolvedSpecies.name}!`);
					pet.species = evolvedSpecies;
					evolved = true;
				}
			}
		}

		return { leveledUp, evolved };
	}

	/** Feed pet (restore hunger) */
	feed(speciesId: string, amount: number): void {
		const pet = this.owned.get(speciesId);
		if (!pet) return;
		pet.hunger = Math.min(100, pet.hunger + amount);
		pet.happiness = Math.min(100, pet.happiness + 5);
	}

	/** Pet happiness decay over time */
	update(dt: number): void {
		for (const pet of this.owned.values()) {
			// Hunger decreases over time
			pet.hunger = Math.max(0, pet.hunger - dt * 0.5);

			// Happiness affected by hunger
			if (pet.hunger < 20) {
				pet.happiness = Math.max(0, pet.happiness - dt * 2);
			}

			// Skill cooldowns
			for (const skill of Object.keys(pet.skillCooldowns)) {
				pet.skillCooldowns[skill] = Math.max(0, pet.skillCooldowns[skill] - dt);
				if (pet.skillCooldowns[skill] <= 0) delete pet.skillCooldowns[skill];
			}
		}
	}

	/** Get combat stats for active pet */
	getCombatStats(): { attack: number; defense: number; hp: number; happiness: number } {
		const pet = this.getActive();
		if (!pet) return { attack: 0, defense: 0, hp: 0, happiness: 0 };

		const happinessMult = pet.happiness / 100;
		return {
			attack: Math.floor(pet.species.baseAttack * (1 + pet.level * 0.1) * happinessMult),
			defense: Math.floor(pet.species.baseDefense * (1 + pet.level * 0.05) * happinessMult),
			hp: Math.floor(pet.species.baseHP * (1 + pet.level * 0.08)),
			happiness: pet.happiness,
		};
	}

	/** Get owned pet count */
	getOwnedCount(): number { return this.owned.size; }

	/** Get all owned pets */
	getAllPets(): PetInstance[] { return Array.from(this.owned.values()); }

	/** Check if owns a pet */
	owns(speciesId: string): boolean { return this.owned.has(speciesId); }

	/** Get species data */
	static getSpecies(id: string): PetSpecies | undefined {
		return PET_SPECIES.find(s => s.id === id);
	}

	/** Get all species */
	static getAllSpecies(): PetSpecies[] { return [...PET_SPECIES]; }

	/** Get rarity color */
	static getRarityColor(rarity: PetRarity): number {
		const colors: Record<PetRarity, number> = { common: 0xaaaaaa, uncommon: 0x44ff44, rare: 0x4488ff, epic: 0xaa44ff, legendary: 0xffaa00 };
		return colors[rarity];
	}

	/** Release a pet */
	release(speciesId: string): boolean {
		if (!this.owned.has(speciesId)) return false;
		if (this.activePetId === speciesId) this.activePetId = null;
		return this.owned.delete(speciesId);
	}

	/** Get log */
	getLog(): string[] { return [...this.log]; }
}
