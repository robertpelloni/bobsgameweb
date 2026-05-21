/**
 * InventoryScene — full-featured inventory with equipment slots and item details.
 *
 * Features:
 * - Grid-based item display with icons
 * - Equipment slots (weapon, armor, accessory)
 * - Item categories (All, Weapons, Armor, Items, Key Items)
 * - Item detail panel with stats
 * - Use/equip/drop actions
 * - Sort by name/type/rarity
 */
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { Scene, type SceneConfig } from "../state/Scene";
import { StateManager } from "../state/StateManager";
import { InputManager, Key } from "../input/InputManager";

export interface InventoryItem {
	id: string;
	name: string;
	description: string;
	category: "weapon" | "armor" | "item" | "key";
	rarity: "common" | "uncommon" | "rare" | "legendary";
	quantity: number;
	icon: number;
	stats?: {
		atk?: number;
		def?: number;
		hp?: number;
		mp?: number;
		spd?: number;
		luk?: number;
	};
	equipped?: boolean;
	usable?: boolean;
}

export interface InventoryConfig extends SceneConfig {
	items?: InventoryItem[];
	gold?: number;
	onEquip?: (itemId: string) => void;
	onUse?: (itemId: string) => void;
	onDrop?: (itemId: string) => void;
}

const RARITY_COLORS: Record<string, number> = {
	common: 0xaaaaaa,
	uncommon: 0x44ff88,
	rare: 0x4488ff,
	legendary: 0xffaa00,
};

const CATEGORY_TABS = ["All", "Weapons", "Armor", "Items", "Key"];

const DEFAULT_ITEMS: InventoryItem[] = [
	{ id: "wooden_sword", name: "Wooden Sword", description: "A basic training sword.", category: "weapon", rarity: "common", quantity: 1, icon: 0x8B6914, stats: { atk: 5 }, equipped: true },
	{ id: "iron_sword", name: "Iron Sword", description: "A solid iron blade.", category: "weapon", rarity: "uncommon", quantity: 1, icon: 0xAAAAAA, stats: { atk: 12 } },
	{ id: "leather_armor", name: "Leather Armor", description: "Basic leather protection.", category: "armor", rarity: "common", quantity: 1, icon: 0x8B4513, stats: { def: 3 }, equipped: true },
	{ id: "health_potion", name: "Health Potion", description: "Restores 50 HP.", category: "item", rarity: "common", quantity: 5, icon: 0xFF4444, stats: { hp: 50 }, usable: true },
	{ id: "mana_potion", name: "Mana Potion", description: "Restores 30 MP.", category: "item", rarity: "common", quantity: 3, icon: 0x4444FF, stats: { mp: 30 }, usable: true },
	{ id: "elixir", name: "Elixir", description: "Fully restores HP and MP.", category: "item", rarity: "rare", quantity: 1, icon: 0xFF88FF, stats: { hp: 999, mp: 999 }, usable: true },
	{ id: "town_key", name: "Town Key", description: "Opens the town gate.", category: "key", rarity: "uncommon", quantity: 1, icon: 0xFFDD44 },
	{ id: "old_map", name: "Old Map", description: "A weathered map showing the way to hidden treasure.", category: "key", rarity: "rare", quantity: 1, icon: 0xDEB887 },
	{ id: "antidote", name: "Antidote", description: "Cures poison.", category: "item", rarity: "common", quantity: 8, icon: 0x44FF44, usable: true },
	{ id: "gold_ring", name: "Gold Ring", description: "A valuable golden ring.", category: "armor", rarity: "rare", quantity: 1, icon: 0xFFD700, stats: { luk: 5 } },
];

export class InventoryScene extends Scene {
	private items: InventoryItem[];
	private gold: number;
	private selectedTab = 0;
	private selectedItem = 0;
	private gridCols = 6;
	private gridRows = 5;
	private selectedAction = 0;

	private itemGrid!: Container;
	private detailPanel!: Container;
	private equipSlots!: Container;
	private goldText!: Text;
	private tabBar!: Container;
	private actionMenu!: Container;

	constructor(config: InventoryConfig) {
		super(config);
		this.items = config.items ?? DEFAULT_ITEMS;
		this.gold = config.gold ?? 250;
	}

	public async create(): Promise<void> {
		this.createBackground();
		this.createHeader();
		this.createTabs();
		this.createEquipmentSlots();
		this.createItemGrid();
		this.createDetailPanel();
		this.createActionMenu();
		this.createFooter();
		this.refreshUI();
	}

