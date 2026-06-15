/**
 * HelpScene — in-game help and controls reference.
 *
 * Shows game controls (keyboard + gamepad), tutorials, and tips.
 * Accessible from the main menu or in-game pause menu.
 */
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { Scene, type SceneConfig } from "../state/Scene";
import { StateManager } from "../state/StateManager";
import { InputManager } from "../input/InputManager";

interface HelpSection {
	title: string;
	lines: string[];
}

export class HelpScene extends Scene {
	private scrollY = 0;
	private contentContainer!: Container;
	private readonly scrollSpeed = 40;
	private maxScroll = 0;

	private static readonly SECTIONS: HelpSection[] = [
		{
			title: "🎮 Keyboard Controls",
			lines: [
				"WASD / Arrow Keys — Move character",
				"Space / E — Interact / Confirm",
				"Escape / Backspace — Cancel / Back",
				"Shift — Sprint",
				"V — Toggle Menu Visualizer",
				"C — AI NPC Chat (when near NPC)",
				"F5 — Quick Save",
				"F9 — Quick Load",
				"Tab — Toggle Minimap",
			],
		},
		{
			title: "🎮 Gamepad Controls",
			lines: [
				"Left Stick / D-Pad — Move character",
				"A Button — Interact / Confirm",
				"B Button — Cancel / Back",
				"Start — Pause Menu",
				"Select — Toggle Minimap",
			],
		},
		{
			title: "🗺️ World Map",
			lines: [
				"Explore the world of TOWNYUU and beyond!",
				"Walk near NPCs and press Space/E to talk.",
				"Doors glow — walk into them to enter buildings.",
				"The minimap (top-right) shows your position.",
				"Blue tiles are water — you can't walk on them.",
				"Bridges let you cross rivers.",
				"Chests contain items — walk into them to open.",
			],
		},
		{
			title: "🧩 Puzzle Games",
			lines: [
				"Select 'Play Puzzle' from the main menu.",
				"Clear lines by filling rows completely.",
				"Speed increases as you level up.",
				"Compete online for high scores!",
				"Game sequences chain multiple puzzle variants.",
			],
		},
		{
			title: "⚔️ Tournaments",
			lines: [
				"Join bracket tournaments from the Tournament menu.",
				"Single elimination — lose and you're out!",
				"ELO ratings adjust after each match.",
				"Higher ELO players win more simulation matches.",
				"Watch tournaments as a spectator.",
			],
		},
		{
			title: "🌐 Online Play",
			lines: [
				"Select 'Go Online' to connect to the server.",
				"Enter your username to identify yourself.",
				"Join or create rooms in the multiplayer lobby.",
				"Chat with other players in the lobby.",
				"Leaderboards track marathon, sprint, and ultra scores.",
			],
		},
		{
			title: "💡 Tips",
			lines: [
				"Press F5 to save anywhere, anytime.",
				"Fish near water by pressing F.",
				"Talk to NPCs multiple times — they may have new dialogue.",
				"Try the AI Chat for deep character interactions!",
				"Enable 'HD Sprites' in Options for HQ2X upscaling.",
				"Check the achievements screen for goals.",
				"Use the Settings menu to adjust audio volumes.",
				"The nD Handheld plays mini-games within the game!",
			],
		},
	];

	constructor(config: SceneConfig) {
		super(config);
	}

	public async create(): Promise<void> {
		this.createBackground();
		this.createTitle();
		this.createContent();
		this.createScrollbar();
		this.createFooter();
	}

	private createBackground(): void {
		const bg = new Graphics();
		for (let i = 0; i < 30; i++) {
			const ratio = i / 30;
			const r = Math.floor(4 + ratio * 8);
			const g = Math.floor(4 + ratio * 6);
			const b = Math.floor(12 + ratio * 20);
			bg.rect(0, (this.height / 30) * i, this.width, this.height / 30 + 1);
			bg.fill((r << 16) | (g << 8) | b);
		}
		this.container.addChild(bg);
	}

	private createTitle(): void {
		const title = new Text({
			text: "📖 HELP & CONTROLS",
			style: new TextStyle({
				fontFamily: "Arial Black, Arial, sans-serif",
				fontSize: 28,
				fill: 0xffcc44,
				fontWeight: "bold",
				letterSpacing: 1,
			}),
		});
		title.anchor.set(0.5);
		title.position.set(this.width / 2, 20);
		this.container.addChild(title);
	}

	private createContent(): void {
		this.contentContainer = new Container();
		this.container.addChild(this.contentContainer);

		let y = 60;
		const padX = 30;
		const lineH = 20;
		const sectionGap = 16;

		for (const section of HelpScene.SECTIONS) {
			// Section header
			const headerStyle = new TextStyle({
				fill: 0x66aaff,
				fontSize: 16,
				fontWeight: "bold",
				letterSpacing: 0.5,
			});
			const header = new Text({ text: section.title, style: headerStyle });
			header.position.set(padX, y);
			this.contentContainer.addChild(header);
			y += lineH + 4;

			// Separator line
			const sep = new Graphics();
			sep.moveTo(padX, y);
			sep.lineTo(this.width - padX, y);
			sep.stroke({ color: 0x223355, width: 1 });
			this.contentContainer.addChild(sep);
			y += 6;

			// Lines
			for (const line of section.lines) {
				const lineStyle = new TextStyle({
					fill: 0xaabbcc,
					fontSize: 13,
				});
				const text = new Text({ text: `  ${line}`, style: lineStyle });
				text.position.set(padX + 8, y);
				this.contentContainer.addChild(text);
				y += lineH;
			}

			y += sectionGap;
		}

		this.maxScroll = Math.max(0, y - this.height + 50);
	}

	private createScrollbar(): void {
		const barW = 6;
		const barX = this.width - 12;
		const barY = 55;
		const barH = this.height - 80;

		const track = new Graphics();
		track.roundRect(barX, barY, barW, barH, 3);
		track.fill(0x112233);
		this.container.addChild(track);
	}

	private createFooter(): void {
		const footer = new Text({
			text: "↑↓ Scroll  |  ESC / B — Back",
			style: new TextStyle({ fill: 0x556677, fontSize: 12 }),
		});
		footer.anchor.set(0.5);
		footer.position.set(this.width / 2, this.height - 18);
		this.container.addChild(footer);
	}

	protected onUpdate(_dt: number): void {
		// Scroll with arrow keys
		if (InputManager.isKeyHeld("ArrowUp")) {
			this.scrollY = Math.max(0, this.scrollY - this.scrollSpeed * _dt);
		}
		if (InputManager.isKeyHeld("ArrowDown")) {
			this.scrollY = Math.min(this.maxScroll, this.scrollY + this.scrollSpeed * _dt);
		}

		// Apply scroll
		this.contentContainer.position.y = -this.scrollY;

		// Back
		if (InputManager.isCancelPressed()) {
			StateManager.pop();
		}
	}
}
