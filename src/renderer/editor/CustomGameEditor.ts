import { GameType, BlockType, PieceType } from '../puzzle';

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
  private holdPieceCheck!: HTMLInputElement;
  private nextPieceCheck!: HTMLInputElement;
  
  private blockList!: HTMLSelectElement;
  private pieceList!: HTMLSelectElement;

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
      <div class="editor-header">
        <h2>Custom Game Editor</h2>
        <button id="btn-save">Save</button>
        <button id="btn-load">Load</button>
        <button id="btn-new">New</button>
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
            <label>Gravity (ms)</label>
            <input type="number" id="gravity" min="0" step="10">
          </div>
          <div class="form-group">
            <label>Lock Delay (ms)</label>
            <input type="number" id="lock-delay" min="0" step="10">
          </div>
        </div>
        <div class="form-group">
          <label>Chain Amount</label>
          <input type="number" id="chain-amount" min="2" max="10">
        </div>
        <div class="form-row">
          <div class="checkbox-group">
            <input type="checkbox" id="hold-enabled">
            <label for="hold-enabled">Enable Hold</label>
          </div>
          <div class="checkbox-group">
            <input type="checkbox" id="next-enabled">
            <label for="next-enabled">Enable Next</label>
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
          <div class="item-details" id="block-details">
            <!-- Dynamic block details -->
          </div>
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
          <div class="item-details" id="piece-details">
            <!-- Dynamic piece details -->
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
    this.holdPieceCheck = this.container.querySelector('#hold-enabled') as HTMLInputElement;
    this.nextPieceCheck = this.container.querySelector('#next-enabled') as HTMLInputElement;
    this.blockList = this.container.querySelector('#block-list') as HTMLSelectElement;
    this.pieceList = this.container.querySelector('#piece-list') as HTMLSelectElement;

    // Add event listeners
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
    this.container.querySelector('#btn-load')?.addEventListener('click', () => this.load());
    this.container.querySelector('#btn-new')?.addEventListener('click', () => this.createNew());
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
    // this.holdPieceCheck.checked = this.currentGameType.holdPieceEnabled; // Field might be named differently
    // this.nextPieceCheck.checked = this.currentGameType.nextPieceEnabled;
    
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
    this.currentGameType.gameMode = this.modeSelect.value as any;
    this.currentGameType.gridWidth = parseInt(this.gridWidthInput.value);
    this.currentGameType.gridHeight = parseInt(this.gridHeightInput.value);
    this.currentGameType.gravityRule_ticksToMoveDownBlocksOverBlankSpaces = parseInt(this.gravityInput.value);
    this.currentGameType.maxLockDelayTicks = parseInt(this.lockDelayInput.value);
    this.currentGameType.chainRule_AmountPerChain = parseInt(this.chainAmountInput.value);
    
    const data = this.currentGameType.toBase64GZippedXML();
    localStorage.setItem('custom-game-type', data);
    alert('Game type saved!');
  }

  private load() {
    const data = localStorage.getItem('custom-game-type');
    if (data) {
      this.currentGameType = GameType.fromBase64GZippedXML(data);
      this.loadFromGameType();
    }
  }

  private createNew() {
    this.currentGameType = new GameType();
    this.loadFromGameType();
  }
}
