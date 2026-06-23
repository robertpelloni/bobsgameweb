import { Container, Text, TextStyle } from "pixi.js";
import { Scene, type SceneConfig } from "../state/Scene";
import { StateManager } from "../state/StateManager";
import { InputManager, Key } from "../input/InputManager";
import { WebGPUParticleSystem } from "../engine/graphics/WebGPUParticleSystem";

export class WebGPUDemoScene extends Scene {
    private particleSystem: WebGPUParticleSystem | null = null;
    private uiContainer: Container;
    private statusText: Text | null = null;

    constructor(config: SceneConfig) {
        super(config);
        this.uiContainer = new Container();
        this.container.addChild(this.uiContainer);
    }

    public async create(): Promise<void> {
        this.particleSystem = new WebGPUParticleSystem(this.app, this.container);
        await this.particleSystem.init();

        this.createUI();
        console.log("WebGPUDemoScene created");
    }

    private createUI(): void {
        const style = new TextStyle({
            fill: "#00ffff",
            fontSize: 20,
            fontWeight: "bold",
            dropShadow: { color: "#000000", blur: 4, distance: 2 }
        });

        const title = new Text({ text: "WEBGPU COMPUTE PARTICLES", style });
        title.position.set(20, 20);
        this.uiContainer.addChild(title);

        const hint = new Text({
            text: "CLICK: Spawn Explosion | W/S: Vortex | Q/A: Gravity | ESC: Back",
            style: { ...style, fill: "#ffffff", fontSize: 14 }
        });
        hint.position.set(20, 50);
        this.uiContainer.addChild(hint);

        this.statusText = new Text({
            text: "Hardware Support: Detecting...",
            style: { ...style, fontSize: 14, fill: "#ffff00" }
        });
        this.statusText.position.set(20, 80);
        this.uiContainer.addChild(this.statusText);
    }

    private vortexStrength = 0.5;

    protected onUpdate(dt: number): void {
        if (this.particleSystem) {
            this.particleSystem.update(dt);

            // Check support status and update UI
            const isWebGPU = (this.particleSystem as any).useWebGPU;
            if (this.statusText) {
                this.statusText.text = `Hardware Support: ${isWebGPU ? "WebGPU (ACTIVE)" : "WebGL Fallback"} | Vortex: ${this.vortexStrength.toFixed(2)}`;
                this.statusText.style.fill = isWebGPU ? "#00ff00" : "#ff4444";
            }
        }

        if (InputManager.isKeyPressed(Key.W)) {
            this.vortexStrength += 0.05;
            if (typeof (this.particleSystem as any).setVortex === 'function') {
                (this.particleSystem as any).setVortex(this.vortexStrength);
            }
        }
        if (InputManager.isKeyPressed(Key.S)) {
            this.vortexStrength -= 0.05;
            if (typeof (this.particleSystem as any).setVortex === 'function') {
                (this.particleSystem as any).setVortex(this.vortexStrength);
            }
        }

        if (InputManager.isKeyPressed(Key.Q)) {
            // Future: Toggle gravity in compute shader
            console.log("Gravity toggled (Conceptual)");
        }

        if (InputManager.isActionPressed()) {
            // Spawn explosion at mouse position (conceptual)
            const pos = this.app.renderer.events.pointer.global;
            if (typeof (this.particleSystem as any).spawnExplosion === 'function') {
                (this.particleSystem as any).spawnExplosion(pos.x, pos.y);
            }
        }

        if (InputManager.isCancelPressed()) {
            StateManager.pop();
        }
    }

    protected async destroy(): Promise<void> {
        await super.destroy();
    }
}
