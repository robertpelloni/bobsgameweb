import { MapData } from "../../../shared/MapData";
import type { Entity } from "../../entity/Entity";
import { Container, Sprite, Texture } from "pixi.js";
import { Tileset } from "../../../shared/Tileset";
import type { Palette } from "../../../shared/Palette";
import type { RealTileset } from "./RealTileset";

export interface CameraBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Per-tile shadow rendering:
 *
 * In the Java engine, each "chunkLayer" was composited, then black pixels
 * within the composite were rendered translucently (shadowAlpha = 150/255).
 * This means shadow tiles (all-black shapes) appear on MANY layers, not
 * just the ones named "objectShadow" or "spriteShadow". For example, the
 * "objects" layer is 72% black tiles (shadow shapes of furniture).
 *
 * Our approach: for EVERY tile on EVERY layer, check if it's an all-black
 * shape (via RealTileset.isBlackTile). If yes, render it with the
 * shadow-black atlas into a shared shadowOverlay container at alpha 0.59.
 * Colored tiles render normally with the real atlas.
 *
 * objects2 (L4): Rendered in objectDetailContainer ABOVE objects layer.
 * Uses real atlas for colored tiles, shadow-black for black tiles.
 */
export class GameMap {
  public data: MapData;
  public container: Container;
  public objectDetailContainer!: Container;
  public entitySpriteContainer!: Container;
  public layers: Container[] = [];
  public entities: Entity[] = [];
  private tileTextures: globalThis.Map<number, Texture> = new globalThis.Map();
  private realTileset: RealTileset | null = null;

  // Shadow overlay: all-black tiles from ANY layer go here at alpha 0.59
  private shadowOverlay!: Container;
  private shadowTextureCache: Map<number, Texture> = new Map();

  // Camera
  public camX = 0;
  public camY = 0;
  private lastViewportCX = -999;
  private lastViewportCY = -999;
  private isLargeMap: boolean = false;
  private initialSpawnX: number = -1;
  private initialSpawnY: number = -1;

  constructor(data: MapData, realTileset?: RealTileset) {
    this.data = data;
    this.realTileset = realTileset ?? null;
    this.container = new Container();
    this.container.sortableChildren = true;
    this.container.cullable = false;
    this.isLargeMap = data.widthTiles1X * data.heightTiles1X > 50000;

    // Z-order: ground(0) < groundDetail(1) < groundShadow(2)
    // < objects(3) < objects2(3.5) < objectShadow(4) < entities(50)
    // < above(100) < aboveDetail(101) < spriteShadow(102)
    const Z_MAP: Record<number, number> = {
      [MapData.MAP_GROUND_LAYER]: 0,
      [MapData.MAP_GROUND_DETAIL_LAYER]: 1,
      [MapData.MAP_GROUND_SHADOW_LAYER]: 2,
      [MapData.MAP_OBJECT_LAYER]: 3,
      // objects2 in objectDetailContainer at z=3.5
      [MapData.MAP_OBJECT_SHADOW_LAYER]: 4,
      [MapData.MAP_ABOVE_LAYER]: 100,
      [MapData.MAP_ABOVE_DETAIL_LAYER]: 101,
      [MapData.MAP_SPRITE_SHADOW_LAYER]: 102,
      [MapData.MAP_HIT_LAYER]: 200,
      [MapData.MAP_LIGHT_MASK_LAYER]: 150,
      [MapData.MAP_CAMERA_BOUNDS_LAYER]: 201,
      [MapData.MAP_ENTITY_LAYER]: 202,
      [MapData.MAP_LIGHT_LAYER]: 160,
    };

    for (let i = 0; i < MapData.layers; i++) {
      const layer = new Container();
      layer.zIndex = Z_MAP[i] ?? i;
      layer.cullable = false;
      layer.sortableChildren = false;
      this.layers.push(layer);
      this.container.addChild(layer);
    }

    // objects2 container: z=3.5, ABOVE objects (z=3) so curtains/overlays
    // always render on top of furniture.
    this.objectDetailContainer = new Container();
    this.objectDetailContainer.sortableChildren = false;
    this.objectDetailContainer.cullable = false;
    this.objectDetailContainer.zIndex = 3.5;
    this.container.addChild(this.objectDetailContainer);

    // Entity container: Y-sorted sprites
    this.entitySpriteContainer = new Container();
    this.entitySpriteContainer.sortableChildren = true;
    this.entitySpriteContainer.cullable = false;
    this.entitySpriteContainer.zIndex = 50;
    this.container.addChild(this.entitySpriteContainer);

    // Shadow overlay: all-black tiles from ANY layer render here at alpha 0.59
    // Matches Java shadowAlpha = 150/255
    this.shadowOverlay = new Container();
    this.shadowOverlay.sortableChildren = true;
    this.shadowOverlay.cullable = false;
    this.shadowOverlay.alpha = 0.59;
    this.shadowOverlay.zIndex = 500;
    this.container.addChild(this.shadowOverlay);
  }

