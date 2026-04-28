import { Container, Graphics, Text as PIXIText } from 'pixi.js';
import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';

export class TimelineEditor {
    public container: Container;
    private panel: Panel;
    private trackContainer: Container;

    constructor() {
        this.container = new Container();

        this.panel = new Panel({ width: 600, height: 150, backgroundColor: 0x222222, borderColor: 0x888888 });
        this.container.addChild(this.panel.container);

        const title = new PIXIText({ text: "Animation Timeline", style: { fill: 0xffffff, fontSize: 16 } });
        title.position.set(10, 10);
        this.panel.addChild(title);

        const playBtn = new Button("Play", { width: 80, height: 30 });
        playBtn.setPosition(10, 40);
        this.panel.addChild(playBtn.container);

        const stopBtn = new Button("Stop", { width: 80, height: 30 });
        stopBtn.setPosition(100, 40);
        this.panel.addChild(stopBtn.container);

        this.trackContainer = new Container();
        this.trackContainer.position.set(10, 80);
        this.panel.addChild(this.trackContainer);

        this.drawTracks();
    }

    private drawTracks() {
        // Draw some mock frames
        for (let i = 0; i < 10; i++) {
            const frame = new Graphics();
            frame.roundRect(i * 55, 0, 50, 50, 4);
            frame.fill({ color: 0x444444 });
            frame.stroke({ color: 0x888888, width: 2 });
            this.trackContainer.addChild(frame);

            const num = new PIXIText({ text: `${i + 1}`, style: { fill: 0xaaaaaa, fontSize: 12 } });
            num.position.set(i * 55 + 5, 5);
            this.trackContainer.addChild(num);
        }
    }
}
