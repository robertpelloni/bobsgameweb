/**
 * NetworkManager — WebSocket-based game networking using Socket.io.
 *
 * Ported from okgame C++ Engine/network/NetworkManager, adapted for web.
 * Handles room management, game state sync, chat, and scoring.
 */
import { io, type Socket } from 'socket.io-client';

export interface LobbyRoom {
    id: string;
    name: string;
    players: number;
    maxPlayers: number;
    hasPassword: boolean;
    gameMode: string;
    startLevel: number;
    isTournament: boolean;
    state: string;
}

export type EventCallback = (data: unknown) => void;

export class NetworkManager {
    private socket: Socket | null = null;
    private callbacks: Map<string, EventCallback[]> = new Map();
    private connected = false;
    private reconnecting = false;
    private serverURL = '';

    // Room state
    private currentRoomID: string | null = null;
    private rooms: LobbyRoom[] = [];

    constructor() {}

    // ============================================================
    // Connection
    // ============================================================

    connect(url: string): void {
        this.serverURL = url;
        this.socket = io(url, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
        });

        this.socket.on('connect', () => {
            this.connected = true;
            this.reconnecting = false;
            this.emit('connected', { socketID: this.socket?.id });
        });

        this.socket.on('disconnect', () => {
            this.connected = false;
            this.emit('disconnected', {});
        });

        this.socket.on('reconnecting', () => {
            this.reconnecting = true;
            this.emit('reconnecting', {});
        });

        // Set up event handlers
        this.socket.on('room_list', (data: LobbyRoom[]) => {
            this.rooms = data;
            this.emit('room_list', data);
        });

        this.socket.on('room_joined', (data: { roomID: string }) => {
            this.currentRoomID = data.roomID;
            this.emit('room_joined', data);
        });

        this.socket.on('room_left', () => {
            this.currentRoomID = null;
            this.emit('room_left', {});
        });

        this.socket.on('game_state', (data: unknown) => {
            this.emit('game_state', data);
        });

        this.socket.on('chat', (data: { from: string; message: string }) => {
            this.emit('chat', data);
        });

        this.socket.on('player_joined', (data: unknown) => {
            this.emit('player_joined', data);
        });

        this.socket.on('player_left', (data: unknown) => {
            this.emit('player_left', data);
        });

        this.socket.on('game_start', (data: unknown) => {
            this.emit('game_start', data);
        });

        this.socket.on('game_end', (data: unknown) => {
            this.emit('game_end', data);
        });

        this.socket.on('error', (err: unknown) => {
            this.emit('error', err);
        });
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.connected = false;
        this.currentRoomID = null;
    }

    // ============================================================
    // Room Management
    // ============================================================

    listRooms(): void {
        this.socket?.emit('list_rooms');
    }

    createRoom(name: string, options: {
        isPrivate?: boolean;
        password?: string;
        gameMode?: string;
        startLevel?: number;
    } = {}): void {
        this.socket?.emit('create_room', {
            name,
            isPrivate: options.isPrivate ?? false,
            password: options.password ?? '',
            gameMode: options.gameMode ?? 'marathon',
            startLevel: options.startLevel ?? 1,
        });
    }

    joinRoom(roomID: string, password = '', spectator = false): void {
        this.socket?.emit('join_room', { roomID, password, spectator });
    }

    leaveRoom(): void {
        this.socket?.emit('leave_room');
        this.currentRoomID = null;
    }

    setReady(ready: boolean): void {
        this.socket?.emit('set_ready', { ready });
    }

    // ============================================================
    // Game Actions
    // ============================================================

    sendFrame(stateJSON: string): void {
        this.socket?.emit('game_frame', { state: stateJSON });
    }

    sendChat(message: string): void {
        this.socket?.emit('chat', { message });
    }

    reportScore(mode: string, score: number, lines: number, time: number): void {
        this.socket?.emit('report_score', { mode, score, lines, time });
    }

    // ============================================================
    // Event System
    // ============================================================

    on(event: string, callback: EventCallback): void {
        if (!this.callbacks.has(event)) {
            this.callbacks.set(event, []);
        }
        this.callbacks.get(event)!.push(callback);
    }

    off(event: string, callback: EventCallback): void {
        const cbs = this.callbacks.get(event);
        if (cbs) {
            const idx = cbs.indexOf(callback);
            if (idx >= 0) cbs.splice(idx, 1);
        }
    }

    private emit(event: string, data: unknown): void {
        const cbs = this.callbacks.get(event);
        if (cbs) {
            for (const cb of cbs) cb(data);
        }
    }

    // ============================================================
    // Status
    // ============================================================

    isConnected(): boolean { return this.connected; }
    isReconnecting(): boolean { return this.reconnecting; }
    getCurrentRoomID(): string | null { return this.currentRoomID; }
    getRooms(): LobbyRoom[] { return this.rooms; }
    getServerURL(): string { return this.serverURL; }
    getSocketID(): string | undefined { return this.socket?.id; }
}
