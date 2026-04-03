import { NDGameEngine } from './NDGameEngine';
import { ND } from './ND';
import { PuzzleGame, PuzzleRenderer, GameState } from '../../puzzle';
import { StateManager } from '../../state/StateManager';

export class NDPuzzleGame extends NDGameEngine {
    private puzzleGame: PuzzleGame | null = null;
    private puzzleRenderer: PuzzleRenderer | null = null;
    private seed: number;

    constructor(nd: ND, seed?: number) {
        super(nd);
        this.seed = seed ?? Date.now();
    }

    public override init(): void {
        super.init();

        // Initialize Puzzle logic (headless)
        // Note: we might need a fake scene or just pass null if PuzzleGame handles it
        // GameLogic doesn't strictly need a scene if we decouple some events, but for now we'll pass a dummy object or state manager
        this.puzzleGame = new PuzzleGame(StateManager as any, this.seed);
        
        // Initialize Puzzle renderer targeting the top screen
        this.puzzleRenderer = new PuzzleRenderer({
            cellSize: 10, // Small cells to fit 256x192
            gridOffsetX: 10,
            gridOffsetY: 10,
            showGrid: false,
            borderWidth: 1
        });
        
        this.puzzleRenderer.attachGame(this.puzzleGame);
        
        // Attach to top screen
        this.nd.topScreen.addChild(this.puzzleRenderer.container);

        this.puzzleGame.initGame();
        this.puzzleGame.start();
    }

    public override cleanup(): void {
        if (this.puzzleRenderer) {
            this.puzzleRenderer.container.removeFromParent();
            this.puzzleRenderer.destroy();
            this.puzzleRenderer = null;
        }
        if (this.puzzleGame) {
            this.puzzleGame.removeAllListeners();
            this.puzzleGame = null;
        }
    }

    public override update(dt: number): void {
        if (this.puzzleGame && this.puzzleGame.state === GameState.PLAYING) {
            // Note: input should be wired to the virtual ND buttons or keyboard
            this.puzzleGame.update();
        }
        if (this.puzzleRenderer) {
            this.puzzleRenderer.update();
        }
    }

    public override render(): void {
        // Nothing special to render manually since PIXI scene graph handles it
    }

    public override titleMenuUpdate(): void {
        // Bottom screen menu navigation
    }
}
