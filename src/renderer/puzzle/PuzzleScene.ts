import { Scene, SceneConfig } from '../state/Scene';
import { StateManager } from '../state/StateManager';
import { InputManager, Key } from '../input/InputManager';
import { AudioManager } from '../audio/AudioManager';
import { PuzzleGame, GameState, MovementType, networkManager } from './index';
import { PuzzleRenderer } from './PuzzleRenderer';
import { GameType } from './index';
import { PauseOverlay } from '../scenes/PauseOverlay';
import { GameMode } from '../data/HighScoreManager';

export interface PuzzleSceneConfig extends SceneConfig {
  gameType?: GameType;
  gameMode?: GameMode;
  startLevel?: number;
  seed?: number;
  multiplayer?: boolean;
}

export interface PuzzleKeyBindings {
  left: Key | string;
  right: Key | string;
  down: Key | string;
  hardDrop: Key | string;
  rotateCW: Key | string;
  rotateCCW: Key | string;
  rotate180: Key | string;
  hold: Key | string;
  pause: Key | string;
  restart: Key | string;
}

const DEFAULT_BINDINGS: PuzzleKeyBindings = {
  left: Key.Left,
  right: Key.Right,
  down: Key.Down,
  hardDrop: Key.Space,
  rotateCW: Key.Up,
  rotateCCW: Key.Z,
  rotate180: Key.A,
  hold: Key.C,
  pause: Key.Escape,
  restart: Key.R,
};

export class PuzzleScene extends Scene<PuzzleSceneConfig> {
  private game: PuzzleGame;
  private renderer: PuzzleRenderer;
  private bindings: PuzzleKeyBindings;
  private pauseOverlay: PauseOverlay | null = null;

  private opponentGame: PuzzleGame | null = null;
  private opponentRenderer: PuzzleRenderer | null = null;

  private gameType: GameType;
  private gameMode: GameMode;
  private startLevel: number;
  private seed?: number;

  private soundsLoaded: boolean = false;
  private gameTime: number = 0;
  private frameCount: number = 0;

  private chatContainer: HTMLElement | null = null;
  private chatInputActive: boolean = false;

  constructor(config: PuzzleSceneConfig, bindings?: Partial<PuzzleKeyBindings>) {
    super(config);
    this.gameType = config.gameType ?? new GameType();
    this.gameMode = config.gameMode ?? 'marathon';
    this.startLevel = config.startLevel ?? 1;
    this.seed = config.seed;
    this.bindings = { ...DEFAULT_BINDINGS, ...bindings };

    this.game = new PuzzleGame(this, this.seed ?? Date.now());
    this.game.currentGameType = this.gameType;

    this.renderer = new PuzzleRenderer({
      cellSize: 32,
      gridOffsetX: 0,
      gridOffsetY: 50,
    });

    if (config.multiplayer) {
      this.opponentGame = new PuzzleGame(this, 0);
      this.opponentGame.currentGameType = this.gameType;
      this.opponentRenderer = new PuzzleRenderer({
        cellSize: 20,
        gridOffsetX: 0,
        gridOffsetY: 50,
        isOpponent: true
      });
    }
  }

  public async create(): Promise<void> {
    this.renderer.attachGame(this.game);
    this.container.addChild(this.renderer.container);

    if (this.opponentGame && this.opponentRenderer) {
      this.opponentRenderer.attachGame(this.opponentGame);
      this.container.addChild(this.opponentRenderer.container);
    }

    this.centerRenderer();
    this.createPauseOverlay();
    this.loadSounds();
    this.setupGameEvents();

    if (this.config.multiplayer) {
      networkManager.connect('http://localhost:6065');
      networkManager.setGame(this.game);
      this.setupNetworkHandlers();
      this.createChatUI();
    }

    this.game.initGame();
    this.game.start();
  }

  private setupNetworkHandlers(): void {
    networkManager.on('opponentFrame', (state: any) => {
      if (this.opponentGame) {
        this.opponentGame.applyState(state);
      }
    });
  }

  private createPauseOverlay(): void {
    this.pauseOverlay = new PauseOverlay({
      width: this.width,
      height: this.height,
      onResume: () => this.resumeGame(),
      onRestart: () => this.restartFromPause(),
      onQuit: () => this.quitToMenu(),
    });
    this.container.addChild(this.pauseOverlay.container);
  }

