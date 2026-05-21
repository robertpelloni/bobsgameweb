/**
 * CanvasTileRenderer — Efficient tile rendering using offscreen Canvas
 *
 * Instead of creating thousands of individual Sprite objects,
 * this draws tiles directly to a Canvas2D and creates a single texture.
 * Supports viewport-based rendering for huge maps.
 */
import { Texture, Container, Sprite } from 'pixi.js';
import { MapData } from '../../../shared/MapData';
import { RealTileset } from './RealTileset';

const TILE_SIZE = 8;
const VIEWPORT_PADDING = 4;
const ATLAS_COLS = 256;
const MAX_TILE = 83392;

export class CanvasTileRenderer {
  private realTileset: RealTileset;
  private atlasCanvas: HTMLCanvasElement | null = null;
  private atlasCtx: CanvasRenderingContext2D | null = null;
  private layerTextures: Map<number, Texture> = new Map();
  private layerSprites: Map<number, Sprite> = new Map();
  private container: Container;
  private lastRenderedCenter = { x: -999, y: -999 };

  constructor(container: Container, realTileset: RealTileset) {
    this.container = container;
    this.realTileset = realTileset;
  }

  async init(): Promise<void> {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/tileset_atlas_real.png';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
    });
    this.atlasCanvas = document.createElement('canvas');
    this.atlasCanvas.width = img.width;
    this.atlasCanvas.height = img.height;
    this.atlasCtx = this.atlasCanvas.getContext('2d')!;
    this.atlasCtx.drawImage(img, 0, 0);
  }

  renderViewport(
    mapData: MapData,
    centerX: number,
    centerY: number,
    screenWidth: number,
    screenHeight: number,
    zoom: number,
    force: boolean = false
  ): void {
    if (!this.atlasCtx || !this.realTileset.loaded) return;

    const tileCX = Math.floor(centerX / TILE_SIZE);
    const tileCY = Math.floor(centerY / TILE_SIZE);

    const dx = Math.abs(tileCX - this.lastRenderedCenter.x);
    const dy = Math.abs(tileCY - this.lastRenderedCenter.y);
    if (!force && dx < VIEWPORT_PADDING && dy < VIEWPORT_PADDING) return;

    this.lastRenderedCenter = { x: tileCX, y: tileCY };

    const viewWidthTiles = Math.ceil(screenWidth / (TILE_SIZE * zoom)) + VIEWPORT_PADDING * 2;
    const viewHeightTiles = Math.ceil(screenHeight / (TILE_SIZE * zoom)) + VIEWPORT_PADDING * 2;
    const startX = Math.max(0, tileCX - Math.floor(viewWidthTiles / 2));
    const startY = Math.max(0, tileCY - Math.floor(viewHeightTiles / 2));
    const endX = Math.min(mapData.widthTiles1X, startX + viewWidthTiles);
    const endY = Math.min(mapData.heightTiles1X, startY + viewHeightTiles);
    const renderW = endX - startX;
    const renderH = endY - startY;

    const renderableLayers = [
      MapData.MAP_GROUND_LAYER,
      MapData.MAP_GROUND_DETAIL_LAYER,
      MapData.MAP_OBJECT_LAYER,
      MapData.MAP_OBJECT_DETAIL_LAYER,
      MapData.MAP_ABOVE_LAYER,
      MapData.MAP_ABOVE_DETAIL_LAYER,
    ];

    for (const layerIdx of renderableLayers) {
      let hasContent = false;
      const canvas = document.createElement('canvas');
      canvas.width = renderW * TILE_SIZE;
      canvas.height = renderH * TILE_SIZE;
      const ctx = canvas.getContext('2d')!;

      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const tileId = mapData.getTileIndex(layerIdx, x, y);
          if (tileId === 0 || tileId >= MAX_TILE) continue;
          if (layerIdx === MapData.MAP_GROUND_LAYER && tileId === 1) continue;

          // Direct tile ID -> atlas position
          const srcCol = (tileId % ATLAS_COLS) * TILE_SIZE;
          const srcRow = Math.floor(tileId / ATLAS_COLS) * TILE_SIZE;
          const dstX = (x - startX) * TILE_SIZE;
          const dstY = (y - startY) * TILE_SIZE;

          ctx.drawImage(
            this.atlasCanvas!,
            srcCol, srcRow, TILE_SIZE, TILE_SIZE,
            dstX, dstY, TILE_SIZE, TILE_SIZE
          );
          hasContent = true;
        }
      }

      if (hasContent) {
        let tex = this.layerTextures.get(layerIdx);
        if (tex) tex.destroy(true);
        tex = Texture.from(canvas);
        this.layerTextures.set(layerIdx, tex);

        let sprite = this.layerSprites.get(layerIdx);
        if (!sprite) {
          sprite = new Sprite(tex);
          sprite.x = startX * TILE_SIZE;
          sprite.y = startY * TILE_SIZE;
          this.container.addChild(sprite);
          this.layerSprites.set(layerIdx, sprite);
        } else {
          sprite.texture = tex;
          sprite.x = startX * TILE_SIZE;
          sprite.y = startY * TILE_SIZE;
        }

        if (layerIdx === MapData.MAP_GROUND_DETAIL_LAYER || layerIdx === MapData.MAP_ABOVE_DETAIL_LAYER) {
          sprite.alpha = 0.7;
        }
      }
    }
  }

  destroy(): void {
    for (const tex of this.layerTextures.values()) tex.destroy(true);
    this.layerTextures.clear();
    this.layerSprites.clear();
    this.container.removeChildren();
  }
}
