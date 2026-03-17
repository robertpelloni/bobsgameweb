import { MapData } from './MapData';
import { Entity } from '../../entity/Entity';
import { Container, Sprite, Texture } from 'pixi.js';

export class Map {
  public data: MapData;
  public container: Container;
  public bgSprite: Sprite | null = null;
  public fgSprite: Sprite | null = null;
  
  public entities: Entity[] = [];

  constructor(data: MapData) {
    this.data = data;
    this.container = new Container();
    
    // In a real implementation we'd load the textures here
    // this.bgSprite = new Sprite(Texture.from(data.backgroundTextureName));
    // this.container.addChild(this.bgSprite);
  }

  public update(dt: number) {
    for (const entity of this.entities) {
      entity.update(dt);
    }
  }

  public addEntity(entity: Entity) {
    this.entities.push(entity);
    if (entity.sprite) {
      this.container.addChild(entity.sprite);
    }
  }

  public removeEntity(entity: Entity) {
    const index = this.entities.indexOf(entity);
    if (index !== -1) {
      this.entities.splice(index, 1);
      if (entity.sprite) {
        this.container.removeChild(entity.sprite);
      }
    }
  }
}
