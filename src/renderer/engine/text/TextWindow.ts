/**
 * TextWindow — scrollable text display for RPG dialogue, console output, and logs.
 *
 * Ported from okgame C++ Engine/text/TextWindow.
 */
import { Container, Text, TextStyle, Graphics } from 'pixi.js';

export interface TextWindowConfig {
    width: number;
    height: number;
    x?: number;
    y?: number;
    fontSize?: number;
    textColor?: number;
    backgroundColor?: number;
    borderColor?: number;
    borderWidth?: number;
    padding?: number;
    maxLines?: number;
    lineHeight?: number;
}

export class TextWindow {
    private container: Container;
    private background: Graphics;
    private lines: string[] = [];
    private lineTexts: Text[] = [];
    private config: Required<TextWindowConfig>;
    private scrollOffset = 0;
    private lineHeight: number;

    constructor(config: TextWindowConfig) {
        this.config = {
            width: config.width,
            height: config.height,
            x: config.x ?? 0,
            y: config.y ?? 0,
            fontSize: config.fontSize ?? 14,
            textColor: config.textColor ?? 0xcccccc,
            backgroundColor: config.backgroundColor ?? 0x0a0a1a,
            borderColor: config.borderColor ?? 0x334466,
            borderWidth: config.borderWidth ?? 1,
            padding: config.padding ?? 6,
            maxLines: config.maxLines ?? 50,
            lineHeight: config.lineHeight ?? config.fontSize ?? 14,
        };
        this.lineHeight = this.config.lineHeight + 4;

        this.container = new Container();
        this.container.position.set(this.config.x, this.config.y);

        this.background = new Graphics();
        this.drawBackground();
        this.container.addChild(this.background);
    }

    // ============================================================
    // Content
    // ============================================================

    addLine(text: string): void {
        this.lines.push(text);
        if (this.lines.length > this.config.maxLines) {
            this.lines.shift();
        }
        this.refresh();
    }

    clear(): void {
        this.lines = [];
        this.refresh();
    }

    getLines(): string[] {
        return [...this.lines];
    }

    // ============================================================
    // Scrolling
    // ============================================================

    scrollUp(lines = 1): void {
        this.scrollOffset = Math.max(0, this.scrollOffset - lines);
        this.refresh();
    }

    scrollDown(lines = 1): void {
        const maxVisible = this.getMaxVisibleLines();
        const maxOffset = Math.max(0, this.lines.length - maxVisible);
        this.scrollOffset = Math.min(maxOffset, this.scrollOffset + lines);
        this.refresh();
    }

    scrollToBottom(): void {
        const maxVisible = this.getMaxVisibleLines();
        this.scrollOffset = Math.max(0, this.lines.length - maxVisible);
        this.refresh();
    }

    private getMaxVisibleLines(): number {
        return Math.floor((this.config.height - this.config.padding * 2) / this.lineHeight);
    }

    // ============================================================
    // Display
    // ============================================================

    private refresh(): void {
        // Remove old texts
        for (const t of this.lineTexts) {
            this.container.removeChild(t);
            t.destroy();
        }
        this.lineTexts = [];

        const style = new TextStyle({
            fontFamily: 'monospace',
            fontSize: this.config.fontSize,
            fill: this.config.textColor,
        });

        const maxVisible = this.getMaxVisibleLines();
        const startLine = this.scrollOffset;
        const endLine = Math.min(startLine + maxVisible, this.lines.length);

        for (let i = startLine; i < endLine; i++) {
            const text = new Text({ text: this.lines[i], style });
            text.position.set(this.config.padding, this.config.padding + (i - startLine) * this.lineHeight);
            this.container.addChild(text);
            this.lineTexts.push(text);
        }
    }

    private drawBackground(): void {
        this.background.clear();
        this.background.roundRect(0, 0, this.config.width, this.config.height, 4);
        this.background.fill({ color: this.config.backgroundColor, alpha: 0.9 });
        this.background.stroke({ color: this.config.borderColor, width: this.config.borderWidth });
    }

    getContainer(): Container {
        return this.container;
    }

    setPosition(x: number, y: number): void {
        this.container.position.set(x, y);
    }

    resize(width: number, height: number): void {
        this.config.width = width;
        this.config.height = height;
        this.drawBackground();
        this.refresh();
    }

    destroy(): void {
        this.container.destroy({ children: true });
    }
}
