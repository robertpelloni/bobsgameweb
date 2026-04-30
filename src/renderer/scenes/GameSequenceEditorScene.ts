/**
 * GameSequenceEditorScene — visual editor for creating and editing GameSequences.
 *
 * A GameSequence is an ordered (or randomized) collection of custom game types
 * that can be shared and played as a campaign or challenge series.
 *
 * This scene lets players:
 * - Create new sequences from scratch or from templates
 * - Add/remove/reorder game types
 * - Configure sequence-wide settings (randomize, difficulty)
 * - Preview any game in the sequence
 * - Save sequences locally and share via deep links
 */
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { GameSequence } from "../engine/puzzle/GameSequence";
import { InputManager } from "../input/InputManager";
import { GameTypes } from "../puzzle";
import { BobNet } from "../puzzle/BobNet";
import { Scene, type SceneConfig } from "../state/Scene";
import { SceneTransition } from "../state/SceneTransition";
import { StateManager } from "../state/StateManager";

const STORAGE_KEY = "game-sequences";

export class GameSequenceEditorScene extends Scene {
	// UI elements
	private background!: Graphics;
	private titleText!: Text;
	private infoText!: Text;
	private gamesContainer!: Container;
	private actionContainer!: Container;

	// Data
	private sequences: GameSequence[] = [];
	private currentSequence: GameSequence | null = null;
	private selectedIndex = 0;
	private cursorPos = 0;

	// Layout
	private readonly LIST_X = 40;
	private readonly LIST_Y = 100;
	private readonly LIST_W = 300;
	private readonly DETAIL_X = 360;
	private readonly ROW_H = 50;

	constructor(config: SceneConfig) {
		super(config);
	}

	public async create(): Promise<void> {
		this.loadSequences();
		this.createBackground();
		this.createTitle();
		this.createUI();
		this.renderAll();
	}

	// ============================================================
	// Data Management
	// ============================================================

	private loadSequences(): void {
		try {
			const data = localStorage.getItem(STORAGE_KEY);
			if (data) {
				const parsed = JSON.parse(data);
				this.sequences = parsed.map((s: any) => GameSequence.fromJSON(s));
			}
		} catch {
			this.sequences = [];
		}

		// Create a default sequence if none exist
		if (this.sequences.length === 0) {
			const defaultSeq = new GameSequence({ name: "My First Sequence" });
			defaultSeq.addGame(GameTypes.CLASSIC as any);
			defaultSeq.addGame(GameTypes.MODERN as any);
			this.sequences.push(defaultSeq);
		}

		this.currentSequence = this.sequences[0];
	}

