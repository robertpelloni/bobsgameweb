/**
 * TitleIntroAnimation — animated title screen sequence for bob's game.
 *
 * Renders the game title with a glowing animated effect, subtitle,
 * floating particles, and a "Press Enter" prompt. Creates an atmospheric
 * first impression that matches the original game's style.
 */
import { Container, Graphics, Text, TextStyle } from 'pixi.js';

export class TitleIntroAnimation {
    private container: Container;
    private width: number;
    private height: number;
    private time = 0;

    // Particles
    private particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number; color: number }[] = [];

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.container = new Container();

        // Spawn particles
        for (let i = 0; i < 40; i++) {
            this.particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 15,
                vy: (Math.random() - 0.5) * 15,
                size: 1 + Math.random() * 3,
                alpha: 0.2 + Math.random() * 0.5,
                color: [0x00ffff, 0x4466aa, 0x88aaff, 0x2244ff][Math.floor(Math.random() * 4)],
            });
        }
    }

    update(dt: number): void {
        this.time += dt;

        // Update particles
        for (const p of this.particles) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            // Wrap around screen
            if (p.x < 0) p.x += this.width;
            if (p.x > this.width) p.x -= this.width;
            if (p.y < 0) p.y += this.height;
            if (p.y > this.height) p.y -= this.height;
        }
    }

    render(): Container {
        this.container.removeChildren();

        // Background gradient (dark blue to black)
        const bg = new Graphics();
        bg.rect(0, 0, this.width, this.height);
        bg.fill({ color: 0x020212 });
        this.container.addChild(bg);

        // Particles
        for (const p of this.particles) {
            const pg = new Graphics();
            pg.circle(p.x, p.y, p.size);
            pg.fill({ color: p.color, alpha: p.alpha * (0.5 + 0.5 * Math.sin(this.time * 0.5 + p.x)) });
            this.container.addChild(pg);
        }

        // Horizontal lines (scanline effect)
        const scanlines = new Graphics();
        scanlines.rect(0, 0, this.width, this.height);
        scanlines.fill({ color: 0x000000, alpha: 0.03 });
        for (let y = 0; y < this.height; y += 3) {
            scanlines.moveTo(0, y);
            scanlines.lineTo(this.width, y);
            scanlines.stroke({ color: 0x000000, width: 1, alpha: 0.05 });
        }
        this.container.addChild(scanlines);

        // Title glow (behind title)
        const glowAlpha = 0.1 + 0.05 * Math.sin(this.time * 1.5);
        const glow = new Graphics();
        glow.circle(this.width / 2, this.height / 2 - 50, 120 + 10 * Math.sin(this.time));
        glow.fill({ color: 0x0044aa, alpha: glowAlpha });
        this.container.addChild(glow);

        // Title text
        const titleStyle = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 42,
            fill: 0x00ffff,
            fontWeight: 'bold',
            letterSpacing: 4,
        });
        const title = new Text({ text: "bob's game", style: titleStyle });
        title.anchor.set(0.5);

        // Subtle float animation
        const floatY = Math.sin(this.time * 0.8) * 4;
        title.position.set(this.width / 2, this.height / 2 - 50 + floatY);
        this.container.addChild(title);

        // Subtitle
        const subStyle = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 14,
            fill: 0x4466aa,
            letterSpacing: 8,
        });
        const sub = new Text({ text: 'THE  ULTIMATE  OMNI-ENGINE', style: subStyle });
        sub.anchor.set(0.5);
        sub.position.set(this.width / 2, this.height / 2 + 5);
        this.container.addChild(sub);

        // Version
        const verStyle = new TextStyle({
            fontFamily: 'monospace',
            fontSize: 10,
            fill: 0x334455,
        });
        const ver = new Text({ text: 'v2.1.78', style: verStyle });
        ver.anchor.set(1);
        ver.position.set(this.width - 10, this.height - 10);
        this.container.addChild(ver);

        // "Press Enter" prompt (blinking)
        const promptAlpha = Math.abs(Math.sin(this.time * 2));
        const promptStyle = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 16,
            fill: 0xffffff,
        });
        const prompt = new Text({ text: 'Press ENTER to Start', style: promptStyle });
        prompt.anchor.set(0.5);
        prompt.position.set(this.width / 2, this.height / 2 + 80);
        prompt.alpha = promptAlpha;
        this.container.addChild(prompt);

        // Decorative borders
        const border = new Graphics();
        const borderAlpha = 0.3 + 0.1 * Math.sin(this.time);
        border.rect(20, 20, this.width - 40, this.height - 40);
        border.stroke({ color: 0x2244aa, width: 1, alpha: borderAlpha });
        this.container.addChild(border);

        // Corner decorations
        const corners = [
            { x: 24, y: 24 },
            { x: this.width - 24, y: 24 },
            { x: 24, y: this.height - 24 },
            { x: this.width - 24, y: this.height - 24 },
        ];
        for (const c of corners) {
            const cg = new Graphics();
            cg.circle(c.x, c.y, 3);
            cg.fill({ color: 0x4488ff, alpha: borderAlpha + 0.2 });
            this.container.addChild(cg);
        }

        return this.container;
    }

    resize(width: number, height: number): void {
        this.width = width;
        this.height = height;
    }

    destroy(): void {
        this.container.destroy({ children: true });
    }
}
