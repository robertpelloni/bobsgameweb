import { Text as PIXIText, TextStyle, Container } from 'pixi.js';

export interface LabelStyle {
  fontSize?: number;
  fontFamily?: string;
  color?: number;
  fontWeight?: 'normal' | 'bold';
  align?: 'left' | 'center' | 'right';
  wordWrap?: boolean;
  wordWrapWidth?: number;
}

const DEFAULT_LABEL_STYLE: Required<LabelStyle> = {
  fontSize: 16,
  fontFamily: 'Arial',
  color: 0xffffff,
  fontWeight: 'normal',
  align: 'left',
  wordWrap: false,
  wordWrapWidth: 400,
};

export class Label {
  readonly container: Container;
  private textObj: PIXIText;
  private style: Required<LabelStyle>;

  constructor(text: string, style?: Partial<LabelStyle>) {
    this.style = { ...DEFAULT_LABEL_STYLE, ...style };
    this.container = new Container();

    this.textObj = new PIXIText({
      text,
      style: this.createTextStyle(),
    });
    this.container.addChild(this.textObj);
  }

  private createTextStyle(): TextStyle {
    return new TextStyle({
      fontSize: this.style.fontSize,
      fontFamily: this.style.fontFamily,
      fill: this.style.color,
      fontWeight: this.style.fontWeight,
      align: this.style.align,
      wordWrap: this.style.wordWrap,
      wordWrapWidth: this.style.wordWrapWidth,
    });
  }

  get text(): string {
    return this.textObj.text;
  }

  set text(value: string) {
    this.textObj.text = value;
  }

  get color(): number {
    return this.style.color;
  }

  set color(value: number) {
    this.style.color = value;
    this.textObj.style.fill = value;
  }

  get fontSize(): number {
    return this.style.fontSize;
  }

  set fontSize(value: number) {
    this.style.fontSize = value;
    this.textObj.style.fontSize = value;
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
    return this.textObj.width;
  }

  get height(): number {
    return this.textObj.height;
  }

  get anchor(): { x: number; y: number } {
    return { x: this.textObj.anchor.x, y: this.textObj.anchor.y };
  }

  setAnchor(x: number, y?: number): this {
    this.textObj.anchor.set(x, y ?? x);
    return this;
  }

  setPosition(x: number, y: number): this {
    this.container.x = x;
    this.container.y = y;
    return this;
  }

  setStyle(style: Partial<LabelStyle>): this {
    Object.assign(this.style, style);
    this.textObj.style = this.createTextStyle();
    return this;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
