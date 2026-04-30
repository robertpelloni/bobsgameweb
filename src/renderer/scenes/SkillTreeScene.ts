/**
 * SkillTreeScene — visual skill tree with branching paths and prerequisites.
 *
 * Features:
 * - Three skill branches (Combat, Magic, Utility)
 * - Prerequisite chains (must unlock parent before child)
 * - Skill point system
 * - Stat bonuses per skill
 * - Visual connections between nodes
 * - Keyboard + gamepad navigation
 */
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { Scene, type SceneConfig } from "../state/Scene";
import { StateManager } from "../state/StateManager";
import { InputManager, Key } from "../input/InputManager";

export interface SkillNode {
	id: string;
	name: string;
	description: string;
	branch: "combat" | "magic" | "utility";
	tier: number; // 0-4
	cost: number;
	prerequisites: string[]; // Skill IDs
	unlocked: boolean;
	stats: {
		atk?: number;
		def?: number;
		hp?: number;
		mp?: number;
		spd?: number;
		luk?: number;
	};
	icon: number; // Color
}

export interface SkillTreeConfig extends SceneConfig {
	skills?: SkillNode[];
	skillPoints?: number;
	onUnlock?: (skillId: string, points: number) => void;
}

const BRANCH_COLORS = {
	combat: 0xff4444,
	magic: 0x4488ff,
	utility: 0x44ff88,
};

const BRANCH_NAMES = {
	combat: "⚔ Combat",
	magic: "✦ Magic",
	utility: "⚙ Utility",
};

const DEFAULT_SKILLS: SkillNode[] = [
	// Combat Branch
	{ id: "c1", name: "Power Strike", description: "Increases basic attack damage by 10%.", branch: "combat", tier: 0, cost: 1, prerequisites: [], unlocked: false, stats: { atk: 3 }, icon: 0xff6644 },
	{ id: "c2", name: "Iron Skin", description: "Toughens your body, reducing physical damage taken.", branch: "combat", tier: 1, cost: 2, prerequisites: ["c1"], unlocked: false, stats: { def: 5 }, icon: 0xcc8844 },
	{ id: "c3", name: "Critical Eye", description: "Spot enemy weaknesses. +15% critical hit rate.", branch: "combat", tier: 2, cost: 3, prerequisites: ["c1"], unlocked: false, stats: { luk: 10 }, icon: 0xffaa44 },
	{ id: "c4", name: "Berserker", description: "When HP < 30%, attack power doubles.", branch: "combat", tier: 3, cost: 4, prerequisites: ["c2", "c3"], unlocked: false, stats: { atk: 10 }, icon: 0xff2222 },
	{ id: "c5", name: "Warlord", description: "Ultimate combat mastery. All combat stats +20%.", branch: "combat", tier: 4, cost: 5, prerequisites: ["c4"], unlocked: false, stats: { atk: 20, def: 10 }, icon: 0xff0000 },

	// Magic Branch
	{ id: "m1", name: "Mana Well", description: "Increases maximum MP by 20.", branch: "magic", tier: 0, cost: 1, prerequisites: [], unlocked: false, stats: { mp: 20 }, icon: 0x4466ff },
	{ id: "m2", name: "Fireball", description: "Unlock the Fire spell. Deals fire damage.", branch: "magic", tier: 1, cost: 2, prerequisites: ["m1"], unlocked: false, stats: { atk: 8 }, icon: 0xff6600 },
	{ id: "m3", name: "Ice Shield", description: "Unlock the Ice Shield spell. Absorbs damage.", branch: "magic", tier: 1, cost: 2, prerequisites: ["m1"], unlocked: false, stats: { def: 8 }, icon: 0x44ccff },
	{ id: "m4", name: "Lightning Bolt", description: "Unlock Lightning. Hits all enemies.", branch: "magic", tier: 2, cost: 3, prerequisites: ["m2"], unlocked: false, stats: { atk: 15 }, icon: 0xffff44 },
	{ id: "m5", name: "Archmage", description: "Ultimate magic mastery. All spells +50% power.", branch: "magic", tier: 3, cost: 5, prerequisites: ["m3", "m4"], unlocked: false, stats: { mp: 50, atk: 15 }, icon: 0xaa44ff },

	// Utility Branch
	{ id: "u1", name: "Swift Feet", description: "Increases movement and action speed.", branch: "utility", tier: 0, cost: 1, prerequisites: [], unlocked: false, stats: { spd: 5 }, icon: 0x44ff88 },
	{ id: "u2", name: "Lucky Find", description: "Increases item drop rate from enemies.", branch: "utility", tier: 1, cost: 2, prerequisites: ["u1"], unlocked: false, stats: { luk: 15 }, icon: 0x88ff44 },
	{ id: "u3", name: "Herbalist", description: "Healing items restore 50% more HP.", branch: "utility", tier: 1, cost: 2, prerequisites: ["u1"], unlocked: false, stats: { hp: 20 }, icon: 0x44ffaa },
	{ id: "u4", name: "Treasure Hunter", description: "Reveal hidden treasures on the minimap.", branch: "utility", tier: 2, cost: 3, prerequisites: ["u2"], unlocked: false, stats: { luk: 20 }, icon: 0xffcc44 },
	{ id: "u5", name: "Renaissance", description: "Master of all trades. All stats +10%.", branch: "utility", tier: 3, cost: 5, prerequisites: ["u3", "u4"], unlocked: false, stats: { atk: 5, def: 5, hp: 30, mp: 30, spd: 5, luk: 5 }, icon: 0xffffff },
];

