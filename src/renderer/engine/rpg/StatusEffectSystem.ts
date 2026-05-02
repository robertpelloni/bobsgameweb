/**
 * StatusEffectSystem — manages active status effects on RPG entities.
 *
 * Supports:
 * - Poison (damage over time)
 * - Burn (damage over time + reduced defense)
 * - Freeze (skip turn, chance to break)
 * - Stun (skip turn)
 * - Regen (heal over time)
 * - Shield (damage reduction)
 * - Haste (extra turns)
 * - Curse (reduced attack)
 * - Blessing (boosted stats)
 * - Bleed (damage over time, stacks)
 *
 * Usage:
 *   const system = new StatusEffectSystem();
 *   system.apply(entity, "poison", { duration: 3, potency: 5 });
 *   system.update(entity, dt);
 */
export type StatusEffectType =
	| "poison"
	| "burn"
	| "freeze"
	| "stun"
	| "regen"
	| "shield"
	| "haste"
	| "curse"
	| "blessing"
	| "bleed";

export interface StatusEffect {
	type: StatusEffectType;
	duration: number; // turns remaining
	potency: number; // effect strength
	stacks: number;
	source: string;
	turnApplied: number;
}

export interface StatusEffectResult {
	type: StatusEffectType;
	damage: number;
	healing: number;
	statModifier: Partial<StatModifiers>;
	message: string;
	expired: boolean;
}

export interface StatModifiers {
	attack: number;
	defense: number;
	speed: number;
	luck: number;
}

const EFFECT_CONFIG: Record<StatusEffectType, {
	color: number;
	icon: string;
	damagePerTurn: boolean;
	healPerTurn: boolean;
	statMod: Partial<StatModifiers>;
	canStack: boolean;
	maxStacks: number;
}>= {
	poison:   { color: 0x44ff44, icon: "☠",  damagePerTurn: true,  healPerTurn: false, statMod: {}, canStack: false, maxStacks: 1 },
	burn:     { color: 0xff6622, icon: "🔥", damagePerTurn: true,  healPerTurn: false, statMod: { defense: -0.2 }, canStack: false, maxStacks: 1 },
	freeze:   { color: 0x44ccff, icon: "❄",  damagePerTurn: false, healPerTurn: false, statMod: { speed: -1 }, canStack: false, maxStacks: 1 },
	stun:     { color: 0xffff44, icon: "⚡", damagePerTurn: false, healPerTurn: false, statMod: { speed: -1 }, canStack: false, maxStacks: 1 },
	regen:    { color: 0x44ff88, icon: "💚", damagePerTurn: false, healPerTurn: true,  statMod: {}, canStack: false, maxStacks: 1 },
	shield:   { color: 0x4488ff, icon: "🛡",  damagePerTurn: false, healPerTurn: false, statMod: { defense: 0.3 }, canStack: false, maxStacks: 1 },
	haste:    { color: 0xffcc44, icon: "⏩", damagePerTurn: false, healPerTurn: false, statMod: { speed: 0.5 }, canStack: false, maxStacks: 1 },
	curse:    { color: 0xaa44ff, icon: "👁", damagePerTurn: false, healPerTurn: false, statMod: { attack: -0.3, luck: -0.2 }, canStack: false, maxStacks: 1 },
	blessing: { color: 0xffdd44, icon: "✨", damagePerTurn: false, healPerTurn: false, statMod: { attack: 0.2, defense: 0.2 }, canStack: false, maxStacks: 1 },
	bleed:    { color: 0xff2222, icon: "🩸", damagePerTurn: true,  healPerTurn: false, statMod: {}, canStack: true, maxStacks: 5 },
};

export class StatusEffectSystem {
	private activeEffects: Map<string, StatusEffect[]> = new Map();
	private turnCounter = 0;
	private log: string[] = [];

