/**
 * QuestLogScene — immersive quest log with categories, objectives, and rewards.
 *
 * Features:
 * - Active/Completed/Failed tabs
 * - Quest detail panel with objectives and progress bars
 * - Reward preview (gold, XP, items)
 * - Quest chain indicators
 * - Keyboard + gamepad navigation
 */
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { Scene, type SceneConfig } from "../state/Scene";
import { StateManager } from "../state/StateManager";
import { InputManager, Key } from "../input/InputManager";

export interface QuestObjective {
	text: string;
	current: number;
	target: number;
}

export interface QuestData {
	id: string;
	title: string;
	description: string;
	category: "main" | "side" | "daily" | "challenge";
	objectives: QuestObjective[];
	rewards: {
		gold?: number;
		xp?: number;
		items?: string[];
	};
	status: "active" | "completed" | "failed";
	priority: number; // Sort order
	chainFrom?: string; // Previous quest in chain
	chainTo?: string; // Next quest in chain
}

export interface QuestLogConfig extends SceneConfig {
	quests?: QuestData[];
	onAbandon?: (questId: string) => void;
}

const TAB_NAMES = ["Active", "Completed", "Failed"];
const CATEGORY_ICONS: Record<string, string> = {
	main: "⭐",
	side: "📋",
	daily: "📅",
	challenge: "⚔",
};

const DEFAULT_QUESTS: QuestData[] = [
	{
		id: "q1",
		title: "Welcome to bob's game",
		description: "Explore the town and talk to the townspeople. Learn the basics of combat and exploration.",
		category: "main",
		objectives: [
			{ text: "Talk to 3 NPCs", current: 2, target: 3 },
			{ text: "Visit the shop", current: 1, target: 1 },
			{ text: "Win a battle", current: 0, target: 1 },
		],
		rewards: { gold: 50, xp: 100 },
		status: "active",
		priority: 1,
		chainTo: "q2",
	},
	{
		id: "q2",
		title: "The Dark Forest",
		description: "Strange creatures have been sighted in the forest to the east. Investigate and report back.",
		category: "main",
		objectives: [
			{ text: "Travel to the forest", current: 0, target: 1 },
			{ text: "Defeat 5 forest enemies", current: 0, target: 5 },
			{ text: "Find the ancient shrine", current: 0, target: 1 },
		],
		rewards: { gold: 200, xp: 500, items: ["Iron Sword"] },
		status: "active",
		priority: 2,
		chainFrom: "q1",
		chainTo: "q3",
	},
	{
		id: "q3",
		title: "Dragon's Lair",
		description: "The dragon has awakened. Gather allies and prepare for the ultimate battle.",
		category: "main",
		objectives: [
			{ text: "Reach level 10", current: 0, target: 10 },
			{ text: "Obtain legendary weapon", current: 0, target: 1 },
			{ text: "Defeat the dragon", current: 0, target: 1 },
		],
		rewards: { gold: 5000, xp: 10000, items: ["Dragon Crown"] },
		status: "active",
		priority: 3,
		chainFrom: "q2",
	},
	{
		id: "q4",
		title: "Herb Gathering",
		description: "The town healer needs medicinal herbs. Collect them from the fields.",
		category: "side",
		objectives: [
			{ text: "Collect 10 herbs", current: 7, target: 10 },
		],
		rewards: { gold: 30, xp: 50 },
		status: "active",
		priority: 10,
	},
	{
		id: "q5",
		title: "Daily Training",
		description: "Complete 3 battles today to maintain your combat skills.",
		category: "daily",
		objectives: [
			{ text: "Win 3 battles", current: 1, target: 3 },
		],
		rewards: { gold: 100, xp: 200 },
		status: "active",
		priority: 5,
	},
	{
		id: "q6",
		title: "First Steps",
		description: "You arrived in the town of bob's game. A new adventure awaits!",
		category: "main",
		objectives: [
			{ text: "Talk to the mayor", current: 1, target: 1 },
			{ text: "Get your first weapon", current: 1, target: 1 },
		],
		rewards: { gold: 25, xp: 50 },
		status: "completed",
		priority: 0,
		chainTo: "q1",
	},
	{
		id: "q7",
		title: "Speed Challenge",
		description: "Clear 40 lines in under 2 minutes. Can you handle the pressure?",
		category: "challenge",
		objectives: [
			{ text: "Clear 40 lines", current: 22, target: 40 },
			{ text: "Time limit: 2:00", current: 0, target: 1 },
		],
		rewards: { gold: 500, xp: 1000, items: ["Speed Boots"] },
		status: "active",
		priority: 4,
	},
	{
		id: "q8",
		title: "The Lost Artifact",
		description: "You failed to retrieve the artifact before the cave collapsed.",
		category: "side",
		objectives: [
			{ text: "Retrieve the artifact", current: 0, target: 1 },
		],
		rewards: { gold: 0, xp: 0 },
		status: "failed",
		priority: 99,
	},
];

