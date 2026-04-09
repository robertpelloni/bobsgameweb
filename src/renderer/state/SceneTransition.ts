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

    /** Iris wipe transition — circle closes from edges to center, then opens */
    static async pushWithIris(app: Application, state: State, config: TransitionConfig = {}): Promise<void> {
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        const duration = config.duration ?? DEFAULT_DURATION;
        const color = config.color ?? DEFAULT_COLOR;
        const w = app.screen.width;
        const h = app.screen.height;
        const maxRadius = Math.sqrt(w * w + h * h) / 2;

        // Close iris
        await this.animateIris(app, color, maxRadius, 0, duration / 2, w, h);
        config.onMidpoint?.();
        await StateManager.push(state);
        // Open iris
        await this.animateIris(app, color, 0, maxRadius, duration / 2, w, h);

        this.removeOverlay();
        this.isTransitioning = false;
    }

    /** Horizontal blinds transition */
    static async pushWithBlinds(app: Application, state: State, config: TransitionConfig = {}): Promise<void> {
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        const duration = config.duration ?? DEFAULT_DURATION;
        const color = config.color ?? DEFAULT_COLOR;
        const w = app.screen.width;
        const h = app.screen.height;
        const numBlinds = 8;
        const blindH = h / numBlinds;

        // Close blinds
        await this.animateBlinds(app, color, 0, blindH, duration / 2, w, numBlinds);
        config.onMidpoint?.();
        await StateManager.push(state);
        // Open blinds
        await this.animateBlinds(app, color, blindH, 0, duration / 2, w, numBlinds);

        this.removeOverlay();
        this.isTransitioning = false;
    }

    private static animateIris(
        app: Application, color: number,
        fromRadius: number, toRadius: number,
        duration: number, w: number, h: number,
    ): Promise<void> {
        return new Promise((resolve) => {
            const overlay = new Graphics();
            overlay.zIndex = 9999;
            app.stage.addChild(overlay);

            const startTime = performance.now();
            const animate = () => {
                const elapsed = performance.now() - startTime;
                const t = Math.min(elapsed / duration, 1);
                const radius = fromRadius + (toRadius - fromRadius) * t;

                overlay.clear();
                // Full screen fill
                overlay.rect(0, 0, w, h);
                overlay.fill(color);
                // Cut out circle
                overlay.circle(w / 2, h / 2, Math.max(0, radius));
                overlay.cut();

                if (t < 1) {
                    requestAnimationFrame(animate);
                } else {
                    overlay.destroy();
                    resolve();
                }
            };
            requestAnimationFrame(animate);
        });
    }

    private static animateBlinds(
        app: Application, color: number,
        fromH: number, toH: number,
        duration: number, w: number, numBlinds: number,
    ): Promise<void> {
        return new Promise((resolve) => {
            const overlay = new Graphics();
            overlay.zIndex = 9999;
            app.stage.addChild(overlay);

            const startTime = performance.now();
            const blindTotalH = app.screen.height / numBlinds;
            const animate = () => {
                const elapsed = performance.now() - startTime;
                const t = Math.min(elapsed / duration, 1);
                const curH = fromH + (toH - fromH) * t;

                overlay.clear();
                for (let i = 0; i < numBlinds; i++) {
                    const y = i * blindTotalH + (blindTotalH - curH) / 2;
                    overlay.rect(0, y, w, curH);
                    overlay.fill(color);
                }

                if (t < 1) {
                    requestAnimationFrame(animate);
                } else {
                    overlay.destroy();
                    resolve();
                }
            };
            requestAnimationFrame(animate);
        });
    }
}
