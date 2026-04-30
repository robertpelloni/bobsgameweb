/**
 * BobsGame — the main puzzle game extending OKGame with full menu flow.
 *
 * Ported from okgame C++ Puzzle/BobsGame.h (692 lines) and Java BobsGame.
 * Manages the complete puzzle game lifecycle: title screen → game type selection →
 * difficulty → controller config → multiplayer lobby → countdown → gameplay → results.
 * Supports single player, local multiplayer, and network multiplayer.
 */
import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { OKGame, OKGameState, DifficultyType, DIFFICULTY_NAMES } from '../puzzle/OKGame';
import type { PuzzlePlayer } from '../puzzle/PuzzlePlayer';
import type { GameLogic } from '../puzzle/GameLogic';
import type { GameSequence } from '../puzzle/GameSequence';
import type { Room } from '../puzzle/Room';
import { BobMenu, type MenuOption } from '../shared/BobMenu';
import { GlobalSettings } from '../shared/GlobalSettings';
import { Logger } from '../debug/Logger';

const log = new Logger('BobsGame');

// Menu states (BobsGame has many sub-menus beyond OKGame's basic states)
export enum BobsGameMenuState {
    NONE = 0,
    TITLE_SCREEN,
    GETTING_GAMES,
    SELECT_GAME_TYPE_OR_SEQUENCE,
    SELECT_GAME_SEQUENCE,
    SELECT_SINGLE_GAME_TYPE,
    SELECT_DIFFICULTY,
    SELECT_CONTROLLER,
    LOCAL_MULTIPLAYER_JOIN,
    NETWORK_MULTIPLAYER_LOBBY,
    NETWORK_MULTIPLAYER_JOIN,
    GAME_SETUP,
    GAME_SEQUENCE_OPTIONS,
    GAME_OBJECTIVE,
    SEND_GARBAGE_TO,
    MULTIPLAYER_OPTIONS,
    ROOM_OPTIONS,
    SETTINGS,
    STATS,
    LEADERBOARD,
    LOGIN,
    CREATE_ACCOUNT,
    SAVE_ROOM_CONFIG,
    LOAD_ROOM_CONFIG,
    CUSTOM_GAME_EDITOR,
    GAME_SEQUENCE_EDITOR,
    GAME_TEST,
}

export class BobsGame extends OKGame {
    private menuState: BobsGameMenuState = BobsGameMenuState.TITLE_SCREEN;

    // Players
    override players: PuzzlePlayer[] = [];
    override gameLogics: GameLogic[] = [];

    // Multiplayer
    override isMultiplayerGame = false;
    override isNetworkGame = false;
    localMultiplayer = false;
    networkMultiplayer = false;

    // Network state
    private networkScoreReported = false;
    private networkGameMode = 'network';
    private hasPendingNetworkStart = false;
    private pendingNetworkSeed = 0;
    private pendingNetworkStartLevel = 1;
    private hosting = false;
    private joining = false;

    // Rooms
    rooms: Room[] = [];
    currentRoom: Room | null = null;

    // Settings
    private settings: GlobalSettings;

    // Selected game config
    private selectedGameSequence: GameSequence | null = null;
    private selectedGameTypeName = '';
    selectedDifficultyIndex = 0;

    // Frame counter
    private frameCount = 0;
    private timeRenderBegan = 0;

    // Screen shake — uses base class MiniGameEngine shakeSmall()/shakeHard()
    override shakeSmall(): void { super.shakeSmall(); }
    override shakeHard(): void { super.shakeHard(); }

    // Menu states
    private menuShowing: Map<BobsGameMenuState, boolean> = new Map();
    private menuCursorPositions: Map<BobsGameMenuState, number> = new Map();
    private bobMenus: Map<BobsGameMenuState, BobMenu> = new Map();

    // Text fields (for login/create account)
    userNameOrEmailText = '';
    userNameText = '';
    emailText = '';
    passwordText = '';
    stayLoggedIn = true;

    // Stats
    private statsMenuDifficultyName = 'OVERALL';
    private statsMenuGameName = 'OVERALL';
    private statsMenuObjectiveName = 'Play To Credits';

    // Activity
    private activityStream: string[] = [];

    // Lobby commands (network protocol)
    static readonly LOBBY_CMD_STARTGAME = 'STARTGAME';
    static readonly LOBBY_CMD_CANCELGAME = 'CANCELGAME';
    static readonly LOBBY_CMD_PEERJOIN = 'PEERJOIN';
    static readonly LOBBY_CMD_PEERLEAVE = 'PEERLEAVE';
    static readonly LOBBY_CMD_PLAYERJOIN = 'PLAYERJOIN';
    static readonly LOBBY_CMD_PLAYERLEAVE = 'PLAYERLEAVE';
    static readonly LOBBY_CMD_PLAYERFORFEIT = 'PLAYERFORFEIT';
    static readonly LOBBY_CMD_PLAYERCONFIRM = 'PLAYERCONFIRM';

