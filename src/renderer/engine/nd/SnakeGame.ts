// @ts-nocheck
/**
 * SnakeGame — classic snake game for the nD handheld console.
 *
 * Controls: D-pad to change direction. Eat food to grow.
 * Game over when you hit walls or yourself.
 */
import { MiniGameEngine, type MiniGameConfig, type MiniGameState } from "./MiniGameEngine";
import { Graphics, Text, TextStyle, Container } from "pixi.js";

interface Point { x: number; y: number; }

export class SnakeGame extends MiniGameEngine {
	private snake: Point[] = [];
	private food: Point = { x: 0, y: 0 };
	private direction: Point = { x: 1, y: 0 };
	private nextDirection: Point = { x: 1, y: 0 };
	private gridW = 20;
	private gridH = 16;
	private cellSize: number;
	private moveTimer = 0;
	private moveInterval = 0.15; // Seconds between moves
	private score = 0;
	private highScore = 0;
	private gameState: "playing" | "gameover" = "playing";
	private gridGraphics!: Graphics;
	private scoreText!: Text;
	private overlayText!: Text;
	private foodPulse = 0;

	constructor(config: MiniGameConfig) {
		super(config);
		this.cellSize = Math.min(
			Math.floor(config.width / this.gridW),
			Math.floor(config.height / this.gridH),
		);
	}

	public getName(): string { return "Snake"; }

	public init(): void {
		this.snake = [
			{ x: 10, y: 8 },
			{ x: 9, y: 8 },
			{ x: 8, y: 8 },
		];
		this.direction = { x: 1, y: 0 };
		this.nextDirection = { x: 1, y: 0 };
		this.score = 0;
		this.gameState = "playing";
		this.moveTimer = 0;
		this.spawnFood();

		// Load high score
		try {
			this.highScore = parseInt(localStorage.getItem("nd_snake_high") || "0");
		} catch { this.highScore = 0; }
	}

	public create(container: Container, width: number, height: number): void {
		// Grid background
		this.gridGraphics = new Graphics();
		container.addChild(this.gridGraphics);

		// Score text
		this.scoreText = new Text({
			text: `Score: ${this.score}  Hi: ${this.highScore}`,
			style: new TextStyle({
				fontFamily: "monospace",
				fontSize: 10,
				fill: 0x44ff88,
			}),
		});
		this.scoreText.position.set(2, 0);
		container.addChild(this.scoreText);

		// Game over overlay
		this.overlayText = new Text({
			text: "",
			style: new TextStyle({
				fontFamily: "monospace",
				fontSize: 14,
				fill: 0xff4444,
				fontWeight: "bold",
				align: "center",
			}),
		});
		this.overlayText.anchor.set(0.5);
		this.overlayText.position.set(width / 2, height / 2);
		container.addChild(this.overlayText);
	}

	public update(dt: number, buttons: Set<string>): void {
		// Handle input
		if (buttons.has("up") && this.direction.y !== 1) {
			this.nextDirection = { x: 0, y: -1 };
		}
		if (buttons.has("down") && this.direction.y !== -1) {
			this.nextDirection = { x: 0, y: 1 };
		}
		if (buttons.has("left") && this.direction.x !== 1) {
			this.nextDirection = { x: -1, y: 0 };
		}
		if (buttons.has("right") && this.direction.x !== -1) {
			this.nextDirection = { x: 1, y: 0 };
		}

		// Restart on A button when game over
		if (this.gameState === "gameover" && buttons.has("a")) {
			this.init();
			return;
		}

		if (this.gameState !== "playing") return;

		// Move timer
		this.moveTimer += dt;
		this.foodPulse += dt * 4;

		if (this.moveTimer >= this.moveInterval) {
			this.moveTimer -= this.moveInterval;
			this.direction = { ...this.nextDirection };
			this.moveSnake();
		}
	}

