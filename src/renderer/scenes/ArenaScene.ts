/**
 * ArenaScene — PvP tournament battle arena.
 *
 * Features:
 * - Tournament bracket (8 fighters)
 * - Round-based combat with AI opponents
 * - Betting system (wager gold on matches)
 * - Arena rankings and titles
 * - Battle animations (attack, defend, special)
 * - Crowd reaction meter
 *
 * Usage:
 *   const scene = new ArenaScene({ name: "arena", app });
 */
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { Scene, type SceneConfig } from "../state/Scene";
import { StateManager } from "../state/StateManager";
import { InputManager } from "../input/InputManager";

// ============================================================
// Fighter Data
// ============================================================

interface Fighter {
	id: string;
	name: string;
	hp: number;
	maxHp: number;
	attack: number;
	defense: number;
	speed: number;
	special: string;
	color: number;
	title: string;
}

interface ArenaMatch {
	round: number;
	fighter1: Fighter;
	fighter2: Fighter;
	winner: Fighter | null;
	log: string[];
}

const AI_FIGHTERS: Fighter[] = [
	{ id: "gladiator", name: "Iron Gladiator", hp: 80, maxHp: 80, attack: 12, defense: 8, speed: 5, special: "Shield Bash", color: 0xcc4444, title: "The Unbreakable" },
	{ id: "assassin", name: "Shadow Assassin", hp: 50, maxHp: 50, attack: 18, defense: 4, speed: 10, special: "Backstab", color: 0x444488, title: "The Unseen" },
	{ id: "mage", name: "Arcane Mage", hp: 45, maxHp: 45, attack: 20, defense: 3, speed: 7, special: "Fireball", color: 0x8844aa, title: "The Brilliant" },
	{ id: "knight", name: "Golden Knight", hp: 90, maxHp: 90, attack: 10, defense: 12, speed: 4, special: "Holy Strike", color: 0xccaa44, title: "The Righteous" },
	{ id: "berserker", name: "Blood Berserker", hp: 70, maxHp: 70, attack: 22, defense: 2, speed: 6, special: "Frenzy", color: 0xaa2222, title: "The Furious" },
	{ id: "monk", name: "Stone Monk", hp: 65, maxHp: 65, attack: 14, defense: 10, speed: 8, special: "Palm Strike", color: 0x44aa66, title: "The Serene" },
	{ id: "ranger", name: "Storm Ranger", hp: 55, maxHp: 55, attack: 16, defense: 6, speed: 9, special: "Arrow Storm", color: 0x44aacc, title: "The Swift" },
	{ id: "necro", name: "Bone Necromancer", hp: 60, maxHp: 60, attack: 17, defense: 5, speed: 6, special: "Soul Drain", color: 0x66aa44, title: "The Deathless" },
];

type ArenaState = "lobby" | "bracket" | "pre_battle" | "battle" | "result" | "champion";
type BattleAction = "attack" | "defend" | "special";

// ============================================================
// Scene
// ============================================================

export class ArenaScene extends Scene {
	private state: ArenaState = "lobby";
	private player: Fighter;
	private bracket: Fighter[][] = [];
	private currentRound = 0;
	private currentMatch = 0;
	private matches: ArenaMatch[] = [];
	private battleLog: string[] = [];
	private playerAction: BattleAction = "attack";
	private enemyAction: BattleAction = "attack";
	private crowdMeter = 50; // 0-100
	private betAmount = 0;
	private totalWinnings = 0;
	private wins = 0;
	private losses = 0;
	private time = 0;
	private battleTimer = 0;

	private uiContainer!: Container;
	private statusText!: Text;
	private detailText!: Text;

	constructor(config: SceneConfig) {
		super(config);
		this.player = {
			id: "player",
			name: "Hero",
			hp: 75, maxHp: 75,
			attack: 15, defense: 7, speed: 7,
			special: "Hero Strike",
			color: 0x44ff88,
			title: "The Challenger",
		};
	}

	public async create(): Promise<void> {
		this.createBackground();
		this.createUI();
		this.createFooter();
		this.refreshUI();
	}

	private createBackground(): void {
		const bg = new Graphics();
		for (let i = 0; i < 20; i++) {
			const ratio = i / 20;
			bg.rect(0, (this.height / 20) * i, this.width, this.height / 20 + 1);
			bg.fill({
				color: (Math.floor(0x10 + ratio * 0x0a) << 16) |
					(Math.floor(0x08 + ratio * 0x06) << 8) |
					Math.floor(0x08 + ratio * 0x06),
			});
		}
		this.container.addChild(bg);
	}

