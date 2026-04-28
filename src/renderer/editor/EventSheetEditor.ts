import { Container, Graphics, Text as PIXIText } from 'pixi.js';
import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';
import { EventEmitter } from 'eventemitter3';

export class EventSheetEditor extends EventEmitter {
    public container: Container;
    private panel: Panel;
    private eventsListContainer: Container;
    private closeBtn: Button;

    constructor() {
        super();
        this.container = new Container();

        // Main panel for the Event Sheet editor
        this.panel = new Panel({ width: 700, height: 500, backgroundColor: 0x111122, borderColor: 0x8888ff });
        this.container.addChild(this.panel.container);

        const title = new PIXIText({ text: "Event Sheet Editor", style: { fill: 0xffffff, fontSize: 20, fontWeight: "bold" } });
        title.position.set(20, 20);
        this.panel.addChild(title);

        this.closeBtn = new Button("Close", { width: 80, height: 30, backgroundColor: 0x660000 });
        this.closeBtn.setPosition(600, 20);
        this.closeBtn.on("click", () => this.emit("close"));
        this.panel.addChild(this.closeBtn.container);

        this.eventsListContainer = new Container();
        this.eventsListContainer.position.set(20, 80);
        this.panel.addChild(this.eventsListContainer);

        this.drawMockEvents();
    }

    private drawMockEvents() {
        // Draw some mock RPG Maker style events
        const mockEvents = [
            "◆If: [Switch 001: Boss Defeated] is ON",
            "  ◆Text: None, Window, Bottom",
            "  : You already defeated the boss!",
            "◆Else",
            "  ◆Battle Processing: Boss",
            "  ◆If: Win",
            "    ◆Control Switches: [001: Boss Defeated] = ON",
            "  ◆End",
            "◆End"
        ];

        mockEvents.forEach((evt, i) => {
            const isControl = evt.startsWith("◆");
            const color = isControl ? 0x88ccff : 0xcccccc;
            const text = new PIXIText({ text: evt, style: { fill: color, fontSize: 14, fontFamily: "monospace" } });
            text.position.set(0, i * 25);
            this.eventsListContainer.addChild(text);
        });
    }
}
