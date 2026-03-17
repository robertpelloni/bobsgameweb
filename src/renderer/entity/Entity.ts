import { EventEmitter } from 'eventemitter3';
import { Container, Sprite } from 'pixi.js';

export interface EntityEvents {
  'update': (dt: number) => void;
  'destroy': () => void;
  'position:change': (x: number, y: number) => void;
  'velocity:change': (vx: number, vy: number) => void;
}

export enum Direction {
  DOWN = 0,
  UP = 1,
  LEFT = 2,
  RIGHT = 3,
  DOWN_LEFT = 4,
  DOWN_RIGHT = 5,
  UP_LEFT = 6,
  UP_RIGHT = 7,
}

export interface EntityConfig {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  alpha?: number;
  scale?: number;
  visible?: boolean;
  zIndex?: number;
}

export abstract class Entity extends EventEmitter<EntityEvents> {
  protected container: Container;
  protected _sprite: Sprite | null = null;

  get sprite(): Sprite | null {
    return this._sprite;
  }

  protected _x: number = 0;
  protected _y: number = 0;
  protected _width: number = 0;
  protected _height: number = 0;

  protected vx: number = 0;
  protected vy: number = 0;

  protected _alpha: number = 1;
  protected _scale: number = 1;
  protected _visible: boolean = true;
  protected _zIndex: number = 0;

  protected direction: Direction = Direction.DOWN;

  protected destroyed: boolean = false;

  constructor(config?: EntityConfig) {
    super();
    this.container = new Container();

    if (config) {
      this._x = config.x ?? 0;
      this._y = config.y ?? 0;
      this._width = config.width ?? 0;
      this._height = config.height ?? 0;
      this._alpha = config.alpha ?? 1;
      this._scale = config.scale ?? 1;
      this._visible = config.visible ?? true;
      this._zIndex = config.zIndex ?? 0;
    }

    this.syncContainerTransform();
  }

  // ============================================================
  // Position
  // ============================================================

  get x(): number {
    return this._x;
  }

  set x(value: number) {
    if (this._x !== value) {
      this._x = value;
      this.container.x = value;
      this.emit('position:change', this._x, this._y);
    }
  }

  get y(): number {
    return this._y;
  }

  set y(value: number) {
    if (this._y !== value) {
      this._y = value;
      this.container.y = value;
      this.emit('position:change', this._x, this._y);
    }
  }

  setPosition(x: number, y: number): void {
    const changed = this._x !== x || this._y !== y;
    this._x = x;
    this._y = y;
    this.container.x = x;
    this.container.y = y;
    if (changed) {
      this.emit('position:change', x, y);
    }
  }

  // ============================================================
  // Velocity
  // ============================================================

  get velocityX(): number {
    return this.vx;
  }

  set velocityX(value: number) {
    if (this.vx !== value) {
      this.vx = value;
      this.emit('velocity:change', this.vx, this.vy);
    }
  }

  get velocityY(): number {
    return this.vy;
  }

  set velocityY(value: number) {
    if (this.vy !== value) {
      this.vy = value;
      this.emit('velocity:change', this.vx, this.vy);
    }
  }

  setVelocity(vx: number, vy: number): void {
    const changed = this.vx !== vx || this.vy !== vy;
    this.vx = vx;
    this.vy = vy;
    if (changed) {
      this.emit('velocity:change', vx, vy);
    }
  }

  // ============================================================
  // Dimensions
  // ============================================================

  get width(): number {
    return this._width;
  }

  set width(value: number) {
    this._width = value;
  }

  get height(): number {
    return this._height;
  }

  set height(value: number) {
    this._height = value;
  }

  // ============================================================
  // Bounds & Collision Helpers
  // ============================================================

  get left(): number {
    return this._x;
  }

  get right(): number {
    return this._x + this._width;
  }

  get top(): number {
    return this._y;
  }

  get bottom(): number {
    return this._y + this._height;
  }

