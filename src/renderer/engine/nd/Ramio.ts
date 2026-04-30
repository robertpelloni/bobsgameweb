/**
 * Ramio — Breakout-style mini-game.
 *
 * Ported from Java com.bobsgame.client.engine.game.nd.ramio.Ramio.
 * Complete breakout game with bricks, powerups, boba enemies, and physics.
 */
import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { MiniGameEngine, MiniGameState, type MiniGameConfig } from './MiniGameEngine';

export class RamioBrick {
    x: number;
    y: number;
    width: number;
    height: number;
    color: number;
    hits: number;
    maxHits: number;
    type: 'normal' | 'money' | 'hard' | 'unbreakable';
    alive = true;

    constructor(x: number, y: number, w: number, h: number, color: number, type: 'normal' | 'money' | 'hard' | 'unbreakable' = 'normal') {
        this.x = x; this.y = y; this.width = w; this.height = h;
        this.color = color; this.type = type;
        this.maxHits = type === 'hard' ? 3 : type === 'unbreakable' ? 999 : 1;
        this.hits = 0;
    }

    hit(): boolean {
        this.hits++;
        if (this.hits >= this.maxHits && this.type !== 'unbreakable') { this.alive = false; return true; }
        return false;
    }
}

export class RamioBoba {
    x: number; y: number; vx: number; vy: number; alive = true;
    constructor(x: number, y: number) {
        this.x = x; this.y = y;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = 0.5 + Math.random() * 0.5;
    }
    update(): void { this.x += this.vx; this.y += this.vy; }
}

export class Ramio extends MiniGameEngine {
    private areaWidth = 320;
    private areaHeight = 480;

    // Paddle
    private paddleX = 0;
    private paddleWidth = 48;
    private paddleHeight = 8;
    private paddleSpeed = 4;

    // Ball
    private ballX = 0;
    private ballY = 0;
    private ballVX = 0;
    private ballVY = 0;
    private ballSpeed = 3;
    private ballRadius = 4;

    // Game objects
    private bricks: RamioBrick[] = [];
    private bobas: RamioBoba[] = [];

    // State
    private ballLaunched = false;
    private _gameOver = false;
    private _gameWon = false;
    private moneyCollected = 0;
    private _lives = 3;
    private _level = 1;

    // Input
    private leftPressed = false;
    private rightPressed = false;

    constructor() {
        const config: MiniGameConfig = { name: 'Ramio', width: 320, height: 480 };
        super(config);
    }

    override init(): void { this.resetLevel(); }

    protected override onGameStart(): void {
        this._lives = 3; this._level = 1; this.score = 0;
        this.moneyCollected = 0; this._gameOver = false;
        this.resetLevel();
    }

