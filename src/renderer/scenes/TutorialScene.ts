/**
 * TutorialScene — guided step-by-step tutorial for new players.
 *
 * Features:
 * - 8 tutorial steps covering all major systems
 * - Highlighted UI elements
 * - Progress tracking
 * - Skip option
 * - Animated transitions
 *
 * Usage:
 *   const scene = new TutorialScene({ name: "tutorial", app });
 */
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { Scene, type SceneConfig } from "../state/Scene";
import { StateManager } from "../state/StateManager";
import { InputManager } from "../input/InputManager";

interface TutorialStep {
	id: string;
	title: string;
	description: string;
	hint: string;
	icon: string;
}

const STEPS: TutorialStep[] = [
	{
		id: "welcome",
		title: "Welcome to Bob's Game!",
		description: "This tutorial will guide you through the basics. Let's get started!",
		hint: "Press SPACE to continue",
		icon: "👋",
	},
	{
		id: "movement",
		title: "Movement",
		description: "Use WASD or Arrow Keys to move your character around the world. Hold SHIFT to sprint.",
		hint: "Try moving around! → SPACE to continue",
		icon: "🏃",
	},
	{
		id: "battle",
		title: "Combat",
		description: "Enemies appear in the wild. Press Z or SPACE to attack. Use 1-3 for special abilities. Watch your HP bar!",
		hint: "SPACE to continue",
		icon: "⚔",
	},
	{
		id: "inventory",
		title: "Inventory & Items",
		description: "Press I to open your inventory. Equip weapons and armor. Use potions with the USE button. Press Q for quest log.",
		hint: "SPACE to continue",
		icon: "🎒",
	},
	{
		id: "shop",
		title: "Shopping",
		description: "Visit the Shop from the menu to buy and sell items. Common items are cheap, legendary items are expensive but powerful!",
		hint: "SPACE to continue",
		icon: "🏪",
	},
	{
		id: "map",
		title: "World Navigation",
		description: "Press M to open the World Map. Travel between TOWNYUU, Dark Forest, Sunset Beach, and Dragon's Lair. Beware of danger levels!",
		hint: "SPACE to continue",
		icon: "🗺",
	},
	{
		id: "crafting",
		title: "Crafting & Enchanting",
		description: "Collect materials from defeated enemies. Visit the Crafting menu to create potions, weapons, and enchantments. Higher enchantment levels are harder but stronger!",
		hint: "SPACE to continue",
		icon: "🔨",
	},
	{
		id: "complete",
		title: "You're Ready!",
		description: "You now know the basics of Bob's Game. Explore the world, defeat the Ancient Dragon, and become the champion of TOWNYUU!\n\nGood luck, adventurer!",
		hint: "Press SPACE to start your adventure!",
		icon: "🎉",
	},
];

export class TutorialScene extends Scene {
	private currentStep = 0;
	private steps: TutorialStep[];
	private time = 0;

	constructor(config: SceneConfig) {
		super(config);
		this.steps = STEPS;
	}

	public async create(): Promise<void> {
		this.createBackground();
		this.createContent();
		this.createFooter();
		this.refreshUI();
	}

	private createBackground(): void {
		const bg = new Graphics();
		for (let i = 0; i < 20; i++) {
			const ratio = i / 20;
			bg.rect(0, (this.height / 20) * i, this.width, this.height / 20 + 1);
			bg.fill({
				color: (Math.floor(0x06 + ratio * 0x04) << 16) |
					(Math.floor(0x0a + ratio * 0x08) << 8) |
					Math.floor(0x14 + ratio * 0x0c),
			});
		}
		this.container.addChild(bg);
	}

	private createContent(): void {
		// Content rendered dynamically in refreshUI
	}

	private createFooter(): void {
		// Footer rendered dynamically
	}