  getCameraOffset(): { x: number; y: number } {
    return { x: this.camX, y: this.camY };
  }

  public update(dt: number) {
    for (const entity of this.entities) {
      entity.update(dt);
    }
  }

  public render(tileset: Tileset, palette: Palette) {
    if (this.realTileset && this.realTileset.loaded) {
      this.renderWithRealTileset();
    } else {
      for (let l = 0; l < MapData.layers; l++) {
        if (!MapData.isTileLayer(l)) continue;
        if (
          l === MapData.MAP_HIT_LAYER ||
          l === MapData.MAP_CAMERA_BOUNDS_LAYER
        )
          continue;
        this.renderLayer(l, tileset, palette);
      }
    }
  }

  private renderWithRealTileset() {
    this.objectDetailContainer.removeChildren();
    this.shadowOverlay.removeChildren();
    this.shadowTextureCache.clear();

    for (let l = 0; l < MapData.layers; l++) {
      if (!MapData.isTileLayer(l)) continue;
      if (
        l === MapData.MAP_HIT_LAYER ||
        l === MapData.MAP_CAMERA_BOUNDS_LAYER ||
        l === MapData.MAP_ENTITY_LAYER
      )
        continue;
      this.renderLayerReal(l);
    }

    const layerCounts: string[] = [];
    for (let i = 0; i < MapData.layers; i++) {
      if (this.layers[i] && this.layers[i].children.length > 0) {
        layerCounts.push(`L${i}=${this.layers[i].children.length}`);
      }
    }
    console.log(
      `[GameMap] Rendered ${this.data.name}: BUILD=${(this.realTileset as any)?.constructor?.BUILD_VER} layers=[${layerCounts.join(", ")}] objDetail=${this.objectDetailContainer.children.length} shadows=${this.shadowOverlay.children.length}`,
    );
    this.container.sortChildren();
  }

  /** Get shadow-black atlas texture for a tile (cached) */
  private getShadowBlackTexture(tileId: number): Texture | null {
    if (this.shadowTextureCache.has(tileId)) {
      return this.shadowTextureCache.get(tileId)!;
    }
    const tex = this.realTileset!.getShadowBlackTileTexture(tileId);
    if (tex) {
      this.shadowTextureCache.set(tileId, tex);
    }
    return tex;
  }

