/**
 * GlowTileBackground — animated glowing tile background effect for menu screens.
 *
 * Ported from Java com.bobsgame.client.state.GlowTileBackground.
 * Creates a scrolling background with glowing tiles that animate in sequence.
 */
import { Container, Graphics, Color } from 'pixi.js';

export class GlowTile {
    tileX = 0;
    tileY = 0;
    frame = 0;
    ticks = 0;
    started = false;
}

export class GlowTileBackground {
    private container: Container;
    private width: number;
    private height: number;
    private tiles: GlowTile[] = [];
    private ticksPassed = 0;

    // Config
    tileFrames = 115;
    numActiveTiles = 4;
    scale = 2.0;
    ticksPerFrame = 60;
    scrollSpeedMultiplier = 1 / 100;
    tileWidth = 64;
    tileHeight = 64;

    // Scroll
    private bgScrollX = 0;
    private bgScrollY = 0;

    // Colors
    private baseColor = 0x000022;
    private glowColor = new Color(0x002244);

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.container = new Container();
        this.init();
    }

    private init(): void {
        this.tiles = [];
        for (let i = 0; i < this.numActiveTiles; i++) {
            const tile = new GlowTile();
            tile.started = true;
            tile.frame = Math.floor((this.tileFrames / this.numActiveTiles) * i);
            this.tiles.push(tile);
        }
    }

    update(dt: number): void {
        this.ticksPassed += dt;

        // Update scroll
        this.bgScrollX += dt * this.scrollSpeedMultiplier;
        this.bgScrollY += dt * this.scrollSpeedMultiplier * 0.5;

        // Update tiles
        for (let i = 0; i < this.tiles.length; i++) {
            const tile = this.tiles[i];
            tile.ticks += dt;

            if (tile.ticks >= this.ticksPerFrame) {
                tile.ticks = 0;

                const next = (i + 1) % this.tiles.length;
                const nextTile = this.tiles[next];

                if (!tile.started) {
                    if (nextTile.frame >= this.tileFrames / this.tiles.length) {
                        tile.started = true;
                    }
                }

                if (tile.started) {
                    tile.frame++;
                    if (tile.frame >= this.tileFrames) {
                        tile.frame = 0;

                        // Snake-like movement — follow previous tile
                        const prev = (i - 1 + this.tiles.length) % this.tiles.length;
                        const prevTile = this.tiles[prev];

                        if (Math.random() < 0.5) {
                            tile.tileX = prevTile.tileX + (Math.random() < 0.5 ? 1 : -1);
                        } else {
                            tile.tileY = prevTile.tileY + (Math.random() < 0.5 ? 1 : -1);
                        }

                        // Wrap
                        const tilesX = Math.ceil(this.width / (this.tileWidth * this.scale));
                        const tilesY = Math.ceil(this.height / (this.tileHeight * this.scale));
                        tile.tileX = ((tile.tileX % tilesX) + tilesX) % tilesX;
                        tile.tileY = ((tile.tileY % tilesY) + tilesY) % tilesY;
                    }
                }
            }
        }
    }

    render(): Container {
        this.container.removeChildren();

        const g = new Graphics();

        // Base background
        g.rect(0, 0, this.width, this.height);
        g.fill({ color: this.baseColor });

        // Scrolling grid pattern
        const gridSize = 32;
        const scrollOffX = this.bgScrollX % gridSize;
        const scrollOffY = this.bgScrollY % gridSize;

        g.setStrokeStyle({ color: 0x001133, width: 0.5 });
        for (let x = -gridSize + scrollOffX; x < this.width + gridSize; x += gridSize) {
            g.moveTo(x, 0);
            g.lineTo(x, this.height);
        }
        for (let y = -gridSize + scrollOffY; y < this.height + gridSize; y += gridSize) {
            g.moveTo(0, y);
            g.lineTo(this.width, y);
        }

        // Glow tiles
        for (const tile of this.tiles) {
            if (!tile.started) continue;

            const px = tile.tileX * this.tileWidth * this.scale;
            const py = tile.tileY * this.tileHeight * this.scale;

            // Intensity based on frame position
            const progress = tile.frame / this.tileFrames;
            const intensity = Math.sin(progress * Math.PI); // 0 → 1 → 0
            const alpha = intensity * 0.3;

            // Outer glow
            const glowRadius = this.tileWidth * this.scale * 1.5;
            g.circle(px + this.tileWidth, py + this.tileHeight, glowRadius);
            g.fill({ color: 0x0044aa, alpha });

            // Inner bright spot
            g.circle(px + this.tileWidth, py + this.tileHeight, glowRadius * 0.3);
            g.fill({ color: 0x0088ff, alpha: alpha * 2 });
        }

        this.container.addChild(g);
        return this.container;
    }

    getContainer(): Container { return this.container; }
    setSize(w: number, h: number): void { this.width = w; this.height = h; }

    destroy(): void {
        this.container.destroy({ children: true });
    }
}