export class QuestLogScene extends Scene {
	private quests: QuestData[];
	private selectedTab = 0;
	private selectedQuest = 0;
	private questsList: Container;
	private detailPanel: Container;
	private tabBar: Container;

	constructor(config: QuestLogConfig) {
		super(config);
		this.quests = config.quests ?? DEFAULT_QUESTS;
		this.questsList = new Container();
		this.detailPanel = new Container();
		this.tabBar = new Container();
	}

	public async create(): Promise<void> {
		this.createBackground();
		this.createTitle();
		this.createTabs();
		this.createListArea();
		this.createDetailArea();
		this.createFooter();
		this.refreshUI();
	}

	private createBackground(): void {
		const bg = new Graphics();
		// Parchment-like gradient
		for (let i = 0; i < 20; i++) {
			const ratio = i / 20;
			bg.rect(0, (this.height / 20) * i, this.width, this.height / 20 + 1);
			bg.fill({
				color: Math.floor(0x12 + ratio * 0x08) << 16 |
					Math.floor(0x0e + ratio * 0x08) << 8 |
					Math.floor(0x1a + ratio * 0x10),
			});
		}
		this.container.addChild(bg);
	}

	private createTitle(): void {
		const title = new Text({
			text: "📜 QUEST LOG",
			style: new TextStyle({
				fontFamily: "Arial Black, Arial, sans-serif",
				fontSize: 26,
				fill: 0xffcc44,
				fontWeight: "bold",
			}),
		});
		title.anchor.set(0.5);
		title.position.set(this.width / 2, 22);
		this.container.addChild(title);
	}

	private createTabs(): void {
		this.tabBar.position.set(20, 55);
		this.container.addChild(this.tabBar);
	}

	private createListArea(): void {
		const bg = new Graphics();
		bg.roundRect(15, 80, this.width / 2 - 30, this.height - 130, 6);
		bg.fill({ color: 0x0a0a14, alpha: 0.85 });
		bg.stroke({ color: 0x334466, width: 1 });
		this.container.addChild(bg);

		this.questsList.position.set(25, 90);
		this.container.addChild(this.questsList);
	}

	private createDetailArea(): void {
		const bg = new Graphics();
		bg.roundRect(this.width / 2 + 5, 80, this.width / 2 - 20, this.height - 130, 6);
		bg.fill({ color: 0x0a0a14, alpha: 0.85 });
		bg.stroke({ color: 0x334466, width: 1 });
		this.container.addChild(bg);

		this.detailPanel.position.set(this.width / 2 + 15, 90);
		this.container.addChild(this.detailPanel);
	}

	private createFooter(): void {
		const controls = new Text({
			text: "←→ Tabs  |  ↑↓ Select  |  Enter: Track  |  DEL: Abandon  |  ESC: Close",
			style: new TextStyle({ fill: 0x445566, fontSize: 11 },
			),
		});
		controls.anchor.set(0.5);
		controls.position.set(this.width / 2, this.height - 18);
		this.container.addChild(controls);
	}

	private getFilteredQuests(): QuestData[] {
		const status = ["active", "completed", "failed"][this.selectedTab] as QuestData["status"];
		return this.quests
			.filter(q => q.status === status)
			.sort((a, b) => a.priority - b.priority);
	}

