/**
 * HelpScene — Comprehensive In-Game Manual, Controls & Hetzner Cloud Reference.
 *
 * Synchronized in v3.0.36 with the Consolidated Single-Page Omni-Engine Dashboard,
 * Unified Settings & Options page, World `☰ Omni-Dashboard` HUD button, F1/F2
 * collision/door debug overlays, Creation Studio editors, and live Hetzner Cloud
 * (`bobsgame.com` & `ws.bobsgame.com`) multiplayer + AI architecture.
 */
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { APP_VERSION } from "../../shared/Config";
import { InputManager, Key } from "../input/InputManager";
import { Scene, type SceneConfig } from "../state/Scene";
import { SceneTransition } from "../state/SceneTransition";

interface HelpSection {
	title: string;
	lines: string[];
}

export class HelpScene extends Scene {
	private scrollY = 0;
	private targetScrollY = 0;
	private contentContainer!: Container;
	private viewportMask!: Graphics;
	private scrollThumb!: Graphics;
	private readonly scrollSpeed = 340;
	private maxScroll = 0;
	private readonly viewportTop = 58;
	private viewportHeight = 580;
	private wheelHandler: ((e: WheelEvent) => void) | null = null;

	private static readonly SECTIONS: HelpSection[] = [
		{
			title: "🧭 Consolidated Omni-Engine Dashboard (#menu)",
			lines: [
				"All 37 gameplay modes, editors, rankings, and engine tools live on ONE scrollable page.",
				"Mouse Wheel / Scrollbar Drag / PageUp / PageDown — Smoothly scroll the entire dashboard.",
				"Keys 1–5 or Q / E — Smoothly jump between the 5 priority sections on the same page.",
				"Top-Right Cloud Telemetry — Live health, player count & AI status on Hetzner Cloud (ws.bobsgame.com).",
				"Inline Puzzle Mode Pills — Switch between MARATHON, SPRINT, and ULTRA before starting any puzzle.",
				"Hover any card or ⓘ badge to inspect full contextual tooltips; press V to toggle the FFT visualizer.",
			],
		},
		{
			title: "🎮 World & RPG Keyboard Controls",
			lines: [
				"WASD / Arrow Keys — 8-directional character movement",
				"Shift (Hold) — Sprint",
				"Space / E / Enter — Interact with NPCs, signs, chests, and doors",
				"☰ Omni-Dashboard Button (Top-Left HUD) or ESC — Pause / Return to Consolidated Dashboard",
				"C — Open Generative AI NPC Chat when standing near an NPC",
				"F — Cast fishing line near water",
				"Tab — Toggle World Minimap   |   Tilde (~) — Toggle Engine Debug Console",
				"F1 — Toggle Coordinate & Layer Debug HUD   |   F2 — Toggle Collision & Door Trigger Overlays",
				"F5 — Quick Save   |   F9 — Quick Load",
			],
		},
		{
			title: "🕹️ Puzzle & Gamepad Controls",
			lines: [
				"Left / Right Arrows (or D-Pad) — Shift falling piece horizontally (DAS/ARR configurable)",
				"Z / X (or A / B Buttons) — Rotate piece counter-clockwise / clockwise (SRS wall kicks in Modern)",
				"Down Arrow — Soft drop   |   Up Arrow / Space — Instant hard drop",
				"C / Shift — Hold current piece",
				"Gamepad Start — Pause Menu   |   Gamepad Select — Toggle Minimap",
			],
		},
		{
			title: "🛠️ Creation Studio & Hetzner Cloud AI (ws.bobsgame.com)",
			lines: [
				"Custom Game Rule Editor — Configure piece shapes, gravity tables, lock delays, and garbage rules.",
				"World Database Editor — Edit tilemap layers, warp doors, NPC spawns, and AI-generated tilesets.",
				"Pixel Sprite Editor — Draw frames, test 8-direction walk animations, or prompt Text-to-Sprite.",
				"Event Sheet & Game Sequence Editors — Script cutscenes/quests and chain multi-stage puzzle campaigns.",
				"Generative AI requests route directly to live Hetzner Cloud (https://ws.bobsgame.com/api/*) — no local servers.",
			],
		},
		{
			title: "🖥️ Unified Settings, System Tray & Live Cloud Architecture",
			lines: [
				"Unified Settings & Options — Audio Mixer, WebGPU/WebGL2, HQ2X HD Sprites, Ghost Piece, Touch HUD, Haptics & Name on one page.",
				"Electron Desktop Shell & System Tray — Minimize-to-tray, jump to #menu or #world, and connect directly to Hetzner Live.",
				"Live Deployment — Hosted exclusively on Hetzner Cloud at https://bobsgame.com and https://ws.bobsgame.com (zero local servers).",
			],
		},
	];

