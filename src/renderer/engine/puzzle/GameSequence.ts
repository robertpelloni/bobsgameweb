/**
 * GameSequence — a sequence of puzzle game types with community features.
 *
 * Ported from okgame C++ Puzzle/GameSequence.
 */
import type { GameTypeDefinition } from '../puzzle/PuzzleTypes';

export class GameSequence {
    uuid = '';
    name = 'My New Game Sequence';
    description = 'This is an empty game sequence.';

    gameUUIDs: string[] = [];
    gameTypes: GameTypeDefinition[] = [];

    randomizeSequence = true;
    currentDifficultyName = 'Beginner';

    // Community
    downloaded = false;
    creatorUserID = 0;
    creatorUserName = '';
    dateCreated = 0;
    lastModified = 0;
    howManyTimesUpdated = 0;
    upVotes = 0;
    downVotes = 0;
    yourVote: 'none' | 'up' | 'down' = 'none';

    constructor(data?: Partial<GameSequence>) {
        if (data) Object.assign(this, data);
        if (!this.uuid) this.uuid = crypto.randomUUID();
    }

    // ============================================================
    // Game Management
    // ============================================================

    addGame(gameType: GameTypeDefinition): void {
        this.gameTypes.push(gameType);
        this.gameUUIDs.push(gameType.gameEnum);
    }

    removeGame(index: number): void {
        this.gameTypes.splice(index, 1);
        this.gameUUIDs.splice(index, 1);
    }

    getCurrentGame(): GameTypeDefinition | undefined {
        return this.gameTypes.length > 0 ? this.gameTypes[0] : undefined;
    }

    advanceToNextGame(): GameTypeDefinition | undefined {
        if (this.gameTypes.length === 0) return undefined;

        if (this.randomizeSequence) {
            // Pick random
            const idx = Math.floor(Math.random() * this.gameTypes.length);
            return this.gameTypes[idx];
        } else {
            // Sequential
            const current = this.gameTypes.shift()!;
            return current;
        }
    }

    getTotalGames(): number {
        return this.gameTypes.length;
    }

    // ============================================================
    // Serialization
    // ============================================================

    static fromJSON(data: Record<string, unknown>): GameSequence {
        return new GameSequence({
            uuid: (data.uuid as string) ?? crypto.randomUUID(),
            name: (data.name as string) ?? '',
            description: (data.description as string) ?? '',
            gameUUIDs: (data.gameUUIDs as string[]) ?? [],
            randomizeSequence: (data.randomizeSequence as boolean) ?? true,
            currentDifficultyName: (data.currentDifficultyName as string) ?? 'Beginner',
            creatorUserID: (data.creatorUserID as number) ?? 0,
            creatorUserName: (data.creatorUserName as string) ?? '',
            dateCreated: (data.dateCreated as number) ?? 0,
            lastModified: (data.lastModified as number) ?? 0,
            upVotes: (data.upVotes as number) ?? 0,
            downVotes: (data.downVotes as number) ?? 0,
        });
    }

    toJSON(): Record<string, unknown> {
        return {
            uuid: this.uuid,
            name: this.name,
            description: this.description,
            gameUUIDs: this.gameUUIDs,
            randomizeSequence: this.randomizeSequence,
            currentDifficultyName: this.currentDifficultyName,
            creatorUserID: this.creatorUserID,
            creatorUserName: this.creatorUserName,
            dateCreated: this.dateCreated,
            lastModified: this.lastModified,
            howManyTimesUpdated: this.howManyTimesUpdated,
            upVotes: this.upVotes,
            downVotes: this.downVotes,
            yourVote: this.yourVote,
        };
    }
}
