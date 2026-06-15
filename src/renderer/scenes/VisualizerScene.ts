import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { Scene, type SceneConfig } from "../state/Scene";
import { StateManager } from "../state/StateManager";
import { InputManager, Key } from "../input/InputManager";
import { ProjectMVisualizer } from "../audio/visualizer/ProjectM";
import { AudioManager } from "../audio/AudioManager";

export class VisualizerScene extends Scene {
    private visualizer: ProjectMVisualizer | null = null;
    private canvas: HTMLCanvasElement | null = null;
    private uiContainer: Container;
    private presetNameText: Text | null = null;

    constructor(config: SceneConfig) {
        super(config);
        this.uiContainer = new Container();
        this.uiContainer.zIndex = 10;
        this.container.addChild(this.uiContainer);
    }

    public async create(): Promise<void> {
        // Create a separate canvas for Butterchurn/ProjectM
        // It renders directly to its own canvas via WebGL
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.zIndex = '-1'; // Behind PIXI
        document.body.appendChild(this.canvas);

        this.visualizer = new ProjectMVisualizer(this.canvas);
        this.visualizer.init();

        this.createUI();

        console.log("VisualizerScene created");
    }

    private createUI(): void {
        const style = new TextStyle({
            fill: "#ffffff",
            fontSize: 18,
            fontWeight: "bold",
            dropShadow: { color: "#000000", blur: 4, distance: 2 }
        });

        const title = new Text({ text: "PROJECT-M VISUALIZER", style });
        title.position.set(20, 20);
        this.uiContainer.addChild(title);

        const hint = new Text({
            text: "SPACE: Random Preset | ESC: Back",
            style: { ...style, fontSize: 14 }
        });
        hint.position.set(20, 50);
        this.uiContainer.addChild(hint);

        this.presetNameText = new Text({ text: "Preset: Random", style: { ...style, fontSize: 14, fill: "#00ff00" } });
        this.presetNameText.position.set(20, 80);
        this.uiContainer.addChild(this.presetNameText);
    }

    protected onUpdate(dt: number): void {
        if (this.visualizer) {
            this.visualizer.render();
        }

        if (InputManager.isKeyPressed(Key.Space)) {
            const name = this.visualizer?.loadRandomPreset();
            if (this.presetNameText && name) {
                this.presetNameText.text = `Preset: ${name}`;
            }
            console.log(`Randomizing preset: ${name}`);
        }

        if (InputManager.isCancelPressed()) {
            StateManager.pop();
        }
    }

    public onResize(width: number, height: number): void {
        super.onResize(width, height);
        if (this.canvas) {
            this.canvas.width = width;
            this.canvas.height = height;
        }
        if (this.visualizer) {
            this.visualizer.resize(width, height);
        }
    }

    protected async destroy(): Promise<void> {
        if (this.visualizer) {
            this.visualizer.destroy();
        }
        if (this.canvas) {
            this.canvas.remove();
        }
        await super.destroy();
    }
}