	private createUI(): void {
		this.uiContainer = new Container();
		this.container.addChild(this.uiContainer);

		this.statusText = new Text({
			text: "",
			style: new TextStyle({ fill: 0xffcc44, fontSize: 12, fontWeight: "bold" }),
		});
		this.statusText.anchor.set(0.5);
		this.statusText.position.set(this.width / 2, 10);
		this.uiContainer.addChild(this.statusText);

		this.detailText = new Text({
			text: "",
			style: new TextStyle({ fill: 0xaabbcc, fontSize: 10, align: "center" }),
		});
		this.detailText.anchor.set(0.5);
		this.detailText.position.set(this.width / 2, this.height / 2 + 40);
		this.uiContainer.addChild(this.detailText);
	}

	private createFooter(): void {
		const footer = new Text({
			text: "SPACE: Confirm  |  1: Attack  |  2: Defend  |  3: Special  |  ESC: Back",
			style: new TextStyle({ fill: 0x445566, fontSize: 9 },
			),
		});
		footer.anchor.set(0.5);
		footer.position.set(this.width / 2, this.height - 5);
		this.container.addChild(footer);
	}

	private generateBracket(): void {
		// Shuffle AI fighters + player, make 8-fighter bracket
		const shuffled = [...AI_FIGHTERS].sort(() => Math.random() - 0.5).slice(0, 7);
		const allFighters = [this.player, ...shuffled].sort(() => Math.random() - 0.5);
		this.bracket = [allFighters];
		this.currentRound = 0;
		this.currentMatch = 0;
		this.matches = [];

		// Generate round 1 matches
		for (let i = 0; i < allFighters.length; i += 2) {
			this.matches.push({
				round: 0,
				fighter1: allFighters[i]!,
				fighter2: allFighters[i + 1] ?? allFighters[i]!,
				winner: null,
				log: [],
			});
		}
	}

	private resolveAction(attacker: Fighter, defender: Fighter, action: BattleAction): { damage: number; healed: number; msg: string } {
		switch (action) {
			case "attack": {
				const baseDmg = attacker.attack - defender.defense * 0.5;
				const damage = Math.max(1, Math.floor(baseDmg * (0.8 + Math.random() * 0.4)));
				return { damage, healed: 0, msg: `${attacker.name} attacks for ${damage} damage!` };
			}
			case "defend": {
				return { damage: 0, healed: 0, msg: `${attacker.name} takes a defensive stance.` };
			}
			case "special": {
				const spDmg = Math.floor(attacker.attack * 1.5 - defender.defense * 0.3);
				const damage = Math.max(5, Math.floor(spDmg * (0.9 + Math.random() * 0.3)));
				const heal = Math.floor(damage * 0.2);
				return { damage, healed: heal, msg: `${attacker.name} uses ${attacker.special} for ${damage} damage!${heal > 0 ? ` (+${heal} HP)` : ""}` };
			}
		}
	}

	private simulateAIFight(f1: Fighter, f2: Fighter): Fighter {
		const a = { ...f1, hp: f1.maxHp };
		const b = { ...f2, hp: f2.maxHp };
		const actions: BattleAction[] = ["attack", "defend", "special"];
		let turn = 0;

		while (a.hp > 0 && b.hp > 0 && turn < 30) {
			turn++;
			const aAction = actions[Math.floor(Math.random() * 3)]!;
			const bAction = actions[Math.floor(Math.random() * 3)]!;

			// Speed determines who goes first
			if (a.speed >= b.speed) {
				const aResult = this.resolveAction(a, b, aAction);
				b.hp -= a.damage;
				a.hp += aResult.healed;
				if (b.hp <= 0) return f1;
			}

			const bResult = this.resolveAction(b, a, bAction);
			a.hp -= b.damage;
			b.hp += bResult.healed;
			if (a.hp <= 0) return f2;

			if (a.speed < b.speed) {
				const aResult = this.resolveAction(a, b, aAction);
				b.hp -= a.damage;
				a.hp += aResult.healed;
				if (b.hp <= 0) return f1;
			}
		}

		return a.hp >= b.hp ? f1 : f2;
	}

