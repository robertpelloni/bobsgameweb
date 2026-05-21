// @ts-nocheck
/**
 * CraftingScene — visual crafting interface.
 *
 * Shows available recipes, required materials, and lets the player craft items.
 * Categories: Weapons, Armor, Items, Special
 * Keys: ←→ Category | ↑↓ Recipe | Enter: Craft | ESC: Back
 */
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { Scene, type SceneConfig } from "../state/Scene";
import { StateManager } from "../state/StateManager";
import { InputManager, Key } from "../input/InputManager";
import { CraftingSystem, type InventoryItem, type CraftingRecipe } from "../engine/rpg/CraftingSystem";

const CATEGORY_TABS = ["All", "Weapons", "Armor", "Items"];

const RARITY_COLORS: Record<string, number> = {
	common: 0xaaaaaa,
	uncommon: 0x44ff88,
	rare: 0x4488ff,
	legendary: 0xffaa00,
};

export class CraftingScene extends Scene {
	private crafting: CraftingSystem;
	private selectedTab = 0;
	private selectedRecipe = 0;
	private messageTimer = 0;
	private message = "";

	private tabBar!: Container;
	private recipeList!: Container;
	private detailPanel!: Container;
	private messageText!: Text;

	constructor(config: SceneConfig) {
		super(config);
		this.crafting = new CraftingSystem([
			{ id: "iron_ore", name: "Iron Ore", quantity: 12 },
			{ id: "wood", name: "Wood", quantity: 5 },
			{ id: "herb", name: "Herb", quantity: 8 },
			{ id: "water_flask", name: "Water Flask", quantity: 6 },
			{ id: "coal", name: "Coal", quantity: 5 },
			{ id: "leather", name: "Leather", quantity: 6 },
			{ id: "thread", name: "Thread", quantity: 4 },
			{ id: "magic_dust", name: "Magic Dust", quantity: 3 },
		]);
	}

