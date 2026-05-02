/**
 * BestiaryScene — monster encyclopedia showing all encountered enemies.
 *
 * Features:
 * - Enemy cards with stats (HP, ATK, DEF, XP, Gold)
 * - Encounter location display
 * - Difficulty rating (stars)
 * - Filter by map location
 * - Animations on entry
 *
 * Usage:
 *   const scene = new BestiaryScene({ name: "bestiary", app });
 */
import { Container, Graphics, Text, TextStyle, Sprite, Texture } from "pixi.js";
import { Scene, type SceneConfig } from "../state/Scene";
import { StateManager } from "../state/StateManager";
import { InputManager, Key } from "../input/InputManager";

interface BestiaryEntry {
	name: string;
	hp: number;
	attack: number;
	defense: number;
	xp: number;
	gold: number;
	location: string;
	difficulty: number; // 1-5 stars
	type: "normal" | "elite" | "boss";
}

function getDifficultyStars(hp: number, attack: number): number {
	const power = hp + attack * 2;
	if (power < 25) return 1;
	if (power < 50) return 2;
	if (power < 100) return 3;
	if (power < 200) return 4;
	return 5;
}

function getEnemyType(hp: number, gold: number): "normal" | "elite" | "boss" {
	if (gold >= 200) return "boss";
	if (hp >= 50) return "elite";
	return "normal";
}

const TYPE_COLORS: Record<string, number> = {
	normal: 0x44aaff,
	elite: 0xff8844,
	boss: 0xff4444,
};

const TYPE_LABELS: Record<string, string> = {
	normal: "Normal",
	elite: "Elite",
	boss: "Boss",
};

const ALL_ENEMIES: BestiaryEntry[] = [
	{ name: "Crab", hp: 12, attack: 4, defense: 3, xp: 8, gold: 3, location: "Sunset Beach", difficulty: 1, type: "normal" },
	{ name: "Beach Jellyfish", hp: 8, attack: 6, defense: 1, xp: 5, gold: 2, location: "Sunset Beach", difficulty: 1, type: "normal" },
	{ name: "Dark Slime", hp: 15, attack: 4, defense: 1, xp: 10, gold: 5, location: "Dark Forest", difficulty: 1, type: "normal" },
	{ name: "Cave Bat", hp: 10, attack: 6, defense: 1, xp: 8, gold: 3, location: "Dark Forest", difficulty: 1, type: "normal" },
	{ name: "Forest Goblin", hp: 20, attack: 5, defense: 2, xp: 15, gold: 8, location: "Dark Forest", difficulty: 2, type: "normal" },
	{ name: "Wild Wolf", hp: 30, attack: 8, defense: 3, xp: 25, gold: 12, location: "Dark Forest", difficulty: 2, type: "normal" },
	{ name: "Fire Elemental", hp: 40, attack: 12, defense: 5, xp: 35, gold: 20, location: "Dragon's Lair", difficulty: 3, type: "elite" },
	{ name: "Lava Golem", hp: 60, attack: 15, defense: 8, xp: 50, gold: 30, location: "Dragon's Lair", difficulty: 3, type: "elite" },
	{ name: "Dragon Whelp", hp: 50, attack: 18, defense: 6, xp: 45, gold: 25, location: "Dragon's Lair", difficulty: 3, type: "elite" },
	{ name: "Ancient Golem", hp: 80, attack: 15, defense: 10, xp: 50, gold: 30, location: "Dark Forest", difficulty: 4, type: "elite" },
	{ name: "Ancient Dragon", hp: 200, attack: 30, defense: 15, xp: 200, gold: 500, location: "Dragon's Lair", difficulty: 5, type: "boss" },
];

const LOCATIONS = ["All Locations", "TOWNYUU", "Dark Forest", "Sunset Beach", "Dragon's Lair"];

