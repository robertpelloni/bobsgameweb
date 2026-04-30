/**
 * AchievementsScene — Full-screen trophy cabinet
 * 
 * Displays all achievements organized by category with:
 * - Unlock status and rarity glow
 * - Progress bars for progressive achievements
 * - Completion percentage header
 * - Category filter tabs (All, Puzzle, RPG, Editor, Social, Meta)
 * - Gamepad navigation support
 */

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Scene, SceneConfig } from '../state/Scene';
import { StateManager } from '../state/StateManager';
import { InputManager, Key } from '../input/InputManager';
import { AchievementManager, Achievement, AchievementCategory, AchievementRarity } from '../data/AchievementManager';

const CATEGORIES: ('all' | AchievementCategory)[] = ['all', 'puzzle', 'rpg', 'editor', 'social', 'meta'];
const CATEGORY_LABELS: Record<string, string> = {
    all: 'ALL', puzzle: 'PUZZLE', rpg: 'RPG', editor: 'EDITOR', social: 'SOCIAL', meta: 'META'
};

export class AchievementsScene extends Scene {
    private listContainer!: Container;
    private tabContainer!: Container;
    private headerText!: Text;
    private selectedTab: number = 0;
    private scrollY: number = 0;
    private maxScrollY: number = 0;

    constructor(config: SceneConfig) {
        super(config);
        this.listContainer = new Container();
        this.tabContainer = new Container();
    }

    public async create(): Promise<void> {
        this.createBackground();
        this.createHeader();
        this.createTabs();
        this.container.addChild(this.listContainer);
        this.renderAchievements('all');
    }

    private createBackground(): void {
        const bg = new Graphics();
        bg.rect(0, 0, this.width, this.height);
        bg.fill({ color: 0x050510, alpha: 1.0 });
        this.container.addChild(bg);

        // Decorative gold border
        const border = new Graphics();
        border.rect(10, 10, this.width - 20, this.height - 20);
        border.stroke({ color: 0xffd700, width: 1, alpha: 0.3 });
        this.container.addChild(border);
    }

    private createHeader(): void {
        const completion = AchievementManager.getCompletionPercent();
        const unlocked = AchievementManager.getUnlocked().length;
        const total = AchievementManager.getAll().length;

        const style = new TextStyle({
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: 36,
            fill: 0xffd700,
            stroke: { color: 0x000000, width: 4 }
        });
        this.headerText = new Text({ text: `🏆 ACHIEVEMENTS — ${unlocked}/${total} (${completion.toFixed(1)}%)`, style });
        this.headerText.anchor.set(0.5, 0);
        this.headerText.position.set(this.width / 2, 25);
        this.container.addChild(this.headerText);

        // Completion bar
        const barWidth = 400;
        const barBg = new Graphics();
        barBg.roundRect(this.width / 2 - barWidth / 2, 70, barWidth, 12, 6);
        barBg.fill({ color: 0x222222 });
        this.container.addChild(barBg);

        const barFill = new Graphics();
        const fillWidth = Math.max(2, barWidth * (completion / 100));
        barFill.roundRect(this.width / 2 - barWidth / 2, 70, fillWidth, 12, 6);
        barFill.fill({ color: 0xffd700 });
        this.container.addChild(barFill);
    }

    private createTabs(): void {
        this.tabContainer.removeChildren();
        const tabWidth = 100;
        const startX = this.width / 2 - (CATEGORIES.length * tabWidth) / 2;
        
        CATEGORIES.forEach((cat, i) => {
            const tab = new Container();
            tab.position.set(startX + i * tabWidth, 95);
            
            const bg = new Graphics();
            bg.roundRect(0, 0, tabWidth - 4, 28, 4);
            bg.fill({ color: i === this.selectedTab ? 0x334488 : 0x1a1a2e });
            bg.stroke({ color: i === this.selectedTab ? 0x6688ff : 0x333355, width: 1 });
            tab.addChild(bg);

            const label = new Text({
                text: CATEGORY_LABELS[cat],
                style: { fill: i === this.selectedTab ? 0xffffff : 0x888888, fontSize: 13, fontWeight: 'bold' }
            });
            label.anchor.set(0.5);
            label.position.set((tabWidth - 4) / 2, 14);
            tab.addChild(label);

            tab.eventMode = 'static';
            tab.cursor = 'pointer';
            tab.on('pointerdown', () => {
                this.selectedTab = i;
                this.scrollY = 0;
                this.createTabs();
                this.renderAchievements(CATEGORIES[i]);
            });

            this.tabContainer.addChild(tab);
        });

        this.container.addChild(this.tabContainer);
    }

