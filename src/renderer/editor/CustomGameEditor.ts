import { GameType } from '../puzzle/GameType';
import { BlockType } from '../puzzle/BlockType';
import { PieceType } from '../puzzle/PieceType';

export class CustomGameEditor {
  private container: HTMLElement;
  private currentGameType: GameType;

  // UI Elements
  private nameInput: HTMLInputElement;
  private modeSelect: HTMLSelectElement;
  private gridWidthInput: HTMLInputElement;
  private gridHeightInput: HTMLInputElement;
  private gravityInput: HTMLInputElement;
  private lockDelayInput: HTMLInputElement;
  private chainAmountInput: HTMLInputElement;
  private holdPieceCheck: HTMLInputElement;
  private nextPieceCheck: HTMLInputElement;
  
  private blockList: HTMLSelectElement;
  private pieceList: HTMLSelectElement;

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
      
      <div id="tab-settings" class="tab-content active">
        <div class="form-group">
          <label>Name:</label>
          <input type="text" id="input-name" />
        </div>
        <div class="form-group">
          <label>Mode:</label>
          <select id="select-mode">
            <option value="DROP">Drop</option>
            <option value="STACK">Stack</option>
          </select>
        </div>
        <div class="form-group">
          <label>Grid Width:</label>
          <input type="number" id="input-grid-w" />
        </div>
        <div class="form-group">
          <label>Grid Height:</label>
          <input type="number" id="input-grid-h" />
        </div>
        <div class="form-group">
          <label>Gravity Ticks:</label>
          <input type="number" id="input-gravity" />
        </div>
        <div class="form-group">
          <label>Lock Delay:</label>
          <input type="number" id="input-lock" />
        </div>
        <div class="form-group">
          <label>Chain Amount:</label>
          <input type="number" id="input-chain" />
        </div>
        <div class="form-group">
          <label><input type="checkbox" id="check-hold" /> Hold Piece Enabled</label>
        </div>
        <div class="form-group">
          <label><input type="checkbox" id="check-next" /> Next Piece Enabled</label>
        </div>
      </div>
      
      <div id="tab-blocks" class="tab-content" style="display:none;">
        <div class="split-view">
          <div class="list-pane">
            <select id="list-blocks" size="10"></select>
            <div class="actions">
              <button id="btn-add-block">Add</button>
              <button id="btn-rm-block">Remove</button>
            </div>
          </div>
          <div class="editor-pane" id="block-editor-pane">
            <!-- Block editor details will go here -->
            <p>Select a block type to edit</p>
          </div>
        </div>
      </div>
      
      <div id="tab-pieces" class="tab-content" style="display:none;">
        <div class="split-view">
          <div class="list-pane">
            <select id="list-pieces" size="10"></select>
            <div class="actions">
              <button id="btn-add-piece">Add</button>
              <button id="btn-rm-piece">Remove</button>
            </div>
          </div>
          <div class="editor-pane" id="piece-editor-pane">
            <!-- Piece editor details will go here -->
            <p>Select a piece type to edit</p>
          </div>
        </div>
      </div>
    `;

    // Bind elements
    this.nameInput = this.container.querySelector('#input-name') as HTMLInputElement;
    this.modeSelect = this.container.querySelector('#select-mode') as HTMLSelectElement;
    this.gridWidthInput = this.container.querySelector('#input-grid-w') as HTMLInputElement;
    this.gridHeightInput = this.container.querySelector('#input-grid-h') as HTMLInputElement;
    this.gravityInput = this.container.querySelector('#input-gravity') as HTMLInputElement;
    this.lockDelayInput = this.container.querySelector('#input-lock') as HTMLInputElement;
    this.chainAmountInput = this.container.querySelector('#input-chain') as HTMLInputElement;
    this.holdPieceCheck = this.container.querySelector('#check-hold') as HTMLInputElement;
    this.nextPieceCheck = this.container.querySelector('#check-next') as HTMLInputElement;
    
    this.blockList = this.container.querySelector('#list-blocks') as HTMLSelectElement;
    this.pieceList = this.container.querySelector('#list-pieces') as HTMLSelectElement;

    this.bindEvents();
  }

  private bindEvents() {
    // Tabs
    const tabs = this.container.querySelectorAll('.tab-btn');
    const contents = this.container.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const target = (e.target as HTMLElement).dataset.tab;
        
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => (c as HTMLElement).style.display = 'none');
        
        (e.target as HTMLElement).classList.add('active');
        const content = this.container.querySelector(`#tab-${target}`) as HTMLElement;
        if (content) content.style.display = 'block';
      });
    });

    // Inputs (Auto-save to memory object)
    const inputs = [this.nameInput, this.modeSelect, this.gridWidthInput, this.gridHeightInput, 
                   this.gravityInput, this.lockDelayInput, this.chainAmountInput, 
                   this.holdPieceCheck, this.nextPieceCheck];
                   
    inputs.forEach(input => {
      input.addEventListener('change', () => this.saveToGameType());
    });
    
    // Main Buttons
    this.container.querySelector('#btn-save')?.addEventListener('click', () => {
      this.saveToGameType();
      console.log('Saved GameType:', this.currentGameType);
      // Implementation to save to localStorage or backend
    });
    
    this.container.querySelector('#btn-new')?.addEventListener('click', () => {
      this.currentGameType = new GameType();
      this.loadFromGameType();
    });
  }

  private loadFromGameType() {
    if (!this.currentGameType) return;
    
    this.nameInput.value = this.currentGameType.name || '';
    // This assumes GameType has these properties mapped properly based on the Java/C++ versions
    // this.modeSelect.value = this.currentGameType.gameMode;
    // this.gridWidthInput.value = this.currentGameType.gridWidth.toString();
    // this.gridHeightInput.value = this.currentGameType.gridHeight.toString();
    
    this.refreshBlockList();
    this.refreshPieceList();
  }

  private saveToGameType() {
    if (!this.currentGameType) return;
    
    this.currentGameType.name = this.nameInput.value;
    // this.currentGameType.gameMode = this.modeSelect.value as any;
    // this.currentGameType.gridWidth = parseInt(this.gridWidthInput.value, 10);
    // this.currentGameType.gridHeight = parseInt(this.gridHeightInput.value, 10);
  }

  private refreshBlockList() {
    this.blockList.innerHTML = '';
    // Populate from this.currentGameType.blockTypes
  }

  private refreshPieceList() {
    this.pieceList.innerHTML = '';
    // Populate from this.currentGameType.pieceTypes
  }
}
