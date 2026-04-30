/**
 * GUIManager — central manager for all game UI: menus, store, notifications, lobby.
 *
 * Ported from okgame C++ Engine/rpg/gui/GUIManager.
 */
import { Container } from 'pixi.js';
import { StuffMenu } from './StuffMenu';
import { GameStore } from './GameStore';
import { StatusBar } from './StatusBar';
import { ItemsPanel } from './ItemsPanel';
import { StatusPanel } from './StatusPanel';
import { FriendsPanel } from './FriendsPanel';
import { SettingsPanel } from './SettingsPanel';
import { LogsPanel } from './LogsPanel';
import { NotificationManager } from './NotificationManager';
import { Notification } from './Notification';

export class GUIManager {
    private container: Container;
    private width: number;
    private height: number;

    readonly stuffMenu: StuffMenu;
    readonly gameStore: GameStore;
    readonly statusBar: StatusBar;
    readonly notificationManager: NotificationManager;

    // Sub-panels
    readonly itemsPanel: ItemsPanel;
    readonly statusPanel: StatusPanel;
    readonly friendsPanel: FriendsPanel;
    readonly settingsPanel: SettingsPanel;
    readonly logsPanel: LogsPanel;

    private lightTheme = false;
    private allMenusEnabled = true;

    constructor(container: Container, width: number, height: number) {
        this.container = container;
        this.width = width;
        this.height = height;

        // Status bar at bottom
        this.statusBar = new StatusBar({ width });
        this.statusBar.setPosition(0, height - 32);
        container.addChild(this.statusBar.getContainer());

        // Notification container
        const notifContainer = new Container();
        notifContainer.position.set(width - 320, height - 64);
        container.addChild(notifContainer);
        this.notificationManager = new NotificationManager(notifContainer);

        // Stuff menu
        this.stuffMenu = new StuffMenu(width, height);
        container.addChild(this.stuffMenu.getContainer());

        // Sub-panels
        this.itemsPanel = new ItemsPanel();
        this.statusPanel = new StatusPanel();
        this.friendsPanel = new FriendsPanel();
        this.settingsPanel = new SettingsPanel();
        this.logsPanel = new LogsPanel();

        this.stuffMenu.addTab('items', 'Items', this.itemsPanel);
        this.stuffMenu.addTab('status', 'Status', this.statusPanel);
        this.stuffMenu.addTab('friends', 'Friends', this.friendsPanel);
        this.stuffMenu.addTab('logs', 'Logs', this.logsPanel);
        this.stuffMenu.addTab('settings', 'Settings', this.settingsPanel);

        // Game store
        this.gameStore = new GameStore(width, height);
        container.addChild(this.gameStore.getContainer());
    }

    // ============================================================
    // Menu Management
    // ============================================================

    openStuffMenu(): void {
        this.closeAll();
        this.stuffMenu.setActivated(true);
    }

    openGameStore(): void {
        this.closeAll();
        this.gameStore.setActivated(true);
    }

    openItemsMenu(): void { this.openStuffMenu(); this.stuffMenu.openItemsMenu(); }
    openFriendsMenu(): void { this.openStuffMenu(); this.stuffMenu.openFriendsMenu(); }
    openStatusMenu(): void { this.openStuffMenu(); this.stuffMenu.openStatusMenu(); }
    openLogsMenu(): void { this.openStuffMenu(); this.stuffMenu.openLogsMenu(); }
    openSettingsMenu(): void { this.openStuffMenu(); this.stuffMenu.openSettingsMenu(); }

    closeAll(): void {
        this.stuffMenu.setActivated(false);
        this.gameStore.setActivated(false);
    }

    enableAllMenus(): void {
        this.allMenusEnabled = true;
    }

    disableAllMenus(): void {
        this.allMenusEnabled = false;
        this.closeAll();
    }

    // ============================================================
    // Theme
    // ============================================================

    setDarkTheme(): void {
        this.lightTheme = false;
        this.statusBar.setDarkTheme();
    }

    setLightTheme(): void {
        this.lightTheme = true;
        this.statusBar.setLightTheme();
    }

    // ============================================================
    // Notifications
    // ============================================================

    addNotification(text: string): void {
        const notif = new Notification(text, 300);
        this.notificationManager.add(notif);
    }

    // ============================================================
    // Update
    // ============================================================

    update(dt: number): void {
        this.statusBar.update(dt);
        this.notificationManager.update(dt);

        if (this.stuffMenu.getIsActivated()) this.stuffMenu.update(dt);
        if (this.gameStore.getIsActivated()) this.gameStore.update(dt);
    }

    // ============================================================
    // Resize
    // ============================================================

    resize(width: number, height: number): void {
        this.width = width;
        this.height = height;
        this.statusBar.setPosition(0, height - 32);
        this.statusBar.resize(width);
    }

    // ============================================================
    // Access
    // ============================================================

    getContainer(): Container { return this.container; }

    isAnyMenuOpen(): boolean {
        return this.stuffMenu.getIsActivated() || this.gameStore.getIsActivated();
    }

    destroy(): void {
        this.container.destroy({ children: true });
    }
}
