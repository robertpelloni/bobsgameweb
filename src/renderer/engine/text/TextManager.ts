/**
 * TextManager — full RPG text rendering engine with typewriter, answer boxes,
 * colorized text, keyboard input, and dual text windows.
 *
 * Ported from okgame C++ Engine/text/TextManager.
 */
import { Container, Text, TextStyle, Graphics } from 'pixi.js';

export enum TextEngineState {
    CLOSED = 0,
    OPEN = 1,
    CLOSING = 2,
    ANSWER_BOX_ON = 3,
    ANSWER_BOX_CLOSING = 4,
    KEYBOARD_CLOSING = 5,
    KEYBOARD_ON = 6,
}

export class TextManager {
    private container: Container;
    private width: number;
    private height: number;

    // Text state
    private state: TextEngineState = TextEngineState.CLOSED;
    private currentText = '';
    private displayedText = '';
    private textPosition = 0;
    private ticksPerLetter = 8;
    private remainderTicks = 0;

    // Window positions
    private static readonly BOTTOM = 0;
    private static readonly TOP = 1;
    private selectedTextbox = TextManager.BOTTOM;
    private topBoxActivated = false;

    // Display flags
    private waitingForButtonForNewPage = false;
    private pausedUntilButtonPress = false;
    private waitingForButtonPressToClose = false;
    private skipText = false;
    private buttonIconIsOn = false;
    private scrollingUp = false;

    // Answer box
    private answerOptions: string[] = [];
    private selectedAnswer = 0;
    private answerCallback: ((answerIndex: number) => void) | null = null;

    // Keyboard input
    private keyboardBuffer = '';
    private keyboardActive = false;
    private keyboardCallback: ((text: string) => void) | null = null;

    // Colors
    private textColor = 0xffffff;
    private textBgColor = 0x000000;
    private textShadowColor = 0x444444;

    // Max lines per window
    private maxLines = 4;
    private lineSpacing = 18;
    private fontSize = 14;