  private centerRenderer(): void {
    if (this.opponentRenderer) {
      const pBounds = this.renderer.getGridBounds();
      const oBounds = this.opponentRenderer.getGridBounds();
      
      const totalWidth = pBounds.width + oBounds.width + 100;
      const startX = (this.width - totalWidth) / 2;
      
      this.renderer.setPosition(startX, 0);
      this.opponentRenderer.setPosition(startX + pBounds.width + 100, 100);
    } else {
      const bounds = this.renderer.getGridBounds();
      const totalWidth = bounds.width + 400;
      const offsetX = (this.width - totalWidth) / 2;
      this.renderer.setPosition(offsetX, 0);
    }
  }

  private loadSounds(): void {
    const sounds = [
      { name: 'puzzle_move', src: 'assets/audio/sfx/move.wav' },
      { name: 'puzzle_rotate', src: 'assets/audio/sfx/rotate.wav' },
      { name: 'puzzle_drop', src: 'assets/audio/sfx/drop.wav' },
      { name: 'puzzle_lock', src: 'assets/audio/sfx/lock.wav' },
      { name: 'puzzle_clear', src: 'assets/audio/sfx/clear.wav' },
      { name: 'puzzle_tetris', src: 'assets/audio/sfx/tetris.wav' },
      { name: 'puzzle_hold', src: 'assets/audio/sfx/hold.wav' },
      { name: 'puzzle_levelup', src: 'assets/audio/sfx/levelup.wav' },
      { name: 'puzzle_gameover', src: 'assets/audio/sfx/gameover.wav' },
    ];

    for (const sound of sounds) {
      try {
        AudioManager.load(sound.name, sound.src);
      } catch {
        // Intentionally empty - sounds are optional
      }
    }
    this.soundsLoaded = true;
  }

  private setupGameEvents(): void {
    this.game.on('pieceMoved', (_piece, movement) => {
      if (movement === MovementType.LEFT || movement === MovementType.RIGHT) {
        this.playSound('puzzle_move');
      } else if (
        movement === MovementType.ROTATE_CLOCKWISE ||
        movement === MovementType.ROTATE_COUNTERCLOCKWISE ||
        movement === MovementType.ROTATE_180
      ) {
        this.playSound('puzzle_rotate');
      } else if (movement === MovementType.HARD_DROP) {
        this.playSound('puzzle_drop');
      } else if (movement === MovementType.HOLD) {
        this.playSound('puzzle_hold');
      }
    });

    this.game.on('pieceLocked', () => {
      this.playSound('puzzle_lock');
    });

    this.game.on('linesCleared', (lines, chain, combo) => {
      if (chain >= 4) {
        this.playSound('puzzle_tetris');
      } else {
        this.playSound('puzzle_clear');
      }
    });

    this.game.on('levelUp', () => {
      this.playSound('puzzle_levelup');
    });

    this.game.on('gameOver', () => {
      this.playSound('puzzle_gameover');
      this.showGameOver();
    });
  }

  private showGameOver(): void {
    console.log('Game Over');
    const playerName = localStorage.getItem('playerName') || 'WebPlayer';
    networkManager.reportScore({
      mode: this.gameMode,
      name: playerName,
      score: this.game.score,
      lines: this.game.linesClearedTotal,
      time: this.gameTime
    });
  }

  private resumeGame(): void {
    this.game.resume();
    this.pauseOverlay?.hide();
  }

  private restartFromPause(): void {
    this.pauseOverlay?.hide();
    this.restart();
  }

  private quitToMenu(): void {
    StateManager.pop();
  }

  private playSound(name: string): void {
    if (this.soundsLoaded && AudioManager.isLoaded(name)) {
      AudioManager.playSound(name);
    }
  }

  public onUpdate(dt: number): void {
    if (this.pauseOverlay?.visible) {
      this.pauseOverlay.update();
      return;
    }

    if (this.game.state === GameState.PLAYING) {
      this.gameTime += dt;
      this.frameCount++;

      if (this.config.multiplayer && this.frameCount % 5 === 0) {
        networkManager.sendFrame(this.game.getState());
      }
    }

    this.processInput();
    this.game.update();
    this.renderer.update();
    this.opponentRenderer?.update();
  }

