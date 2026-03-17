import { Entity, EntityConfig, Direction } from '../../entity/Entity';

export interface CharacterConfig extends EntityConfig {
  name?: string;
  speed?: number;
}

export class Character extends Entity {
  public name: string;
  public speed: number;
  
  public isMoving: boolean = false;
  
  constructor(config?: CharacterConfig) {
    super(config);
    this.name = config?.name ?? '';
    this.speed = config?.speed ?? 100;
  }
  
  public move(direction: Direction) {
    this.direction = direction;
    this.isMoving = true;
    
    // Convert direction to velocity
    switch (direction) {
      case Direction.UP:
        this.vy = -this.speed;
        this.vx = 0;
        break;
      case Direction.DOWN:
        this.vy = this.speed;
        this.vx = 0;
        break;
      case Direction.LEFT:
        this.vx = -this.speed;
        this.vy = 0;
        break;
      case Direction.RIGHT:
        this.vx = this.speed;
        this.vy = 0;
        break;
      case Direction.UP_LEFT:
        this.vx = -this.speed * 0.707;
        this.vy = -this.speed * 0.707;
        break;
      case Direction.UP_RIGHT:
        this.vx = this.speed * 0.707;
        this.vy = -this.speed * 0.707;
        break;
      case Direction.DOWN_LEFT:
        this.vx = -this.speed * 0.707;
        this.vy = this.speed * 0.707;
        break;
      case Direction.DOWN_RIGHT:
        this.vx = this.speed * 0.707;
        this.vy = this.speed * 0.707;
        break;
    }
  }
  
  public stop() {
    this.isMoving = false;
    this.vx = 0;
    this.vy = 0;
  }
  
  public override update(dt: number) {
    if (this.isMoving) {
      this.x += this.vx * (dt / 1000);
      this.y += this.vy * (dt / 1000);
    }
  }
}
