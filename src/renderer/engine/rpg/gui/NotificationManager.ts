/**
 * NotificationManager — manages status bar notifications (fade-in, progress, scroll, fade-out).
 *
 * Ported from okgame C++ Engine/rpg/gui/statusbar/NotificationManager.
 */
import { Container } from 'pixi.js';
import { Notification } from './Notification';

export class NotificationManager {
    private notifications: Notification[] = [];
    private container: Container;

    constructor(container: Container) {
        this.container = container;
    }

    add(notification: Notification): void {
        this.notifications.push(notification);
        this.container.addChild(notification.getContainer());
        this.layout();
    }

    remove(notification: Notification): void {
        const idx = this.notifications.indexOf(notification);
        if (idx !== -1) {
            this.notifications.splice(idx, 1);
            this.container.removeChild(notification.getContainer());
            notification.destroy();
            this.layout();
        }
    }

    update(dt: number): void {
        for (let i = this.notifications.length - 1; i >= 0; i--) {
            const n = this.notifications[i];
            n.update(dt);
            if (n.isDone()) {
                this.remove(n);
            }
        }
    }

    private layout(): void {
        for (let i = 0; i < this.notifications.length; i++) {
            this.notifications[i].setPosition(0, i * 32);
        }
    }

    render(): void {
        // PixiJS handles rendering via container tree
    }

    clear(): void {
        for (const n of this.notifications) {
            this.container.removeChild(n.getContainer());
            n.destroy();
        }
        this.notifications = [];
    }

    getCount(): number {
        return this.notifications.length;
    }
}
