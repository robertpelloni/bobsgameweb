/**
 * SkillTreeSystem — character progression and ability unlocks.
 *
 * Features:
 * - Branching skill trees (Combat, Magic, Utility)
 * - Prerequisite tracking
 * - Skill points (SP) currency
 * - Passive vs Active skills
 * - Respec capability
 * - Tiered unlocks
 */

export interface Skill {
	id: string;
	name: string;
	description: string;
	spCost: number;
	tier: number;
	prerequisites: string[]; // Skill IDs
	passive: boolean;
	icon: string;
}

export class SkillTreeSystem {
	private sp = 0;
	private unlocked: Set<string> = new Set();
	private skills: Map<string, Skill> = new Map();

	constructor() {
		this.initDefaultSkills();
	}

	private initDefaultSkills(): void {
		const list: Skill[] = [
			{ id: "strike", name: "Heavy Strike", description: "Deals 150% damage", spCost: 1, tier: 1, prerequisites: [], passive: false, icon: "⚔️" },
			{ id: "block", name: "Shield Block", description: "Blocks 50% damage", spCost: 1, tier: 1, prerequisites: [], passive: false, icon: "🛡️" },
			{ id: "power_strike", name: "Power Strike", description: "Deals 250% damage", spCost: 2, tier: 2, prerequisites: ["strike"], passive: false, icon: "💥" },
			{ id: "meditation", name: "Meditation", description: "Regen 5% Mana/sec", spCost: 1, tier: 1, prerequisites: [], passive: true, icon: "🧘" },
			{ id: "fireball", name: "Fireball", description: "AOE fire damage", spCost: 3, tier: 2, prerequisites: ["meditation"], passive: false, icon: "🔥" },
		];
		list.forEach(s => this.skills.set(s.id, s));
	}

	unlockSkill(id: string): { success: boolean; msg: string } {
		const skill = this.skills.get(id);
		if (!skill) return { success: false, msg: "Skill not found" };
		if (this.unlocked.has(id)) return { success: false, msg: "Already unlocked" };
		if (this.sp < skill.spCost) return { success: false, msg: "Not enough SP" };

		// Check prerequisites
		for (const pre of skill.prerequisites) {
			if (!this.unlocked.has(pre)) return { success: false, msg: `Requires ${this.skills.get(pre)?.name}` };
		}

		this.sp -= skill.spCost;
		this.unlocked.add(id);
		return { success: true, msg: "Skill unlocked!" };
	}

	addSP(amount: number): void { this.sp += amount; }
	getSP(): number { return this.sp; }
	getUnlocked(): string[] { return Array.from(this.unlocked); }
	getAllSkills(): Skill[] { return Array.from(this.skills.values()); }
	isUnlocked(id: string): boolean { return this.unlocked.has(id); }

	respec(): void {
		let refunded = 0;
		for (const id of this.unlocked) {
			refunded += this.skills.get(id)?.spCost ?? 0;
		}
		this.sp += refunded;
		this.unlocked.clear();
	}
}
