import { GameType, BlockType, PieceType, GamePlayMode, networkManager } from '../puzzle';
import { Rotation } from '../../shared/puzzle/Piece';
import { BobNet } from '../puzzle/BobNet';
import { AchievementManager } from '../data/AchievementManager';
import { getAchievementProfileName } from '../data/AchievementIdentity';
import { ToastManager } from '../ui/ToastManager';

export class CustomGameEditor {
  private container: HTMLElement;
  private currentGameType: GameType;

  // UI Elements
  private nameInput!: HTMLInputElement;
  private modeSelect!: HTMLSelectElement;
  private gridWidthInput!: HTMLInputElement;
  private gridHeightInput!: HTMLInputElement;
  private gravityInput!: HTMLInputElement;
  private lockDelayInput!: HTMLInputElement;
  private chainAmountInput!: HTMLInputElement;
  private nextPiecesInput!: HTMLInputElement;
  
  private blockList!: HTMLSelectElement;
  private pieceList!: HTMLSelectElement;

  private currentEditingRotation: number = 0;

  constructor(parentElementId: string) {
    const parent = document.getElementById(parentElementId);
    if (!parent) throw new Error(`Element with id ${parentElementId} not found`);
    
    this.container = document.createElement('div');
    this.container.className = 'custom-game-editor';
    parent.appendChild(this.container);
    
    this.currentGameType = new GameType();
    
    this.buildUI();
    this.loadFromGameType();
  }