	private saveSequences(): void {
		try {
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify(this.sequences.map((s) => s.toJSON())),
			);
		} catch {
			console.warn("Failed to save sequences");
		}
	}

	// ============================================================
	// UI Creation
	// ============================================================

	private createBackground(): void {
		this.background = new Graphics();
		// Dark gradient background
		for (let i = 0; i < 20; i++) {
			const ratio = i / 20;
			const r = Math.floor(10 + ratio * 16);
			const g = Math.floor(10 + ratio * 16);
			const b = Math.floor(26 + ratio * 32);
			this.background.rect(
				0,
				(this.height / 20) * i,
				this.width,
				this.height / 20 + 1,
			);
			this.background.fill((r << 16) | (g << 8) | b);
		}
		this.container.addChild(this.background);
	}

	private createTitle(): void {
		const style = new TextStyle({
			fontFamily: "Arial Black, Arial, sans-serif",
			fontSize: 36,
			fontWeight: "bold",
			fill: 0xffffff,
			letterSpacing: 2,
		});

		this.titleText = new Text({ text: "GAME SEQUENCE EDITOR", style });
		this.titleText.anchor.set(0.5, 0);
		this.titleText.position.set(this.width / 2, 20);
		this.container.addChild(this.titleText);

		this.infoText = new Text({
			text: "Create custom game sequences and campaigns",
			style: new TextStyle({ fill: 0x6688aa, fontSize: 14 }),
		});
		this.infoText.anchor.set(0.5);
		this.infoText.position.set(this.width / 2, 62);
		this.container.addChild(this.infoText);
	}

	private createUI(): void {
		this.gamesContainer = new Container();
		this.container.addChild(this.gamesContainer);

		this.actionContainer = new Container();
		this.container.addChild(this.actionContainer);

		// Bottom hint bar
		const hintBg = new Graphics();
		hintBg.rect(0, this.height - 30, this.width, 30);
		hintBg.fill({ color: 0x000000, alpha: 0.6 });
		this.container.addChild(hintBg);

		const hintStyle = new TextStyle({ fill: 0x556677, fontSize: 12 });
		const hint = new Text({
			text: "↑↓: Navigate  |  ENTER: Edit  |  A: Add Game  |  D: Delete  |  N: New Sequence  |  S: Share  |  ESC: Back",
			style: hintStyle,
		});
		hint.anchor.set(0.5);
		hint.position.set(this.width / 2, this.height - 15);
		this.container.addChild(hint);
	}

	// ============================================================
	// Rendering
	// ============================================================

	private renderAll(): void {
		this.renderSequenceList();
		this.renderDetailPanel();
		this.renderActions();
	}

	private renderSequenceList(): void {
		this.gamesContainer.removeChildren();

		const headerStyle = new TextStyle({
			fill: 0x4466aa,
			fontSize: 14,
			fontWeight: "bold",
		});
		const header = new Text({ text: "SEQUENCES", style: headerStyle });
		header.position.set(this.LIST_X, this.LIST_Y - 25);
		this.gamesContainer.addChild(header);

		for (let i = 0; i < this.sequences.length; i++) {
			const seq = this.sequences[i];
			const isSelected = i === this.selectedIndex;
			const y = this.LIST_Y + i * this.ROW_H;

			// Row background
			const rowBg = new Graphics();
			rowBg.roundRect(this.LIST_X, y, this.LIST_W, this.ROW_H - 4, 6);
			rowBg.fill({ color: isSelected ? 0x1a3a5a : 0x0a1a2a });
			if (isSelected) rowBg.stroke({ color: 0x4488ff, width: 2 });
			this.gamesContainer.addChild(rowBg);

			// Sequence name
			const nameStyle = new TextStyle({
				fill: isSelected ? 0xffffff : 0x8899aa,
				fontSize: 14,
				fontWeight: "bold",
			});
			const nameText = new Text({ text: seq.name, style: nameStyle });
			nameText.position.set(this.LIST_X + 12, y + 5);
			this.gamesContainer.addChild(nameText);

			// Game count
			const countStyle = new TextStyle({ fill: 0x556677, fontSize: 11 });
			const countText = new Text({
				text: `${seq.getTotalGames()} games · ${seq.randomizeSequence ? "Random" : "Sequential"}`,
				style: countStyle,
			});
			countText.position.set(this.LIST_X + 12, y + 24);
			this.gamesContainer.addChild(countText);
		}
	}

	private renderDetailPanel(): void {
		const detailPanel = this.container;

		// Clear previous detail elements (tagged)
		const existing = detailPanel.children.filter((c) => (c as any)._isDetail);
		for (const c of existing) detailPanel.removeChild(c);

		if (!this.currentSequence) return;

		const seq = this.currentSequence;
		const dx = this.DETAIL_X;
		let dy = this.LIST_Y;

		// Sequence name
		const nameStyle = new TextStyle({
			fill: 0xffffff,
			fontSize: 20,
			fontWeight: "bold",
		});
		const name = new Text({ text: seq.name, style: nameStyle });
		(name as any)._isDetail = true;
		name.position.set(dx, dy);
		detailPanel.addChild(name);
		dy += 30;

		// Description
		const descStyle = new TextStyle({ fill: 0x8899aa, fontSize: 13 });
		const desc = new Text({ text: seq.description, style: descStyle });
		(desc as any)._isDetail = true;
		desc.position.set(dx, dy);
		detailPanel.addChild(desc);
		dy += 25;

		// Settings
		const settingsStyle = new TextStyle({ fill: 0x4488ff, fontSize: 12 });
		const settings = new Text({
			text: `Mode: ${seq.randomizeSequence ? "🔀 Randomized" : "📋 Sequential"} · Difficulty: ${seq.currentDifficultyName}`,
			style: settingsStyle,
		});
		(settings as any)._isDetail = true;
		settings.position.set(dx, dy);
		detailPanel.addChild(settings);
		dy += 30;

		// Games list header
		const gamesHeader = new Text({
			text: `── GAMES (${seq.getTotalGames()}) ──`,
			style: new TextStyle({
				fill: 0x4466aa,
				fontSize: 14,
				fontWeight: "bold",
			}),
		});
		(gamesHeader as any)._isDetail = true;
		gamesHeader.position.set(dx, dy);
		detailPanel.addChild(gamesHeader);
		dy += 25;

		// Game entries
		for (let i = 0; i < seq.gameTypes.length; i++) {
			const game = seq.gameTypes[i];
			const gameY = dy + i * 40;
			const isCursorHere = i === this.cursorPos;

			// Row bg
			const rowBg = new Graphics();
			rowBg.roundRect(dx, gameY, this.width - dx - 20, 36, 4);
			rowBg.fill({ color: isCursorHere ? 0x1a2a4a : 0x0a0a1a });
			if (isCursorHere) rowBg.stroke({ color: 0x6688ff, width: 1 });
			(rowBg as any)._isDetail = true;
			detailPanel.addChild(rowBg);

			// Game index
			const idxStyle = new TextStyle({
				fill: 0x4466aa,
				fontSize: 12,
				fontWeight: "bold",
			});
			const idx = new Text({ text: `#${i + 1}`, style: idxStyle });
			(idx as any)._isDetail = true;
			idx.position.set(dx + 8, gameY + 4);
			detailPanel.addChild(idx);

			// Game name
			const gNameStyle = new TextStyle({
				fill: isCursorHere ? 0xffffff : 0xaabbcc,
				fontSize: 14,
			});
			const gName = new Text({
				text: game.gameEnum || `Game ${i + 1}`,
				style: gNameStyle,
			});
			(gName as any)._isDetail = true;
			gName.position.set(dx + 50, gameY + 4);
			detailPanel.addChild(gName);

			// Grid info
			const gridStyle = new TextStyle({ fill: 0x556677, fontSize: 11 });
			const gridInfo = new Text({
				text: `${game.gridWidth ?? 10}×${game.gridHeight ?? 20} · ${(game as any).gameMode ?? "marathon"}`,
				style: gridStyle,
			});
			(gridInfo as any)._isDetail = true;
			gridInfo.position.set(dx + 50, gameY + 22);
			detailPanel.addChild(gridInfo);
		}
	}

	private renderActions(): void {
		this.actionContainer.removeChildren();

		const btnW = 100;
		const btnH = 32;
		const startX = this.DETAIL_X;
		const y = this.height - 75;
		const gap = 8;

		const buttons = [
			{ label: "+ New", action: () => this.newSequence() },
			{ label: "+ Add Game", action: () => this.addGame() },
			{ label: "- Remove", action: () => this.removeGame() },
			{ label: "🔀 Toggle", action: () => this.toggleRandomize() },
			{ label: "▶ Play", action: () => this.playSequence() },
			{ label: "📤 Share", action: () => this.shareSequence() },
		];

		for (let i = 0; i < buttons.length; i++) {
			const btn = buttons[i];
			const bx = startX + i * (btnW + gap);
			const btnContainer = this.createButton(btn.label, btnW, btnH);
			btnContainer.position.set(bx, y);
			btnContainer.on("pointerdown", btn.action);
			this.actionContainer.addChild(btnContainer);
		}
	}

	private createButton(label: string, w: number, h: number): Container {
		const container = new Container();
		const bg = new Graphics();
		bg.roundRect(0, 0, w, h, 6);
		bg.fill(0x1a2a4a);
		bg.stroke({ color: 0x4a6a8a, width: 1 });
		container.addChild(bg);

		const text = new Text({
			text: label,
			style: new TextStyle({ fill: 0xccddff, fontSize: 12 }),
		});
		text.anchor.set(0.5);
		text.position.set(w / 2, h / 2);
		container.addChild(text);

		container.eventMode = "static";
		container.cursor = "pointer";
		return container;
	}

	// ============================================================
	// Actions
	// ============================================================

	private newSequence(): void {
		const seq = new GameSequence({
			name: `Sequence ${this.sequences.length + 1}`,
		});
		this.sequences.push(seq);
		this.selectedIndex = this.sequences.length - 1;
		this.currentSequence = seq;
		this.cursorPos = 0;
		this.saveSequences();
		this.renderAll();
	}

	private addGame(): void {
		if (!this.currentSequence) return;
		// Add Classic game type as default
		this.currentSequence.addGame(GameTypes.CLASSIC as any);
		this.saveSequences();
		this.renderAll();
	}

	private removeGame(): void {
		if (!this.currentSequence) return;
		if (this.currentSequence.gameTypes.length === 0) return;
		this.currentSequence.removeGame(this.cursorPos);
		if (this.cursorPos >= this.currentSequence.gameTypes.length) {
			this.cursorPos = Math.max(0, this.currentSequence.gameTypes.length - 1);
		}
		this.saveSequences();
		this.renderAll();
	}

	private toggleRandomize(): void {
		if (!this.currentSequence) return;
		this.currentSequence.randomizeSequence =
			!this.currentSequence.randomizeSequence;
		this.saveSequences();
		this.renderAll();
	}

	private playSequence(): void {
		if (!this.currentSequence || this.currentSequence.gameTypes.length === 0)
			return;
		const game = this.currentSequence.getCurrentGame();
		if (!game) return;

		// Navigate to puzzle scene with the first game type
		import("../puzzle/PuzzleScene").then(({ PuzzleScene }) => {
			const puzzleConfig = {
				name: "puzzle-sequence",
				app: this.app,
				camera: this.camera ?? undefined,
				gameType: game as any,
				gameMode: "marathon" as const,
				startLevel: 1,
			};
			const puzzleScene = new PuzzleScene(puzzleConfig);
			SceneTransition.pushWithFade(this.app, puzzleScene);
		});
	}

	private shareSequence(): void {
		if (!this.currentSequence) return;
		try {
			const json = this.currentSequence.toJSON();
			const b64 = BobNet.toBase64GZippedGSON(json);
			const url = `${window.location.origin}${window.location.pathname}#sequence=${b64}`;
			navigator.clipboard
				.writeText(url)
				.then(() => {
					this.infoText.text = "Sequence link copied to clipboard!";
					setTimeout(() => {
						this.infoText.text = "Create custom game sequences and campaigns";
					}, 3000);
				})
				.catch(() => {
					prompt("Copy this link:", url);
				});
		} catch (e) {
			console.error("Share failed:", e);
		}
	}

	// ============================================================
	// Input
	// ============================================================

	protected onUpdate(_dt: number): void {
		// Sequence list navigation
		if (InputManager.isKeyPressed("KeyN")) this.newSequence();
		if (InputManager.isKeyPressed("KeyA")) this.addGame();
		if (InputManager.isKeyPressed("KeyD")) this.removeGame();
		if (InputManager.isKeyPressed("KeyS")) this.shareSequence();

		if (InputManager.isKeyPressed("KeyR")) this.toggleRandomize();
		if (
			InputManager.isKeyPressed("Enter") ||
			InputManager.isKeyPressed("Space")
		)
			this.playSequence();

		// Cursor movement within game list
		if (InputManager.isDownPressed()) {
			if (this.cursorPos < (this.currentSequence?.gameTypes.length ?? 0) - 1) {
				this.cursorPos++;
				this.renderDetailPanel();
			}
		}
		if (InputManager.isUpPressed()) {
			if (this.cursorPos > 0) {
				this.cursorPos--;
				this.renderDetailPanel();
			}
		}

		// Tab between sequences
		if (InputManager.isLeftPressed()) {
			if (this.selectedIndex > 0) {
				this.selectedIndex--;
				this.currentSequence = this.sequences[this.selectedIndex];
				this.cursorPos = 0;
				this.renderAll();
			}
		}
		if (InputManager.isRightPressed()) {
			if (this.selectedIndex < this.sequences.length - 1) {
				this.selectedIndex++;
				this.currentSequence = this.sequences[this.selectedIndex];
				this.cursorPos = 0;
				this.renderAll();
			}
		}

		if (InputManager.isCancelPressed()) {
			StateManager.pop();
		}
	}
}
