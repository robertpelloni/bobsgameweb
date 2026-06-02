/**
 * RealTileset — Loads the actual binary-extracted tileset atlas.
 * The atlas is laid out at NATIVE tile ID positions:
 * col = tileId % 256, row = tileId / 256
 * The tileset_atlas_map.json records which tile IDs have data
 * (sparse — only 8,128 out of 83,392 possible tiles exist).
 * Uses canvas-based tile extraction to avoid UV batching issues.
 */
import { Texture } from "pixi.js";

export class RealTileset {
    static BUILD_VER = "3.0.8";
    private atlasCanvas: HTMLCanvasElement | null = null;
    private atlasCtx: CanvasRenderingContext2D | null = null;
    private tileTextureCache: Map<number, Texture> = new Map();
    private overlayTextureCache: Map<number, Texture> = new Map();
    private validTileIds: Set<number> = new Set();
    private readonly COLS = 256;
    private readonly TILE_SIZE = 8;
    private _loaded: boolean = false;

    get loaded(): boolean {
        return this._loaded;
    }

    async load(): Promise<void> {
        try {
            // Load atlas map to know which tile IDs actually have data
            const mapResp = await fetch("/tileset_atlas_map.json");
            if (mapResp.ok) {
                const atlasMap = await mapResp.json();
                for (const tid of atlasMap.tileIds) {
                    this.validTileIds.add(tid);
                }
                console.log(
                    `[RealTileset] Atlas map: ${this.validTileIds.size} valid tile IDs`,
                );
            } else {
                console.warn(
                    "[RealTileset] Could not load atlas map — all tileIds assumed valid",
                );
            }

            // Load atlas as Image
            const img = new Image();
            img.crossOrigin = "anonymous";
            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = reject;
                img.src = "/tileset_atlas_real.png";
            });

