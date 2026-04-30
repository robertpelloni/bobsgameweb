/**
 * PuzzleRenderer — renders puzzle game grid, pieces, and effects using PixiJS.
 *
 * Ported from Java com.bobsgame.client.renderer.PuzzleRenderer.
 * Draws the puzzle grid with blocks, active piece, ghost piece, and effects.
 */
import { Container, Graphics, Text, TextStyle } from 'pixi.js';

export interface PuzzleRendererConfig {
    gridX: number;
    gridY: number;
    gridWidth: number;
    gridHeight: number;
    cellSize: number;
    showGrid: boolean;
    showGhost: boolean;
}

export interface RenderableBlock {
    color: { r: number; g: number; b: number };
    special?: boolean;
    flashing?: boolean;
    removing?: boolean;
    counterValue?: number;
}

export class PuzzleRenderer {
    private config: PuzzleRendererConfig;
    private container: Container;

    constructor(config: Partial<PuzzleRendererConfig> = {}) {
        this.config = {
            gridX: config.gridX ?? 50,
            gridY: config.gridY ?? 50,
            gridWidth: config.gridWidth ?? 10,
            gridHeight: config.gridHeight ?? 20,
            cellSize: config.cellSize ?? 20,
            showGrid: config.showGrid ?? true,
            showGhost: config.showGhost ?? true,
        };
        this.container = new Container();
    }

