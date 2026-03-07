import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Button, ButtonStyle } from '../ui/Button';
import { InputManager, Key } from '../input/InputManager';
import { AudioManager } from '../audio/AudioManager';

export interface PauseOverlayConfig {
    width: number;
    height: number;
    onResume: () => void;
    onRestart: () => void;
    onQuit: () => void;
}

interface PauseMenuItem {
    label: string;
    action: () => void;
}

export class PauseOverlay {
    public container: Container;
    private config: PauseOverlayConfig;
    
    private background!: Graphics;
    private panel!: Graphics;
    private titleText!: Text;
    private menuButtons: Button[] = [];
    private menuItems: PauseMenuItem[] = [];
    private selectedIndex = 0;
    private isVisible = false;

    constructor(config: PauseOverlayConfig) {
        this.config = config;
        this.container = new Container();
        this.container.visible = false;
        
        this.createBackground();
        this.createPanel();
        this.createTitle();
        this.createMenu();
    }

    private createBackground(): void {
        this.background = new Graphics();
        this.background.rect(0, 0, this.config.width, this.config.height);
        this.background.fill({ color: 0x000000, alpha: 0.7 });
        this.container.addChild(this.background);
    }

    private createPanel(): void {
        const panelWidth = 320;
        const panelHeight = 280;
        const panelX = (this.config.width - panelWidth) / 2;
        const panelY = (this.config.height - panelHeight) / 2;

        this.panel = new Graphics();
        this.panel.roundRect(panelX, panelY, panelWidth, panelHeight, 12);
        this.panel.fill(0x1a2a4a);
        this.panel.stroke({ color: 0x4a6a8a, width: 3 });
        this.container.addChild(this.panel);
    }

    private createTitle(): void {
        const titleStyle = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 36,
            fontWeight: 'bold',
            fill: 0xffffff,
            letterSpacing: 4,
        });

        this.titleText = new Text({ text: 'PAUSED', style: titleStyle });
        this.titleText.anchor.set(0.5);
        this.titleText.x = this.config.width / 2;
        this.titleText.y = this.config.height / 2 - 80;
        this.container.addChild(this.titleText);
    }

    private createMenu(): void {
        this.menuItems = [
            { label: 'Resume', action: () => this.config.onResume() },
            { label: 'Restart', action: () => this.config.onRestart() },
            { label: 'Quit to Menu', action: () => this.config.onQuit() },
        ];

        const buttonStyle: ButtonStyle = {
            width: 200,
            height: 44,
            backgroundColor: 0x2a4a6a,
            backgroundColorHover: 0x3a5a7a,
            backgroundColorPressed: 0x1a3a5a,
            borderColor: 0x5a7a9a,
            borderWidth: 2,
            textColor: 0xffffff,
            fontSize: 18,
            borderRadius: 6,
        };

        const centerX = this.config.width / 2;
        const startY = this.config.height / 2 - 10;
        const spacing = 55;

        for (let i = 0; i < this.menuItems.length; i++) {
            const item = this.menuItems[i];
            const button = new Button(item.label, buttonStyle);
            button.setPosition(centerX, startY + i * spacing);
            button.onClick(() => {
                this.playSelectSound();
                item.action();
            });
            
            this.container.addChild(button.container);
            this.menuButtons.push(button);
        }

        this.updateSelection();
    }

    private updateSelection(): void {
        for (let i = 0; i < this.menuButtons.length; i++) {
            this.menuButtons[i].selected = i === this.selectedIndex;
        }
    }

    public update(): void {
        if (!this.isVisible) return;

        if (InputManager.isKeyPressed(Key.Up) || InputManager.isKeyPressed(Key.W)) {
            this.moveSelection(-1);
        } else if (InputManager.isKeyPressed(Key.Down) || InputManager.isKeyPressed(Key.S)) {
            this.moveSelection(1);
        }

        if (InputManager.isActionPressed() || InputManager.isStartPressed()) {
            this.selectCurrentItem();
        }

        if (InputManager.isKeyPressed(Key.Escape)) {
            this.config.onResume();
        }
    }

    private moveSelection(delta: number): void {
        const prevIndex = this.selectedIndex;
        this.selectedIndex = (this.selectedIndex + delta + this.menuItems.length) % this.menuItems.length;
        
        if (prevIndex !== this.selectedIndex) {
            this.playMoveSound();
            this.updateSelection();
        }
    }

    private selectCurrentItem(): void {
        this.playSelectSound();
        this.menuItems[this.selectedIndex].action();
    }

    public show(): void {
        this.isVisible = true;
        this.container.visible = true;
        this.selectedIndex = 0;
        this.updateSelection();
        this.playPauseSound();
    }

    public hide(): void {
        this.isVisible = false;
        this.container.visible = false;
    }

    public get visible(): boolean {
        return this.isVisible;
    }

    public resize(width: number, height: number): void {
        this.config.width = width;
        this.config.height = height;
        
        this.background.clear();
        this.background.rect(0, 0, width, height);
        this.background.fill({ color: 0x000000, alpha: 0.7 });

        const panelWidth = 320;
        const panelHeight = 280;
        const panelX = (width - panelWidth) / 2;
        const panelY = (height - panelHeight) / 2;

        this.panel.clear();
        this.panel.roundRect(panelX, panelY, panelWidth, panelHeight, 12);
        this.panel.fill(0x1a2a4a);
        this.panel.stroke({ color: 0x4a6a8a, width: 3 });

        this.titleText.x = width / 2;
        this.titleText.y = height / 2 - 80;

        const centerX = width / 2;
        const startY = height / 2 - 10;
        const spacing = 55;

        for (let i = 0; i < this.menuButtons.length; i++) {
            this.menuButtons[i].setPosition(centerX, startY + i * spacing);
        }
    }

    private playPauseSound(): void {
        if (AudioManager.isLoaded('pause')) {
            AudioManager.playSound('pause', { volume: 0.5 });
        }
    }

    private playMoveSound(): void {
        if (AudioManager.isLoaded('menu_move')) {
            AudioManager.playSound('menu_move', { volume: 0.4 });
        }
    }

    private playSelectSound(): void {
        if (AudioManager.isLoaded('menu_select')) {
            AudioManager.playSound('menu_select', { volume: 0.6 });
        }
    }

    public destroy(): void {
        this.container.destroy({ children: true });
    }
}
