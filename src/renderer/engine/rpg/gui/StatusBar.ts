/**
 * StatusBar — persistent bottom-of-screen bar with clock, day, money, and buttons.
 *
 * Ported from okgame C++ Engine/rpg/gui/statusbar/StatusBar.
 */
import { Container, Text, TextStyle, Graphics } from 'pixi.js';
import { NotificationManager } from './NotificationManager';

export interface StatusBarConfig {
    width: number;
    height?: number;
    useLightTheme?: boolean;
}

export class StatusBar {
    static DEFAULT_HEIGHT = 32;

    private container: Container;
    private background: Graphics;
    private clockText: Text;
    private dayText: Text;
    private moneyText: Text;
    private width: number;
    private height: number;
    private useLightTheme: boolean;

    readonly notificationManager: NotificationManager;

    // State
    private clockString = '12:00';
    private dayString = 'Day 1';
    private moneyString = '$0';
    private enabled = true;

    constructor(config: StatusBarConfig) {
        this.width = config.width;
        this.height = config.height ?? StatusBar.DEFAULT_HEIGHT;
        this.useLightTheme = config.useLightTheme ?? false;

        this.container = new Container();

        // Background bar
        this.background = new Graphics();
        this.drawBackground();
        this.container.addChild(this.background);

        // Clock
        const style = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 13,
            fill: this.useLightTheme ? 0x333333 : 0xcccccc,
        });

        this.clockText = new Text({ text: this.clockString, style });
        this.clockText.position.set(10, 8);
        this.container.addChild(this.clockText);

        // Day
        this.dayText = new Text({ text: this.dayString, style });
        this.dayText.position.set(80, 8);
        this.container.addChild(this.dayText);

        // Money
        const moneyStyle = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 13,
            fill: this.useLightTheme ? 0x228822 : 0x44ff88,
        });
        this.moneyText = new Text({ text: this.moneyString, style: moneyStyle });
        this.moneyText.anchor.set(1, 0);
        this.moneyText.position.set(this.width - 10, 8);
        this.container.addChild(this.moneyText);

        // Notification manager
        const notifContainer = new Container();
        notifContainer.position.set(0, -32);
        this.container.addChild(notifContainer);
        this.notificationManager = new NotificationManager(notifContainer);
    }

    private drawBackground(): void {
        this.background.clear();
        this.background.rect(0, 0, this.width, this.height);
        this.background.fill({ color: this.useLightTheme ? 0xdddddd : 0x0a0a1e, alpha: 0.95 });
        this.background.stroke({ color: this.useLightTheme ? 0xaaaaaa : 0x334466, width: 1 });
    }

    // ============================================================
    // State Updates
    // ============================================================

    setClock(hours: number, minutes: number): void {
        this.clockString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        this.clockText.text = this.clockString;
    }

    setDay(day: number): void {
        this.dayString = `Day ${day}`;
        this.dayText.text = this.dayString;
    }

    setMoney(amount: number): void {
        this.moneyString = `$${amount.toLocaleString()}`;
        this.moneyText.text = this.moneyString;
    }

    // ============================================================
    // Theme
    // ============================================================

    setLightTheme(): void {
        this.useLightTheme = true;
        this.drawBackground();
    }

    setDarkTheme(): void {
        this.useLightTheme = false;
        this.drawBackground();
    }

    // ============================================================
    // Lifecycle
    // ============================================================

    update(dt: number): void {
        this.notificationManager.update(dt);
    }

    setEnabled(b: boolean): void {
        this.enabled = b;
        this.container.visible = b;
    }

    getContainer(): Container { return this.container; }
    getEnabled(): boolean { return this.enabled; }

    setPosition(x: number, y: number): void {
        this.container.position.set(x, y);
    }

    resize(width: number): void {
        this.width = width;
        this.drawBackground();
        this.moneyText.position.set(this.width - 10, 8);
    }

    destroy(): void {
        this.notificationManager.clear();
        this.container.destroy({ children: true });
    }
}
