/**
 * EngineScene — Scene wrapper for the ClientGameEngine running the full RPG game.
 *
 * This scene wraps the ClientGameEngine and integrates it into the scene-based
 * StateManager flow. When active, it renders the full RPG world with the player,
 * map, GUI, and all game systems.
 *
 * The nD (mini-game console) is opened within this scene by pressing Enter.
 */
import { Container, Graphics } from 'pixi.js';
import { ClientGameEngine } from '../engine/rpg/ClientGameEngine';
import { ND, NDButton } from '../engine/nd/ND';
import { BobsGame } from '../engine/puzzle/BobsGame';
import { ControlsManager, InputAction, DEFAULT_BINDINGS } from '../engine/input/ControlsManager';
import { GlobalSettings } from '../engine/shared/GlobalSettings';
import { Logger } from '../engine/debug/Logger';

const log = new Logger('EngineScene');

export interface EngineSceneConfig {
    width: number;
    height: number;
}

export class EngineScene {
    readonly name = 'engine';
    container: Container;

    private clientEngine: ClientGameEngine;
    private nd: ND;
    private bobsGame: BobsGame;
    private settings: GlobalSettings;
    private controls: ControlsManager;

    private width: number;
    private height: number;

    // State flags
    private ndOpen = false;
    private initialized = false;

    constructor(config: EngineSceneConfig) {
        this.width = config.width;
        this.height = config.height;
        this.container = new Container();

        // Initialize core systems
        this.clientEngine = new ClientGameEngine();
        this.settings = new GlobalSettings();
        this.controls = new ControlsManager(DEFAULT_BINDINGS);

        // Initialize nD console
        this.nd = new ND(this.width, this.height);

        // Initialize BobsGame (the puzzle game inside the nD)
        this.bobsGame = new BobsGame();
        this.nd.setGame(this.bobsGame);

        log.info('EngineScene created');
    }

    async create(): Promise<void> {
        // Attach input listeners to window so controls work
        this.controls.attach(window);
        await this.clientEngine.init();
        this.initialized = true;
        log.info('EngineScene initialized — ClientGameEngine ready');
    }

    update(dt: number): void {
        if (!this.initialized) return;

        // ControlsManager uses event listeners (attached in constructor),
        // no manual update needed. endFrame() clears just-pressed states.

        // Handle global keys
        this.handleInput();

        if (this.ndOpen) {
            // nD is open — update the nD and its game
            this.nd.update(dt);

            // Forward held directional input to the nD buttons
            this.nd.setButtonState(NDButton.UP, this.controls.isActionDown(InputAction.UP));
            this.nd.setButtonState(NDButton.DOWN, this.controls.isActionDown(InputAction.DOWN));
            this.nd.setButtonState(NDButton.LEFT, this.controls.isActionDown(InputAction.LEFT));
            this.nd.setButtonState(NDButton.RIGHT, this.controls.isActionDown(InputAction.RIGHT));

            // A = confirm, B = cancel, START = pause
            this.nd.setButtonState(NDButton.A, this.controls.isActionJustPressed(InputAction.ACTION));
            this.nd.setButtonState(NDButton.B, this.controls.isActionJustPressed(InputAction.CANCEL));
            this.nd.setButtonState(NDButton.START, this.controls.isActionJustPressed(InputAction.PAUSE));
        } else {
            // nD is closed — update the main RPG engine
            this.clientEngine.update(dt);
        }

        // Clear just-pressed/released states for next frame
        this.controls.endFrame();
    }

    render(): void {
        this.container.removeChildren();

        if (this.ndOpen) {
            // Render game world behind nD
            const worldContainer = this.clientEngine.render();
            this.container.addChild(worldContainer);

            // Darken background behind nD
            const overlay = new Graphics();
            overlay.rect(0, 0, this.width, this.height);
            overlay.fill({ color: 0x000000, alpha: 0.5 });
            this.container.addChild(overlay);

            // Render nD on top
            const ndContainer = this.nd.render();
            this.container.addChild(ndContainer);
        } else {
            // Render just the game world
            const worldContainer = this.clientEngine.render();
            this.container.addChild(worldContainer);
        }
    }

    resize(width: number, height: number): void {
        this.width = width;
        this.height = height;
    }

    private handleInput(): void {
        // Toggle nD on/off with Enter (ACTION) or Menu key
        if (this.controls.isActionJustPressed(InputAction.ACTION) && !this.ndOpen) {
            this.openND();
            return;
        }

        if (this.controls.isActionJustPressed(InputAction.CANCEL)) {
            if (this.ndOpen) {
                this.closeND();
            }
        }
    }

    private openND(): void {
        this.ndOpen = true;
        this.nd.setActivated(true);
        log.info('nD opened');
    }

    private closeND(): void {
        this.ndOpen = false;
        this.nd.setActivated(false);
        log.info('nD closed');
    }

    // ============================================================
    // Access
    // ============================================================

    getClientEngine(): ClientGameEngine { return this.clientEngine; }
    getND(): ND { return this.nd; }
    getBobsGame(): BobsGame { return this.bobsGame; }
    isNDOpen(): boolean { return this.ndOpen; }
    isInitialized(): boolean { return this.initialized; }

    destroy(): void {
        this.controls.detach();
        this.nd.destroy();
        this.clientEngine.cleanup();
        this.container.destroy({ children: true });
    }
}