	private refreshUI(): void {
		// Remove dynamic children (keep background at index 0)
		while (this.container.children.length > 1) {
			this.container.removeChildAt(this.container.children.length - 1);
		}

		const step = this.steps[this.currentStep]!;
		const progress = (this.currentStep + 1) / this.steps.length;

		// Progress bar
		const progBg = new Graphics();
		progBg.rect(10, 4, this.width - 20, 4);
		progBg.fill(0x1a2030);
		progBg.rect(10, 4, (this.width - 20) * progress, 4);
		progBg.fill(0x44ff88);
		this.container.addChild(progBg);

		// Step counter
		const counter = new Text({
			text: `Step ${this.currentStep + 1}/${this.steps.length}`,
			style: new TextStyle({ fill: 0x445566, fontSize: 9 },
			),
		});
		counter.anchor.set(0.5, 0);
		counter.position.set(this.width / 2, 10);
		this.container.addChild(counter);

		// Icon
		const icon = new Text({
			text: step.icon,
			style: new TextStyle({ fontSize: 36 },
			),
		});
		icon.anchor.set(0.5);
		icon.position.set(this.width / 2, this.height * 0.22);
		this.container.addChild(icon);

		// Icon glow
		const pulse = 0.5 + 0.3 * Math.sin(this.time * 3);
		const glow = new Graphics();
		glow.circle(this.width / 2, this.height * 0.22, 40 + pulse * 5);
		glow.fill({ color: 0x44ff88, alpha: pulse * 0.08 });
		this.container.addChild(glow);

		// Title
		const title = new Text({
			text: step.title,
			style: new TextStyle({
				fontFamily: "Arial Black, Arial, sans-serif",
				fontSize: 18,
				fill: 0xffcc44,
				fontWeight: "bold",
				align: "center",
			}),
		});
		title.anchor.set(0.5);
		title.position.set(this.width / 2, this.height * 0.38);
		this.container.addChild(title);

		// Description
		const desc = new Text({
			text: step.description,
			style: new TextStyle({
				fill: 0xaabbcc,
				fontSize: 11,
				align: "center",
				wordWrap: true,
				wordWrapWidth: this.width - 40,
				lineHeight: 16,
			}),
		});
		desc.anchor.set(0.5);
		desc.position.set(this.width / 2, this.height * 0.55);
		this.container.addChild(desc);

		// Hint
		const hint = new Text({
			text: step.hint,
			style: new TextStyle({
				fill: 0x44ff88,
				fontSize: 10,
				fontWeight: "bold",
			}),
		});
		hint.anchor.set(0.5);
		hint.position.set(this.width / 2, this.height * 0.78);
		this.container.addChild(hint);

		// Navigation dots
		const dotY = this.height - 30;
		for (let i = 0; i < this.steps.length; i++) {
			const dotX = this.width / 2 + (i - this.steps.length / 2) * 14 + 7;
			const isCurrent = i === this.currentStep;
			const isPast = i < this.currentStep;

			const dot = new Graphics();
			dot.circle(dotX, dotY, isCurrent ? 4 : 2.5);
			dot.fill(isPast ? 0x44ff88 : (isCurrent ? 0xffcc44 : 0x334455));
			this.container.addChild(dot);
		}

		// Skip button
		const skip = new Text({
			text: "ESC: Skip Tutorial",
			style: new TextStyle({ fill: 0x445566, fontSize: 9 },
			),
		});
		skip.anchor.set(0.5);
		skip.position.set(this.width / 2, this.height - 8);
		this.container.addChild(skip);
	}

	protected onUpdate(dt: number): void {
		this.time += dt;

		if (InputManager.isActionPressed()) {
			if (this.currentStep < this.steps.length - 1) {
				this.currentStep++;
			} else {
				// Tutorial complete
				StateManager.pop();
			}
			this.refreshUI();
		}

		if (InputManager.isCancelPressed()) {
			StateManager.pop();
		}

		// Animate glow
		this.refreshUI();
	}
}
