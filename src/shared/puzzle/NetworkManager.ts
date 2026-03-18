import { io, Socket } from 'socket.io-client';
import { EventEmitter } from 'eventemitter3';
import { GameLogic } from './GameLogic';

export interface LobbyRoom {
    id: string;
    name: string;
    players: number;
    maxPlayers: number;
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
        this.socket = io(url);
        this.setupHandlers();
    }

    public sendFrame(state: any): void {
        if (this.socket && this.socket.connected) {
            this.socket.emit('frame', state);
        }
    }

    public reportScore(data: { mode: string, name: string, score: number, lines: number, time: number }): void {
        if (this.socket && this.socket.connected) {
            this.socket.emit('reportScore', data);
        }
    }

    private setupHandlers(): void {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            console.log('Connected to game server');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from game server');
        });

        this.socket.on('garbage', (amount: number) => {
            if (this.game) this.game.gotVSGarbageFromOtherPlayer(amount);
        });

        this.socket.on('opponentFrame', (state: any) => {
            if (typeof state === 'string') {
                try {
                    state = JSON.parse(state);
                } catch (e) {
                    console.error("Failed to parse opponent frame state", e);
                    return;
                }
            }
            this.emit('opponentFrame', state);
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

    public createRoom(name: string): void {
        if (this.socket) {
            this.socket.emit('createRoom', name);
        }
    }

    public joinRoom(id: string): void {
        if (this.socket) {
            this.socket.emit('joinRoom', id);
        }
    }

    public disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
}