	private refreshUI(): void {
		// Remove old dynamic elements
		const childrenToRemove = this.uiContainer.children.filter(c => c !== this.statusText && c !== this.detailText);
		for (const child of childrenToRemove) this.uiContainer.removeChild(child);

		switch (this.state) {
			case "lobby":
				this.renderLobby();
				break;
			case "bracket":
				this.renderBracket();
				break;
			case "pre_battle":
				this.renderPreBattle();
				break;
			case "battle":
				this.renderBattle();
				break;
			case "result":
				this.renderResult();
				break;
			case "champion":
				this.renderChampion();
				break;
		}
	}

	private renderLobby(): void {
		this.statusText.text = "⚔ ARENA";
		this.detailText.text = `Wins: ${this.wins} | Losses: ${this.losses} | Winnings: ${this.totalWinnings}g\n\nPress SPACE to enter tournament!`;
	}

	private renderBracket(): void {
		this.statusText.text = `Tournament — Round ${this.currentRound + 1}`;

		const y = 28;
		const matchH = 22;

		for (let i = 0; i < this.matches.length; i++) {
			const match = this.matches[i]!;
			const my = y + i * (matchH + 3);
			const isNext = i === this.currentMatch;

			const bg = new Graphics();
			bg.roundRect(10, my, this.width - 20, matchH, 3);
			bg.fill({ color: isNext ? 0x1a2030 : 0x0a0e16, alpha: 0.9 });
			bg.stroke({ color: isNext ? 0xffcc44 : 0x1a2030, width: isNext ? 2 : 1 });
			this.uiContainer.addChild(bg);

			const f1Name = match.fighter1.name;
			const f2Name = match.fighter2.name;
			const result = match.winner ? ` → ${match.winner.name} wins!` : " vs ";
			const color1 = match.winner === match.fighter1 ? 0x44ff88 : match.winner ? 0x666666 : 0xffffff;
			const color2 = match.winner === match.fighter2 ? 0x44ff88 : match.winner ? 0x666666 : 0xffffff;

			const text = new Text({
				text: `${f1Name}  ${result}  ${f2Name}`,
				style: new TextStyle({ fill: isNext ? [color1, 0xffcc44, color2] as any : 0x667788, fontSize: 9 },
				),
			});
			text.position.set(16, my + 5);
			this.uiContainer.addChild(text);
		}

		this.detailText.text = `Match ${this.currentMatch + 1}/${this.matches.length}\nPress SPACE to continue`;
	}

	private renderPreBattle(): void {
		const match = this.matches[this.currentMatch]!;
		this.statusText.text = `⚔ ${match.fighter1.name} vs ${match.fighter2.name}`;

		const y = 35;
		[match.fighter1, match.fighter2].forEach((f, i) => {
			const fx = i === 0 ? 10 : this.width / 2 + 5;
			const fw = this.width / 2 - 15;

			const card = new Graphics();
			card.roundRect(fx, y, fw, 70, 4);
			card.fill({ color: 0x0c1018, alpha: 0.95 });
			card.stroke({ color: f.color, width: 2 });
			this.uiContainer.addChild(card);

			const name = new Text({
				text: f.name,
				style: new TextStyle({ fill: 0xffffff, fontSize: 11, fontWeight: "bold" }),
			});
			name.position.set(fx + 6, y + 4);
			this.uiContainer.addChild(name);

			const stats = new Text({
				text: `"${f.title}"\nHP:${f.maxHp} ATK:${f.attack} DEF:${f.defense}\nSPD:${f.speed} Special:${f.special}`,
				style: new TextStyle({ fill: 0x88aacc, fontSize: 9 },
				),
			});
			stats.position.set(fx + 6, y + 18);
			this.uiContainer.addChild(stats);
		});

		this.detailText.text = "Choose your action!\n1:Attack  2:Defend  3:Special";
		this.detailText.position.set(this.width / 2, this.height / 2 + 90);
	}

