import { EventEmitter } from 'eventemitter3';
import { Container, Graphics, Text as PIXIText, TextStyle, FederatedPointerEvent } from 'pixi.js';

export interface DropdownEvents {
  'change': (value: string) => void;
}

export interface DropdownOption {
  label: string;
  value: string;
}

export interface DropdownStyle {
  width?: number;
  height?: number;
  backgroundColor?: number;
  backgroundColorHover?: number;
  borderColor?: number;
  borderWidth?: number;
  borderRadius?: number;
  textColor?: number;
  fontSize?: number;
  fontFamily?: string;
  dropdownBackgroundColor?: number;
  dropdownItemHoverColor?: number;
}

const DEFAULT_STYLE: Required<DropdownStyle> = {
  width: 150,
  height: 30,
  backgroundColor: 0x222222,
  backgroundColorHover: 0x333333,
  borderColor: 0x555555,
  borderWidth: 1,
  borderRadius: 4,
  textColor: 0xffffff,
  fontSize: 14,
  fontFamily: 'sans-serif',
  dropdownBackgroundColor: 0x111111,
  dropdownItemHoverColor: 0x444444
};

export class Dropdown extends EventEmitter<DropdownEvents> {
  public container: Container;

  private boxBg: Graphics;
  private selectedText: PIXIText;
  private arrow: Graphics;
  private dropdownContainer: Container;
  private dropdownBg: Graphics;

  private options: DropdownOption[] = [];
  private _selectedValue: string = '';
  private _isOpen: boolean = false;
  private _hovered: boolean = false;

  private style: Required<DropdownStyle>;

  constructor(options: DropdownOption[] = [], selectedValue: string = '', style?: DropdownStyle) {
    super();
    this.style = { ...DEFAULT_STYLE, ...style };
    this.options = options;
    this._selectedValue = selectedValue || (options.length > 0 ? options[0].value : '');

    this.container = new Container();

    // Main button part
    const mainButton = new Container();
    mainButton.cursor = 'pointer';
    mainButton.eventMode = 'static';

    this.boxBg = new Graphics();
    this.arrow = new Graphics();

    this.selectedText = new PIXIText({
      text: this.getSelectedLabel(),
      style: new TextStyle({
        fontFamily: this.style.fontFamily,
        fontSize: this.style.fontSize,
        fill: this.style.textColor,
      })
    });
    this.selectedText.position.set(10, (this.style.height - this.style.fontSize) / 2);

    mainButton.addChild(this.boxBg);
    mainButton.addChild(this.selectedText);
    mainButton.addChild(this.arrow);

    this.container.addChild(mainButton);

    // Dropdown list part
    this.dropdownContainer = new Container();
    this.dropdownContainer.visible = false;
    this.dropdownContainer.position.set(0, this.style.height);
    // Ensure dropdown renders on top of other elements
    this.dropdownContainer.zIndex = 1000;
    this.container.sortableChildren = true;

    this.dropdownBg = new Graphics();
    this.dropdownContainer.addChild(this.dropdownBg);

    this.container.addChild(this.dropdownContainer);

    // Events
    mainButton.on('pointerenter', () => {
      this._hovered = true;
      this.renderBox();
    });
    mainButton.on('pointerleave', () => {
      this._hovered = false;
      this.renderBox();
    });
    mainButton.on('pointerdown', () => {
      this.toggleDropdown();
    });

    // Close dropdown if clicking outside
    // Note: In a real app, this should be a global window click handler,
    // but for PIXI we can attach an event to a full-screen interactive background
    // For simplicity, we just toggle it for now.

    this.render();
  }

  public get value(): string {
    return this._selectedValue;
  }

  public set value(val: string) {
    if (this._selectedValue !== val) {
      this._selectedValue = val;
      this.selectedText.text = this.getSelectedLabel();
      this.emit('change', val);
    }
  }

