/**
 * TournamentScene — visual bracket tournament for competitive puzzle play.
 *
 * Features:
 * - Visual bracket display with player names and match status
 * - Create tournaments with 4, 8, 16, or 32 players
 * - Watch match progress in real-time
 * - Spectate ongoing matches via replay
 * - Champion crowned with celebration effects
 */
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { AudioManager } from "../audio/AudioManager";
import { getPlayerDisplayName } from "../data/AchievementIdentity";
import {
	type Tournament,
	TournamentManager,
	type TournamentMatch,
} from "../engine/stadium/TournamentManager";
import { InputManager } from "../input/InputManager";
import { Scene, type SceneConfig } from "../state/Scene";
import { SceneTransition } from "../state/SceneTransition";
import { StateManager } from "../state/StateManager";

interface SimPlayer {
	id: number;
	name: string;
	elo: number;
}

export class TournamentScene extends Scene {
	private tournamentManager: TournamentManager;
	private currentTournament: Tournament | null = null;
	private players: SimPlayer[] = [];
	private bracketContainer!: Container;
	private headerContainer!: Container;
	private actionContainer!: Container;
	private statusText!: Text;
	private simInterval: ReturnType<typeof setInterval> | null = null;

	constructor(config: SceneConfig) {
		super(config);
		this.tournamentManager = new TournamentManager();
	}

	public async create(): Promise<void> {
		this.createBackground();
		this.createHeader();
		this.createBracketContainer();
		this.createActions();
		this.createStatus("Create a tournament to begin");
		this.generateDemoPlayers();
	}

	private createBackground(): void {
		const bg = new Graphics();
		for (let i = 0; i < 20; i++) {
			const ratio = i / 20;
			const r = Math.floor(3 + ratio * 12);
			const g = Math.floor(3 + ratio * 8);
			const b = Math.floor(15 + ratio * 25);
			bg.rect(0, (this.height / 20) * i, this.width, this.height / 20 + 1);
			bg.fill((r << 16) | (g << 8) | b);
		}
		this.container.addChild(bg);
	}

	private createHeader(): void {
		this.headerContainer = new Container();
		this.container.addChild(this.headerContainer);

		const titleStyle = new TextStyle({
			fontFamily: "Arial Black, Arial, sans-serif",
			fontSize: 36,
			fill: 0xffaa00,
			fontWeight: "bold",
			letterSpacing: 2,
		});
		const title = new Text({ text: "⚔ TOURNAMENT ARENA", style: titleStyle });
		title.anchor.set(0.5);
		title.position.set(this.width / 2, 25);
		this.headerContainer.addChild(title);
	}

	private createBracketContainer(): void {
		this.bracketContainer = new Container();
		this.container.addChild(this.bracketContainer);
	}

	private createActions(): void {
		this.actionContainer = new Container();
		this.container.addChild(this.actionContainer);
		this.renderActions();
	}

	private createStatus(message: string, color = 0x88aacc): void {
		if (this.statusText) this.statusText.destroy();
		this.statusText = new Text({
			text: message,
			style: new TextStyle({ fill: color, fontSize: 13 }),
		});
		this.statusText.anchor.set(0.5);
		this.statusText.position.set(this.width / 2, this.height - 50);
		this.container.addChild(this.statusText);
	}

	private generateDemoPlayers(): void {
		const names = [
			getPlayerDisplayName() || "You",
			"AlphaBot",
			"BravoCPU",
			"CharlieAI",
			"DeltaNet",
			"EchoPro",
			"FoxGamer",
			"GolfStar",
			"HotelOne",
			"IndiaX",
			"JulietK",
			"KiloMaster",
			"LimaBoss",
			"MikeRush",
			"NovQ",
			"OscarZ",
		];
		this.players = names.slice(0, 16).map((name, i) => ({
			id: i,
			name,
			elo: 800 + Math.floor(Math.random() * 400),
		}));
	}

	// ============================================================
	// Rendering
	// ============================================================