export class BestiaryScene extends Scene {
	private entries: BestiaryEntry[];
	private selectedIndex = 0;
	private scrollOffset = 0;
	private locationFilter = 0;
	private filteredEntries: BestiaryEntry[] = [];
	private cardContainers: Container[] = [];
	private headerText!: Text;
	private filterText!: Text;
	private detailContainer!: Container;
	private maxVisible = 5;

	constructor(config: SceneConfig) {
		super(config);
		this.entries = ALL_ENEMIES;
		this.filteredEntries = [...this.entries];
	}

	public async create(): Promise<void> {
		this.createBackground();
		this.createHeader();
		this.createFilterBar();
		this.createCardList();
		this.createDetailPanel();
		this.createFooter();
		this.refreshUI();
	}

	private createBackground(): void {
		const bg = new Graphics();
		for (let i = 0; i < 20; i++) {
			const ratio = i / 20;
			bg.rect(0, (this.height / 20) * i, this.width, this.height / 20 + 1);
			bg.fill({
				color: (Math.floor(0x08 + ratio * 0x08) << 16) |
					(Math.floor(0x0a + ratio * 0x0a) << 8) |
					Math.floor(0x14 + ratio * 0x10),
			});
		}
		this.container.addChild(bg);
	}

	private createHeader(): void {
		this.headerText = new Text({
			text: "📖 BESTIARY",
			style: new TextStyle({
				fontFamily: "Arial Black, Arial, sans-serif",
				fontSize: 22,
				fill: 0xff6644,
				fontWeight: "bold",
				dropShadow: { alpha: 0.3, blur: 4, distance: 2, color: 0x000000 },
			}),
		});
		this.headerText.anchor.set(0.5, 0);
		this.headerText.position.set(this.width / 2, 8);
		this.container.addChild(this.headerText);

		const countText = new Text({
			text: `${this.entries.length} monsters discovered`,
			style: new TextStyle({ fill: 0x556677, fontSize: 10 },
			),
		});
		countText.anchor.set(0.5, 0);
		countText.position.set(this.width / 2, 32);
		this.container.addChild(countText);
	}

	private createFilterBar(): void {
		this.filterText = new Text({
			text: "",
			style: new TextStyle({ fill: 0x88aacc, fontSize: 11 },
			),
		});
		this.filterText.position.set(12, 48);
		this.container.addChild(this.filterText);
	}

	private createCardList(): void {
		const startY = 65;
		const cardH = 36;
		const cardW = this.width - 20;

		for (let i = 0; i < this.maxVisible; i++) {
			const container = new Container();
			container.position.set(10, startY + i * (cardH + 4));
			this.cardContainers.push(container);
			this.container.addChild(container);
		}
	}

	private createDetailPanel(): void {
		this.detailContainer = new Container();
		this.detailContainer.position.set(10, this.height - 140);
		this.container.addChild(this.detailContainer);
	}

	private createFooter(): void {
		const controls = new Text({
			text: "↑↓ Navigate  |  ←→ Filter Location  |  ESC Back",
			style: new TextStyle({ fill: 0x445566, fontSize: 10 },
			),
		});
		controls.anchor.set(0.5);
		controls.position.set(this.width / 2, this.height - 8);
		this.container.addChild(controls);
	}

