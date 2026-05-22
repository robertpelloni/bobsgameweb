import { Container, Graphics, Text as PIXIText, TextStyle } from 'pixi.js';
import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';
import { EventEmitter } from 'eventemitter3';
import { BobEvent, EventTrigger } from '../engine/rpg/event/BobEvent';
import { EventCommand, EventCommandType } from '../engine/rpg/event/EventCommand';
import { EventParameter, EventParameterType } from '../engine/rpg/event/EventParameter';

export class EventSheetEditor extends EventEmitter {
    public container: Container;
    private panel: Panel;
    private eventsListContainer: Container;
    private closeBtn: Button;
    private addConditionBtn: Button;
    private addActionBtn: Button;

    // The current event being edited
    public currentEvent: BobEvent | null = null;

    constructor() {
        super();
        this.container = new Container();

        // Main panel for the Event Sheet editor
        this.panel = new Panel({ width: 700, height: 500, backgroundColor: 0x111122, borderColor: 0x8888ff });
        this.container.addChild(this.panel.container);

        const title = new PIXIText({ text: "RPG Event Sheet Editor", style: { fill: 0xffffff, fontSize: 20, fontWeight: "bold" } });
        title.position.set(20, 20);
        this.panel.addChild(title);

        this.closeBtn = new Button("Close", { width: 80, height: 30, backgroundColor: 0x660000 });
        this.closeBtn.setPosition(600, 20);
        this.closeBtn.on("click", () => this.emit("close"));
        this.panel.addChild(this.closeBtn.container);

        this.addConditionBtn = new Button("+ Condition", { width: 120, height: 30, backgroundColor: 0x004488 });
        this.addConditionBtn.setPosition(20, 450);
        this.addConditionBtn.on("click", () => this.addNewCondition());
        this.panel.addChild(this.addConditionBtn.container);

        this.addActionBtn = new Button("+ Action", { width: 120, height: 30, backgroundColor: 0x006600 });
        this.addActionBtn.setPosition(150, 450);
        this.addActionBtn.on("click", () => this.addNewAction());
        this.panel.addChild(this.addActionBtn.container);

        this.eventsListContainer = new Container();
        this.eventsListContainer.position.set(20, 80);
        this.panel.addChild(this.eventsListContainer);

        // Create a blank event if none is loaded
        this.createNewEvent();
    }

    public loadEvent(event: BobEvent) {
        this.currentEvent = event;
        this.renderEventCommands();
    }

    private createNewEvent() {
        this.currentEvent = new BobEvent(1, "New Event", EventTrigger.AUTO);
        // Add some default mock commands connected to the actual data structures
        const condParams = [
            new EventParameter(EventParameterType.STRING, "Switch 001: Boss Defeated"),
            new EventParameter(EventParameterType.STRING, "ON")
        ];
        const cond = new EventCommand("FLAG_CHECK", condParams, EventCommandType.QUALIFIER_TRUE);
        this.currentEvent.commands.push(cond);

        const actParams = [
            new EventParameter(EventParameterType.STRING, "You already defeated the boss!")
        ];
        const act = new EventCommand("SHOW_DIALOGUE", actParams, EventCommandType.COMMAND);
        this.currentEvent.commands.push(act);

        this.renderEventCommands();
    }

    private addNewCondition() {
        if (!this.currentEvent) return;
        const condParams = [
            new EventParameter(EventParameterType.STRING, "New Flag"),
            new EventParameter(EventParameterType.STRING, "ON")
        ];
        const cond = new EventCommand("FLAG_CHECK", condParams, EventCommandType.QUALIFIER_TRUE);
        this.currentEvent.commands.push(cond);
        this.renderEventCommands();
    }

    private addNewAction() {
        if (!this.currentEvent) return;
        const actParams = [
            new EventParameter(EventParameterType.STRING, "Hello world!")
        ];
        const act = new EventCommand("SHOW_DIALOGUE", actParams, EventCommandType.COMMAND);
        this.currentEvent.commands.push(act);
        this.renderEventCommands();
    }

    private renderEventCommands() {
        // Clear old rendering
        while(this.eventsListContainer.children.length > 0) {
            this.eventsListContainer.removeChildAt(0).destroy();
        }

        if (!this.currentEvent) return;

        let yOffset = 0;
        let indent = 0;

        // Render each command based on its type and functionName from BobEvent
        this.currentEvent.commands.forEach((cmd, i) => {
            let prefix = "";
            let color = 0xcccccc;

            if (cmd.type === EventCommandType.QUALIFIER_TRUE || cmd.type === EventCommandType.QUALIFIER_FALSE) {
                prefix = "◆ If: ";
                color = 0x88ccff;
                indent = 0;
            } else if (cmd.type === EventCommandType.COMMAND) {
                prefix = "  ◆ Action: ";
                color = 0xaaffaa;
                indent = 20;
            }

            const paramStr = cmd.parameters.map(p => p.value).join(", ");
            const textStr = `${prefix}${cmd.commandString} [${paramStr}]`;

            const text = new PIXIText({ text: textStr, style: { fill: color, fontSize: 14, fontFamily: "monospace" } });
            text.position.set(indent, yOffset);
            this.eventsListContainer.addChild(text);

            yOffset += 25;
        });
    }
}
