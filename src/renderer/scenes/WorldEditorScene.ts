import { Scene, SceneConfig } from '../state/Scene';
import { WorldEditor } from '../editor/WorldEditor';
import { StateManager } from '../state/StateManager';
import { InputManager, Key } from '../input/InputManager';

export class WorldEditorScene extends Scene {
    private editor: WorldEditor | null = null;
    private editorDiv: HTMLDivElement | null = null;

    constructor(config: SceneConfig) {
        super(config);
    }

    public async create(): Promise<void> {
        this.editorDiv = document.createElement('div');
        this.editorDiv.style.position = 'absolute';
        this.editorDiv.style.left = '50%';
        this.editorDiv.style.top = '50%';
        this.editorDiv.style.transform = 'translate(-50%, -50%)';
        this.editorDiv.style.zIndex = '1000';
        document.body.appendChild(this.editorDiv);

        this.editor = new WorldEditor(this.editorDiv as any);
    }

    protected onUpdate(dt: number): void {
        if (InputManager.isCancelPressed()) {
            StateManager.pop();
        }
    }

    protected async destroy(): Promise<void> {
        if (this.editorDiv) {
            this.editorDiv.remove();
        }
    }
}
