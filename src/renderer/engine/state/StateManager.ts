/**
 * StateManager — game state stack (title, lobby, gameplay, menus, etc.)
 *
 * Ported from okgame C++ Engine/state/StateManager.
 */
import { Container } from 'pixi.js';

export type GameStateType =
    | 'logo'
    | 'title'
    | 'login'
    | 'create_account'
    | 'logged_out'
    | 'legal'
    | 'lobby'
    | 'gameplay'
    | 'paused'
    | 'game_over'
    | 'you_will_be_notified'
    | 'servers_shutdown'
    | 'custom';

export interface GameState {
    type: GameStateType;
    name: string;
    container: Container;
    update(dt: number): void;
    onEnter?(): void;
    onExit?(): void;
}

export class StateManager {
    private states: GameState[] = [];
    private container: Container;

    constructor(container: Container) {
        this.container = container;
    }

    /**
     * Push a new state onto the stack.
     */
    pushState(state: GameState): void {
        // Exit current top
        const current = this.getCurrentState();
        if (current?.onExit) current.onExit();
        if (current) current.container.visible = false;

        this.states.push(state);
        this.container.addChild(state.container);
        state.container.visible = true;

        if (state.onEnter) state.onEnter();
    }

    /**
     * Pop the current state.
     */
    popState(): void {
        if (this.states.length === 0) return;

        const old = this.states.pop()!;
        if (old.onExit) old.onExit();
        old.container.visible = false;
        this.container.removeChild(old.container);

        // Show new top
        const current = this.getCurrentState();
        if (current) {
            current.container.visible = true;
            if (current.onEnter) current.onEnter();
        }
    }

    /**
     * Replace the current state with a new one.
     */
    replaceState(state: GameState): void {
        this.popState();
        this.pushState(state);
    }

    /**
     * Clear all states.
     */
    clearAll(): void {
        while (this.states.length > 0) {
            this.popState();
        }
    }

    getCurrentState(): GameState | null {
        return this.states.length > 0 ? this.states[this.states.length - 1] : null;
    }

    getCurrentStateType(): GameStateType | null {
        return this.getCurrentState()?.type ?? null;
    }

    getStackDepth(): number {
        return this.states.length;
    }

    /**
     * Update the topmost state.
     */
    update(dt: number): void {
        const current = this.getCurrentState();
        if (current) current.update(dt);
    }

    /**
     * Check if a specific state type is in the stack.
     */
    hasState(type: GameStateType): boolean {
        return this.states.some(s => s.type === type);
    }
}
