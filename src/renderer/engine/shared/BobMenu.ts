/**
 * BobMenu — in-game menu system with cursor, options, and callbacks.
 *
 * Ported from okgame C++ Utility/BobMenu.
 * Provides a navigable menu with cursor animation, scroll, and selection.
 */
import { Container, Graphics, Text, TextStyle } from 'pixi.js';

export interface MenuOption {
    label: string;
    action?: () => void;
    enabled?: boolean;
    color?: number;
    isInfo?: boolean;
    isWarning?: boolean;
    isError?: boolean;
}

export class BobMenu {
    private container: Container;
    private options: MenuOption[] = [];
    private cursorPosition = 0;
    private cursorBlink = true;
    private cursorTimer = 0;
    private cursorBlinkSpeed = 500;

    // Layout
    private x = 0;
    private y = 0;
    private width = 300;
    private itemHeight = 28;
    private maxVisible = 10;
    private scrollOffset = 0;
    private fontSize = 18;

    // Title
    title = '';
    subtitle = '';

    // Colors
    menuColor = 0xaaaacc;
    disabledColor = 0x555555;
    warningColor = 0xffaa00;
    infoColor = 0x44aaff;
    errorColor = 0xff4444;
    bgColor = 0x0a0a1a;
    cursorColor = 0x00ffff;
    titleColor = 0xffffff;

    // State
    active = true;
    showing = true;

    constructor(title = '', options?: MenuOption[]) {
        this.title = title;
        this.container = new Container();
        if (options) this.options = options;
    }

    // ============================================================
    // Options
    // ============================================================

    addOption(label: string, action?: () => void, enabled = true): void {
        this.options.push({ label, action, enabled });
    }

    addInfo(label: string, color = 0x888888): void {
        this.options.push({ label, isInfo: true, enabled: false, color });
    }

    addWarning(label: string): void {
        this.options.push({ label, isWarning: true, enabled: false });
    }

    addError(label: string): void {
        this.options.push({ label, isError: true, enabled: false });
    }

    removeOption(index: number): void {
        this.options.splice(index, 1);
        if (this.cursorPosition >= this.options.length) {
            this.cursorPosition = Math.max(0, this.options.length - 1);
        }
    }

    clearOptions(): void {
        this.options = [];
        this.cursorPosition = 0;
    }

    getOptionCount(): number { return this.options.length; }

    // ============================================================
    // Navigation
    // ============================================================

    moveUp(): void {
        for (let i = this.cursorPosition - 1; i >= 0; i--) {
            if (this.options[i].enabled !== false && !this.options[i].isInfo) {
                this.cursorPosition = i;
                return;
            }
        }
        // Wrap
        for (let i = this.options.length - 1; i > this.cursorPosition; i--) {
            if (this.options[i].enabled !== false && !this.options[i].isInfo) {
                this.cursorPosition = i;
                return;
            }
        }
    }

    moveDown(): void {
        for (let i = this.cursorPosition + 1; i < this.options.length; i++) {
            if (this.options[i].enabled !== false && !this.options[i].isInfo) {
                this.cursorPosition = i;
                return;
            }
        }
        // Wrap
        for (let i = 0; i < this.cursorPosition; i++) {
            if (this.options[i].enabled !== false && !this.options[i].isInfo) {
                this.cursorPosition = i;
                return;
            }
        }
    }

    select(): void {
        const option = this.options[this.cursorPosition];
        if (option && option.enabled !== false && option.action) {
            option.action();
        }
    }

    cancel(): void {
        // Override or use callback
    }

    // ============================================================
    // Update
    // ============================================================

    update(dt: number): void {
        this.cursorTimer += dt;
        if (this.cursorTimer >= this.cursorBlinkSpeed * 2) {
            this.cursorTimer = 0;
            this.cursorBlink = !this.cursorBlink;
        }

        // Auto-scroll
        if (this.cursorPosition < this.scrollOffset) {
            this.scrollOffset = this.cursorPosition;
        }
        if (this.cursorPosition >= this.scrollOffset + this.maxVisible) {
            this.scrollOffset = this.cursorPosition - this.maxVisible + 1;
        }
    }

    // ============================================================
    // Render
    // ============================================================

    render(): Container {
        this.container.removeChildren();

        if (!this.showing) return this.container;

        const g = new Graphics();
        let drawY = this.y;

        // Background
        const bgHeight = this.itemHeight * Math.min(this.options.length + (this.title ? 2 : 0), this.maxVisible + (this.title ? 2 : 0));
        g.roundRect(this.x, this.y, this.width, bgHeight + 8, 4);
        g.fill({ color: this.bgColor, alpha: 0.9 });
        g.stroke({ color: 0x334466, width: 1 });
        this.container.addChild(g);

        // Title
        if (this.title) {
            const titleStyle = new TextStyle({
                fontFamily: 'Arial, sans-serif',
                fontSize: this.fontSize + 2,
                fill: this.titleColor,
                fontWeight: 'bold',
            });
            const titleText = new Text({ text: this.title, style: titleStyle });
            titleText.position.set(this.x + 10, drawY + 4);
            this.container.addChild(titleText);
            drawY += this.itemHeight;
        }

        // Subtitle
        if (this.subtitle) {
            const subStyle = new TextStyle({
                fontFamily: 'Arial, sans-serif',
                fontSize: this.fontSize - 4,
                fill: 0x888888,
            });
            const subText = new Text({ text: this.subtitle, style: subStyle });
            subText.position.set(this.x + 10, drawY + 4);
            this.container.addChild(subText);
            drawY += this.itemHeight;
        }

        // Options
        const visibleEnd = Math.min(this.options.length, this.scrollOffset + this.maxVisible);
        for (let i = this.scrollOffset; i < visibleEnd; i++) {
            const option = this.options[i];
            const isSelected = i === this.cursorPosition && this.active;
            const y = drawY + (i - this.scrollOffset) * this.itemHeight;

            // Cursor
            if (isSelected && this.cursorBlink) {
                const cursor = new Graphics();
                cursor.rect(this.x + 2, y + 2, this.width - 4, this.itemHeight - 2);
                cursor.fill({ color: this.cursorColor, alpha: 0.15 });
                this.container.addChild(cursor);
            }

            // Determine color
            let color = this.menuColor;
            if (option.enabled === false) color = this.disabledColor;
            else if (option.isError) color = this.errorColor;
            else if (option.isWarning) color = this.warningColor;
            else if (option.isInfo) color = option.color ?? this.infoColor;
            else if (option.color) color = option.color;

            const style = new TextStyle({
                fontFamily: 'Arial, sans-serif',
                fontSize: this.fontSize,
                fill: color,
                fontWeight: isSelected ? 'bold' : 'normal',
            });

            const prefix = isSelected && this.active ? '▸ ' : '  ';
            const text = new Text({ text: `${prefix}${option.label}`, style });
            text.position.set(this.x + 8, y + 4);
            this.container.addChild(text);
        }

        return this.container;
    }

    // ============================================================
    // Layout
    // ============================================================

    setPosition(x: number, y: number): void { this.x = x; this.y = y; }
    setWidth(w: number): void { this.width = w; }
    setMaxVisible(n: number): void { this.maxVisible = n; }
    setFontSize(s: number): void { this.fontSize = s; }
    getCursorPosition(): number { return this.cursorPosition; }
    setCursorPosition(pos: number): void { this.cursorPosition = pos; }

    getContainer(): Container { return this.container; }

    destroy(): void {
        this.container.destroy({ children: true });
    }
}
