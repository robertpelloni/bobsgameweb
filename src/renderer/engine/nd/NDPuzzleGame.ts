import { NDGameEngine } from './NDGameEngine';
import { ND, NDButton } from './ND';
import { PuzzleGame, PuzzleRenderer, GameState } from '../../puzzle';
import { PuzzlePlayer } from '../../shared/puzzle/PuzzlePlayer';
import { StateManager } from '../../state/StateManager';
import { Container, Text, Graphics } from 'pixi.js';

export class NDPuzzleGame extends NDGameEngine {
    private puzzleGame: PuzzleGame | null = null;
    private puzzleRenderer: PuzzleRenderer | null = null;
    private puzzlePlayer: PuzzlePlayer | null = null;
    private seed: number;

    private menuContainer: Container | null = null;
    private menuText: Text | null = null;

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
        this.puzzlePlayer = new PuzzlePlayer(this.puzzleGame);
        
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

        this.createBottomMenu();

        this.puzzleGame.initGame();
        this.puzzleGame.start();
    }

    private createBottomMenu(): void {
        this.menuContainer = new Container();
        
        const bg = new Graphics();
        bg.rect(0, 0, 256, 192);
        bg.fill(0x222244);
        this.menuContainer.addChild(bg);

        this.menuText = new Text({
            text: 'nD PUZZLE MODE\n\nTouch to Restart',
            style: { fill: 0xffffff, fontSize: 14, align: 'center' }
        });
        this.menuText.anchor.set(0.5);
        this.menuText.position.set(128, 96);
        this.menuContainer.addChild(this.menuText);

        this.nd.bottomScreen.addChild(this.menuContainer);
        
        // Make it interactive
        this.menuContainer.eventMode = 'static';
        this.menuContainer.on('pointerdown', () => {
            if (this.puzzleGame) {
                this.puzzleGame.initGame();
                this.puzzleGame.start();
            }
        });
    }

    public override cleanup(): void {
        if (this.menuContainer) {
            this.menuContainer.removeFromParent();
            this.menuContainer.destroy({ children: true });
        }
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
        if (this.puzzleGame && this.puzzlePlayer && this.puzzleGame.state === GameState.PLAYING) {
            // Map ND buttons to PuzzlePlayer states
            this.puzzlePlayer.UP_HELD = this.nd.isButtonPressed(NDButton.UP);
            this.puzzlePlayer.DOWN_HELD = this.nd.isButtonPressed(NDButton.DOWN);
            this.puzzlePlayer.LEFT_HELD = this.nd.isButtonPressed(NDButton.LEFT);
            this.puzzlePlayer.RIGHT_HELD = this.nd.isButtonPressed(NDButton.RIGHT);
            
            this.puzzlePlayer.ROTATECW_HELD = this.nd.isButtonPressed(NDButton.A);
            this.puzzlePlayer.ROTATECCW_HELD = this.nd.isButtonPressed(NDButton.B);
            this.puzzlePlayer.SLAM_HELD = this.nd.isButtonPressed(NDButton.X);
            this.puzzlePlayer.HOLDRAISE_HELD = this.nd.isButtonPressed(NDButton.Y);

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
