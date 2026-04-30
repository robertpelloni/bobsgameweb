/**
 * Game Flow States — title screen, login, lobby, legal, etc.
 *
 * Ported from okgame C++ Engine/state/*.h
 * These are the top-level game states that drive the main flow.
 */
import { Container, Text, TextStyle, Graphics } from 'pixi.js';

// ============================================================
// Title Screen State
// ============================================================

export class TitleScreenState {
    private container: Container;
    private width: number;
    private height: number;
    private logoTimer = 0;
    private menuCursorPos = 0;
    private menuOptions = ['New Game', 'Load Game', 'Settings', 'Quit'];
    private onOption?: (option: string) => void;

    constructor(width: number, height: number, onOption?: (option: string) => void) {
        this.width = width;
        this.height = height;
        this.onOption = onOption;
        this.container = new Container();
    }

    update(dt: number): void {
        this.logoTimer += dt;
    }

    render(): Container {
        this.container.removeChildren();

        // Background
        const bg = new Graphics();
        bg.rect(0, 0, this.width, this.height);
        bg.fill({ color: 0x0a0a1a });
        this.container.addChild(bg);

        // Animated title
        const pulse = Math.sin(this.logoTimer * 0.003) * 0.2 + 0.8;
        const titleStyle = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 36,
            fill: 0x00ffff,
            fontWeight: 'bold',
        });
        const title = new Text({ text: "bob's game", style: titleStyle });
        title.anchor.set(0.5);
        title.position.set(this.width / 2, this.height / 3);
        title.alpha = pulse;
        this.container.addChild(title);

        // Subtitle
        const subStyle = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 14,
            fill: 0x666688,
        });
        const sub = new Text({ text: 'THE ULTIMATE OMNI-ENGINE', style: subStyle });
        sub.anchor.set(0.5);
        sub.position.set(this.width / 2, this.height / 3 + 40);
        this.container.addChild(sub);

        // Menu options
        this.menuOptions.forEach((opt, i) => {
            const selected = i === this.menuCursorPos;
            const style = new TextStyle({
                fontFamily: 'Arial, sans-serif',
                fontSize: 18,
                fill: selected ? 0xffff88 : 0x888899,
            });
            const text = new Text({
                text: `${selected ? '▸ ' : '  '}${opt}`,
                style,
            });
            text.anchor.set(0.5);
            text.position.set(this.width / 2, this.height / 2 + 40 + i * 32);
            this.container.addChild(text);
        });

        // Version
        const verStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 11, fill: 0x444444 });
        const ver = new Text({ text: 'v2.1.63', style: verStyle });
        ver.position.set(8, this.height - 20);
        this.container.addChild(ver);

        return this.container;
    }

    cursorUp(): void {
        this.menuCursorPos = Math.max(0, this.menuCursorPos - 1);
    }

    cursorDown(): void {
        this.menuCursorPos = Math.min(this.menuOptions.length - 1, this.menuCursorPos + 1);
    }

    select(): void {
        this.onOption?.(this.menuOptions[this.menuCursorPos]);
    }

    getContainer(): Container { return this.container; }
}

// ============================================================
// Login State
// ============================================================

export class LoginState {
    private container: Container;
    private width: number;
    private height: number;
    username = '';
    password = '';
    activeField: 'username' | 'password' = 'username';
    cursorBlink = 0;
    private onSubmit?: (username: string, password: string) => void;

    constructor(width: number, height: number, onSubmit?: (u: string, p: string) => void) {
        this.width = width;
        this.height = height;
        this.onSubmit = onSubmit;
        this.container = new Container();
    }

    update(dt: number): void {
        this.cursorBlink += dt;
    }