	private refreshUI(): void {
		// Update filter
		const loc = LOCATIONS[this.locationFilter]!;
		this.filterText.text = `Location: ◀ ${loc} ▶`;

		// Filter entries
		if (this.locationFilter === 0) {
			this.filteredEntries = [...this.entries];
		} else {
			this.filteredEntries = this.entries.filter(e => e.location === loc);
		}

		// Clamp selection
		if (this.selectedIndex >= this.filteredEntries.length) {
			this.selectedIndex = Math.max(0, this.filteredEntries.length - 1);
		}
		if (this.scrollOffset > 0 && this.selectedIndex < this.scrollOffset) {
			this.scrollOffset = this.selectedIndex;
		}
		const maxScroll = Math.max(0, this.filteredEntries.length - this.maxVisible);
		if (this.scrollOffset > maxScroll) this.scrollOffset = maxScroll;

		// Render cards
		const cardH = 36;
		const cardW = this.width - 20;

		for (let i = 0; i < this.maxVisible; i++) {
			const container = this.cardContainers[i]!;
			container.removeChildren();

			const entryIndex = this.scrollOffset + i;
			const entry = this.filteredEntries[entryIndex];
			if (!entry) {
				// Empty slot
				const bg = new Graphics();
				bg.roundRect(0, 0, cardW, cardH, 4);
				bg.fill({ color: 0x080810, alpha: 0.3 });
				container.addChild(bg);
				continue;
			}

			const isSelected = entryIndex === this.selectedIndex;
			const typeColor = TYPE_COLORS[entry.type] ?? 0x44aaff;

			// Card background
			const bg = new Graphics();
			bg.roundRect(0, 0, cardW, cardH, 4);
			bg.fill({ color: isSelected ? 0x141820 : 0x0a0e16, alpha: 0.9 });
			bg.stroke({ color: isSelected ? typeColor : 0x1a2030, width: isSelected ? 2 : 1 });
			container.addChild(bg);

			// Type indicator bar
			const typeBar = new Graphics();
			typeBar.roundRect(0, 0, 4, cardH, 2);
			typeBar.fill(typeColor);
			container.addChild(typeBar);

			// Name
			const nameText = new Text({
				text: entry.name,
				style: new TextStyle({
					fill: isSelected ? 0xffffff : 0xaabbcc,
					fontSize: 13,
					fontWeight: "bold",
				}),
			});
			nameText.position.set(12, 3);
			container.addChild(nameText);

			// Type label
			const typeLabel = new Text({
				text: TYPE_LABELS[entry.type] ?? "Normal",
				style: new TextStyle({ fill: typeColor, fontSize: 9 },
				),
			});
			typeLabel.position.set(12, 20);
			container.addChild(typeLabel);

			// Difficulty stars
			const stars = "★".repeat(entry.difficulty) + "☆".repeat(5 - entry.difficulty);
			const starsText = new Text({
				text: stars,
				style: new TextStyle({ fill: 0xffcc44, fontSize: 9 },
				),
			});
			starsText.position.set(70, 20);
			container.addChild(starsText);

			// HP
			const hpText = new Text({
				text: `HP:${entry.hp}`,
				style: new TextStyle({ fill: 0x44ff88, fontSize: 10 },
				),
			});
			hpText.position.set(cardW - 120, 4);
			container.addChild(hpText);

			// ATK/DEF
			const statsText = new Text({
				text: `ATK:${entry.attack} DEF:${entry.defense}`,
				style: new TextStyle({ fill: 0x667788, fontSize: 9 },
				),
			});
			statsText.position.set(cardW - 120, 20);
			container.addChild(statsText);

			// Selection arrow
			if (isSelected) {
				const arrow = new Text({
					text: "▸",
					style: new TextStyle({ fill: typeColor, fontSize: 14, fontWeight: "bold" },
					),
				});
				arrow.position.set(-10, cardH / 2 - 8);
				container.addChild(arrow);
			}
		}

		// Detail panel
		this.detailContainer.removeChildren();
		const selected = this.filteredEntries[this.selectedIndex];
		if (selected) {
			this.renderDetail(selected);
		}
	}

