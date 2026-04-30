/**
 * FriendManager — tracks online friends in the MMO world.
 *
 * Ported from okgame C++ Engine/Engine/rpg/FriendManager.
 */
import { FriendCharacter, FriendCharacterConfig } from './FriendCharacter';

export class FriendManager {
    private friends: Map<string, FriendCharacter> = new Map();

    addFriend(userId: string, config?: FriendCharacterConfig): FriendCharacter {
        let friend = this.friends.get(userId);
        if (!friend) {
            friend = new FriendCharacter({ ...config, userId });
            this.friends.set(userId, friend);
        }
        friend.setOnline(true);
        return friend;
    }

    removeFriend(userId: string): void {
        const friend = this.friends.get(userId);
        if (friend) {
            friend.setOnline(false);
        }
    }

    getFriend(userId: string): FriendCharacter | undefined {
        return this.friends.get(userId);
    }

    getOnlineFriends(): FriendCharacter[] {
        return Array.from(this.friends.values()).filter(f => f.isOnline());
    }

    getAllFriends(): FriendCharacter[] {
        return Array.from(this.friends.values());
    }

    update(): void {
        // Update friend positions from network
    }

    cleanup(): void {
        for (const friend of this.friends.values()) {
            friend.setOnline(false);
        }
    }
}
