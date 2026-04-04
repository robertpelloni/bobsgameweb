/**
 * ToastManager — Animated pop-up notification system
 * 
 * Renders overlay toasts for:
 * - Achievement unlocks (with rarity glow + icon + haptic)
 * - System messages (connection status, errors)
 * - Social notifications (friend online, challenge received)
 * 
 * Toasts stack vertically, slide in from the right, and auto-dismiss.
 * Fully PixiJS v8 API compliant.
 */

import { Container, Graphics, Text, TextStyle, Application } from 'pixi.js';
import { Achievement, AchievementManager } from '../data/AchievementManager';
import { InputManager } from '../input/InputManager';

export interface ToastConfig {
    title: string;
    body: string;
    icon?: string;
    color?: number;
    glowColor?: number;
    duration?: number;     // seconds
    haptic?: boolean;
}

interface ActiveToast {
    container: Container;
    progressFill: Graphics;
    timer: number;
    maxTimer: number;
    targetX: number;
    state: 'entering' | 'visible' | 'exiting';
}

const TOAST_WIDTH = 360;
const TOAST_HEIGHT = 80;
const TOAST_MARGIN = 10;
const TOAST_PADDING = 15;
const SLIDE_SPEED = 1200; // px/sec

class ToastManagerClass {
    private app: Application | null = null;
    private toastLayer: Container | null = null;
    private activeToasts: ActiveToast[] = [];
    private queue: ToastConfig[] = [];
    private maxVisible: number = 4;

    public init(app: Application): void {
        this.app = app;
        this.toastLayer = new Container();
        this.toastLayer.zIndex = 9999;
        this.toastLayer.label = 'toast-layer';
        app.stage.addChild(this.toastLayer);

        // Hook into AchievementManager
        AchievementManager.onUnlock((achievement: Achievement) => {
            this.showAchievement(achievement);
        });

        console.log('[Toast] Notification system initialized');
    }

    public show(config: ToastConfig): void {
        if (this.activeToasts.length >= this.maxVisible) {
            this.queue.push(config);
            return;
        }
        this.createToast(config);
    }

    public showAchievement(achievement: Achievement): void {
        const rarityColor = AchievementManager.getRarityColor(achievement.rarity);
        
        this.show({
            title: `🏆 Achievement Unlocked!`,
            body: `${achievement.icon} ${achievement.name} — ${achievement.description}`,
            color: 0x1a1a2e,
            glowColor: rarityColor,
            duration: 5,
            haptic: true
        });
    }

    public showInfo(message: string): void {
        this.show({
            title: 'ℹ️ Info',
            body: message,
            color: 0x1a2a1a,
            glowColor: 0x00aa44,
            duration: 3
        });
    }

    public showWarning(message: string): void {
        this.show({
            title: '⚠️ Warning',
            body: message,
            color: 0x2a2a1a,
            glowColor: 0xffaa00,
            duration: 4
        });
    }

    public showError(message: string): void {
        this.show({
            title: '❌ Error',
            body: message,
            color: 0x2a1a1a,
            glowColor: 0xff3333,
            duration: 5
        });
    }

    public update(dt: number): void {
        if (!this.toastLayer) return;

        for (let i = this.activeToasts.length - 1; i >= 0; i--) {
            const toast = this.activeToasts[i];
            
            switch (toast.state) {
                case 'entering': {
                    // Slide in from right
                    toast.container.x += (toast.targetX - toast.container.x) * Math.min(1, dt * 8);
                    if (Math.abs(toast.container.x - toast.targetX) < 1) {
                        toast.container.x = toast.targetX;
                        toast.state = 'visible';
                    }
                    break;
                }
                case 'visible': {
                    toast.timer -= dt;
                    const progress = Math.max(0, toast.timer / toast.maxTimer);
                    toast.progressFill.clear();
                    toast.progressFill.rect(0, TOAST_HEIGHT - 3, TOAST_WIDTH * progress, 3);
                    toast.progressFill.fill({ color: 0xffffff, alpha: 0.85 });
                    if (toast.timer <= 0) {
                        toast.state = 'exiting';
                    }
                    break;
                }
                case 'exiting': {
                    // Slide out to right
                    toast.container.x += SLIDE_SPEED * dt;
                    toast.container.alpha -= dt * 2;
                    if (toast.container.alpha <= 0) {
                        this.toastLayer!.removeChild(toast.container);
                        toast.container.destroy({ children: true });
                        this.activeToasts.splice(i, 1);
                        this.repositionToasts();
                        
                        // Dequeue
                        if (this.queue.length > 0) {
                            const next = this.queue.shift()!;
                            this.createToast(next);
                        }
                    }
                    break;
                }
            }
        }
    }

