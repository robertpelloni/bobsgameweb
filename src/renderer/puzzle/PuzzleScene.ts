import { Scene, SceneConfig } from '../state/Scene';
import { StateManager } from '../state/StateManager';
import { InputManager, Key } from '../input/InputManager';
import { AudioManager } from '../audio/AudioManager';
import { PuzzleGame, GameState, MovementType, networkManager } from './index';
import { PuzzleRenderer } from './PuzzleRenderer';
import { GameType } from './index';
import { GameOverScene, GameStats } from '../scenes/GameOverScene';
import { PauseOverlay } from '../scenes/PauseOverlay';
import { TouchControls } from '../ui/TouchControls';
import { ReplayRecorder, ReplayPlayer } from '../../shared/puzzle/Replay';
import { BobNet } from './BobNet';
import { GameMode } from '../data/HighScoreManager';
import { AchievementManager } from '../data/AchievementManager';
import { getAchievementProfileName } from '../data/AchievementIdentity';
import { SERVER_URL } from '../../shared/Config';
import { Text, TextStyle, Container } from 'pixi.js';

export interface PuzzleSceneConfig extends SceneConfig {
  gameType?: GameType;
  gameMode?: GameMode;
  startLevel?: number;
  seed?: number;
  multiplayer?: boolean;
  isSpectator?: boolean;
  replayData?: string;
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
  private touchControls: TouchControls | null = null;

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
  private helpOverlay: HTMLElement | null = null;
  private spectatorBanner: Text | null = null;
  private spectatorStatsContainer: Container | null = null;
  private p1NameText: Text | null = null;
  private p2NameText: Text | null = null;

  private knownOpponents: Map<string, PuzzleGame> = new Map();
  private knownPlayers: Map<string, { name: string, elo: number }> = new Map();

  private isReplayMode: boolean = false;
  private replayPlayer: ReplayPlayer | null = null;
  private replayRecorder: ReplayRecorder = new ReplayRecorder();

  constructor(config: PuzzleSceneConfig, bindings?: Partial<PuzzleKeyBindings>) {
    super(config);
    this.gameType = config.gameType ?? new GameType();
    this.gameMode = config.gameMode ?? 'marathon';
    this.startLevel = config.startLevel ?? 1;
    this.seed = config.seed;
    this.bindings = { ...DEFAULT_BINDINGS, ...bindings };

    this.game = new PuzzleGame(this, this.seed ?? Date.now());
    this.game.currentGameType = this.gameType;

    if (this.config.replayData) {
        this.isReplayMode = true;
        this.replayPlayer = new ReplayPlayer();
        const data = this.replayPlayer.loadJSON(this.config.replayData);
        if (data && data.seed) {
            this.seed = data.seed;
            this.game = new PuzzleGame(this, this.seed);
            this.game.currentGameType = this.gameType;
            console.log(`[Replay] Loaded replay for ${data.playerName} with seed ${data.seed}`);
        }
    }

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
    
    // Auto-enable touch controls on mobile/touch devices
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        this.touchControls = new TouchControls(this.width, this.height);
        this.container.addChild(this.touchControls);
    }

    this.loadSounds();
    this.setupGameEvents();

    if (this.config.multiplayer) {
      networkManager.connect(SERVER_URL);
      networkManager.setGame(this.game);
      this.setupNetworkHandlers();
      this.createChatUI();
      this.loadAchievementSnapshot();
    }

    this.createHelpOverlay();
    
    if (this.config.isSpectator) {
        this.createSpectatorBanner();
        this.createSpectatorStats();
    } else if (this.isReplayMode) {
        this.createReplayBanner();
    }