	/** Apply a status effect to an entity */
	apply(entityId: string, type: StatusEffectType, opts: {
		duration?: number;
		potency?: number;
		stacks?: number;
		source?: string;
	} = {}): void {
		const config = EFFECT_CONFIG[type];
		if (!config) return;

		let effects = this.activeEffects.get(entityId);
		if (!effects) {
			effects = [];
			this.activeEffects.set(entityId, effects);
		}

		// Check for existing effect of same type
		const existing = effects.find(e => e.type === type);
		if (existing) {
			if (config.canStack) {
				existing.stacks = Math.min(existing.stacks + (opts.stacks ?? 1), config.maxStacks);
			}
			// Refresh duration
			existing.duration = Math.max(existing.duration, opts.duration ?? 3);
			existing.potency = Math.max(existing.potency, opts.potency ?? 5);
			return;
		}

		effects.push({
			type,
			duration: opts.duration ?? 3,
			potency: opts.potency ?? 5,
			stacks: opts.stacks ?? 1,
			source: opts.source ?? "unknown",
			turnApplied: this.turnCounter,
		});

		this.log.push(`Applied ${type} to ${entityId} (${opts.duration ?? 3} turns)`);
	}

	/** Process all effects for a new turn. Returns results per entity. */
	processTurn(entityId: string): StatusEffectResult[] {
		this.turnCounter++;
		const effects = this.activeEffects.get(entityId);
		if (!effects || effects.length === 0) return [];

		const results: StatusEffectResult[] = [];

		for (let i = effects.length - 1; i >= 0; i--) {
			const effect = effects[i]!;
			const config = EFFECT_CONFIG[effect.type];
			const result: StatusEffectResult = {
				type: effect.type,
				damage: 0,
				healing: 0,
				statModifier: { ...config.statMod },
				message: "",
				expired: false,
			};

			// Damage over time
			if (config.damagePerTurn) {
				result.damage = effect.potency * effect.stacks;
				result.message = `${effect.type} deals ${result.damage} damage`;
			}

			// Healing over time
			if (config.healPerTurn) {
				result.healing = effect.potency;
				result.message = `regen heals ${result.healing} HP`;
			}

			// Freeze/stun break chance
			if (effect.type === "freeze" && Math.random() < 0.3) {
				result.message = "broke free from freeze!";
				result.expired = true;
				effect.duration = 0;
			}

			// Reduce duration
			effect.duration--;
			if (effect.duration <= 0) {
				result.expired = true;
				if (!result.message) result.message = `${effect.type} wore off`;
				effects.splice(i, 1);
			}

			results.push(result);
		}

		// Clean up empty
		if (effects.length === 0) {
			this.activeEffects.delete(entityId);
		}

		return results;
	}

	/** Get active effects for an entity */
	getEffects(entityId: string): StatusEffect[] {
		return this.activeEffects.get(entityId) ?? [];
	}

	/** Check if entity has a specific effect */
	hasEffect(entityId: string, type: StatusEffectType): boolean {
		return this.activeEffects.get(entityId)?.some(e => e.type === type) ?? false;
	}

	/** Remove a specific effect */
	removeEffect(entityId: string, type: StatusEffectType): boolean {
		const effects = this.activeEffects.get(entityId);
		if (!effects) return false;
		const idx = effects.findIndex(e => e.type === type);
		if (idx >= 0) {
			effects.splice(idx, 1);
			return true;
		}
		return false;
	}

	/** Remove all effects from an entity */
	clearEffects(entityId: string): void {
		this.activeEffects.delete(entityId);
	}

	/** Get stat modifiers for an entity */
	getStatModifiers(entityId: string): StatModifiers {
		const mods: StatModifiers = { attack: 0, defense: 0, speed: 0, luck: 0 };
		const effects = this.activeEffects.get(entityId) ?? [];
		for (const effect of effects) {
			const config = EFFECT_CONFIG[effect.type];
			if (config.statMod.attack) mods.attack += config.statMod.attack;
			if (config.statMod.defense) mods.defense += config.statMod.defense;
			if (config.statMod.speed) mods.speed += config.statMod.speed;
			if (config.statMod.luck) mods.luck += config.statMod.luck;
		}
		return mods;
	}

	/** Get config for an effect type */
	static getConfig(type: StatusEffectType) {
		return EFFECT_CONFIG[type];
	}

	/** Get all effect types */
	static getAllTypes(): StatusEffectType[] {
		return Object.keys(EFFECT_CONFIG) as StatusEffectType[];
	}

	/** Get the log */
	getLog(): string[] {
		return [...this.log];
	}

	/** Current turn counter */
	getTurn(): number {
		return this.turnCounter;
	}
}
