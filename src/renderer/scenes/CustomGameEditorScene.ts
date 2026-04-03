import { Scene, SceneConfig } from '../state/Scene';
import { CustomGameEditor } from '../editor/CustomGameEditor';
import { StateManager } from '../state/StateManager';
import { InputManager, Key } from '../input/InputManager';
import { PuzzleScene, PuzzleSceneConfig } from '../puzzle/PuzzleScene';
import { GameType, GamePlayMode } from '../../shared/puzzle/GameType';
import { GameMode } from '../data/HighScoreManager';
import { SceneTransition } from '../state/SceneTransition';

export class CustomGameEditorScene extends Scene {
    private editor: CustomGameEditor | null = null;
    private editorDiv: HTMLDivElement | null = null;

    private testGameListener: EventListener;

    constructor(config: SceneConfig) {
        super(config);
        
        this.testGameListener = () => {
            this.launchTestGame();
        };
    }

    public async create(): Promise<void> {
        this.editorDiv = document.createElement('div');
        this.editorDiv.id = 'editor-mount-point';
        this.editorDiv.style.position = 'absolute';
        this.editorDiv.style.left = '50%';
        this.editorDiv.style.top = '50%';
        this.editorDiv.style.transform = 'translate(-50%, -50%)';
        this.editorDiv.style.zIndex = '1000';
        document.body.appendChild(this.editorDiv);

        this.editor = new CustomGameEditor('editor-mount-point');

        document.addEventListener('test-custom-game', this.testGameListener);
    }

    private launchTestGame(): void {
        const data = localStorage.getItem('custom-game-type');
        let gameType = new GameType();
        if (data) {
            try {
                gameType = GameType.fromJSON(data);
            } catch (e) {
                console.error("Failed to load custom game type for test", e);
            }
        }

        const puzzleConfig: PuzzleSceneConfig = {
            name: 'puzzle-test',
            app: this.app,
            camera: this.camera ?? undefined,
            gameType,
            gameMode: 'marathon' as GameMode,
            startLevel: 1,
        };

        // Hide editor overlay
        if (this.editorDiv) {
            this.editorDiv.style.display = 'none';
        }

        const puzzleScene = new PuzzleScene(puzzleConfig);
        SceneTransition.pushWithFade(this.app, puzzleScene);
    }

    public onResume(): void {
        super.onResume();
        if (this.editorDiv) {
            this.editorDiv.style.display = 'block';
        }
    }

    protected onUpdate(dt: number): void {
        if (InputManager.isKeyPressed(Key.Escape)) {
            StateManager.pop();
        }
    }

    protected async destroy(): Promise<void> {
        document.removeEventListener('test-custom-game', this.testGameListener);
        if (this.editorDiv) {
            this.editorDiv.remove();
        }
    }
}

