/**
 * Ping — Pong-style mini-game.
 *
 * Ported from Java com.bobsgame.client.engine.game.nd.ping.Ping.
 * Classic pong with AI opponent, ball physics, and scoring.
 */
import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { MiniGameEngine, MiniGameState, type MiniGameConfig } from './MiniGameEngine';

export class Ping extends MiniGameEngine {
    private areaWidth = 400;
    private areaHeight = 300;

    // Paddles
    private leftPaddleY = 130;
    private rightPaddleY = 130;
    private paddleWidth = 8;
    private paddleHeight = 40;
    private paddleSpeed = 3;

    // Scores
    private leftScore = 0;
    private rightScore = 0;

    // Ball
    private ballX = 200;
    private ballY = 150;
    private ballVX = 0;
    private ballVY = 0;
    private ballRadius = 4;
    private ballBaseSpeed = 3;
    private speedMultiplier = 1;

    private maxScore = 7;
    private _gameOver = false;
    private _winner = '';

    // Input
    private upPressed = false;
    private downPressed = false;

    constructor() {
        const config: MiniGameConfig = { name: 'Ping', width: 400, height: 300 };
        super(config);
    }

    override init(): void {
        this.resetBall();
    }

    protected override onGameStart(): void {
        this.leftScore = 0;
        this.rightScore = 0;
        this._gameOver = false;
        this._winner = '';
        this.leftPaddleY = (this.areaHeight - this.paddleHeight) / 2;
        this.rightPaddleY = (this.areaHeight - this.paddleHeight) / 2;
        this.resetBall();
    }

    private resetBall(): void {
        this.ballX = this.areaWidth / 2;
        this.ballY = this.areaHeight / 2;
        this.speedMultiplier = 1;
        const angle = (Math.random() - 0.5) * Math.PI / 3;
        const dir = Math.random() < 0.5 ? 1 : -1;
        this.ballVX = dir * Math.cos(angle) * this.ballBaseSpeed;
        this.ballVY = Math.sin(angle) * this.ballBaseSpeed;
    }

    protected override onGameUpdate(_dt: number): void {
        if (this._gameOver) return;

        // Player input
        if (this.upPressed) this.leftPaddleY = Math.max(0, this.leftPaddleY - this.paddleSpeed);
        if (this.downPressed) this.leftPaddleY = Math.min(this.areaHeight - this.paddleHeight, this.leftPaddleY + this.paddleSpeed);

        // AI
        const aiCenter = this.rightPaddleY + this.paddleHeight / 2;
        const diff = this.ballY - aiCenter;
        const maxSpeed = this.ballBaseSpeed * 0.85;
        if (Math.abs(diff) > 2) {
            this.rightPaddleY += Math.sign(diff) * Math.min(Math.abs(diff), maxSpeed);
        }
        this.rightPaddleY = Math.max(0, Math.min(this.areaHeight - this.paddleHeight, this.rightPaddleY));

        // Ball
        this.ballX += this.ballVX * this.speedMultiplier;
        this.ballY += this.ballVY * this.speedMultiplier;

        // Wall bounce
        if (this.ballY - this.ballRadius <= 0) {
            this.ballVY = Math.abs(this.ballVY);
            this.ballY = this.ballRadius;
        }
        if (this.ballY + this.ballRadius >= this.areaHeight) {
            this.ballVY = -Math.abs(this.ballVY);
            this.ballY = this.areaHeight - this.ballRadius;
        }

        // Left paddle collision
        if (this.ballVX < 0 &&
            this.ballX - this.ballRadius <= 10 + this.paddleWidth &&
            this.ballX + this.ballRadius >= 10 &&
            this.ballY >= this.leftPaddleY &&
            this.ballY <= this.leftPaddleY + this.paddleHeight) {
            this.ballVX = Math.abs(this.ballVX);
            const hitPos = (this.ballY - this.leftPaddleY) / this.paddleHeight;
            this.ballVY = (hitPos - 0.5) * this.ballBaseSpeed * 2;
            this.speedMultiplier = Math.min(2, this.speedMultiplier + 0.05);
        }

        // Right paddle collision
        if (this.ballVX > 0 &&
            this.ballX + this.ballRadius >= 380 &&
            this.ballX - this.ballRadius <= 380 + this.paddleWidth &&
            this.ballY >= this.rightPaddleY &&
            this.ballY <= this.rightPaddleY + this.paddleHeight) {
            this.ballVX = -Math.abs(this.ballVX);
            const hitPos = (this.ballY - this.rightPaddleY) / this.paddleHeight;
            this.ballVY = (hitPos - 0.5) * this.ballBaseSpeed * 2;
            this.speedMultiplier = Math.min(2, this.speedMultiplier + 0.05);
        }

        // Score
        if (this.ballX < 0) { this.rightScore++; this.resetBall(); }
        if (this.ballX > this.areaWidth) { this.leftScore++; this.resetBall(); }

        // Win
        if (this.leftScore >= this.maxScore) { this._gameOver = true; this._winner = 'Player'; this.state = MiniGameState.GAME_OVER; }
        else if (this.rightScore >= this.maxScore) { this._gameOver = true; this._winner = 'CPU'; this.state = MiniGameState.GAME_OVER; }
    }

    protected override onGameRender(): void {
        // Handled by render()
    }

    protected override onGameOver(): void { this._gameOver = true; }
    protected override onCleanup(): void { /* no-op */ }

    handleUp(pressed: boolean): void { this.upPressed = pressed; }
    handleDown(pressed: boolean): void { this.downPressed = pressed; }

    override render(): Container {
        this.container.removeChildren();
        const g = new Graphics();

        // Background
        g.rect(0, 0, this.areaWidth, this.areaHeight);
        g.fill({ color: 0x001100 });

        // Center line
        for (let y = 0; y < this.areaHeight; y += 12) {
            g.rect(this.areaWidth / 2 - 1, y, 2, 6);
            g.fill({ color: 0x003300 });
        }

        // Left paddle
        g.roundRect(10, this.leftPaddleY, this.paddleWidth, this.paddleHeight, 2);
        g.fill({ color: 0x44ff44 });

        // Right paddle
        g.roundRect(380, this.rightPaddleY, this.paddleWidth, this.paddleHeight, 2);
        g.fill({ color: 0xff4444 });

        // Ball
        g.circle(this.ballX, this.ballY, this.ballRadius);
        g.fill({ color: 0xffffff });

        this.container.addChild(g);

        const scoreStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 24, fill: 0x336633 });
        const ls = new Text({ text: `${this.leftScore}`, style: scoreStyle });
        ls.anchor.set(0.5); ls.position.set(this.areaWidth / 4, 30);
        this.container.addChild(ls);

        const rs = new Text({ text: `${this.rightScore}`, style: scoreStyle });
        rs.anchor.set(0.5); rs.position.set(this.areaWidth * 3 / 4, 30);
        this.container.addChild(rs);

        if (this._gameOver) {
            const goStyle = new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 20, fill: 0xffff44, fontWeight: 'bold' });
            const goText = new Text({ text: `${this._winner} wins!`, style: goStyle });
            goText.anchor.set(0.5); goText.position.set(this.areaWidth / 2, this.areaHeight / 2);
            this.container.addChild(goText);
        }

        return this.container;
    }

    getScores(): [number, number] { return [this.leftScore, this.rightScore]; }
    isGameOver(): boolean { return this._gameOver; }
    getWinner(): string { return this._winner; }
}