	private renderActions(): void {
		this.actionContainer.removeChildren();

		const buttons = [
			{ label: "4 Player", size: 4 },
			{ label: "8 Player", size: 8 },
			{ label: "16 Player", size: 16 },
			{ label: "Simulate", size: 0 },
		];

		const btnW = 100;
		const btnH = 34;
		const startX = this.width / 2 - (buttons.length * (btnW + 8)) / 2;
		const y = this.height - 85;

		for (let i = 0; i < buttons.length; i++) {
			const btn = buttons[i];
			const container = new Container();
			const bg = new Graphics();
			bg.roundRect(0, 0, btnW, btnH, 6);
			bg.fill(0x1a2a4a);
			bg.stroke({ color: 0x4a6a8a, width: 1 });
			container.addChild(bg);

			const text = new Text({
				text: btn.label,
				style: new TextStyle({
					fill: 0xccddff,
					fontSize: 12,
					fontWeight: "bold",
				}),
			});
			text.anchor.set(0.5);
			text.position.set(btnW / 2, btnH / 2);
			container.addChild(text);

			container.eventMode = "static";
			container.cursor = "pointer";
			container.position.set(startX + i * (btnW + 8), y);

			container.on("pointerdown", () => {
				if (btn.size > 0) {
					this.createTournament(btn.size);
				} else {
					this.simulateTournament();
				}
			});

			this.actionContainer.addChild(container);
		}
	}

	private renderBracket(): void {
		this.bracketContainer.removeChildren();
		if (!this.currentTournament) return;

		const tournament = this.currentTournament;
		const rounds = tournament.totalRounds + 1;

		// Calculate bracket layout
		const bracketX = 40;
		const bracketY = 75;
		const bracketW = this.width - 80;
		const bracketH = this.height - 170;
		const roundWidth = bracketW / rounds;

		// Group matches by round
		const roundMatches: Map<number, TournamentMatch[]> = new Map();
		for (const match of tournament.matches) {
			if (!roundMatches.has(match.round)) roundMatches.set(match.round, []);
			roundMatches.get(match.round)!.push(match);
		}

		// Round labels
		const roundNames = [
			"Round 1",
			"Quarterfinal",
			"Semifinal",
			"Final",
			"Grand Final",
		];
		for (let r = 0; r < rounds; r++) {
			const rx = bracketX + r * roundWidth;
			const label = new Text({
				text: roundNames[r] || `Round ${r + 1}`,
				style: new TextStyle({
					fill: 0x4466aa,
					fontSize: 11,
					fontWeight: "bold",
				}),
			});
			label.anchor.set(0.5);
			label.position.set(rx + roundWidth / 2, bracketY);
			this.bracketContainer.addChild(label);
		}

		// Render each round's matches
		for (const [round, matches] of roundMatches) {
			const rx = bracketX + round * roundWidth;
			const matchCount = matches.length;
			const matchH = Math.min(50, (bracketH - 30) / matchCount);

			for (let i = 0; i < matches.length; i++) {
				const match = matches[i];
				const my = bracketY + 20 + i * (matchH + 4);
				this.renderMatch(rx + 8, my, roundWidth - 16, matchH - 4, match);
			}
		}

		// Champion display
		if (!tournament.isActive) {
			const championId = this.tournamentManager.getChampion(
				tournament.tournamentID,
			);
			const champion = this.players.find((p) => p.id === championId);
			if (champion) {
				const crown = new Text({
					text: `🏆 CHAMPION: ${champion.name} 🏆`,
					style: new TextStyle({
						fill: 0xffdd00,
						fontSize: 22,
						fontWeight: "bold",
						stroke: { color: 0x000000, width: 3 },
					}),
				});
				crown.anchor.set(0.5);
				crown.position.set(this.width / 2, this.height - 110);
				this.bracketContainer.addChild(crown);
			}
		}
	}

