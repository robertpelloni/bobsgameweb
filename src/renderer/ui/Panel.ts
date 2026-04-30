import { Container, Graphics } from 'pixi.js';

export interface PanelStyle {
  width: number;
  height: number;
  backgroundColor?: number;
  backgroundAlpha?: number;
  borderColor?: number;
  borderWidth?: number;
  borderRadius?: number;
  padding?: number;
}

const DEFAULT_PANEL_STYLE: Required<PanelStyle> = {
  width: 300,
  height: 200,
  backgroundColor: 0x222222,
  backgroundAlpha: 0.9,
  borderColor: 0x444444,
  borderWidth: 2,
  borderRadius: 8,
  padding: 16,
};

export class Panel {
  readonly container: Container;
  readonly content: Container;
  private background: Graphics;
  private style: Required<PanelStyle>;

  constructor(style?: Partial<PanelStyle>) {
    this.style = { ...DEFAULT_PANEL_STYLE, ...style };
    this.container = new Container();

    this.background = new Graphics();
    this.container.addChild(this.background);

    this.content = new Container();
    this.content.x = this.style.padding;
    this.content.y = this.style.padding;
    this.container.addChild(this.content);

    this.draw();
  }

  private draw(): void {
    this.background.clear();
    this.background.roundRect(0, 0, this.style.width, this.style.height, this.style.borderRadius);
    this.background.fill({ color: this.style.backgroundColor, alpha: this.style.backgroundAlpha });

    if (this.style.borderWidth > 0) {
      this.background.stroke({ color: this.style.borderColor, width: this.style.borderWidth });
    }
  }

  resize(width: number, height: number): this {
    this.style.width = width;
    this.style.height = height;
    this.draw();
    return this;
  }

  get x(): number {
    return this.container.x;
  }

  set x(value: number) {
    this.container.x = value;
  }

  get y(): number {
    return this.container.y;
  }

  set y(value: number) {
    this.container.y = value;
  }

  get width(): number {
    return this.style.width;
  }

  get height(): number {
    return this.style.height;
  }

  get innerWidth(): number {
    return this.style.width - this.style.padding * 2;
  }

  get innerHeight(): number {
    return this.style.height - this.style.padding * 2;
  }

  get padding(): number {
    return this.style.padding;
  }

  setPosition(x: number, y: number): this {
    this.container.x = x;
    this.container.y = y;
    return this;
  }

  addChild(child: Container): this {
    this.content.addChild(child);
    return this;
  }

  removeChild(child: Container): this {
    this.content.removeChild(child);
    return this;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
