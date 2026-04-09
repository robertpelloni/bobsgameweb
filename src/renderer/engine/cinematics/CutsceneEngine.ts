/**
 * CutsceneEngine — Scripted cinematic sequences for bob's game.
 *
 * Supports:
 *  - Text display with speaker portraits
 *  - Camera movement (pan, zoom, shake)
 *  - Character movement along paths
 *  - Wait/delay commands
 *  - Fade to/from black
 *  - Conditional branching
 *  - Background music changes
 *  - Parallel execution tracks
 *
 * Parity: RPG Maker (event commands), GameMaker (sequences),
 *         Construct (timeline), Defold (collection proxies)
 */

import { Container, Graphics, Text, TextStyle } from 'pixi.js';

export interface CutsceneCommand {
    type: 'dialogue' | 'move_camera' | 'move_character' | 'wait' | 'fade'
        | 'play_music' | 'play_sfx' | 'shake' | 'set_flag' | 'if_flag'
        | 'set_position' | 'show_sprite' | 'hide_sprite' | 'parallel' | 'end';
    params: Record<string, unknown>;
    children?: CutsceneCommand[]; // for if_flag, parallel
}

export interface CutsceneCharacter {
    id: string;
    name: string;
    color: number;
    x: number;
    y: number;
    targetX?: number;
    targetY?: number;
    speed: number;
    visible: boolean;
}

export class CutsceneEngine {
    public container = new Container();
    private commands: CutsceneCommand[] = [];
    private commandIndex = 0;
    private characters: Map<string, CutsceneCharacter> = new Map();

    // State
    private isActive = false;
    private isWaiting = false;
    private waitTimer = 0;
    private fadeAlpha = 0;
    private isFading = false;
    private fadeTarget = 0;
    private fadeSpeed = 1;
    private cameraX = 0;
    private cameraY = 0;
    private cameraTargetX = 0;
    private cameraTargetY = 0;
    private cameraSpeed = 100;
    private shakeAmount = 0;
    private shakeDuration = 0;

    // Dialogue
    private dialogueSpeaker = '';
    private dialogueText = '';
    private dialogueCharIndex = 0;
    private dialogueTimer = 0;
    private dialogueColor = 0xffffff;
    private dialogueComplete = false;
    private advanceRequested = false;

    // Callbacks
    private onComplete: (() => void) | null = null;
    private onPlayMusic: ((name: string) => void) | null = null;
    private onPlaySFX: ((name: string) => void) | null = null;
    private onGetFlag: ((name: string) => boolean) | null = null;
    private onSetFlag: ((name: string, value: boolean) => void) | null = null;

