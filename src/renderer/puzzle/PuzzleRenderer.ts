import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { PuzzleGame, GameState, Block, AnimationState, Piece, Color, GamePlayMode } from './index';

export interface PuzzleRendererConfig {
  cellSize?: number;
  borderWidth?: number;
  gridOffsetX?: number;
  gridOffsetY?: number;
  showGrid?: boolean;
  showGhost?: boolean;
  showNextPieces?: boolean;
  showHoldPiece?: boolean;
  showStats?: boolean;
  ghostAlpha?: number;
  backgroundColor?: number;
  gridLineColor?: number;
  borderColor?: number;
  isOpponent?: boolean;
}

const DEFAULT_CONFIG: Required<PuzzleRendererConfig> = {
  cellSize: 32,
  borderWidth: 2,
  gridOffsetX: 200,
  gridOffsetY: 50,
  showGrid: true,
  showGhost: true,
  showNextPieces: true,
  showHoldPiece: true,
  showStats: true,
  ghostAlpha: 0.3,
  backgroundColor: 0x1a1a2e,
  gridLineColor: 0x2a2a4e,
  borderColor: 0x4a4a6e,
  isOpponent: false,
};

interface PuzzleParticle {
  g: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

export class PuzzleRenderer {
  readonly container: Container;
  private readonly config: Required<PuzzleRendererConfig>;

  private game: PuzzleGame | null = null;

  private gridContainer: Container;
  private blocksContainer: Container;
  private pieceContainer: Container;
  private ghostContainer: Container;
  private nextContainer: Container;
  private holdContainer: Container;
  private statsContainer: Container;
  private particlesContainer: Container;
  private popupsContainer: Container;
  private cursorGraphics: Graphics;

  private gridBackground: Graphics;
  private blockGraphics: Map<string, Graphics> = new Map();
  private pieceGraphics: Graphics;
  private ghostGraphics: Graphics;
  private nextGraphics: Graphics[] = [];
  private holdGraphics: Graphics;

  private scoreText: Text;
  private levelText: Text;
  private linesText: Text;
  private timeText: Text;

  private destroyed: boolean = false;
  private particles: PuzzleParticle[] = [];
  private popups: { text: Text, vx: number, vy: number, life: number, maxLife: number }[] = [];
  private displayScore: number = 0;
  private currentShake: number = 0;
  private currentPieceDisplay: { x: number, y: number, rot: number, pieceRef: Piece | null } | null = null;

  constructor(config?: PuzzleRendererConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.container = new Container();
    this.container.sortableChildren = true;

    this.gridContainer = new Container();
    this.blocksContainer = new Container();
    this.pieceContainer = new Container();
    this.ghostContainer = new Container();
    this.nextContainer = new Container();
    this.holdContainer = new Container();
    this.statsContainer = new Container();
    this.particlesContainer = new Container();
    this.popupsContainer = new Container();
    this.cursorGraphics = new Graphics();

    this.gridBackground = new Graphics();
    this.pieceGraphics = new Graphics();
    this.ghostGraphics = new Graphics();
    this.holdGraphics = new Graphics();

    this.container.addChild(this.gridContainer);
    this.container.addChild(this.blocksContainer);
    this.container.addChild(this.ghostContainer);
    this.container.addChild(this.pieceContainer);
    this.container.addChild(this.nextContainer);
    this.container.addChild(this.holdContainer);
    this.container.addChild(this.statsContainer);
    this.container.addChild(this.particlesContainer);
    this.container.addChild(this.popupsContainer);
    this.container.addChild(this.cursorGraphics);

    this.gridContainer.addChild(this.gridBackground);
    this.pieceContainer.addChild(this.pieceGraphics);
    this.ghostContainer.addChild(this.ghostGraphics);
    this.holdContainer.addChild(this.holdGraphics);

    const textStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 18, fill: 0xffffff });
    this.scoreText = new Text({ text: 'Score: 0', style: textStyle });
    this.levelText = new Text({ text: 'Level: 1', style: textStyle });
    this.linesText = new Text({ text: 'Lines: 0', style: textStyle });
    this.timeText = new Text({ text: 'Time: 00:00', style: textStyle });
    
