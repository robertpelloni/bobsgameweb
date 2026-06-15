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

    public update(): void {
        const analyzer = (AudioManager as any).analyzer as AnalyserNode;
        if (!analyzer) return;

        analyzer.getByteFrequencyData(this.dataArray);
        this.graphics.clear();

        const barWidth = (this.width / this.dataArray.length) * 2.5;
        let x = 0;

        for (let i = 0; i < this.dataArray.length; i++) {
            const barHeight = (this.dataArray[i] / 255) * this.height;

            // Gradient-like color based on index
            const r = (i * 2) % 255;
            const g = (i * 5) % 255;
            const b = (i * 10) % 255;
            const color = (r << 16) | (g << 8) | b;

            this.graphics.rect(x, this.height - barHeight, barWidth - 1, barHeight);
            this.graphics.fill({ color, alpha: 0.8 });

            x += barWidth;
        }
    }

    public resize(width: number, height: number): void {
        this.width = width;
        this.height = height;
    }
}