	public async create(): Promise<void> {
		this.createBackground();
		this.createTitle();
		this.createTabs();
		this.createRecipeList();
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
				color: Math.floor(0x0e + ratio * 0x08) << 16 |
					Math.floor(0x0a + ratio * 0x08) << 8 |
					Math.floor(0x14 + ratio * 0x10),
			});
		}
		this.container.addChild(bg);
	}

	private createTitle(): void {
		const title = new Text({
			text: "⚒ CRAFTING",
			style: new TextStyle({
				fontFamily: "Arial Black, Arial, sans-serif",
				fontSize: 24,
				fill: 0xffaa44,
				fontWeight: "bold",
			}),
		});
		title.anchor.set(0.5);
		title.position.set(this.width / 2, 18);
		this.container.addChild(title);
	}

	private createTabs(): void {
		this.tabBar = new Container();
		this.tabBar.position.set(20, 48);
		this.container.addChild(this.tabBar);
	}

	private createRecipeList(): void {
		const bg = new Graphics();
		bg.roundRect(15, 70, this.width / 2 - 30, this.height - 140, 6);
		bg.fill({ color: 0x0a0a14, alpha: 0.85 });
		bg.stroke({ color: 0x334466, width: 1 });
		this.container.addChild(bg);

		this.recipeList = new Container();
		this.recipeList.position.set(25, 80);
		this.container.addChild(this.recipeList);
	}

	private createDetailPanel(): void {
		const px = this.width / 2 + 5;
		const bg = new Graphics();
		bg.roundRect(px, 70, this.width / 2 - 20, this.height - 140, 6);
		bg.fill({ color: 0x0a0a14, alpha: 0.85 });
		bg.stroke({ color: 0x334466, width: 1 });
		this.container.addChild(bg);

		this.detailPanel = new Container();
		this.detailPanel.position.set(px + 10, 80);
		this.container.addChild(this.detailPanel);
	}

	private createFooter(): void {
		this.messageText = new Text({
			text: "",
			style: new TextStyle({ fill: 0x44ff88, fontSize: 13 },
			),
		});
		this.messageText.anchor.set(0.5);
		this.messageText.position.set(this.width / 2, this.height - 42);
		this.container.addChild(this.messageText);

		const controls = new Text({
			text: "←→ Category  |  ↑↓ Recipe  |  Enter: Craft  |  ESC: Back",
			style: new TextStyle({ fill: 0x445566, fontSize: 11 },
			),
		});
		controls.anchor.set(0.5);
		controls.position.set(this.width / 2, this.height - 18);
		this.container.addChild(controls);
	}

	private getFilteredRecipes(): CraftingRecipe[] {
		const recipes = this.crafting.getRecipes({ discovered: true });
		if (this.selectedTab === 0) return recipes;
		const cat = ["weapon", "armor", "item"][this.selectedTab - 1];
		return recipes.filter(r => r.category === cat);
	}

	private refreshUI(): void {
		// Tabs
		this.tabBar.removeChildren();
		for (let i = 0; i < CATEGORY_TABS.length; i++) {
			const isActive = i === this.selectedTab;
			const tab = new Text({
				text: (isActive ? "▸ " : "  ") + CATEGORY_TABS[i],
				style: new TextStyle({
					fill: isActive ? 0xffaa44 : 0x556677,
					fontSize: 13,
					fontWeight: isActive ? "bold" : "normal",
				}),
			});
			tab.position.set(i * 80, 0);
			this.tabBar.addChild(tab);
		}

		// Recipe list
		this.recipeList.removeChildren();
		const recipes = this.getFilteredRecipes();
		const inventory = this.crafting.getInventory();

		for (let i = 0; i < recipes.length; i++) {
			const recipe = recipes[i];
			const isSelected = i === this.selectedRecipe;
			const { canCraft } = this.crafting.canCraft(recipe.id);

			const row = new Container();
			row.position.set(0, i * 38);

			if (isSelected) {
				const hl = new Graphics();
				hl.roundRect(-5, -2, this.width / 2 - 40, 34, 4);
				hl.fill({ color: 0x1a2a3a, alpha: 0.6 });
				row.addChild(hl);
			}

			// Rarity dot
			const dot = new Graphics();
			dot.circle(6, 12, 4);
			dot.fill(RARITY_COLORS[recipe.result.rarity] ?? 0x888888);
			row.addChild(dot);

			// Name
			const name = new Text({
				text: (isSelected ? "▸ " : "  ") + recipe.name,
				style: new TextStyle({
					fill: canCraft ? (isSelected ? 0xffffff : 0xaabbcc) : 0x555555,
					fontSize: 13,
				}),
			});
			name.position.set(16, 2);
			row.addChild(name);

			// Success rate
			const rateText = new Text({
				text: `${Math.round(recipe.successRate * 100)}%`,
				style: new TextStyle({
					fill: recipe.successRate >= 0.8 ? 0x44ff88 : recipe.successRate >= 0.5 ? 0xffaa44 : 0xff4444,
					fontSize: 10,
				}),
			});
			rateText.position.set(this.width / 2 - 80, 4);
			row.addChild(rateText);

			// Status
			const status = new Text({
				text: canCraft ? "✓ Ready" : "✗ Missing",
				style: new TextStyle({
					fill: canCraft ? 0x44ff88 : 0xff4444,
					fontSize: 10,
				}),
			});
			status.position.set(16, 20);
			row.addChild(status);

			this.recipeList.addChild(row);
		}

		// Detail panel
		this.detailPanel.removeChildren();
		const selected = recipes[this.selectedRecipe];
		if (!selected) return;

		let yPos = 0;

		// Recipe name
		const title = new Text({
			text: selected.name,
			style: new TextStyle({
				fill: RARITY_COLORS[selected.result.rarity] ?? 0xffffff,
				fontSize: 16,
				fontWeight: "bold",
			}),
		});
		this.detailPanel.addChild(title);
		yPos += 24;

		// Description
		const desc = new Text({
			text: selected.description,
			style: new TextStyle({
				fill: 0x99aabb,
				fontSize: 11,
				wordWrap: true,
				wordWrapWidth: this.width / 2 - 40,
			}),
		});
		desc.position.set(0, yPos);
		this.detailPanel.addChild(desc);
		yPos += 36;

		// Result
		const resultText = new Text({
			text: `Creates: ${selected.result.quantity}x ${selected.name} [${selected.result.rarity.toUpperCase()}]`,
			style: new TextStyle({ fill: 0x88ccff, fontSize: 12, fontWeight: "bold" },
			),
		});
		resultText.position.set(0, yPos);
		this.detailPanel.addChild(resultText);
		yPos += 24;

		// Success rate
		const rate = new Text({
			text: `Success Rate: ${Math.round(selected.successRate * 100)}%`,
			style: new TextStyle({
				fill: selected.successRate >= 0.8 ? 0x44ff88 : selected.successRate >= 0.5 ? 0xffaa44 : 0xff4444,
				fontSize: 12,
			}),
		});
		rate.position.set(0, yPos);
		this.detailPanel.addChild(rate);
		yPos += 24;

		// Ingredients
		const header = new Text({
			text: "MATERIALS:",
			style: new TextStyle({ fill: 0xaabbcc, fontSize: 12, fontWeight: "bold" },
			),
		});
		header.position.set(0, yPos);
		this.detailPanel.addChild(header);
		yPos += 18;

		for (const ing of selected.ingredients) {
			const owned = inventory.find(i => i.id === ing.itemId);
			const ownedQty = owned?.quantity ?? 0;
			const have = ownedQty >= ing.quantity;

			const matText = new Text({
				text: `  ${have ? "✓" : "✗"} ${ing.itemId}: ${ownedQty}/${ing.quantity}`,
				style: new TextStyle({
					fill: have ? 0x44ff88 : 0xff4444,
					fontSize: 11,
				}),
			});
			matText.position.set(0, yPos);
			this.detailPanel.addChild(matText);
			yPos += 16;
		}
	}

	protected onUpdate(dt: number): void {
		const recipes = this.getFilteredRecipes();
		if (recipes.length === 0) return;

		// Tab navigation
		if (InputManager.isLeftPressed()) {
			this.selectedTab = Math.max(0, this.selectedTab - 1);
			this.selectedRecipe = 0;
			this.refreshUI();
		}
		if (InputManager.isRightPressed()) {
			this.selectedTab = Math.min(CATEGORY_TABS.length - 1, this.selectedTab + 1);
			this.selectedRecipe = 0;
			this.refreshUI();
		}

		// Recipe navigation
		if (InputManager.isUpPressed()) {
			this.selectedRecipe = Math.max(0, this.selectedRecipe - 1);
			this.refreshUI();
		}
		if (InputManager.isDownPressed()) {
			this.selectedRecipe = Math.min(recipes.length - 1, this.selectedRecipe + 1);
			this.refreshUI();
		}

		// Craft
		if (InputManager.isActionPressed() || InputManager.isKeyPressed(Key.Enter)) {
			const recipe = recipes[this.selectedRecipe];
			if (recipe) {
				const result = this.craft.craft(recipe.id);
				this.message = result.message;
				this.messageText.text = result.message;
				this.messageText.style.fill = result.success ? 0x44ff88 : 0xff4444;
				this.messageTimer = 3;
				this.refreshUI();
			}
		}

		// Message timer
		if (this.messageTimer > 0) {
			this.messageTimer -= dt;
			if (this.messageTimer <= 0) {
				this.messageText.text = "";
			}
		}

		if (InputManager.isCancelPressed()) {
			StateManager.pop();
		}
	}
}
