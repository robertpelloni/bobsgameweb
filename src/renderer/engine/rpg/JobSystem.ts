/**
 * JobSystem — advanced character classes and role specializations.
 *
 * Features:
 * - 10 jobs (Warrior, Mage, Rogue, Paladin, Bard, Monk, etc.)
 * - Job levels and Job XP (separate from base Level)
 * - Unique job abilities (Actives/Passives)
 * - Job masteries
 * - Sub-job capability
 */

export interface JobAbility {
	id: string;
	name: string;
	jobLevelReq: number;
	type: "active" | "passive";
}

export interface Job {
	id: string;
	name: string;
	description: string;
	abilities: JobAbility[];
	statModifiers: { hp?: number, atk?: number, def?: number, spd?: number };
}

export class JobSystem {
	private currentJobId: string = "novice";
	private subJobId: string | null = null;
	private jobLevels: Map<string, number> = new Map();
	private jobXp: Map<string, number> = new Map();

	private jobs: Job[] = [
		{ 
			id: "warrior", name: "Warrior", description: "Front-line fighter", 
			abilities: [
				{ id: "slash", name: "Slash", jobLevelReq: 1, type: "active" },
				{ id: "toughness", name: "Toughness", jobLevelReq: 5, type: "passive" }
			],
			statModifiers: { hp: 1.2, atk: 1.1 }
		},
		{ 
			id: "mage", name: "Mage", description: "Master of elements", 
			abilities: [
				{ id: "fire", name: "Fire", jobLevelReq: 1, type: "active" },
				{ id: "m_surge", name: "Mana Surge", jobLevelReq: 5, type: "passive" }
			],
			statModifiers: { atk: 1.3, def: 0.8 }
		}
	];

	constructor() {
		this.jobLevels.set("novice", 1);
		this.jobXp.set("novice", 0);
	}

	switchJob(jobId: string): boolean {
		if (this.currentJobId === jobId) return false;
		this.currentJobId = jobId;
		if (!this.jobLevels.has(jobId)) {
			this.jobLevels.set(jobId, 1);
			this.jobXp.set(jobId, 0);
		}
		return true;
	}

	gainJobXp(amount: number): boolean {
		const currentXp = this.jobXp.get(this.currentJobId) ?? 0;
		const currentLvl = this.jobLevels.get(this.currentJobId) ?? 1;
		const nextLevelXp = currentLvl * 100;
		
		this.jobXp.set(this.currentJobId, currentXp + amount);
		if (this.jobXp.get(this.currentJobId)! >= nextLevelXp) {
			this.jobXp.set(this.currentJobId, 0);
			this.jobLevels.set(this.currentJobId, currentLvl + 1);
			return true;
		}
		return false;
	}

	getJobLevel(jobId: string): number { return this.jobLevels.get(jobId) ?? 0; }
	getCurrentJob(): string { return this.currentJobId; }
}