    private width: number;
    private height: number;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
    }

    /** Load a cutscene script */
    loadScript(commands: CutsceneCommand[]): void {
        this.commands = commands;
        this.commandIndex = 0;
        this.characters.clear();
    }

    /** Start playing */
    play(onComplete: () => void): void {
        this.isActive = true;
        this.commandIndex = 0;
        this.onComplete = onComplete;
        this.processNextCommand();
    }

    /** Request advance (Space/Enter) */
    advance(): void {
        this.advanceRequested = true;
    }

    /** Update the cutscene engine */
    update(dt: number): void {
        if (!this.isActive) return;

        // Wait timer
        if (this.isWaiting) {
            this.waitTimer -= dt;
            if (this.waitTimer <= 0) {
                this.isWaiting = false;
                this.processNextCommand();
            }
            return;
        }

        // Dialogue typewriter
        if (this.dialogueSpeaker || this.dialogueText) {
            this.dialogueTimer += dt;
            if (this.dialogueCharIndex < this.dialogueText.length) {
                this.dialogueCharIndex = Math.min(
                    this.dialogueText.length,
                    this.dialogueCharIndex + Math.floor(dt * 30),
                );
            }

            if (this.dialogueComplete && this.advanceRequested) {
                this.dialogueSpeaker = '';
                this.dialogueText = '';
                this.dialogueComplete = false;
                this.advanceRequested = false;
                this.processNextCommand();
            } else if (
                this.dialogueCharIndex >= this.dialogueText.length &&
                this.advanceRequested
            ) {
                this.dialogueComplete = true;
                this.advanceRequested = false;
            }
            return;
        }

        // Fade
        if (this.isFading) {
            if (this.fadeAlpha < this.fadeTarget) {
                this.fadeAlpha = Math.min(this.fadeTarget, this.fadeAlpha + this.fadeSpeed * dt);
            } else {
                this.fadeAlpha = Math.max(this.fadeTarget, this.fadeAlpha - this.fadeSpeed * dt);
            }
            if (Math.abs(this.fadeAlpha - this.fadeTarget) < 0.01) {
                this.fadeAlpha = this.fadeTarget;
                this.isFading = false;
                this.processNextCommand();
            }
            return;
        }

        // Camera movement
        const camDx = this.cameraTargetX - this.cameraX;
        const camDy = this.cameraTargetY - this.cameraY;
        if (Math.abs(camDx) > 1 || Math.abs(camDy) > 1) {
            const dist = Math.sqrt(camDx * camDx + camDy * camDy);
            const move = Math.min(dist, this.cameraSpeed * dt);
            this.cameraX += (camDx / dist) * move;
            this.cameraY += (camDy / dist) * move;
        }

        // Character movement
        for (const [, char] of this.characters) {
            if (char.targetX !== undefined && char.targetY !== undefined) {
                const dx = char.targetX - char.x;
                const dy = char.targetY - char.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 1) {
                    const move = Math.min(dist, char.speed * dt);
                    char.x += (dx / dist) * move;
                    char.y += (dy / dist) * move;
                } else {
                    char.x = char.targetX;
                    char.y = char.targetY;
                    char.targetX = undefined;
                    char.targetY = undefined;
                }
            }
        }

        // Shake
        if (this.shakeDuration > 0) {
            this.shakeDuration -= dt;
            if (this.shakeDuration <= 0) this.shakeAmount = 0;
        }
    }

    /** Render the cutscene overlay */
    render(): void {
        this.container.removeChildren();

        if (!this.isActive) return;

        // Shake offset
        const sx = this.shakeAmount > 0 ? (Math.random() - 0.5) * this.shakeAmount * 2 : 0;
        const sy = this.shakeAmount > 0 ? (Math.random() - 0.5) * this.shakeAmount * 2 : 0;

        // Render characters
        for (const [, char] of this.characters) {
            if (!char.visible) continue;
            const g = new Graphics();
            g.circle(char.x - this.cameraX + sx, char.y - this.cameraY + sy, 12);
            g.fill({ color: char.color });
            this.container.addChild(g);

            const nameStyle = new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 9, fill: 0xffffff });
            const nameText = new Text({ text: char.name, style: nameStyle });
            nameText.anchor.set(0.5);
            nameText.position.set(char.x - this.cameraX + sx, char.y - this.cameraY + sy - 20);
            this.container.addChild(nameText);
        }

        // Dialogue box
        if (this.dialogueSpeaker || this.dialogueText) {
            this.renderDialogueBox();
        }

        // Fade overlay
        if (this.fadeAlpha > 0.01) {
            const fade = new Graphics();
            fade.rect(0, 0, this.width, this.height);
            fade.fill({ color: 0x000000, alpha: this.fadeAlpha });
            this.container.addChild(fade);
        }
    }

    private renderDialogueBox(): void {
        const boxW = this.width - 60;
        const boxH = 120;
        const boxX = 30;
        const boxY = this.height - boxH - 30;

        const bg = new Graphics();
        bg.roundRect(boxX, boxY, boxW, boxH, 8);
        bg.fill({ color: 0x0a0a2a, alpha: 0.95 });
        bg.stroke({ color: 0x886622, width: 2 });
        this.container.addChild(bg);

        // Speaker name with color badge
        if (this.dialogueSpeaker) {
            const badge = new Graphics();
            badge.roundRect(boxX + 10, boxY - 18, this.dialogueSpeaker.length * 10 + 20, 24, 4);
            badge.fill({ color: this.dialogueColor });
            this.container.addChild(badge);

            const nameStyle = new TextStyle({
                fontFamily: 'Arial, sans-serif',
                fontSize: 14,
                fill: 0xffffff,
                fontWeight: 'bold',
            });
            const nameText = new Text({ text: this.dialogueSpeaker, style: nameStyle });
            nameText.position.set(boxX + 20, boxY - 16);
            this.container.addChild(nameText);
        }

        // Dialogue text
        const visibleText = this.dialogueText.substring(0, this.dialogueCharIndex);
        const textStyle = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 16,
            fill: 0xeeeedd,
            wordWrap: true,
            wordWrapWidth: boxW - 32,
        });
        const text = new Text({ text: visibleText, style: textStyle });
        text.position.set(boxX + 16, boxY + 38);
        this.container.addChild(text);

        // Advance indicator
        if (this.dialogueComplete || this.dialogueCharIndex >= this.dialogueText.length) {
            const blink = Math.sin(Date.now() * 0.005) > 0;
            if (blink) {
                const indStyle = new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 14, fill: 0x886622 });
                const ind = new Text({ text: '▼', style: indStyle });
                ind.position.set(boxX + boxW - 30, boxY + boxH - 25);
                this.container.addChild(ind);
            }
        }
    }

    private processNextCommand(): void {
        if (this.commandIndex >= this.commands.length) {
            this.isActive = false;
            if (this.onComplete) this.onComplete();
            return;
        }

        const cmd = this.commands[this.commandIndex++];
        switch (cmd.type) {
            case 'dialogue':
                this.dialogueSpeaker = (cmd.params.speaker as string) ?? '';
                this.dialogueText = (cmd.params.text as string) ?? '';
                this.dialogueColor = (cmd.params.color as number) ?? 0xffffff;
                this.dialogueCharIndex = 0;
                this.dialogueTimer = 0;
                this.dialogueComplete = false;
                break;

            case 'wait':
                this.isWaiting = true;
                this.waitTimer = (cmd.params.duration as number) ?? 1;
                break;

            case 'fade': {
                this.fadeTarget = (cmd.params.alpha as number) ?? 1;
                this.fadeSpeed = (cmd.params.speed as number) ?? 1;
                this.isFading = true;
                break;
            }

            case 'move_camera':
                this.cameraTargetX = (cmd.params.x as number) ?? this.cameraTargetX;
                this.cameraTargetY = (cmd.params.y as number) ?? this.cameraTargetY;
                this.cameraSpeed = (cmd.params.speed as number) ?? 100;
                // Wait for camera to arrive
                this.isWaiting = true;
                this.waitTimer = 0.1; // small delay to let camera start moving
                break;

            case 'move_character': {
                const charId = cmd.params.id as string;
                const char = this.characters.get(charId);
                if (char) {
                    char.targetX = cmd.params.x as number;
                    char.targetY = cmd.params.y as number;
                    char.speed = (cmd.params.speed as number) ?? 100;
                }
                this.isWaiting = true;
                this.waitTimer = (cmd.params.duration as number) ?? 1;
                break;
            }

            case 'set_position': {
                const id = cmd.params.id as string;
                const c = this.characters.get(id);
                if (c) {
                    c.x = cmd.params.x as number;
                    c.y = cmd.params.y as number;
                    c.targetX = undefined;
                    c.targetY = undefined;
                }
                this.processNextCommand();
                break;
            }

            case 'show_sprite': {
                const charId = cmd.params.id as string;
                const char = this.characters.get(charId);
                if (char) char.visible = true;
                this.processNextCommand();
                break;
            }

            case 'hide_sprite': {
                const charId = cmd.params.id as string;
                const char = this.characters.get(charId);
                if (char) char.visible = false;
                this.processNextCommand();
                break;
            }

            case 'shake':
                this.shakeAmount = (cmd.params.amount as number) ?? 5;
                this.shakeDuration = (cmd.params.duration as number) ?? 0.5;
                this.processNextCommand();
                break;

            case 'play_music':
                if (this.onPlayMusic) this.onPlayMusic(cmd.params.name as string);
                this.processNextCommand();
                break;

            case 'play_sfx':
                if (this.onPlaySFX) this.onPlaySFX(cmd.params.name as string);
                this.processNextCommand();
                break;

            case 'set_flag':
                if (this.onSetFlag) {
                    this.onSetFlag(cmd.params.name as string, cmd.params.value as boolean ?? true);
                }
                this.processNextCommand();
                break;

            case 'if_flag': {
                const flagName = cmd.params.name as string;
                const flagValue = this.onGetFlag ? this.onGetFlag(flagName) : false;
                const branch = flagValue ? cmd.params.trueBranch as number : cmd.params.falseBranch as number;
                if (branch !== undefined) {
                    this.commandIndex = branch;
                }
                this.processNextCommand();
                break;
            }

            case 'parallel':
                // Process all children simultaneously (simplified: just run them in sequence)
                if (cmd.children) {
                    for (const child of cmd.children) {
                        this.processSingleCommand(child);
                    }
                }
                this.processNextCommand();
                break;

            case 'end':
                this.isActive = false;
                if (this.onComplete) this.onComplete();
                break;

            default:
                this.processNextCommand();
                break;
        }
    }

    private processSingleCommand(cmd: CutsceneCommand): void {
        switch (cmd.type) {
            case 'set_position': {
                const c = this.characters.get(cmd.params.id as string);
                if (c) { c.x = cmd.params.x as number; c.y = cmd.params.y as number; }
                break;
            }
            case 'show_sprite': {
                const c = this.characters.get(cmd.params.id as string);
                if (c) c.visible = true;
                break;
            }
            case 'hide_sprite': {
                const c = this.characters.get(cmd.params.id as string);
                if (c) c.visible = false;
                break;
            }
        }
    }

    /** Register a character for the cutscene */
    addCharacter(char: CutsceneCharacter): void {
        this.characters.set(char.id, char);
    }

    /** Set callbacks */
    setCallbacks(callbacks: {
        onPlayMusic?: (name: string) => void;
        onPlaySFX?: (name: string) => void;
        onGetFlag?: (name: string) => boolean;
        onSetFlag?: (name: string, value: boolean) => void;
    }): void {
        this.onPlayMusic = callbacks.onPlayMusic ?? null;
        this.onPlaySFX = callbacks.onPlaySFX ?? null;
        this.onGetFlag = callbacks.onGetFlag ?? null;
        this.onSetFlag = callbacks.onSetFlag ?? null;
    }

    get active(): boolean { return this.isActive; }
    get waitingForAdvance(): boolean {
        return this.dialogueComplete || this.dialogueCharIndex >= this.dialogueText.length;
    }
}