            // Draw to canvas for pixel extraction
            this.atlasCanvas = document.createElement("canvas");
            this.atlasCanvas.width = img.width;
            this.atlasCanvas.height = img.height;
            this.atlasCtx = this.atlasCanvas.getContext("2d", {
                willReadFrequently: true,
            })!;
            this.atlasCtx.drawImage(img, 0, 0);
            this._loaded = true;
            console.log(
                `[RealTileset] Loaded atlas: ${img.width}x${img.height}, layout: native tileId positions`,
            );
        } catch (e) {
            console.warn("[RealTileset] Failed to load atlas:", e);
        }
    }

    /**
     * Get a tile texture for OBJECT and SHADOW layers.
     * (1,1,1) transparency-key pixels are REPLACED with true black (0,0,0)
     * so they render as OPAQUE black — visible as outlines on objects
     * and as shadow pixels on shadow layers (where the layer container
     * alpha makes them translucent).
     * Fully-(1,1,1) tiles (like 839) become all-black and are returned.
     */
    getTileTexture(tileId: number): Texture | null {
        if (tileId === 0 || !this.atlasCtx) return null;
        // Skip tiles not in the atlas map (no pixel data)
        if (this.validTileIds.size > 0 && !this.validTileIds.has(tileId))
            return null;
        if (this.tileTextureCache.has(tileId))
            return this.tileTextureCache.get(tileId)!;

        // Native layout: col = tileId % 256, row = tileId / 256
        const col = tileId % this.COLS;
        const row = Math.floor(tileId / this.COLS);
        const x = col * this.TILE_SIZE;
        const y = row * this.TILE_SIZE;

        // Check bounds
        if (
            x + this.TILE_SIZE > (this.atlasCanvas?.width ?? 0) ||
            y + this.TILE_SIZE > (this.atlasCanvas?.height ?? 0)
        ) {
            return null;
        }

        // Extract 8x8 pixels
        const imageData = this.atlasCtx.getImageData(
            x,
            y,
            this.TILE_SIZE,
            this.TILE_SIZE,
        );

        // Replace (1,1,1) transparency-key pixels with true black (0,0,0).
        // In the extracted atlas, palette index 1 was saved as RGB(1,1,1).
        // In the original Java game, index 1 was transparent, BUT the outlines
        // and shadows that used this palette entry should be visible as black.
        // Replacing with (0,0,0) ensures they render as opaque black pixels
        // that won't be confused with any future transparency processing.
        let hasPixels = false;
        for (let i = 0; i < imageData.data.length; i += 4) {
            const r = imageData.data[i];
            const g = imageData.data[i + 1];
            const b = imageData.data[i + 2];
            const a = imageData.data[i + 3];
            if (a > 0) {
                hasPixels = true;
                if (r <= 2 && g <= 2 && b <= 2) {
                    // (1,1,1) transparency key → true opaque black
                    imageData.data[i] = 0;
                    imageData.data[i + 1] = 0;
                    imageData.data[i + 2] = 0;
                    imageData.data[i + 3] = 255;
                }
            }
        }
        if (!hasPixels) return null;

        // Create small canvas
        const tileCanvas = document.createElement("canvas");
        tileCanvas.width = this.TILE_SIZE;
        tileCanvas.height = this.TILE_SIZE;
        const ctx = tileCanvas.getContext("2d")!;
        ctx.putImageData(imageData, 0, 0);

        // Create texture
        const tex = Texture.from(tileCanvas);
        (tex.source as any).scaleMode = "nearest";
        this.tileTextureCache.set(tileId, tex);
        return tex;
    }

    /**
     * Get a tile texture for OVERLAY layers (groundDetail, aboveDetail).
     * (1,1,1) transparency-key pixels are made TRANSPARENT — these are
     * background/filler areas in overlay tiles (curtains, carpet patterns)
     * that should be see-through. Only the colored foreground pixels remain.
     */
    getOverlayTileTexture(tileId: number): Texture | null {
        if (tileId === 0 || !this.atlasCtx) return null;
        if (this.validTileIds.size > 0 && !this.validTileIds.has(tileId))
            return null;
        if (this.overlayTextureCache.has(tileId))
            return this.overlayTextureCache.get(tileId)!;

        const col = tileId % this.COLS;
        const row = Math.floor(tileId / this.COLS);
        const x = col * this.TILE_SIZE;
        const y = row * this.TILE_SIZE;

        if (
            x + this.TILE_SIZE > (this.atlasCanvas?.width ?? 0) ||
            y + this.TILE_SIZE > (this.atlasCanvas?.height ?? 0)
        ) {
            return null;
        }

        const imageData = this.atlasCtx.getImageData(
            x,
            y,
            this.TILE_SIZE,
            this.TILE_SIZE,
        );

        // Make (1,1,1) pixels transparent — Java transparency key
        let hasVisiblePixels = false;
        for (let i = 0; i < imageData.data.length; i += 4) {
            const r = imageData.data[i];
            const g = imageData.data[i + 1];
            const b = imageData.data[i + 2];
            const a = imageData.data[i + 3];
            if (r <= 2 && g <= 2 && b <= 2 && a > 0) {
                // Near-black pixel (Java transparency key) — make transparent
                imageData.data[i + 3] = 0;
            } else if (a > 0) {
                hasVisiblePixels = true;
            }
        }
        if (!hasVisiblePixels) return null; // Tile was ALL (1,1,1)

        const tileCanvas = document.createElement("canvas");
        tileCanvas.width = this.TILE_SIZE;
        tileCanvas.height = this.TILE_SIZE;
        const ctx = tileCanvas.getContext("2d")!;
        ctx.putImageData(imageData, 0, 0);

        const tex = Texture.from(tileCanvas);
        (tex.source as any).scaleMode = "nearest";
        this.overlayTextureCache.set(tileId, tex);
        return tex;
    }

    hasTile(tileId: number): boolean {
        return (
            tileId > 0 &&
            this.validTileIds.has(tileId) &&
            !!this.atlasCanvas
        );
    }

    destroy(): void {
        for (const t of this.tileTextureCache.values()) t.destroy(true);
        this.tileTextureCache.clear();
        for (const t of this.overlayTextureCache.values()) t.destroy(true);
        this.overlayTextureCache.clear();
        this.atlasCanvas = null;
        this.atlasCtx = null;
        this._loaded = false;
    }
}