    private resetLevel(): void {
        this.bricks = []; this.bobas = [];
        this.ballLaunched = false; this._gameWon = false;
        this.paddleX = (this.areaWidth - this.paddleWidth) / 2;
        this.ballX = this.paddleX + this.paddleWidth / 2;
        this.ballY = this.areaHeight - 30;
        this.ballVX = 0; this.ballVY = 0;

        const brickW = 30, brickH = 12;
        const cols = Math.floor(this.areaWidth / (brickW + 2));
        const rows = 4 + this._level;
        const colors = [0xff4444, 0xff8844, 0xffff44, 0x44ff44, 0x4444ff, 0xff44ff];

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = col * (brickW + 2) + 4;
                const y = row * (brickH + 2) + 30;
                const color = colors[row % colors.length];
                const type = Math.random() < 0.05 ? 'money' : Math.random() < 0.1 ? 'hard' : 'normal';
                this.bricks.push(new RamioBrick(x, y, brickW, brickH, color, type));
            }
        }
    }

    private launchBall(): void {
        if (this.ballLaunched || this._gameOver) return;
        this.ballLaunched = true;
        this.ballVX = (Math.random() - 0.5) * 2;
        this.ballVY = -this.ballSpeed;
    }

    handleLeft(pressed: boolean): void { this.leftPressed = pressed; }
    handleRight(pressed: boolean): void { this.rightPressed = pressed; }
    handleAction(): void { this.launchBall(); }

    protected override onGameUpdate(_dt: number): void {
        if (this._gameOver || this._gameWon) return;

        if (this.leftPressed) this.paddleX -= this.paddleSpeed;
        if (this.rightPressed) this.paddleX += this.paddleSpeed;
        this.paddleX = Math.max(0, Math.min(this.areaWidth - this.paddleWidth, this.paddleX));

        if (!this.ballLaunched) {
            this.ballX = this.paddleX + this.paddleWidth / 2;
            this.ballY = this.areaHeight - 30;
            return;
        }

        this.ballX += this.ballVX;
        this.ballY += this.ballVY;

        // Walls
        if (this.ballX - this.ballRadius <= 0 || this.ballX + this.ballRadius >= this.areaWidth) {
            this.ballVX = -this.ballVX;
            this.ballX = Math.max(this.ballRadius, Math.min(this.areaWidth - this.ballRadius, this.ballX));
        }
        if (this.ballY - this.ballRadius <= 0) this.ballVY = Math.abs(this.ballVY);

        // Bottom
        if (this.ballY + this.ballRadius >= this.areaHeight) {
            this._lives--;
            if (this._lives <= 0) { this._gameOver = true; this.state = MiniGameState.GAME_OVER; }
            else { this.ballLaunched = false; this.ballVX = 0; this.ballVY = 0; }
            return;
        }

        // Paddle collision
        const paddleTop = this.areaHeight - 20;
        if (this.ballY + this.ballRadius >= paddleTop && this.ballY + this.ballRadius <= paddleTop + this.paddleHeight &&
            this.ballX >= this.paddleX && this.ballX <= this.paddleX + this.paddleWidth) {
            this.ballVY = -Math.abs(this.ballVY);
            this.ballVX = ((this.ballX - this.paddleX) / this.paddleWidth - 0.5) * this.ballSpeed * 1.5;
        }

        // Brick collision
        for (const brick of this.bricks) {
            if (!brick.alive) continue;
            if (this.ballX + this.ballRadius > brick.x && this.ballX - this.ballRadius < brick.x + brick.width &&
                this.ballY + this.ballRadius > brick.y && this.ballY - this.ballRadius < brick.y + brick.height) {
                const destroyed = brick.hit();
                this.ballVY = -this.ballVY;
                this.score += destroyed ? (brick.type === 'money' ? 50 : 10) : 1;
                if (destroyed && brick.type === 'money') this.moneyCollected++;
                if (destroyed && Math.random() < 0.3) this.bobas.push(new RamioBoba(brick.x, brick.y));
                break;
            }
        }

        // Bobas
        for (const boba of this.bobas) {
            boba.update();
            if (boba.y > this.areaHeight) { boba.alive = false; continue; }
            if (boba.y >= paddleTop && boba.y <= paddleTop + this.paddleHeight &&
                boba.x >= this.paddleX && boba.x <= this.paddleX + this.paddleWidth) {
                boba.alive = false; this._lives--;
                if (this._lives <= 0) { this._gameOver = true; this.state = MiniGameState.GAME_OVER; }
            }
        }
        this.bobas = this.bobas.filter(b => b.alive);

        // Win check
        if (this.bricks.filter(b => b.alive && b.type !== 'unbreakable').length === 0) {
            this._gameWon = true; this._level++;
            setTimeout(() => this.resetLevel(), 2000);
        }
    }

    protected override onGameRender(): void { /* handled in render */ }
    protected override onGameOver(): void { this._gameOver = true; }
    protected override onCleanup(): void { this.bricks = []; this.bobas = []; }

    override render(): Container {
        this.container.removeChildren();
        const g = new Graphics();

        g.rect(0, 0, this.areaWidth, this.areaHeight);
        g.fill({ color: 0x0a0a1a });

        for (const brick of this.bricks) {
            if (!brick.alive) continue;
            g.rect(brick.x, brick.y, brick.width, brick.height);
            g.fill({ color: brick.color });
            if (brick.type === 'hard') { g.rect(brick.x + 2, brick.y + 2, brick.width - 4, brick.height - 4); g.fill({ color: 0x666666 }); }
            else if (brick.type === 'money') { g.circle(brick.x + brick.width / 2, brick.y + brick.height / 2, 3); g.fill({ color: 0xffff00 }); }
        }

        g.roundRect(this.paddleX, this.areaHeight - 20, this.paddleWidth, this.paddleHeight, 3);
        g.fill({ color: 0x4488ff });
        g.circle(this.ballX, this.ballY, this.ballRadius);
        g.fill({ color: 0xffffff });

        for (const boba of this.bobas) { g.circle(boba.x, boba.y, 5); g.fill({ color: 0xff4444 }); }

        this.container.addChild(g);

        const style = new TextStyle({ fontFamily: 'monospace', fontSize: 12, fill: 0xcccccc });
        const scoreText = new Text({ text: `Score: ${this.score}  Lives: ${'♥'.repeat(Math.max(0, this._lives))}  Lvl: ${this._level}`, style });
        scoreText.position.set(4, 4);
        this.container.addChild(scoreText);

        if (this._gameOver) {
            const gs = new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 24, fill: 0xff4444, fontWeight: 'bold' });
            const gt = new Text({ text: 'GAME OVER', style: gs }); gt.anchor.set(0.5);
            gt.position.set(this.areaWidth / 2, this.areaHeight / 2);
            this.container.addChild(gt);
        } else if (this._gameWon) {
            const ws = new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 24, fill: 0x44ff44, fontWeight: 'bold' });
            const wt = new Text({ text: `LEVEL ${this._level} CLEAR!`, style: ws }); wt.anchor.set(0.5);
            wt.position.set(this.areaWidth / 2, this.areaHeight / 2);
            this.container.addChild(wt);
        } else if (!this.ballLaunched) {
            const hs = new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 14, fill: 0x888888 });
            const ht = new Text({ text: 'Press SPACE to launch', style: hs }); ht.anchor.set(0.5);
            ht.position.set(this.areaWidth / 2, this.areaHeight - 50);
            this.container.addChild(ht);
        }

        return this.container;
    }

    getLives(): number { return this._lives; }
    getLevel(): number { return this._level; }
    isGameOverFlag(): boolean { return this._gameOver; }
}