  get centerX(): number {
    return this._x + this._width / 2;
  }

  get centerY(): number {
    return this._y + this._height / 2;
  }

  containsPoint(px: number, py: number): boolean {
    return px >= this.left && px <= this.right && py >= this.top && py <= this.bottom;
  }

  intersects(other: Entity): boolean {
    return this.left < other.right && this.right > other.left && this.top < other.bottom && this.bottom > other.top;
  }

  intersectsRect(x: number, y: number, w: number, h: number): boolean {
    return this.left < x + w && this.right > x && this.top < y + h && this.bottom > y;
  }

  getDistanceTo(other: Entity): number {
    const dx = this.centerX - other.centerX;
    const dy = this.centerY - other.centerY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  getDistanceToPoint(px: number, py: number): number {
    const dx = this.centerX - px;
    const dy = this.centerY - py;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // ============================================================
  // Visual Properties
  // ============================================================

  get alpha(): number {
    return this._alpha;
  }

  set alpha(value: number) {
    this._alpha = Math.max(0, Math.min(1, value));
    this.container.alpha = this._alpha;
  }

  get scale(): number {
    return this._scale;
  }

  set scale(value: number) {
    this._scale = value;
    this.container.scale.set(value);
  }

  get visible(): boolean {
    return this._visible;
  }

  set visible(value: boolean) {
    this._visible = value;
    this.container.visible = value;
  }

  get zIndex(): number {
    return this._zIndex;
  }

  set zIndex(value: number) {
    this._zIndex = value;
    this.container.zIndex = value;
  }

  // ============================================================
  // Direction
  // ============================================================

  getDirection(): Direction {
    return this.direction;
  }

  setDirection(dir: Direction): void {
    this.direction = dir;
  }

  setDirectionToward(targetX: number, targetY: number): void {
    const dx = targetX - this.centerX;
    const dy = targetY - this.centerY;
    const angle = Math.atan2(dy, dx);

    // Convert angle to 8-direction
    const deg = ((angle * 180) / Math.PI + 360) % 360;

    if (deg >= 337.5 || deg < 22.5) {
      this.direction = Direction.RIGHT;
    } else if (deg >= 22.5 && deg < 67.5) {
      this.direction = Direction.DOWN_RIGHT;
    } else if (deg >= 67.5 && deg < 112.5) {
      this.direction = Direction.DOWN;
    } else if (deg >= 112.5 && deg < 157.5) {
      this.direction = Direction.DOWN_LEFT;
    } else if (deg >= 157.5 && deg < 202.5) {
      this.direction = Direction.LEFT;
    } else if (deg >= 202.5 && deg < 247.5) {
      this.direction = Direction.UP_LEFT;
    } else if (deg >= 247.5 && deg < 292.5) {
      this.direction = Direction.UP;
    } else {
      this.direction = Direction.UP_RIGHT;
    }
  }

  // ============================================================
  // Container Access
  // ============================================================

  getContainer(): Container {
    return this.container;
  }

  addToContainer(parent: Container): void {
    parent.addChild(this.container);
  }

  removeFromContainer(): void {
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
  }

  // ============================================================
  // Lifecycle
  // ============================================================

  abstract update(dt: number): void;

  protected applyVelocity(dt: number): void {
    if (this.vx !== 0 || this.vy !== 0) {
      this.setPosition(this._x + this.vx * dt, this._y + this.vy * dt);
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.emit('destroy');
    this.removeFromContainer();
    this.container.destroy({ children: true });
    this.removeAllListeners();
  }

  isDestroyed(): boolean {
    return this.destroyed;
  }

  // ============================================================
  // Private Helpers
  // ============================================================

  private syncContainerTransform(): void {
    this.container.x = this._x;
    this.container.y = this._y;
    this.container.alpha = this._alpha;
    this.container.scale.set(this._scale);
    this.container.visible = this._visible;
    this.container.zIndex = this._zIndex;
  }
}