export class SkillTreeScene extends Scene {
	private skills: SkillNode[];
	private skillPoints: number;
	private selectedBranch = 0;
	private selectedSkill = 0;
	private branchContainers: Container[] = [];
	private linesContainer!: Container;
	private infoPanel!: Container;
	private pointsText!: Text;
	private messageTimer = 0;
	private message = "";

	constructor(config: SkillTreeConfig) {
		super(config);
		this.skills = config.skills ?? DEFAULT_SKILLS;
		this.skillPoints = config.skillPoints ?? 15;
	}

	public async create(): Promise<void> {
		this.createBackground();
		this.createTitle();
		this.createConnections();
		this.createBranches();
		this.createInfoPanel();
		this.createFooter();
		this.refreshUI();
	}

	private createBackground(): void {
		const bg = new Graphics();
		bg.rect(0, 0, this.width, this.height);
		bg.fill(0x0a0514);

		// Starfield effect
		for (let i = 0; i < 80; i++) {
			const sx = Math.random() * this.width;
			const sy = Math.random() * this.height;
			const size = Math.random() * 1.5 + 0.5;
			bg.circle(sx, sy, size);
			bg.fill(0xffffff, Math.random() * 0.3 + 0.1);
		}

		this.container.addChild(bg);
	}

	private createTitle(): void {
		const title = new Text({
			text: "★ SKILL TREE ★",
			style: new TextStyle({
				fontFamily: "Arial Black, Arial, sans-serif",
				fontSize: 26,
				fill: 0xffcc44,
				fontWeight: "bold",
			}),
		});
		title.anchor.set(0.5);
		title.position.set(this.width / 2, 20);
		this.container.addChild(title);

		this.pointsText = new Text({
			text: `Skill Points: ${this.skillPoints}`,
			style: new TextStyle({
				fill: 0x44ddff,
				fontSize: 16,
				fontWeight: "bold",
			}),
		});
		this.pointsText.position.set(this.width - 160, 15);
		this.container.addChild(this.pointsText);
	}

	private createConnections(): void {
		this.linesContainer = new Container();
		this.container.addChild(this.linesContainer);
	}

	private createBranches(): void {
		const branches: ("combat" | "magic" | "utility")[] = ["combat", "magic", "utility"];
		const branchWidth = this.width / 3;

		for (let b = 0; b < 3; b++) {
			const container = new Container();
			container.position.set(b * branchWidth, 60);
			this.branchContainers.push(container);
			this.container.addChild(container);
		}
	}