    this.game.initGame();
    this.game.start();
  }

  private createSpectatorStats(): void {
      this.spectatorStatsContainer = new Container();
      this.container.addChild(this.spectatorStatsContainer);

      const style = new TextStyle({ fill: '#ffffff', fontSize: 18, fontWeight: 'bold' });
      
      this.p1NameText = new Text({ text: 'Player 1: Loading...', style });
      this.p2NameText = new Text({ text: 'Player 2: Loading...', style });

      this.p1NameText.position.set(200, 100);
      this.p2NameText.position.set(this.width - 400, 100);

      this.spectatorStatsContainer.addChild(this.p1NameText, this.p2NameText);
  }

  private createSpectatorBanner(): void {
    const style = new TextStyle({
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: 32,
        fontWeight: 'bold',
        fill: 0xff0000,
        stroke: { color: 0x000000, width: 4 },
        letterSpacing: 4,
    });
    this.spectatorBanner = new Text({ text: 'SPECTATOR MODE', style });
    this.spectatorBanner.anchor.set(0.5);
    this.spectatorBanner.position.set(this.width / 2, 50);
    this.container.addChild(this.spectatorBanner);
  }

  private createReplayBanner(): void {
    const style = new TextStyle({
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: 32,
        fontWeight: 'bold',
        fill: 0xffaa00,
        stroke: { color: 0x000000, width: 4 },
        letterSpacing: 4,
    });
    const banner = new Text({ text: 'REPLAY MODE', style });
    banner.anchor.set(0.5);
    banner.position.set(this.width / 2, 50);
    this.container.addChild(banner);
  }

  private setupNetworkHandlers(): void {
    networkManager.on('connected', () => {
        this.loadAchievementSnapshot();
    });

    networkManager.on('joinedRoom', (room: any) => {
        if (room.playerData) {
            for (const [id, data] of Object.entries(room.playerData)) {
                this.knownPlayers.set(id, data as any);
            }
            this.updateSpectatorNames();
        }
    });

    networkManager.on('roomUpdated', (data: any) => {
        if (data.playerData) {
            for (const [id, dataObj] of Object.entries(data.playerData)) {
                this.knownPlayers.set(id, dataObj as any);
            }
            this.updateSpectatorNames();
        }
    });

    networkManager.on('opponentFrame', (data: any) => {
      const { id, state } = data;
      
      if (this.config.isSpectator) {
          if (!this.knownOpponents.has(id)) {
              if (this.knownOpponents.size === 0) {
                  this.knownOpponents.set(id, this.game);
              } else if (this.knownOpponents.size === 1 && this.opponentGame) {
                  this.knownOpponents.set(id, this.opponentGame);
              }
              this.updateSpectatorNames();
          }
          const targetGame = this.knownOpponents.get(id);
          if (targetGame) targetGame.applyState(state);
      } else {
          if (this.opponentGame) {
              this.opponentGame.applyState(state);
          }
      }
    });
  }

  private updateSpectatorNames(): void {
      if (!this.config.isSpectator) return;
      
      let index = 0;
      for (const [id, game] of this.knownOpponents) {
          const data = this.knownPlayers.get(id);
          const nameStr = data ? `${data.name} [${data.elo}]` : 'Unknown';
          if (index === 0 && this.p1NameText) this.p1NameText.text = `Player 1: ${nameStr}`;
          if (index === 1 && this.p2NameText) this.p2NameText.text = `Player 2: ${nameStr}`;
          index++;
      }
  }

  private createPauseOverlay(): void {
    this.pauseOverlay = new PauseOverlay({
      width: this.width,
      height: this.height,
      onResume: () => this.resumeGame(),
      onRestart: () => this.restartFromPause(),
      onAchievements: () => this.openAchievementsFromPause(),
      onQuit: () => this.quitToMenu(),
    });
    this.container.addChild(this.pauseOverlay.container);
  }

  private createHelpOverlay(): void {
    this.helpOverlay = document.createElement('div');
    this.helpOverlay.style.position = 'absolute';
    this.helpOverlay.style.right = '20px';
    this.helpOverlay.style.top = '20px';
    this.helpOverlay.style.background = 'rgba(0,0,0,0.8)';
    this.helpOverlay.style.color = '#fff';
    this.helpOverlay.style.padding = '15px';
    this.helpOverlay.style.borderRadius = '8px';
    this.helpOverlay.style.border = '1px solid #4a6a8a';
    this.helpOverlay.style.fontFamily = 'monospace';
    this.helpOverlay.style.display = 'none';
    this.helpOverlay.style.zIndex = '1000';
    
    this.helpOverlay.innerHTML = `
      <h3 style="margin-top:0; color:#ffcc00;">Controls</h3>
      <p><b>Left/Right:</b> Move Piece</p>
      <p><b>Down:</b> Soft Drop</p>
      <p><b>Space:</b> Hard Drop</p>
      <p><b>Up/X:</b> Rotate CW</p>
      <p><b>Z:</b> Rotate CCW</p>
      <p><b>C:</b> Hold Piece</p>
      <p><b>ESC:</b> Pause Game</p>
      <p><b>R:</b> Restart</p>
      ${this.config.multiplayer ? '<p><b>T:</b> Chat</p>' : ''}
      <hr style="border-color:#4a6a8a; margin:10px 0;">
      <p style="color:#888; margin-bottom:0;">Press F1 to close</p>
    `;
    
    document.body.appendChild(this.helpOverlay);
  }

  private toggleHelpOverlay(): void {
    if (!this.helpOverlay) return;
    if (this.helpOverlay.style.display === 'none') {
      this.helpOverlay.style.display = 'block';
    } else {
      this.helpOverlay.style.display = 'none';
    }
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
      { name: 'puzzle_move', src: 'audio/sfx/move.wav' },
      { name: 'puzzle_rotate', src: 'audio/sfx/rotate.wav' },
      { name: 'puzzle_drop', src: 'audio/sfx/drop.wav' },
      { name: 'puzzle_lock', src: 'audio/sfx/lock.wav' },
      { name: 'puzzle_clear', src: 'audio/sfx/clear.wav' },
      { name: 'puzzle_tetris', src: 'audio/sfx/tetris.wav' },
      { name: 'puzzle_hold', src: 'audio/sfx/hold.wav' },
      { name: 'puzzle_levelup', src: 'audio/sfx/levelup.wav' },
      { name: 'puzzle_gameover', src: 'audio/sfx/gameover.wav' },
    ];

    for (const sound of sounds) {
      try {
        AudioManager.load(sound.name, sound.src);
      } catch {
        // Intentionally empty
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
        this.renderer.shake(3);
        InputManager.vibrate(0, 100, 0.5, 0.5);
        AchievementManager.incrementStat('totalHardDrops');
      } else if (movement === MovementType.HOLD) {
        this.playSound('puzzle_hold');
      }
    });

    this.game.on('pieceLocked', () => {
      this.playSound('puzzle_lock');
    });

    this.game.on('linesCleared', (lines: number[], chain: number, combo: number) => {
      const lineCount = lines.length;
      let popupText = '';
      let popupColor = 0xffffff;
      let scale = 1.0;

      // Achievement tracking
      AchievementManager.incrementStat('totalLinesCleared', lineCount);
      AchievementManager.setStatMax('maxCombo', combo);
      if (lineCount >= 4) {
          AchievementManager.incrementStat('tetrisClears');
      }

      if (lineCount === 1) {
          popupText = 'SINGLE';
          popupColor = 0x88ccff;
      } else if (lineCount === 2) {
          popupText = 'DOUBLE!';
          popupColor = 0x44ff44;
          scale = 1.1;
      } else if (lineCount === 3) {
          popupText = 'TRIPLE!!';
          popupColor = 0xffaa00;
          scale = 1.3;
      } else if (lineCount >= 4) {
          popupText = 'TETRIS!!!';
          popupColor = 0xff00ff;
          scale = 1.6;
          this.playSound('puzzle_tetris');
      }

      if (combo > 1) {
          popupText += `\n${combo} COMBO!`;
          scale += 0.2;
      }

      if (lineCount < 4) {
          this.playSound('puzzle_clear');
      }

      if (popupText) {
          this.renderer.spawnPopup(popupText, popupColor, scale);
      }

      for (const y of lines) {
        this.renderer.spawnLineClearParticles(y - 5, popupColor);
      }
    });

    this.game.on('levelUp', () => {
      this.playSound('puzzle_levelup');
    });

    this.game.on('garbageSent', (amount: number) => {
    });

    this.game.on('garbageReceived', (amount: number) => {
      this.renderer.shake(amount * 2 + 5);
      InputManager.vibrate(0, 200, 0.8, 1.0); // Heavy rumble on taking garbage
    });

    this.game.on('gameOver', () => {
      this.playSound('puzzle_gameover');
      InputManager.vibrate(0, 500, 1.0, 1.0); // Massive rumble on death
      this.showGameOver();
    });

    this.game.on('win', () => {
      this.playSound('puzzle_gameover');
      this.showGameOver(true);
    });
  }

  private showGameOver(isWin: boolean = false): void {
    console.log(isWin ? 'Game Won!' : 'Game Over');
    const playerName = getAchievementProfileName();

    // ── Achievement tracking on game end ──
    AchievementManager.setStatMax('highestScore', this.game.score);
    if (this.gameMode === 'sprint' && this.game.linesClearedTotal >= 40) {
        if (this.gameTime < 60) AchievementManager.setStat('sprintSub60', 1);
        if (this.gameTime < 30) AchievementManager.setStat('sprintSub30', 1);
    }
    // Track which modes have been played
    const modesKey = `_played_${this.gameMode}`;
    if (!AchievementManager.getStat(modesKey)) {
        AchievementManager.setStat(modesKey, 1);
        const marathonPlayed = AchievementManager.getStat('_played_marathon');
        const sprintPlayed = AchievementManager.getStat('_played_sprint');
        const ultraPlayed = AchievementManager.getStat('_played_ultra');
        const stackPlayed = AchievementManager.getStat('_played_stack');
        const total = (marathonPlayed ? 1 : 0) + (sprintPlayed ? 1 : 0) + (ultraPlayed ? 1 : 0) + (stackPlayed ? 1 : 0);
        AchievementManager.setStat('modesPlayed', total);
    }

    // Save replay locally
    const replayJson = this.replayRecorder.exportJSON({
        gameTypeUUID: this.gameType.uuid,
        seed: this.seed,
        playerName,
        score: this.game.score,
        lines: this.game.linesClearedTotal,
        time: this.gameTime
    });
    localStorage.setItem(`replay_${Date.now()}`, replayJson);
    console.log(`[Replay] Saved to local storage.`);

    let replayB64: string | undefined = undefined;
    try {
        replayB64 = BobNet.toBase64GZippedGSON(JSON.parse(replayJson));
    } catch (e) {
        console.error("Failed to serialize replay for upload", e);
    }

    networkManager.reportScore({
      mode: this.gameMode,
      name: playerName,
      score: this.game.score,
      lines: this.game.linesClearedTotal,
      time: this.gameTime,
      replay: replayB64
    });
    this.saveAchievementSnapshot();

    const stats: GameStats = {
      score: this.game.score,
      level: this.game.currentLevel,
      lines: this.game.linesClearedTotal,
      time: this.gameTime,
      gameType: this.gameType,
      gameMode: this.gameMode,
    };

    const gameOverScene = new GameOverScene({
      name: 'game-over',
      app: this.app,
      camera: this.camera ?? undefined,
      stats,
      isWin,
      onReplay: () => {
        StateManager.pop();
        this.restart();
      },
      onMainMenu: () => {
        StateManager.pop();
        StateManager.pop();
      },
    });

    StateManager.push(gameOverScene);
  }

  private resumeGame(): void {
    this.game.resume();
    this.pauseOverlay?.hide();
  }

  private restartFromPause(): void {
    this.pauseOverlay?.hide();
    this.restart();
  }

  private async openAchievementsFromPause(): Promise<void> {
    this.pauseOverlay?.hide();
    const { AchievementsScene } = await import('../scenes/AchievementsScene');
    const achievementsScene = new AchievementsScene({
      name: 'achievements',
      app: this.app,
      camera: this.camera ?? undefined,
    });
    StateManager.push(achievementsScene);
  }

  private quitToMenu(): void {
    if (this.config.multiplayer) {
      networkManager.disconnect();
      while (StateManager.current && StateManager.current.name !== 'main-menu') {
        StateManager.popSync();
      }
    } else {
      StateManager.popSync();
    }
  }

  private loadAchievementSnapshot(): void {
    if (!networkManager.connected) return;
    const playerName = getAchievementProfileName();
    networkManager.loadAchievementData(playerName, (data: any) => {
      if (data?.success && data.snapshot) {
        AchievementManager.mergeSnapshot(data.snapshot);
      }
    });
  }

  private saveAchievementSnapshot(): void {
    if (!networkManager.connected) return;
    const playerName = getAchievementProfileName();
    networkManager.saveAchievementData(playerName, AchievementManager.exportSnapshot());
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

      if (this.gameMode === 'sprint' && this.game.linesClearedTotal >= 40 && !this.game.won) {
        this.game.won = true;
      }

      if (this.gameMode === 'ultra' && this.gameTime >= 180 && !this.game.complete) {
        this.game.complete = true;
        this.game.emit('gameOver');
      }

      if (this.config.multiplayer && this.frameCount % 5 === 0) {
        networkManager.sendFrame(this.game.getState());
      }
    }

    this.processInput();
    this.game.update();
    this.renderer.update();
    this.opponentRenderer?.update();
  }

  public onResize(width: number, height: number): void {
    this.centerRenderer();
    this.pauseOverlay?.resize(width, height);
    this.touchControls?.resize(width, height);
    if (this.spectatorBanner) {
        this.spectatorBanner.position.set(width / 2, 50);
    }
    if (this.p1NameText) this.p1NameText.position.set(200, 100);
    if (this.p2NameText) this.p2NameText.position.set(width - 400, 100);
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

    if (InputManager.isKeyPressed(Key.F1)) {
        this.toggleHelpOverlay();
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
    if (this.config.isSpectator) return;

    if (this.isReplayMode && this.replayPlayer && this.game.player) {
        // Inject recorded inputs
        const mask = this.replayPlayer.getInputMaskForTick(this.game.totalTicksPassed);
        this.game.player.setInputMask(mask);
        return;
    }

    if (this.game.player) {
        this.game.player.LEFT_HELD = InputManager.isKeyHeld(this.bindings.left as Key);
        this.game.player.RIGHT_HELD = InputManager.isKeyHeld(this.bindings.right as Key);
        this.game.player.DOWN_HELD = InputManager.isKeyHeld(this.bindings.down as Key);
        this.game.player.UP_HELD = InputManager.isKeyHeld(Key.Up);
        this.game.player.ROTATECW_HELD = InputManager.isKeyHeld(this.bindings.rotateCW as Key);
        this.game.player.ROTATECCW_HELD = InputManager.isKeyHeld(this.bindings.rotateCCW as Key);
        this.game.player.SLAM_HELD = InputManager.isKeyHeld(this.bindings.hardDrop as Key);
        this.game.player.HOLDRAISE_HELD = InputManager.isKeyHeld(this.bindings.hold as Key);

        this.replayRecorder.recordFrame(this.game.totalTicksPassed, this.game.player.getInputMask());
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
    }
  }

  private toggleChat(): void {
    const input = document.getElementById('gameChatInput') as HTMLInputElement;
    if (!input) return;

    this.chatInputActive = !this.chatInputActive;
    if (this.chatInputActive) {
        input.style.display = 'block';
        input.focus();
        InputManager.setLocked(true);
        
        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                const msg = input.value.trim();
                if (msg) {
                    const name = getAchievementProfileName();
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
    if (this.helpOverlay) {
        this.helpOverlay.remove();
        this.helpOverlay = null;
    }
    if (this.config.multiplayer) {
      networkManager.setGame(null);
      networkManager.off('chatMessage');
    }
  }
}
