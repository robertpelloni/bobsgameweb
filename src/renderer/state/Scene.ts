import { Container, Application } from 'pixi.js';
import { type State } from './StateManager';
import { TweenManager } from '../../shared/Tween';

export interface SceneConfig {
  name: string;
  app: Application;
}

export abstract class Scene implements State {
  readonly name: string;
  protected app: Application;
  protected container: Container;
  protected _paused: boolean = false;

  constructor(config: SceneConfig) {
    this.name = config.name;
    this.app = config.app;
    this.container = new Container();
    this.container.label = config.name;
  }

  async onEnter(): Promise<void> {
    this.app.stage.addChild(this.container);
    await this.create();
  }

  async onExit(): Promise<void> {
    await this.destroy();
    this.container.removeFromParent();
    this.container.destroy({ children: true });
  }

  onPause(): void {
    this._paused = true;
    this.container.visible = false;
  }

  onResume(): void {
    this._paused = false;
    this.container.visible = true;
  }

  update(dt: number): void {
    if (this._paused) return;
    TweenManager.update(dt);
    this.onUpdate(dt);
  }

  render(): void {
    if (this._paused) return;
    this.onRender();
  }

  public abstract create(): void | Promise<void>;

  protected abstract onUpdate(dt: number): void;

  protected onRender(): void {}

  protected async destroy(): Promise<void> {}

  get paused(): boolean {
    return this._paused;
  }

  get stage(): Container {
    return this.container;
  }

  get width(): number {
    return this.app.screen.width;
  }

  get height(): number {
    return this.app.screen.height;
  }

  get centerX(): number {
    return this.width / 2;
  }

  get centerY(): number {
    return this.height / 2;
  }
}