  public setOptions(options: DropdownOption[]): void {
      this.options = options;
      if (!this.options.find(o => o.value === this._selectedValue) && this.options.length > 0) {
          this.value = this.options[0].value;
      } else {
          this.selectedText.text = this.getSelectedLabel();
      }
      if (this._isOpen) this.renderDropdown();
  }

  public setPosition(x: number, y: number): void {
    this.container.position.set(x, y);
  }

  private toggleDropdown(): void {
    this._isOpen = !this._isOpen;
    if (this._isOpen) {
      this.renderDropdown();
    }
    this.dropdownContainer.visible = this._isOpen;
    this.renderBox();
  }

  private getSelectedLabel(): string {
    const opt = this.options.find(o => o.value === this._selectedValue);
    return opt ? opt.label : '';
  }

  private render(): void {
    this.renderBox();
    if (this._isOpen) {
      this.renderDropdown();
    }
  }

  private renderBox(): void {
    this.boxBg.clear();
    const bgColor = this._hovered || this._isOpen ? this.style.backgroundColorHover : this.style.backgroundColor;

    this.boxBg.beginFill(bgColor);
    this.boxBg.lineStyle(this.style.borderWidth, this.style.borderColor);
    this.boxBg.drawRoundedRect(0, 0, this.style.width, this.style.height, this.style.borderRadius);
    this.boxBg.endFill();

    this.arrow.clear();
    this.arrow.beginFill(this.style.textColor);

    const arrowX = this.style.width - 20;
    const arrowY = this.style.height / 2;

    if (this._isOpen) {
      // Up arrow
      this.arrow.moveTo(arrowX, arrowY + 3);
      this.arrow.lineTo(arrowX + 5, arrowY - 3);
      this.arrow.lineTo(arrowX + 10, arrowY + 3);
    } else {
      // Down arrow
      this.arrow.moveTo(arrowX, arrowY - 3);
      this.arrow.lineTo(arrowX + 5, arrowY + 3);
      this.arrow.lineTo(arrowX + 10, arrowY - 3);
    }
    this.arrow.endFill();
  }

  private renderDropdown(): void {
    // Clear old items
    while (this.dropdownContainer.children.length > 1) {
        this.dropdownContainer.removeChildAt(1).destroy();
    }

    const itemHeight = 30;
    const totalHeight = this.options.length * itemHeight;

    this.dropdownBg.clear();
    this.dropdownBg.beginFill(this.style.dropdownBackgroundColor);
    this.dropdownBg.lineStyle(1, this.style.borderColor);
    // Draw dropdown exactly below the box
    this.dropdownBg.drawRect(0, 0, this.style.width, totalHeight);
    this.dropdownBg.endFill();

    this.options.forEach((opt, idx) => {
      const itemContainer = new Container();
      itemContainer.position.set(0, idx * itemHeight);
      itemContainer.cursor = 'pointer';
      itemContainer.eventMode = 'static';

      const itemBg = new Graphics();
      itemBg.beginFill(0, 0); // transparent hit area initially
      itemBg.drawRect(0, 0, this.style.width, itemHeight);
      itemBg.endFill();

      const itemText = new PIXIText({
        text: opt.label,
        style: new TextStyle({
          fontFamily: this.style.fontFamily,
          fontSize: this.style.fontSize,
          fill: this.style.textColor,
        })
      });
      itemText.position.set(10, (itemHeight - this.style.fontSize) / 2);

      itemContainer.addChild(itemBg);
      itemContainer.addChild(itemText);

      itemContainer.on('pointerenter', () => {
        itemBg.clear();
        itemBg.beginFill(this.style.dropdownItemHoverColor);
        itemBg.drawRect(0, 0, this.style.width, itemHeight);
        itemBg.endFill();
      });

      itemContainer.on('pointerleave', () => {
        itemBg.clear();
        itemBg.beginFill(0, 0);
        itemBg.drawRect(0, 0, this.style.width, itemHeight);
        itemBg.endFill();
      });

      itemContainer.on('pointerdown', () => {
        this.value = opt.value;
        this.toggleDropdown();
      });

      this.dropdownContainer.addChild(itemContainer);
    });
  }
}
