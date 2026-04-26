/**
 * ND — the n-dimensional mini-game console container.
 *
 * Ported from Java com.bobsgame.client.engine.game.nd.ND (630 lines).
 * The "nD" is the in-game handheld console that players use to play mini-games.
 * It zooms in/out with easing animations and renders the active game inside a
 * console-like frame. Manages game state transitions and screen effects.
 */
import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { MiniGameEngine, MiniGameState } from './MiniGameEngine';
import { Easing } from '../rpg/Easing';
import { StateManager } from '../state/StateManager';
import { Logger } from '../debug/Logger';

const log = new Logger('ND');

export const ND_SCREEN_WIDTH = 640;
export const ND_SCREEN_HEIGHT = 480;

export enum NDButton {
    UP = 'UP',
    DOWN = 'DOWN',
    LEFT = 'LEFT',
    RIGHT = 'RIGHT',
    A = 'A',
    B = 'B',
    X = 'X',
    Y = 'Y',
    START = 'START',
    SELECT = 'SELECT',
    L = 'L',
    R = 'R',
}

export class ND {
    // State
    private activated = false;
    private scrollingDown = false;
    private scrolledUp = false;

    // Animation
    private nDDrawAlpha = 1.0;
    private nDZoom = 0.01;
    private widthThisFrame = 0;
    private targetWidth = 1280;
    private fadeInTime = 1500;
    private fadeOutTime = 500;
    private ticksSinceTurnedOn = 0;
    private ticksSinceTurnedOff = 0;

    // Screen dimensions
    private screenWidth: number;
    private screenHeight: number;

    // Light effect
    private lightAlpha = 1.0;
    private lightFadeToggle = false;
    private lightFadeSpeed = 0.0005;
    private lightMaxAlpha = 0.75;
    private lightMinAlpha = 0.70;

    // Pixel mesh overlay
    private fadeMesh = true;
    private fadeOutMeshTicks = 0;
    private fadeOutMeshTicksSpeed = 2000;
    private drawMeshAlpha = 0.5;

    // Game management
    private gameStateManager: StateManager;
    private currentGame: MiniGameEngine | null = null;
    container: Container;

    // Dual screen support (top/bottom screens like DS)
    readonly topScreen: Container;
    readonly bottomScreen: Container;

    // Button state (for LibretroGame compatibility)
    private buttonStates: Map<NDButton, boolean> = new Map();

    // Console frame colors
    private consoleColor = 0x1a1a2e;
    private screenColor = 0x000008;

    constructor(screenWidth = ND_SCREEN_WIDTH, screenHeight = ND_SCREEN_HEIGHT) {
        this.screenWidth = screenWidth;
        this.screenHeight = screenHeight;
        this.gameStateManager = new StateManager(new Container());
        this.container = new Container();
        this.topScreen = new Container();
        this.bottomScreen = new Container();
        this.container.addChild(this.topScreen);
        this.container.addChild(this.bottomScreen);
    }

    // ============================================================
    // Initialization
    // ============================================================

    init(): void {
        this.fadeInTime = 1500;
        this.fadeOutTime = 500;
    }

    // ============================================================
    // Game Management
    // ============================================================

    setGame(game: any): void {
        this.currentGame = game;
        game.init();
        log.info(`nD game set: ${game.name}`);
    }

    getGame(): MiniGameEngine | null {
        return this.currentGame;
    }

    // ============================================================
    // Activation
    // ============================================================

    toggleActivated(): void {
        if (!this.activated) {
            this.setActivated(true);
        } else {
            if (this.scrollingDown) {
                this.scrollingDown = false;
            } else {
                // Ask the game to close
                if (this.currentGame) {
                    this.setActivated(false);
                } else {
                    this.setActivated(false);
                }
            }
        }
    }

    setActivated(active: boolean): void {
        this.activated = active;
        if (active) {
            this.ticksSinceTurnedOn = 0;
            this.scrollingDown = false;
            this.scrolledUp = false;
            this.fadeMesh = true;
            this.fadeOutMeshTicks = 0;
            this.drawMeshAlpha = 1.0;
        } else {
            this.ticksSinceTurnedOff = 0;
            this.scrollingDown = false;
        }
    }

    isActivated(): boolean { return this.activated; }
    isScrolledUp(): boolean { return this.scrolledUp; }

    // ============================================================
    // Update
    // ============================================================

    update(dt: number): void {
        if (!this.activated) return;

        this.targetWidth = this.screenWidth * 2;

        if (this.currentGame) {
            this.currentGame.update(dt);
        }

        // Light fade in/out
        if (this.lightFadeToggle) {
            this.lightAlpha += dt * this.lightFadeSpeed;
            if (this.lightAlpha >= this.lightMaxAlpha) {
                this.lightAlpha = this.lightMaxAlpha;
                this.lightFadeToggle = false;
            }
        } else {
            this.lightAlpha -= dt * this.lightFadeSpeed;
            if (this.lightAlpha < this.lightMinAlpha) {
                this.lightAlpha = this.lightMinAlpha;
                this.lightFadeToggle = true;
            }
        }

        // Scroll animation
        if (!this.scrolledUp) {
            this.scrollUp(dt);
        }

        if (this.scrollingDown) {
            this.scrollDown(dt);
        }

        // Mesh fade
        if (this.scrolledUp) {
            this.fadeOutMeshTicks += dt;
            if (this.fadeOutMeshTicks > this.fadeOutMeshTicksSpeed) {
                this.fadeOutMeshTicks = 0;
                this.fadeMesh = false;
            }
            if (this.fadeMesh) {
                this.drawMeshAlpha = 0.1 + (0.5 - (0.5 * (this.fadeOutMeshTicks / this.fadeOutMeshTicksSpeed)));
            } else {
                this.drawMeshAlpha = 0.1;
            }
        }
    }