    /**
     * Render the puzzle grid state.
     */
    render(
        grid: (RenderableBlock | null)[][],
        activePiece: { blocks: { x: number; y: number; color: { r: number; g: number; b: number } }[] } | null,
        ghostY = 0,
        nextPiece: { blocks: { color: { r: number; g: number; b: number } }[] } | null = null,
        holdPiece: { blocks: { color: { r: number; g: number; b: number } }[] } | null = null,
        score = 0,
        level = 1,
        combo = 0,
    ): Container {
        this.container.removeChildren();
        const g = new Graphics();
        const { gridX, gridY, gridWidth, gridHeight, cellSize } = this.config;
        const gridPixelW = gridWidth * cellSize;
        const gridPixelH = gridHeight * cellSize;

        // Background
        g.rect(gridX, gridY, gridPixelW, gridPixelH);
        g.fill({ color: 0x080818 });

        // Grid lines
        if (this.config.showGrid) {
            g.setStrokeStyle({ color: 0x151530, width: 0.5 });
            for (let x = 0; x <= gridWidth; x++) {
                g.moveTo(gridX + x * cellSize, gridY);
                g.lineTo(gridX + x * cellSize, gridY + gridPixelH);
            }
            for (let y = 0; y <= gridHeight; y++) {
                g.moveTo(gridX, gridY + y * cellSize);
                g.lineTo(gridX + gridPixelW, gridY + y * cellSize);
            }
        }

        // Grid blocks
        for (let y = 0; y < grid.length; y++) {
            for (let x = 0; x < grid[y].length; x++) {
                const block = grid[y][x];
                if (!block) continue;

                const px = gridX + x * cellSize;
                const py = gridY + y * cellSize;
                const { r, g: gg, b } = block.color;
                const color = (r << 16) | (gg << 8) | b;
                const alpha = block.removing ? 0.5 : block.flashing ? 0.7 : 1;

                g.rect(px + 1, py + 1, cellSize - 2, cellSize - 2);
                g.fill({ color, alpha });

                // Highlight
                g.rect(px + 1, py + 1, cellSize - 2, 2);
                g.fill({ color: 0xffffff, alpha: 0.2 });

                // Special indicator
                if (block.special) {
                    g.circle(px + cellSize / 2, py + cellSize / 2, cellSize / 4);
                    g.fill({ color: 0xffff88, alpha: 0.5 });
                }

                // Counter value
                if (block.counterValue !== undefined && block.counterValue > 0) {
                    const numStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 10, fill: 0xffffff });
                    const numText = new Text({ text: `${block.counterValue}`, style: numStyle });
                    numText.anchor.set(0.5);
                    numText.position.set(px + cellSize / 2, py + cellSize / 2);
                    this.container.addChild(numText);
                }
            }
        }

        // Ghost piece
        if (activePiece && this.config.showGhost) {
            for (const block of activePiece.blocks) {
                const px = gridX + block.x * cellSize;
                const py = gridY + (block.y + ghostY) * cellSize;
                if (py >= gridY && py < gridY + gridPixelH) {
                    g.rect(px + 1, py + 1, cellSize - 2, cellSize - 2);
                    g.fill({ color: 0x333344, alpha: 0.3 });
                    g.rect(px + 1, py + 1, cellSize - 2, cellSize - 2);
                    g.stroke({ color: 0x6666aa, width: 1 });
                }
            }
        }

        // Active piece
        if (activePiece) {
            for (const block of activePiece.blocks) {
                const px = gridX + block.x * cellSize;
                const py = gridY + block.y * cellSize;
                const { r, g: gg, b } = block.color;
                const color = (r << 16) | (gg << 8) | b;
                g.rect(px + 1, py + 1, cellSize - 2, cellSize - 2);
                g.fill({ color });
                g.rect(px + 1, py + 1, cellSize - 2, 2);
                g.fill({ color: 0xffffff, alpha: 0.3 });
            }
        }

        // Border
        g.rect(gridX, gridY, gridPixelW, gridPixelH);
        g.stroke({ color: 0x4466aa, width: 1 });

        this.container.addChild(g);

        // Next piece preview
        if (nextPiece) {
            this.renderMiniPiece(g, nextPiece, gridX + gridPixelW + 20, gridY, 'NEXT');
        }

        // Hold piece
        if (holdPiece) {
            this.renderMiniPiece(g, holdPiece, gridX - cellSize * 5 - 20, gridY, 'HOLD');
        }

        // HUD
        const hudStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 12, fill: 0xcccccc });
        const scoreText = new Text({ text: `Score: ${score}`, style: hudStyle });
        scoreText.position.set(gridX, gridY + gridPixelH + 8);
        this.container.addChild(scoreText);

        const levelText = new Text({ text: `Level: ${level}`, style: hudStyle });
        levelText.position.set(gridX + 100, gridY + gridPixelH + 8);
        this.container.addChild(levelText);

        if (combo > 1) {
            const comboStyle = new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 14, fill: 0xffff44, fontWeight: 'bold' });
            const comboText = new Text({ text: `${combo}x COMBO!`, style: comboStyle });
            comboText.position.set(gridX + gridPixelW / 2 - 40, gridY - 24);
            this.container.addChild(comboText);
        }

        return this.container;
    }

    private renderMiniPiece(parentG: Graphics, piece: { blocks: { color: { r: number; g: number; b: number } }[] }, x: number, y: number, label: string): void {
        const miniSize = 10;

        // Label
        const labelStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 10, fill: 0x888888 });
        const labelText = new Text({ text: label, style: labelStyle });
        labelText.position.set(x, y - 16);
        this.container.addChild(labelText);

        // Background
        const bg = new Graphics();
        bg.roundRect(x, y, miniSize * 5, miniSize * 5, 2);
        bg.fill({ color: 0x0a0a1a });
        bg.stroke({ color: 0x334466, width: 1 });
        this.container.addChild(bg);

        // Blocks
        const blockG = new Graphics();
        let i = 0;
        for (const block of piece.blocks) {
            const bx = x + (i % 4) * miniSize + 5;
            const by = y + Math.floor(i / 4) * miniSize + 5;
            const { r, g, b } = block.color;
            blockG.rect(bx, by, miniSize - 1, miniSize - 1);
            blockG.fill({ color: (r << 16) | (g << 8) | b });
            i++;
        }
        this.container.addChild(blockG);
    }

    getConfig(): PuzzleRendererConfig { return this.config; }
    getContainer(): Container { return this.container; }

    destroy(): void {
        this.container.destroy({ children: true });
    }
}