    render(): Container {
        this.container.removeChildren();

        const bg = new Graphics();
        bg.rect(0, 0, this.width, this.height);
        bg.fill({ color: 0x0a0a2a });
        this.container.addChild(bg);

        const titleStyle = new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 24, fill: 0xffff88 });
        const title = new Text({ text: 'Login', style: titleStyle });
        title.anchor.set(0.5);
        title.position.set(this.width / 2, this.height / 3 - 20);
        this.container.addChild(title);

        // Username field
        this.renderField('Username', this.username, this.width / 2, this.height / 2 - 20, this.activeField === 'username');
        // Password field
        this.renderField('Password', '*'.repeat(this.password.length), this.width / 2, this.height / 2 + 30, this.activeField === 'password');

        // Submit hint
        const hint = new Text({
            text: 'Press Enter to login',
            style: new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 12, fill: 0x666688 }),
        });
        hint.anchor.set(0.5);
        hint.position.set(this.width / 2, this.height / 2 + 80);
        this.container.addChild(hint);

        return this.container;
    }

    private renderField(label: string, value: string, x: number, y: number, active: boolean): void {
        const labelStyle = new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 13, fill: 0x888888 });
        const labelText = new Text({ text: label, style: labelStyle });
        labelText.anchor.set(0.5, 0);
        labelText.position.set(x, y - 18);
        this.container.addChild(labelText);

        const fieldBg = new Graphics();
        fieldBg.roundRect(x - 100, y, 200, 24, 3);
        fieldBg.fill({ color: active ? 0x1a1a4a : 0x111133 });
        fieldBg.stroke({ color: active ? 0x4488ff : 0x334466, width: 1 });
        this.container.addChild(fieldBg);

        const blink = active && Math.sin(this.cursorBlink * 0.005) > 0;
        const valueStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 14, fill: 0xcccccc });
        const valueText = new Text({ text: value + (blink ? '_' : ''), style: valueStyle });
        valueText.anchor.set(0, 0.5);
        valueText.position.set(x - 94, y + 12);
        this.container.addChild(valueText);
    }

    typeKey(key: string): void {
        if (key === 'Tab') {
            this.activeField = this.activeField === 'username' ? 'password' : 'username';
        } else if (key === 'Enter') {
            this.onSubmit?.(this.username, this.password);
        } else if (key === 'Backspace') {
            if (this.activeField === 'username') this.username = this.username.slice(0, -1);
            else this.password = this.password.slice(0, -1);
        } else if (key.length === 1) {
            if (this.activeField === 'username') this.username += key;
            else this.password += key;
        }
    }

    getContainer(): Container { return this.container; }
}

// ============================================================
// Lobby State
// ============================================================

export class LobbyState {
    private container: Container;
    private width: number;
    private height: number;
    private rooms: { id: string; name: string; players: number; maxPlayers: number }[] = [];
    private cursorPos = 0;
    private onJoinRoom?: (roomID: string) => void;
    private onCreateRoom?: () => void;

    constructor(width: number, height: number, onJoinRoom?: (id: string) => void, onCreateRoom?: () => void) {
        this.width = width;
        this.height = height;
        this.onJoinRoom = onJoinRoom;
        this.onCreateRoom = onCreateRoom;
        this.container = new Container();
    }

    setRooms(rooms: typeof this.rooms): void {
        this.rooms = rooms;
        this.cursorPos = Math.min(this.cursorPos, Math.max(0, rooms.length - 1));
    }

    update(_dt: number): void { }

    render(): Container {
        this.container.removeChildren();

        const bg = new Graphics();
        bg.rect(0, 0, this.width, this.height);
        bg.fill({ color: 0x0a0a2a });
        this.container.addChild(bg);

        const titleStyle = new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 20, fill: 0xffff88 });
        const title = new Text({ text: 'Game Lobby', style: titleStyle });
        title.anchor.set(0.5);
        title.position.set(this.width / 2, 30);
        this.container.addChild(title);

        if (this.rooms.length === 0) {
            const empty = new Text({
                text: 'No rooms available. Press N to create one.',
                style: new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 14, fill: 0x666688 }),
            });
            empty.anchor.set(0.5);
            empty.position.set(this.width / 2, this.height / 2);
            this.container.addChild(empty);
        } else {
            this.rooms.forEach((room, i) => {
                const selected = i === this.cursorPos;
                const rowBg = new Graphics();
                rowBg.rect(40, 65 + i * 28, this.width - 80, 26);
                rowBg.fill({ color: selected ? 0x1a1a4a : 0x0e0e2a });
                this.container.addChild(rowBg);

                const style = new TextStyle({
                    fontFamily: 'Arial, sans-serif',
                    fontSize: 14,
                    fill: selected ? 0xffff88 : 0xaaaacc,
                });
                const text = new Text({
                    text: `${selected ? '▸ ' : '  '}${room.name}  (${room.players}/${room.maxPlayers})`,
                    style,
                });
                text.position.set(48, 68 + i * 28);
                this.container.addChild(text);
            });
        }

        return this.container;
    }

    cursorUp(): void { this.cursorPos = Math.max(0, this.cursorPos - 1); }
    cursorDown(): void { this.cursorPos = Math.min(this.rooms.length - 1, this.cursorPos + 1); }

    select(): void {
        if (this.rooms.length > 0) {
            this.onJoinRoom?.(this.rooms[this.cursorPos]?.id ?? '');
        }
    }

    createRoom(): void {
        this.onCreateRoom?.();
    }

    getContainer(): Container { return this.container; }
}
