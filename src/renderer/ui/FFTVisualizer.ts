import { Container, Graphics } from 'pixi.js';
import { AudioManager } from '../audio/AudioManager';

export class FFTVisualizer {
    public container: Container = new Container();
    private graphics: Graphics = new Graphics();
    private dataArray: Uint8Array = new Uint8Array(128);
    private width: number;
    private height: number;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.container.addChild(this.graphics);
    }

    private mode: 'bars' | 'circle' = 'bars';

    public toggleMode(): void {
        this.mode = this.mode === 'bars' ? 'circle' : 'bars';
    }

    public update(): void {
        const analyzer = (AudioManager as any).analyzer as AnalyserNode;
        if (!analyzer) return;

        analyzer.getByteFrequencyData(this.dataArray);
        this.graphics.clear();

        if (this.mode === 'bars') {
            const barWidth = (this.width / this.dataArray.length) * 2.5;
            let x = 0;

            for (let i = 0; i < this.dataArray.length; i++) {
                const barHeight = (this.dataArray[i] / 255) * this.height;
                const r = (i * 2) % 255;
                const g = (i * 5) % 255;
                const b = (i * 10) % 255;
                const color = (r << 16) | (g << 8) | b;

                this.graphics.rect(x, this.height - barHeight, barWidth - 1, barHeight);
                this.graphics.fill({ color, alpha: 0.8 });
                x += barWidth;
            }
        } else {
            const centerX = this.width / 2;
            const centerY = this.height / 2;
            const radius = Math.min(this.width, this.height) / 4;

            for (let i = 0; i < this.dataArray.length; i++) {
                const angle = (i / this.dataArray.length) * Math.PI * 2;
                const impact = (this.dataArray[i] / 255) * 50;
                const x1 = centerX + Math.cos(angle) * radius;
                const y1 = centerY + Math.sin(angle) * radius;
                const x2 = centerX + Math.cos(angle) * (radius + impact);
                const y2 = centerY + Math.sin(angle) * (radius + impact);

                this.graphics.moveTo(x1, y1);
                this.graphics.lineTo(x2, y2);
                this.graphics.stroke({ color: 0x00ffff, width: 2, alpha: 0.8 });
            }
        }
    }

    public resize(width: number, height: number): void {
        this.width = width;
        this.height = height;
    }
}
