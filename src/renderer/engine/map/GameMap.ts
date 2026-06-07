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
 * Shadow rendering — per-layer shadow containers:
 *
 * In the Java engine, the layers form two chunk groups:
 *   chunkLayer 0: ground, groundObjects, groundShadow, objects, objects2, objectShadow
 *   chunkLayer 1: above, above2, spriteShadow
 *
 * Each chunk group is composited, then black pixels in the composite
 * get shadowAlpha (150/255 ≈ 0.59). This means shadow tiles exist on
 * ANY layer within a chunk group — they're the all-black silhouettes
 * that become translucent.
 *
 * Our approach: for each layer, check if it's "shadow-dominant" (>50%
 * of non-839 tile placements are black). If so, its black tiles go
 * into a shadow sub-container at the SAME z-index as the layer, with
 * alpha 0.59. Colored tiles on any layer render normally.
 *
 * Data across 257 maps:
 *   "above" (L6):    83% of maps are all-black → shadow dominant
 *   "objects" (L3):  23% all-black → shadow dominant in those maps
 *   "objectShadow":  only 27% all-black
 *   "groundShadow":  EMPTY across all maps
 *   "spriteShadow":  only 4% all-black
 *   "ground":        <1% all-black → never shadow dominant
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

  /** Per-layer shadow sub-containers (only created for shadow-dominant layers) */
  private shadowContainers: (Container | null)[] = [];
  private shadowTextureCache: Map<number, Texture> = new Map();

  /** Per-layer flag: true if this layer is shadow-dominant for this map */
  private layerIsShadowDominant: boolean[] = [];

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

    const Z_MAP: Record<number, number> = {
      [MapData.MAP_GROUND_LAYER]: 0,
      [MapData.MAP_GROUND_DETAIL_LAYER]: 1,
      [MapData.MAP_GROUND_SHADOW_LAYER]: 2,
      [MapData.MAP_OBJECT_LAYER]: 3,
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

      // Shadow sub-container for this layer (created but only populated
      // when the layer is shadow-dominant). Shares the SAME z-index
      // so shadows render at the correct depth relative to other layers.
      const shadow = new Container();
      shadow.zIndex = Z_MAP[i] ?? i;
      shadow.cullable = false;
      shadow.sortableChildren = false;
      shadow.alpha = 0.59; // Java shadowAlpha = 150/255
      shadow.visible = false; // hidden until we know this layer is shadow-dominant
      this.shadowContainers.push(shadow);
      this.container.addChild(shadow);
    }

    // objects2 container at z=3.5
    this.objectDetailContainer = new Container();
    this.objectDetailContainer.sortableChildren = false;
    this.objectDetailContainer.cullable = false;
    this.objectDetailContainer.zIndex = 3.5;
    this.container.addChild(this.objectDetailContainer);

    // Entity container at z=50
    this.entitySpriteContainer = new Container();
    this.entitySpriteContainer.sortableChildren = true;
    this.entitySpriteContainer.cullable = false;
    this.entitySpriteContainer.zIndex = 50;
    this.container.addChild(this.entitySpriteContainer);
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

  /**
   * Analyze each layer's content to determine if it's shadow-dominant.
   * A layer is shadow-dominant if >50% of its non-zero, non-839 tile
   * placements are all-black tiles.
   */
  private analyzeLayerShadowDominance(): void {
    this.layerIsShadowDominant = new Array(MapData.layers).fill(false);
    if (!this.realTileset || !this.realTileset.loaded) return;

    for (let l = 0; l < MapData.layers; l++) {
      if (!MapData.isTileLayer(l)) continue;
      if (
        l === MapData.MAP_HIT_LAYER ||
        l === MapData.MAP_CAMERA_BOUNDS_LAYER ||
        l === MapData.MAP_ENTITY_LAYER
      )
        continue;

      let blackCount = 0;
      let totalCount = 0;
      const totalTiles = this.data.widthTiles1X * this.data.heightTiles1X;

      let startX = 0, startY = 0;
      let endX = this.data.widthTiles1X, endY = this.data.heightTiles1X;
      if (totalTiles > 10000) {
        const cx = this.initialSpawnX > 0
          ? Math.floor(this.initialSpawnX / 8)
          : Math.floor(this.data.widthTiles1X / 2);
        const cy = this.initialSpawnY > 0
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
          if (tileId === 0 || tileId === 839) continue;
          totalCount++;
          if (this.realTileset.isBlackTile(tileId)) blackCount++;
        }
      }

      if (totalCount > 0 && blackCount / totalCount > 0.5) {
        this.layerIsShadowDominant[l] = true;
      }
    }

    const dominantLayers = this.layerIsShadowDominant
      .map((v, i) => v ? `${i}(${MapData.LAYER_NAMES[i] || "?"})` : null)
      .filter(Boolean);
    console.log(
      `[GameMap] Shadow-dominant layers for ${this.data.name}: [${dominantLayers.join(", ")}]`,
    );
  }

  private renderWithRealTileset() {
    this.objectDetailContainer.removeChildren();
    this.shadowTextureCache.clear();

    // Analyze which layers are shadow-dominant for THIS map
    this.analyzeLayerShadowDominance();

    // Reset all shadow containers
    for (let l = 0; l < MapData.layers; l++) {
      this.layers[l].removeChildren();
      const sc = this.shadowContainers[l];
      if (sc) {
        sc.removeChildren();
        sc.visible = this.layerIsShadowDominant[l];
      }
    }

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
    const shadowCounts: string[] = [];
    for (let i = 0; i < MapData.layers; i++) {
      const sc = this.shadowContainers[i];
      if (sc && sc.children.length > 0) {
        shadowCounts.push(`L${i}=${sc.children.length}`);
      }
    }
    console.log(
      `[GameMap] Rendered ${this.data.name}: layers=[${layerCounts.join(", ")}] shadows=[${shadowCounts.join(", ")}] objDetail=${this.objectDetailContainer.children.length}`,
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
    const shadowContainer = this.shadowContainers[l];
    let spriteCount = 0;
    let shadowCount = 0;
    let nullTextureCount = 0;
    const totalTiles = this.data.widthTiles1X * this.data.heightTiles1X;
    const isShadowDominant = this.layerIsShadowDominant[l];

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

        const px = Math.round(x * 8);
        const py = Math.round(y * 8);

        // On shadow-dominant layers: black tiles -> shadow container (alpha 0.59)
        // All other tiles render normally
        if (isShadowDominant && this.realTileset!.isBlackTile(tileId)) {
          const shadowTex = this.getShadowBlackTexture(tileId);
          if (!shadowTex) {
            nullTextureCount++;
            continue;
          }
          const shadowSprite = new Sprite(shadowTex);
          shadowSprite.x = px;
          shadowSprite.y = py;
          shadowContainer!.addChild(shadowSprite);
          shadowCount++;
        } else {
          const texture = this.realTileset!.getTileTexture(tileId);
          if (!texture) {
            nullTextureCount++;
            continue;
          }
          const sprite = new Sprite(texture);
          sprite.x = px;
          sprite.y = py;

          if (l === MapData.MAP_LIGHT_MASK_LAYER) {
            sprite.tint = 0x000000;
          }
          if (l === MapData.MAP_LIGHT_LAYER) {
            sprite.blendMode = "add";
          }

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
        `[GameMap] Layer ${l} (${MapData.LAYER_NAMES[l] || "?"}): ${spriteCount} colored, ${shadowCount} shadow, ${nullTextureCount} null${isShadowDominant ? " [SHADOW-DOM]" : ""}`,
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
    const halfW = Math.ceil(screenW / (8 * zoom * 2)) + 8 + extraMargin;
    const halfH = Math.ceil(screenH / (8 * zoom * 2)) + 8 + extraMargin;

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

    for (const l of renderableLayers) {
      const layer = this.layers[l];
      if (!layer) continue;
      layer.removeChildren();
      const shadowContainer = this.shadowContainers[l];
      if (shadowContainer) {
        shadowContainer.removeChildren();
        shadowContainer.visible = this.layerIsShadowDominant[l] ?? false;
      }
      const isShadowDominant = this.layerIsShadowDominant[l] ?? false;

      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const tileId = this.data.getTileIndex(l, x, y);
          if (tileId === 0) continue;
          if (tileId === 839) continue;

          const px = Math.round(x * 8);
          const py = Math.round(y * 8);

          if (isShadowDominant && this.realTileset!.isBlackTile(tileId)) {
            const shadowTex = this.getShadowBlackTexture(tileId);
            if (!shadowTex) continue;
            const shadowSprite = new Sprite(shadowTex);
            shadowSprite.x = px;
            shadowSprite.y = py;
            shadowContainer!.addChild(shadowSprite);
          } else {
            const texture = this.realTileset!.getTileTexture(tileId);
            if (!texture) continue;
            const sprite = new Sprite(texture);
            sprite.x = px;
            sprite.y = py;

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