	private renderBattle(): void {
		const match = this.matches[this.currentMatch]!;
		const f1 = match.fighter1;
		const f2 = match.fighter2;

		this.statusText.text = `⚔ BATTLE! Round ${this.battleTimer.toFixed(0)}s`;

		// Fighter displays with HP bars
		const y = 30;
		[{ f: f1, x: 10 }, { f: f2, x: this.width / 2 + 5 }].forEach(({ f, x }) => {
			const w = this.width / 2 - 15;

			const card = new Graphics();
			card.roundRect(x, y, w, 50, 4);
			card.fill({ color: 0x0c1018, alpha: 0.9 });
			card.stroke({ color: f.color, width: 1 });
			this.uiContainer.addChild(card);

			// HP bar
			const hpRatio = f.hp / f.maxHp;
			const hpColor = hpRatio > 0.5 ? 0x44ff88 : hpRatio > 0.25 ? 0xffcc44 : 0xff4444;
			card.rect(x + 4, y + 30, (w - 8) * hpRatio, 6);
			card.fill(hpColor);

			const name = new Text({
				text: `${f.name} — ${f.hp}/${f.maxHp}`,
				style: new TextStyle({ fill: 0xffffff, fontSize: 10 },
				),
			});
			name.position.set(x + 4, y + 4);
			this.uiContainer.addChild(name);

			const hpLabel = new Text({
				text: `HP: ${Math.max(0, f.hp)}/${f.maxHp}`,
				style: new TextStyle({ fill: hpColor, fontSize: 9 },
				),
			});
			hpLabel.position.set(x + 4, y + 18);
			this.uiContainer.addChild(hpLabel);
		});

		// Battle log (last 6 lines)
		const logText = this.battleLog.slice(-6).join("\n");
		const log = new Text({
			text: logText,
			style: new TextStyle({ fill: 0x667788, fontSize: 8 },
			),
		});
		log.position.set(10, y + 60);
		this.uiContainer.addChild(log);

		// Crowd meter
		const crowd = new Graphics();
		crowd.rect(10, this.height - 40, this.width - 20, 6);
		crowd.fill(0x1a2030);
		crowd.rect(10, this.height - 40, (this.width - 20) * (this.crowdMeter / 100), 6);
		crowd.fill(this.crowdMeter > 70 ? 0xffcc44 : 0x4488aa);
		this.uiContainer.addChild(crowd);

		const crowdLabel = new Text({
			text: `Crowd: ${this.crowdMeter}%`,
			style: new TextStyle({ fill: 0x556677, fontSize: 8 },
			),
		});
		crowdLabel.position.set(10, this.height - 52);
		this.uiContainer.addChild(crowdLabel);

		this.detailText.text = "";
	}

	private renderResult(): void {
		const match = this.matches[this.currentMatch]!;
		if (match.winner) {
			this.statusText.text = `🏆 ${match.winner.name} WINS!`;
			this.statusText.style.fill = match.winner.color;
			const isPlayerWin = match.winner.id === "player";
			this.detailText.text = isPlayerWin ? "You advance to the next round!\nPress SPACE to continue." : "You have been defeated.\nPress SPACE to return to lobby.";
		}
	}

	private renderChampion(): void {
		this.statusText.text = "👑 CHAMPION!";
		this.statusText.style.fill = 0xffaa00;
		this.detailText.text = `You are the Arena Champion!\nTotal Winnings: ${this.totalWinnings}g\nWins: ${this.wins}\nPress SPACE to return.`;
	}

