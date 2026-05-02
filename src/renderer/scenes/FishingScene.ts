/**
 * FishingScene — interactive fishing minigame.
 *
 * Features:
 * - Cast/reel mechanic with timing
 * - 12 fish species with rarity tiers
 * - Tension meter (don't break the line!)
 * - Weather affects catch rates
 * - Bait selection
 * - Catch log / collection tracking
 * - Animated water and bobber
 *
 * Usage:
 *   const scene = new FishingScene({ name: "fishing", app });
 */
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { Scene, type SceneConfig } from "../state/Scene";
import { StateManager } from "../state/StateManager";
import { InputManager } from "../input/InputManager";

// ============================================================
// Fish Data
// ============================================================

type FishRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

interface FishSpecies {
	id: string;
	name: string;
	rarity: FishRarity;
	weight: number; // kg
	value: number; // gold
	biteChance: number; // 0-1
	fightStrength: number; // 1-10
	description: string;
}

const FISH: FishSpecies[] = [
	{ id: "bluegill", name: "Bluegill", rarity: "common", weight: 0.3, value: 2, biteChance: 0.4, fightStrength: 1, description: "A small, common pan fish." },
	{ id: "perch", name: "Perch", rarity: "common", weight: 0.5, value: 3, biteChance: 0.35, fightStrength: 2, description: "Yellow perch with distinctive stripes." },
	{ id: "catfish", name: "Catfish", rarity: "common", weight: 2.0, value: 5, biteChance: 0.25, fightStrength: 3, description: "Bottom-dwelling whiskered fish." },
	{ id: "bass", name: "Largemouth Bass", rarity: "uncommon", weight: 3.0, value: 10, biteChance: 0.2, fightStrength: 4, description: "A prized sport fish." },
	{ id: "trout", name: "Rainbow Trout", rarity: "uncommon", weight: 1.5, value: 12, biteChance: 0.15, fightStrength: 5, description: "Beautiful rainbow-colored trout." },
	{ id: "pike", name: "Northern Pike", rarity: "uncommon", weight: 5.0, value: 15, biteChance: 0.12, fightStrength: 6, description: "Aggressive predator with sharp teeth." },
	{ id: "salmon", name: "King Salmon", rarity: "rare", weight: 8.0, value: 25, biteChance: 0.08, fightStrength: 7, description: "The king of freshwater fish." },
	{ id: "swordfish", name: "Swordfish", rarity: "rare", weight: 50, value: 50, biteChance: 0.05, fightStrength: 8, description: "A powerful ocean predator." },
	{ id: "golden_koi", name: "Golden Koi", rarity: "epic", weight: 1.0, value: 100, biteChance: 0.03, fightStrength: 4, description: "A shimmering golden fish of legend." },
	{ id: "ghost_marlin", name: "Ghost Marlin", rarity: "epic", weight: 100, value: 200, biteChance: 0.02, fightStrength: 9, description: "A spectral marlin that appears at dusk." },
	{ id: "leviathan", name: "Leviathan", rarity: "legendary", weight: 500, value: 1000, biteChance: 0.005, fightStrength: 10, description: "The ancient lord of the deep." },
	{ id: "starfish_gem", name: "Starfish Gem", rarity: "legendary", weight: 0.01, value: 500, biteChance: 0.01, fightStrength: 1, description: "A crystallized starfish, radiant with magic." },
];

const RARITY_COLORS: Record<FishRarity, number> = {
	common: 0xaaaaaa, uncommon: 0x44ff44, rare: 0x4488ff, epic: 0xaa44ff, legendary: 0xffaa00,
};

const RARITY_ORDER: Record<FishRarity, number> = {
	common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4,
};

type FishingState = "idle" | "casting" | "waiting" | "bite" | "reeling" | "caught" | "escaped";

// ============================================================
// Scene
// ============================================================

export class FishingScene extends Scene {
	private state: FishingState = "idle";
	private selectedBait = 0;
	private tension = 0; // 0-100
	private reelProgress = 0; // 0-100
	private currentFish: FishSpecies | null = null;
	private castTimer = 0;
	private biteTimer = 0;
	private catchLog: FishSpecies[] = [];
	private waterGraphics!: Graphics;
	private bobberGraphics!: Graphics;
	private uiContainer!: Container;
	private statusText!: Text;
	private detailText!: Text;
	private catchCount = 0;
	private totalValue = 0;
	private time = 0;