  private renderLayerReal(l: number) {
    const layer = this.layers[l];
    layer.removeChildren();
    let spriteCount = 0;
    let shadowCount = 0;
    let nullTextureCount = 0;
    const totalTiles = this.data.widthTiles1X * this.data.heightTiles1X;

    let startX = 0,
      startY = 0,
      endX = this.data.widthTiles1X,
      endY = this.data.heightTiles1X;

    if (totalTiles > 10000) {
      const cx =
        this.initialSpawnX > 0
          ? Math.floor(this.initialSpawnX / 8)
          : Math.floor(this.data.widthTiles1X / 2);
      const cy =
        this.initialSpawnY > 0
          ? Math.floor(this.initialSpawnY / 8)
          : Math.floor(this.data.heightTiles1X / 2);
      const radius = totalTiles > 100000 ? 40 : 60;
      startX = Math.max(0, cx - radius);
      startY = Math.max(0, cy - radius);
      endX = Math.min(this.data.widthTiles1X, cx + radius);
      endY = Math.min(this.data.heightTiles1X, cy + radius);
    }

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const tileId = this.data.getTileIndex(l, x, y);
        if (tileId === 0) continue;
        if (tileId === 839) continue;

        const skipFactor = totalTiles > 50000 ? 2 : 1;
        if (
          skipFactor > 1 &&
          l === MapData.MAP_GROUND_DETAIL_LAYER &&
          (x + y) % skipFactor !== 0
        )
        continue;
        if (
          skipFactor > 1 &&
          l === MapData.MAP_OBJECT_DETAIL_LAYER &&
          (x + y) % skipFactor !== 0
        )
        continue;

        // Per-tile shadow routing: black tiles -> shadowOverlay, colored -> normal layer
        const isBlack = this.realTileset!.isBlackTile(tileId);

        if (isBlack) {
          // Shadow tile: use shadow-black atlas, add to shadowOverlay
          const shadowTex = this.getShadowBlackTexture(tileId);
          if (!shadowTex) {
            nullTextureCount++;
            continue;
          }
          const shadowSprite = new Sprite(shadowTex);
          shadowSprite.x = Math.round(x * 8);
          shadowSprite.y = Math.round(y * 8);
          // Preserve z-order relative to source layer
          shadowSprite.zIndex = layer.zIndex;
          this.shadowOverlay.addChild(shadowSprite);
          shadowCount++;
        } else {
          // Colored tile: use real atlas, add to normal layer container
          const texture = this.realTileset!.getTileTexture(tileId);
          if (!texture) {
            nullTextureCount++;
            continue;
          }
          const sprite = new Sprite(texture);
          sprite.x = Math.round(x * 8);
          sprite.y = Math.round(y * 8);

          if (l === MapData.MAP_LIGHT_MASK_LAYER) {
            sprite.tint = 0x000000;
          }
          if (l === MapData.MAP_LIGHT_LAYER) {
            sprite.blendMode = "add";
          }

          // objects2 -> objectDetailContainer (z=3.5, above ALL objects)
          if (l === MapData.MAP_OBJECT_DETAIL_LAYER) {
            (sprite as any)._isTileSprite = true;
            this.objectDetailContainer.addChild(sprite);
          } else {
            layer.addChild(sprite);
          }
          spriteCount++;
        }
      }
    }

    if (spriteCount > 0 || shadowCount > 0 || nullTextureCount > 0) {
      console.log(
        `[GameMap] Layer ${l} (${MapData.LAYER_NAMES[l] || "?"}): ${spriteCount} colored, ${shadowCount} shadow, ${nullTextureCount} null`,
      );
    }
  }

  public renderLayer(l: number, tileset: Tileset, palette: Palette) {
    const layer = this.layers[l];
    layer.removeChildren();

    for (let y = 0; y < this.data.heightTiles1X; y++) {
      for (let x = 0; x < this.data.widthTiles1X; x++) {
        const tileIndex = this.data.getTileIndex(l, x, y);
        if (tileIndex === 0) continue;
        const texture = this.getTileTexture(tileIndex, tileset, palette, l);
        const sprite = new Sprite(texture);
        sprite.x = x * Tileset.TILE_SIZE;
        sprite.y = y * Tileset.TILE_SIZE;
        layer.addChild(sprite);
      }
    }
  }

  private getTileTexture(
    tileIndex: number,
    tileset: Tileset,
    palette: Palette,
    layer: number,
  ): Texture {
    const cacheKey =
      tileIndex + (MapData.isTransparentLayer(layer) ? 1000000 : 0);
    if (this.tileTextures.has(cacheKey))
      return this.tileTextures.get(cacheKey)!;
    const alpha = MapData.isTransparentLayer(layer) ? 150 : 255;
    const rgba = tileset.getTileRGBA(tileIndex, palette, alpha);
    const canvas = document.createElement("canvas");
    canvas.width = 8;
    canvas.height = 8;
    const ctx = canvas.getContext("2d")!;
    const imgData = new ImageData(new Uint8ClampedArray(rgba), 8, 8);
    ctx.putImageData(imgData, 0, 0);
    const texture = Texture.from(canvas);
    this.tileTextures.set(cacheKey, texture);
    return texture;
  }

  public addEntity(entity: Entity) {
    this.entities.push(entity);
    if (entity.sprite) {
      this.entitySpriteContainer.addChild(entity.sprite);
    }
  }

  public removeEntity(entity: Entity) {
    const index = this.entities.indexOf(entity);
    if (index !== -1) {
      this.entities.splice(index, 1);
      if (entity.sprite) {
        this.entitySpriteContainer.removeChild(entity.sprite);
      }
    }
  }

  public setSpawnPosition(px: number, py: number): void {
    this.initialSpawnX = px;
    this.initialSpawnY = py;
  }

  public renderViewportAround(
    centerX: number,
    centerY: number,
    screenW: number,
    screenH: number,
    zoom: number,
  ): void {
    if (!this.isLargeMap || !this.realTileset?.loaded) return;

    const tileCX = Math.floor(centerX / 8);
    const tileCY = Math.floor(centerY / 8);
    if (
      Math.abs(tileCX - this.lastViewportCX) < 3 &&
      Math.abs(tileCY - this.lastViewportCY) < 3
    )
      return;
    this.lastViewportCX = tileCX;
    this.lastViewportCY = tileCY;

    const extraMargin = 16;
    const halfW =
      Math.ceil(screenW / (8 * zoom * 2)) + 8 + extraMargin;
    const halfH =
      Math.ceil(screenH / (8 * zoom * 2)) + 8 + extraMargin;

    const startX = Math.max(0, tileCX - halfW);
    const startY = Math.max(0, tileCY - halfH);
    const endX = Math.min(this.data.widthTiles1X, tileCX + halfW);
    const endY = Math.min(this.data.heightTiles1X, tileCY + halfH);

    const renderableLayers = [
      MapData.MAP_GROUND_LAYER,
      MapData.MAP_GROUND_DETAIL_LAYER,
      MapData.MAP_GROUND_SHADOW_LAYER,
      MapData.MAP_OBJECT_LAYER,
      MapData.MAP_OBJECT_DETAIL_LAYER,
      MapData.MAP_OBJECT_SHADOW_LAYER,
      MapData.MAP_ABOVE_LAYER,
      MapData.MAP_ABOVE_DETAIL_LAYER,
      MapData.MAP_SPRITE_SHADOW_LAYER,
      MapData.MAP_LIGHT_MASK_LAYER,
      MapData.MAP_LIGHT_LAYER,
      MapData.MAP_DOOR_LAYER,
    ];

    // Clean up tile sprites from detail and entity containers
    const detailTiles: any[] = [];
    for (const child of this.objectDetailContainer.children) {
      if ((child as any)._isTileSprite) detailTiles.push(child);
    }
    for (const s of detailTiles) this.objectDetailContainer.removeChild(s);

    const entityTiles: any[] = [];
    for (const child of this.entitySpriteContainer.children) {
      if ((child as any)._isTileSprite) entityTiles.push(child);
    }
    for (const s of entityTiles) this.entitySpriteContainer.removeChild(s);

    // Clear shadow overlay for re-render
    this.shadowOverlay.removeChildren();

    for (const l of renderableLayers) {
      const layer = this.layers[l];
      if (!layer) continue;
      layer.removeChildren();

      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const tileId = this.data.getTileIndex(l, x, y);
          if (tileId === 0) continue;
          if (tileId === 839) continue;

          const isBlack = this.realTileset!.isBlackTile(tileId);

          if (isBlack) {
            // Shadow tile -> shadowOverlay
            const shadowTex = this.getShadowBlackTexture(tileId);
            if (!shadowTex) continue;
            const shadowSprite = new Sprite(shadowTex);
            shadowSprite.x = Math.round(x * 8);
            shadowSprite.y = Math.round(y * 8);
            shadowSprite.zIndex = layer.zIndex;
            this.shadowOverlay.addChild(shadowSprite);
          } else {
            // Colored tile -> normal layer
            const texture = this.realTileset!.getTileTexture(tileId);
            if (!texture) continue;
            const sprite = new Sprite(texture);
            sprite.x = Math.round(x * 8);
            sprite.y = Math.round(y * 8);

            if (l === MapData.MAP_LIGHT_MASK_LAYER) sprite.tint = 0x000000;
            if (l === MapData.MAP_LIGHT_LAYER) sprite.blendMode = "add";

            if (l === MapData.MAP_OBJECT_DETAIL_LAYER) {
              (sprite as any)._isTileSprite = true;
              this.objectDetailContainer.addChild(sprite);
            } else {
              layer.addChild(sprite);
            }
          }
        }
      }
    }
  }
}
