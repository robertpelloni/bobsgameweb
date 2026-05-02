/**
 * LeaderboardScene — global and local high score rankings.
 *
 * Features:
 * - Top 10 rankings display
 * - Multiple categories (Score, Level, Wins, Gold, Fish)
 * - Player highlight
 * - Animated entry transitions
 * - Score formatting
 *
 * Usage:
 *   const scene = new LeaderboardScene({ name: "leaderboard", app });
 */
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { Scene, type SceneConfig } from "../state/Scene";
import { StateManager } from "../state/StateManager";
import { InputManager } from "../input/InputManager";

interface LeaderboardEntry {
	rank: number;
	name: string;
	score: number;
	level: number;
	category: string;
	date: number;
}

type LeaderboardCategory = "score" | "level" | "wins" | "gold" | "fish";

const CATEGORY_CONFIG: Record<LeaderboardCategory, { label: string; icon: string; color: number; format: (n: number) => string }> = {
	score:  { label: "High Score", icon: "🏆", color: 0xffcc44, format: (n) => n.toLocaleString() },
	level:  { label: "Highest Level", icon: "⭐", color: 0x44ff88, format: (n) => `Lv.${n}` },
	wins:   { label: "Battle Wins", icon: "⚔", color: 0xff4444, format: (n) => `${n} wins` },
	gold:   { label: "Gold Earned", icon: "💰", color: 0xffdd44, format: (n) => `${n.toLocaleString()}g` },
	fish:   { label: "Biggest Fish", icon: "🎣", color: 0x44aaff, format: (n) => `${(n / 10).toFixed(1)}kg` },
};

const SAMPLE_ENTRIES: Record<LeaderboardCategory, LeaderboardEntry[]> = {
	score: [
		{ rank: 1, name: "DragonSlayer99", score: 999999, level: 50, category: "score", date: Date.now() - 3600000 },
		{ rank: 2, name: "HeroBob", score: 750000, level: 45, category: "score", date: Date.now() - 7200000 },
		{ rank: 3, name: "MysticMage", score: 500000, level: 40, category: "score", date: Date.now() - 14400000 },
		{ rank: 4, name: "ShadowKnight", score: 350000, level: 35, category: "score", date: Date.now() - 28800000 },
		{ rank: 5, name: "IronGuard", score: 250000, level: 30, category: "score", date: Date.now() - 43200000 },
		{ rank: 6, name: "StormArcher", score: 180000, level: 25, category: "score", date: Date.now() - 86400000 },
		{ rank: 7, name: "ForestRanger", score: 120000, level: 22, category: "score", date: Date.now() - 172800000 },
		{ rank: 8, name: "NecroKing", score: 80000, level: 18, category: "score", date: Date.now() - 259200000 },
		{ rank: 9, name: "PotionMaster", score: 50000, level: 15, category: "score", date: Date.now() - 604800000 },
		{ rank: 10, name: "NewbieNick", score: 10000, level: 5, category: "score", date: Date.now() - 1209600000 },
	],
	level: [
		{ rank: 1, name: "DragonSlayer99", score: 50, level: 50, category: "level", date: Date.now() - 1000000 },
		{ rank: 2, name: "HeroBob", score: 45, level: 45, category: "level", date: Date.now() - 2000000 },
		{ rank: 3, name: "MysticMage", score: 40, level: 40, category: "level", date: Date.now() - 3000000 },
	],
	wins: [
		{ rank: 1, name: "ArenaChamp", score: 250, level: 50, category: "wins", date: Date.now() - 500000 },
		{ rank: 2, name: "DragonSlayer99", score: 180, level: 50, category: "wins", date: Date.now() - 1000000 },
		{ rank: 3, name: "HeroBob", score: 120, level: 45, category: "wins", date: Date.now() - 2000000 },
	],
	gold: [
		{ rank: 1, name: "MerchantKing", score: 999999, level: 50, category: "gold", date: Date.now() - 800000 },
		{ rank: 2, name: "DragonSlayer99", score: 500000, level: 50, category: "gold", date: Date.now() - 1000000 },
		{ rank: 3, name: "HeroBob", score: 250000, level: 45, category: "gold", date: Date.now() - 2000000 },
	],
	fish: [
		{ rank: 1, name: "FishMaster", score: 5000, level: 50, category: "fish", date: Date.now() - 600000 },
		{ rank: 2, name: "DragonSlayer99", score: 2000, level: 50, category: "fish", date: Date.now() - 1000000 },
		{ rank: 3, name: "RelaxingBob", score: 800, level: 10, category: "fish", date: Date.now() - 3000000 },
	],
};

export class LeaderboardScene extends Scene {
	private selectedCategory: LeaderboardCategory = "score";
	private entries: Record<LeaderboardCategory, LeaderboardEntry[]>;
	private entryContainers: Container[] = [];
	private categoryContainer!: Container;

	constructor(config: SceneConfig) {
		super(config);
		this.entries = SAMPLE_ENTRIES;
	}

	public async create(): Promise<void> {
		this.createBackground();
		this.createHeader();
		this.createCategories();
		this.createEntryList();
		this.createFooter();
		this.refreshUI();
	}

	private createBackground(): void {
		const bg = new Graphics();
		for (let i = 0; i < 20; i++) {
			const ratio = i / 20;
			bg.rect(0, (this.height / 20) * i, this.width, this.height / 20 + 1);
			bg.fill({
				color: (Math.floor(0x08 + ratio * 0x06) << 16) |
					(Math.floor(0x0a + ratio * 0x08) << 8) |
					Math.floor(0x14 + ratio * 0x10),
			});
		}
		this.container.addChild(bg);
	}