	private renderMatch(
		x: number,
		y: number,
		w: number,
		h: number,
		match: TournamentMatch,
	): void {
		const bg = new Graphics();
		bg.roundRect(x, y, w, h, 4);

		if (match.isFinal && match.isComplete) {
			bg.fill(0x332200);
			bg.stroke({ color: 0xffaa00, width: 2 });
		} else if (match.isComplete) {
			bg.fill(0x0a1a0a);
			bg.stroke({ color: 0x2a4a2a, width: 1 });
		} else if (match.player1ID >= 0 && match.player2ID >= 0) {
			bg.fill(0x0a0a2a);
			bg.stroke({ color: 0x4488ff, width: 1 });
		} else {
			bg.fill(0x0a0a1a);
			bg.stroke({ color: 0x223344, width: 1 });
		}
		this.bracketContainer.addChild(bg);

		const p1Name =
			this.players.find((p) => p.id === match.player1ID)?.name ?? "---";
		const p2Name =
			this.players.find((p) => p.id === match.player2ID)?.name ?? "---";

		const isP1Winner = match.isComplete && match.winnerID === match.player1ID;
		const isP2Winner = match.isComplete && match.winnerID === match.player2ID;

		// Player 1
		const p1Style = new TextStyle({
			fill: isP1Winner ? 0x44ff44 : 0xaabbcc,
			fontSize: 10,
			fontWeight: isP1Winner ? "bold" : "normal",
		});
		const p1 = new Text({
			text: (isP1Winner ? "▸ " : "  ") + p1Name,
			style: p1Style,
		});
		p1.position.set(x + 4, y + 2);
		this.bracketContainer.addChild(p1);

		// Player 2
		const p2Style = new TextStyle({
			fill: isP2Winner ? 0x44ff44 : 0x889999,
			fontSize: 10,
			fontWeight: isP2Winner ? "bold" : "normal",
		});
		const p2 = new Text({
			text: (isP2Winner ? "▸ " : "  ") + p2Name,
			style: p2Style,
		});
		p2.position.set(x + 4, y + h / 2 + 1);
		this.bracketContainer.addChild(p2);

		// Match ID label
		const idStyle = new TextStyle({ fill: 0x334455, fontSize: 8 });
		const idText = new Text({ text: match.matchID, style: idStyle });
		idText.anchor.set(1, 0);
		idText.position.set(x + w - 4, y + 2);
		this.bracketContainer.addChild(idText);
	}

	// ============================================================
	// Tournament Logic
	// ============================================================

	private createTournament(size: number): void {
		if (this.simInterval) {
			clearInterval(this.simInterval);
			this.simInterval = null;
		}

		const playerIds = this.players.slice(0, size).map((p) => p.id);
		const names = new Map(this.players.map((p) => [p.id, p.name]));

		this.currentTournament = this.tournamentManager.createBracket(
			"arena",
			playerIds,
			names,
		);
		this.renderBracket();
		this.createStatus(
			`${size}-player tournament created! ${this.currentTournament.totalRounds + 1} rounds.`,
			0x44ff88,
		);

		if (AudioManager.isLoaded("menu_select")) {
			AudioManager.playSound("menu_select", { volume: 0.5 });
		}
	}

	private simulateTournament(): void {
		if (!this.currentTournament) {
			this.createStatus("Create a tournament first!", 0xff6644);
			return;
		}

		if (this.simInterval) {
			clearInterval(this.simInterval);
		}

		this.createStatus("Simulating matches...", 0xffaa44);

		let matchIndex = 0;
		const incompleteMatches = this.currentTournament.matches.filter(
			(m) => !m.isComplete,
		);

		this.simInterval = setInterval(() => {
			if (matchIndex >= incompleteMatches.length) {
				clearInterval(this.simInterval!);
				this.simInterval = null;

				if (!this.currentTournament!.isActive) {
					const champion = this.tournamentManager.getChampion(
						this.currentTournament!.tournamentID,
					);
					const name =
						this.players.find((p) => p.id === champion)?.name ?? "Unknown";
					this.createStatus(`🏆 ${name} wins the tournament! 🏆`, 0xffdd00);
					if (AudioManager.isLoaded("tetris")) {
						AudioManager.playSound("tetris", { volume: 0.5 });
					}
				}
				return;
			}

			const match = incompleteMatches[matchIndex];
			if (match.player1ID < 0 || match.player2ID < 0) {
				matchIndex++;
				return;
			}

			// Simulate: higher ELO wins more often
			const p1 = this.players.find((p) => p.id === match.player1ID);
			const p2 = this.players.find((p) => p.id === match.player2ID);
			const p1Chance = p1 && p2 ? p1.elo / (p1.elo + p2.elo) : 0.5;
			const winner =
				Math.random() < p1Chance ? match.player1ID : match.player2ID;

			this.tournamentManager.reportMatchWinner(
				this.currentTournament!.tournamentID,
				match.matchID,
				winner,
			);
			this.renderBracket();
			this.createStatus(
				`${this.players.find((p) => p.id === winner)?.name} wins match ${match.matchID}!`,
				0x88ff88,
			);

			matchIndex++;
		}, 600);
	}

	// ============================================================
	// Input
	// ============================================================

	protected onUpdate(_dt: number): void {
		if (InputManager.isCancelPressed()) {
			if (this.simInterval) {
				clearInterval(this.simInterval);
				this.simInterval = null;
			}
			StateManager.pop();
		}
	}

	protected async destroy(): Promise<void> {
		if (this.simInterval) {
			clearInterval(this.simInterval);
			this.simInterval = null;
		}
	}
}