	private readonly BAITS = [
		{ name: "Worm", bonus: 0, cost: 0 },
		{ name: "Cricket", bonus: 0.05, cost: 5 },
		{ name: "Shrimp", bonus: 0.1, cost: 15 },
		{ name: "Golden Lure", bonus: 0.2, cost: 50 },
	];

	constructor(config: SceneConfig) {
		super(config);
	}

	public async create(): Promise<void> {
		this.createSky();
		this.createWater();
		this.createBobber();
		this.createUI();
		this.createFooter();
		this.updateUI();
	}

	private createSky(): void {
		const sky = new Graphics();
		sky.rect(0, 0, this.width, this.height * 0.35);
		sky.fill({
			color: (0x10 << 16) | (0x14 << 8) | 0x30,
		});
		this.container.addChild(sky);

		// Stars
		const stars = new Graphics();
		for (let i = 0; i < 30; i++) {
			const sx = Math.random() * this.width;
			const sy = Math.random() * this.height * 0.3;
			const brightness = 0.3 + Math.random() * 0.7;
			stars.circle(sx, sy, 0.5 + Math.random());
			stars.fill({ color: 0xffffff, alpha: brightness });
		}
		this.container.addChild(stars);
	}

	private createWater(): void {
		this.waterGraphics = new Graphics();
		this.waterGraphics.position.set(0, this.height * 0.35);
		this.container.addChild(this.waterGraphics);
	}

	private createBobber(): void {
		this.bobberGraphics = new Graphics();
		this.bobberGraphics.position.set(this.width / 2, this.height * 0.35);
		this.container.addChild(this.bobberGraphics);
	}

	private createUI(): void {
		this.uiContainer = new Container();
		this.container.addChild(this.uiContainer);

		// Title
		const title = new Text({
			text: "🎣 FISHING",
			style: new TextStyle({
				fontFamily: "Arial Black, Arial, sans-serif",
				fontSize: 18,
				fill: 0x44aaff,
				fontWeight: "bold",
			}),
		});
		title.position.set(8, 4);
		this.uiContainer.addChild(title);

		// Status
		this.statusText = new Text({
			text: "Press SPACE to cast!",
			style: new TextStyle({ fill: 0x88aacc, fontSize: 12 },
			),
		});
		this.statusText.anchor.set(0.5);
		this.statusText.position.set(this.width / 2, this.height * 0.8);
		this.uiContainer.addChild(this.statusText);

		// Detail (catch info)
		this.detailText = new Text({
			text: "",
			style: new TextStyle({
				fill: 0xffffff,
				fontSize: 14,
				fontWeight: "bold",
				align: "center",
			}),
		});
		this.detailText.anchor.set(0.5);
		this.detailText.position.set(this.width / 2, this.height * 0.55);
		this.uiContainer.addChild(this.detailText);
	}

	private createFooter(): void {
		const footer = new Text({
			text: "SPACE: Cast/Reel  |  ←→ Bait  |  Stats: C  |  ESC: Back",
			style: new TextStyle({ fill: 0x445566, fontSize: 9 },
			),
		});
		footer.anchor.set(0.5);
		footer.position.set(this.width / 2, this.height - 5);
		this.container.addChild(footer);
	}

	private selectFish(): FishSpecies {
		const bait = this.BAITS[this.selectedBait]!;
		const roll = Math.random();
		let cumulative = 0;

		// Weighted selection by inverse rarity (common fish more likely)
		const sortedFish = [...FISH].sort((a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]);
		const totalChance = sortedFish.reduce((s, f) => s + f.biteChance, 0);

		for (const fish of sortedFish) {
			const adjustedChance = (fish.biteChance / totalChance) * (1 + bait.bonus);
			cumulative += adjustedChance;
			if (roll < cumulative) return fish;
		}

		return sortedFish[0]!;
	}

