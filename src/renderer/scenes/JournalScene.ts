/**
 * JournalScene — game log and story progression tracker.
 *
 * Features:
 * - Quest completion log
 * - Story event timeline
 * - NPC interaction history
 * - Discovery log (maps, items, enemies)
 * - Category tabs (Story, Quests, NPCs, Discoveries)
 * - Timestamped entries
 *
 * Usage:
 *   const scene = new JournalScene({ name: "journal", app });
 */
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { Scene, type SceneConfig } from "../state/Scene";
import { StateManager } from "../state/StateManager";
import { InputManager } from "../input/InputManager";

interface JournalEntry {
	id: string;
	category: "story" | "quest" | "npc" | "discovery";
	title: string;
	description: string;
	timestamp: number;
	icon: string;
	read: boolean;
}

const CATEGORY_CONFIG = {
	story: { label: "Story", color: 0xffcc44, icon: "📖" },
	quest: { label: "Quests", color: 0x44ff88, icon: "⚔" },
	npc: { label: "NPCs", color: 0x4488ff, icon: "👤" },
	discovery: { label: "Discoveries", color: 0xaa44ff, icon: "🔍" },
};

type Category = keyof typeof CATEGORY_CONFIG;

const SAMPLE_ENTRIES: JournalEntry[] = [
	{ id: "s1", category: "story", title: "Arrival in TOWNYUU", description: "You arrived in the quiet town of TOWNYUU. The Mayor greeted you with urgent news — monsters have been appearing in the Dark Forest to the east.", timestamp: Date.now() - 3600000, icon: "📖", read: true },
	{ id: "s2", category: "story", title: "The Forest Beckons", description: "Strange lights have been seen deep in the Dark Forest. The Mayor asks you to investigate and report back.", timestamp: Date.now() - 1800000, icon: "📖", read: true },
	{ id: "s3", category: "story", title: "Dragon's Shadow", description: "An enormous shadow was spotted flying over the forest. Could the legends of the Ancient Dragon be true?", timestamp: Date.now() - 900000, icon: "📖", read: false },
	{ id: "q1", category: "quest", title: "Quest: Clear the Beach", description: "Crabs and jellyfish have overrun Sunset Beach. Clear 5 enemies to make it safe for the Fisherman.", timestamp: Date.now() - 2400000, icon: "⚔", read: true },
	{ id: "q2", category: "quest", title: "Quest: Forest Patrol", description: "Defeat 10 enemies in the Dark Forest to reduce the threat level.", timestamp: Date.now() - 1200000, icon: "⚔", read: true },
	{ id: "q3", category: "quest", title: "Quest: Dragon Slayer", description: "Venture into the Dragon's Lair and defeat the Ancient Dragon to restore peace to the land.", timestamp: Date.now() - 600000, icon: "⚔", read: false },
	{ id: "n1", category: "npc", title: "The Mayor", description: "A kind elderly man who governs TOWNYUU. He seems worried about the increasing monster activity and the dragon legends.", timestamp: Date.now() - 3500000, icon: "👤", read: true },
	{ id: "n2", category: "npc", title: "The Fisherman", description: "A weathered old man who has fished these waters for decades. He knows the tides and the creatures of the beach.", timestamp: Date.now() - 2000000, icon: "👤", read: true },
	{ id: "n3", category: "npc", title: "???", description: "A mysterious figure lurking in the shadows near the town's sandy area. What are they hiding?", timestamp: Date.now() - 1500000, icon: "👤", read: false },
	{ id: "d1", category: "discovery", title: "Discovered: Dark Forest", description: "A dense forest teeming with goblins, wolves, and darker things. The paths wind between ancient trees.", timestamp: Date.now() - 3000000, icon: "🔍", read: true },
	{ id: "d2", category: "discovery", title: "Discovered: Sunset Beach", description: "A beautiful beach with golden sand and azure waters. Crabs scuttle across the shore.", timestamp: Date.now() - 2800000, icon: "🔍", read: true },
	{ id: "d3", category: "discovery", title: "Discovered: Dragon's Lair", description: "A volcanic cavern filled with lava flows and fire elemental creatures. The Ancient Dragon awaits in the deepest chamber.", timestamp: Date.now() - 1000000, icon: "🔍", read: false },
	{ id: "d4", category: "discovery", title: "Found: Iron Sword", description: "A sturdy iron sword found in a chest near TOWNYUU's western trees. Basic but reliable.", timestamp: Date.now() - 3200000, icon: "🔍", read: true },
];

export class JournalScene extends Scene {
	private entries: JournalEntry[];
	private selectedCategory: Category = "story";
	private selectedIndex = 0;
	private scrollOffset = 0;
	private entryContainers: Container[] = [];
	private detailContainer!: Container;
	private tabContainer!: Container;
	private maxVisible = 4;

	constructor(config: SceneConfig) {
		super(config);
		this.entries = [...SAMPLE_ENTRIES];
	}

