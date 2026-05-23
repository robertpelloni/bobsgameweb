import { EventEmitter } from 'eventemitter3';
import { Container, Graphics, Text as PIXIText, TextStyle, FederatedPointerEvent } from 'pixi.js';

export interface CheckboxEvents {
  'change': (checked: boolean) => void;
}

export interface CheckboxStyle {
  size?: number;
  labelSpacing?: number;
  backgroundColor?: number;
  backgroundColorHover?: number;
  borderColor?: number;
  borderWidth?: number;
  borderRadius?: number;
  checkmarkColor?: number;
  checkmarkThickness?: number;
  textColor?: number;
  fontSize?: number;
  fontFamily?: string;
}

const DEFAULT_STYLE: Required<CheckboxStyle> = {
  size: 20,
  labelSpacing: 8,
  backgroundColor: 0x222222,
  backgroundColorHover: 0x333333,
  borderColor: 0x555555,
  borderWidth: 1,
  borderRadius: 4,
  checkmarkColor: 0x00ff88,
  checkmarkThickness: 2,
  textColor: 0xcccccc,
  fontSize: 14,
  fontFamily: 'sans-serif'
};

export class Checkbox extends EventEmitter<CheckboxEvents> {
  public container: Container;

  private boxBg: Graphics;
  private checkmark: Graphics;
  private labelText: PIXIText;

  private _checked: boolean = false;
  private _disabled: boolean = false;
  private _hovered: boolean = false;

  private style: Required<CheckboxStyle>;

  constructor(label: string, checked: boolean = false, style?: CheckboxStyle) {
    super();
    this.style = { ...DEFAULT_STYLE, ...style };
    this._checked = checked;

    this.container = new Container();
    this.container.cursor = 'pointer';
    this.container.eventMode = 'static';

    this.boxBg = new Graphics();
    this.checkmark = new Graphics();

    this.labelText = new PIXIText({
      text: label,
      style: new TextStyle({
        fontFamily: this.style.fontFamily,
        fontSize: this.style.fontSize,
        fill: this.style.textColor,
      })
    });

    this.labelText.position.set(this.style.size + this.style.labelSpacing, (this.style.size - this.style.fontSize) / 2);

    this.container.addChild(this.boxBg);
    this.container.addChild(this.checkmark);
    this.container.addChild(this.labelText);

    this.setupEvents();
    this.render();
  }

  public get checked(): boolean {
    return this._checked;
  }

  public set checked(value: boolean) {
    if (this._checked !== value) {
      this._checked = value;
      this.render();
      this.emit('change', this._checked);
    }
  }

  public setPosition(x: number, y: number): void {
    this.container.position.set(x, y);
  }

  private setupEvents(): void {
    this.container.on('pointerenter', () => {
      if (this._disabled) return;
      this._hovered = true;
      this.render();
    });

    this.container.on('pointerleave', () => {
      if (this._disabled) return;
      this._hovered = false;
      this.render();
    });

    this.container.on('pointerdown', (e: FederatedPointerEvent) => {
      if (this._disabled) return;
      this.checked = !this._checked;
    });
  }

  private render(): void {
    this.boxBg.clear();

    const bgColor = this._hovered ? this.style.backgroundColorHover : this.style.backgroundColor;

    this.boxBg.beginFill(bgColor);
    this.boxBg.lineStyle(this.style.borderWidth, this.style.borderColor);
    this.boxBg.drawRoundedRect(0, 0, this.style.size, this.style.size, this.style.borderRadius);
    this.boxBg.endFill();

    this.checkmark.clear();
    if (this._checked) {
      this.checkmark.lineStyle(this.style.checkmarkThickness, this.style.checkmarkColor, 1);
      this.checkmark.moveTo(this.style.size * 0.2, this.style.size * 0.5);
      this.checkmark.lineTo(this.style.size * 0.45, this.style.size * 0.7);
      this.checkmark.lineTo(this.style.size * 0.8, this.style.size * 0.25);
    }
  }
}
