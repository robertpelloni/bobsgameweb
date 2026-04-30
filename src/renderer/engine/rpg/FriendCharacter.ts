/**
 * FriendCharacter — represents another player in the MMO world.
 *
 * Ported from okgame C++ Engine/Engine/rpg/FriendCharacter.
 */
import { Character, CharacterConfig } from '../entity/Character';

export interface FriendCharacterConfig extends CharacterConfig {
    userId?: string;
    online?: boolean;
}

export class FriendCharacter extends Character {
    public userId: string;
    public online: boolean;

    constructor(config?: FriendCharacterConfig) {
        super(config);
        this.userId = config?.userId ?? '';
        this.online = config?.online ?? false;
    }

    isOnline(): boolean {
        return this.online;
    }

    setOnline(b: boolean): void {
        this.online = b;
    }
}
