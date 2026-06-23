import { io, Socket } from 'socket.io-client';
import { EventEmitter } from 'eventemitter3';
import pako from 'pako';
import { GameLogic } from './GameLogic';
import type { AchievementIdentity } from '../../renderer/data/AchievementIdentity';

export interface LobbyRoom {
    id: string;
    name: string;
    players: number;
    maxPlayers: number;
    hasPassword?: boolean;
    gameMode?: string;
    startLevel?: number;
    isTournament?: boolean;
    state?: string;
}

export class NetworkManager extends EventEmitter {
    private socket: Socket | null = null;
    private game: GameLogic | null = null;
    private gameListener: ((amount: number) => void) | null = null;

    constructor(game: GameLogic | null = null) {
        super();
        if (game) this.setGame(game);
    }

    public setGame(game: GameLogic | null): void {
        // Remove old listener
        if (this.game && this.gameListener) {
            this.game.off('garbageSent', this.gameListener);
        }

        this.game = game;

        if (this.game) {
            this.gameListener = (amount: number) => {
                if (this.socket && this.socket.connected) {
                    this.socket.emit('garbage', amount);
                }
            };
            this.game.on('garbageSent', this.gameListener);
        }
    }

    public connect(url: string): void {
        if (this.socket) return;
        this.socket = io(url, {
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            randomizationFactor: 0.5
        });
        this.setupHandlers();
    }

    public sendFrame(state: any): void {
        if (this.socket && this.socket.connected) {
            this.socket.emit('frame', state);
        }
    }

    public reportScore(data: { mode: string, name: string, score: number, lines: number, time: number, replay?: string }): void {
        if (this.socket && this.socket.connected) {
            this.socket.emit('reportScore', data);
        }
    }

    public sendChat(message: string, name: string): void {
        if (this.socket && this.socket.connected) {
            this.socket.emit('chatMessage', { message, name });
        }
    }

    public setName(name: string): void {
        if (this.socket && this.socket.connected) {
            this.socket.emit('setName', name);
        }
    }

    private setupHandlers(): void {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            console.log('Connected to game server');
            this.emit('connected');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from game server');
            this.emit('disconnected');
        });

        // Forward lobby/room events from the socket to the EventEmitter
        // so that LobbyScene and other consumers can listen for them.
        this.socket.on('roomCreated', (data: any) => {
            this.emit('roomCreated', data);
        });

        this.socket.on('joinedRoom', (data: any) => {
            this.emit('joinedRoom', data);
        });

        this.socket.on('roomUpdated', (data: any) => {
            this.emit('roomUpdated', data);
        });

        this.socket.on("remotePlayerMove", (data: any) => {
            // Handle compressed payloads
            if (data && data.c && data.d) {
                try {
                    const decompressed = pako.inflate(data.d, { to: 'string' });
                    data = JSON.parse(decompressed);
                } catch (e) {
                    console.error("Failed to decompress playerMove", e);
                    return;
                }
            }
            this.emit("remotePlayerMove", data);
        });

        this.socket.on('gameStart', (data: any) => {
            this.emit('gameStart', data);
        });

        this.socket.on('error', (msg: string) => {
            this.emit('error', msg);
        });

        this.socket.on('chatMessage', (data: any) => {
            this.emit('chatMessage', data);
        });

        this.socket.on('garbage', (amount: number) => {
            if (this.game) this.game.gotVSGarbageFromOtherPlayer(amount);
        });

        this.socket.on('opponentFrame', (data: any) => {
            if (data && data.state && typeof data.state === 'string') {
                try {
                    data.state = JSON.parse(data.state);
                } catch (e) {
                    console.error("Failed to parse opponent frame state", e);
                    return;
                }
            }
            this.emit('opponentFrame', data);
        });
    }

    public listRooms(callback: (rooms: LobbyRoom[]) => void): void {
        if (this.socket) {
            this.socket.once('roomList', callback);
            this.socket.emit('listRooms');
        }
    }

    public getLeaderboard(mode: string, callback: (data: { mode: string, scores: any[] }) => void): void {
        if (this.socket) {
            this.socket.once('leaderboard', callback);
            this.socket.emit('getLeaderboard', mode);
        }
    }

    public getTournamentBracket(roomId: string, callback: (data: any) => void): void {
        if (this.socket) {
            this.socket.once('tournamentBracket', callback);
            this.socket.emit('getTournamentBracket', roomId);
        }
    }

    public loadRPGDatabase(callback: (data: any) => void): void {
        if (this.socket) {
            this.socket.once('rpgDatabaseLoaded', callback);
            this.socket.emit('loadRPGDatabase');
        }
    }

    public saveRPGDatabase(db: any, callback: (data: any) => void): void {
        if (this.socket) {
            this.socket.once('rpgDatabaseSaved', callback);
            this.socket.emit('saveRPGDatabase', db);
        }
    }

    public loadAchievementData(identity: string | AchievementIdentity, callback: (data: any) => void): void {
        if (this.socket) {
            this.socket.once('achievementDataLoaded', callback);
            this.socket.emit('loadAchievementData', identity);
        }
    }

    public saveAchievementData(identity: string | AchievementIdentity, snapshot: any, callback?: (data: any) => void): void {
        if (this.socket) {
            if (callback) {
                this.socket.once('achievementDataSaved', callback);
            }
            this.socket.emit('saveAchievementData', { identity, snapshot });
        }
    }

    public createRoom(options: { name: string, isPrivate?: boolean, password?: string, gameMode?: string, startLevel?: number, isTournament?: boolean }): void {
        if (this.socket) {
            this.socket.emit('createRoom', options);
        }
    }

    public joinRoom(data: string | { id: string, password?: string, spectator?: boolean }): void {
        if (this.socket) {
            this.socket.emit('joinRoom', data);
        }
    }

    public disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    public get connected(): boolean {
        return this.socket?.connected || false;
    }

    public emit<T extends string | symbol>(event: T, ...args: any[]): boolean {
        if (this.socket && typeof event === 'string') {
            this.socket.emit(event, ...args);
            return true;
        }
        return super.emit(event, ...args);
    }
}