    private renderAchievements(filter: string): void {
        this.listContainer.removeChildren();
        this.listContainer.position.set(0, 135);

        let achievements = AchievementManager.getAll();
        if (filter !== 'all') {
            achievements = achievements.filter(a => a.category === filter);
        }

        // Sort: unlocked first, then by rarity (legendary → common)
        const rarityOrder: Record<AchievementRarity, number> = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
        achievements.sort((a, b) => {
            const aUnlocked = a.unlockedAt ? 0 : 1;
            const bUnlocked = b.unlockedAt ? 0 : 1;
            if (aUnlocked !== bUnlocked) return aUnlocked - bUnlocked;
            return rarityOrder[a.rarity] - rarityOrder[b.rarity];
        });

        const cardWidth = this.width - 80;
        const cardHeight = 65;
        const gap = 6;

        achievements.forEach((ach, i) => {
            const card = this.createAchievementCard(ach, cardWidth, cardHeight);
            card.position.set(40, i * (cardHeight + gap));
            this.listContainer.addChild(card);
        });

        this.maxScrollY = Math.max(0, achievements.length * (cardHeight + gap) - (this.height - 160));
    }

    private createAchievementCard(ach: Achievement, w: number, h: number): Container {
        const card = new Container();
        const isUnlocked = !!ach.unlockedAt;
        const rarityColor = AchievementManager.getRarityColor(ach.rarity);

        // Card background
        const bg = new Graphics();
        bg.roundRect(0, 0, w, h, 6);
        bg.fill({ color: isUnlocked ? 0x1a1a2e : 0x0a0a15, alpha: isUnlocked ? 0.9 : 0.6 });
        bg.stroke({ color: isUnlocked ? rarityColor : 0x333344, width: isUnlocked ? 2 : 1 });
        card.addChild(bg);

        // Rarity accent
        const accent = new Graphics();
        accent.rect(0, 0, 4, h);
        accent.fill({ color: isUnlocked ? rarityColor : 0x333333 });
        card.addChild(accent);

        // Icon
        const icon = new Text({
            text: (ach.hidden && !isUnlocked) ? '❓' : ach.icon,
            style: { fontSize: 28, fill: isUnlocked ? 0xffffff : 0x444444 }
        });
        icon.position.set(18, h / 2 - 16);
        card.addChild(icon);

        // Name
        const name = new Text({
            text: (ach.hidden && !isUnlocked) ? '???' : ach.name,
            style: {
                fill: isUnlocked ? rarityColor : 0x666666,
                fontSize: 16,
                fontWeight: 'bold'
            }
        });
        name.position.set(60, 10);
        card.addChild(name);

        // Description
        const desc = new Text({
            text: (ach.hidden && !isUnlocked) ? 'Hidden achievement' : ach.description,
            style: { fill: isUnlocked ? 0xaaaaaa : 0x444444, fontSize: 12 }
        });
        desc.position.set(60, 32);
        card.addChild(desc);

        // Rarity badge
        const badge = new Text({
            text: AchievementManager.getRarityLabel(ach.rarity).toUpperCase(),
            style: { fill: rarityColor, fontSize: 10, fontWeight: 'bold' }
        });
        badge.anchor.set(1, 0);
        badge.position.set(w - 15, 10);
        card.addChild(badge);

        // Progress bar for progressive achievements
        if (ach.maxProgress && !isUnlocked) {
            const progress = ach.progress || 0;
            const barW = 150;
            const barX = w - barW - 15;
            const barY = h - 18;

            const barBg = new Graphics();
            barBg.roundRect(barX, barY, barW, 8, 4);
            barBg.fill({ color: 0x222222 });
            card.addChild(barBg);

            const fillW = Math.max(2, barW * progress);
            const barFill = new Graphics();
            barFill.roundRect(barX, barY, fillW, 8, 4);
            barFill.fill({ color: rarityColor, alpha: 0.8 });
            card.addChild(barFill);

            const progText = new Text({
                text: `${Math.floor(progress * ach.maxProgress)}/${ach.maxProgress}`,
                style: { fill: 0x888888, fontSize: 10 }
            });
            progText.anchor.set(1, 1);
            progText.position.set(barX - 5, barY + 8);
            card.addChild(progText);
        }

        // Checkmark for unlocked
        if (isUnlocked) {
            const check = new Text({
                text: '✅',
                style: { fontSize: 18 }
            });
            check.anchor.set(1, 0.5);
            check.position.set(w - 15, h / 2);
            card.addChild(check);
        }

        return card;
    }

    protected onUpdate(dt: number): void {
        // Tab switching
        if (InputManager.isLeftPressed()) {
            this.selectedTab = Math.max(0, this.selectedTab - 1);
            this.createTabs();
            this.renderAchievements(CATEGORIES[this.selectedTab]);
        } else if (InputManager.isRightPressed()) {
            this.selectedTab = Math.min(CATEGORIES.length - 1, this.selectedTab + 1);
            this.createTabs();
            this.renderAchievements(CATEGORIES[this.selectedTab]);
        }

        // Scrolling
        if (InputManager.isUpHeld()) {
            this.scrollY = Math.max(0, this.scrollY - 300 * dt);
        } else if (InputManager.isDownHeld()) {
            this.scrollY = Math.min(this.maxScrollY, this.scrollY + 300 * dt);
        }
        this.listContainer.y = 135 - this.scrollY;

        // Exit
        if (InputManager.isCancelPressed()) {
            StateManager.pop();
        }
    }
}