	private createInfoPanel(): void {
		const bg = new Graphics();
		bg.roundRect(20, this.height - 130, this.width - 40, 65, 6);
		bg.fill({ color: 0x0a0a1a, alpha: 0.9 });
		bg.stroke({ color: 0x334466, width: 1 });
		this.container.addChild(bg);

		this.infoPanel = new Container();
		this.infoPanel.position.set(30, this.height - 125);
		this.container.addChild(this.infoPanel);
	}

	private createFooter(): void {
		const controls = new Text({
			text: "←→ Branch  |  ↑↓ Skill  |  Enter: Unlock  |  ESC: Close",
			style: new TextStyle({ fill: 0x445566, fontSize: 11 },
			),
		});
		controls.anchor.set(0.5);
		controls.position.set(this.width / 2, this.height - 18);
		this.container.addChild(controls);
	}

	private getBranchSkills(branch: "combat" | "magic" | "utility"): SkillNode[] {
		return this.skills.filter(s => s.branch === branch).sort((a, b) => a.tier - b.tier);
	}

	private canUnlock(skill: SkillNode): boolean {
		if (skill.unlocked) return false;
		if (this.skillPoints < skill.cost) return false;
		return skill.prerequisites.every(preId => {
			const pre = this.skills.find(s => s.id === preId);
			return pre?.unlocked ?? false;
		});
	}

	private refreshUI(): void {
		const branches: ("combat" | "magic" | "utility")[] = ["combat", "magic", "utility"];
		const branchWidth = this.width / 3;

		// Render each branch
		for (let b = 0; b < 3; b++) {
			const container = this.branchContainers[b];
			container.removeChildren();

			const branch = branches[b];
			const color = BRANCH_COLORS[branch];
			const branchSkills = this.getBranchSkills(branch);
			const isSelectedBranch = b === this.selectedBranch;

			// Branch header
			const header = new Text({
				text: BRANCH_NAMES[branch],
				style: new TextStyle({
					fill: isSelectedBranch ? color : 0x334455,
					fontSize: 14,
					fontWeight: "bold",
				}),
			});
			header.anchor.set(0.5);
			header.position.set(branchWidth / 2, 5);
			container.addChild(header);

			// Skills in branch
			const tierSpacing = 60;
			for (let i = 0; i < branchSkills.length; i++) {
				const skill = branchSkills[i];
				const isSel = isSelectedBranch && i === this.selectedSkill;
				const nodeW = branchWidth - 30;
				const nodeX = 15;
				const nodeY = 30 + skill.tier * tierSpacing;

				// Node background
				const nodeBg = new Graphics();
				nodeBg.roundRect(nodeX, nodeY, nodeW, 45, 6);

				if (skill.unlocked) {
					nodeBg.fill({ color: color, alpha: 0.3 });
					nodeBg.stroke({ color: color, width: 2 });
				} else if (this.canUnlock(skill)) {
					nodeBg.fill({ color: 0x1a1a2a });
					nodeBg.stroke({ color: isSel ? 0xffff00 : color, width: isSel ? 2 : 1 });
				} else {
					nodeBg.fill({ color: 0x111118 });
					nodeBg.stroke({ color: 0x333344, width: 1 });
				}

				if (isSel) {
					nodeBg.stroke({ color: 0xffff00, width: 2 });
				}

				container.addChild(nodeBg);

				// Skill name
				const name = new Text({
					text: (skill.unlocked ? "✓ " : isSel ? "▸ " : "  ") + skill.name,
					style: new TextStyle({
						fill: skill.unlocked ? 0xffffff : this.canUnlock(skill) ? 0xaabbcc : 0x555566,
						fontSize: 12,
						fontWeight: "bold",
					}),
				});
				name.position.set(nodeX + 8, nodeY + 5);
				container.addChild(name);

				// Cost
				const costText = new Text({
					text: `${skill.cost} pts`,
					style: new TextStyle({
						fill: this.skillPoints >= skill.cost ? 0x44ddff : 0xff4444,
						fontSize: 10,
					}),
				});
				costText.position.set(nodeX + nodeW - 50, nodeY + 5);
				container.addChild(costText);

				// Stat preview
				const statStr = Object.entries(skill.stats)
					.map(([k, v]) => `${k.toUpperCase()}+${v}`)
					.join(" ");
				const statText = new Text({
					text: statStr.substring(0, 30),
					style: new TextStyle({ fill: 0x667788, fontSize: 9 },
					),
				});
				statText.position.set(nodeX + 8, nodeY + 26);
				container.addChild(statText);
			}
		}

		// Draw connections
		this.linesContainer.removeChildren();
		const lineG = new Graphics();
		for (const skill of this.skills) {
			for (const preId of skill.prerequisites) {
				const pre = this.skills.find(s => s.id === preId);
				if (!pre) continue;

				const branchIdx = ["combat", "magic", "utility"].indexOf(skill.branch);
				const branchX = branchIdx * (this.width / 3);
				const bw = this.width / 3;

				const fromY = 60 + 30 + pre.tier * 60 + 45;
				const toY = 60 + 30 + skill.tier * 60;

				const connected = pre.unlocked;
				lineG.moveTo(branchX + bw / 2, fromY);
				lineG.lineTo(branchX + bw / 2, toY);
				lineG.stroke({
					color: connected ? BRANCH_COLORS[skill.branch] : 0x222233,
					width: connected ? 2 : 1,
					alpha: connected ? 0.6 : 0.3,
				});
			}
		}
		this.linesContainer.addChild(lineG);

		// Info panel
		this.infoPanel.removeChildren();
		const branch = branches[this.selectedBranch];
		const branchSkills = this.getBranchSkills(branch);
		const selected = branchSkills[this.selectedSkill];

		if (selected) {
			const info = new Text({
				text: `${selected.name} — ${selected.description} ${selected.unlocked ? "(UNLOCKED)" : this.canUnlock(selected) ? "[ENTER to unlock]" : selected.prerequisites.length ? `(Requires: ${selected.prerequisites.join(", ")})` : ""}`,
				style: new TextStyle({
					fill: selected.unlocked ? 0x44ff88 : this.canUnlock(selected) ? 0xffcc44 : 0x556677,
					fontSize: 12,
					wordWrap: true,
					wordWrapWidth: this.width - 80,
				}),
			});
			this.infoPanel.addChild(info);
		}
	}