	private createBackground(): void {
		const bg = new Graphics();
		for (let i = 0; i < 20; i++) {
			const ratio = i / 20;
			bg.rect(0, (this.height / 20) * i, this.width, this.height / 20 + 1);
			bg.fill({
				color: Math.floor(0x08 + ratio * 0x0a) << 16 |
					Math.floor(0x0a + ratio * 0x0c) << 8 |
					Math.floor(0x16 + ratio * 0x14),
			});
		}
		this.container.addChild(bg);
	}

	private createHeader(): void {
		const title = new Text({
			text: "🎒 INVENTORY",
			style: new TextStyle({
				fontFamily: "Arial Black, Arial, sans-serif",
				fontSize: 22,
				fill: 0xffcc44,
				fontWeight: "bold",
			}),
		});
		title.anchor.set(0.5);
		title.position.set(this.width / 2, 18);
		this.container.addChild(title);

		this.goldText = new Text({
			text: `💰 ${this.gold} G`,
			style: new TextStyle({ fill: 0xffdd44, fontSize: 16, fontWeight: "bold" }),
		});
		this.goldText.position.set(this.width - 120, 10);
		this.container.addChild(this.goldText);
	}

	private createTabs(): void {
		this.tabBar = new Container();
		this.tabBar.position.set(20, 45);
		this.container.addChild(this.tabBar);
	}

	private createEquipmentSlots(): void {
		this.equipSlots = new Container();
		this.equipSlots.position.set(20, 70);

		// Equipment slot backgrounds
		const slots = ["Weapon", "Armor", "Accessory"];
		for (let i = 0; i < slots.length; i++) {
			const slotBg = new Graphics();
			slotBg.roundRect(0, i * 45, 120, 40, 4);
			slotBg.fill(0x111122);
			slotBg.stroke({ color: 0x334466, width: 1 });
			this.equipSlots.addChild(slotBg);

			const label = new Text({
				text: slots[i],
				style: new TextStyle({ fill: 0x556677, fontSize: 10 },
				),
			});
			label.position.set(4, 2);
			this.equipSlots.addChild(label);

			// Show equipped item
			const equipped = this.items.find(item => item.equipped && (
				(slots[i] === "Weapon" && item.category === "weapon") ||
				(slots[i] === "Armor" && item.category === "armor") ||
				(slots[i] === "Accessory" && item.category === "armor" && item.stats?.luk)
			));
			if (equipped) {
				const nameText = new Text({
					text: equipped.name,
					style: new TextStyle({ fill: RARITY_COLORS[equipped.rarity], fontSize: 11 },
					),
				});
				nameText.position.set(4, 18);
				this.equipSlots.addChild(nameText);
			}
		}

		this.container.addChild(this.equipSlots);
	}

	private createItemGrid(): void {
		const gridX = 160;
		const gridY = 65;
		const gridW = this.width / 2 - 20;
		const gridH = this.height - 160;

		const bg = new Graphics();
		bg.roundRect(gridX, gridY, gridW, gridH, 6);
		bg.fill({ color: 0x0a0a14, alpha: 0.85 });
		bg.stroke({ color: 0x334466, width: 1 });
		this.container.addChild(bg);

		this.itemGrid = new Container();
		this.itemGrid.position.set(gridX + 8, gridY + 8);
		this.container.addChild(this.itemGrid);
	}

	private createDetailPanel(): void {
		const panelX = this.width / 2 + 150;
		const bg = new Graphics();
		bg.roundRect(panelX, 65, this.width - panelX - 10, this.height - 160, 6);
		bg.fill({ color: 0x0a0a14, alpha: 0.85 });
		bg.stroke({ color: 0x334466, width: 1 });
		this.container.addChild(bg);

		this.detailPanel = new Container();
		this.detailPanel.position.set(panelX + 10, 75);
		this.container.addChild(this.detailPanel);
	}

	private createActionMenu(): void {
		this.actionMenu = new Container();
		this.actionMenu.position.set(this.width / 2 + 160, this.height - 90);
		this.container.addChild(this.actionMenu);
	}

	private createFooter(): void {
		const controls = new Text({
			text: "←→ Tab  |  ↑↓ Select  |  Enter: Action  |  ESC: Close",
			style: new TextStyle({ fill: 0x445566, fontSize: 11 },
			),
		});
		controls.anchor.set(0.5);
		controls.position.set(this.width / 2, this.height - 15);
		this.container.addChild(controls);
	}

