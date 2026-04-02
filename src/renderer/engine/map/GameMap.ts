import { MapData } from '../../../shared/MapData';
import { Entity } from '../../entity/Entity';
import { Container, Sprite, Texture } from 'pixi.js';
import { Tileset } from '../../../shared/Tileset';
import { Palette } from '../../../shared/Palette';

export class GameMap {
  public data: MapData;
  public container: Container;
  public layers: Container[] = [];
  
  public entities: Entity[] = [];
  private tileTextures: globalThis.Map<number, Texture> = new globalThis.Map();

  constructor(data: MapData) {
    this.data = data;
    this.container = new Container();
    
    for (let i = 0; i < MapData.layers; i++) {
        const layer = new Container();
        this.layers.push(layer);
        this.container.addChild(layer);
    }
  }

  public update(dt: number) {
    for (const entity of this.entities) {
      entity.update(dt);
    }
  }

  public render(tileset: Tileset, palette: Palette) {
      for (let l = 0; l < MapData.layers; l++) {
          if (!MapData.isTileLayer(l)) continue;
          this.renderLayer(l, tileset, palette);
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
              sprite.x = x * 8;
              sprite.y = y * 8;
              layer.addChild(sprite);
          }
      }
  }

  private getTileTexture(tileIndex: number, tileset: Tileset, palette: Palette, layer: number): Texture {
      const cacheKey = tileIndex + (MapData.isTransparentLayer(layer) ? 1000000 : 0);
      if (this.tileTextures.has(cacheKey)) return this.tileTextures.get(cacheKey)!;

      const alpha = MapData.isTransparentLayer(layer) ? 150 : 255;
      const rgba = tileset.getTileRGBA(tileIndex, palette, alpha);
      
      const canvas = document.createElement('canvas');
      canvas.width = 8;
      canvas.height = 8;
      const ctx = canvas.getContext('2d')!;
      const imgData = new ImageData(new Uint8ClampedArray(rgba.buffer) as any, 8, 8);
      ctx.putImageData(imgData, 0, 0);
      
      const texture = Texture.from(canvas);
      this.tileTextures.set(cacheKey, texture);
      return texture;
  }

  public addEntity(entity: Entity) {
    this.entities.push(entity);
    if (entity.sprite) {
      this.layers[MapData.MAP_ENTITY_LAYER].addChild(entity.sprite);
    }
  }

  public removeEntity(entity: Entity) {
    const index = this.entities.indexOf(entity);
    if (index !== -1) {
      this.entities.splice(index, 1);
      if (entity.sprite) {
        this.layers[MapData.MAP_ENTITY_LAYER].removeChild(entity.sprite);
      }
    }
  }
}