    private createToast(config: ToastConfig): void {
        if (!this.app || !this.toastLayer) return;

        const screenW = this.app.screen.width;
        const container = new Container();
        
        // Background
        const bg = new Graphics();
        bg.roundRect(0, 0, TOAST_WIDTH, TOAST_HEIGHT, 8);
        bg.fill({ color: config.color || 0x1a1a2e, alpha: 0.95 });
        bg.stroke({ color: config.glowColor || 0x4444ff, width: 2 });
        container.addChild(bg);

        // Glow accent bar on left
        const accent = new Graphics();
        accent.rect(0, 0, 4, TOAST_HEIGHT);
        accent.fill({ color: config.glowColor || 0x4444ff });
        container.addChild(accent);

        // Title
        const titleStyle = new TextStyle({
            fill: config.glowColor || 0xffffff,
            fontSize: 14,
            fontWeight: 'bold',
            fontFamily: 'Arial, sans-serif'
        });
        const titleText = new Text({ text: config.title, style: titleStyle });
        titleText.position.set(TOAST_PADDING, 10);
        container.addChild(titleText);

        // Body
        const bodyStyle = new TextStyle({
            fill: 0xdddddd,
            fontSize: 12,
            fontFamily: 'Arial, sans-serif',
            wordWrap: true,
            wordWrapWidth: TOAST_WIDTH - TOAST_PADDING * 2 - 10
        });
        const bodyText = new Text({ text: config.body, style: bodyStyle });
        bodyText.position.set(TOAST_PADDING, 34);
        container.addChild(bodyText);

        // Progress bar (time remaining)
        const progressBg = new Graphics();
        progressBg.rect(0, TOAST_HEIGHT - 3, TOAST_WIDTH, 3);
        progressBg.fill({ color: 0x333333 });
        container.addChild(progressBg);

        const progressFill = new Graphics();
        progressFill.rect(0, TOAST_HEIGHT - 3, TOAST_WIDTH, 3);
        progressFill.fill({ color: config.glowColor || 0x4444ff });
        container.addChild(progressFill);

        // Position: start off-screen right
        const yPos = this.getNextYPosition();
        container.position.set(screenW + 20, yPos);

        const targetX = screenW - TOAST_WIDTH - 20;
        
        this.toastLayer.addChild(container);

        const toast: ActiveToast = {
            container,
            progressFill,
            timer: config.duration || 4,
            maxTimer: config.duration || 4,
            targetX,
            state: 'entering'
        };

        this.activeToasts.push(toast);

        // Haptic feedback for achievements
        if (config.haptic) {
            InputManager.vibrate(0, 200, 0.3, 0.6);
        }
    }

    private getNextYPosition(): number {
        const baseY = 20;
        return baseY + this.activeToasts.length * (TOAST_HEIGHT + TOAST_MARGIN);
    }

    private repositionToasts(): void {
        const baseY = 20;
        this.activeToasts.forEach((toast, i) => {
            const targetY = baseY + i * (TOAST_HEIGHT + TOAST_MARGIN);
            // Smooth reposition
            toast.container.y = targetY;
        });
    }

    public destroy(): void {
        if (this.toastLayer) {
            this.toastLayer.destroy({ children: true });
            this.toastLayer = null;
        }
        this.activeToasts = [];
        this.queue = [];
    }
}

export const ToastManager = new ToastManagerClass();
