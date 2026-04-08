/**
 * StatusPanel — displays player stats, skills, and status information.
 *
 * Ported from okgame C++ Engine/rpg/gui/stuffMenu/subMenus/StatusPanel.
 */
import { Container, Text, TextStyle, Graphics } from 'pixi.js';
import { SubPanel } from './SubPanel';
import type { Skill } from '../event/Skill';
import type { Flag } from '../event/Flag';

export interface PlayerStatus {
    name: string;
    level: number;
    skills: Map<string, Skill>;
    flags: Map<string, Flag>;
    money: number;
    playTime: string;
}

export class StatusPanel extends SubPanel {
    private status: PlayerStatus | null = null;

    setStatus(status: PlayerStatus): void {
        this.status = status;
        this.refresh();
    }

    private refresh(): void {
        this.container.removeChildren();

        if (!this.status) return;

        const titleStyle = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 18,
            fill: 0xffff88,
            fontWeight: 'bold',
        });

        const statStyle = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 13,
            fill: 0xcccccc,
        });

        let y = 0;

        // Title
        const nameText = new Text({ text: this.status.name, style: titleStyle });
        nameText.position.set(10, y);
        this.container.addChild(nameText);
        y += 30;

        // Level
        const levelText = new Text({ text: `Level: ${this.status.level}`, style: statStyle });
        levelText.position.set(10, y);
        this.container.addChild(levelText);
        y += 22;

        // Money
        const moneyText = new Text({ text: `Money: $${this.status.money.toLocaleString()}`, style: statStyle });
        moneyText.position.set(10, y);
        this.container.addChild(moneyText);
        y += 22;

        // Play time
        const timeText = new Text({ text: `Play Time: ${this.status.playTime}`, style: statStyle });
        timeText.position.set(10, y);
        this.container.addChild(timeText);
        y += 30;

        // Skills
        const skillHeader = new Text({ text: '— Skills —', style: titleStyle });
        skillHeader.position.set(10, y);
        this.container.addChild(skillHeader);
        y += 24;

        for (const [key, skill] of this.status.skills) {
            const row = new Container();

            // Skill name
            const label = new Text({ text: key, style: statStyle });
            label.position.set(10, 0);
            row.addChild(label);

            // Skill value bar
            const barBg = new Graphics();
            barBg.rect(160, 3, 100, 12);
            barBg.fill({ color: 0x222244 });
            row.addChild(barBg);

            const barFill = new Graphics();
            const fillWidth = Math.min(100, skill.getValue()) * 1.0;
            barFill.rect(160, 3, fillWidth, 12);
            barFill.fill({ color: 0x44ff88 });
            row.addChild(barFill);

            const valueText = new Text({
                text: `${skill.getValue()}`,
                style: new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 11, fill: 0xffffff }),
            });
            valueText.position.set(265, 0);
            row.addChild(valueText);

            row.position.set(0, y);
            this.container.addChild(row);
            y += 20;
        }
    }

    override update(dt: number): void {
        void dt;
    }
}
