/**
 * SettingsPanel — game settings with toggle options.
 *
 * Ported from okgame C++ Engine/rpg/gui/stuffMenu/subMenus/SettingsPanel.
 */
import { Container, Text, TextStyle, Graphics } from 'pixi.js';
import { SubPanel } from './SubPanel';

export interface SettingOption {
    key: string;
    label: string;
    value: boolean | number | string;
    type: 'toggle' | 'slider' | 'select';
    options?: string[];
    min?: number;
    max?: number;
}

export class SettingsPanel extends SubPanel {
    private settings: Map<string, SettingOption> = new Map();
    private callbacks: Map<string, (value: unknown) => void> = new Map();

    addSetting(option: SettingOption, onChange?: (value: unknown) => void): void {
        this.settings.set(option.key, option);
        if (onChange) this.callbacks.set(option.key, onChange);
    }

    override init(): void {
        this.refresh();
    }

    private refresh(): void {
        this.container.removeChildren();

        let y = 10;

        for (const [key, setting] of this.settings) {
            const row = new Container();

            // Label
            const label = new Text({
                text: setting.label,
                style: new TextStyle({
                    fontFamily: 'Arial, sans-serif',
                    fontSize: 13,
                    fill: 0xcccccc,
                }),
            });
            label.position.set(10, 0);
            row.addChild(label);

            // Value display
            if (setting.type === 'toggle') {
                const toggleBg = new Graphics();
                const isOn = setting.value as boolean;
                toggleBg.roundRect(300, 0, 40, 20, 10);
                toggleBg.fill({ color: isOn ? 0x44ff88 : 0x444444 });
                row.addChild(toggleBg);

                const toggleKnob = new Graphics();
                toggleKnob.circle(isOn ? 330 : 310, 10, 8);
                toggleKnob.fill({ color: 0xffffff });
                row.addChild(toggleKnob);

                row.interactive = true;
                row.on('pointerdown', () => {
                    const newVal = !(setting.value as boolean);
                    setting.value = newVal;
                    const cb = this.callbacks.get(key);
                    if (cb) cb(newVal);
                    this.refresh();
                });
            } else {
                const valText = new Text({
                    text: `${setting.value}`,
                    style: new TextStyle({
                        fontFamily: 'Arial, sans-serif',
                        fontSize: 13,
                        fill: 0xffff88,
                    }),
                });
                valText.position.set(300, 0);
                row.addChild(valText);
            }

            row.position.set(0, y);
            this.container.addChild(row);
            y += 30;
        }
    }

    override update(dt: number): void {
        void dt;
    }
}