    const hintStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 14, fill: 0x888888 });
    const helpHint = new Text({ text: 'Press F1 for Help', style: hintStyle });
    helpHint.position.set(0, 150);

    this.statsContainer.addChild(this.scoreText, this.levelText, this.linesText, this.timeText, helpHint);
    this.ghostContainer.alpha = this.config.ghostAlpha;
  }

  attachGame(game: PuzzleGame): void {
    this.game = game;
    this.setupLayout();
    this.setupNextPieceGraphics();
  }

  detachGame(): void {
    this.game = null;
    this.clearAllGraphics();
  }

  private setupLayout(): void {
    if (!this.game) return;
    const { cellSize, gridOffsetX, gridOffsetY, isOpponent } = this.config;
    const gridWidth = this.game.grid.getWidth();
    const gridHeight = this.game.grid.getHeight() - 5;
    let ox = gridOffsetX, oy = gridOffsetY;
    if (this.currentShake > 0) { ox += (Math.random() - 0.5) * this.currentShake; oy += (Math.random() - 0.5) * this.currentShake; }

    this.gridContainer.position.set(ox, oy);
    this.blocksContainer.position.set(ox, oy);
    this.pieceContainer.position.set(ox, oy);
    this.ghostContainer.position.set(ox, oy);
    this.particlesContainer.position.set(ox, oy);
    this.popupsContainer.position.set(ox, oy);

    const gridPixelWidth = gridWidth * cellSize;
    if (isOpponent) {
      this.nextContainer.visible = false; this.holdContainer.visible = false; this.ghostContainer.visible = false;
      this.statsContainer.position.set(gridOffsetX, gridOffsetY + gridHeight * cellSize + 10);
    } else {
      this.nextContainer.position.set(gridOffsetX + gridPixelWidth + 40, gridOffsetY);
      this.holdContainer.position.set(gridOffsetX - 140, gridOffsetY);
      this.statsContainer.position.set(gridOffsetX - 180, gridOffsetY + 200);
    }
    this.scoreText.position.set(0, 0); this.levelText.position.set(0, 30); this.linesText.position.set(0, 60); this.timeText.position.set(0, 90);
    this.drawGridBackground();
  }

  private setupNextPieceGraphics(): void {
    if (!this.game) return;
    this.nextGraphics.forEach((g) => g.destroy()); this.nextGraphics = [];
    for (let i = 0; i < 3; i++) {
      const g = new Graphics(); g.position.set(0, i * (this.config.cellSize * 3 + 20));
      this.nextContainer.addChild(g); this.nextGraphics.push(g);
    }
  }

  private drawGridBackground(): void {
    if (!this.game) return;
    const { cellSize, borderWidth, gridLineColor, borderColor, backgroundColor } = this.config;
    const gridWidth = this.game.grid.getWidth(); const gridHeight = this.game.grid.getHeight() - 5;
    const pixelWidth = gridWidth * cellSize; const pixelHeight = gridHeight * cellSize;
    this.gridBackground.clear();
    this.gridBackground.rect(-borderWidth, -borderWidth, pixelWidth + borderWidth * 2, pixelHeight + borderWidth * 2);
    this.gridBackground.fill(borderColor);
    this.gridBackground.rect(0, 0, pixelWidth, pixelHeight);
    this.gridBackground.fill(backgroundColor);
    if (this.config.showGrid) {
      this.gridBackground.setStrokeStyle({ width: 1, color: gridLineColor });
      for (let x = 1; x < gridWidth; x++) { this.gridBackground.moveTo(x * cellSize, 0); this.gridBackground.lineTo(x * cellSize, pixelHeight); }
      for (let y = 1; y < gridHeight; y++) { this.gridBackground.moveTo(0, y * cellSize); this.gridBackground.lineTo(pixelWidth, y * cellSize); }
      this.gridBackground.stroke();
    }
  }

  update(): void {
    if (!this.game || this.destroyed) return;
    this.updateBlocks(); this.updateCurrentPiece(); this.updateGhostPiece(); this.updateNextPieces(); this.updateHoldPiece(); this.updateCursor(); this.updateStats(); this.updateParticles(); this.updatePopups();
  }

  private updateBlocks(): void {
    if (!this.game) return;
    const { cellSize } = this.config; const grid = this.game.grid; const hiddenRows = 5;
    const activeKeys = new Set<string>();
    for (let y = hiddenRows; y < grid.getHeight(); y++) {
      for (let x = 0; x < grid.getWidth(); x++) {
        const block = grid.get(x, y); if (!block) continue;
        const key = `${x},${y}`; activeKeys.add(key);
        let g = this.blockGraphics.get(key);
        if (!g) { g = new Graphics(); this.blocksContainer.addChild(g); this.blockGraphics.set(key, g); }
        this.drawBlock(g, x * cellSize, (y - hiddenRows) * cellSize, cellSize, block);
      }
    }
    for (const [key, g] of this.blockGraphics) { if (!activeKeys.has(key)) { g.destroy(); this.blockGraphics.delete(key); } }
  }

  private updateCurrentPiece(): void {
    if (!this.game) return;
    this.pieceGraphics.clear();
    const piece = this.game.currentPiece;
    if (!piece || this.game.state === GameState.IDLE || this.game.state === GameState.PAUSED) { this.currentPieceDisplay = null; return; }
    if (!this.currentPieceDisplay || this.currentPieceDisplay.pieceRef !== piece) {
        this.currentPieceDisplay = { x: piece.xGrid, y: piece.yGrid, rot: piece.currentRotation, pieceRef: piece };
    } else {
        const lerpSpeed = 0.5; this.currentPieceDisplay.x = piece.xGrid; this.currentPieceDisplay.rot = piece.currentRotation;
        this.currentPieceDisplay.y += (piece.yGrid - this.currentPieceDisplay.y) * lerpSpeed;
        if (Math.abs(piece.yGrid - this.currentPieceDisplay.y) > 3) this.currentPieceDisplay.y = piece.yGrid;
    }
    this.drawPiece(this.pieceGraphics, piece, this.currentPieceDisplay.x, this.currentPieceDisplay.y - 5);
  }

  private updateGhostPiece(): void {
    if (!this.game || !this.config.showGhost) return;
    this.ghostGraphics.clear();
    const piece = this.game.currentPiece;
    if (!piece || this.game.state === GameState.IDLE || this.game.state === GameState.PAUSED) return;
    const ghostY = this.game.getGhostY(); if (ghostY === piece.yGrid) return;
    this.drawPiece(this.ghostGraphics, piece, piece.xGrid, ghostY - 5);
  }

  private updateNextPieces(): void {
    if (!this.game || !this.config.showNextPieces) return;
    const nextPieces = this.game.nextPieces;
    for (let i = 0; i < this.nextGraphics.length; i++) {
      const g = this.nextGraphics[i]; g.clear();
      if (i < nextPieces.length) this.drawPiecePreview(g, nextPieces[i]);
    }
  }

  private updateHoldPiece(): void {
    if (!this.game || !this.config.showHoldPiece) return;
    this.holdGraphics.clear();
    const holdPiece = this.game.holdPiece; if (!holdPiece) return;
    this.drawPiecePreview(this.holdGraphics, holdPiece);
  }

  private updateCursor(): void {
      if (!this.game || this.game.currentGameType.gameMode !== GamePlayMode.STACK) { this.cursorGraphics.visible = false; return; }
      this.cursorGraphics.visible = true; this.cursorGraphics.clear();
      const { cellSize } = this.config; const ox = this.config.gridOffsetX; const oy = this.config.gridOffsetY;
      const cx = this.game.cursorX * cellSize + ox; const cy = (this.game.cursorY - 5) * cellSize + oy;
      this.cursorGraphics.rect(cx, cy, cellSize * 2, cellSize);
      this.cursorGraphics.stroke({ color: 0xffffff, width: 4, alpha: 0.8 });
  }

  private updateStats(): void {
    if (!this.game || !this.config.showStats) return;
    const targetScore = this.game.score;
    if (this.displayScore < targetScore) { this.displayScore += Math.max(1, (targetScore - this.displayScore) * 0.1); if (this.displayScore > targetScore) this.displayScore = targetScore; }
    else if (this.displayScore > targetScore) { this.displayScore = targetScore; }
    this.scoreText.text = `Score: ${Math.floor(this.displayScore)}`;
    this.levelText.text = `Level: ${this.game.currentLevel}`;
    this.linesText.text = `Lines: ${this.game.linesClearedTotal}`;
    this.timeText.text = `Time: ${this.game.getFormattedTime()}`;
  }

  private updateParticles(): void {
    const dt = 1 / 60;
    if (this.currentShake > 0) { this.currentShake -= 300 * dt; if (this.currentShake < 0) this.currentShake = 0; this.setupLayout(); }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]; p.life -= dt;
      if (p.life <= 0) { p.g.destroy(); this.particles.splice(i, 1); }
      else { p.vy += 400 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.g.position.set(p.x, p.y); p.g.alpha = p.life / p.maxLife; }
    }
  }

  public spawnLineClearParticles(y: number, color: number = 0xffffff): void {
    const { cellSize } = this.config; const gridWidth = this.game ? this.game.grid.getWidth() : 10;
    this.shake(5);
    for (let i = 0; i < gridWidth * 2; i++) {
      const g = new Graphics(); g.rect(-2, -2, 4, 4); g.fill({ color });
      const px = (Math.random() * gridWidth) * cellSize, py = y * cellSize + (Math.random() * cellSize);
      g.position.set(px, py); this.particlesContainer.addChild(g);
      this.particles.push({ g, x: px, y: py, vx: (Math.random() - 0.5) * 200, vy: (Math.random() - 1.0) * 300, life: 0.5 + Math.random() * 0.5, maxLife: 1.0 });
    }
  }

  public spawnPopup(message: string, color: number = 0xffffff, scale: number = 1.0): void {
    const { cellSize } = this.config; const gridWidth = this.game ? this.game.grid.getWidth() : 10;
    const gridHeight = this.game ? this.game.grid.getHeight() - 5 : 20;
    const style = new TextStyle({ fontFamily: 'Arial Black, Arial, sans-serif', fontSize: 24 * scale, fontWeight: 'bold', fill: color, stroke: { color: 0x000000, width: 4 }, dropShadow: { color: 0x000000, blur: 4, distance: 3 }, align: 'center' });
    const text = new Text({ text: message, style }); text.anchor.set(0.5);
    text.position.set((gridWidth * cellSize) / 2, (gridHeight * cellSize) / 2 + 20);
    this.popupsContainer.addChild(text);
    this.popups.push({ text, vx: (Math.random() - 0.5) * 20, vy: -50 - Math.random() * 50, life: 1.5, maxLife: 1.5 });
  }

  private updatePopups(): void {
    const dt = 1 / 60;
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i]; p.life -= dt;
      if (p.life <= 0) { p.text.destroy(); this.popups.splice(i, 1); }
      else { p.vy += 20 * dt; p.text.x += p.vx * dt; p.text.y += p.vy * dt;
        if (p.life < 0.5) p.text.alpha = p.life / 0.5;
        if (p.maxLife - p.life < 0.2) { const t = (p.maxLife - p.life) / 0.2; p.text.scale.set(1 + Math.sin(t * Math.PI) * 0.5); } else p.text.scale.set(1.0);
      }
    }
  }

  public shake(amount: number): void { this.currentShake = Math.max(this.currentShake, amount); }

  private drawBlock(g: Graphics, px: number, py: number, size: number, block: Block): void {
    const color = block.getColor() || Color.gray; const hexColor = color.toHex();
    const inset = 2, innerSize = size - inset * 2;
    let alpha = 1; if (block.fadingOut) alpha = block.disappearingAlpha;
    if (block.flashingToBeRemoved) alpha = 0.5 + Math.sin(Date.now() * 0.01) * 0.5;
    g.clear(); g.rect(px + inset, py + inset, innerSize, innerSize); g.fill({ color: hexColor, alpha });
  }

  private drawPiece(g: Graphics, piece: Piece, gridX: number, gridY: number): void {
    const { cellSize } = this.config;
    for (const block of piece.blocks) {
      const px = (gridX + block.xInPiece) * cellSize, py = (gridY + block.yInPiece) * cellSize;
      const color = block.getColor() || Color.gray;
      const inset = 2, innerSize = cellSize - inset * 2;
      g.rect(px + inset, py + inset, innerSize, innerSize); g.fill(color.toHex());
    }
  }

  private drawPiecePreview(g: Graphics, piece: Piece): void {
    const previewCellSize = this.config.cellSize * 0.75;
    const width = piece.getWidth(); const height = piece.getHeight();
    const offsetX = (4 - width) * previewCellSize / 2, offsetY = (2 - height) * previewCellSize / 2;
    for (const block of piece.blocks) {
      const px = offsetX + block.xInPiece * previewCellSize, py = offsetY + block.yInPiece * previewCellSize;
      const color = block.getColor() || Color.gray;
      const inset = 2, innerSize = previewCellSize - inset * 2;
      g.rect(px + inset, py + inset, innerSize, innerSize); g.fill(color.toHex());
    }
  }

  public clearAllGraphics(): void {
    this.blockGraphics.forEach(g => g.destroy()); this.blockGraphics.clear();
    this.pieceGraphics.clear(); this.ghostGraphics.clear(); this.holdGraphics.clear();
    for (const g of this.nextGraphics) g.clear();
  }

  setPosition(x: number, y: number): void { this.container.position.set(x, y); }
  setScale(scale: number): void { this.container.scale.set(scale); }
  getGridBounds(): { x: number; y: number; width: number; height: number } {
    if (!this.game) return { x: 0, y: 0, width: 0, height: 0 };
    return { x: this.config.gridOffsetX, y: this.config.gridOffsetY, width: this.game.grid.getWidth() * this.config.cellSize, height: (this.game.grid.getHeight() - 5) * this.config.cellSize };
  }

  set visible(value: boolean) { this.container.visible = value; }
  destroy(): void { this.destroyed = true; this.container.destroy({ children: true }); }
}