	public async create(): Promise<void> {
		this.createBackground();
		this.createHeader();
		this.createTabs();
		this.createEntryList();
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
				color: (Math.floor(0x0a + ratio * 0x06) << 16) |
					(Math.floor(0x0c + ratio * 0x08) << 8) |
					Math.floor(0x10 + ratio * 0x0a),
			});
		}
		this.container.addChild(bg);
	}

	private createHeader(): void {
		const header = new Text({
			text: "📔 JOURNAL",
			style: new TextStyle({
				fontFamily: "Arial Black, Arial, sans-serif",
				fontSize: 22,
				fill: 0xffddaa,
				fontWeight: "bold",
				dropShadow: { alpha: 0.3, blur: 4, distance: 2, color: 0x000000 },
			}),
		});
		header.anchor.set(0.5, 0);
		header.position.set(this.width / 2, 6);
		this.container.addChild(header);
	}

	private createTabs(): void {
		this.tabContainer = new Container();
		this.tabContainer.position.set(5, 32);
		this.container.addChild(this.tabContainer);
	}

	private createEntryList(): void {
		const startY = 56;
		const cardH = 34;

		for (let i = 0; i < this.maxVisible; i++) {
			const container = new Container();
			container.position.set(8, startY + i * (cardH + 3));
			this.entryContainers.push(container);
			this.container.addChild(container);
		}
	}

	private createDetailPanel(): void {
		this.detailContainer = new Container();
		this.detailContainer.position.set(8, this.height - 120);
		this.container.addChild(this.detailContainer);
	}

	private createFooter(): void {
		const controls = new Text({
			text: "↑↓ Navigate  |  ←→ Category  |  Enter: Read  |  ESC: Back",
			style: new TextStyle({ fill: 0x445566, fontSize: 10 },
			),
		});
		controls.anchor.set(0.5);
		controls.position.set(this.width / 2, this.height - 6);
		this.container.addChild(controls);
	}

	private getFilteredEntries(): JournalEntry[] {
		return this.entries
			.filter(e => e.category === this.selectedCategory)
			.sort((a, b) => b.timestamp - a.timestamp);
	}

	private refreshUI(): void {
		this.renderTabs();
		this.renderEntries();
		this.renderDetail();
	}

	private renderTabs(): void {
		this.tabContainer.removeChildren();
		const categories: Category[] = ["story", "quest", "npc", "discovery"];
		const tabW = (this.width - 10) / categories.length;

		categories.forEach((cat, i) => {
			const cfg = CATEGORY_CONFIG[cat];
			const isActive = cat === this.selectedCategory;
			const count = this.entries.filter(e => e.category === cat).length;
			const unread = this.entries.filter(e => e.category === cat && !e.read).length;

			const bg = new Graphics();
			bg.roundRect(i * tabW + 1, 0, tabW - 2, 20, 3);
			bg.fill({ color: isActive ? 0x1a2030 : 0x0a0e16, alpha: 0.9 });
			bg.stroke({ color: isActive ? cfg.color : 0x1a2030, width: isActive ? 2 : 1 });
			this.tabContainer.addChild(bg);

			const label = new Text({
				text: `${cfg.icon} ${cfg.label}${unread > 0 ? ` (${unread})` : ""}`,
				style: new TextStyle({
					fill: isActive ? cfg.color : 0x556677,
					fontSize: 10,
					fontWeight: isActive ? "bold" : "normal",
				}),
			});
			label.anchor.set(0.5);
			label.position.set(i * tabW + tabW / 2, 10);
			this.tabContainer.addChild(label);
		});
	}

	private renderEntries(): void {
		const filtered = this.getFilteredEntries();
		const cardH = 34;
		const cardW = this.width - 16;

		// Clamp
		if (this.selectedIndex >= filtered.length) this.selectedIndex = Math.max(0, filtered.length - 1);
		if (this.scrollOffset > this.selectedIndex) this.scrollOffset = this.selectedIndex;
		const maxScroll = Math.max(0, filtered.length - this.maxVisible);
		if (this.scrollOffset > maxScroll) this.scrollOffset = maxScroll;

		for (let i = 0; i < this.maxVisible; i++) {
			const container = this.entryContainers[i]!;
			container.removeChildren();

			const entryIdx = this.scrollOffset + i;
			const entry = filtered[entryIdx];
			if (!entry) continue;

			const isSelected = entryIdx === this.selectedIndex;
			const catColor = CATEGORY_CONFIG[entry.category].color;

			const bg = new Graphics();
			bg.roundRect(0, 0, cardW, cardH, 4);
			bg.fill({ color: isSelected ? 0x141820 : 0x0a0e16, alpha: 0.9 });
			bg.stroke({ color: isSelected ? catColor : 0x1a2030, width: isSelected ? 2 : 1 });
			container.addChild(bg);

			// Read/unread indicator
			if (!entry.read) {
				const dot = new Graphics();
				dot.circle(8, cardH / 2, 3);
				dot.fill(catColor);
				container.addChild(dot);
			}

			// Icon + title
			const title = new Text({
				text: `${entry.icon} ${entry.title}`,
				style: new TextStyle({
					fill: isSelected ? 0xffffff : (entry.read ? 0x88aacc : 0xffffff),
					fontSize: 11,
					fontWeight: entry.read ? "normal" : "bold",
				}),
			});
			title.position.set(16, 4);
			container.addChild(title);

			// Timestamp
			const ago = this.formatTimeAgo(entry.timestamp);
			const ts = new Text({
				text: ago,
				style: new TextStyle({ fill: 0x445566, fontSize: 9 },
				),
			});
			ts.position.set(cardW - ts.width - 6, 4);
			container.addChild(ts);

			// Description preview
			const preview = entry.description.substring(0, 50) + (entry.description.length > 50 ? "..." : "");
			const desc = new Text({
				text: preview,
				style: new TextStyle({ fill: 0x556677, fontSize: 9 },
				),
			});
			desc.position.set(16, 19);
			container.addChild(desc);

			if (isSelected) {
				const arrow = new Text({
					text: "▸",
					style: new TextStyle({ fill: catColor, fontSize: 12 },
					),
				});
				arrow.position.set(-8, cardH / 2 - 6);
				container.addChild(arrow);
			}
		}
	}

	private renderDetail(): void {
		this.detailContainer.removeChildren();
		const filtered = this.getFilteredEntries();
		const entry = filtered[this.selectedIndex];
		if (!entry) return;

		// Mark as read
		entry.read = true;

		const panelW = this.width - 16;
		const panelH = 100;
		const catColor = CATEGORY_CONFIG[entry.category].color;

		const bg = new Graphics();
		bg.roundRect(0, 0, panelW, panelH, 6);
		bg.fill({ color: 0x0c1018, alpha: 0.95 });
		bg.stroke({ color: catColor, width: 1 });
		this.detailContainer.addChild(bg);

		// Title
		const title = new Text({
			text: `${entry.icon} ${entry.title}`,
			style: new TextStyle({
				fill: 0xffffff,
				fontSize: 14,
				fontWeight: "bold",
			}),
		});
		title.position.set(10, 6);
		this.detailContainer.addChild(title);

		// Category badge
		const badge = new Text({
			text: CATEGORY_CONFIG[entry.category].label.toUpperCase(),
			style: new TextStyle({ fill: catColor, fontSize: 9 },
			),
		});
		badge.position.set(panelW - badge.width - 10, 8);
		this.detailContainer.addChild(badge);

		// Description (wrapped)
		const desc = new Text({
			text: entry.description,
			style: new TextStyle({
				fill: 0x99aabb,
				fontSize: 11,
				wordWrap: true,
				wordWrapWidth: panelW - 20,
			}),
		});
		desc.position.set(10, 26);
		this.detailContainer.addChild(desc);

		// Timestamp
		const ts = new Text({
			text: `Recorded: ${new Date(entry.timestamp).toLocaleString()}`,
			style: new TextStyle({ fill: 0x334455, fontSize: 9 },
			),
		});
		ts.position.set(10, panelH - 16);
		this.detailContainer.addChild(ts);
	}

	private formatTimeAgo(ts: number): string {
		const diff = Date.now() - ts;
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return "Just now";
		if (mins < 60) return `${mins}m ago`;
		const hours = Math.floor(mins / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		return `${days}d ago`;
	}

	protected onUpdate(_dt: number): void {
		const prevCat = this.selectedCategory;
		const prevIdx = this.selectedIndex;
		const categories: Category[] = ["story", "quest", "npc", "discovery"];

		if (InputManager.isUpPressed()) {
			this.selectedIndex = Math.max(0, this.selectedIndex - 1);
		}
		if (InputManager.isDownPressed()) {
			const max = this.getFilteredEntries().length - 1;
			this.selectedIndex = Math.min(max, this.selectedIndex + 1);
		}

		// Scroll
		if (this.selectedIndex < this.scrollOffset) this.scrollOffset = this.selectedIndex;
		if (this.selectedIndex >= this.scrollOffset + this.maxVisible) {
			this.scrollOffset = this.selectedIndex - this.maxVisible + 1;
		}

		if (InputManager.isLeftPressed()) {
			const idx = categories.indexOf(this.selectedCategory);
			this.selectedCategory = categories[(idx - 1 + categories.length) % categories.length]!;
			this.selectedIndex = 0;
			this.scrollOffset = 0;
		}
		if (InputManager.isRightPressed()) {
			const idx = categories.indexOf(this.selectedCategory);
			this.selectedCategory = categories[(idx + 1) % categories.length]!;
			this.selectedIndex = 0;
			this.scrollOffset = 0;
		}

		if (InputManager.isCancelPressed()) {
			StateManager.pop();
		}

		if (prevCat !== this.selectedCategory || prevIdx !== this.selectedIndex) {
			this.refreshUI();
		}
	}
}
