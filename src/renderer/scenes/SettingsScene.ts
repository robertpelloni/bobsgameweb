import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Scene, SceneConfig } from '../state/Scene';
import { StateManager } from '../state/StateManager';

export class SettingsScene extends Scene {
    private titleText!: Text;
    private nameInputContainer!: Container;
    private nameText!: Text;
    private backButton!: Container;
    private inputElement!: HTMLInputElement;

    constructor(config: SceneConfig) {
        super(config);
    }

    public async create(): Promise<void> {
        const style = new TextStyle({
            fill: '#ffffff',
            fontSize: 36,
            fontWeight: 'bold'
        });

        this.titleText = new Text({ text: 'Settings', style });
        this.titleText.anchor.set(0.5, 0);
        this.titleText.position.set(this.app.screen.width / 2, 50);
        this.container.addChild(this.titleText);

        const currentName = localStorage.getItem('playerName') || 'WebPlayer';

        this.nameText = new Text({ text: `Current Name: ${currentName}`, style: { fill: '#ffff00', fontSize: 24 } });
        this.nameText.position.set(this.app.screen.width / 2 - 150, 150);
        this.container.addChild(this.nameText);

        this.inputElement = document.createElement('input');
        this.inputElement.type = 'text';
        this.inputElement.value = currentName;
        this.inputElement.style.position = 'absolute';
        this.inputElement.style.left = '50%';
        this.inputElement.style.top = '200px';
        this.inputElement.style.transform = 'translateX(-50%)';
        this.inputElement.style.fontSize = '24px';
        this.inputElement.style.padding = '5px';
        document.body.appendChild(this.inputElement);

        const saveButton = this.createStyledButton('Save Name', 200, 50);
        saveButton.position.set(this.app.screen.width / 2 - 100, 250);
        saveButton.on('pointerdown', () => this.saveName());
        this.container.addChild(saveButton);

        this.backButton = this.createStyledButton('Back', 200, 50);
        this.backButton.position.set(this.app.screen.width / 2 - 100, 350);
        this.backButton.on('pointerdown', () => {
            this.inputElement.remove();
            this.manager.pop();
        });
        this.container.addChild(this.backButton);
    }

    private saveName(): void {
        const newName = this.inputElement.value.trim() || 'WebPlayer';
        localStorage.setItem('playerName', newName);
        this.nameText.text = `Current Name: ${newName}`;
    }

    private createStyledButton(label: string, w: number, h: number): Container {
        const btn = new Container();
        const g = new Graphics();
        g.beginFill(0x3366ff);
        g.drawRoundedRect(0, 0, w, h, 10);
        g.endFill();
        btn.addChild(g);

        const t = new Text({ text: label, style: { fill: '#ffffff', fontSize: 20 } });
        t.anchor.set(0.5);
        t.position.set(w / 2, h / 2);
        btn.addChild(t);

        btn.eventMode = 'static';
        btn.cursor = 'pointer';
        return btn;
    }

    public onUpdate(delta: number): void {}

    protected async destroy(): Promise<void> {
        if (this.inputElement && this.inputElement.parentElement) {
            this.inputElement.remove();
        }
    }
}
