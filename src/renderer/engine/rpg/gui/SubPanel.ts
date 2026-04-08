/**
 * SubPanel — base class for StuffMenu sub-panels (Items, Friends, Settings, etc.)
 *
 * Ported from okgame C++ Engine/rpg/gui/stuffMenu/SubPanel.
 */
import { Container } from 'pixi.js';

export class SubPanel {
    protected visible = false;
    protected container: Container;

    constructor() {
        this.container = new Container();
        this.container.visible = false;
    }

    init(): void {
        // Override in subclasses
    }

    setVisible(b: boolean): void {
        this.visible = b;
        this.container.visible = b;
    }

    getVisible(): boolean {
        return this.visible;
    }

    layout(): void {
        // Override in subclasses
    }

    update(dt: number): void {
        // Override in subclasses
        void dt;
    }

    render(): void {
        // Override in subclasses
    }

    getContainer(): Container {
        return this.container;
    }

    destroy(): void {
        this.container.destroy({ children: true });
    }
}