	constructor(config: SceneConfig) {
		super(config);
	}

	public async create(): Promise<void> {
		this.detachWheel();
		this.container.removeChildren();

		this.viewportHeight = Math.max(200, this.height - this.viewportTop - 44);
		this.createBackground();
		this.createTitle();
		this.createContent();
		this.createScrollbar();
		this.createFooter();
		this.attachWheel();
	}

	private attachWheel(): void {
		this.detachWheel();
		this.wheelHandler = (e: WheelEvent) => {
			if (this._paused) return;
			e.preventDefault();
			const delta = e.deltaMode === 1 ? e.deltaY * 28 : e.deltaY * 0.8;
			this.targetScrollY = Math.max(
				0,
				Math.min(this.maxScroll, this.targetScrollY + delta),
			);
		};
		this.app.canvas.addEventListener("wheel", this.wheelHandler, {
			passive: false,
		});
	}

	private detachWheel(): void {
		if (this.wheelHandler) {
			this.app.canvas.removeEventListener("wheel", this.wheelHandler);
			this.wheelHandler = null;
		}
	}

	private createBackground(): void {
		const bg = new Graphics();
		for (let i = 0; i < 24; i++) {
			const ratio = i / 24;
			const r = Math.floor(7 + ratio * 10);
			const g = Math.floor(10 + ratio * 14);
			const b = Math.floor(20 + ratio * 24);
			bg.rect(0, (this.height / 24) * i, this.width, this.height / 24 + 1);
			bg.fill((r << 16) | (g << 8) | b);
		}
		this.container.addChild(bg);
	}

	private createTitle(): void {
		const title = new Text({
			text: `📖 HELP, CONTROLS & OPERATIONS MANUAL  (v${APP_VERSION})`,
			style: new TextStyle({
				fontFamily: "Arial Black, Arial, sans-serif",
				fontSize: 22,
				fill: 0xffcc44,
				fontWeight: "bold",
				letterSpacing: 1,
			}),
		});
		title.anchor.set(0.5);
		title.position.set(this.width / 2, 28);
		this.container.addChild(title);
	}

	private createContent(): void {
		const wrapper = new Container();
		wrapper.position.set(0, this.viewportTop);
		this.container.addChild(wrapper);

		this.contentContainer = new Container();
		wrapper.addChild(this.contentContainer);

		this.viewportMask = new Graphics();
		this.viewportMask.rect(0, this.viewportTop, this.width, this.viewportHeight);
		this.viewportMask.fill(0xffffff);
		this.container.addChild(this.viewportMask);
		wrapper.mask = this.viewportMask;

		let y = 10;
		const padX = 32;
		const lineH = 21;
		const sectionGap = 16;

		for (const section of HelpScene.SECTIONS) {
			const header = new Text({
				text: section.title,
				style: new TextStyle({
					fill: 0x66b2ff,
					fontSize: 15,
					fontWeight: "bold",
					letterSpacing: 0.5,
				}),
			});
			header.position.set(padX, y);
			this.contentContainer.addChild(header);
			y += lineH + 3;

			const sep = new Graphics();
			sep.moveTo(padX, y);
			sep.lineTo(this.width - padX - 16, y);
			sep.stroke({ color: 0x22385c, width: 1.2 });
			this.contentContainer.addChild(sep);
			y += 7;

			for (const line of section.lines) {
				const text = new Text({
					text: `• ${line}`,
					style: new TextStyle({
						fill: 0xc5d6ea,
						fontSize: 13,
						wordWrap: true,
						wordWrapWidth: this.width - padX * 2 - 28,
					}),
				});
				text.position.set(padX + 8, y);
				this.contentContainer.addChild(text);
				y += Math.max(lineH, text.height + 5);
			}

			y += sectionGap;
		}

		this.maxScroll = Math.max(0, y - this.viewportHeight + 16);
	}

