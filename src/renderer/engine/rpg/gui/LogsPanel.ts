/**
 * LogsPanel — game log / debug messages display.
 *
 * Ported from okgame C++ Engine/rpg/gui/stuffMenu/subMenus/LogsPanel.
 */
import { Container, Text, TextStyle } from 'pixi.js';
import { SubPanel } from './SubPanel';

export interface LogEntry {
    timestamp: number;
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
}

export class LogsPanel extends SubPanel {
    private entries: LogEntry[] = [];
    private maxEntries = 100;
    private scrollOffset = 0;

    addEntry(entry: LogEntry): void {
        this.entries.push(entry);
        if (this.entries.length > this.maxEntries) this.entries.shift();
        if (this.visible) this.refresh();
    }

    clear(): void {
        this.entries = [];
        this.refresh();
    }

    private refresh(): void {
        this.container.removeChildren();

        const maxVisible = 20;
        const start = Math.max(0, this.entries.length - maxVisible - this.scrollOffset);
        const end = Math.min(this.entries.length, start + maxVisible);

        const colors: Record<string, number> = {
            info: 0xaaaaaa,
            warn: 0xffaa44,
            error: 0xff4444,
            debug: 0x666666,
        };

        let y = 0;
        for (let i = end - 1; i >= start; i--) {
            const entry = this.entries[i];
            const date = new Date(entry.timestamp);
            const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;

            const text = new Text({
                text: `[${timeStr}] [${entry.level.toUpperCase()}] ${entry.message}`,
                style: new TextStyle({
                    fontFamily: 'monospace',
                    fontSize: 11,
                    fill: colors[entry.level] ?? 0xaaaaaa,
                    wordWrap: true,
                    wordWrapWidth: 580,
                }),
            });
            text.position.set(10, y);
            this.container.addChild(text);
            y += 18;
        }
    }

    override setVisible(b: boolean): void {
        super.setVisible(b);
        if (b) this.refresh();
    }

    override update(dt: number): void {
        void dt;
    }
}