	protected onUpdate(dt: number): void {
		this.time += dt;
		const prevState = this.state;

		switch (this.state) {
			case "lobby":
				if (InputManager.isActionPressed()) {
					this.generateBracket();
					this.state = "bracket";
					this.player.hp = this.player.maxHp;
				}
				break;

			case "bracket":
				if (InputManager.isActionPressed()) {
					const match = this.matches[this.currentMatch];
					if (match && !match.winner) {
						const isPlayerMatch = match.fighter1.id === "player" || match.fighter2.id === "player";
						if (isPlayerMatch) {
							this.state = "pre_battle";
						} else {
							// Simulate AI vs AI
							match.winner = this.simulateAIFight(match.fighter1, match.fighter2);
							this.currentMatch++;
							if (this.currentMatch >= this.matches.length) {
								this.advanceRound();
							}
						}
					} else {
						this.currentMatch++;
						if (this.currentMatch >= this.matches.length) {
							this.advanceRound();
						}
					}
				}
				break;

			case "pre_battle":
				if (InputManager.isKeyPressed("Digit1") || InputManager.isKeyPressed("Numpad1")) this.playerAction = "attack";
				if (InputManager.isKeyPressed("Digit2") || InputManager.isKeyPressed("Numpad2")) this.playerAction = "defend";
				if (InputManager.isKeyPressed("Digit3") || InputManager.isKeyPressed("Numpad3")) this.playerAction = "special";

				if (InputManager.isActionPressed()) {
					this.state = "battle";
					this.battleTimer = 0;
					this.battleLog = [];
					// Reset fighter HP for the match
					const match = this.matches[this.currentMatch]!;
					match.fighter1.hp = match.fighter1.maxHp;
					match.fighter2.hp = match.fighter2.maxHp;
				}
				break;

			case "battle": {
				this.battleTimer += dt;
				const match = this.matches[this.currentMatch]!;
				const isPlayerF1 = match.fighter1.id === "player";
				const player = isPlayerF1 ? match.fighter1 : match.fighter2;
				const enemy = isPlayerF1 ? match.fighter2 : match.fighter1;

				// Enemy AI picks action
				const actions: BattleAction[] = ["attack", "defend", "special"];
				this.enemyAction = actions[Math.floor(Math.random() * 3)]!;

				// Process turn
				if (player.speed >= enemy.speed) {
					const pResult = this.resolveAction(player, enemy, this.playerAction);
					enemy.hp -= pResult.damage;
					player.hp += pResult.healed;
					this.battleLog.push(pResult.msg);
					this.crowdMeter = Math.min(100, this.crowdMeter + (pResult.damage > 10 ? 5 : 2));

					if (enemy.hp <= 0) { this.finishBattle(match, player); break; }

					const eResult = this.resolveAction(enemy, player, this.enemyAction);
					player.hp -= eResult.damage;
					enemy.hp += eResult.healed;
					this.battleLog.push(eResult.msg);

					if (player.hp <= 0) { this.finishBattle(match, enemy); break; }
				} else {
					const eResult = this.resolveAction(enemy, player, this.enemyAction);
					player.hp -= eResult.damage;
					enemy.hp += eResult.healed;
					this.battleLog.push(eResult.msg);

					if (player.hp <= 0) { this.finishBattle(match, enemy); break; }

					const pResult = this.resolveAction(player, enemy, this.playerAction);
					enemy.hp -= pResult.damage;
					player.hp += pResult.healed;
					this.battleLog.push(pResult.msg);
					this.crowdMeter = Math.min(100, this.crowdMeter + (pResult.damage > 10 ? 5 : 2));

					if (enemy.hp <= 0) { this.finishBattle(match, player); break; }
				}

				// Timeout safety
				if (this.battleTimer > 10) {
					const winner = player.hp >= enemy.hp ? player : enemy;
					this.finishBattle(match, winner);
				}

				// Wait for next action
				this.state = "pre_battle";
				break;
			}

			case "result":
				if (InputManager.isActionPressed()) {
					const match = this.matches[this.currentMatch];
					if (match?.winner?.id === "player") {
						this.currentMatch++;
						if (this.currentMatch >= this.matches.length) {
							this.advanceRound();
						} else {
							this.state = "bracket";
						}
					} else {
						this.state = "lobby";
						this.losses++;
						this.statusText.style.fill = 0xffcc44;
					}
				}
				break;

			case "champion":
				if (InputManager.isActionPressed()) {
					this.state = "lobby";
					this.wins++;
					this.totalWinnings += 500;
					this.statusText.style.fill = 0xffcc44;
				}
				break;
		}

		if (InputManager.isCancelPressed()) {
			StateManager.pop();
		}

		if (prevState !== this.state || this.state === "battle") {
			this.refreshUI();
		}
	}

	private finishBattle(match: ArenaMatch, winner: Fighter): void {
		match.winner = winner;
		this.state = "result";

		if (winner.id === "player") {
			this.wins++;
			const reward = 50 + Math.floor(this.crowdMeter * 2);
			this.totalWinnings += reward;
			this.battleLog.push(`🏆 You win! +${reward}g`);
		} else {
			this.battleLog.push(`💀 ${winner.name} wins!`);
		}
	}

	private advanceRound(): void {
		const winners = this.matches.filter(m => m.winner).map(m => m.winner!);

		if (winners.length === 1 && winners[0]!.id === "player") {
			this.state = "champion";
			return;
		}

		if (winners.length <= 1) {
			this.state = "lobby";
			return;
		}

		this.currentRound++;
		this.currentMatch = 0;
		this.matches = [];

		for (let i = 0; i < winners.length; i += 2) {
			if (i + 1 < winners.length) {
				this.matches.push({
					round: this.currentRound,
					fighter1: winners[i]!,
					fighter2: winners[i + 1]!,
					winner: null,
					log: [],
				});
			}
		}

		this.state = "bracket";
	}
}