  private processInput(): void {
    if (InputManager.isKeyPressed(this.bindings.pause as Key)) {
      if (this.game.state === GameState.PLAYING) {
        this.game.pause();
        this.pauseOverlay?.show();
      } else if (this.game.state === GameState.PAUSED) {
        this.resumeGame();
      }
      return;
    }

    if (InputManager.isKeyPressed(Key.T) && this.config.multiplayer) {
        this.toggleChat();
        return;
    }

    if (this.chatInputActive) return;

    if (InputManager.isKeyPressed(this.bindings.restart as Key)) {
      this.restart();
      return;
    }

    if (this.game.state !== GameState.PLAYING) return;

    if (this.game.player) {
        this.game.player.LEFT_HELD = InputManager.isKeyHeld(this.bindings.left as Key);
        this.game.player.RIGHT_HELD = InputManager.isKeyHeld(this.bindings.right as Key);
        this.game.player.DOWN_HELD = InputManager.isKeyHeld(this.bindings.down as Key);
        this.game.player.ROTATECW_HELD = InputManager.isKeyPressed(this.bindings.rotateCW as Key);
        this.game.player.ROTATECCW_HELD = InputManager.isKeyPressed(this.bindings.rotateCCW as Key);
        // Add more mapping as needed
    }
  }

  restart(): void {
    this.gameTime = 0;
    this.game.initGame();
    this.game.start();
  }

  getGame(): PuzzleGame {
    return this.game;
  }

  getRenderer(): PuzzleRenderer {
    return this.renderer;
  }

  private createChatUI(): void {
    if (this.chatContainer) return;

    this.chatContainer = document.createElement('div');
    this.chatContainer.style.position = 'absolute';
    this.chatContainer.style.left = '10px';
    this.chatContainer.style.bottom = '10px';
    this.chatContainer.style.width = '300px';
    this.chatContainer.style.height = '200px';
    this.chatContainer.style.background = 'rgba(0,0,0,0.5)';
    this.chatContainer.style.color = 'white';
    this.chatContainer.style.display = 'flex';
    this.chatContainer.style.flexDirection = 'column';
    this.chatContainer.style.padding = '5px';
    this.chatContainer.style.borderRadius = '4px';
    this.chatContainer.style.pointerEvents = 'none';

    this.chatContainer.innerHTML = `
        <div id="gameChatMessages" style="flex-grow: 1; overflow-y: auto; margin-bottom: 5px; font-family: monospace; font-size: 12px; text-shadow: 1px 1px 1px black;"></div>
        <input type="text" id="gameChatInput" placeholder="Press T to chat..." style="width: 100%; padding: 3px; background: rgba(0,0,0,0.7); color: white; border: 1px solid #444; pointer-events: auto; display: none;" />
    `;

    document.body.appendChild(this.chatContainer);

    networkManager.on('chatMessage', (data: any) => this.handleChatMessage(data));
  }

  private handleChatMessage(data: { message: string, name: string, timestamp: number }): void {
    const messagesDiv = document.getElementById('gameChatMessages');
    if (messagesDiv) {
        const msgEl = document.createElement('div');
        msgEl.innerHTML = `<span style="color: #3366ff; font-weight: bold;">${data.name}:</span> ${data.message}`;
        messagesDiv.appendChild(msgEl);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        
        // Auto-fade messages or keep them visible? Let's keep them for now.
    }
  }

  private toggleChat(): void {
    const input = document.getElementById('gameChatInput') as HTMLInputElement;
    if (!input) return;

    this.chatInputActive = !this.chatInputActive;
    if (this.chatInputActive) {
        input.style.display = 'block';
        input.focus();
        // Lock game input
        InputManager.setLocked(true);
        
        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                const msg = input.value.trim();
                if (msg) {
                    const name = localStorage.getItem('playerName') || 'WebPlayer';
                    networkManager.sendChat(msg, name);
                }
                input.value = '';
                this.toggleChat();
            } else if (e.key === 'Escape') {
                this.toggleChat();
            }
            e.stopPropagation();
        };
    } else {
        input.style.display = 'none';
        input.blur();
        InputManager.setLocked(false);
    }
  }

  protected async destroy(): Promise<void> {
    this.game.removeAllListeners();
    this.renderer.destroy();
    this.pauseOverlay?.destroy();
    if (this.chatContainer) {
        this.chatContainer.remove();
        this.chatContainer = null;
    }
    if (this.config.multiplayer) {
      networkManager.setGame(null);
      networkManager.off('chatMessage');
    }
  }
}
