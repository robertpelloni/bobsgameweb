import { Container, Point } from 'pixi.js';

export interface CameraConfig {
  viewportWidth: number;
  viewportHeight: number;
  minZoom?: number;
  maxZoom?: number;
  defaultZoom?: number;
}

export interface CameraTarget {
  x: number;
  y: number;
}

export class Camera {
  private container: Container;
  private _x: number = 0;
  private _y: number = 0;
  private _zoom: number;
  private _targetZoom: number;
  private _viewportWidth: number;
  private _viewportHeight: number;

  private _targets: CameraTarget[] = [];
  private _lerp: number = 0.1;
  private _bounds: { x: number; y: number; width: number; height: number } | null = null;

  readonly minZoom: number;
  readonly maxZoom: number;

  private shakeX: number = 0;
  private shakeY: number = 0;
  private shakeDuration: number = 0;
  private shakeIntensityX: number = 0;
  private shakeIntensityY: number = 0;
  private shakeTimer: number = 0;

  constructor(container: Container, config: CameraConfig) {
    this.container = container;
    this._viewportWidth = config.viewportWidth;
    this._viewportHeight = config.viewportHeight;
    this.minZoom = config.minZoom ?? 0.5;
    this.maxZoom = config.maxZoom ?? 4.0;
    this._zoom = config.defaultZoom ?? 2.0;
    this._targetZoom = this._zoom;
  }

  public addTarget(target: CameraTarget): void {
    this._targets.push(target);
  }

  public removeTarget(target: CameraTarget): void {
    this._targets = this._targets.filter(t => t !== target);
  }

  public setContainer(container: Container): void {
    this.container = container;
  }

  public clearTargets(): void {
    this._targets = [];
  }

  public setBounds(x: number, y: number, width: number, height: number): void {
    this._bounds = { x, y, width, height };
  }

  public setLerp(value: number): void {
    this._lerp = Math.max(0, Math.min(1, value));
  }

  get x(): number {
    return this._x;
  }

  set x(value: number) {
    this._x = value;
    this.updateContainer();
  }

  get y(): number {
    return this._y;
  }

  set y(value: number) {
    this._y = value;
    this.updateContainer();
  }

  get zoom(): number {
    return this._zoom;
  }

  set zoom(value: number) {
    this._zoom = Math.max(this.minZoom, Math.min(this.maxZoom, value));
    this._targetZoom = this._zoom;
    this.updateContainer();
  }

  get targetZoom(): number {
    return this._targetZoom;
  }

  set targetZoom(value: number) {
    this._targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, value));
  }

  get viewportWidth(): number {
    return this._viewportWidth;
  }

  get viewportHeight(): number {
    return this._viewportHeight;
  }

  setPosition(x: number, y: number): void {
    this._x = x;
    this._y = y;
    this.updateContainer();
  }

  centerOn(worldX: number, worldY: number): void {
    this._x = worldX - this._viewportWidth / (2 * this._zoom);
    this._y = worldY - this._viewportHeight / (2 * this._zoom);
    this.updateContainer();
  }

  resize(width: number, height: number): void {
    this._viewportWidth = width;
    this._viewportHeight = height;
    this.updateContainer();
  }

  zoomIn(amount: number = 0.1): void {
    this.targetZoom = this._targetZoom + amount;
  }

  zoomOut(amount: number = 0.1): void {
    this.targetZoom = this._targetZoom - amount;
  }

  setShake(duration: number, intensityX: number, intensityY: number): void {
    this.shakeDuration = duration;
    this.shakeIntensityX = intensityX;
    this.shakeIntensityY = intensityY;
    this.shakeTimer = 0;
  }

  update(deltaMs: number): void {
    const zoomSpeed = 0.1;
    if (Math.abs(this._zoom - this._targetZoom) > 0.001) {
      this._zoom += (this._targetZoom - this._zoom) * zoomSpeed;
    }

    // Follow targets
    if (this._targets.length > 0) {
      let avgX = 0;
      let avgY = 0;
      for (const target of this._targets) {
        avgX += target.x;
        avgY += target.y;
      }
      avgX /= this._targets.length;
      avgY /= this._targets.length;

      const targetCamX = avgX - this._viewportWidth / (2 * this._zoom);
      const targetCamY = avgY - this._viewportHeight / (2 * this._zoom);

      this._x += (targetCamX - this._x) * this._lerp;
      this._y += (targetCamY - this._y) * this._lerp;
    }

    // Apply bounds
    if (this._bounds) {
      const viewWidth = this._viewportWidth / this._zoom;
      const viewHeight = this._viewportHeight / this._zoom;

      if (this._bounds.width > viewWidth) {
        this._x = Math.max(this._bounds.x, Math.min(this._x, this._bounds.x + this._bounds.width - viewWidth));
      } else {
        this._x = this._bounds.x + (this._bounds.width - viewWidth) / 2;
      }

      if (this._bounds.height > viewHeight) {
        this._y = Math.max(this._bounds.y, Math.min(this._y, this._bounds.y + this._bounds.height - viewHeight));
      } else {
        this._y = this._bounds.y + (this._bounds.height - viewHeight) / 2;
      }
    }

    if (this.shakeDuration > 0) {
      this.shakeTimer += deltaMs;
      if (this.shakeTimer < this.shakeDuration) {
        this.shakeX = (Math.random() - 0.5) * 2 * this.shakeIntensityX;
        this.shakeY = (Math.random() - 0.5) * 2 * this.shakeIntensityY;
      } else {
        this.shakeX = 0;
        this.shakeY = 0;
        this.shakeDuration = 0;
      }
    }

    this.updateContainer();
  }

  private updateContainer(): void {
    this.container.scale.set(this._zoom);
    this.container.position.set(
      -this._x * this._zoom + this.shakeX,
      -this._y * this._zoom + this.shakeY
    );
  }

  screenToWorld(screenX: number, screenY: number): Point {
    return new Point(
      this._x + screenX / this._zoom,
      this._y + screenY / this._zoom
    );
  }

  worldToScreen(worldX: number, worldY: number): Point {
    return new Point(
      (worldX - this._x) * this._zoom,
      (worldY - this._y) * this._zoom
    );
  }

  isInView(worldX: number, worldY: number, width: number = 0, height: number = 0): boolean {
    const viewWidth = this._viewportWidth / this._zoom;
    const viewHeight = this._viewportHeight / this._zoom;
    return (
      worldX + width >= this._x &&
      worldX <= this._x + viewWidth &&
      worldY + height >= this._y &&
      worldY <= this._y + viewHeight
    );
  }

  get visibleBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this._x,
      y: this._y,
      width: this._viewportWidth / this._zoom,
      height: this._viewportHeight / this._zoom,
    };
  }
}
