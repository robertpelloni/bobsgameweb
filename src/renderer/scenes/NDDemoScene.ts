// @ts-nocheck
import { Scene, SceneConfig } from '../state/Scene';
import { NDPuzzleGame } from '../engine/nd/NDPuzzleGame';
import { LibretroGame } from '../engine/nd/LibretroGame';
import { NDButton, ND } from '../engine/nd/ND';
import { InputManager, Key } from '../input/InputManager';
import { StateManager } from '../state/StateManager';

export class NDDemoScene extends Scene {
    private nd: ND;

    constructor(config: SceneConfig) {
        super(config);
        this.nd = new ND();
    }

    public async create(): Promise<void> {
        this.nd.init();
        this.container.addChild(this.nd.container);
        
        // Scale the ND to fit the screen
        const scale = Math.min(this.width / 400, this.height / 600);
        this.nd.container.scale.set(scale);
        this.nd.container.position.set(this.centerX, this.centerY);

        // Start with the puzzle game
        this.openPuzzle();
    }

    private openPuzzle(): void {
        this.nd.setGame(new NDPuzzleGame(this.nd));
    }

    private openLibretro(): void {
        this.nd.setGame(new LibretroGame(this.nd, this.app));
    }

    public onResize(width: number, height: number): void {
        const scale = Math.min(width / 400, height / 600);
        this.nd.container.scale.set(scale);
        this.nd.container.position.set(this.centerX, this.centerY);
    }

    protected onUpdate(dt: number): void {
        this.updateInputs();
        this.nd.update(dt);
        
        if (InputManager.isCancelPressed()) {
            StateManager.pop();
        }

        // Toggle between games for demo
        if (InputManager.isKeyPressed(Key.Num1)) this.openPuzzle();
        if (InputManager.isKeyPressed(Key.Num2)) this.openLibretro();
    }

    private updateInputs(): void {
        // Map keyboard to virtual ND buttons
        this.nd.setButtonState(NDButton.UP, InputManager.isKeyHeld(Key.Up));
        this.nd.setButtonState(NDButton.DOWN, InputManager.isKeyHeld(Key.Down));
        this.nd.setButtonState(NDButton.LEFT, InputManager.isKeyHeld(Key.Left));
        this.nd.setButtonState(NDButton.RIGHT, InputManager.isKeyHeld(Key.Right));
        
        this.nd.setButtonState(NDButton.A, InputManager.isKeyHeld(Key.X) || InputManager.isKeyHeld(Key.Enter));
        this.nd.setButtonState(NDButton.B, InputManager.isKeyHeld(Key.Z) || InputManager.isKeyHeld(Key.Backspace));
        this.nd.setButtonState(NDButton.X, InputManager.isKeyHeld(Key.S));
        this.nd.setButtonState(NDButton.Y, InputManager.isKeyHeld(Key.A));
        
        this.nd.setButtonState(NDButton.START, InputManager.isKeyHeld(Key.Enter));
        this.nd.setButtonState(NDButton.SELECT, InputManager.isKeyHeld(Key.Tab));
    }
}
