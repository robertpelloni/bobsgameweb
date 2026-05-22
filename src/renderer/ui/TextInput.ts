import { Container, Graphics, Text as PIXIText, TextStyle, FederatedPointerEvent } from 'pixi.js';
import { EventEmitter } from 'eventemitter3';

export interface TextInputStyle {
  width: number;
  height: number;
  backgroundColor?: number;
  borderColor?: number;
  borderWidth?: number;
  borderRadius?: number;
  textColor?: number;
  placeholderColor?: number;
  fontSize?: number;
  fontFamily?: string;
  padding?: number;
}

const DEFAULT_STYLE: Required<TextInputStyle> = {
  width: 200,
  height: 40,
  backgroundColor: 0x222222,
  borderColor: 0x555555,
  borderWidth: 2,
  borderRadius: 4,
  textColor: 0xffffff,
  placeholderColor: 0x888888,
  fontSize: 16,
  fontFamily: 'Arial, sans-serif',
  padding: 10,
};

export class TextInput extends EventEmitter {
  readonly container: Container;
  private background: Graphics;
  private textElement: PIXIText;
  private placeholderElement: PIXIText;
  private style: Required<TextInputStyle>;

  private _value: string = '';
  private placeholder: string = '';
  private isFocused: boolean = false;

  private hiddenInput: HTMLInputElement;

  constructor(placeholder: string = '', style?: Partial<TextInputStyle>) {
    super();
    this.placeholder = placeholder;
    this.style = { ...DEFAULT_STYLE, ...style };

    this.container = new Container();
    this.container.eventMode = 'static';
    this.container.cursor = 'text';

    this.background = new Graphics();
    this.container.addChild(this.background);

    const textStyle = new TextStyle({
      fontFamily: this.style.fontFamily,
      fontSize: this.style.fontSize,
      fill: this.style.textColor,
    });

    const placeholderStyle = new TextStyle({
      fontFamily: this.style.fontFamily,
      fontSize: this.style.fontSize,
      fill: this.style.placeholderColor,
      fontStyle: 'italic',
    });

    this.placeholderElement = new PIXIText({ text: this.placeholder, style: placeholderStyle });
    this.placeholderElement.position.set(this.style.padding, this.style.padding);
    this.container.addChild(this.placeholderElement);

    this.textElement = new PIXIText({ text: '', style: textStyle });
    this.textElement.position.set(this.style.padding, this.style.padding);
    this.container.addChild(this.textElement);

    this.draw();

    // Create a hidden HTML input to capture real keyboard events (mobile keyboards, copy/paste, etc.)
    this.hiddenInput = document.createElement('input');
    this.hiddenInput.type = 'text';
    this.hiddenInput.style.position = 'absolute';
    this.hiddenInput.style.opacity = '0';
    this.hiddenInput.style.pointerEvents = 'none';
    this.hiddenInput.style.zIndex = '-1';
    // Append to body
    document.body.appendChild(this.hiddenInput);

    this.setupEvents();
  }

  private draw(): void {
    this.background.clear();

    // Draw Border (highlight if focused)
    const borderColor = this.isFocused ? 0x00ffff : this.style.borderColor;

    this.background.roundRect(0, 0, this.style.width, this.style.height, this.style.borderRadius);
    this.background.fill({ color: this.style.backgroundColor });
    this.background.stroke({ color: borderColor, width: this.style.borderWidth });
  }

  private setupEvents(): void {
    this.container.on('pointerdown', this.onPointerDown, this);

    // Global pointer down to detect clicking outside
    window.addEventListener('pointerdown', this.onGlobalPointerDown.bind(this));

    this.hiddenInput.addEventListener('input', this.onHtmlInput.bind(this));
    this.hiddenInput.addEventListener('blur', this.onHtmlBlur.bind(this));
  }

  private onPointerDown(e: FederatedPointerEvent): void {
    e.stopPropagation();
    this.focus();
  }

  private onGlobalPointerDown = (e: PointerEvent): void => {
    // If the click wasn't inside our container, blur.
    // In a real PIXI app, checking boundaries is tricky if scenes scale/move.
    // Relying on the hidden input blur is safer.
  };

  private focus(): void {
    this.isFocused = true;
    this.hiddenInput.value = this._value;
    this.hiddenInput.focus();
    this.draw();
  }

  private blur(): void {
    this.isFocused = false;
    this.hiddenInput.blur();
    this.draw();
    this.emit('blur', this._value);
  }

  private onHtmlInput(e: Event): void {
    this.value = this.hiddenInput.value;
  }

  private onHtmlBlur(): void {
    this.blur();
  }

  get value(): string {
    return this._value;
  }

  set value(val: string) {
    this._value = val;
    this.textElement.text = this._value;
    this.placeholderElement.visible = this._value.length === 0;
    this.emit('change', this._value);
  }

  setPosition(x: number, y: number): this {
    this.container.position.set(x, y);
    return this;
  }

  destroy(): void {
    this.container.removeAllListeners();
    window.removeEventListener('pointerdown', this.onGlobalPointerDown);
    this.hiddenInput.remove();
    this.container.destroy({ children: true });
  }
}
