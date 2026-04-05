import { GameType, BlockType, PieceType, GamePlayMode, networkManager } from '../puzzle';
import { Rotation } from '../../shared/puzzle/Piece';
import { BobNet } from '../puzzle/BobNet';
import { AchievementManager } from '../data/AchievementManager';
import { getAchievementIdentity } from '../data/AchievementIdentity';
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
  private summaryPanel!: HTMLDivElement;
  
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
        .summary-panel { margin-top: 16px; background: #151515; border: 1px solid #333; border-radius: 6px; padding: 12px; }
        .summary-panel h3 { margin: 0 0 8px 0; color: #7cff7c; }
        .summary-panel ul { margin: 0; padding-left: 18px; color: #bbb; }
        .summary-panel li { margin-bottom: 4px; }
        .summary-highlight { color: #fff; }
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
        <div id="rules-summary" class="summary-panel"></div>
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
    this.summaryPanel = this.container.querySelector('#rules-summary') as HTMLDivElement;
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

    [
      this.nameInput,
      this.modeSelect,
      this.gridWidthInput,
      this.gridHeightInput,
      this.gravityInput,
      this.lockDelayInput,
      this.chainAmountInput,
      this.nextPiecesInput,
    ].forEach((input) => {
      input.addEventListener('input', () => this.updateSummary());
      input.addEventListener('change', () => this.updateSummary());
    });
    
    this.container.querySelector('#btn-add-block')?.addEventListener('click', () => {
        const bt = new BlockType();
        bt.name = `Block ${this.currentGameType.blockTypes.length + 1}`;
        this.currentGameType.blockTypes.push(bt);
        this.updateBlockList();
        this.updateSummary();
    });

    this.container.querySelector('#btn-add-piece')?.addEventListener('click', () => {
        const pt = new PieceType();
        pt.name = `Piece ${this.currentGameType.pieceTypes.length + 1}`;
        this.currentGameType.pieceTypes.push(pt);
        this.updatePieceList();
        this.pieceList.selectedIndex = this.currentGameType.pieceTypes.length - 1;
        this.currentEditingRotation = 0;
        this.renderPieceShapeEditor();
        this.updateSummary();
    });

    this.container.querySelector('#btn-next-rot')?.addEventListener('click', () => {
        this.currentEditingRotation++;
        this.renderPieceShapeEditor();
        this.updateSummary();
    });

    this.container.querySelector('#btn-prev-rot')?.addEventListener('click', () => {
        this.currentEditingRotation = Math.max(0, this.currentEditingRotation - 1);
        this.renderPieceShapeEditor();
        this.updateSummary();
    });

    this.container.querySelector('#btn-add-rot')?.addEventListener('click', () => {
        const ptIndex = this.pieceList.selectedIndex;
        if (ptIndex === -1) return;
        const pt = this.currentGameType.pieceTypes[ptIndex];
        pt.rotationSet.add(new Rotation());
        this.currentEditingRotation = pt.rotationSet.size() - 1;
        this.renderPieceShapeEditor();
        this.updateSummary();
    });

    this.pieceList.addEventListener('change', () => {
        this.currentEditingRotation = 0;
        this.renderPieceShapeEditor();
        this.updateSummary();
    });
  }

  private renderPieceShapeEditor() {
      const ptIndex = this.pieceList.selectedIndex;
      if (ptIndex === -1) return;
      
      const pt = this.currentGameType.pieceTypes[ptIndex];
      const grid = this.container.querySelector('#piece-shape-editor')!;
      const pieceNameDisplay = this.container.querySelector('#piece-name-display');
      if (pieceNameDisplay) {
          pieceNameDisplay.textContent = pt.name || `Piece ${ptIndex + 1}`;
      }
      grid.innerHTML = '';
      const maxRot = pt.rotationSet.size();
      if (maxRot <= 0) {
          this.container.querySelector('#rot-label')!.textContent = 'Rotation: none';
          grid.innerHTML = '<div style="grid-column: span 4; color:#888;">Add a rotation to start editing this piece.</div>';
          this.updateSummary();
          return;
      }
      this.currentEditingRotation = ((this.currentEditingRotation % maxRot) + maxRot) % maxRot;
      
      this.container.querySelector('#rot-label')!.textContent = `Rotation: ${this.currentEditingRotation}`;
      
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
                  this.updateSummary();
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
    this.updateSummary();
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
    this.updateSummary();
  }

  private getTotalRotationCount(): number {
    return this.currentGameType.pieceTypes.reduce((sum, pt) => sum + pt.rotationSet.size(), 0);
  }

  private getTotalFilledCellCount(): number {
    let total = 0;
    this.currentGameType.pieceTypes.forEach((pt) => {
      for (let i = 0; i < pt.rotationSet.size(); i++) {
        total += pt.rotationSet.get(i).blockOffsets.length;
      }
    });
    return total;
  }

  private updateSummary(): void {
    if (!this.summaryPanel) return;

    this.applyFormValuesToGameType();

    const pieceCount = this.currentGameType.pieceTypes.length;
    const blockCount = this.currentGameType.blockTypes.length;
    const rotationCount = this.getTotalRotationCount();
    const filledCells = this.getTotalFilledCellCount();
    const selectedPiece = this.currentGameType.pieceTypes[this.pieceList.selectedIndex] ?? null;
    const selectedRotationCount = selectedPiece ? selectedPiece.rotationSet.size() : 0;
    const selectedPieceName = selectedPiece?.name || 'None selected';
    const sharePayload = BobNet.toBase64GZippedGSON(this.currentGameType);

    this.summaryPanel.innerHTML = `
      <h3>Rules Summary</h3>
      <ul>
        <li><span class="summary-highlight">Mode:</span> ${this.modeSelect.value || this.currentGameType.gameMode}</li>
        <li><span class="summary-highlight">Grid:</span> ${this.gridWidthInput.value || this.currentGameType.gridWidth} × ${this.gridHeightInput.value || this.currentGameType.gridHeight}</li>
        <li><span class="summary-highlight">Gravity / Lock:</span> ${this.gravityInput.value || this.currentGameType.gravityRule_ticksToMoveDownBlocksOverBlankSpaces} / ${this.lockDelayInput.value || this.currentGameType.maxLockDelayTicks}</li>
        <li><span class="summary-highlight">Chain / Next:</span> ${this.chainAmountInput.value || this.currentGameType.chainRule_AmountPerChain} / ${this.nextPiecesInput.value || this.currentGameType.numberOfNextPiecesToShow}</li>
        <li><span class="summary-highlight">Pieces:</span> ${pieceCount} total, ${rotationCount} rotations, ${filledCells} filled cells</li>
        <li><span class="summary-highlight">Blocks:</span> ${blockCount} configured block types</li>
        <li><span class="summary-highlight">Editing:</span> ${selectedPieceName} (${selectedRotationCount} rotations)</li>
        <li><span class="summary-highlight">Share payload:</span> ${sharePayload.length} encoded chars</li>
      </ul>
    `;
  }

  private applyFormValuesToGameType(): void {
    this.currentGameType.name = this.nameInput.value;
    this.currentGameType.gameMode = this.modeSelect.value as GamePlayMode;
    this.currentGameType.gridWidth = parseInt(this.gridWidthInput.value);
    this.currentGameType.gridHeight = parseInt(this.gridHeightInput.value);
    this.currentGameType.gravityRule_ticksToMoveDownBlocksOverBlankSpaces = parseInt(this.gravityInput.value);
    this.currentGameType.maxLockDelayTicks = parseInt(this.lockDelayInput.value);
    this.currentGameType.chainRule_AmountPerChain = parseInt(this.chainAmountInput.value);
    this.currentGameType.numberOfNextPiecesToShow = parseInt(this.nextPiecesInput.value);
  }

  private save() {
    this.applyFormValuesToGameType();
    
    // Save to local storage for now
    localStorage.setItem('custom-game-type', JSON.stringify(this.currentGameType));
    AchievementManager.incrementStat('customGamesCreated');
    this.saveAchievementSnapshot();
    this.updateSummary();
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
    this.updateSummary();
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
      const identity = getAchievementIdentity();
      networkManager.saveAchievementData(identity, AchievementManager.exportSnapshot());
  }
}
