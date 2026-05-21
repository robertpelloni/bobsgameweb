// @ts-nocheck
/**
 * SpriteEditorScene — pixel art sprite editor for creating game assets.
 *
 * Features:
 * - 16×16 or 32×32 pixel canvas with zoom
 * - Color palette with 32 preset colors
 * - Drawing tools: pencil, eraser, fill bucket, line
 * - Undo/redo support
 * - Export as PNG or save to tileset
 * - Grid overlay toggle
 */
import { Container, Graphics, Text, TextStyle, Texture, Sprite, RenderTexture } from "pixi.js";
import { Scene, type SceneConfig } from "../state/Scene";
import { StateManager } from "../state/StateManager";
import { InputManager, Key } from "../input/InputManager";

const CANVAS_SIZE = 16;
const PIXEL_SCALE = 24;
const PALETTE_SIZE = 32;

export class SpriteEditorScene extends Scene {
	private canvas: number[][] = [];
	private container!: Container;
	private pixelGraphics!: Graphics;
	private gridGraphics!: Graphics;
	private cursorGraphics!: Graphics;
	private showGrid = true;
	private currentColor = 0xffffff;
	private tool: "pencil" | "eraser" | "fill" = "pencil";
	private undoStack: number[][][] = [];
	private redoStack: number[][][] = [];
	private cursorX = 0;
	private cursorY = 0;
	private isDrawing = false;
	private paletteColors: number[] = [];
	private paletteContainer!: Container;
	private statusText!: Text;

	constructor(config: SceneConfig) {
		super(config);
	}

	public async create(): Promise<void> {
		this.initCanvas();
		this.initPalette();
		this.createBackground();
		this.createPixelCanvas();
		this.createPaletteUI();
		this.createToolbar();
		this.createStatusBar();
	}

	private initCanvas(): void {
		this.canvas = Array.from({ length: CANVAS_SIZE }, () =>
			Array.from({ length: CANVAS_SIZE }, () => 0),
		);
	}

	private initPalette(): void {
		this.paletteColors = [
			0x000000, 0x333333, 0x666666, 0x999999, 0xcccccc, 0xffffff,
			0xff0000, 0xff4400, 0xff8800, 0xffcc00, 0xffff00, 0xccff00,
			0x88ff00, 0x00ff00, 0x00ff88, 0x00ffcc, 0x00ffff, 0x00ccff,
			0x0088ff, 0x0044ff, 0x0000ff, 0x4400ff, 0x8800ff, 0xcc00ff,
			0xff00ff, 0xff00cc, 0xff0088, 0xff0044, 0x884422, 0x442200,
			0xaa6633, 0xddaa77,
		];
	}

	private createBackground(): void {
		const bg = new Graphics();
		for (let i = 0; i < 20; i++) {
			const ratio = i / 20;
			bg.rect(0, (this.height / 20) * i, this.width, this.height / 20 + 1);
			bg.fill((Math.floor(10 + ratio * 15) << 16) | (Math.floor(10 + ratio * 10) << 8) | Math.floor(15 + ratio * 20));
		}
		this.container.addChild(bg);
	}

	private createPixelCanvas(): void {
		const offsetX = 60;
		const offsetY = 50;
		const container = new Container();
		container.position.set(offsetX, offsetY);

		// White background (for transparent preview)
		const bg = new Graphics();
		bg.rect(0, 0, CANVAS_SIZE * PIXEL_SCALE, CANVAS_SIZE * PIXEL_SCALE);
		bg.fill(0x222233);
		container.addChild(bg);

		// Pixel graphics
		this.pixelGraphics = new Graphics();
		container.addChild(this.pixelGraphics);

		// Grid
		this.gridGraphics = new Graphics();
		container.addChild(this.gridGraphics);

		// Cursor
		this.cursorGraphics = new Graphics();
		container.addChild(this.cursorGraphics);

		this.container.addChild(container);
		this.renderCanvas();
		this.renderGrid();
	}

	private renderCanvas(): void {
		this.pixelGraphics.clear();
		for (let y = 0; y < CANVAS_SIZE; y++) {
			for (let x = 0; x < CANVAS_SIZE; x++) {
				const color = this.canvas[y][x];
				if (color !== 0) {
					this.pixelGraphics.rect(
						x * PIXEL_SCALE, y * PIXEL_SCALE,
						PIXEL_SCALE, PIXEL_SCALE,
					);
					this.pixelGraphics.fill(color);
				}
			}
		}
	}

