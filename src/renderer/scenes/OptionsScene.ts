import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Scene, SceneConfig } from '../state/Scene';
import { StateManager } from '../state/StateManager';
import { InputManager, Key } from '../input/InputManager';
import { AudioManager } from '../audio/AudioManager';
import { Button, ButtonStyle } from '../ui/Button';
import { SceneTransition } from '../state/SceneTransition';

export interface OptionsSceneConfig extends SceneConfig {
    onBack?: () => void;
}

interface Slider {
    container: Container;
    track: Graphics;
    fill: Graphics;
    handle: Graphics;
    label: Text;
    valueText: Text;
    value: number;
    onChange: (value: number) => void;
}

interface OptionItem {
    type: 'slider' | 'button';
    label: string;
    slider?: Slider;
    button?: Button;
}

export class OptionsScene extends Scene {
    private optionsConfig: OptionsSceneConfig;

    private background!: Graphics;
    private titleText!: Text;
    private optionItems: OptionItem[] = [];
    private selectedIndex = 0;

    private masterSlider!: Slider;
    private musicSlider!: Slider;
    private sfxSlider!: Slider;

    constructor(config: OptionsSceneConfig) {
        super(config);
        this.optionsConfig = config;
    }

    public create(): void {
        this.createBackground();
        this.createTitle();
        this.createOptions();
        this.updateSelection();
    }

    public onUpdate(dt: number): void {
        this.handleInput();
    }

    private createBackground(): void {
        this.background = new Graphics();
        const steps = 20;
        for (let i = 0; i < steps; i++) {
            const ratio = i / steps;
            const color = this.lerpColor(0x0a0a1a, 0x1a1a3a, ratio);
            this.background.rect(0, (this.height / steps) * i, this.width, this.height / steps + 1);
            this.background.fill(color);
        }
        this.container.addChild(this.background);
    }

    private createTitle(): void {
        const titleStyle = new TextStyle({
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: 48,
            fontWeight: 'bold',
            fill: 0xffffff,
            letterSpacing: 4,
        });

        this.titleText = new Text({ text: 'OPTIONS', style: titleStyle });
        this.titleText.anchor.set(0.5);
        this.titleText.x = this.centerX;
        this.titleText.y = this.height * 0.15;
        this.container.addChild(this.titleText);
    }

    private createOptions(): void {
        const startY = this.height * 0.32;
        const spacing = 80;

        this.masterSlider = this.createSlider(
            'Master Volume',
            AudioManager.masterVolume,
            startY,
            (v) => { AudioManager.masterVolume = v; }
        );
        this.optionItems.push({ type: 'slider', label: 'Master Volume', slider: this.masterSlider });

        this.musicSlider = this.createSlider(
            'Music Volume',
            AudioManager.musicVolume,
            startY + spacing,
            (v) => { AudioManager.musicVolume = v; }
        );
        this.optionItems.push({ type: 'slider', label: 'Music Volume', slider: this.musicSlider });

        this.sfxSlider = this.createSlider(
            'SFX Volume',
            AudioManager.sfxVolume,
            startY + spacing * 2,
            (v) => { AudioManager.sfxVolume = v; }
        );
        this.optionItems.push({ type: 'slider', label: 'SFX Volume', slider: this.sfxSlider });

        const buttonStyle: ButtonStyle = {
            width: 200,
            height: 50,
            backgroundColor: 0x1a2a4a,
            backgroundColorHover: 0x2a4a6a,
            backgroundColorPressed: 0x0a1a3a,
            borderColor: 0x4a6a8a,
            borderWidth: 2,
            textColor: 0xffffff,
            fontSize: 22,
            borderRadius: 8,
        };

        const backButton = new Button('Back', buttonStyle);
        backButton.setPosition(this.centerX, startY + spacing * 3.5);
        backButton.onClick(() => this.goBack());
        this.container.addChild(backButton.container);
        this.optionItems.push({ type: 'button', label: 'Back', button: backButton });
    }

