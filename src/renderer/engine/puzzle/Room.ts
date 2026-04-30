/**
 * Room — multiplayer game room with players, game settings, and state management.
 *
 * Ported from okgame C++ Puzzle/Room.
 */
import type { GameTypeDefinition } from './PuzzleTypes';
import { GameSequence } from './GameSequence';
import { GameState, GameLogic } from './GameLogic';

export interface RoomPlayer {
    userID: number;
    name: string;
    isHost: boolean;
    isReady: boolean;
    team: number;
    score: number;
    connectionState: 'connected' | 'disconnected' | 'spectating';
}

export enum RoomState {
    LOBBY = 0,
    COUNTDOWN = 1,
    PLAYING = 2,
    FINISHED = 3,
}

export class Room {
    roomID = '';
    name = 'Game Room';
    password = '';
    maxPlayers = 2;
    isRanked = false;
    isPublic = true;

    state: RoomState = RoomState.LOBBY;
    hostUserID = 0;

    players: RoomPlayer[] = [];
    gameLogic: GameLogic | null = null;
    gameSequence: GameSequence | null = null;
    currentGameType: GameTypeDefinition | null = null;

    countdownTimer = 0;
    countdownDuration = 3000; // 3 seconds

    // Results
    results: Map<number, { rank: number; score: number; linesCleared: number }> = new Map();

    constructor(roomID?: string) {
        this.roomID = roomID ?? crypto.randomUUID();
    }

    // ============================================================
    // Player Management
    // ============================================================

    addPlayer(player: RoomPlayer): boolean {
        if (this.players.length >= this.maxPlayers) return false;
        if (this.players.some(p => p.userID === player.userID)) return false;

        // First player is host
        if (this.players.length === 0) {
            player.isHost = true;
            this.hostUserID = player.userID;
        }

        this.players.push(player);
        return true;
    }

    removePlayer(userID: number): void {
        const idx = this.players.findIndex(p => p.userID === userID);
        if (idx === -1) return;

        this.players.splice(idx, 1);

        // Transfer host
        if (userID === this.hostUserID && this.players.length > 0) {
            this.players[0].isHost = true;
            this.hostUserID = this.players[0].userID;
        }
    }

    getPlayer(userID: number): RoomPlayer | undefined {
        return this.players.find(p => p.userID === userID);
    }

    getPlayerCount(): number {
        return this.players.length;
    }

    isPlayerHost(userID: number): boolean {
        return userID === this.hostUserID;
    }

    areAllPlayersReady(): boolean {
        return this.players.length > 0 && this.players.every(p => p.isReady);
    }

    setPlayerReady(userID: number, ready: boolean): void {
        const player = this.getPlayer(userID);
        if (player) player.isReady = ready;
    }

    // ============================================================
    // Game Lifecycle
    // ============================================================

    startCountdown(): boolean {
        if (this.state !== RoomState.LOBBY) return false;
        if (!this.areAllPlayersReady()) return false;

        this.state = RoomState.COUNTDOWN;
        this.countdownTimer = this.countdownDuration;
        return true;
    }

    startGame(gameType: GameTypeDefinition): void {
        this.currentGameType = gameType;
        this.gameLogic = new GameLogic(gameType);
        this.gameLogic.start();
        this.state = RoomState.PLAYING;

        // Reset scores
        for (const player of this.players) {
            player.score = 0;
        }
    }

    endGame(): void {
        this.state = RoomState.FINISHED;

        // Calculate results
        const sorted = [...this.players].sort((a, b) => b.score - a.score);
        sorted.forEach((player, i) => {
            this.results.set(player.userID, {
                rank: i + 1,
                score: player.score,
                linesCleared: 0,
            });
        });
    }

    returnToLobby(): void {
        this.state = RoomState.LOBBY;
        this.gameLogic = null;
        for (const player of this.players) {
            player.isReady = false;
        }
    }

    // ============================================================
    // Update
    // ============================================================

    update(dt: number): void {
        if (this.state === RoomState.COUNTDOWN) {
            this.countdownTimer -= dt;
            if (this.countdownTimer <= 0) {
                if (this.currentGameType) {
                    this.startGame(this.currentGameType);
                } else {
                    this.state = RoomState.LOBBY;
                }
            }
        }

        if (this.state === RoomState.PLAYING && this.gameLogic) {
            this.gameLogic.update(dt);

            if (this.gameLogic.state === GameState.GAMEOVER) {
                this.endGame();
            }
        }
    }

    // ============================================================
    // Game Actions
    // ============================================================

    playerMove(userID: number, direction: string): void {
        if (this.state !== RoomState.PLAYING || !this.gameLogic) return;
        // In a real implementation, each player would have their own GameLogic
        void userID;
        void direction;
    }

    // ============================================================
    // Serialization
    // ============================================================

    static fromJSON(data: Record<string, unknown>): Room {
        const room = new Room(data.roomID as string | undefined);
        room.name = (data.name as string) ?? 'Game Room';
        room.maxPlayers = (data.maxPlayers as number) ?? 2;
        room.isRanked = (data.isRanked as boolean) ?? false;
        room.isPublic = (data.isPublic as boolean) ?? true;
        room.hostUserID = (data.hostUserID as number) ?? 0;
        return room;
    }

    toJSON(): Record<string, unknown> {
        return {
            roomID: this.roomID,
            name: this.name,
            maxPlayers: this.maxPlayers,
            isRanked: this.isRanked,
            isPublic: this.isPublic,
            state: this.state,
            hostUserID: this.hostUserID,
            players: this.players,
        };
    }
}