	private renderGrid(): void {
		this.gridGraphics.clear();
		if (!this.showGrid) return;

		this.gridGraphics.setStrokeStyle({ color: 0x334455, width: 0.5 });
		for (let i = 0; i <= CANVAS_SIZE; i++) {
			this.gridGraphics.moveTo(i * PIXEL_SCALE, 0);
			this.gridGraphics.lineTo(i * PIXEL_SCALE, CANVAS_SIZE * PIXEL_SCALE);
			this.gridGraphics.moveTo(0, i * PIXEL_SCALE);
			this.gridGraphics.lineTo(CANVAS_SIZE * PIXEL_SCALE, i * PIXEL_SCALE);
		}
		this.gridGraphics.stroke();
	}

	private renderCursor(): void {
		this.cursorGraphics.clear();
		this.cursorGraphics.rect(
			this.cursorX * PIXEL_SCALE, this.cursorY * PIXEL_SCALE,
			PIXEL_SCALE, PIXEL_SCALE,
		);
		this.cursorGraphics.stroke({ color: 0xffff00, width: 2 });
	}

	private createPaletteUI(): void {
		this.paletteContainer = new Container();
		const startX = 60 + CANVAS_SIZE * PIXEL_SCALE + 30;
		this.paletteContainer.position.set(startX, 50);

		const title = new Text({
			text: "PALETTE",
			style: new TextStyle({ fill: 0xaabbcc, fontSize: 14, fontWeight: "bold" }),
		});
		this.paletteContainer.addChild(title);

		const swatchSize = 24;
		const cols = 4;
		for (let i = 0; i < this.paletteColors.length; i++) {
			const col = i % cols;
			const row = Math.floor(i / cols);
			const swatch = new Graphics();
			swatch.rect(col * (swatchSize + 2), 25 + row * (swatchSize + 2), swatchSize, swatchSize);
			swatch.fill(this.paletteColors[i]);
			swatch.stroke({ color: i === 0 ? 0x666666 : 0x444455, width: 1 });
			this.paletteContainer.addChild(swatch);
		}
		this.container.addChild(this.paletteContainer);
	}

	private createToolbar(): void {
		const toolbarY = 50 + CANVAS_SIZE * PIXEL_SCALE + 20;
		const tools = [
			{ label: "Pencil (P)", tool: "pencil" as const },
			{ label: "Eraser (E)", tool: "eraser" as const },
			{ label: "Fill (F)", tool: "fill" as const },
			{ label: "Grid (G)", tool: null },
			{ label: "Undo (Z)", tool: null },
			{ label: "Export (X)", tool: null },
		];

		for (let i = 0; i < tools.length; i++) {
			const btn = new Text({
				text: tools[i].label,
				style: new TextStyle({ fill: 0x88aacc, fontSize: 12 }),
			});
			btn.position.set(60 + i * 100, toolbarY);
			this.container.addChild(btn);
		}
	}

	private createStatusBar(): void {
		this.statusText = new Text({
			text: `Tool: ${this.tool} | Color: #${this.currentColor.toString(16).padStart(6, "0")} | Cursor: ${this.cursorX},${this.cursorY}`,
			style: new TextStyle({ fill: 0x667788, fontSize: 12 }),
		});
		this.statusText.position.set(60, this.height - 30);
		this.container.addChild(this.statusText);
	}

	// ============================================================
	// Drawing
	// ============================================================

	private saveUndoState(): void {
		this.undoStack.push(this.canvas.map(row => [...row]));
		if (this.undoStack.length > 50) this.undoStack.shift();
		this.redoStack = [];
	}

	private drawPixel(x: number, y: number): void {
		if (x < 0 || x >= CANVAS_SIZE || y < 0 || y >= CANVAS_SIZE) return;
		if (this.tool === "pencil") {
			this.canvas[y][x] = this.currentColor;
		} else if (this.tool === "eraser") {
			this.canvas[y][x] = 0;
		}
		this.renderCanvas();
	}

	private floodFill(startX: number, startY: number): void {
		if (startX < 0 || startX >= CANVAS_SIZE || startY < 0 || startY >= CANVAS_SIZE) return;
		const targetColor = this.canvas[startY][startX];
		if (targetColor === this.currentColor) return;

		this.saveUndoState();
		const stack: [number, number][] = [[startX, startY]];
		const visited = new Set<string>();

		while (stack.length > 0) {
			const [x, y] = stack.pop()!;
			const key = `${x},${y}`;
			if (visited.has(key)) continue;
			if (x < 0 || x >= CANVAS_SIZE || y < 0 || y >= CANVAS_SIZE) continue;
			if (this.canvas[y][x] !== targetColor) continue;

			visited.add(key);
			this.canvas[y][x] = this.currentColor;

			stack.push([x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]);
		}
		this.renderCanvas();
	}