	private renderDetail(entry: BestiaryEntry): void {
		const container = this.detailContainer;
		const panelW = this.width - 20;
		const panelH = 120;
		const typeColor = TYPE_COLORS[entry.type] ?? 0x44aaff;

		// Panel background
		const bg = new Graphics();
		bg.roundRect(0, 0, panelW, panelH, 6);
		bg.fill({ color: 0x0c1018, alpha: 0.95 });
		bg.stroke({ color: typeColor, width: 1 });
		container.addChild(bg);

		// Monster name
		const nameText = new Text({
			text: entry.name,
			style: new TextStyle({
				fill: 0xffffff,
				fontSize: 16,
				fontWeight: "bold",
			}),
		});
		nameText.position.set(12, 6);
		container.addChild(nameText);

		// Location
		const locText = new Text({
			text: `📍 ${entry.location}`,
			style: new TextStyle({ fill: 0x88aacc, fontSize: 11 },
			),
		});
		locText.position.set(12, 26);
		container.addChild(locText);

		// Stats columns
		const stats = [
			{ label: "HP", value: String(entry.hp), color: 0x44ff88 },
			{ label: "ATK", value: String(entry.attack), color: 0xff6644 },
			{ label: "DEF", value: String(entry.defense), color: 0x4488ff },
			{ label: "XP", value: String(entry.xp), color: 0xffcc44 },
			{ label: "Gold", value: String(entry.gold), color: 0xffdd44 },
		];

		stats.forEach((stat, i) => {
			const col = i % 5;
			const x = 12 + col * 68;

			const label = new Text({
				text: stat.label,
				style: new TextStyle({ fill: 0x556677, fontSize: 9 },
				),
			});
			label.position.set(x, 46);
			container.addChild(label);

			const val = new Text({
				text: stat.value,
				style: new TextStyle({ fill: stat.color, fontSize: 14, fontWeight: "bold" },
				),
			});
			val.position.set(x, 58);
			container.addChild(val);
		});

		// HP bar
		const barY = 82;
		const barW = panelW - 24;
		const barBg = new Graphics();
		barBg.roundRect(12, barY, barW, 8, 3);
		barBg.fill({ color: 0x1a2030 });
		container.addChild(barBg);

		const hpRatio = Math.min(entry.hp / 200, 1);
		const barColor = hpRatio > 0.5 ? 0x44ff88 : hpRatio > 0.25 ? 0xffcc44 : 0xff4444;
		const barFill = new Graphics();
		barFill.roundRect(12, barY, barW * hpRatio, 8, 3);
		barFill.fill(barColor);
		container.addChild(barFill);

		// Power rating
		const power = entry.hp + entry.attack * 2 + entry.defense;
		const powerText = new Text({
			text: `Power: ${power}  |  Threat: ${TYPE_LABELS[entry.type]}`,
			style: new TextStyle({ fill: 0x667788, fontSize: 10 },
			),
		});
		powerText.position.set(12, 96);
		container.addChild(powerText);
	}

	protected onUpdate(_dt: number): void {
		const prevIndex = this.selectedIndex;
		const prevFilter = this.locationFilter;
		const prevScroll = this.scrollOffset;

		// Navigate
		if (InputManager.isUpPressed()) {
			this.selectedIndex = Math.max(0, this.selectedIndex - 1);
		}
		if (InputManager.isDownPressed()) {
			this.selectedIndex = Math.min(this.filteredEntries.length - 1, this.selectedIndex + 1);
		}

		// Scroll
		if (this.selectedIndex < this.scrollOffset) {
			this.scrollOffset = this.selectedIndex;
		}
		if (this.selectedIndex >= this.scrollOffset + this.maxVisible) {
			this.scrollOffset = this.selectedIndex - this.maxVisible + 1;
		}

		// Filter
		if (InputManager.isLeftPressed()) {
			this.locationFilter = (this.locationFilter - 1 + LOCATIONS.length) % LOCATIONS.length;
			this.selectedIndex = 0;
			this.scrollOffset = 0;
		}
		if (InputManager.isRightPressed()) {
			this.locationFilter = (this.locationFilter + 1) % LOCATIONS.length;
			this.selectedIndex = 0;
			this.scrollOffset = 0;
		}

		// Back
		if (InputManager.isCancelPressed()) {
			StateManager.pop();
		}

		// Refresh if changed
		if (prevIndex !== this.selectedIndex || prevFilter !== this.locationFilter || prevScroll !== this.scrollOffset) {
			this.refreshUI();
		}
	}
}