	private updateUI(): void {
		// Water rendering
		const wg = this.waterGraphics;
		wg.clear();
		const waterY = 0;
		const waterH = this.height * 0.45;

		// Water gradient
		for (let i = 0; i < 10; i++) {
			const ratio = i / 10;
			const depth = Math.floor(0x08 + ratio * 0x10);
			wg.rect(0, waterY + (waterH / 10) * i, this.width, waterH / 10 + 1);
			wg.fill({
				color: (depth << 16) | (Math.floor(0x20 + ratio * 0x10) << 8) | Math.floor(0x40 + ratio * 0x20),
			});
		}

		// Wave animation
		for (let x = 0; x < this.width; x += 4) {
			const waveY = Math.sin((x + this.time * 30) * 0.05) * 2;
			wg.rect(x, waterY + waveY, 4, 2);
			wg.fill({ color: 0x2266aa, alpha: 0.3 });
		}

		// Sand bottom
		wg.rect(0, waterH - 8, this.width, 8);
		wg.fill(0x3a3020);

		// Bobber
		const bg = this.bobberGraphics;
		bg.clear();

		if (this.state === "waiting" || this.state === "bite") {
			const bobX = 0;
			let bobY = 0;

			if (this.state === "waiting") {
				bobY = Math.sin(this.time * 2) * 2;
			} else if (this.state === "bite") {
				// Bobber plunges!
				bobY = Math.sin(this.time * 10) * 5 + 5;
			}

			// Line
			bg.moveTo(bobX, -20);
			bg.lineTo(bobX, bobY);
			bg.stroke({ color: 0x888888, width: 1 });

			// Bobber ball
			bg.circle(bobX, bobY, 4);
			bg.fill(this.state === "bite" ? 0xff4444 : 0xff6644);

			// Ripples
			for (let r = 0; r < 3; r++) {
				const rippleSize = 6 + r * 6 + Math.sin(this.time * 3 + r) * 2;
				bg.circle(bobX, bobY + 2, rippleSize);
				bg.stroke({ color: 0x4488aa, width: 0.5, alpha: 0.3 - r * 0.1 });
			}
		}

		// Tension meter (during reeling)
		if (this.state === "reeling") {
			const meterX = this.width - 30;
			const meterY = this.height * 0.35;
			const meterH = this.height * 0.35;

			const meterBg = new Graphics();
			meterBg.rect(meterX, meterY, 16, meterH);
			meterBg.fill({ color: 0x1a1a2a });
			meterBg.stroke({ color: 0x334455, width: 1 });

			// Fill
			const fillH = (this.tension / 100) * meterH;
			const tensionColor = this.tension > 80 ? 0xff4444 : this.tension > 50 ? 0xffcc44 : 0x44ff88;
			meterBg.rect(meterX + 1, meterY + meterH - fillH, 14, fillH);
			meterBg.fill(tensionColor);
			this.uiContainer.addChild(meterBg);

			// Reel progress
			const progressBar = new Graphics();
			const progY = this.height * 0.75;
			progressBar.rect(20, progY, this.width - 40, 8);
			progressBar.fill(0x1a2030);
			progressBar.stroke({ color: 0x334455, width: 1 });
			progressBar.rect(20, progY, (this.width - 40) * (this.reelProgress / 100), 8);
			progressBar.fill(0x4488ff);
			this.uiContainer.addChild(progressBar);
		}

		// Bait info
		const bait = this.BAITS[this.selectedBait]!;
		const baitText = new Text({
			text: `Bait: ${bait.name} (${bait.bonus > 0 ? `+${(bait.bonus * 100).toFixed(0)}%` : "basic"})`,
			style: new TextStyle({ fill: 0x667788, fontSize: 10 },
			),
		});
		baitText.position.set(8, this.height * 0.87);
		this.uiContainer.addChild(baitText);

		// Stats
		const statsText = new Text({
			text: `Caught: ${this.catchCount} | Value: ${this.totalValue}g`,
			style: new TextStyle({ fill: 0x556677, fontSize: 9 },
			),
		});
		statsText.position.set(8, this.height * 0.87 + 14);
		this.uiContainer.addChild(statsText);
	}