    private createSlider(label: string, initialValue: number, y: number, onChange: (value: number) => void): Slider {
        const sliderContainer = new Container();
        sliderContainer.y = y;
        this.container.addChild(sliderContainer);

        const labelStyle = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 22,
            fill: 0xaaccee,
        });

        const labelText = new Text({ text: label, style: labelStyle });
        labelText.anchor.set(0, 0.5);
        labelText.x = this.centerX - 200;
        sliderContainer.addChild(labelText);

        const trackWidth = 200;
        const trackHeight = 8;
        const trackX = this.centerX - 20;

        const track = new Graphics();
        track.roundRect(trackX, -trackHeight / 2, trackWidth, trackHeight, 4);
        track.fill(0x2a3a5a);
        sliderContainer.addChild(track);

        const fill = new Graphics();
        sliderContainer.addChild(fill);

        const handle = new Graphics();
        handle.circle(0, 0, 12);
        handle.fill(0x4a8aff);
        handle.stroke({ color: 0xffffff, width: 2 });
        sliderContainer.addChild(handle);

        const valueStyle = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 18,
            fill: 0xffffff,
        });

        const valueText = new Text({ text: `${Math.round(initialValue * 100)}%`, style: valueStyle });
        valueText.anchor.set(0, 0.5);
        valueText.x = trackX + trackWidth + 20;
        sliderContainer.addChild(valueText);

        const slider: Slider = {
            container: sliderContainer,
            track,
            fill,
            handle,
            label: labelText,
            valueText,
            value: initialValue,
            onChange,
        };

        this.updateSliderVisual(slider, trackX, trackWidth);
        return slider;
    }

    private updateSliderVisual(slider: Slider, trackX: number, trackWidth: number, isSelected: boolean = false): void {
        const fillWidth = trackWidth * slider.value;

        // Redraw track with focus indicator if selected
        slider.track.clear();
        slider.track.roundRect(trackX, -4, trackWidth, 8, 4);
        slider.track.fill(0x2a3a5a);
        if (isSelected) {
            slider.track.stroke({ color: 0xffffff, width: 2 });
        }

        slider.fill.clear();
        if (fillWidth > 0) {
            slider.fill.roundRect(trackX, -4, fillWidth, 8, 4);
            slider.fill.fill(0x4a8aff);
        }

        slider.handle.x = trackX + fillWidth;
        slider.handle.y = 0;

        slider.valueText.text = `${Math.round(slider.value * 100)}%`;
    }

    private updateSelection(): void {
        for (let i = 0; i < this.optionItems.length; i++) {
            const item = this.optionItems[i];
            const isSelected = i === this.selectedIndex;

            if (item.type === 'slider' && item.slider) {
                item.slider.label.style.fill = isSelected ? 0xffffff : 0xaaccee;
                item.slider.handle.alpha = isSelected ? 1.0 : 0.6;
                this.updateSliderVisual(item.slider, this.centerX - 20, 200, isSelected);
            } else if (item.type === 'button' && item.button) {
                item.button.selected = isSelected;
            }
        }
    }

    private handleInput(): void {
        if (InputManager.isKeyPressed(Key.Up) || InputManager.isKeyPressed(Key.W)) {
            this.moveSelection(-1);
        } else if (InputManager.isKeyPressed(Key.Down) || InputManager.isKeyPressed(Key.S)) {
            this.moveSelection(1);
        }

        const item = this.optionItems[this.selectedIndex];
        if (item.type === 'slider' && item.slider) {
            if (InputManager.isKeyHeld(Key.Left) || InputManager.isKeyHeld(Key.A)) {
                this.adjustSlider(item.slider, -0.02);
            } else if (InputManager.isKeyHeld(Key.Right) || InputManager.isKeyHeld(Key.D)) {
                this.adjustSlider(item.slider, 0.02);
            }
        }

        if (InputManager.isActionPressed() || InputManager.isStartPressed()) {
            if (item.type === 'button') {
                this.playSelectSound();
                this.goBack();
            }
        }

        if (InputManager.isCancelPressed() || InputManager.isKeyPressed(Key.Escape)) {
            this.goBack();
        }
    }

    private moveSelection(delta: number): void {
        const prevIndex = this.selectedIndex;
        this.selectedIndex = (this.selectedIndex + delta + this.optionItems.length) % this.optionItems.length;

        if (prevIndex !== this.selectedIndex) {
            this.playMoveSound();
            this.updateSelection();
        }
    }

    private adjustSlider(slider: Slider, delta: number): void {
        const newValue = Math.max(0, Math.min(1, slider.value + delta));
        if (newValue !== slider.value) {
            slider.value = newValue;
            slider.onChange(newValue);
            this.updateSliderVisual(slider, this.centerX - 20, 200, true);
        }
    }

    private goBack(): void {
        if (this.optionsConfig.onBack) {
            this.optionsConfig.onBack();
        } else {
            SceneTransition.popWithFade(this.app);
        }
    }

    private playMoveSound(): void {
        if (AudioManager.isLoaded('menu_move')) {
            AudioManager.playSound('menu_move', { volume: 0.5 });
        }
    }

    private playSelectSound(): void {
        if (AudioManager.isLoaded('menu_select')) {
            AudioManager.playSound('menu_select', { volume: 0.7 });
        }
    }

    private lerpColor(color1: number, color2: number, t: number): number {
        const r1 = (color1 >> 16) & 0xff;
        const g1 = (color1 >> 8) & 0xff;
        const b1 = color1 & 0xff;

        const r2 = (color2 >> 16) & 0xff;
        const g2 = (color2 >> 8) & 0xff;
        const b2 = color2 & 0xff;

        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);

        return (r << 16) | (g << 8) | b;
    }
}