	private createScrollbar(): void {
		const barW = 6;
		const barX = this.width - 14;
		const track = new Graphics();
		track.roundRect(barX, this.viewportTop, barW, this.viewportHeight, 3);
		track.fill(0x112238);
		this.container.addChild(track);

		this.scrollThumb = new Graphics();
		this.container.addChild(this.scrollThumb);
		this.redrawThumb();
	}

	private redrawThumb(): void {
		const barW = 6;
		const barX = this.width - 14;
		const thumbH =
			this.maxScroll > 0
				? Math.max(
						32,
						(this.viewportHeight / (this.viewportHeight + this.maxScroll)) *
							this.viewportHeight,
					)
				: this.viewportHeight;
		const pct = this.maxScroll > 0 ? this.scrollY / this.maxScroll : 0;
		const thumbY = this.viewportTop + pct * (this.viewportHeight - thumbH);

		this.scrollThumb.clear();
		this.scrollThumb.roundRect(barX, thumbY, barW, thumbH, 3);
		this.scrollThumb.fill(0x3b82f6);
	}

	private createFooter(): void {
		const backBtn = new Container();
		backBtn.position.set(24, this.height - 36);
		backBtn.eventMode = "static";
		backBtn.cursor = "pointer";

		const g = new Graphics();
		g.roundRect(0, 0, 180, 28, 6);
		g.fill(0x193050);
		g.stroke({ color: 0x4b7bb5, width: 1.5 });
		backBtn.addChild(g);

		const lbl = new Text({
			text: "← Back to Dashboard",
			style: new TextStyle({ fill: 0xffffff, fontSize: 12, fontWeight: "bold" }),
		});
		lbl.anchor.set(0.5);
		lbl.position.set(90, 14);
		backBtn.addChild(lbl);
		backBtn.on("pointerdown", () => this.goBack());
		this.container.addChild(backBtn);

		const footer = new Text({
			text: "🖱️ Mouse Wheel / ↑↓ / PageUp·PageDown: Scroll   |   ESC / B: Back",
			style: new TextStyle({ fill: 0x7c97b8, fontSize: 12 }),
		});
		footer.anchor.set(0.5);
		footer.position.set(this.width / 2 + 60, this.height - 22);
		this.container.addChild(footer);
	}

	private goBack(): void {
		this.detachWheel();
		SceneTransition.popWithFade(this.app);
	}

	public onResize(width: number, height: number): void {
		super.onResize(width, height);
		void this.create();
	}

	protected onUpdate(dt: number): void {
		if (InputManager.isKeyHeld("ArrowUp")) {
			this.targetScrollY = Math.max(0, this.targetScrollY - this.scrollSpeed * dt);
		}
		if (InputManager.isKeyHeld("ArrowDown")) {
			this.targetScrollY = Math.min(
				this.maxScroll,
				this.targetScrollY + this.scrollSpeed * dt,
			);
		}
		if (InputManager.isKeyPressed(Key.PageDown)) {
			this.targetScrollY = Math.min(
				this.maxScroll,
				this.targetScrollY + this.viewportHeight * 0.8,
			);
		}
		if (InputManager.isKeyPressed(Key.PageUp)) {
			this.targetScrollY = Math.max(
				0,
				this.targetScrollY - this.viewportHeight * 0.8,
			);
		}

		if (Math.abs(this.targetScrollY - this.scrollY) > 0.3) {
			this.scrollY += (this.targetScrollY - this.scrollY) * Math.min(1, dt * 14);
			this.contentContainer.position.y = -this.scrollY;
			this.redrawThumb();
		}

		if (
			InputManager.isCancelPressed() ||
			InputManager.isKeyPressed(Key.Escape)
		) {
			this.goBack();
		}
	}

	protected async destroy(): Promise<void> {
		this.detachWheel();
	}
}
