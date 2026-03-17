import { io, Socket } from 'socket.io-client';
import { GameLogic } from './GameLogic';

export class NetworkManager {
    private socket: Socket | null = null;
    private game: GameLogic;

    constructor(game: GameLogic) {
        this.game = game;
    }

    public connect(url: string): void {
        this.socket = io(url);
        this.setupHandlers();
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
            this.game.gotVSGarbageFromOtherPlayer(amount);
        });

        this.game.on('garbageSent', (amount: number) => {
            if (this.socket && this.socket.connected) {
                this.socket.emit('garbage', amount);
            }
        });
    }

    public disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
}
