import { Scene, SceneConfig } from '../state/Scene';
import { CustomGameEditor } from '../editor/CustomGameEditor';
import { StateManager } from '../state/StateManager';
import { InputManager, Key } from '../input/InputManager';

export class CustomGameEditorScene extends Scene {
    private editor: CustomGameEditor | null = null;
    private editorDiv: HTMLDivElement | null = null;

    constructor(config: SceneConfig) {
        super(config);
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
    }

    protected onUpdate(dt: number): void {
        if (InputManager.isKeyPressed(Key.Escape)) {
            StateManager.pop();
        }
    }

    protected async destroy(): Promise<void> {
        if (this.editorDiv) {
            this.editorDiv.remove();
        }
    }
}