	public render(): void {
		const g = this.gridGraphics;
		g.clear();

		// Background grid
		g.rect(0, 14, this.gridW * this.cellSize, this.gridH * this.cellSize);
		g.fill(0x0a1a0a);
		g.stroke({ color: 0x1a3a1a, width: 1 });

		// Grid lines
		for (let x = 0; x <= this.gridW; x++) {
			g.moveTo(x * this.cellSize, 14);
			g.lineTo(x * this.cellSize, 14 + this.gridH * this.cellSize);
			g.stroke({ color: 0x0f2a0f, width: 0.5 });
		}
		for (let y = 0; y <= this.gridH; y++) {
			g.moveTo(0, 14 + y * this.cellSize);
			g.lineTo(this.gridW * this.cellSize, 14 + y * this.cellSize);
			g.stroke({ color: 0x0f2a0f, width: 0.5 });
		}

		// Snake body
		for (let i = 0; i < this.snake.length; i++) {
			const seg = this.snake[i];
			const brightness = i === 0 ? 1.0 : 0.5 + 0.5 * (1 - i / this.snake.length);

			g.rect(
				seg.x * this.cellSize + 1,
				14 + seg.y * this.cellSize + 1,
				this.cellSize - 2,
				this.cellSize - 2,
			);
			g.fill({
				color: i === 0 ? 0x44ff88 : 0x22aa44,
				alpha: brightness,
			});

			// Head eyes
			if (i === 0) {
				const eyeSize = 2;
				const cx = seg.x * this.cellSize + this.cellSize / 2;
				const cy = 14 + seg.y * this.cellSize + this.cellSize / 2;

				g.circle(cx + this.direction.x * 3, cy + this.direction.y * 3 - 1, eyeSize);
				g.fill(0x000000);
			}
		}

		// Food (pulsing)
		const foodPulseSize = 1 + Math.sin(this.foodPulse) * 0.3;
		const foodSize = (this.cellSize - 4) * foodPulseSize;
		g.circle(
			this.food.x * this.cellSize + this.cellSize / 2,
			14 + this.food.y * this.cellSize + this.cellSize / 2,
			foodSize / 2,
		);
		g.fill(0xff4444);

		// Update score
		this.scoreText.text = `Score: ${this.score}  Hi: ${this.highScore}`;

		// Game over overlay
		if (this.gameState === "gameover") {
			this.overlayText.text = `GAME OVER\nScore: ${this.score}\nPress A to restart`;
			this.overlayText.visible = true;
		} else {
			this.overlayText.visible = false;
		}
	}

	private moveSnake(): void {
		const head = this.snake[0]!;
		const newHead: Point = {
			x: head.x + this.direction.x,
			y: head.y + this.direction.y,
		};

		// Wall collision
		if (newHead.x < 0 || newHead.x >= this.gridW || newHead.y < 0 || newHead.y >= this.gridH) {
			this.endGame();
			return;
		}

		// Self collision
		for (const seg of this.snake) {
			if (seg.x === newHead.x && seg.y === newHead.y) {
				this.endGame();
				return;
			}
		}

		this.snake.unshift(newHead);

		// Food collision
		if (newHead.x === this.food.x && newHead.y === this.food.y) {
			this.score += 10;
			this.spawnFood();
			// Speed up slightly
			this.moveInterval = Math.max(0.05, this.moveInterval - 0.002);
		} else {
			this.snake.pop();
		}
	}

	private spawnFood(): void {
		let attempts = 0;
		do {
			this.food = {
				x: Math.floor(Math.random() * this.gridW),
				y: Math.floor(Math.random() * this.gridH),
			};
			attempts++;
		} while (
			this.snake.some(s => s.x === this.food.x && s.y === this.food.y) &&
			attempts < 200
		);
	}

	private endGame(): void {
		this.gameState = "gameover";
		if (this.score > this.highScore) {
			this.highScore = this.score;
			try {
				localStorage.setItem("nd_snake_high", String(this.highScore));
			} catch { /* ignore */ }
		}
	}

	public getState(): MiniGameState {
		return {
			running: this.gameState === "playing",
			data: { score: this.score, length: this.snake.length },
		};
	}
}