	protected onUpdate(dt: number): void {
		this.time += dt;
		const prev = this.state;

		// State machine
		switch (this.state) {
			case "idle":
				this.statusText.text = "🎣 Press SPACE to cast!";
				if (InputManager.isActionPressed()) {
					this.state = "casting";
					this.castTimer = 0;
				}
				// Bait selection
				if (InputManager.isLeftPressed()) {
					this.selectedBait = (this.selectedBait - 1 + this.BAITS.length) % this.BAITS.length;
				}
				if (InputManager.isRightPressed()) {
					this.selectedBait = (this.selectedBait + 1) % this.BAITS.length;
				}
				break;

			case "casting":
				this.castTimer += dt;
				this.statusText.text = "Casting...";
				if (this.castTimer > 0.5) {
					this.state = "waiting";
					this.biteTimer = 2 + Math.random() * 5; // 2-7 seconds
				}
				break;

			case "waiting":
				this.biteTimer -= dt;
				this.statusText.text = `Waiting for a bite... ${(Math.ceil(this.biteTimer))}s`;
				if (this.biteTimer <= 0) {
					this.currentFish = this.selectFish();
					this.state = "bite";
					this.biteTimer = 2.0; // 2 seconds to react
				}
				break;

			case "bite":
				this.biteTimer -= dt;
				this.statusText.text = `🐟 BITE! Press SPACE! (${this.biteTimer.toFixed(1)}s)`;
				this.detailText.text = "Something is biting!";
				this.detailText.style.fill = 0xffcc44;

				if (InputManager.isActionPressed()) {
					this.state = "reeling";
					this.tension = 20;
					this.reelProgress = 0;
				}
				if (this.biteTimer <= 0) {
					this.state = "escaped";
					this.statusText.text = "Too slow! The fish got away...";
					this.detailText.text = "";
					setTimeout(() => { if (this.state === "escaped") this.state = "idle"; }, 1500);
				}
				break;

			case "reeling": {
				if (!this.currentFish) { this.state = "idle"; break; }

				// Fish fights back
				const fightForce = this.currentFish.fightStrength * 0.8;
				this.tension += (Math.random() - 0.4) * fightForce * dt * 10;

				// Reeling increases tension but also progress
				if (InputManager.isActionPressed()) {
					this.reelProgress += 30 * dt;
					this.tension += 15 * dt;
				}

				// Natural tension decay
				this.tension -= 5 * dt;

				// Clamp
				this.tension = Math.max(0, Math.min(100, this.tension));
				this.reelProgress = Math.max(0, this.reelProgress);

				this.statusText.text = `Reeling ${this.currentFish.name}! Tension: ${Math.floor(this.tension)}% | Progress: ${Math.floor(this.reelProgress)}%`;

				// Line breaks
				if (this.tension >= 100) {
					this.state = "escaped";
					this.statusText.text = "💥 The line snapped!";
					this.detailText.text = `${this.currentFish.name} escaped!`;
					this.detailText.style.fill = 0xff4444;
					setTimeout(() => { if (this.state === "escaped") { this.state = "idle"; this.detailText.text = ""; } }, 2000);
				}

				// Caught!
				if (this.reelProgress >= 100) {
					this.state = "caught";
					this.catchCount++;
					this.totalValue += this.currentFish.value;
					this.catchLog.push(this.currentFish);

					const color = RARITY_COLORS[this.currentFish.rarity];
					this.statusText.text = `🎉 CAUGHT: ${this.currentFish.name}!`;
					this.statusText.style.fill = color;
					this.detailText.text = `${this.currentFish.name}\n${this.currentFish.weight}kg | ${this.currentFish.value}g | ${this.currentFish.rarity.toUpperCase()}\n${this.currentFish.description}`;
					this.detailText.style.fill = color;

					setTimeout(() => {
						if (this.state === "caught") {
							this.state = "idle";
							this.statusText.style.fill = 0x88aacc;
							this.detailText.text = "";
						}
					}, 3000);
				}
				break;
			}
		}

		if (InputManager.isCancelPressed()) {
			StateManager.pop();
		}

		// Re-render
		if (prev !== this.state || this.state === "reeling" || this.state === "waiting") {
			this.uiContainer.removeChildren();
			this.createUI();
		}
		this.updateUI();
	}

	/** Get catch log for external use */
	getCatchLog(): FishSpecies[] {
		return [...this.catchLog];
	}

	/** Get total gold earned */
	getTotalValue(): number {
		return this.totalValue;
	}
}