	private getFilteredItems(): InventoryItem[] {
		if (this.selectedTab === 0) return this.items;
		const cat = ["weapon", "armor", "item", "key"][this.selectedTab - 1];
		return this.items.filter(i => i.category === cat);
	}

	private refreshUI(): void {
		// Tabs
		this.tabBar.removeChildren();
		for (let i = 0; i < CATEGORY_TABS.length; i++) {
			const isActive = i === this.selectedTab;
			const tab = new Text({
				text: (isActive ? "▸ " : "  ") + CATEGORY_TABS[i],
				style: new TextStyle({
					fill: isActive ? 0xffcc44 : 0x556677,
					fontSize: 12,
					fontWeight: isActive ? "bold" : "normal",
				}),
			});
			tab.position.set(i * 65, 0);
			this.tabBar.addChild(tab);
		}

		// Item grid
		this.itemGrid.removeChildren();
		const filtered = this.getFilteredItems();
		const cellSize = 48;
		const cols = Math.min(this.gridCols, Math.floor((this.width / 2 - 40) / cellSize));

		for (let i = 0; i < filtered.length; i++) {
			const item = filtered[i];
			const col = i % cols;
			const row = Math.floor(i / cols);
			const isSelected = i === this.selectedItem;

			const cell = new Container();
			cell.position.set(col * (cellSize + 4), row * (cellSize + 4));

			// Cell background
			const bg = new Graphics();
			bg.roundRect(0, 0, cellSize, cellSize, 4);
			bg.fill(isSelected ? 0x1a2a3a : 0x111122);
			bg.stroke({
				color: isSelected ? 0xffff00 : RARITY_COLORS[item.rarity],
				width: isSelected ? 2 : 1,
			});
			cell.addChild(bg);

			// Item icon
			const icon = new Graphics();
			icon.roundRect(8, 8, cellSize - 16, cellSize - 20, 3);
			icon.fill(item.icon);
			cell.addChild(icon);

			// Quantity badge
			if (item.quantity > 1) {
				const qtyText = new Text({
					text: String(item.quantity),
					style: new TextStyle({ fill: 0xffffff, fontSize: 9, fontWeight: "bold" },
					),
				});
				qtyText.position.set(cellSize - 14, cellSize - 14);
				cell.addChild(qtyText);
			}

			// Equipped indicator
			if (item.equipped) {
				const eq = new Text({
					text: "E",
					style: new TextStyle({ fill: 0x44ff88, fontSize: 8, fontWeight: "bold" },
					),
				});
				eq.position.set(2, 1);
				cell.addChild(eq);
			}

			this.itemGrid.addChild(cell);
		}

		// Detail panel
		this.detailPanel.removeChildren();
		const selected = filtered[this.selectedItem];
		if (selected) {
			let yPos = 0;

			// Name
			const name = new Text({
				text: selected.name,
				style: new TextStyle({
					fill: RARITY_COLORS[selected.rarity],
					fontSize: 16,
					fontWeight: "bold",
				}),
			});
			this.detailPanel.addChild(name);
			yPos += 24;

			// Rarity
			const rarity = new Text({
				text: `[${selected.rarity.toUpperCase()}]`,
				style: new TextStyle({ fill: RARITY_COLORS[selected.rarity], fontSize: 10 },
				),
			});
			rarity.position.set(0, yPos);
			this.detailPanel.addChild(rarity);
			yPos += 18;

			// Category
			const cat = new Text({
				text: `Type: ${selected.category}`,
				style: new TextStyle({ fill: 0x667788, fontSize: 10 },
				),
			});
			cat.position.set(0, yPos);
			this.detailPanel.addChild(cat);
			yPos += 18;

			// Quantity
			if (selected.quantity > 1) {
				const qty = new Text({
					text: `Quantity: ${selected.quantity}`,
					style: new TextStyle({ fill: 0x88aacc, fontSize: 11 },
					),
				});
				qty.position.set(0, yPos);
				this.detailPanel.addChild(qty);
				yPos += 16;
			}

			yPos += 5;

			// Description
			const desc = new Text({
				text: selected.description,
				style: new TextStyle({
					fill: 0x99aabb,
					fontSize: 11,
					wordWrap: true,
					wordWrapWidth: this.width / 2 - 30,
				}),
			});
			desc.position.set(0, yPos);
			this.detailPanel.addChild(desc);
			yPos += 40;

			// Stats
			if (selected.stats) {
				const header = new Text({
					text: "STATS:",
					style: new TextStyle({ fill: 0x88cc88, fontSize: 11, fontWeight: "bold" },
					),
				});
				header.position.set(0, yPos);
				this.detailPanel.addChild(header);
				yPos += 16;

				for (const [key, val] of Object.entries(selected.stats)) {
					const prefix = val > 0 ? "+" : "";
					const statLine = new Text({
						text: `  ${key.toUpperCase()}: ${prefix}${val}`,
						style: new TextStyle({ fill: 0x88cc88, fontSize: 11 },
						),
					});
					statLine.position.set(0, yPos);
					this.detailPanel.addChild(statLine);
					yPos += 14;
				}
			}

			// Action menu
			this.actionMenu.removeChildren();
			const actions: string[] = [];
			if (selected.equipped) actions.push("Unequip");
			else if (selected.category === "weapon" || selected.category === "armor") actions.push("Equip");
			if (selected.usable) actions.push("Use");
			actions.push("Drop");

			for (let a = 0; a < actions.length; a++) {
				const isSel = a === this.selectedAction;
				const actionText = new Text({
					text: (isSel ? "▸ " : "  ") + actions[a],
					style: new TextStyle({
						fill: isSel ? 0xffcc44 : 0x667788,
						fontSize: 12,
					}),
				});
				actionText.position.set(0, a * 18);
				this.actionMenu.addChild(actionText);
			}
		}
	}

