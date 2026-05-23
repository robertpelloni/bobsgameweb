/**
 * Text utilities — BitmapFont, text effects, and rendering helpers.
 *
 * Ported from okgame C++ Engine/Engine/text/ and Java engine BitmapFont.
 * Provides typed text rendering, scrolling text boxes, and dialogue display.
 */
import { Container, Graphics, Text, TextStyle, Sprite, Texture } from 'pixi.js';
import { AudioManager } from '../../audio/AudioManager';

// ============================================================
// TypedTextWriter — animates text appearing one character at a time
// ============================================================

export interface TypedTextWriterConfig {
    style: TextStyle;
    speed?: number; // characters per second
    onComplete?: () => void;
    onCharacter?: (char: string, index: number) => void;
    useBlahSound?: boolean;
    blahSoundName?: string;
}

export class TypedTextWriter {
    private fullText: string;
    private displayedLength = 0;
    private speed: number;
    private accumulator = 0;
    private text: Text;
    private onComplete?: () => void;
    private onCharacter?: (char: string, index: number) => void;
    private useBlahSound: boolean;
    private blahSoundName: string;

    constructor(fullText: string, config: TypedTextWriterConfig) {
        this.fullText = fullText;
        this.speed = config.speed ?? 30;
        this.onComplete = config.onComplete;
        this.onCharacter = config.onCharacter;
        this.useBlahSound = config.useBlahSound ?? true;
        this.blahSoundName = config.blahSoundName ?? 'piece_move';

        this.text = new Text({ text: '', style: config.style });
    }

    update(dt: number): void {
        if (this.displayedLength >= this.fullText.length) return;

        this.accumulator += (dt / 1000) * this.speed;
        const charsToAdd = Math.floor(this.accumulator);
        if (charsToAdd > 0) {
            this.accumulator -= charsToAdd;
            const prevLen = this.displayedLength;
            this.displayedLength = Math.min(this.displayedLength + charsToAdd, this.fullText.length);
            this.text.text = this.fullText.substring(0, this.displayedLength);

            for (let i = prevLen; i < this.displayedLength; i++) {
                const char = this.fullText[i]!;
                this.onCharacter?.(char, i);

                // Play 'blah' sound for non-whitespace characters
                if (this.useBlahSound && char.trim().length > 0) {
                    if (AudioManager.isLoaded(this.blahSoundName)) {
                        AudioManager.playSound(this.blahSoundName, {
                            volume: 0.05,
                            pitch: 0.8 + Math.random() * 0.4
                        });
                    }
                }
            }

            if (this.displayedLength >= this.fullText.length) {
                this.onComplete?.();
            }
        }
    }

    /** Skip to showing all text immediately. */
    skip(): void {
        this.displayedLength = this.fullText.length;
        this.text.text = this.fullText;
        this.onComplete?.();
    }

    isComplete(): boolean {
        return this.displayedLength >= this.fullText.length;
    }

    getDisplayObject(): Text {
        return this.text;
    }

    getFullText(): string {
        return this.fullText;
    }
}

// ============================================================
// DialogueBox — styled text box for NPC dialogues
// ============================================================

export interface DialogueBoxConfig {
    width: number;
    height?: number;
    padding?: number;
    backgroundColor?: number;
    borderColor?: number;
    borderWidth?: number;
    textColor?: number;
    fontSize?: number;
    typewriterSpeed?: number;
}

export class DialogueBox {
    private container: Container;
    private background: Graphics;
    private writer: TypedTextWriter | null = null;

    private config: Required<DialogueBoxConfig>;
    private visible = false;
    private onCompleteCallback?: () => void;

    constructor(config: DialogueBoxConfig) {
        this.config = {
            width: config.width,
            height: config.height ?? 120,
            padding: config.padding ?? 12,
            backgroundColor: config.backgroundColor ?? 0x0a0a1a,
            borderColor: config.borderColor ?? 0x4a6a8a,
            borderWidth: config.borderWidth ?? 2,
            textColor: config.textColor ?? 0xffffff,
            fontSize: config.fontSize ?? 18,
            typewriterSpeed: config.typewriterSpeed ?? 40,
        };

        this.container = new Container();
        this.container.visible = false;

        this.background = new Graphics();
        this.container.addChild(this.background);
    }

    show(text: string, onComplete?: () => void): void {
        this.onCompleteCallback = onComplete;
        this.visible = true;
        this.container.visible = true;

        // Remove old writer
        if (this.writer) {
            this.container.removeChild(this.writer.getDisplayObject());
        }

        const style = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: this.config.fontSize,
            fill: this.config.textColor,
            wordWrap: true,
            wordWrapWidth: this.config.width - this.config.padding * 2,
        });

        this.writer = new TypedTextWriter(text, {
            style,
            speed: this.config.typewriterSpeed,
            onComplete: () => {
                this.onCompleteCallback?.();
            },
        });

        this.writer.getDisplayObject().x = this.config.padding;
        this.writer.getDisplayObject().y = this.config.padding;
        this.container.addChild(this.writer.getDisplayObject());

        this.drawBackground();
    }

    hide(): void {
        this.visible = false;
        this.container.visible = false;
    }

    /** Skip current text animation. */
    skip(): void {
        this.writer?.skip();
    }

    update(dt: number): void {
        if (this.writer) {
            this.writer.update(dt);
        }
    }

    isVisible(): boolean {
        return this.visible;
    }

    getDisplayObject(): Container {
        return this.container;
    }

    setPosition(x: number, y: number): void {
        this.container.x = x;
        this.container.y = y;
    }

    private drawBackground(): void {
        this.background.clear();
        this.background.roundRect(0, 0, this.config.width, this.config.height, 8);
        this.background.fill({ color: this.config.backgroundColor, alpha: 0.9 });
        this.background.stroke({ color: this.config.borderColor, width: this.config.borderWidth });
    }
}

// ============================================================
// NotificationManager — in-world floating text notifications
// ============================================================

interface FloatingText {
    text: Text;
    life: number;
    maxLife: number;
    startY: number;
}

export class FloatingTextManager {
    private container: Container;
    private floatingTexts: FloatingText[] = [];

    constructor(parent: Container) {
        this.container = new Container();
        parent.addChild(this.container);
    }

    /** Add floating text at a world position. */
    addText(text: string, x: number, y: number, options?: {
        color?: number;
        fontSize?: number;
        duration?: number;
    }): void {
        const style = new TextStyle({
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: options?.fontSize ?? 16,
            fontWeight: 'bold',
            fill: options?.color ?? 0xffff00,
            stroke: { color: 0x000000, width: 3 },
        });

        const textObj = new Text({ text, style });
        textObj.anchor.set(0.5);
        textObj.x = x;
        textObj.y = y;
        this.container.addChild(textObj);

        this.floatingTexts.push({
            text: textObj,
            life: options?.duration ?? 1500,
            maxLife: options?.duration ?? 1500,
            startY: y,
        });
    }

    update(dt: number): void {
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i]!;
            ft.life -= dt;

            if (ft.life <= 0) {
                this.container.removeChild(ft.text);
                ft.text.destroy();
                this.floatingTexts.splice(i, 1);
                continue;
            }

            // Float upward
            const progress = 1 - ft.life / ft.maxLife;
            ft.text.y = ft.startY - progress * 30;
            ft.text.alpha = 1 - progress;
        }
    }

    clear(): void {
        for (const ft of this.floatingTexts) {
            this.container.removeChild(ft.text);
            ft.text.destroy();
        }
        this.floatingTexts = [];
    }
}