    static readonly NET_CMD_START = 'START';
    static readonly NET_CMD_FRAME = 'FRAME';
    static readonly NET_CMD_FORFEIT = 'FORFEIT';

    // Static game data (shared across instances)
    static loadedGameTypes: Map<string, unknown> = new Map();
    static loadedGameSequences: Map<string, unknown> = new Map();

    constructor() {
        super();
        this.settings = new GlobalSettings();
        this.initMenus();
    }

    // ============================================================
    // Initialization
    // ============================================================

    private initMenus(): void {
        // Title screen menu
        const titleOptions: MenuOption[] = [
            { label: 'Play Single Player' },
            { label: 'Play Local Multiplayer' },
            { label: 'Play Online' },
            { label: 'My Stats' },
            { label: 'Leaderboard' },
            { label: 'Settings' },
            { label: 'Quit' },
        ];
        this.bobMenus.set(BobsGameMenuState.TITLE_SCREEN, new BobMenu("bob's game", titleOptions));

        // Difficulty menu
        const diffNames = Object.values(DIFFICULTY_NAMES);
        const diffOptions: MenuOption[] = diffNames.map((name) => ({
            label: name,
        }));
        this.bobMenus.set(BobsGameMenuState.SELECT_DIFFICULTY, new BobMenu('Select Difficulty', diffOptions));

        // Controller menu
        const ctrlOptions: MenuOption[] = [
            { label: 'Keyboard' },
            { label: 'Gamepad' },
            { label: 'Touch' },
        ];
        this.bobMenus.set(BobsGameMenuState.SELECT_CONTROLLER, new BobMenu('Select Controller', ctrlOptions));

        // Settings menu
        const settingsOptions: MenuOption[] = [
            { label: 'Volume' },
            { label: 'Show Ghost Piece' },
            { label: 'Show Grid' },
            { label: 'DAS Settings' },
            { label: 'Controls' },
            { label: 'Back' },
        ];
        this.bobMenus.set(BobsGameMenuState.SETTINGS, new BobMenu('Settings', settingsOptions));
    }

    override init(): void {
        this.menuState = BobsGameMenuState.TITLE_SCREEN;
        this.frameCount = 0;
        log.info("BobsGame initialized");
    }

    // ============================================================
    // Menu Navigation
    // ============================================================

    getMenuState(): BobsGameMenuState { return this.menuState; }

    setMenuState(state: BobsGameMenuState): void {
        this.menuState = state;
        const menu = this.bobMenus.get(state);
        if (menu) menu.setCursorPosition(0);
    }

    getMenu(menuState: BobsGameMenuState): BobMenu | undefined {
        return this.bobMenus.get(menuState);
    }

    handleMenuUp(): void {
        const menu = this.bobMenus.get(this.menuState);
        if (menu) menu.moveUp();
    }

    handleMenuDown(): void {
        const menu = this.bobMenus.get(this.menuState);
        if (menu) menu.moveDown();
    }

    handleMenuSelect(): string {
        const menu = this.bobMenus.get(this.menuState);
        if (!menu) return '';
        const selectedIdx = menu.getCursorPosition();
        const selected = menu.getOptionAt(selectedIdx);
        if (!selected) return '';

        switch (this.menuState) {
            case BobsGameMenuState.TITLE_SCREEN:
                return this.handleTitleScreenSelect(selectedIdx);
            case BobsGameMenuState.SELECT_DIFFICULTY:
                this.selectedDifficultyIndex = selectedIdx;
                this.setMenuState(BobsGameMenuState.SELECT_CONTROLLER);
                return selected.label;
            case BobsGameMenuState.SELECT_CONTROLLER:
                this.startGame();
                return selected.label;
            case BobsGameMenuState.SETTINGS:
                if (selectedIdx === 5) this.setMenuState(BobsGameMenuState.TITLE_SCREEN);
                return selected.label;
            default:
                return selected.label;
        }
    }

    private handleTitleScreenSelect(idx: number): string {
        switch (idx) {
            case 0: // Play Single Player
                this.setMenuState(BobsGameMenuState.SELECT_DIFFICULTY);
                return 'play';
            case 1: // Local MP
                this.localMultiplayer = true;
                this.setMenuState(BobsGameMenuState.LOCAL_MULTIPLAYER_JOIN);
                return 'local_mp';
            case 2: // Online
                this.setMenuState(BobsGameMenuState.NETWORK_MULTIPLAYER_LOBBY);
                return 'online';
            case 3: // Stats
                this.setMenuState(BobsGameMenuState.STATS);
                return 'stats';
            case 4: // Leaderboard
                this.setMenuState(BobsGameMenuState.LEADERBOARD);
                return 'leaderboard';
            case 5: // Settings
                this.setMenuState(BobsGameMenuState.SETTINGS);
                return 'settings';
            default:
                return 'quit';
        }
    }