	private refreshUI(): void {
		// Tabs
		this.tabBar.removeChildren();
		const counts = [
			this.quests.filter(q => q.status === "active").length,
			this.quests.filter(q => q.status === "completed").length,
			this.quests.filter(q => q.status === "failed").length,
		];

		for (let i = 0; i < TAB_NAMES.length; i++) {
			const isActive = i === this.selectedTab;
			const tab = new Text({
				text: (isActive ? "▸ " : "  ") + `${TAB_NAMES[i]} (${counts[i]})`,
				style: new TextStyle({
					fill: isActive ? 0xffcc44 : 0x556677,
					fontSize: 13,
					fontWeight: isActive ? "bold" : "normal",
				}),
			});
			tab.position.set(i * 130, 0);
			this.tabBar.addChild(tab);
		}

		// Quest list
		this.questsList.removeChildren();
		const filtered = this.getFilteredQuests();

		if (filtered.length === 0) {
			const empty = new Text({
				text: `No ${TAB_NAMES[this.selectedTab].toLowerCase()} quests.`,
				style: new TextStyle({ fill: 0x556677, fontSize: 14 },
				),
			});
			empty.position.set(20, 40);
			this.questsList.addChild(empty);
		}

		for (let i = 0; i < filtered.length; i++) {
			const quest = filtered[i];
			const isSelected = i === this.selectedQuest;
			const row = new Container();
			row.position.set(0, i * 50);

			// Selection highlight
			if (isSelected) {
				const hl = new Graphics();
				hl.roundRect(-5, -2, this.width / 2 - 40, 46, 4);
				hl.fill({ color: 0x1a2a3a, alpha: 0.6 });
				row.addChild(hl);
			}

			// Category icon
			const icon = new Text({
				text: CATEGORY_ICONS[quest.category] || "📋",
				style: new TextStyle({ fontSize: 16 },
				),
			});
			icon.position.set(0, 4);
			row.addChild(icon);

			// Quest title
			const name = new Text({
				text: quest.title + (quest.chainTo ? " →" : ""),
				style: new TextStyle({
					fill: isSelected ? 0xffffff : 0xaabbcc,
					fontSize: 14,
					fontWeight: "bold",
				}),
			});
			name.position.set(24, 2);
			row.addChild(name);

			// Progress
			const totalObj = quest.objectives.length;
			const doneObj = quest.objectives.filter(o => o.current >= o.target).length;
			const progressText = `${doneObj}/${totalObj} objectives`;
			const progress = new Text({
				text: progressText,
				style: new TextStyle({ fill: 0x667788, fontSize: 11 },
				),
			});
			progress.position.set(24, 22);
			row.addChild(progress);

			// Progress bar
			const barWidth = 100;
			const barG = new Graphics();
			barG.rect(140, 24, barWidth, 8);
			barG.fill(0x222233);
			const pct = totalObj > 0 ? doneObj / totalObj : 0;
			if (pct > 0) {
				barG.rect(140, 24, barWidth * pct, 8);
				barG.fill(quest.status === "completed" ? 0x44ff88 : 0x4488ff);
			}
			row.addChild(barG);

			this.questsList.addChild(row);
		}

		// Detail panel
		this.detailPanel.removeChildren();
		const selected = filtered[this.selectedItem] ?? filtered[this.selectedQuest];
		if (!selected) return;

		let yPos = 0;

		// Chain indicator
		if (selected.chainFrom) {
			const chainText = new Text({
				text: `↑ Continues from: ${this.quests.find(q => q.id === selected.chainFrom)?.title ?? "Previous quest"}`,
				style: new TextStyle({ fill: 0x556677, fontSize: 10 },
				),
			});
			this.detailPanel.addChild(chainText);
			yPos += 16;
		}

		// Category + title
		const catIcon = CATEGORY_ICONS[selected.category] || "📋";
		const title = new Text({
			text: `${catIcon} ${selected.title}`,
			style: new TextStyle({
				fill: selected.status === "completed" ? 0x44ff88 : selected.status === "failed" ? 0xff4444 : 0xffcc44,
				fontSize: 18,
				fontWeight: "bold",
			}),
		});
		title.position.set(0, yPos);
		this.detailPanel.addChild(title);
		yPos += 28;

		// Category badge
		const badge = new Text({
			text: `[${selected.category.toUpperCase()}]`,
			style: new TextStyle({ fill: 0x667788, fontSize: 10 },
			),
		});
		badge.position.set(0, yPos);
		this.detailPanel.addChild(badge);
		yPos += 20;

		// Description
		const desc = new Text({
			text: selected.description,
			style: new TextStyle({
				fill: 0x99aabb,
				fontSize: 12,
				wordWrap: true,
				wordWrapWidth: this.width / 2 - 50,
			}),
		});
		desc.position.set(0, yPos);
		this.detailPanel.addChild(desc);
		yPos += 50;

		// Objectives
		const objHeader = new Text({
			text: "OBJECTIVES:",
			style: new TextStyle({ fill: 0xaabbcc, fontSize: 12, fontWeight: "bold" },
			),
		});
		objHeader.position.set(0, yPos);
		this.detailPanel.addChild(objHeader);
		yPos += 20;

		for (const obj of selected.objectives) {
			const done = obj.current >= obj.target;
			const check = done ? "✅" : "⬜";

			const objText = new Text({
				text: `  ${check} ${obj.text} (${obj.current}/${obj.target})`,
				style: new TextStyle({
					fill: done ? 0x44ff88 : 0x8899aa,
					fontSize: 12,
				}),
			});
			objText.position.set(0, yPos);
			this.detailPanel.addChild(objText);
			yPos += 20;

			// Mini progress bar
			const barG = new Graphics();
			const barW = this.width / 2 - 80;
			barG.rect(20, yPos, barW, 6);
			barG.fill(0x222233);
			const pct = Math.min(1, obj.current / Math.max(1, obj.target));
			if (pct > 0) {
				barG.rect(20, yPos, barW * pct, 6);
				barG.fill(done ? 0x44ff88 : 0x4488ff);
			}
			this.detailPanel.addChild(barG);
			yPos += 14;
		}

		yPos += 10;

		// Rewards
		const rewHeader = new Text({
			text: "REWARDS:",
			style: new TextStyle({ fill: 0xffdd44, fontSize: 12, fontWeight: "bold" },
			),
		});
		rewHeader.position.set(0, yPos);
		this.detailPanel.addChild(rewHeader);
		yPos += 18;

		if (selected.rewards.gold) {
			const goldText = new Text({
				text: `  💰 ${selected.rewards.gold} Gold`,
				style: new TextStyle({ fill: 0xffdd44, fontSize: 12 },
				),
			});
			goldText.position.set(0, yPos);
			this.detailPanel.addChild(goldText);
			yPos += 16;
		}

		if (selected.rewards.xp) {
			const xpText = new Text({
				text: `  ⭐ ${selected.rewards.xp} XP`,
				style: new TextStyle({ fill: 0x88ccff, fontSize: 12 },
				),
			});
			xpText.position.set(0, yPos);
			this.detailPanel.addChild(xpText);
			yPos += 16;
		}

		if (selected.rewards.items?.length) {
			for (const item of selected.rewards.items) {
				const itemText = new Text({
					text: `  🎁 ${item}`,
					style: new TextStyle({ fill: 0xaa88ff, fontSize: 12 },
					),
				});
				itemText.position.set(0, yPos);
				this.detailPanel.addChild(itemText);
				yPos += 16;
			}
		}

		// Chain continuation
		if (selected.chainTo) {
			yPos += 10;
			const nextQuest = this.quests.find(q => q.id === selected.chainTo);
			const chainText = new Text({
				text: `→ Next: ${nextQuest?.title ?? "Unknown quest"}`,
				style: new TextStyle({ fill: 0x4488aa, fontSize: 11 },
				),
			});
			chainText.position.set(0, yPos);
			this.detailPanel.addChild(chainText);
		}
	}

	protected onUpdate(dt: number): void {
		const filtered = this.getFilteredQuests();

		// Tab navigation
		if (InputManager.isLeftPressed()) {
			this.selectedTab = (this.selectedTab - 1 + TAB_NAMES.length) % TAB_NAMES.length;
			this.selectedQuest = 0;
			this.refreshUI();
		}
		if (InputManager.isRightPressed()) {
			this.selectedTab = (this.selectedTab + 1) % TAB_NAMES.length;
			this.selectedQuest = 0;
			this.refreshUI();
		}

		// Quest navigation
		if (InputManager.isUpPressed()) {
			this.selectedQuest = Math.max(0, this.selectedQuest - 1);
			this.refreshUI();
		}
		if (InputManager.isDownPressed()) {
			this.selectedQuest = Math.min(filtered.length - 1, this.selectedQuest + 1);
			this.refreshUI();
		}

		if (InputManager.isCancelPressed()) {
			StateManager.pop();
		}
	}
}
