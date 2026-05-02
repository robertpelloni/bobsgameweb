/**
 * BossRushScene — wave-based boss rush mode with escalating difficulty.
 *
 * Features:
 * - 5 waves of increasingly powerful bosses
 * - Between-wave healing/items
 * - Score multiplier for speed/damage
 * - Unique boss mechanics per wave
 * - Boss health scaling with wave number
 *
 * Usage:
 *   const scene = new BossRushScene({ name: "boss-rush", app });
 */
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { Scene, type SceneConfig } from "../state/Scene";
import { StateManager } from "../state/StateManager";
import { InputManager } from "../input/InputManager";

interface BossData {
	name: string;
	hp: number;
	attack: number;
	defense: number;
	speed: number;
	special: string;
	color: number;
	icon: string;
}

const BOSSES: BossData[] = [
	{ name: "Forest Guardian", hp: 150, attack: 12, defense: 6, speed: 3, special: "Root Bind", color: 0x22aa44, icon: "🌳" },
	{ name: "Tide Leviathan", hp: 250, attack: 18, defense: 8, speed: 4, special: "Tidal Wave", color: 0x2266cc, icon: "🐙" },
	{ name: "Storm Titan", hp: 350, attack: 22, defense: 10, speed: 5, special: "Thunder Strike", color: 0xccaa44, icon: "⚡" },
	{ name: "Shadow Lord", hp: 450, attack: 28, defense: 12, speed: 6, special: "Dark Nova", color: 0x6622aa, icon: "👤" },
	{ name: "Ancient Dragon", hp: 600, attack: 35, defense: 15, speed: 4, special: "Dragon Breath", color: 0xff2222, icon: "🐉" },
];

type RushState = "lobby" | "prep" | "fight" | "victory" | "defeat" | "complete";

export class BossRushScene extends Scene {
	private state: RushState = "lobby";
	private wave = 0;
	private playerHP = 100;
	private playerMaxHP = 100;
	private playerAttack = 15;
	private playerDefense = 7;
	private bossHP = 0;
	private bossMaxHP = 0;
	private score = 0;
	private totalDamageDealt = 0;
	private comboCount = 0;
	private timeInWave = 0;
	private totalTime = 0;
	private battleLog: string[] = [];
	private time = 0;

	private uiContainer!: Container;

