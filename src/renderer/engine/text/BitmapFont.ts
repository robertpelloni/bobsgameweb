/**
 * BitmapFont — font rendering using pre-rendered glyph atlas via Canvas 2D.
 *
 * Ported from Java engine com.bobsgame.client.BitmapFont.
 * Uses HTML5 Canvas to render text with custom bitmap fonts.
 */
import { Texture, Container, Sprite, Rectangle } from 'pixi.js';

export interface BitmapFontGlyph {
    char: string;
    x: number;
    y: number;
    width: number;
    height: number;
    xAdvance: number;
    xOffset: number;
    yOffset: number;
}

export class BitmapFont {
    private glyphs: Map<string, BitmapFontGlyph> = new Map();
    private texture: Texture | null = null;
    private lineHeight = 16;
    private size: number;

    constructor(size = 16) {
        this.size = size;
        this.lineHeight = Math.ceil(size * 1.2);
    }

    /**
     * Generate a bitmap font atlas from a CSS font using Canvas 2D.
     */
    static async fromCSSFont(fontFamily: string, size = 16, characters?: string): Promise<BitmapFont> {
        const font = new BitmapFont(size);
        const chars = characters ?? ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        const fontStr = `${size}px "${fontFamily}", monospace`;

        // Measure max char width
        ctx.font = fontStr;
        let maxWidth = 0;
        for (const char of chars) {
            const m = ctx.measureText(char);
            maxWidth = Math.max(maxWidth, Math.ceil(m.width));
        }

        const cellWidth = maxWidth + 2;
        const cellHeight = Math.ceil(size * 1.4);
        const cols = Math.min(16, chars.length);
        const rows = Math.ceil(chars.length / cols);

        canvas.width = cols * cellWidth;
        canvas.height = rows * cellHeight;

        // Render glyphs
        ctx.font = fontStr;
        ctx.fillStyle = 'white';
        ctx.textBaseline = 'top';

        let idx = 0;
        for (const char of chars) {
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            const x = col * cellWidth + 1;
            const y = row * cellHeight + 1;

            ctx.fillText(char, x, y);

            const measured = ctx.measureText(char);
            font.glyphs.set(char, {
                char,
                x: col * cellWidth,
                y: row * cellHeight,
                width: Math.ceil(measured.width),
                height: cellHeight,
                xAdvance: Math.ceil(measured.width) + 1,
                xOffset: 0,
                yOffset: 0,
            });

            idx++;
        }

        // Create PixiJS texture
        font.texture = Texture.from(canvas);
        return font;
    }

    /**
     * Render a string of text as PixiJS sprites.
     */
    renderText(text: string, color = 0xffffff, scale = 1): Container {
        const container = new Container();
        if (!this.texture) return container;

        let cursorX = 0;
        let cursorY = 0;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];

            if (char === '\n') {
                cursorX = 0;
                cursorY += this.lineHeight * scale;
                continue;
            }

            const glyph = this.glyphs.get(char);
            if (!glyph) continue;

            const sprite = new Sprite({
                texture: new Texture({
                    source: this.texture.source,
                    frame: new Rectangle(glyph.x, glyph.y, glyph.width, glyph.height),
                }),
            });
            sprite.position.set(cursorX + glyph.xOffset * scale, cursorY + glyph.yOffset * scale);
            sprite.scale.set(scale);
            sprite.tint = color;

            container.addChild(sprite);
            cursorX += glyph.xAdvance * scale;
        }

        return container;
    }

    /**
     * Measure the width of a text string in pixels.
     */
    measureText(text: string, scale = 1): number {
        let width = 0;
        let maxWidth = 0;

        for (const char of text) {
            if (char === '\n') {
                maxWidth = Math.max(maxWidth, width);
                width = 0;
                continue;
            }
            const glyph = this.glyphs.get(char);
            if (glyph) width += glyph.xAdvance * scale;
        }

        return Math.max(maxWidth, width);
    }

    getLineHeight(): number { return this.lineHeight; }
    getSize(): number { return this.size; }
    getTexture(): Texture | null { return this.texture; }
}