	protected onUpdate(dt: number): void {
		// Branch navigation
		if (InputManager.isLeftPressed()) {
			this.selectedBranch = Math.max(0, this.selectedBranch - 1);
			this.selectedSkill = 0;
			this.refreshUI();
		}
		if (InputManager.isRightPressed()) {
			this.selectedBranch = Math.min(2, this.selectedBranch + 1);
			this.selectedSkill = 0;
			this.refreshUI();
		}

		// Skill navigation
		const branch: ("combat" | "magic" | "utility")[] = ["combat", "magic", "utility"];
		const branchSkills = this.getBranchSkills(branch[this.selectedBranch]);

		if (InputManager.isUpPressed()) {
			this.selectedSkill = Math.max(0, this.selectedSkill - 1);
			this.refreshUI();
		}
		if (InputManager.isDownPressed()) {
			this.selectedSkill = Math.min(branchSkills.length - 1, this.selectedSkill + 1);
			this.refreshUI();
		}

		// Unlock
		if (InputManager.isActionPressed() || InputManager.isKeyPressed(Key.Enter)) {
			const skill = branchSkills[this.selectedSkill];
			if (skill && this.canUnlock(skill)) {
				this.skillPoints -= skill.cost;
				skill.unlocked = true;
				this.pointsText.text = `Skill Points: ${this.skillPoints}`;
				this.refreshUI();
			}
		}

		// Message timer
		if (this.messageTimer > 0) {
			this.messageTimer -= dt;
		}

		if (InputManager.isCancelPressed()) {
			StateManager.pop();
		}
	}
}