	private createHeader(): void {
		const title = new Text({
			text: "🏆 LEADERBOARD",
			style: new TextStyle({
				fontFamily: "Arial Black, Arial, sans-serif",
				fontSize: 20,
				fill: 0xffcc44,
				fontWeight: "bold",
				dropShadow: { alpha: 0.3, blur: 4, distance: 2, color: 0x000000 },
			}),
		});
		title.anchor.set(0.5, 0);
		title.position.set(this.width / 2, 4);
		this.container.addChild(title);
	}

	private createCategories(): void {
		this.categoryContainer = new Container();
		this.categoryContainer.position.set(5, 28);
		this.container.addChild(this.categoryContainer);
	}

	private createEntryList(): void {
		const startY = 52;
		const rowH = 18;

		for (let i = 0; i < 10; i++) {
			const container = new Container();
			container.position.set(8, startY + i * (rowH + 2));
			this.entryContainers.push(container);
			this.container.addChild(container);
		}
	}

	private createFooter(): void {
		const footer = new Text({
			text: "←→ Category  |  ESC: Back",
			style: new TextStyle({ fill: 0x445566, fontSize: 9 },
			),
		});
		footer.anchor.set(0.5);
		footer.position.set(this.width / 2, this.height - 5);
		this.container.addChild(footer);
	}

	private refreshUI(): void {
		this.renderCategories();
		this.renderEntries();
	}

	private renderCategories(): void {
		this.categoryContainer.removeChildren();
		const categories: LeaderboardCategory[] = ["score", "level", "wins", "gold", "fish"];
		const tabW = (this.width - 10) / categories.length;

		categories.forEach((cat, i) => {
			const cfg = CATEGORY_CONFIG[cat];
			const isActive = cat === this.selectedCategory;

			const bg = new Graphics();
			bg.roundRect(i * tabW + 1, 0, tabW - 2, 20, 3);
			bg.fill({ color: isActive ? 0x1a2030 : 0x0a0e16, alpha: 0.9 });
			bg.stroke({ color: isActive ? cfg.color : 0x1a2030, width: isActive ? 2 : 1 });
			this.categoryContainer.addChild(bg);

			const label = new Text({
				text: `${cfg.icon}`,
				style: new TextStyle({ fill: isActive ? cfg.color : 0x556677, fontSize: 10 },
				),
			});
			label.anchor.set(0.5);
			label.position.set(i * tabW + tabW / 2, 10);
			this.categoryContainer.addChild(label);
		});
	}

	private renderEntries(): void {
		const entries = this.entries[this.selectedCategory] ?? [];
		const cfg = CATEGORY_CONFIG[this.selectedCategory];
		const rowW = this.width - 16;
		const rowH = 18;

		const RANK_COLORS: Record<number, number> = { 1: 0xffcc44, 2: 0xcccccc, 3: 0xcc8844 };
		const RANK_ICONS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

		for (let i = 0; i < 10; i++) {
			const container = this.entryContainers[i]!;
			container.removeChildren();

			const entry = entries[i];
			if (!entry) {
				// Empty row
				const bg = new Graphics();
				bg.roundRect(0, 0, rowW, rowH, 3);
				bg.fill({ color: 0x080810, alpha: 0.3 });
				container.addChild(bg);
				const emptyText = new Text({
					text: `${i + 1}. --- empty ---`,
					style: new TextStyle({ fill: 0x334455, fontSize: 9 },
					),
				});
				emptyText.position.set(6, 3);
				container.addChild(emptyText);
				continue;
			}

			const rankColor = RANK_COLORS[entry.rank] ?? 0x88aacc;
			const isTop3 = entry.rank <= 3;

			// Row bg
			const bg = new Graphics();
			bg.roundRect(0, 0, rowW, rowH, 3);
			bg.fill({ color: isTop3 ? 0x141820 : 0x0a0e16, alpha: 0.9 });
			bg.stroke({ color: isTop3 ? rankColor : 0x1a2030, width: isTop3 ? 1.5 : 0.5 });
			container.addChild(bg);

			// Rank
			const rankIcon = RANK_ICONS[entry.rank] ?? `${entry.rank}.`;
			const rankText = new Text({
				text: rankIcon,
				style: new TextStyle({ fill: rankColor, fontSize: 10, fontWeight: "bold" },
				),
			});
			rankText.position.set(4, 2);
			container.addChild(rankText);

			// Name
			const nameText = new Text({
				text: entry.name,
				style: new TextStyle({ fill: isTop3 ? 0xffffff : 0xaabbcc, fontSize: 10, fontWeight: isTop3 ? "bold" : "normal" },
				),
			});
			nameText.position.set(40, 2);
			container.addChild(nameText);

			// Score
			const scoreText = new Text({
				text: cfg.format(entry.score),
				style: new TextStyle({ fill: cfg.color, fontSize: 10, fontWeight: "bold" },
				),
			});
			scoreText.anchor.set(1, 0);
			scoreText.position.set(rowW - 6, 2);
			container.addChild(scoreText);
		}
	}

	protected onUpdate(_dt: number): void {
		const categories: LeaderboardCategory[] = ["score", "level", "wins", "gold", "fish"];
		const prevCat = this.selectedCategory;

		if (InputManager.isLeftPressed()) {
			const idx = categories.indexOf(this.selectedCategory);
			this.selectedCategory = categories[(idx - 1 + categories.length) % categories.length]!;
		}
		if (InputManager.isRightPressed()) {
			const idx = categories.indexOf(this.selectedCategory);
			this.selectedCategory = categories[(idx + 1) % categories.length]!;
		}

		if (InputManager.isCancelPressed()) {
			StateManager.pop();
		}

		if (prevCat !== this.selectedCategory) {
			this.refreshUI();
		}
	}
}