  private buildUI() {
    this.container.innerHTML = `
      <style>
        .custom-game-editor {
          background: #1a1a1a;
          color: #eee;
          padding: 20px;
          border-radius: 8px;
          font-family: sans-serif;
          width: 600px;
          box-shadow: 0 0 20px rgba(0,0,0,0.5);
        }
        .editor-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .editor-tabs { display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 1px solid #444; padding-bottom: 10px; }
        .tab-btn { background: #333; border: none; color: #888; padding: 5px 15px; cursor: pointer; border-radius: 4px; }
        .tab-btn.active { background: #00ff00; color: #000; font-weight: bold; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; font-size: 14px; color: #aaa; }
        .form-row { display: flex; gap: 20px; }
        input, select { background: #222; border: 1px solid #444; color: #fff; padding: 8px; border-radius: 4px; width: 100%; }
        .hidden { display: none; }
        .editor-columns { display: flex; gap: 20px; }
        .item-list { flex: 1; }
        .item-details { flex: 1; background: #222; padding: 10px; border-radius: 4px; }
        button { cursor: pointer; }
      </style>

      <div class="editor-header">
        <h2>Custom Game Editor</h2>
        <div>
            <button id="btn-new">New</button>
            <button id="btn-load">Load</button>
            <button id="btn-save" style="background:#004400; color:#fff; border:none; padding:5px 15px; border-radius:4px;">Save</button>
            <button id="btn-share" style="background:#004488; color:#fff; border:none; padding:5px 15px; border-radius:4px; margin-left: 10px;">Share</button>
            <button id="btn-test" style="background:#cc6600; color:#fff; border:none; padding:5px 15px; border-radius:4px; margin-left: 10px;">Test Game</button>
        </div>
      </div>
      
      <div class="editor-tabs">
        <button class="tab-btn active" data-tab="settings">Settings</button>
        <button class="tab-btn" data-tab="blocks">Blocks</button>
        <button class="tab-btn" data-tab="pieces">Pieces</button>
      </div>
      
      <div class="tab-content" id="tab-settings">
        <div class="form-group">
          <label>Game Name</label>
          <input type="text" id="game-name">
        </div>
        <div class="form-group">
          <label>Mode</label>
          <select id="game-mode">
            <option value="DROP">Drop</option>
            <option value="STACK">Stack</option>
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Grid Width</label>
            <input type="number" id="grid-width" min="4" max="20">
          </div>
          <div class="form-group">
            <label>Grid Height</label>
            <input type="number" id="grid-height" min="10" max="40">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Gravity (Ticks)</label>
            <input type="number" id="gravity" min="0">
          </div>
          <div class="form-group">
            <label>Lock Delay (Ticks)</label>
            <input type="number" id="lock-delay" min="0">
          </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Chain Amount</label>
                <input type="number" id="chain-amount" min="2" max="10">
            </div>
            <div class="form-group">
                <label>Next Pieces</label>
                <input type="number" id="next-pieces" min="0" max="6">
            </div>
        </div>
      </div>
      
      <div class="tab-content hidden" id="tab-blocks">
        <div class="editor-columns">
          <div class="item-list">
            <h3>Block Types</h3>
            <select id="block-list" size="10"></select>
            <div class="list-actions">
              <button id="btn-add-block">+</button>
              <button id="btn-remove-block">-</button>
            </div>
          </div>
          <div id="block-details" class="item-details">Select a block</div>
        </div>
      </div>
      
      <div class="tab-content hidden" id="tab-pieces">
        <div class="editor-columns">
          <div class="item-list">
            <h3>Piece Types</h3>
            <select id="piece-list" size="10"></select>
            <div class="list-actions">
              <button id="btn-add-piece">+</button>
              <button id="btn-remove-piece">-</button>
            </div>
          </div>
          <div id="piece-details" class="item-details">
            <h4 id="piece-name-display">Select a piece</h4>
            <div style="display:flex; gap:10px; margin-bottom:10px;">
                <button id="btn-prev-rot"> < </button>
                <span id="rot-label">Rotation: 0</span>
                <button id="btn-next-rot"> > </button>
                <button id="btn-add-rot">+ ROT</button>
            </div>
            <div id="piece-shape-editor" style="display:grid; grid-template-columns: repeat(4, 30px); gap: 2px; margin-top:10px;">
                <!-- 4x4 grid -->
            </div>
            <p style="font-size:12px; color:#888; margin-top:10px;">Click grid to toggle blocks</p>
          </div>
        </div>
      </div>
    `;

    this.nameInput = this.container.querySelector('#game-name') as HTMLInputElement;
    this.modeSelect = this.container.querySelector('#game-mode') as HTMLSelectElement;
    this.gridWidthInput = this.container.querySelector('#grid-width') as HTMLInputElement;
    this.gridHeightInput = this.container.querySelector('#grid-height') as HTMLInputElement;
    this.gravityInput = this.container.querySelector('#gravity') as HTMLInputElement;
    this.lockDelayInput = this.container.querySelector('#lock-delay') as HTMLInputElement;
    this.chainAmountInput = this.container.querySelector('#chain-amount') as HTMLInputElement;
    this.nextPiecesInput = this.container.querySelector('#next-pieces') as HTMLInputElement;
    this.blockList = this.container.querySelector('#block-list') as HTMLSelectElement;
    this.pieceList = this.container.querySelector('#piece-list') as HTMLSelectElement;

    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = (e.target as HTMLElement).dataset.tab;
        this.switchTab(tab!);
      });
    });

    this.container.querySelector('#btn-save')?.addEventListener('click', () => this.save());
    this.container.querySelector('#btn-share')?.addEventListener('click', () => this.shareGame());
    this.container.querySelector('#btn-test')?.addEventListener('click', () => this.testGame());
    this.container.querySelector('#btn-load')?.addEventListener('click', () => this.load());
    this.container.querySelector('#btn-new')?.addEventListener('click', () => this.createNew());
    
    this.container.querySelector('#btn-add-block')?.addEventListener('click', () => {
        const bt = new BlockType();
        bt.name = "New Block";
        this.currentGameType.blockTypes.push(bt);
        this.updateBlockList();
    });

    this.container.querySelector('#btn-add-piece')?.addEventListener('click', () => {
        const pt = new PieceType();
        pt.name = "New Piece";
        this.currentGameType.pieceTypes.push(pt);
        this.updatePieceList();
    });

    this.container.querySelector('#btn-next-rot')?.addEventListener('click', () => {
        this.currentEditingRotation++;
        this.renderPieceShapeEditor();
    });

    this.container.querySelector('#btn-prev-rot')?.addEventListener('click', () => {
        this.currentEditingRotation = Math.max(0, this.currentEditingRotation - 1);
        this.renderPieceShapeEditor();
    });

    this.container.querySelector('#btn-add-rot')?.addEventListener('click', () => {
        const ptIndex = this.pieceList.selectedIndex;
        if (ptIndex === -1) return;
        const pt = this.currentGameType.pieceTypes[ptIndex];
        pt.rotationSet.add(new Rotation());
        this.currentEditingRotation = pt.rotationSet.size() - 1;
        this.renderPieceShapeEditor();
    });

    this.pieceList.addEventListener('change', () => {
        this.currentEditingRotation = 0;
        this.renderPieceShapeEditor();
    });
  }

  private renderPieceShapeEditor() {
      const ptIndex = this.pieceList.selectedIndex;
      if (ptIndex === -1) return;
      
      const pt = this.currentGameType.pieceTypes[ptIndex];
      const maxRot = pt.rotationSet.size();
      this.currentEditingRotation = ((this.currentEditingRotation % maxRot) + maxRot) % maxRot;
      
      this.container.querySelector('#rot-label')!.textContent = `Rotation: ${this.currentEditingRotation}`;
      
      const grid = this.container.querySelector('#piece-shape-editor')!;
      grid.innerHTML = '';
      
      const rotation = pt.rotationSet.get(this.currentEditingRotation);
      
      for (let y = 0; y < 4; y++) {
          for (let x = 0; x < 4; x++) {
              const cell = document.createElement('div');
              cell.style.width = '30px';
              cell.style.height = '30px';
              cell.style.border = '1px solid #444';
              
              const isSet = rotation.blockOffsets.some((o: any) => o.x === x && o.y === y);
              cell.style.background = isSet ? '#00ff00' : '#111';
              
              cell.onclick = () => {
                  if (isSet) {
                      rotation.blockOffsets = rotation.blockOffsets.filter((o: any) => !(o.x === x && o.y === y));
                  } else {
                      rotation.blockOffsets.push({ x, y });
                  }
                  this.renderPieceShapeEditor();
              };
              grid.appendChild(cell);
          }
      }
  }

  private switchTab(tabName: string) {
    this.container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', (btn as HTMLElement).dataset.tab === tabName);
    });
    this.container.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('hidden', content.id !== `tab-${tabName}`);
    });
  }

  private loadFromGameType() {
    this.nameInput.value = this.currentGameType.name;
    this.modeSelect.value = this.currentGameType.gameMode;
    this.gridWidthInput.value = this.currentGameType.gridWidth.toString();
    this.gridHeightInput.value = this.currentGameType.gridHeight.toString();
    this.gravityInput.value = this.currentGameType.gravityRule_ticksToMoveDownBlocksOverBlankSpaces.toString();
    this.lockDelayInput.value = this.currentGameType.maxLockDelayTicks.toString();
    this.chainAmountInput.value = this.currentGameType.chainRule_AmountPerChain.toString();
    this.nextPiecesInput.value = this.currentGameType.numberOfNextPiecesToShow.toString();
    
    this.updateBlockList();
    this.updatePieceList();
  }

  private updateBlockList() {
    this.blockList.innerHTML = '';
    this.currentGameType.blockTypes.forEach(bt => {
      const option = document.createElement('option');
      option.value = bt.uuid;
      option.textContent = bt.name || 'Unnamed Block';
      this.blockList.appendChild(option);
    });
  }

  private updatePieceList() {
    this.pieceList.innerHTML = '';
    this.currentGameType.pieceTypes.forEach(pt => {
      const option = document.createElement('option');
      option.value = pt.uuid;
      option.textContent = pt.name || 'Unnamed Piece';
      this.pieceList.appendChild(option);
    });
  }

  private save() {
    this.currentGameType.name = this.nameInput.value;
    this.currentGameType.gameMode = this.modeSelect.value as GamePlayMode;
    this.currentGameType.gridWidth = parseInt(this.gridWidthInput.value);
    this.currentGameType.gridHeight = parseInt(this.gridHeightInput.value);
    this.currentGameType.gravityRule_ticksToMoveDownBlocksOverBlankSpaces = parseInt(this.gravityInput.value);
    this.currentGameType.maxLockDelayTicks = parseInt(this.lockDelayInput.value);
    this.currentGameType.chainRule_AmountPerChain = parseInt(this.chainAmountInput.value);
    this.currentGameType.numberOfNextPiecesToShow = parseInt(this.nextPiecesInput.value);
    
    // Save to local storage for now
    localStorage.setItem('custom-game-type', JSON.stringify(this.currentGameType));
    AchievementManager.incrementStat('customGamesCreated');
    this.saveAchievementSnapshot();
    ToastManager.showInfo('Custom game saved to local browser storage.');
  }

  private async load() {
    const data = localStorage.getItem('custom-game-type');
    if (data) {
      try {
          this.currentGameType = GameType.fromJSON(data);
          this.loadFromGameType();
          alert('Game type loaded!');
      } catch (e) {
          console.error(e);
          alert('Failed to load game type.');
      }
    }
  }

  private createNew() {
    this.currentGameType = new GameType();
    this.loadFromGameType();
  }

  private testGame() {
      // Save temp config, emit an event so CustomGameEditorScene can catch it and push PuzzleScene
      this.save();
      const event = new CustomEvent('test-custom-game');
      document.dispatchEvent(event);
  }

  private shareGame() {
      this.save();
      const b64 = BobNet.toBase64GZippedGSON(this.currentGameType);
      const url = `${window.location.origin}${window.location.pathname}#play=${b64}`;
      navigator.clipboard.writeText(url).then(() => {
          AchievementManager.incrementStat('gamesShared');
          this.saveAchievementSnapshot();
          ToastManager.showInfo('Share link copied to clipboard.');
      }).catch(err => {
          console.error('Failed to copy: ', err);
          AchievementManager.incrementStat('gamesShared');
          this.saveAchievementSnapshot();
          prompt('Copy this link manually:', url);
      });
  }

  private saveAchievementSnapshot() {
      if (!networkManager.connected) return;
      const playerName = getAchievementProfileName();
      networkManager.saveAchievementData(playerName, AchievementManager.exportSnapshot());
  }
}
