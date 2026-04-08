/**
 * ActionManager — handles context-sensitive action prompts and interactions.
 *
 * Ported from okgame C++ Engine/rpg/event/ActionManager.
 * Manages "Press A to talk" style interaction prompts near NPCs, doors, and areas.
 */
import { Container, Text, TextStyle, Graphics } from 'pixi.js';

export type ActionCaptionType = 'none' | 'tile' | 'xy' | 'xyxy' | 'npc' | 'area';

export interface ActionContext {
    type: ActionCaptionType;
    x: number;
    y: number;
    x2?: number;
    y2?: number;
    label: string;
    entityName?: string;
}

export class ActionManager {
    private caption: Text | null = null;
    private captionBackground: Graphics | null = null;
    private container: Container;
    private actionsThisFrame: ActionContext[] = [];
    private currentAction: ActionContext | null = null;
    private visible = false;

    // Player position for range checking
    private playerX = 0;
    private playerY = 0;
    private actionRange = 48; // pixels

    constructor(container: Container) {
        this.container = container;
    }

    setPlayerPosition(x: number, y: number): void {
        this.playerX = x;
        this.playerY = y;
    }

    setActionRange(range: number): void {
        this.actionRange = range;
    }

    // ============================================================
    // Action Checks
    // ============================================================

    /**
     * Check if an action is available at a specific point.
     * Call this each frame from event scripts.
     */
    checkXY(x: number, y: number, label: string): boolean {
        return this.checkAll(x, y, x, y, label, 'xy');
    }

    /**
     * Check if an action is available in a rectangular area.
     */
    checkXYXY(x1: number, y1: number, x2: number, y2: number, label: string): boolean {
        return this.checkAll(x1, y1, x2, y2, label, 'xyxy');
    }

    /**
     * Check if player is near an NPC/entity.
     */
    checkEntity(entityX: number, entityY: number, entityWidth: number, entityHeight: number, label: string): boolean {
        return this.checkAll(
            entityX, entityY,
            entityX + entityWidth, entityY + entityHeight,
            label, 'npc',
        );
    }

    /**
     * Check if player is near an area.
     */
    checkArea(areaX: number, areaY: number, areaWidth: number, areaHeight: number, label: string): boolean {
        return this.checkAll(
            areaX, areaY,
            areaX + areaWidth, areaY + areaHeight,
            label, 'area',
        );
    }

    private checkAll(
        x1: number, y1: number, x2: number, y2: number,
        label: string, type: ActionCaptionType,
    ): boolean {
        // Check if player is within action range of the target
        const centerX = (x1 + x2) / 2;
        const centerY = (y1 + y2) / 2;
        const dx = Math.abs(this.playerX - centerX);
        const dy = Math.abs(this.playerY - centerY);

        if (dx > this.actionRange || dy > this.actionRange) return false;

        const context: ActionContext = { type, x: x1, y: y1, x2: x2, y2: y2, label };
        this.actionsThisFrame.push(context);

        return true;
    }

    // ============================================================
    // Lifecycle
    // ============================================================

    /**
     * Called at the start of each frame to reset action context.
     */
    beginFrame(): void {
        this.actionsThisFrame = [];
        this.currentAction = null;
        this.hideCaption();
    }

    /**
     * Called at the end of each frame to show the highest-priority action.
     */
    endFrame(): void {
        // Priority: NPC > area > xyxy > xy > tile
        const priority: Record<ActionCaptionType, number> = {
            npc: 5, area: 4, xyxy: 3, xy: 2, tile: 1, none: 0,
        };

        let best: ActionContext | null = null;
        let bestPriority = -1;

        for (const action of this.actionsThisFrame) {
            const p = priority[action.type] ?? 0;
            if (p > bestPriority) {
                bestPriority = p;
                best = action;
            }
        }

        if (best) {
            this.currentAction = best;
            this.showCaption(best.label);
        }
    }

    /**
     * Get the current action context (for input handling).
     */
    getCurrentAction(): ActionContext | null {
        return this.currentAction;
    }

    /**
     * Check if player pressed action button while an action is available.
     */
    isActionAvailable(): boolean {
        return this.currentAction !== null;
    }

    // ============================================================
    // Caption Display
    // ============================================================

    private showCaption(label: string): void {
        if (this.caption && this.caption.text === label && this.visible) return;

        this.hideCaption();

        this.captionBackground = new Graphics();
        const style = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 14,
            fill: 0xffff00,
            stroke: { color: 0x000000, width: 2 },
        });
        this.caption = new Text({ text: `[ ${label} ]`, style });
        this.caption.anchor.set(0.5);

        this.captionBackground.roundRect(-this.caption.width / 2 - 8, -this.caption.height / 2 - 4, this.caption.width + 16, this.caption.height + 8, 4);
        this.captionBackground.fill({ color: 0x000000, alpha: 0.7 });

        const wrapper = new Container();
        wrapper.addChild(this.captionBackground);
        wrapper.addChild(this.caption);
        wrapper.position.set(this.playerX, this.playerY - 40);

        this.container.addChild(wrapper);
        this.visible = true;
    }

    private hideCaption(): void {
        if (this.caption) {
            this.caption.removeFromParent();
            this.caption.destroy();
            this.caption = null;
        }
        if (this.captionBackground) {
            this.captionBackground.removeFromParent();
            this.captionBackground.destroy();
            this.captionBackground = null;
        }
        this.visible = false;
    }

    updatePosition(): void {
        if (this.visible && this.caption?.parent) {
            this.caption.parent.position.set(this.playerX, this.playerY - 40);
        }
    }

    destroy(): void {
        this.hideCaption();
    }
}