    // Callbacks
    onTextComplete?: () => void;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.container = new Container();
    }

    // ============================================================
    // Text Display
    // ============================================================

    /**
     * Display text with typewriter effect.
     */
    text(text: string): void {
        this.currentText = this.parseColorTags(text);
        this.displayedText = '';
        this.textPosition = 0;
        this.remainderTicks = 0;
        this.state = TextEngineState.OPEN;
        this.waitingForButtonPressToClose = false;
        this.skipText = false;
    }

    /**
     * Display a dialogue with speaker name.
     */
    dialogue(speakerName: string, text: string): void {
        this.text(`${speakerName}:\n${text}`);
    }

    /**
     * Show answer options (question box).
     */
    question(options: string[], callback: (answerIndex: number) => void): void {
        this.answerOptions = options;
        this.selectedAnswer = 0;
        this.answerCallback = callback;
        this.state = TextEngineState.ANSWER_BOX_ON;
    }

    /**
     * Show keyboard input box.
     */
    getTextInput(prompt: string, callback: (text: string) => void): void {
        this.keyboardBuffer = '';
        this.keyboardActive = true;
        this.keyboardCallback = callback;
        this.state = TextEngineState.KEYBOARD_ON;
        this.currentText = prompt;
    }

    // ============================================================
    // Colorized Text
    // ============================================================

    private parseColorTags(text: string): string {
        // Strip <color=#rrggbb> tags for now, just return plain text
        return text.replace(/<[^>]+>/g, '');
    }

    // ============================================================
    // Update
    // ============================================================

    update(dt: number): void {
        if (this.state === TextEngineState.CLOSED) return;

        // Typewriter effect
        if (this.state === TextEngineState.OPEN && !this.waitingForButtonPressToClose) {
            this.remainderTicks += dt;

            while (this.remainderTicks >= this.ticksPerLetter && this.textPosition < this.currentText.length) {
                this.remainderTicks -= this.ticksPerLetter;

                if (this.skipText) {
                    this.textPosition = this.currentText.length;
                } else {
                    this.textPosition++;
                }

                this.displayedText = this.currentText.substring(0, this.textPosition);

                if (this.textPosition >= this.currentText.length) {
                    this.waitingForButtonForNewPage = true;
                    this.buttonIconIsOn = true;
                }
            }
        }

        // Answer box animation
        if (this.state === TextEngineState.ANSWER_BOX_CLOSING) {
            this.state = TextEngineState.CLOSED;
        }

        // Keyboard closing
        if (this.state === TextEngineState.KEYBOARD_CLOSING) {
            this.state = TextEngineState.CLOSED;
        }
    }

    // ============================================================
    // Input
    // ============================================================

    handleActionPress(): void {
        if (this.state === TextEngineState.CLOSED) return;

        if (this.state === TextEngineState.OPEN) {
            if (this.waitingForButtonForNewPage) {
                // Check if there's more text
                this.waitingForButtonForNewPage = false;
                this.buttonIconIsOn = false;
                this.state = TextEngineState.CLOSING;
                this.onTextComplete?.();
            } else {
                // Skip text
                this.skipText = true;
            }
        } else if (this.state === TextEngineState.ANSWER_BOX_ON) {
            // Select answer
            if (this.answerCallback) {
                this.answerCallback(this.selectedAnswer);
            }
            this.state = TextEngineState.ANSWER_BOX_CLOSING;
        } else if (this.state === TextEngineState.KEYBOARD_ON) {
            // Submit keyboard
            this.keyboardActive = false;
            if (this.keyboardCallback) {
                this.keyboardCallback(this.keyboardBuffer);
            }
            this.state = TextEngineState.KEYBOARD_CLOSING;
        }
    }

    handleCancelPress(): void {
        if (this.state === TextEngineState.OPEN) {
            this.state = TextEngineState.CLOSING;
        }
    }

    handleUp(): void {
        if (this.state === TextEngineState.ANSWER_BOX_ON) {
            this.selectedAnswer = Math.max(0, this.selectedAnswer - 1);
        }
    }

    handleDown(): void {
        if (this.state === TextEngineState.ANSWER_BOX_ON) {
            this.selectedAnswer = Math.min(this.answerOptions.length - 1, this.selectedAnswer + 1);
        }
    }

    typeKey(key: string): void {
        if (!this.keyboardActive) return;

        if (key === 'Backspace') {
            this.keyboardBuffer = this.keyboardBuffer.slice(0, -1);
        } else if (key === 'Enter') {
            this.handleActionPress();
        } else if (key.length === 1 && this.keyboardBuffer.length < 255) {
            this.keyboardBuffer += key;
        }
    }

    // ============================================================
    // Render
    // ============================================================

    render(): Container {
        this.container.removeChildren();

        if (this.state === TextEngineState.CLOSED) return this.container;

        if (this.state === TextEngineState.OPEN || this.state === TextEngineState.CLOSING) {
            this.renderTextBox();
        } else if (this.state === TextEngineState.ANSWER_BOX_ON) {
            this.renderAnswerBox();
        } else if (this.state === TextEngineState.KEYBOARD_ON) {
            this.renderKeyboard();
        }

        return this.container;
    }

    private renderTextBox(): void {
        const boxY = this.selectedTextbox === TextManager.BOTTOM
            ? this.height - 120
            : 10;
        const boxHeight = 110;
        const boxWidth = this.width - 20;

        // Background
        const bg = new Graphics();
        bg.roundRect(10, boxY, boxWidth, boxHeight, 6);
        bg.fill({ color: this.textBgColor, alpha: 0.9 });
        bg.stroke({ color: 0x4466aa, width: 1 });
        this.container.addChild(bg);

        // Text
        const style = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: this.fontSize,
            fill: this.textColor,
            wordWrap: true,
            wordWrapWidth: boxWidth - 20,
            lineHeight: this.lineSpacing,
        });

        const textLines = this.displayedText.split('\n');
        const visibleLines = textLines.slice(-this.maxLines);
        const textContent = visibleLines.join('\n');

        const textEl = new Text({ text: textContent, style });
        textEl.position.set(20, boxY + 10);
        this.container.addChild(textEl);

        // Continue indicator
        if (this.waitingForButtonForNewPage) {
            const indicator = new Text({
                text: '▼',
                style: new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 12, fill: 0xffff88 }),
            });
            indicator.position.set(boxWidth - 10, boxY + boxHeight - 20);
            this.container.addChild(indicator);
        }
    }

    private renderAnswerBox(): void {
        const boxWidth = Math.min(400, this.width - 40);
        const boxHeight = 30 + this.answerOptions.length * 28;
        const boxX = (this.width - boxWidth) / 2;
        const boxY = (this.height - boxHeight) / 2;

        // Background
        const bg = new Graphics();
        bg.roundRect(boxX, boxY, boxWidth, boxHeight, 6);
        bg.fill({ color: 0x0a0a2a, alpha: 0.95 });
        bg.stroke({ color: 0x4488ff, width: 2 });
        this.container.addChild(bg);

        // Options
        this.answerOptions.forEach((opt, i) => {
            const selected = i === this.selectedAnswer;
            const style = new TextStyle({
                fontFamily: 'Arial, sans-serif',
                fontSize: 15,
                fill: selected ? 0xffff88 : 0xaaaacc,
            });
            const text = new Text({
                text: `${selected ? '▸ ' : '  '}${opt}`,
                style,
            });
            text.position.set(boxX + 16, boxY + 12 + i * 28);
            this.container.addChild(text);
        });
    }

    private renderKeyboard(): void {
        const boxWidth = Math.min(500, this.width - 40);
        const boxHeight = 80;
        const boxX = (this.width - boxWidth) / 2;
        const boxY = this.height - 120;

        // Background
        const bg = new Graphics();
        bg.roundRect(boxX, boxY, boxWidth, boxHeight, 6);
        bg.fill({ color: 0x0a0a2a, alpha: 0.95 });
        bg.stroke({ color: 0x4488ff, width: 1 });
        this.container.addChild(bg);

        // Prompt
        if (this.currentText) {
            const prompt = new Text({
                text: this.currentText,
                style: new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 12, fill: 0x888888 }),
            });
            prompt.position.set(boxX + 10, boxY + 8);
            this.container.addChild(prompt);
        }

        // Input field
        const fieldBg = new Graphics();
        fieldBg.roundRect(boxX + 10, boxY + 30, boxWidth - 20, 24, 3);
        fieldBg.fill({ color: 0x111133 });
        fieldBg.stroke({ color: 0x334466, width: 1 });
        this.container.addChild(fieldBg);

        const input = new Text({
            text: this.keyboardBuffer + '_',
            style: new TextStyle({ fontFamily: 'monospace', fontSize: 14, fill: 0xcccccc }),
        });
        input.position.set(boxX + 16, boxY + 34);
        this.container.addChild(input);

        // Hint
        const hint = new Text({
            text: 'Press Enter to submit',
            style: new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 10, fill: 0x555555 }),
        });
        hint.position.set(boxX + 10, boxY + 60);
        this.container.addChild(hint);
    }

    // ============================================================
    // State Queries
    // ============================================================

    isTextBoxOpen(): boolean { return this.state !== TextEngineState.CLOSED; }
    isTextAnswerBoxOpen(): boolean { return this.state === TextEngineState.ANSWER_BOX_ON; }
    isKeyboardOpen(): boolean { return this.state === TextEngineState.KEYBOARD_ON; }
    getState(): TextEngineState { return this.state; }
    getCurrentText(): string { return this.displayedText; }
    getKeyboardBuffer(): string { return this.keyboardBuffer; }
    getSelectedAnswer(): number { return this.selectedAnswer; }

    setTicksPerLetter(ticks: number): void { this.ticksPerLetter = ticks; }
    setTextColor(color: number): void { this.textColor = color; }
    setTextBgColor(color: number): void { this.textBgColor = color; }

    close(): void { this.state = TextEngineState.CLOSED; }

    getContainer(): Container { return this.container; }

    destroy(): void {
        this.container.destroy({ children: true });
    }
}
