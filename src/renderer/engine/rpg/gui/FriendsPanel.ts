/**
 * FriendsPanel — displays online friends list with status indicators.
 *
 * Ported from okgame C++ Engine/rpg/gui/stuffMenu/subMenus/FriendsPanel.
 */
import { Container, Text, TextStyle, Graphics } from 'pixi.js';
import { SubPanel } from './SubPanel';
import type { FriendCharacter } from '../FriendCharacter';

export class FriendsPanel extends SubPanel {
    private friends: FriendCharacter[] = [];

    setFriends(friends: FriendCharacter[]): void {
        this.friends = friends;
        this.refresh();
    }

    private refresh(): void {
        this.container.removeChildren();

        const headerStyle = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 16,
            fill: 0xffff88,
            fontWeight: 'bold',
        });

        const nameStyle = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 12,
            fill: 0xcccccc,
        });

        const header = new Text({ text: `Friends (${this.friends.length})`, style: headerStyle });
        header.position.set(10, 10);
        this.container.addChild(header);

        let y = 40;

        for (const friend of this.friends) {
            const row = new Container();

            // Online indicator
            const dot = new Graphics();
            dot.circle(16, y + 8, 4);
            dot.fill({ color: friend.isOnline() ? 0x44ff88 : 0x666666 });
            this.container.addChild(dot);

            // Name
            const name = new Text({ text: friend.name, style: nameStyle });
            name.position.set(28, y);
            this.container.addChild(name);

            // Status
            const online = friend.isOnline();
            const statusStyle = new TextStyle({
                fontFamily: 'Arial, sans-serif',
                fontSize: 11,
                fill: online ? 0x44ff88 : 0x666666,
            });
            const status = new Text({
                text: online ? '● Online' : '○ Offline',
                style: statusStyle,
            });
            status.anchor.set(1, 0);
            status.position.set(500, y);
            this.container.addChild(status);

            y += 24;
        }

        if (this.friends.length === 0) {
            const empty = new Text({
                text: 'No friends yet.',
                style: new TextStyle({
                    fontFamily: 'Arial, sans-serif',
                    fontSize: 13,
                    fill: 0x888888,
                }),
            });
            empty.position.set(10, 50);
            this.container.addChild(empty);
        }
    }

    override update(dt: number): void {
        void dt;
    }
}
