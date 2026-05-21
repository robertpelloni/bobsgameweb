/**
 * RealTileset — Loads the actual binary-extracted tileset atlas.
 * The atlas is laid out at NATIVE tile ID positions:
 *   col = tileId % 256, row = tileId / 256
 * The tileset_atlas_map.json records which tile IDs have data
 * (sparse — only 8,128 out of 83,392 possible tiles exist).
 * Uses canvas-based tile extraction to avoid UV batching issues.
 */
import { Texture } from 'pixi.js';

export class RealTileset {
  private atlasCanvas: HTMLCanvasElement | null = null;
  private atlasCtx: CanvasRenderingContext2D | null = null;
  private tileTextureCache: Map<number, Texture> = new Map();
  private validTileIds: Set<number> = new Set();
  private readonly COLS = 256;
  private readonly TILE_SIZE = 8;
  private _loaded: boolean = false;

  get loaded(): boolean { return this._loaded; }

  async load(): Promise<void> {
    try {
      // Load atlas map to know which tile IDs actually have data
      const mapResp = await fetch('/tileset_atlas_map.json');
      if (mapResp.ok) {
        const atlasMap = await mapResp.json();
        for (const tid of atlasMap.tileIds) {
          this.validTileIds.add(tid);
        }
        console.log(`[RealTileset] Atlas map: ${this.validTileIds.size} valid tile IDs`);
      } else {
        console.warn('[RealTileset] Could not load atlas map — all tileIds assumed valid');
      }

      // Load atlas as Image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = '/tileset_atlas_real.png';
      });

      // Draw to canvas for pixel extraction
      this.atlasCanvas = document.createElement('canvas');
      this.atlasCanvas.width = img.width;
      this.atlasCanvas.height = img.height;
      this.atlasCtx = this.atlasCanvas.getContext('2d', { willReadFrequently: true })!;
      this.atlasCtx.drawImage(img, 0, 0);
      this._loaded = true;
      console.log(`[RealTileset] Loaded atlas: ${img.width}x${img.height}, layout: native tileId positions`);
    } catch (e) {
      console.warn('[RealTileset] Failed to load atlas:', e);
    }
  }

  getTileTexture(tileId: number): Texture | null {
    if (tileId === 0 || !this.atlasCtx) return null;
    // Skip tiles not in the atlas map (no pixel data)
    if (this.validTileIds.size > 0 && !this.validTileIds.has(tileId)) return null;
    if (this.tileTextureCache.has(tileId)) return this.tileTextureCache.get(tileId)!;

    // Native layout: col = tileId % 256, row = tileId / 256
    const col = tileId % this.COLS;
    const row = Math.floor(tileId / this.COLS);

    const x = col * this.TILE_SIZE;
    const y = row * this.TILE_SIZE;

    // Check bounds
    if (x + this.TILE_SIZE > (this.atlasCanvas?.width ?? 0) ||
        y + this.TILE_SIZE > (this.atlasCanvas?.height ?? 0)) {
      return null;
    }

    // Extract 8x8 pixels
    const imageData = this.atlasCtx.getImageData(x, y, this.TILE_SIZE, this.TILE_SIZE);

    // Skip fully transparent tiles
    let hasPixels = false;
    for (let i = 3; i < imageData.data.length; i += 4) {
      if (imageData.data[i] > 0) { hasPixels = true; break; }
    }
    if (!hasPixels) return null;

    // Create small canvas
    const tileCanvas = document.createElement('canvas');
    tileCanvas.width = this.TILE_SIZE;
    tileCanvas.height = this.TILE_SIZE;
    const ctx = tileCanvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);

    // Create texture
    const tex = Texture.from(tileCanvas);
    (tex.source as any).scaleMode = 'nearest';
    this.tileTextureCache.set(tileId, tex);
    return tex;
  }

  hasTile(tileId: number): boolean {
    return tileId > 0 && this.validTileIds.has(tileId) && !!this.atlasCanvas;
  }

  destroy(): void {
    for (const t of this.tileTextureCache.values()) t.destroy(true);
    this.tileTextureCache.clear();
    this.atlasCanvas = null;
    this.atlasCtx = null;
    this._loaded = false;
  }
}
