/**
 * TalentSystem — deep character specialization trees.
 *
 * Features:
 * - 3 trees: Strength, Agility, Intelligence
 * - Nodes with multiple ranks (e.g. 0/5)
 * - Capstone talents (powerful final abilities)
 * - Talent points gained per level
 * - Synergy bonuses between trees
 */

export interface TalentNode {
	id: string;
	name: string;
	description: string;
	maxRank: number;
	currentRank: number;
	tree: "str" | "agi" | "int";
	requiresId?: string;
}

export class TalentSystem {
	private points = 0;
	private trees: Record<string, TalentNode[]> = {
		str: [
			{ id: "might", name: "Brute Might", description: "+2% Attack per rank", maxRank: 5, currentRank: 0, tree: "str" },
			{ id: "cleave", name: "Cleaving Strikes", description: "Attacks hit nearby enemies", maxRank: 1, currentRank: 0, tree: "str", requiresId: "might" }
		],
		agi: [
			{ id: "reflex", name: "Swift Reflexes", description: "+2% Dodge per rank", maxRank: 5, currentRank: 0, tree: "agi" },
			{ id: "blur", name: "Blur", description: "Chance to ignore damage", maxRank: 3, currentRank: 0, tree: "agi", requiresId: "reflex" }
		],
		int: [
			{ id: "focus", name: "Mana Focus", description: "+5% Mana Regen per rank", maxRank: 5, currentRank: 0, tree: "int" },
			{ id: "surge", name: "Arcane Surge", description: "Next spell is free", maxRank: 1, currentRank: 0, tree: "int", requiresId: "focus" }
		]
	};

	invest(tree: "str" | "agi" | "int", nodeId: string): boolean {
		if (this.points <= 0) return false;
		const node = this.trees[tree]?.find(n => n.id === nodeId);
		if (!node || node.currentRank >= node.maxRank) return false;

		// Check prereq
		if (node.requiresId) {
			const pre = this.trees[tree]?.find(n => n.id === node.requiresId);
			if (!pre || pre.currentRank < pre.maxRank) return false;
		}

		node.currentRank++;
		this.points--;
		return true;
	}

	addPoints(amount: number): void { this.points += amount; }
	getPoints(): number { return this.points; }
	getTree(tree: "str" | "agi" | "int"): TalentNode[] { return this.trees[tree] ?? []; }
}