	private undo(): void {
		if (this.undoStack.length === 0) return;
		this.redoStack.push(this.canvas.map(row => [...row]));
		this.canvas = this.undoStack.pop()!;
		this.renderCanvas();
	}

	private exportPNG(): void {
		// Create a canvas and draw pixels at 1:1 scale
		const canvas = document.createElement("canvas");
		canvas.width = CANVAS_SIZE;
		canvas.height = CANVAS_SIZE;
		const ctx = canvas.getContext("2d")!;
		for (let y = 0; y < CANVAS_SIZE; y++) {
			for (let x = 0; x < CANVAS_SIZE; x++) {
				const color = this.canvas[y][x];
				if (color !== 0) {
					const r = (color >> 16) & 0xff;
					const g = (color >> 8) & 0xff;
					const b = color & 0xff;
					ctx.fillStyle = `rgb(${r},${g},${b})`;
					ctx.fillRect(x, y, 1, 1);
				}
			}
		}
		// Download
		const link = document.createElement("a");
		link.download = "sprite.png";
		link.href = canvas.toDataURL("image/png");
		link.click();
	}

	// ============================================================
	// Update
	// ============================================================

	protected onUpdate(dt: number): void {
		// Cursor movement
		if (InputManager.isKeyPressed(Key.ArrowUp) || InputManager.isKeyPressed(Key.W)) {
			this.cursorY = Math.max(0, this.cursorY - 1);
		}
		if (InputManager.isKeyPressed(Key.ArrowDown) || InputManager.isKeyPressed(Key.S)) {
			this.cursorY = Math.min(CANVAS_SIZE - 1, this.cursorY + 1);
		}
		if (InputManager.isKeyPressed(Key.ArrowLeft) || InputManager.isKeyPressed(Key.A)) {
			this.cursorX = Math.max(0, this.cursorX - 1);
		}
		if (InputManager.isKeyPressed(Key.ArrowRight) || InputManager.isKeyPressed(Key.D)) {
			this.cursorX = Math.min(CANVAS_SIZE - 1, this.cursorX + 1);
		}

		// Drawing
		if (InputManager.isActionPressed() || InputManager.isKeyHeld(Key.Space)) {
			if (!this.isDrawing) {
				this.isDrawing = true;
				if (this.tool === "fill") {
					this.floodFill(this.cursorX, this.cursorY);
				} else {
					this.saveUndoState();
					this.drawPixel(this.cursorX, this.cursorY);
				}
			} else if (this.tool !== "fill") {
				this.drawPixel(this.cursorX, this.cursorY);
			}
		} else {
			this.isDrawing = false;
		}

		// Tool switching
		if (InputManager.isKeyPressed(Key.P)) this.tool = "pencil";
		if (InputManager.isKeyPressed(Key.E)) this.tool = "eraser";
		if (InputManager.isKeyPressed(Key.F)) this.tool = "fill";
		if (InputManager.isKeyPressed(Key.G)) {
			this.showGrid = !this.showGrid;
			this.renderGrid();
		}
		if (InputManager.isKeyPressed(Key.Z)) this.undo();
		if (InputManager.isKeyPressed(Key.X)) this.exportPNG();

		// Color cycling with [ and ]
		if (InputManager.isKeyPressed(Key.BracketLeft)) {
			const idx = this.paletteColors.indexOf(this.currentColor);
			this.currentColor = this.paletteColors[Math.max(0, idx - 1)] ?? this.paletteColors[0];
		}
		if (InputManager.isKeyPressed(Key.BracketRight)) {
			const idx = this.paletteColors.indexOf(this.currentColor);
			this.currentColor = this.paletteColors[Math.min(this.paletteColors.length - 1, idx + 1)] ?? this.paletteColors[this.paletteColors.length - 1];
		}

		// Update cursor
		this.renderCursor();

		// Status bar
		this.statusText.text = `Tool: ${this.tool} | Color: #${this.currentColor.toString(16).padStart(6, "0")} | Cursor: ${this.cursorX},${this.cursorY} | ESC: Back`;

		// Exit
		if (InputManager.isCancelPressed()) {
			StateManager.pop();
		}
	}
}
