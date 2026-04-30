/**
 * StuffMenu — main in-game menu with tabs for Items, Friends, Status, Logs, Settings, etc.
 *
 * Ported from okgame C++ Engine/rpg/gui/stuffMenu/StuffMenu.
 */
import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { MenuPanel } from './MenuPanel';
import { SubPanel } from './SubPanel';

export interface StuffMenuTab {
    name: string;
    label: string;
    panel: SubPanel;
}

export class StuffMenu extends MenuPanel {
    private tabs: StuffMenuTab[] = [];
    private activeTab: StuffMenuTab | null = null;
    private tabButtons: Container[] = [];
    private panelContainer: Container;

    subPanelWidthPercent = 0.80;
    subPanelHeightPercent = 0.86;

    constructor(width: number, height: number) {
        super(width, height);

        this.panelContainer = new Container();
        this.container.addChild(this.panelContainer);
    }

    // ============================================================
    // Setup
    // ============================================================

    addTab(name: string, label: string, panel: SubPanel): void {
        const tab: StuffMenuTab = { name, label, panel };
        this.tabs.push(tab);
        this.panelContainer.addChild(panel.getContainer());

        // Create tab button
        const btnContainer = new Container();
        const btnBg = new Graphics();
        btnBg.roundRect(0, 0, 80, 24, 3);
        btnBg.fill({ color: 0x1a1a3e, alpha: 0.9 });
        btnBg.stroke({ color: 0x445588, width: 1 });

        const style = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 11,
            fill: 0xaaaacc,
        });
        const btnText = new Text({ text: label, style });
        btnText.anchor.set(0.5);
        btnText.position.set(40, 12);

        btnContainer.addChild(btnBg);
        btnContainer.addChild(btnText);
        btnContainer.interactive = true;
        btnContainer.on('pointerdown', () => this.openTab(name));

        const tabIndex = this.tabs.length - 1;
        btnContainer.position.set(10 + tabIndex * 85, 8);

        this.container.addChild(btnContainer);
        this.tabButtons.push(btnContainer);
    }

    // ============================================================
    // Tab Management
    // ============================================================

    openTab(name: string): void {
        for (const tab of this.tabs) {
            tab.panel.setVisible(tab.name === name);
        }
        this.activeTab = this.tabs.find(t => t.name === name) ?? null;
    }

    setActivated(b: boolean): void {
        super.setActivated(b);
        if (!b) {
            this.setAllInvisible();
        } else if (this.activeTab) {
            this.openTab(this.activeTab.name);
        } else if (this.tabs.length > 0) {
            this.openTab(this.tabs[0].name);
        }
    }

    setAllInvisible(): void {
        for (const tab of this.tabs) {
            tab.panel.setVisible(false);
        }
        this.activeTab = null;
    }

    // ============================================================
    // Sub-menu shortcuts
    // ============================================================

    openSubMenu(name?: string): void {
        if (name) {
            this.openTab(name);
        }
        this.setActivated(true);
    }

    openItemsMenu(): void { this.openSubMenu('items'); }
    openFriendsMenu(): void { this.openSubMenu('friends'); }
    openStatusMenu(): void { this.openSubMenu('status'); }
    openLogsMenu(): void { this.openSubMenu('logs'); }
    openSettingsMenu(): void { this.openSubMenu('settings'); }
    openControlsMenu(): void { this.openSubMenu('controls'); }

    // ============================================================
    // Update
    // ============================================================

    override update(dt: number): void {
        super.update(dt);
        for (const tab of this.tabs) {
            if (tab.panel.getVisible()) {
                tab.panel.update(dt);
            }
        }
    }

    // ============================================================
    // Access
    // ============================================================

    getTab(name: string): SubPanel | undefined {
        return this.tabs.find(t => t.name === name)?.panel;
    }

    getActiveTab(): string | null {
        return this.activeTab?.name ?? null;
    }
}
