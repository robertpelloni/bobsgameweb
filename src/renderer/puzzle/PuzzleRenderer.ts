import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { PuzzleGame, GameState } from './PuzzleGame';
import { Block, AnimationState } from './Block';
import { Piece } from './Piece';
import { Color } from './Color';

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
};

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

    this.gridContainer.addChild(this.gridBackground);
    this.pieceContainer.addChild(this.pieceGraphics);
    this.ghostContainer.addChild(this.ghostGraphics);
    this.holdContainer.addChild(this.holdGraphics);

    const textStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 18,
      fill: 0xffffff,
    });

    this.scoreText = new Text({ text: 'Score: 0', style: textStyle });
    this.levelText = new Text({ text: 'Level: 1', style: textStyle });
    this.linesText = new Text({ text: 'Lines: 0', style: textStyle });
    this.timeText = new Text({ text: 'Time: 00:00', style: textStyle });

    this.statsContainer.addChild(this.scoreText);
    this.statsContainer.addChild(this.levelText);
    this.statsContainer.addChild(this.linesText);
    this.statsContainer.addChild(this.timeText);

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

    const { cellSize, gridOffsetX, gridOffsetY } = this.config;
    const gridWidth = this.game.grid.width;
    const gridHeight = this.game.grid.height - this.game.grid.hiddenRows;

    this.gridContainer.position.set(gridOffsetX, gridOffsetY);
    this.blocksContainer.position.set(gridOffsetX, gridOffsetY);
    this.pieceContainer.position.set(gridOffsetX, gridOffsetY);
    this.ghostContainer.position.set(gridOffsetX, gridOffsetY);

    const gridPixelWidth = gridWidth * cellSize;

    this.nextContainer.position.set(
      gridOffsetX + gridPixelWidth + 40,
      gridOffsetY
    );

    this.holdContainer.position.set(gridOffsetX - 140, gridOffsetY);

    this.statsContainer.position.set(gridOffsetX - 180, gridOffsetY + 200);

    this.scoreText.position.set(0, 0);
    this.levelText.position.set(0, 30);
    this.linesText.position.set(0, 60);
    this.timeText.position.set(0, 90);

    this.drawGridBackground();
  }

  private setupNextPieceGraphics(): void {
    if (!this.game) return;

    this.nextGraphics.forEach((g) => g.destroy());
    this.nextGraphics = [];

    const showCount = this.game.gameType.visualRules.showNextPieces;
    for (let i = 0; i < showCount; i++) {
      const g = new Graphics();
      g.position.set(0, i * (this.config.cellSize * 3 + 20));
      this.nextContainer.addChild(g);
      this.nextGraphics.push(g);
    }
  }

  private drawGridBackground(): void {
    if (!this.game) return;

    const { cellSize, borderWidth, gridLineColor, borderColor, backgroundColor } = this.config;
    const gridWidth = this.game.grid.width;
    const gridHeight = this.game.grid.height - this.game.grid.hiddenRows;
    const pixelWidth = gridWidth * cellSize;
    const pixelHeight = gridHeight * cellSize;

    this.gridBackground.clear();

    this.gridBackground.rect(-borderWidth, -borderWidth, pixelWidth + borderWidth * 2, pixelHeight + borderWidth * 2);
    this.gridBackground.fill(borderColor);

    this.gridBackground.rect(0, 0, pixelWidth, pixelHeight);
    this.gridBackground.fill(backgroundColor);

    if (this.config.showGrid) {
      this.gridBackground.setStrokeStyle({ width: 1, color: gridLineColor });
      for (let x = 1; x < gridWidth; x++) {
        this.gridBackground.moveTo(x * cellSize, 0);
        this.gridBackground.lineTo(x * cellSize, pixelHeight);
      }
      for (let y = 1; y < gridHeight; y++) {
        this.gridBackground.moveTo(0, y * cellSize);
        this.gridBackground.lineTo(pixelWidth, y * cellSize);
      }
      this.gridBackground.stroke();
    }
  }

  update(): void {
    if (!this.game || this.destroyed) return;

    this.updateBlocks();
    this.updateCurrentPiece();
    this.updateGhostPiece();
    this.updateNextPieces();
    this.updateHoldPiece();
    this.updateStats();
  }

  private updateBlocks(): void {
    if (!this.game) return;

    const { cellSize } = this.config;
    const grid = this.game.grid;
    const hiddenRows = grid.hiddenRows;

    const activeKeys = new Set<string>();

    for (let y = hiddenRows; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const block = grid.get(x, y);
        if (!block) continue;

        const key = `${x},${y}`;
        activeKeys.add(key);

        let g = this.blockGraphics.get(key);
        if (!g) {
          g = new Graphics();
          this.blocksContainer.addChild(g);
          this.blockGraphics.set(key, g);
        }

        const visualY = y - hiddenRows;
        this.drawBlock(g, x * cellSize, visualY * cellSize, cellSize, block);
      }
    }

    for (const [key, g] of this.blockGraphics) {
      if (!activeKeys.has(key)) {
        g.destroy();
        this.blockGraphics.delete(key);
      }
    }
  }

  private updateCurrentPiece(): void {
    if (!this.game) return;

    this.pieceGraphics.clear();

    const piece = this.game.currentPiece;
    if (!piece || this.game.state !== GameState.PLAYING) return;

    this.drawPiece(this.pieceGraphics, piece, piece.xGrid, piece.yGrid - this.game.grid.hiddenRows);
  }

  private updateGhostPiece(): void {
    if (!this.game || !this.config.showGhost) return;

    this.ghostGraphics.clear();

    const piece = this.game.currentPiece;
    if (!piece || this.game.state !== GameState.PLAYING) return;

    const ghostY = this.game.getGhostY();
    if (ghostY === piece.yGrid) return;

    this.drawPiece(this.ghostGraphics, piece, piece.xGrid, ghostY - this.game.grid.hiddenRows);
  }

  private updateNextPieces(): void {
    if (!this.game || !this.config.showNextPieces) return;

    const nextPieces = this.game.nextPieces;

    for (let i = 0; i < this.nextGraphics.length; i++) {
      const g = this.nextGraphics[i];
      g.clear();

      if (i < nextPieces.length) {
        const piece = nextPieces[i];
        this.drawPiecePreview(g, piece);
      }
    }
  }

  private updateHoldPiece(): void {
    if (!this.game || !this.config.showHoldPiece) return;

    this.holdGraphics.clear();

    const holdPiece = this.game.holdPiece;
    if (!holdPiece) return;

    this.drawPiecePreview(this.holdGraphics, holdPiece);
  }

  private updateStats(): void {
    if (!this.game || !this.config.showStats) return;

    this.scoreText.text = `Score: ${this.game.score}`;
    this.levelText.text = `Level: ${this.game.currentLevel}`;
    this.linesText.text = `Lines: ${this.game.linesClearedTotal}`;
    this.timeText.text = `Time: ${this.game.getFormattedTime()}`;
  }

  private drawBlock(g: Graphics, px: number, py: number, size: number, block: Block): void {
    const color = block.color;
    const hexColor = color.hex;
    const darkerColor = color.darken(50).hex;
    const lighterColor = color.brighten(50).hex;

    const inset = 2;
    const innerSize = size - inset * 2;

    let alpha = 1;
    if (block.fadingOut) {
      alpha = block.disappearingAlpha;
    }
    if (block.animationState === AnimationState.FLASHING) {
      alpha = 0.5 + Math.sin(block.animationFrameTicks * 0.5) * 0.5;
    }

    g.clear();

    g.rect(px + inset, py + inset, innerSize, innerSize);
    g.fill({ color: hexColor, alpha });

    g.rect(px + inset, py + inset, innerSize, 3);
    g.fill({ color: lighterColor, alpha });

    g.rect(px + inset, py + inset, 3, innerSize);
    g.fill({ color: lighterColor, alpha });

    g.rect(px + inset, py + size - inset - 3, innerSize, 3);
    g.fill({ color: darkerColor, alpha });

    g.rect(px + size - inset - 3, py + inset, 3, innerSize);
    g.fill({ color: darkerColor, alpha });

    if (block.connectedUp || block.connectedDown || block.connectedLeft || block.connectedRight) {
      this.drawBlockConnections(g, px, py, size, block, hexColor, alpha);
    }
  }

  private drawBlockConnections(
    g: Graphics,
    px: number,
    py: number,
    size: number,
    block: Block,
    color: number,
    alpha: number
  ): void {
    const inset = 2;
    const connectorSize = 4;

    if (block.connectedUp) {
      g.rect(px + size / 2 - connectorSize / 2, py, connectorSize, inset);
      g.fill({ color, alpha });
    }
    if (block.connectedDown) {
      g.rect(px + size / 2 - connectorSize / 2, py + size - inset, connectorSize, inset);
      g.fill({ color, alpha });
    }
    if (block.connectedLeft) {
      g.rect(px, py + size / 2 - connectorSize / 2, inset, connectorSize);
      g.fill({ color, alpha });
    }
    if (block.connectedRight) {
      g.rect(px + size - inset, py + size / 2 - connectorSize / 2, inset, connectorSize);
      g.fill({ color, alpha });
    }
  }

  private drawPiece(g: Graphics, piece: Piece, gridX: number, gridY: number): void {
    const { cellSize } = this.config;

    for (const block of piece.blocks) {
      const px = (gridX + block.xInPiece) * cellSize;
      const py = (gridY + block.yInPiece) * cellSize;
      this.drawBlockSimple(g, px, py, cellSize, block.color);
    }
  }

  private drawPiecePreview(g: Graphics, piece: Piece): void {
    const previewCellSize = this.config.cellSize * 0.75;

    const width = piece.getWidth();
    const height = piece.getHeight();
    const offsetX = (4 - width) * previewCellSize / 2;
    const offsetY = (2 - height) * previewCellSize / 2;

    for (const block of piece.blocks) {
      const px = offsetX + block.xInPiece * previewCellSize;
      const py = offsetY + block.yInPiece * previewCellSize;
      this.drawBlockSimple(g, px, py, previewCellSize, block.color);
    }
  }

  private drawBlockSimple(g: Graphics, px: number, py: number, size: number, color: Color): void {
    const hexColor = color.hex;
    const darkerColor = color.darken(50).hex;
    const lighterColor = color.brighten(50).hex;

    const inset = 2;
    const innerSize = size - inset * 2;

    g.rect(px + inset, py + inset, innerSize, innerSize);
    g.fill(hexColor);

    g.rect(px + inset, py + inset, innerSize, 2);
    g.fill(lighterColor);

    g.rect(px + inset, py + inset, 2, innerSize);
    g.fill(lighterColor);

    g.rect(px + inset, py + size - inset - 2, innerSize, 2);
    g.fill(darkerColor);

    g.rect(px + size - inset - 2, py + inset, 2, innerSize);
    g.fill(darkerColor);
  }

  private clearAllGraphics(): void {
    this.gridBackground.clear();
    this.pieceGraphics.clear();
    this.ghostGraphics.clear();
    this.holdGraphics.clear();

    for (const g of this.blockGraphics.values()) {
      g.destroy();
    }
    this.blockGraphics.clear();

    for (const g of this.nextGraphics) {
      g.clear();
    }
  }

  setPosition(x: number, y: number): void {
    this.container.position.set(x, y);
  }

  setScale(scale: number): void {
    this.container.scale.set(scale);
  }

  get visible(): boolean {
    return this.container.visible;
  }

  set visible(value: boolean) {
    this.container.visible = value;
  }

  getGridBounds(): { x: number; y: number; width: number; height: number } {
    if (!this.game) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    const { cellSize, gridOffsetX, gridOffsetY } = this.config;
    return {
      x: gridOffsetX,
      y: gridOffsetY,
      width: this.game.grid.width * cellSize,
      height: (this.game.grid.height - this.game.grid.hiddenRows) * cellSize,
    };
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    this.detachGame();

    for (const g of this.nextGraphics) {
      g.destroy();
    }
    this.nextGraphics = [];

    this.container.destroy({ children: true });
  }
}