    // ============================================================
    // Scroll Animations
    // ============================================================

    private scrollUp(dt: number): void {
        this.ticksSinceTurnedOn += dt;

        if (this.widthThisFrame !== this.targetWidth) {
            if (this.ticksSinceTurnedOn <= this.fadeInTime) {
                this.widthThisFrame = Easing.easeOutParabolicBounce(
                    this.ticksSinceTurnedOn, 0, this.targetWidth, this.fadeInTime
                );
            } else {
                this.widthThisFrame = this.targetWidth;
            }

            this.nDDrawAlpha = (this.widthThisFrame * 2.0) / this.targetWidth;
            if (this.nDDrawAlpha > 1.0) this.nDDrawAlpha = 1.0;

            this.nDZoom = this.widthThisFrame / this.targetWidth;
        } else {
            if (!this.scrolledUp) {
                this.onScrolledUp();
                this.scrolledUp = true;
            }
        }
    }

    private scrollDown(dt: number): void {
        this.ticksSinceTurnedOff += dt;

        if (this.widthThisFrame > 0) {
            this.fadeMesh = true;
            this.fadeOutMeshTicks = 0;
            this.drawMeshAlpha = 1.0;

            this.widthThisFrame = this.targetWidth - Easing.easeInBackSlingshot(
                this.ticksSinceTurnedOff, 0, this.targetWidth, this.fadeOutTime
            );

            this.nDDrawAlpha = (this.widthThisFrame * 2.0) / this.targetWidth;
            if (this.nDDrawAlpha > 1.0) this.nDDrawAlpha = 1.0;

            this.nDZoom = this.widthThisFrame / this.targetWidth;
        } else {
            this.activated = false;
            this.scrollingDown = false;
        }
    }

    private onScrolledUp(): void {
        log.info('nD scrolled up — game screen active');
    }

    // ============================================================
    // Render
    // ============================================================

    render(): Container {
        this.container.removeChildren();

        if (!this.activated) return this.container;

        const g = new Graphics();

        // Console body background
        const consoleWidth = this.screenWidth * this.nDZoom * 1.3;
        const consoleHeight = this.screenHeight * this.nDZoom * 1.3;
        const cx = (this.screenWidth - consoleWidth) / 2;
        const cy = (this.screenHeight - consoleHeight) / 2;

        g.roundRect(cx, cy, consoleWidth, consoleHeight, 12 * this.nDZoom);
        g.fill({ color: this.consoleColor, alpha: this.nDDrawAlpha });
        g.stroke({ color: 0x333355, width: 2, alpha: this.nDDrawAlpha });

        this.container.addChild(g);

        // Screen area (inner)
        const screenMargin = 20 * this.nDZoom;
        const sx = cx + screenMargin;
        const sy = cy + screenMargin;
        const sw = consoleWidth - screenMargin * 2;
        const sh = consoleHeight - screenMargin * 2;

        const screenG = new Graphics();
        screenG.rect(sx, sy, sw, sh);
        screenG.fill({ color: this.screenColor, alpha: this.nDDrawAlpha });

        // Pixel mesh overlay
        if (this.drawMeshAlpha > 0.05) {
            const meshDiv = 16;
            screenG.setStrokeStyle({
                color: 0x111122,
                width: 0.5,
                alpha: this.drawMeshAlpha * this.nDDrawAlpha,
            });
            for (let x = 0; x < sw; x += meshDiv * this.nDZoom) {
                screenG.moveTo(sx + x, sy);
                screenG.lineTo(sx + x, sy + sh);
            }
            for (let y = 0; y < sh; y += meshDiv * this.nDZoom) {
                screenG.moveTo(sx, sy + y);
                screenG.lineTo(sx + sw, sy + y);
            }
        }

        // Light effect
        const lightG = new Graphics();
        lightG.rect(sx, sy, sw, sh);
        lightG.fill({ color: 0xf0f0ff, alpha: this.lightAlpha * 0.03 * this.nDDrawAlpha });

        this.container.addChild(screenG);
        this.container.addChild(lightG);

        // Game content (inside the screen area)
        if (this.currentGame && this.scrolledUp) {
            this.currentGame.render();
        }

        // "nD" label on the console body
        const labelStyle = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 10 * this.nDZoom,
            fill: 0x666688,
        });
        const label = new Text({ text: 'nD', style: labelStyle });
        label.alpha = this.nDDrawAlpha;
        label.position.set(cx + consoleWidth - 24 * this.nDZoom, cy + consoleHeight - 16 * this.nDZoom);
        this.container.addChild(label);

        // "POWER" LED
        const ledG = new Graphics();
        ledG.circle(cx + 8 * this.nDZoom, cy + consoleHeight - 10 * this.nDZoom, 3 * this.nDZoom);
        ledG.fill({ color: this.activated ? 0x44ff44 : 0x441111 });
        this.container.addChild(ledG);

        return this.container;
    }

    // ============================================================
    // Access
    // ============================================================

    getZoom(): number { return this.nDZoom; }
    getAlpha(): number { return this.nDDrawAlpha; }
    getScreenWidth(): number { return this.screenWidth; }
    getScreenHeight(): number { return this.screenHeight; }
    getContainer(): Container { return this.container; }

    isButtonPressed(button: NDButton): boolean {
        return this.buttonStates.get(button) ?? false;
    }

    setButton(button: NDButton, pressed: boolean): void {
        this.buttonStates.set(button, pressed);
    }

    setButtonState(button: NDButton, pressed: boolean): void {
        this.setButton(button, pressed);
    }

    destroy(): void {
        // currentGame cleanup handled by its own lifecycle
        this.container.destroy({ children: true });
    }
}