	protected onUpdate(dt: number): void {
		const filtered = this.getFilteredItems();
		if (filtered.length === 0) return;

		// Tab navigation
		if (InputManager.isLeftPressed()) {
			this.selectedTab = Math.max(0, this.selectedTab - 1);
			this.selectedItem = 0;
			this.refreshUI();
		}
		if (InputManager.isRightPressed()) {
			this.selectedTab = Math.min(CATEGORY_TABS.length - 1, this.selectedTab + 1);
			this.selectedItem = 0;
			this.refreshUI();
		}

		// Grid navigation
		if (InputManager.isUpPressed()) {
			this.selectedItem = Math.max(0, this.selectedItem - this.gridCols);
			this.selectedAction = 0;
			this.refreshUI();
		}
		if (InputManager.isDownPressed()) {
			this.selectedItem = Math.min(filtered.length - 1, this.selectedItem + this.gridCols);
			this.selectedAction = 0;
			this.refreshUI();
		}

		// Action navigation
		if (InputManager.isKeyPressed(Key.Q) || InputManager.isKeyPressed(Key.E)) {
			const actions = this.getActionsForItem(filtered[this.selectedItem]);
			this.selectedAction = (this.selectedAction + 1) % actions.length;
			this.refreshUI();
		}

		if (InputManager.isActionPressed() || InputManager.isKeyPressed(Key.Enter)) {
			this.executeAction(filtered[this.selectedItem]);
		}

		if (InputManager.isCancelPressed()) {
			StateManager.pop();
		}
	}

	private getActionsForItem(item: InventoryItem | undefined): string[] {
		if (!item) return [];
		const actions: string[] = [];
		if (item.equipped) actions.push("Unequip");
		else if (item.category === "weapon" || item.category === "armor") actions.push("Equip");
		if (item.usable) actions.push("Use");
		actions.push("Drop");
		return actions;
	}

	private executeAction(item: InventoryItem | undefined): void {
		if (!item) return;
		const actions = this.getActionsForItem(item);
		const action = actions[this.selectedAction];
		if (!action) return;

		switch (action) {
			case "Equip":
				// Unequip same category first
				for (const i of this.items) {
					if (i.category === item.category) i.equipped = false;
				}
				item.equipped = true;
				this.refreshUI();
				break;
			case "Unequip":
				item.equipped = false;
				this.refreshUI();
				break;
			case "Use":
				if (item.quantity > 1) item.quantity--;
				else this.items = this.items.filter(i => i.id !== item.id);
				this.refreshUI();
				break;
			case "Drop":
				this.items = this.items.filter(i => i.id !== item.id);
				this.selectedItem = Math.max(0, this.selectedItem - 1);
				this.refreshUI();
				break;
		}
	}
}
