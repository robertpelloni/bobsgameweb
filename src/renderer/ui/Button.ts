import { EventEmitter } from 'eventemitter3';
import { Container, Graphics, Text as PIXIText, TextStyle, FederatedPointerEvent } from 'pixi.js';

export interface ButtonEvents {
  'click': () => void;
  'hover': () => void;
  'hoverEnd': () => void;
  'press': () => void;
  'release': () => void;
}

export interface ButtonStyle {
  width: number;
  height: number;
  backgroundColor?: number;
  backgroundColorHover?: number;
  backgroundColorPressed?: number;
  backgroundColorDisabled?: number;
  borderColor?: number;
  borderWidth?: number;
  borderRadius?: number;
  textColor?: number;
  textColorDisabled?: number;
  fontSize?: number;
  fontFamily?: string;
}

const DEFAULT_BUTTON_STYLE: Required<ButtonStyle> = {
  width: 200,
  height: 50,
  backgroundColor: 0x4a4a4a,
  backgroundColorHover: 0x5a5a5a,
  backgroundColorPressed: 0x3a3a3a,
  backgroundColorDisabled: 0x2a2a2a,
  borderColor: 0x666666,
  borderWidth: 2,
  borderRadius: 8,
  textColor: 0xffffff,
  textColorDisabled: 0x888888,
  fontSize: 18,
  fontFamily: 'Arial',
};

export class Button extends EventEmitter<ButtonEvents> {
  readonly container: Container;
  private background: Graphics;
  private label: PIXIText;
  private style: Required<ButtonStyle>;

  private _enabled: boolean = true;
  private _hovered: boolean = false;
  private _pressed: boolean = false;
  private _selected: boolean = false;

  constructor(text: string, style?: Partial<ButtonStyle>) {
    super();
    this.style = { ...DEFAULT_BUTTON_STYLE, ...style };
    this.container = new Container();
    this.container.eventMode = 'static';
    this.container.cursor = 'pointer';

    this.background = new Graphics();
    this.container.addChild(this.background);

    this.label = new PIXIText({
      text,
      style: new TextStyle({
        fontSize: this.style.fontSize,
        fontFamily: this.style.fontFamily,
        fill: this.style.textColor,
      }),
    });
    this.label.anchor.set(0.5);
    this.label.x = this.style.width / 2;
    this.label.y = this.style.height / 2;
    this.container.addChild(this.label);

    this.draw();
    this.setupEvents();
  }

  private setupEvents(): void {
    this.container.on('pointerover', () => {
      if (!this._enabled) return;
      this._hovered = true;
      this.draw();
      this.emit('hover');
    });

    this.container.on('pointerout', () => {
      if (!this._enabled) return;
      this._hovered = false;
      this._pressed = false;
      this.draw();
      this.emit('hoverEnd');
    });

    this.container.on('pointerdown', (e: FederatedPointerEvent) => {
      if (!this._enabled) return;
      e.stopPropagation();
      this._pressed = true;
      this.draw();
      this.emit('press');
    });

    this.container.on('pointerup', () => {
      if (!this._enabled) return;
      if (this._pressed) {
        this._pressed = false;
        this.draw();
        this.emit('release');
        this.emit('click');
      }
    });

    this.container.on('pointerupoutside', () => {
      this._pressed = false;
      this.draw();
    });
  }

  private draw(): void {
    this.background.clear();

    let bgColor = this.style.backgroundColor;
    if (!this._enabled) {
      bgColor = this.style.backgroundColorDisabled;
    } else if (this._pressed) {
      bgColor = this.style.backgroundColorPressed;
    } else if (this._hovered) {
      bgColor = this.style.backgroundColorHover;
    }

    if (this.style.borderWidth > 0) {
      this.background.roundRect(0, 0, this.style.width, this.style.height, this.style.borderRadius);
      this.background.fill(bgColor);
      this.background.stroke({
        color: this._selected ? 0xffffff : this.style.borderColor,
        width: this._selected ? this.style.borderWidth + 1 : this.style.borderWidth
      });
    } else {
      this.background.roundRect(0, 0, this.style.width, this.style.height, this.style.borderRadius);
      this.background.fill(bgColor);
      if (this._selected) {
        this.background.stroke({ color: 0xffffff, width: 2 });
      }
    }

    this.label.style.fill = this._enabled ? this.style.textColor : this.style.textColorDisabled;
    if (this._selected) {
      this.container.scale.set(1.05);
    } else {
      this.container.scale.set(1.0);
    }
    this.container.cursor = this._enabled ? 'pointer' : 'default';
  }

  get selected(): boolean {
    return this._selected;
  }

  set selected(value: boolean) {
    if (this._selected !== value) {
      this._selected = value;
      this.draw();
    }
  }

  get text(): string {
    return this.label.text;
  }

  set text(value: string) {
    this.label.text = value;
  }

  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(value: boolean) {
    this._enabled = value;
    this.draw();
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

  setPosition(x: number, y: number): this {
    this.container.x = x;
    this.container.y = y;
    return this;
  }

  onClick(callback: () => void): this {
    this.on('click', callback);
    return this;
  }

  destroy(): void {
    this.container.destroy({ children: true });
    this.removeAllListeners();
  }
}
