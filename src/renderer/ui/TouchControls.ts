import { Container, Graphics, FederatedPointerEvent } from 'pixi.js';
import { InputManager, Key } from '../input/InputManager';

export class TouchControls extends Container {
    private dpad: Container;
    private buttons: Container;

    constructor(width: number, height: number) {
        super();
        this.dpad = new Container();
        this.buttons = new Container();
        
        this.addChild(this.dpad);
        this.addChild(this.buttons);
        
        this.createDPad();
        this.createActionButtons();
        
        this.resize(width, height);
    }

    private createDPad() {
        const size = 60;
        const directions = [
            { key: Key.Up, x: 0, y: -size, label: '▲' },
            { key: Key.Down, x: 0, y: size, label: '▼' },
            { key: Key.Left, x: -size, y: 0, label: '◀' },
            { key: Key.Right, x: size, y: 0, label: '▶' }
        ];

        directions.forEach(dir => {
            const btn = new Graphics();
            btn.circle(0, 0, 25);
            btn.fill({ color: 0xffffff, alpha: 0.2 });
            btn.stroke({ color: 0xffffff, width: 2, alpha: 0.5 });
            btn.position.set(dir.x, dir.y);
            
            btn.eventMode = 'static';
            btn.on('pointerdown', () => (InputManager as any).onKeyDown({ key: dir.key }));
            btn.on('pointerup', () => (InputManager as any).onKeyUp({ key: dir.key }));
            btn.on('pointerupoutside', () => (InputManager as any).onKeyUp({ key: dir.key }));
            
            this.dpad.addChild(btn);
        });
    }

    private createActionButtons() {
        const size = 60;
        const actions = [
            { key: Key.Z, x: -size, y: 0, color: 0xff0000, label: 'B' },
            { key: Key.X, x: 0, y: -size, color: 0x00ff00, label: 'A' },
            { key: Key.Space, x: size, y: 0, color: 0x0000ff, label: 'DROP' }
        ];

        actions.forEach(act => {
            const btn = new Graphics();
            btn.circle(0, 0, 30);
            btn.fill({ color: act.color, alpha: 0.3 });
            btn.stroke({ color: 0xffffff, width: 2, alpha: 0.5 });
            btn.position.set(act.x, act.y);

            btn.eventMode = 'static';
            btn.on('pointerdown', () => (InputManager as any).onKeyDown({ key: act.key }));
            btn.on('pointerup', () => (InputManager as any).onKeyUp({ key: act.key }));
            btn.on('pointerupoutside', () => (InputManager as any).onKeyUp({ key: act.key }));

            this.buttons.addChild(btn);
        });
    }

    public resize(width: number, height: number) {
        this.dpad.position.set(100, height - 100);
        this.buttons.position.set(width - 150, height - 100);
    }
}