	constructor(config: SceneConfig) {
		super(config);
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
				color: (Math.floor(0x14 + ratio * 0x08) << 16) |
					(Math.floor(0x04 + ratio * 0x04) << 8) |
					Math.floor(0x04 + ratio * 0x04),
			});
		}
		this.container.addChild(bg);
	}

	private createUI(): void {
		this.uiContainer = new Container();
		this.container.addChild(this.uiContainer);
	}

	private createFooter(): void {
		const footer = new Text({
			text: "SPACE: Attack  |  1: Heavy  |  2: Defend  |  3: Heal  |  ESC: Back",
			style: new TextStyle({ fill: 0x445566, fontSize: 9 },
			),
		});
		footer.anchor.set(0.5);
		footer.position.set(this.width / 2, this.height - 5);
		this.container.addChild(footer);
	}

	private refreshUI(): void {
		this.uiContainer.removeChildren();

		switch (this.state) {
			case "lobby": this.renderLobby(); break;
			case "prep": this.renderPrep(); break;
			case "fight": this.renderFight(); break;
			case "victory": this.renderWaveVictory(); break;
			case "defeat": this.renderDefeat(); break;
			case "complete": this.renderComplete(); break;
		}
	}

	private renderLobby(): void {
		const title = new Text({
			text: "💀 BOSS RUSH",
			style: new TextStyle({ fill: 0xff4444, fontSize: 20, fontWeight: "bold", fontFamily: "Arial Black, Arial, sans-serif" }),
		});
		title.anchor.set(0.5, 0);
		title.position.set(this.width / 2, 10);
		this.uiContainer.addChild(title);

		const desc = new Text({
			text: `5 waves of legendary bosses!\nBosses get stronger each wave.\nSurvive them all for the ultimate prize.\n\nBest Score: ${this.score}\n\nPress SPACE to begin!`,
			style: new TextStyle({ fill: 0x88aacc, fontSize: 11, align: "center", lineHeight: 18 },
			),
		});
		desc.anchor.set(0.5);
		desc.position.set(this.width / 2, this.height / 2);
		this.uiContainer.addChild(desc);
	}

	private renderPrep(): void {
		const boss = BOSSES[this.wave]!;
		const title = new Text({
			text: `Wave ${this.wave + 1}/5`,
			style: new TextStyle({ fill: 0xffcc44, fontSize: 16, fontWeight: "bold" },
			),
		});
		title.anchor.set(0.5);
		title.position.set(this.width / 2, 10);
		this.uiContainer.addChild(title);

		const bossName = new Text({
			text: `${boss.icon} ${boss.name}`,
			style: new TextStyle({ fill: boss.color, fontSize: 14, fontWeight: "bold" },
			),
		});
		bossName.anchor.set(0.5);
		bossName.position.set(this.width / 2, 40);
		this.uiContainer.addChild(bossName);

		const stats = new Text({
			text: `HP:${boss.hp} ATK:${boss.attack} DEF:${boss.defense}\nSpecial: ${boss.special}\n\nYour HP: ${this.playerHP}/${this.playerMaxHP}\n\nPress SPACE to fight!`,
			style: new TextStyle({ fill: 0x88aacc, fontSize: 10, align: "center", lineHeight: 16 },
			),
		});
		stats.anchor.set(0.5);
		stats.position.set(this.width / 2, this.height / 2);
		this.uiContainer.addChild(stats);
	}

	private renderFight(): void {
		const boss = BOSSES[this.wave]!;

		// Wave header
		const header = new Text({
			text: `Wave ${this.wave + 1} — ${boss.icon} ${boss.name}`,
			style: new TextStyle({ fill: boss.color, fontSize: 12, fontWeight: "bold" },
			),
		});
		header.anchor.set(0.5);
		header.position.set(this.width / 2, 5);
		this.uiContainer.addChild(header);

		// Boss HP bar
		const bossBarY = 22;
		const bossHpRatio = Math.max(0, this.bossHP / this.bossMaxHP);
		const bossBar = new Graphics();
		bossBar.roundRect(10, bossBarY, this.width - 20, 10, 3);
		bossBar.fill(0x1a0808);
		bossBar.roundRect(10, bossBarY, (this.width - 20) * bossHpRatio, 10, 3);
		bossBar.fill(bossHpRatio > 0.5 ? 0xff4444 : bossHpRatio > 0.25 ? 0xff8844 : 0xffcc44);
		this.uiContainer.addChild(bossBar);

		const bossHpText = new Text({
			text: `${boss.name}: ${Math.max(0, this.bossHP)}/${this.bossMaxHP}`,
			style: new TextStyle({ fill: 0xff6644, fontSize: 9 },
			),
		});
		bossHpText.anchor.set(0.5);
		bossHpText.position.set(this.width / 2, bossBarY + 14);
		this.uiContainer.addChild(bossHpText);

		// Player HP bar
		const playerBarY = 42;
		const pHpRatio = Math.max(0, this.playerHP / this.playerMaxHP);
		const playerBar = new Graphics();
		playerBar.roundRect(10, playerBarY, this.width - 20, 8, 3);
		playerBar.fill(0x081a08);
		playerBar.roundRect(10, playerBarY, (this.width - 20) * pHpRatio, 8, 3);
		playerBar.fill(pHpRatio > 0.5 ? 0x44ff88 : pHpRatio > 0.25 ? 0xffcc44 : 0xff4444);
		this.uiContainer.addChild(playerBar);

		const pHpText = new Text({
			text: `Hero: ${Math.max(0, this.playerHP)}/${this.playerMaxHP}`,
			style: new TextStyle({ fill: 0x44ff88, fontSize: 9 },
			),
		});
		pHpText.anchor.set(0.5);
		pHpText.position.set(this.width / 2, playerBarY + 12);
		this.uiContainer.addChild(pHpText);

		// Battle log (last 8 lines)
		const logLines = this.battleLog.slice(-8).join("\n");
		const logText = new Text({
			text: logLines,
			style: new TextStyle({ fill: 0x667788, fontSize: 8, lineHeight: 12 },
			),
		});
		logText.position.set(8, 68);
		this.uiContainer.addChild(logText);

		// Score + combo
		const scoreText = new Text({
			text: `Score: ${this.score}  |  Combo: x${this.comboCount}  |  Time: ${this.timeInWave.toFixed(1)}s`,
			style: new TextStyle({ fill: 0xffcc44, fontSize: 9 },
			),
		});
		scoreText.anchor.set(0.5);
		scoreText.position.set(this.width / 2, this.height - 20);
		this.uiContainer.addChild(scoreText);
	}

	private renderWaveVictory(): void {
		const text = new Text({
			text: `🏆 WAVE ${this.wave + 1} COMPLETE!\n\nScore: ${this.score}\nCombo: x${this.comboCount}\nTime: ${this.timeInWave.toFixed(1)}s\n\n+50 HP restored\n\nPress SPACE for next wave`,
			style: new TextStyle({ fill: 0x44ff88, fontSize: 12, align: "center", lineHeight: 18 },
			),
		});
		text.anchor.set(0.5);
		text.position.set(this.width / 2, this.height / 2);
		this.uiContainer.addChild(text);
	}

	private renderDefeat(): void {
		const boss = BOSSES[this.wave]!;
		const text = new Text({
			text: `💀 DEFEATED!\n\nFell to ${boss.name} (Wave ${this.wave + 1})\n\nFinal Score: ${this.score}\nTotal Damage: ${this.totalDamageDealt}\nTotal Time: ${this.totalTime.toFixed(1)}s\n\nPress SPACE to retry`,
			style: new TextStyle({ fill: 0xff4444, fontSize: 12, align: "center", lineHeight: 18 },
			),
		});
		text.anchor.set(0.5);
		text.position.set(this.width / 2, this.height / 2);
		this.uiContainer.addChild(text);
	}

	private renderComplete(): void {
		const text = new Text({
			text: `👑 BOSS RUSH COMPLETE!\n\nAll 5 bosses defeated!\n\nFinal Score: ${this.score}\nTotal Damage: ${this.totalDamageDealt}\nTotal Time: ${this.totalTime.toFixed(1)}s\n\nPress SPACE to return`,
			style: new TextStyle({ fill: 0xffaa00, fontSize: 14, fontWeight: "bold", align: "center", lineHeight: 20 },
			),
		});
		text.anchor.set(0.5);
		text.position.set(this.width / 2, this.height / 2);
		this.uiContainer.addChild(text);
	}

	private startWave(): void {
		const boss = BOSSES[this.wave]!;
		const scale = 1 + this.wave * 0.15;
		this.bossHP = Math.floor(boss.hp * scale);
		this.bossMaxHP = this.bossHP;
		this.timeInWave = 0;
		this.battleLog = [];
		this.state = "fight";
	}

	private playerAttackBoss(type: "normal" | "heavy" | "defend" | "heal"): void {
		const boss = BOSSES[this.wave]!;

		switch (type) {
			case "normal": {
				const dmg = Math.max(1, Math.floor(this.playerAttack * (0.9 + Math.random() * 0.2) - boss.defense * 0.3));
				this.bossHP -= dmg;
				this.totalDamageDealt += dmg;
				this.comboCount++;
				this.score += dmg * (1 + Math.floor(this.comboCount / 5));
				this.battleLog.push(`You attack for ${dmg} damage! (x${this.comboCount})`);
				break;
			}
			case "heavy": {
				const dmg = Math.max(1, Math.floor(this.playerAttack * 1.8 * (0.8 + Math.random() * 0.4) - boss.defense * 0.2));
				this.bossHP -= dmg;
				this.totalDamageDealt += dmg;
				this.comboCount++;
				this.score += dmg * 2;
				this.battleLog.push(`Heavy strike for ${dmg}!`);
				break;
			}
			case "defend": {
				this.battleLog.push("You brace for impact. (50% damage reduction)");
				// Boss attacks at half damage
				const bossDmg = Math.floor((boss.attack - this.playerDefense * 0.5) * 0.5);
				this.playerHP -= Math.max(0, bossDmg);
				this.battleLog.push(`${boss.name} attacks for ${Math.max(0, bossDmg)} (reduced)`);
				this.refreshUI();
				return;
			}
			case "heal": {
				const heal = 20 + Math.floor(Math.random() * 10);
				this.playerHP = Math.min(this.playerMaxHP, this.playerHP + heal);
				this.comboCount = 0;
				this.battleLog.push(`Healed ${heal} HP! (combo reset)`);
				break;
			}
		}

		// Boss counterattack (unless defend)
		if (this.bossHP > 0) {
			if (Math.random() < 0.2 && boss.special) {
				// Special attack
				const spDmg = Math.floor(boss.attack * 1.5 - this.playerDefense * 0.3);
				this.playerHP -= Math.max(1, spDmg);
				this.battleLog.push(`${boss.name} uses ${boss.special} for ${Math.max(1, spDmg)}!`);
			} else {
				const bossDmg = Math.max(1, Math.floor(boss.attack - this.playerDefense * 0.5));
				this.playerHP -= bossDmg;
				this.battleLog.push(`${boss.name} attacks for ${bossDmg}`);
			}
		}

		// Check outcomes
		if (this.bossHP <= 0) {
			this.bossHP = 0;
			this.score += Math.floor(1000 / Math.max(1, this.timeInWave));
			if (this.wave >= 4) {
				this.state = "complete";
			} else {
				this.state = "victory";
			}
		} else if (this.playerHP <= 0) {
			this.playerHP = 0;
			this.state = "defeat";
		}
	}

	protected onUpdate(dt: number): void {
		this.time += dt;
		const prevState = this.state;

		switch (this.state) {
			case "lobby":
				if (InputManager.isActionPressed()) {
					this.wave = 0;
					this.playerHP = this.playerMaxHP;
					this.score = 0;
					this.totalDamageDealt = 0;
					this.comboCount = 0;
					this.totalTime = 0;
					this.state = "prep";
				}
				break;

			case "prep":
				if (InputManager.isActionPressed()) {
					this.startWave();
				}
				break;

			case "fight":
				this.timeInWave += dt;
				this.totalTime += dt;

				if (InputManager.isActionPressed()) {
					this.playerAttackBoss("normal");
				}
				if (InputManager.isKeyPressed("Digit1")) {
					this.playerAttackBoss("heavy");
				}
				if (InputManager.isKeyPressed("Digit2")) {
					this.playerAttackBoss("defend");
				}
				if (InputManager.isKeyPressed("Digit3")) {
					this.playerAttackBoss("heal");
				}
				break;

			case "victory":
				if (InputManager.isActionPressed()) {
					this.wave++;
					this.playerHP = Math.min(this.playerMaxHP, this.playerHP + 50);
					this.state = "prep";
				}
				break;

			case "defeat":
				if (InputManager.isActionPressed()) {
					this.state = "lobby";
				}
				break;

			case "complete":
				if (InputManager.isActionPressed()) {
					this.state = "lobby";
				}
				break;
		}

		if (InputManager.isCancelPressed()) {
			StateManager.pop();
		}

		if (prevState !== this.state || this.state === "fight") {
			this.refreshUI();
		}
	}
}
