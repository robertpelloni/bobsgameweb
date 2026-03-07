import { Application, Graphics } from 'pixi.js';
import { StateManager, State } from './StateManager';

export interface TransitionConfig {
    duration?: number;
    color?: number;
    onMidpoint?: () => void;
}

const DEFAULT_DURATION = 300;
const DEFAULT_COLOR = 0x000000;

export class SceneTransition {
    private static overlay: Graphics | null = null;
    private static isTransitioning = false;

    static async pushWithFade(app: Application, state: State, config: TransitionConfig = {}): Promise<void> {
        if (this.isTransitioning) return;
        
        const duration = config.duration ?? DEFAULT_DURATION;
        const color = config.color ?? DEFAULT_COLOR;
        
        this.isTransitioning = true;
        this.createOverlay(app, color);
        
        await this.fadeIn(duration / 2);
        config.onMidpoint?.();
        await StateManager.push(state);
        await this.fadeOut(duration / 2);
        
        this.removeOverlay();
        this.isTransitioning = false;
    }

    static async popWithFade(app: Application, config: TransitionConfig = {}): Promise<void> {
        if (this.isTransitioning) return;
        
        const duration = config.duration ?? DEFAULT_DURATION;
        const color = config.color ?? DEFAULT_COLOR;
        
        this.isTransitioning = true;
        this.createOverlay(app, color);
        
        await this.fadeIn(duration / 2);
        config.onMidpoint?.();
        await StateManager.pop();
        await this.fadeOut(duration / 2);
        
        this.removeOverlay();
        this.isTransitioning = false;
    }

    static async replaceWithFade(app: Application, state: State, config: TransitionConfig = {}): Promise<void> {
        if (this.isTransitioning) return;
        
        const duration = config.duration ?? DEFAULT_DURATION;
        const color = config.color ?? DEFAULT_COLOR;
        
        this.isTransitioning = true;
        this.createOverlay(app, color);
        
        await this.fadeIn(duration / 2);
        config.onMidpoint?.();
        await StateManager.replace(state);
        await this.fadeOut(duration / 2);
        
        this.removeOverlay();
        this.isTransitioning = false;
    }

    private static createOverlay(app: Application, color: number): void {
        this.overlay = new Graphics();
        this.overlay.rect(0, 0, app.screen.width, app.screen.height);
        this.overlay.fill(color);
        this.overlay.alpha = 0;
        this.overlay.zIndex = 9999;
        app.stage.addChild(this.overlay);
    }

    private static removeOverlay(): void {
        if (this.overlay) {
            this.overlay.destroy();
            this.overlay = null;
        }
    }

    private static fadeIn(duration: number): Promise<void> {
        return new Promise((resolve) => {
            if (!this.overlay) {
                resolve();
                return;
            }
            
            const startTime = performance.now();
            const animate = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                if (this.overlay) {
                    this.overlay.alpha = progress;
                }
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            requestAnimationFrame(animate);
        });
    }

    private static fadeOut(duration: number): Promise<void> {
        return new Promise((resolve) => {
            if (!this.overlay) {
                resolve();
                return;
            }
            
            const startTime = performance.now();
            const animate = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                if (this.overlay) {
                    this.overlay.alpha = 1 - progress;
                }
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            requestAnimationFrame(animate);
        });
    }

    static get transitioning(): boolean {
        return this.isTransitioning;
    }
}
