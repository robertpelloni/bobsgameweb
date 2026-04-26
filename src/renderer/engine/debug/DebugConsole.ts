import { Container, Application } from "pixi.js";

export class DebugConsole {
    container = new Container();

    constructor(app?: any) {}

    getContainer() { return this.container; }
    toggle() {}
    isVisible() { return false; }
    updateStats(arg?: any) {}
    resize(w: number, h?: number) {}

    log(msg: string) {
        console.log("[DebugConsole]", msg);
    }

    update(dt: number) {}

    destroy() {}
}