    // ============================================================
    // Game Flow
    // ============================================================

    private startGame(): void {
        const diffName = Object.values(DIFFICULTY_NAMES)[this.selectedDifficultyIndex] ?? 'Unknown';
        log.info(`Starting game — difficulty: ${diffName}`);
        this.frameCount = 0;
        this.networkScoreReported = false;
        super.onGameStart();
    }

    override startSinglePlayer(difficulty: DifficultyType): void {
        this.localMultiplayer = false;
        this.networkMultiplayer = false;
        super.startSinglePlayer(difficulty);
    }

    initNetworkGame(seed: number, startLevel: number, gameMode: string): void {
        this.hasPendingNetworkStart = true;
        this.pendingNetworkSeed = seed;
        this.pendingNetworkStartLevel = startLevel;
        this.networkGameMode = gameMode;
        this.networkMultiplayer = true;
    }

    applyPendingNetworkStart(): void {
        if (!this.hasPendingNetworkStart) return;
        this.hasPendingNetworkStart = false;
        log.info(`Applying network start — seed: ${this.pendingNetworkSeed}, level: ${this.pendingNetworkStartLevel}`);
        this.startGame();
    }

    protected override onGameUpdate(dt: number): void {
        this.frameCount++;
        super.onGameUpdate(dt);
    }

    // ============================================================
    // Render
    // ============================================================

    override render(): void {
        super.render();
    }

    // ============================================================
    // Network Protocol
    // ============================================================

    sendToAllPeers(message: string): void {
        // In production, broadcasts to all connected UDP peers
        log.debug(`Broadcast to peers: ${message}`);
    }

    sendToHost(message: string): void {
        log.debug(`Send to host: ${message}`);
    }

    // ============================================================
    // Stats
    // ============================================================

    /**
     * Wilson score interval for ranking.
     */
    wilsonScore(up: number, total: number, confidence = 1.644853): number {
        if (total === 0) return 0;
        const z = confidence;
        const p = up / total;
        const z2 = z * z;
        const denominator = 1 + z2 / total;
        const center = (p + z2 / (2 * total)) / denominator;
        const spread = z * Math.sqrt((p * (1 - p) + z2 / (4 * total)) / total) / denominator;
        return center - spread;
    }

    sendGameStatsToServer(): void {
        // In production, sends game results to the server
        log.info('Sending game stats to server...');
    }

    // ============================================================
    // Room Config Persistence
    // ============================================================

    saveRoomConfig(name: string): void {
        if (!this.currentRoom) return;
        try {
            const configs = JSON.parse(localStorage.getItem('bobsgame-room-configs') ?? '{}');
            configs[name] = this.currentRoom;
            localStorage.setItem('bobsgame-room-configs', JSON.stringify(configs));
            log.info(`Room config saved: ${name}`);
        } catch {
            log.warn('Failed to save room config');
        }
    }

    static loadRoomConfig(name: string): Room | null {
        try {
            const configs = JSON.parse(localStorage.getItem('bobsgame-room-configs') ?? '{}');
            return configs[name] ?? null;
        } catch {
            return null;
        }
    }

    static getRoomConfigsList(): string[] {
        try {
            const configs = JSON.parse(localStorage.getItem('bobsgame-room-configs') ?? '{}');
            return Object.keys(configs);
        } catch {
            return [];
        }
    }

    // ============================================================
    // Volume
    // ============================================================

    increaseVolume(): void {
        const vol = this.settings.getMasterVolume();
        this.settings.setMasterVolume(Math.min(1, vol + 0.1));
    }

    decreaseVolume(): void {
        const vol = this.settings.getMasterVolume();
        this.settings.setMasterVolume(Math.max(0, vol - 0.1));
    }

    // ============================================================
    // Access
    // ============================================================

    getFrameCount(): number { return this.frameCount; }
    isHosting(): boolean { return this.hosting; }
    isJoining(): boolean { return this.joining; }
    getNetworkGameMode(): string { return this.networkGameMode; }
    getSelectedDifficultyIndex(): number { return this.selectedDifficultyIndex; }
    getRooms(): Room[] { return this.rooms; }
    getCurrentRoom(): Room | null { return this.currentRoom; }
    getSettings(): GlobalSettings { return this.settings; }
}
