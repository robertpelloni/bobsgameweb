import { GameType, BlockType, PieceType, GamePlayMode, networkManager } from '../puzzle';
import { TurnFromBlockTypeToType } from '../../shared/puzzle/BlockType';
import { Rotation } from '../../shared/puzzle/Piece';
import { BobColor } from '../../shared/BobColor';
import { BobNet } from '../puzzle/BobNet';
import { AchievementManager } from '../data/AchievementManager';
import { getAchievementIdentity } from '../data/AchievementIdentity';
import { ToastManager } from '../ui/ToastManager';

type RecentGameHistoryEntry = {
  source: 'import' | 'share';
  payload: string;
  gameName: string;
  pieceCount: number;
  rotationCount: number;
  timestamp: number;
};

type RecentEditorActionEntry = {
  label: string;
  timestamp: number;
};

type PresetSlotMetadata = {
  slot: number;
  gameName: string;
  mode: string;
  pieceCount: number;
  rotationCount: number;
  timestamp: number;
};

type PresetCatalogEntry = {
  key: 'classic' | 'sprint' | 'cascade' | 'zen' | 'stack' | 'micro';
  family: string;
  title: string;
  description: string;
  mode: 'DROP' | 'STACK';
  grid: string;
  gravityLock: string;
  preview: string;
  chain: string;
};

import { Container, Text as PIXIText } from "pixi.js";
import { GenerativeAIManager } from "./GenerativeAIManager";
import { TextInput } from "../ui/TextInput";
import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";

export class CustomGameEditor {
  public pixiContainer: Container = new Container();

  private container: HTMLElement;
  private currentGameType: GameType;

  // UI Elements
  private nameInput!: HTMLInputElement;
  private pixiNameInput!: TextInput;
  private modeSelect!: HTMLSelectElement;
  private gridWidthInput!: HTMLInputElement;
  private gridHeightInput!: HTMLInputElement;
  private gravityInput!: HTMLInputElement;
  private lockDelayInput!: HTMLInputElement;
  private chainAmountInput!: HTMLInputElement;
  private nextPiecesInput!: HTMLInputElement;
  private summaryPanel!: HTMLDivElement;
  private unifiedTemplateLibraryPanel!: HTMLDivElement;
  private librarySearchInput!: HTMLInputElement;
  private recentHistoryPanel!: HTMLDivElement;
  private recentActionsPanel!: HTMLDivElement;
  private presetSlotsPanel!: HTMLDivElement;
  private templateCatalogPanel!: HTMLDivElement;
  private cascadeGravityCheckbox!: HTMLInputElement;
  private disconnectedGravityCheckbox!: HTMLInputElement;
  private chainRowCheckbox!: HTMLInputElement;
  private chainColumnCheckbox!: HTMLInputElement;
  private chainDiagonalCheckbox!: HTMLInputElement;
  private recursiveChainCheckbox!: HTMLInputElement;
  private nextPieceEnabledCheckbox!: HTMLInputElement;
  private holdPieceEnabledCheckbox!: HTMLInputElement;
  private bagRandomizerCheckbox!: HTMLInputElement;
  private hardDropPunchCheckbox!: HTMLInputElement;
  private twoSpaceWallKickCheckbox!: HTMLInputElement;
  private diagonalWallKickCheckbox!: HTMLInputElement;
  private pieceClimbingCheckbox!: HTMLInputElement;
  private flip180Checkbox!: HTMLInputElement;
  private floorKickCheckbox!: HTMLInputElement;
  
  private blockList!: HTMLSelectElement;
  private pieceList!: HTMLSelectElement;
  private blockNameInput!: HTMLInputElement;
  private blockColorInput!: HTMLInputElement;
  private blockSpecialColorInput!: HTMLInputElement;
  private blockSpecialChanceInput!: HTMLInputElement;
  private blockSpecialFrequencyInput!: HTMLInputElement;
  private blockPaletteList!: HTMLDivElement;
  private blockNormalCheckbox!: HTMLInputElement;
  private blockGarbageCheckbox!: HTMLInputElement;
  private blockFillerCheckbox!: HTMLInputElement;
  private blockFlashingCheckbox!: HTMLInputElement;
  private blockMatchAnyColorCheckbox!: HTMLInputElement;
  private blockCounterCheckbox!: HTMLInputElement;
  private blockClearEveryOtherLineCheckbox!: HTMLInputElement;
  private blockIgnoreChainConnectionsCheckbox!: HTMLInputElement;
  private blockIgnoreMovingDownCheckbox!: HTMLInputElement;
  private blockRequireChainPresenceCheckbox!: HTMLInputElement;
  private blockAddToExplodingChainCheckbox!: HTMLInputElement;
  private blockRemoveColorFieldCheckbox!: HTMLInputElement;
  private blockDiamondColorFieldCheckbox!: HTMLInputElement;
  private blockRewardLabel!: HTMLDivElement;
  private blockConversionFromSelect!: HTMLSelectElement;
  private blockConversionToSelect!: HTMLSelectElement;
  private blockConversionList!: HTMLDivElement;
  private pieceBlockOverrideSelect!: HTMLSelectElement;

  private currentEditingRotation: number = 0;
  private currentBlockPaletteIndex: number = 0;
  private recentActions: RecentEditorActionEntry[] = [];
  private templateCatalogModeFilter: 'all' | 'DROP' | 'STACK' = 'all';
  private unifiedTemplateLibraryFilter: 'all' | 'built-in' | 'slot' | 'history' = 'all';
  private librarySearchQuery: string = '';

  constructor(parentElementId: string) {
    const parent = document.getElementById(parentElementId);
    if (!parent) throw new Error(`Element with id ${parentElementId} not found`);
    
    this.container = document.createElement('div');
    this.container.className = 'custom-game-editor';
    parent.appendChild(this.container);
    
    this.currentGameType = new GameType();
    

    const namePanel = new Panel({ width: 350, height: 80, backgroundColor: 0x111111, backgroundAlpha: 0.9, borderColor: 0x555555 });
    namePanel.setPosition(20, 380);
    const nameLabel = new PIXIText({ text: "Game Name", style: { fill: 0xcccccc, fontSize: 16 } });
    nameLabel.position.set(10, 10);
    namePanel.addChild(nameLabel);
    this.pixiNameInput = new TextInput("Enter Game Name", { width: 330, height: 30 });
    this.pixiNameInput.setPosition(10, 35);
    this.pixiNameInput.on("change", (val: string) => {
      this.nameInput.value = val;
      this.applyFormValuesToGameType();
      this.updateSummary();
    });
    namePanel.addChild(this.pixiNameInput.container);
    this.pixiContainer.addChild(namePanel.container);

    const actionPanel = new Panel({ width: 350, height: 120, backgroundColor: 0x000000, backgroundAlpha: 0.8 });
    actionPanel.setPosition(20, 20);

    const saveBtn = new Button("Save to Slot 1", { width: 140, height: 30 });
    saveBtn.on("click", () => this.savePresetSlot(1));
    saveBtn.setPosition(10, 10);
    actionPanel.addChild(saveBtn.container);


    const infoLabel = new PIXIText({ text: "Porting UI to Native Pixi", style: { fill: 0xffffff, fontSize: 16 } });
    infoLabel.position.set(10, 85);
    actionPanel.addChild(infoLabel);


    const aiPanel = new Panel({ width: 350, height: 100, backgroundColor: 0x220022, backgroundAlpha: 0.9, borderColor: 0xff00ff });
    aiPanel.setPosition(20, 140);

    const aiTitle = new PIXIText({ text: "Generative AI Tools", style: { fill: 0xff88ff, fontSize: 18, fontWeight: "bold" } });
    aiTitle.position.set(10, 10);
    aiPanel.addChild(aiTitle);

    const txt2SpriteBtn = new Button("Text-to-Sprite", { width: 150, height: 30, backgroundColor: 0x440044 });
    txt2SpriteBtn.on("click", () => GenerativeAIManager.generateSpriteFromText("blue hero character walking"));
    txt2SpriteBtn.setPosition(10, 45);
    aiPanel.addChild(txt2SpriteBtn.container);

    const txt2TileBtn = new Button("Text-to-Tileset", { width: 150, height: 30, backgroundColor: 0x440044 });
    txt2TileBtn.on("click", () => GenerativeAIManager.generateTilesetFromText("16x16 dungeon stone floor"));

    const palettePanel = new Panel({ width: 350, height: 100, backgroundColor: 0x002222, backgroundAlpha: 0.9, borderColor: 0x00ffff });
    palettePanel.setPosition(20, 260);

    const paletteTitle = new PIXIText({ text: "Color Palette", style: { fill: 0x88ffff, fontSize: 18, fontWeight: "bold" } });
    paletteTitle.position.set(10, 10);
    palettePanel.addChild(paletteTitle);

    const addColorBtn = new Button("Add Color", { width: 150, height: 30, backgroundColor: 0x004444 });
    addColorBtn.setPosition(10, 45);
    palettePanel.addChild(addColorBtn.container);

    const rmColorBtn = new Button("Remove Color", { width: 150, height: 30, backgroundColor: 0x004444 });
    rmColorBtn.setPosition(170, 45);
    palettePanel.addChild(rmColorBtn.container);

    this.pixiContainer.addChild(palettePanel.container);

    const timelinePanel = new Panel({ width: 350, height: 100, backgroundColor: 0x222200, backgroundAlpha: 0.9, borderColor: 0xffff00 });
    timelinePanel.setPosition(380, 260);

    const timelineTitle = new PIXIText({ text: "Animation Timeline", style: { fill: 0xffff88, fontSize: 18, fontWeight: "bold" } });
    timelineTitle.position.set(10, 10);
    timelinePanel.addChild(timelineTitle);

    const playBtn = new Button("Play", { width: 100, height: 30, backgroundColor: 0x444400 });
    playBtn.setPosition(10, 45);
    timelinePanel.addChild(playBtn.container);

    const stopBtn = new Button("Stop", { width: 100, height: 30, backgroundColor: 0x444400 });
    stopBtn.setPosition(120, 45);
    timelinePanel.addChild(stopBtn.container);

    this.pixiContainer.addChild(timelinePanel.container);


    txt2TileBtn.setPosition(170, 45);
    aiPanel.addChild(txt2TileBtn.container);

    this.pixiContainer.addChild(aiPanel.container);

    const saveBtn2 = new Button("Save 2", { width: 70, height: 30 });
    saveBtn2.on("click", () => this.savePresetSlot(2));
    saveBtn2.setPosition(10, 45);
    actionPanel.addChild(saveBtn2.container);
    const loadBtn2 = new Button("Load 2", { width: 70, height: 30 });
    loadBtn2.on("click", () => this.loadPresetSlot(2));
    loadBtn2.setPosition(85, 45);
    actionPanel.addChild(loadBtn2.container);
    const saveBtn3 = new Button("Save 3", { width: 70, height: 30 });
    saveBtn3.on("click", () => this.savePresetSlot(3));
    saveBtn3.setPosition(160, 45);
    actionPanel.addChild(saveBtn3.container);
    const loadBtn3 = new Button("Load 3", { width: 70, height: 30 });
    loadBtn3.on("click", () => this.loadPresetSlot(3));
    loadBtn3.setPosition(235, 45);
    actionPanel.addChild(loadBtn3.container);

    const loadBtn = new Button("Load from Slot 1", { width: 140, height: 30 });
    loadBtn.on("click", () => this.loadPresetSlot(1));
    loadBtn.setPosition(160, 10);
    actionPanel.addChild(loadBtn.container);

    this.pixiContainer.addChild(actionPanel.container);

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
        .toggle-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 16px; margin-top: 8px; }
        .toggle-grid label { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #ccc; }
        .toggle-grid input[type="checkbox"] { width: auto; }
        .rotation-overview { margin-top: 12px; }
        .rotation-overview h5 { margin: 0 0 8px 0; color: #9ed0ff; }
        .rotation-overview-list { display: flex; flex-wrap: wrap; gap: 8px; }
        .rotation-card { background: #181818; border: 1px solid #3a3a3a; border-radius: 6px; padding: 8px; min-width: 72px; cursor: pointer; }
        .rotation-card.active { border-color: #00ff88; box-shadow: 0 0 0 1px rgba(0,255,136,0.2); }
        .rotation-card.duplicate { border-color: #d4a017; }
        .rotation-card-title { font-size: 11px; color: #ccc; margin-bottom: 6px; }
        .rotation-card-count { font-size: 10px; color: #8d8d8d; margin-top: 6px; }
        .rotation-mini-grid { display: grid; grid-template-columns: repeat(4, 10px); gap: 1px; }
        .rotation-mini-cell { width: 10px; height: 10px; background: #0f0f0f; border: 1px solid #252525; }
        .rotation-mini-cell.filled { background: #00ff88; border-color: #00cc6e; }
        .recent-history-panel, .recent-actions-panel, .preset-slots-panel { margin-top: 16px; background: #151515; border: 1px solid #333; border-radius: 6px; padding: 12px; }
        .block-palette-row { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
        .preset-slot-entry { display:flex; justify-content:space-between; align-items:center; gap:10px; background:#1b1b1b; border:1px solid #2f2f2f; border-radius:6px; padding:8px; margin-top:8px; }
        .preset-slot-meta { display:flex; flex-direction:column; gap:4px; }
        .preset-slot-title { color:#fff; font-size:13px; }
        .preset-slot-details { color:#9a9a9a; font-size:11px; }
        .preset-family-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:10px; }
        .preset-family-card { background:#151515; border:1px solid #333; border-radius:6px; padding:10px; }
        .preset-family-title { color:#fff; font-size:13px; margin-bottom:4px; }
        .preset-family-description { color:#9a9a9a; font-size:11px; margin-bottom:8px; }
        .preset-family-buttons { display:flex; flex-wrap:wrap; gap:8px; }
        .template-catalog-filters { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:8px; }
        .template-catalog-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:10px; }
        .template-catalog-card { background:#1b1b1b; border:1px solid #2f2f2f; border-radius:6px; padding:10px; display:flex; flex-direction:column; gap:6px; }
        .template-catalog-title { color:#fff; font-size:13px; }
        .template-catalog-family { color:#7cff7c; font-size:11px; }
        .template-catalog-description, .template-catalog-details { color:#9a9a9a; font-size:11px; }
        .template-catalog-actions { display:flex; gap:8px; margin-top:4px; flex-wrap:wrap; }
        .library-filter-row { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:8px; }
        .library-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:10px; }
        .library-card { background:#1b1b1b; border:1px solid #2f2f2f; border-radius:6px; padding:10px; display:flex; flex-direction:column; gap:6px; }
        .library-source { color:#7cff7c; font-size:11px; }
        .library-title { color:#fff; font-size:13px; }
        .library-details { color:#9a9a9a; font-size:11px; }
        .library-actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:4px; }
        .block-palette-list { display:flex; gap:6px; flex-wrap:wrap; }
        .block-palette-swatch { width:24px; height:24px; border-radius:6px; border:2px solid #444; cursor:pointer; padding:0; }
        .block-palette-swatch.active { border-color:#fff; box-shadow:0 0 0 1px #00ff88; }
        .recent-history-panel h3, .recent-actions-panel h3 { margin: 0 0 8px 0; color: #9ed0ff; }
        .recent-history-empty, .recent-actions-empty { color: #888; font-size: 13px; }
        .recent-history-entry, .recent-action-entry { display: flex; justify-content: space-between; align-items: center; gap: 10px; background: #1b1b1b; border: 1px solid #2f2f2f; border-radius: 6px; padding: 8px; margin-top: 8px; }
        .recent-history-meta, .recent-action-meta { display: flex; flex-direction: column; gap: 4px; }
        .recent-history-title, .recent-action-title { color: #fff; font-size: 13px; }
        .recent-history-details, .recent-action-details { color: #9a9a9a; font-size: 11px; }
        .recent-history-actions { display: flex; gap: 6px; flex-wrap: wrap; }
        button { cursor: pointer; }
      </style>

      <div class="editor-header">
        <h2>Custom Game Editor</h2>
        <div>
            <button id="btn-new">New</button>
            <button id="btn-load">Load</button>
            <button id="btn-import">Import</button>
            <button id="btn-save" style="background:#004400; color:#fff; border:none; padding:5px 15px; border-radius:4px;">Save</button>
            <button id="btn-share" style="background:#004488; color:#fff; border:none; padding:5px 15px; border-radius:4px; margin-left: 10px;">Share</button>
            <button id="btn-test" style="background:#cc6600; color:#fff; border:none; padding:5px 15px; border-radius:4px; margin-left: 10px;">Test Game</button>
        </div>
      </div>
      <div class="form-group">
        <label>Quick Preset Slots</label>
        <div style="display:flex; flex-wrap:wrap; gap:8px;">
          <button id="btn-save-slot-1">Save Slot 1</button>
          <button id="btn-load-slot-1">Load Slot 1</button>
          <button id="btn-save-slot-2">Save Slot 2</button>
          <button id="btn-load-slot-2">Load Slot 2</button>
          <button id="btn-save-slot-3">Save Slot 3</button>
          <button id="btn-load-slot-3">Load Slot 3</button>
        </div>
      </div>
      <div class="form-group">
        <label>Preset Families</label>
        <div class="preset-family-grid">
          <div class="preset-family-card">
            <div class="preset-family-title">Competitive Drop</div>
            <div class="preset-family-description">Fast preview-friendly drop presets for familiar versus play and sprint tuning.</div>
            <div class="preset-family-buttons">
              <button id="btn-preset-classic">Classic Drop</button>
              <button id="btn-preset-sprint">Sprint Drop</button>
            </div>
          </div>
          <div class="preset-family-card">
            <div class="preset-family-title">Puzzle Chainers</div>
            <div class="preset-family-description">Chain-heavy presets tuned for cascade play, calmer experiments, and board-clearing setups.</div>
            <div class="preset-family-buttons">
              <button id="btn-preset-cascade">Cascade Puzzle</button>
              <button id="btn-preset-zen">Zen Garden</button>
            </div>
          </div>
          <div class="preset-family-card">
            <div class="preset-family-title">Arcade Stackers</div>
            <div class="preset-family-description">Compact stack presets for quick arcade rounds and tiny-grid challenge layouts.</div>
            <div class="preset-family-buttons">
              <button id="btn-preset-stack">Stack Arcade</button>
              <button id="btn-preset-micro">Micro Stack</button>
            </div>
          </div>
        </div>
      </div>
      <div id="unified-template-library-panel" class="preset-slots-panel"></div>
      
      <div class="form-group" style="margin-top: 16px;">
        <label>Template Library Search</label>
        <input type="text" id="library-search" placeholder="Search templates by name...">
      </div>

      <div id="template-catalog-panel" class="preset-slots-panel"></div>
      <div id="preset-slots-panel" class="preset-slots-panel"></div>
      <div id="recent-history" class="recent-history-panel"></div>
      <div id="recent-actions" class="recent-actions-panel"></div>
      
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
        <div class="form-group">
          <label>Advanced Rule Toggles</label>
          <div class="toggle-grid">
            <label><input type="checkbox" id="toggle-cascade-gravity"> Cascade gravity</label>
            <label><input type="checkbox" id="toggle-disconnected-gravity"> Only move disconnected blocks</label>
            <label><input type="checkbox" id="toggle-chain-row"> Chain checks rows</label>
            <label><input type="checkbox" id="toggle-chain-column"> Chain checks columns</label>
            <label><input type="checkbox" id="toggle-chain-diagonal"> Chain checks diagonals</label>
            <label><input type="checkbox" id="toggle-chain-recursive"> Recursive chain search</label>
          </div>
        </div>
        <div class="form-group">
          <label>Movement / Randomizer Toggles</label>
          <div class="toggle-grid">
            <label><input type="checkbox" id="toggle-next-piece-enabled"> Show next pieces</label>
            <label><input type="checkbox" id="toggle-hold-piece-enabled"> Enable hold piece</label>
            <label><input type="checkbox" id="toggle-bag-randomizer"> Use bag randomizer</label>
            <label><input type="checkbox" id="toggle-hard-drop-punch"> Hard drop punch-through</label>
            <label><input type="checkbox" id="toggle-two-space-kick"> Two-space wall kick</label>
            <label><input type="checkbox" id="toggle-diagonal-kick"> Diagonal wall kick</label>
            <label><input type="checkbox" id="toggle-piece-climbing"> Piece climbing</label>
            <label><input type="checkbox" id="toggle-flip180"> Allow 180 flip</label>
            <label><input type="checkbox" id="toggle-floor-kick"> Allow floor kick</label>
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
          <div id="block-details" class="item-details">
            <div class="form-group">
              <label>Block Name</label>
              <input type="text" id="block-name">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Primary Color</label>
                <input type="color" id="block-color" value="#808080">
              </div>
              <div class="form-group">
                <label>Special Color</label>
                <input type="color" id="block-special-color" value="#ff00ff">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Special Chance (1 in N)</label>
                <input type="number" id="block-special-chance" min="0" value="0">
              </div>
              <div class="form-group">
                <label>Special Frequency</label>
                <input type="number" id="block-special-frequency" min="0" value="0">
              </div>
            </div>
            <div class="form-group">
              <label>Color Palette</label>
              <div class="block-palette-row">
                <div id="block-color-palette" class="block-palette-list"></div>
                <button id="btn-add-block-color">Add Color</button>
                <button id="btn-remove-block-color">Remove Color</button>
              </div>
            </div>
            <div class="form-group">
              <label>Usage</label>
              <div class="toggle-grid">
                <label><input type="checkbox" id="block-use-normal"> Use in normal pieces</label>
                <label><input type="checkbox" id="block-use-garbage"> Use as garbage</label>
                <label><input type="checkbox" id="block-use-filler"> Use as filler</label>
                <label><input type="checkbox" id="block-flashing"> Flashing special</label>
                <label><input type="checkbox" id="block-match-any-color"> Match any color</label>
                <label><input type="checkbox" id="block-counter-type"> Counter type</label>
                <label><input type="checkbox" id="block-clear-every-other-line"> Clear every other line</label>
                <label><input type="checkbox" id="block-ignore-chain-connections"> Ignore chain connections</label>
                <label><input type="checkbox" id="block-ignore-moving-down"> Ignore moving down</label>
                <label><input type="checkbox" id="block-require-chain-presence"> Required in chain</label>
                <label><input type="checkbox" id="block-add-to-exploding-chain"> Add to exploding chain</label>
                <label><input type="checkbox" id="block-remove-color-field"> Remove same-color field blocks</label>
                <label><input type="checkbox" id="block-diamond-color-field"> Diamond-color field swap</label>
              </div>
            </div>
            <div class="form-group">
              <label>Clear Reward Hook</label>
              <div id="block-reward-label" style="font-size:12px; color:#aaa; margin-bottom:8px;">No reward piece assigned.</div>
              <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                <button id="btn-block-reward-selected-piece">Use Selected Piece</button>
                <button id="btn-block-reward-clear">Clear Reward</button>
              </div>
            </div>
            <div class="form-group">
              <label>Conversion Chain Hooks</label>
              <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-bottom:8px;">
                <select id="block-conversion-from"></select>
                <select id="block-conversion-to"></select>
                <button id="btn-block-add-conversion">Add Pair</button>
                <button id="btn-block-clear-conversions">Clear Pairs</button>
              </div>
              <div id="block-conversion-list" style="display:flex; flex-direction:column; gap:6px;"></div>
            </div>
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
              <button id="btn-duplicate-piece">Duplicate</button>
              <button id="btn-remove-piece">-</button>
            </div>
          </div>
          <div id="piece-details" class="item-details">
            <h4 id="piece-name-display">Select a piece</h4>
            <div style="display:flex; gap:10px; margin-bottom:10px; flex-wrap: wrap; align-items:center;">
                <button id="btn-prev-rot"> < </button>
                <span id="rot-label">Rotation: 0</span>
                <button id="btn-next-rot"> > </button>
                <button id="btn-add-rot">+ ROT</button>
                <button id="btn-duplicate-rot">Duplicate ROT</button>
                <button id="btn-normalize-rot">Normalize ROT</button>
                <button id="btn-center-rot">Center ROT</button>
                <button id="btn-center-all-rot">Center All</button>
                <button id="btn-normalize-all-rot">Normalize All</button>
                <button id="btn-remove-dup-rot">Clear Duplicates</button>
                <button id="btn-remove-empty-rot">Clear Empty</button>
                <button id="btn-remove-rot">- ROT</button>
            </div>
            <div id="piece-shape-editor" style="display:grid; grid-template-columns: repeat(4, 30px); gap: 2px; margin-top:10px;">
                <!-- 4x4 grid -->
            </div>
            <p style="font-size:12px; color:#888; margin-top:10px;">Click grid to toggle blocks</p>
            <div class="form-group" style="margin-top:12px;">
              <label>Primary Block Override</label>
              <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                <select id="piece-block-override"></select>
                <button id="btn-apply-piece-block">Apply Block</button>
                <button id="btn-clear-piece-block">Clear Block</button>
              </div>
            </div>
            <div class="rotation-overview">
              <h5>Rotation Overview</h5>
              <div id="rotation-overview-list" class="rotation-overview-list"></div>
            </div>
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
    this.unifiedTemplateLibraryPanel = this.container.querySelector('#unified-template-library-panel') as HTMLDivElement;
    this.librarySearchInput = this.container.querySelector('#library-search') as HTMLInputElement;
    this.templateCatalogPanel = this.container.querySelector('#template-catalog-panel') as HTMLDivElement;
    this.presetSlotsPanel = this.container.querySelector('#preset-slots-panel') as HTMLDivElement;
    this.recentHistoryPanel = this.container.querySelector('#recent-history') as HTMLDivElement;
    this.recentActionsPanel = this.container.querySelector('#recent-actions') as HTMLDivElement;
    this.cascadeGravityCheckbox = this.container.querySelector('#toggle-cascade-gravity') as HTMLInputElement;
    this.disconnectedGravityCheckbox = this.container.querySelector('#toggle-disconnected-gravity') as HTMLInputElement;
    this.chainRowCheckbox = this.container.querySelector('#toggle-chain-row') as HTMLInputElement;
    this.chainColumnCheckbox = this.container.querySelector('#toggle-chain-column') as HTMLInputElement;
    this.chainDiagonalCheckbox = this.container.querySelector('#toggle-chain-diagonal') as HTMLInputElement;
    this.recursiveChainCheckbox = this.container.querySelector('#toggle-chain-recursive') as HTMLInputElement;
    this.nextPieceEnabledCheckbox = this.container.querySelector('#toggle-next-piece-enabled') as HTMLInputElement;
    this.holdPieceEnabledCheckbox = this.container.querySelector('#toggle-hold-piece-enabled') as HTMLInputElement;
    this.bagRandomizerCheckbox = this.container.querySelector('#toggle-bag-randomizer') as HTMLInputElement;
    this.hardDropPunchCheckbox = this.container.querySelector('#toggle-hard-drop-punch') as HTMLInputElement;
    this.twoSpaceWallKickCheckbox = this.container.querySelector('#toggle-two-space-kick') as HTMLInputElement;
    this.diagonalWallKickCheckbox = this.container.querySelector('#toggle-diagonal-kick') as HTMLInputElement;
    this.pieceClimbingCheckbox = this.container.querySelector('#toggle-piece-climbing') as HTMLInputElement;
    this.flip180Checkbox = this.container.querySelector('#toggle-flip180') as HTMLInputElement;
    this.floorKickCheckbox = this.container.querySelector('#toggle-floor-kick') as HTMLInputElement;
    this.blockList = this.container.querySelector('#block-list') as HTMLSelectElement;
    this.pieceList = this.container.querySelector('#piece-list') as HTMLSelectElement;
    this.blockNameInput = this.container.querySelector('#block-name') as HTMLInputElement;
    this.blockColorInput = this.container.querySelector('#block-color') as HTMLInputElement;
    this.blockSpecialColorInput = this.container.querySelector('#block-special-color') as HTMLInputElement;
    this.blockSpecialChanceInput = this.container.querySelector('#block-special-chance') as HTMLInputElement;
    this.blockSpecialFrequencyInput = this.container.querySelector('#block-special-frequency') as HTMLInputElement;
    this.blockPaletteList = this.container.querySelector('#block-color-palette') as HTMLDivElement;
    this.blockNormalCheckbox = this.container.querySelector('#block-use-normal') as HTMLInputElement;
    this.blockGarbageCheckbox = this.container.querySelector('#block-use-garbage') as HTMLInputElement;
    this.blockFillerCheckbox = this.container.querySelector('#block-use-filler') as HTMLInputElement;
    this.blockFlashingCheckbox = this.container.querySelector('#block-flashing') as HTMLInputElement;
    this.blockMatchAnyColorCheckbox = this.container.querySelector('#block-match-any-color') as HTMLInputElement;
    this.blockCounterCheckbox = this.container.querySelector('#block-counter-type') as HTMLInputElement;
    this.blockClearEveryOtherLineCheckbox = this.container.querySelector('#block-clear-every-other-line') as HTMLInputElement;
    this.blockIgnoreChainConnectionsCheckbox = this.container.querySelector('#block-ignore-chain-connections') as HTMLInputElement;
    this.blockIgnoreMovingDownCheckbox = this.container.querySelector('#block-ignore-moving-down') as HTMLInputElement;
    this.blockRequireChainPresenceCheckbox = this.container.querySelector('#block-require-chain-presence') as HTMLInputElement;
    this.blockAddToExplodingChainCheckbox = this.container.querySelector('#block-add-to-exploding-chain') as HTMLInputElement;
    this.blockRemoveColorFieldCheckbox = this.container.querySelector('#block-remove-color-field') as HTMLInputElement;
    this.blockDiamondColorFieldCheckbox = this.container.querySelector('#block-diamond-color-field') as HTMLInputElement;
    this.blockRewardLabel = this.container.querySelector('#block-reward-label') as HTMLDivElement;
    this.blockConversionFromSelect = this.container.querySelector('#block-conversion-from') as HTMLSelectElement;
    this.blockConversionToSelect = this.container.querySelector('#block-conversion-to') as HTMLSelectElement;
    this.blockConversionList = this.container.querySelector('#block-conversion-list') as HTMLDivElement;
    this.pieceBlockOverrideSelect = this.container.querySelector('#piece-block-override') as HTMLSelectElement;

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
    this.container.querySelector('#btn-import')?.addEventListener('click', () => this.importSharedGame());
    this.container.querySelector('#btn-new')?.addEventListener('click', () => this.createNew());
    this.container.querySelector('#btn-save-slot-1')?.addEventListener('click', () => this.savePresetSlot(1));
    this.container.querySelector('#btn-load-slot-1')?.addEventListener('click', () => this.loadPresetSlot(1));
    this.container.querySelector('#btn-save-slot-2')?.addEventListener('click', () => this.savePresetSlot(2));
    this.container.querySelector('#btn-load-slot-2')?.addEventListener('click', () => this.loadPresetSlot(2));
    this.container.querySelector('#btn-save-slot-3')?.addEventListener('click', () => this.savePresetSlot(3));
    this.container.querySelector('#btn-load-slot-3')?.addEventListener('click', () => this.loadPresetSlot(3));
    this.container.querySelector('#btn-preset-classic')?.addEventListener('click', () => this.applyPreset('classic'));
    this.container.querySelector('#btn-preset-sprint')?.addEventListener('click', () => this.applyPreset('sprint'));
    this.container.querySelector('#btn-preset-cascade')?.addEventListener('click', () => this.applyPreset('cascade'));
    this.container.querySelector('#btn-preset-zen')?.addEventListener('click', () => this.applyPreset('zen'));
    this.container.querySelector('#btn-preset-stack')?.addEventListener('click', () => this.applyPreset('stack'));
    this.container.querySelector('#btn-preset-micro')?.addEventListener('click', () => this.applyPreset('micro'));

    this.presetSlotsPanel?.addEventListener('click', (event) => {
      const target = (event.target as HTMLElement).closest('button[data-library-load-slot], button[data-library-slot-delete]') as HTMLButtonElement | null;
      if (!target) return;
      const loadSlot = target.getAttribute('data-library-load-slot');
      const deleteSlot = target.getAttribute('data-library-slot-delete');
      if (loadSlot) this.loadPresetSlot(Number.parseInt(loadSlot, 10));
      else if (deleteSlot) this.deletePresetSlot(Number.parseInt(deleteSlot, 10));
    });

    this.templateCatalogPanel?.addEventListener('click', (event) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest('[data-template-apply], [data-template-filter], [data-template-save-slot]') as HTMLElement | null;
      if (!button) return;
      const filter = button.getAttribute('data-template-filter') as 'all' | 'DROP' | 'STACK' | null;
      if (filter) {
        this.templateCatalogModeFilter = filter;
        this.renderTemplateCatalog();
        return;
      }
      const preset = (button.getAttribute('data-template-apply') || button.getAttribute('data-template-key')) as PresetCatalogEntry['key'] | null;
      const saveSlot = button.getAttribute('data-template-save-slot');
      if (preset && saveSlot) {
        this.savePresetTemplateToSlot(preset, Number.parseInt(saveSlot, 10));
        return;
      }
      if (preset) this.applyPreset(preset);
    });

    this.unifiedTemplateLibraryPanel?.addEventListener('click', (event) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest('[data-library-filter], [data-library-preset], [data-library-save-slot], [data-library-load-slot], [data-library-history-load], [data-library-history-copy], [data-library-slot-delete], [data-library-history-delete]') as HTMLElement | null;
      if (!button) return;
      const filter = button.getAttribute('data-library-filter') as 'all' | 'built-in' | 'slot' | 'history' | null;
      if (filter) {
        this.unifiedTemplateLibraryFilter = filter;
        this.renderUnifiedTemplateLibrary();
        return;
      }
      const preset = button.getAttribute('data-library-preset') as PresetCatalogEntry['key'] | null;
      const saveSlot = button.getAttribute('data-library-save-slot');
      if (preset && saveSlot) {
        this.savePresetTemplateToSlot(preset, Number.parseInt(saveSlot, 10));
        return;
      }
      if (preset) {
        this.applyPreset(preset);
        return;
      }
      const slot = button.getAttribute('data-library-load-slot');
      if (slot) {
        this.loadPresetSlot(Number.parseInt(slot, 10));
        return;
      }
      const slotDelete = button.getAttribute('data-library-slot-delete');
      if (slotDelete) {
        this.deletePresetSlot(Number.parseInt(slotDelete, 10));
        return;
      }
      const historyLoad = button.getAttribute('data-library-history-load');
      if (historyLoad) {
        this.loadRecentHistoryEntry(Number.parseInt(historyLoad, 10));
        return;
      }
      const historyCopy = button.getAttribute('data-library-history-copy');
      if (historyCopy) {
        this.copyRecentHistoryEntry(Number.parseInt(historyCopy, 10));
        return;
      }
      const historyDelete = button.getAttribute('data-library-history-delete');
      if (historyDelete) {
        this.deleteRecentHistoryEntry(Number.parseInt(historyDelete, 10));
      }
    });

    this.librarySearchInput?.addEventListener('input', () => {
      this.librarySearchQuery = this.librarySearchInput.value.toLowerCase();
      this.renderUnifiedTemplateLibrary();
    });

    this.recentHistoryPanel?.addEventListener('click', (event) => {
      const target = (event.target as HTMLElement).closest('button[data-history-action]') as HTMLButtonElement | null;
      if (!target) return;
      const index = Number(target.dataset.historyIndex);
      if (Number.isNaN(index)) return;
      const action = target.dataset.historyAction;
      if (action === 'load') {
        this.loadRecentHistoryEntry(index);
      } else if (action === 'copy') {
        this.copyRecentHistoryEntry(index);
      } else if (action === 'delete') {
        this.deleteRecentHistoryEntry(index);
      }
    });

    [
      this.nameInput,
      this.modeSelect,
      this.gridWidthInput,
      this.gridHeightInput,
      this.gravityInput,
      this.lockDelayInput,
      this.chainAmountInput,
      this.nextPiecesInput,
      this.cascadeGravityCheckbox,
      this.disconnectedGravityCheckbox,
      this.chainRowCheckbox,
      this.chainColumnCheckbox,
      this.chainDiagonalCheckbox,
      this.recursiveChainCheckbox,
      this.nextPieceEnabledCheckbox,
      this.holdPieceEnabledCheckbox,
      this.bagRandomizerCheckbox,
      this.hardDropPunchCheckbox,
      this.twoSpaceWallKickCheckbox,
      this.diagonalWallKickCheckbox,
      this.pieceClimbingCheckbox,
      this.flip180Checkbox,
      this.floorKickCheckbox,
    ].forEach((input) => {
      input.addEventListener('input', () => this.updateSummary());
      input.addEventListener('change', () => this.updateSummary());
    });
    
    this.container.querySelector('#btn-add-block')?.addEventListener('click', () => {
        const bt = new BlockType();
        bt.name = `Block ${this.currentGameType.blockTypes.length + 1}`;
        bt.colors = [new BobColor(128, 128, 128)];
        this.currentGameType.blockTypes.push(bt);
        this.updateBlockList();
        this.blockList.selectedIndex = this.currentGameType.blockTypes.length - 1;
        this.updateBlockDetails();
        this.updateSummary();
        this.pushRecentAction(`Added block: ${bt.name}`);
    });

    this.container.querySelector('#btn-remove-block')?.addEventListener('click', () => {
        this.removeSelectedBlock();
    });

    this.blockList.addEventListener('change', () => {
        this.updateBlockDetails();
        this.syncPieceBlockOverrideControl();
    });

    this.blockNameInput.addEventListener('change', () => {
        const block = this.getSelectedBlock();
        if (!block) return;
        block.name = this.blockNameInput.value;
        this.updateBlockList();
        this.syncPieceBlockOverrideControl();
        this.updateSummary();
        this.pushRecentAction(`Renamed block to ${block.name || 'Unnamed Block'}.`);
    });

    this.blockColorInput.addEventListener('change', () => {
        const block = this.getSelectedBlock();
        if (!block) return;
        const nextColor = this.hexToBobColor(this.blockColorInput.value, block.colors[this.currentBlockPaletteIndex] ?? block.colors[0]);
        if (block.colors.length === 0) block.colors = [nextColor];
        else block.colors[this.currentBlockPaletteIndex] = nextColor;
        this.updateBlockDetails();
        this.updateSummary();
        this.pushRecentAction(`Updated block palette color for ${block.name || 'selected block'}.`);
    });

    this.blockSpecialColorInput.addEventListener('change', () => {
        const block = this.getSelectedBlock();
        if (!block) return;
        block.specialColor = this.hexToBobColor(this.blockSpecialColorInput.value, block.specialColor);
        this.updateSummary();
        this.pushRecentAction(`Updated special block color for ${block.name || 'selected block'}.`);
    });

    [this.blockSpecialChanceInput, this.blockSpecialFrequencyInput].forEach((input) => {
      input.addEventListener('change', () => {
        const block = this.getSelectedBlock();
        if (!block) return;
        block.randomSpecialBlockChanceOneOutOf = Math.max(0, parseInt(this.blockSpecialChanceInput.value || '0', 10) || 0);
        block.frequencySpecialBlockTypeOnceEveryNPieces = Math.max(0, parseInt(this.blockSpecialFrequencyInput.value || '0', 10) || 0);
        this.updateSummary();
        this.pushRecentAction(`Updated special spawning rules for ${block.name || 'selected block'}.`);
      });
    });

    this.blockPaletteList.addEventListener('click', (event) => {
      const target = (event.target as HTMLElement).closest('button[data-palette-index]') as HTMLButtonElement | null;
      if (!target) return;
      const index = Number(target.dataset.paletteIndex);
      if (Number.isNaN(index)) return;
      this.currentBlockPaletteIndex = index;
      this.updateBlockDetails();
    });

    this.container.querySelector('#btn-add-block-color')?.addEventListener('click', () => {
      const block = this.getSelectedBlock();
      if (!block) {
        ToastManager.showInfo('Select a block first.');
        return;
      }
      const sourceColor = block.colors[this.currentBlockPaletteIndex] ?? block.colors[0] ?? new BobColor(128, 128, 128);
      block.colors.push(sourceColor.clone());
      this.currentBlockPaletteIndex = block.colors.length - 1;
      this.updateBlockDetails();
      this.updateSummary();
      this.pushRecentAction(`Added palette color to ${block.name || 'selected block'}.`);
    });

    this.container.querySelector('#btn-remove-block-color')?.addEventListener('click', () => {
      const block = this.getSelectedBlock();
      if (!block) {
        ToastManager.showInfo('Select a block first.');
        return;
      }
      if (block.colors.length <= 1) {
        ToastManager.showInfo('A block needs at least one palette color.');
        return;
      }
      block.colors.splice(this.currentBlockPaletteIndex, 1);
      this.currentBlockPaletteIndex = Math.max(0, Math.min(this.currentBlockPaletteIndex, block.colors.length - 1));
      this.updateBlockDetails();
      this.updateSummary();
      this.pushRecentAction(`Removed palette color from ${block.name || 'selected block'}.`);
    });

    [
      this.blockNormalCheckbox,
      this.blockGarbageCheckbox,
      this.blockFillerCheckbox,
      this.blockFlashingCheckbox,
      this.blockMatchAnyColorCheckbox,
      this.blockCounterCheckbox,
      this.blockClearEveryOtherLineCheckbox,
      this.blockIgnoreChainConnectionsCheckbox,
      this.blockIgnoreMovingDownCheckbox,
      this.blockRequireChainPresenceCheckbox,
      this.blockAddToExplodingChainCheckbox,
      this.blockRemoveColorFieldCheckbox,
      this.blockDiamondColorFieldCheckbox,
    ].forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        const block = this.getSelectedBlock();
        if (!block) return;
        block.useInNormalPieces = this.blockNormalCheckbox.checked;
        block.useAsGarbage = this.blockGarbageCheckbox.checked;
        block.isGarbageBlockType = this.blockGarbageCheckbox.checked;
        block.useAsPlayingFieldFiller = this.blockFillerCheckbox.checked;
        block.flashingSpecialType = this.blockFlashingCheckbox.checked;
        block.matchAnyColor = this.blockMatchAnyColorCheckbox.checked;
        block.counterType = this.blockCounterCheckbox.checked;
        block.clearEveryOtherLineOnGridWhenCleared = this.blockClearEveryOtherLineCheckbox.checked;
        block.ignoreWhenCheckingChainConnections = this.blockIgnoreChainConnectionsCheckbox.checked;
        block.ignoreWhenMovingDownBlocks = this.blockIgnoreMovingDownCheckbox.checked;
        block.chainConnectionsMustContainAtLeastOneBlockWithThisTrue = this.blockRequireChainPresenceCheckbox.checked;
        block.addToChainIfConnectedUpDownLeftRightToExplodingChainBlocks = this.blockAddToExplodingChainCheckbox.checked;
        block.removeAllBlocksOfColorOnFieldBlockIsSetOn = this.blockRemoveColorFieldCheckbox.checked;
        block.changeAllBlocksOfColorOnFieldBlockIsSetOnToDiamondColor = this.blockDiamondColorFieldCheckbox.checked;
        this.updateSummary();
        this.pushRecentAction(`Updated block behavior flags for ${block.name || 'selected block'}.`);
      });
    });

    this.container.querySelector('#btn-block-reward-selected-piece')?.addEventListener('click', () => {
      this.assignSelectedPieceAsBlockReward();
    });

    this.container.querySelector('#btn-block-reward-clear')?.addEventListener('click', () => {
      this.clearSelectedBlockReward();
    });

    this.container.querySelector('#btn-block-add-conversion')?.addEventListener('click', () => {
      this.addSelectedBlockConversionPair();
    });

    this.container.querySelector('#btn-block-clear-conversions')?.addEventListener('click', () => {
      this.clearSelectedBlockConversionPairs();
    });

    this.blockConversionList.addEventListener('click', (event) => {
      const target = (event.target as HTMLElement).closest('button[data-conversion-index]') as HTMLButtonElement | null;
      if (!target) return;
      const index = Number(target.dataset.conversionIndex);
      if (Number.isNaN(index)) return;
      this.removeSelectedBlockConversionPair(index);
    });

    this.container.querySelector('#btn-apply-piece-block')?.addEventListener('click', () => {
        this.applySelectedBlockToPiece();
    });

    this.container.querySelector('#btn-clear-piece-block')?.addEventListener('click', () => {
        this.clearSelectedPieceBlockOverride();
    });

    this.container.querySelector('#btn-add-piece')?.addEventListener('click', () => {
        const pt = new PieceType();
        pt.name = `Piece ${this.currentGameType.pieceTypes.length + 1}`;
        this.currentGameType.pieceTypes.push(pt);
        this.updatePieceList();
        this.selectPiece(this.currentGameType.pieceTypes.length - 1);
        this.pushRecentAction(`Added piece: ${pt.name}`);
    });

    this.container.querySelector('#btn-duplicate-piece')?.addEventListener('click', () => {
        this.duplicateSelectedPiece();
    });

    this.container.querySelector('#btn-remove-piece')?.addEventListener('click', () => {
        this.removeSelectedPiece();
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
        this.pushRecentAction(`Added rotation ${this.currentEditingRotation} to ${pt.name || 'selected piece'}.`);
    });

    this.container.querySelector('#btn-duplicate-rot')?.addEventListener('click', () => {
        this.duplicateSelectedRotation();
    });

    this.container.querySelector('#btn-normalize-rot')?.addEventListener('click', () => {
        this.normalizeCurrentRotation();
    });

    this.container.querySelector('#btn-center-rot')?.addEventListener('click', () => {
        this.centerCurrentRotation();
    });

    this.container.querySelector('#btn-center-all-rot')?.addEventListener('click', () => {
        this.centerAllRotations();
    });

    this.container.querySelector('#btn-normalize-all-rot')?.addEventListener('click', () => {
        this.normalizeAllRotations();
    });

    this.container.querySelector('#btn-remove-dup-rot')?.addEventListener('click', () => {
        this.removeDuplicateRotations();
    });

    this.container.querySelector('#btn-remove-empty-rot')?.addEventListener('click', () => {
        this.removeEmptyRotations();
    });

    this.container.querySelector('#btn-remove-rot')?.addEventListener('click', () => {
        this.removeSelectedRotation();
    });

    this.pieceList.addEventListener('change', () => {
        this.currentEditingRotation = 0;
        this.renderPieceShapeEditor();
        this.syncPieceBlockOverrideControl();
        this.updateSummary();
    });
  }

  private renderPieceShapeEditor() {
      const ptIndex = this.pieceList.selectedIndex;
      if (ptIndex === -1) {
          this.renderRotationOverview();
          return;
      }
      
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
          this.renderRotationOverview();
          this.updateSummary();
          return;
      }
      this.currentEditingRotation = ((this.currentEditingRotation % maxRot) + maxRot) % maxRot;
      
      this.container.querySelector('#rot-label')!.textContent = `Rotation: ${this.currentEditingRotation}`;
      
      const rotation = pt.rotationSet.get(this.currentEditingRotation);
      this.renderRotationOverview();
      
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
    if (this.pixiNameInput) this.pixiNameInput.value = this.currentGameType.name;
    this.modeSelect.value = this.currentGameType.gameMode;
    this.gridWidthInput.value = this.currentGameType.gridWidth.toString();
    this.gridHeightInput.value = this.currentGameType.gridHeight.toString();
    this.gravityInput.value = this.currentGameType.gravityRule_ticksToMoveDownBlocksOverBlankSpaces.toString();
    this.lockDelayInput.value = this.currentGameType.maxLockDelayTicks.toString();
    this.chainAmountInput.value = this.currentGameType.chainRule_AmountPerChain.toString();
    this.nextPiecesInput.value = this.currentGameType.numberOfNextPiecesToShow.toString();
    this.cascadeGravityCheckbox.checked = this.currentGameType.moveDownAllLinesOverBlankSpacesAtOnce;
    this.disconnectedGravityCheckbox.checked = this.currentGameType.gravityRule_onlyMoveDownDisconnectedBlocks;
    this.chainRowCheckbox.checked = this.currentGameType.chainRule_CheckRow;
    this.chainColumnCheckbox.checked = this.currentGameType.chainRule_CheckColumn;
    this.chainDiagonalCheckbox.checked = this.currentGameType.chainRule_CheckDiagonal;
    this.recursiveChainCheckbox.checked = this.currentGameType.chainRule_CheckRecursive;
    this.nextPieceEnabledCheckbox.checked = this.currentGameType.nextPieceEnabled;
    this.holdPieceEnabledCheckbox.checked = this.currentGameType.holdPieceEnabled;
    this.bagRandomizerCheckbox.checked = this.currentGameType.currentPieceRule_getNewPiecesRandomlyOutOfBagWithOneOfEachPieceUntilEmpty;
    this.hardDropPunchCheckbox.checked = this.currentGameType.hardDropPunchThroughToLowestValidGridPosition;
    this.twoSpaceWallKickCheckbox.checked = this.currentGameType.twoSpaceWallKickAllowed;
    this.diagonalWallKickCheckbox.checked = this.currentGameType.diagonalWallKickAllowed;
    this.pieceClimbingCheckbox.checked = this.currentGameType.pieceClimbingAllowed;
    this.flip180Checkbox.checked = this.currentGameType.flip180Allowed;
    this.floorKickCheckbox.checked = this.currentGameType.floorKickAllowed;
    
    this.updateBlockList();
    this.updatePieceList();
    this.updateSummary();
    this.renderUnifiedTemplateLibrary();
    this.renderTemplateCatalog();
    this.renderPresetSlotStatus();
    this.renderRecentHistory();
    this.renderRecentActions();
  }

  private updateBlockList() {
    const previousValue = this.blockList.value;
    this.blockList.innerHTML = '';
    this.currentGameType.blockTypes.forEach(bt => {
      const option = document.createElement('option');
      option.value = bt.uuid;
      option.textContent = bt.name || 'Unnamed Block';
      this.blockList.appendChild(option);
    });
    if (this.currentGameType.blockTypes.length === 0) {
      this.blockList.selectedIndex = -1;
    } else if (previousValue) {
      const restoredIndex = this.currentGameType.blockTypes.findIndex((bt) => bt.uuid === previousValue);
      this.blockList.selectedIndex = restoredIndex >= 0 ? restoredIndex : Math.min(this.blockList.selectedIndex, this.currentGameType.blockTypes.length - 1);
      if (this.blockList.selectedIndex < 0) this.blockList.selectedIndex = 0;
    } else if (this.blockList.selectedIndex < 0) {
      this.blockList.selectedIndex = 0;
    }
    this.updateBlockDetails();
    this.syncPieceBlockOverrideControl();
  }

  private getSelectedBlock(): BlockType | null {
    const blockIndex = this.blockList.selectedIndex;
    return blockIndex >= 0 ? this.currentGameType.blockTypes[blockIndex] ?? null : null;
  }

  private bobColorToHex(color: BobColor | null | undefined): string {
    const fallback = '#808080';
    if (!color) return fallback;
    const toHex = (value: number) => value.toString(16).padStart(2, '0');
    return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
  }

  private hexToBobColor(hex: string, fallback?: BobColor | null): BobColor {
    const normalized = hex.replace('#', '').trim();
    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
      return fallback?.clone() ?? new BobColor(128, 128, 128);
    }
    return new BobColor(
      parseInt(normalized.slice(0, 2), 16),
      parseInt(normalized.slice(2, 4), 16),
      parseInt(normalized.slice(4, 6), 16),
    );
  }

  private updateBlockDetails(): void {
    const block = this.getSelectedBlock();
    const disabled = !block;
    this.blockNameInput.disabled = disabled;
    this.blockColorInput.disabled = disabled;
    this.blockSpecialColorInput.disabled = disabled;
    this.blockSpecialChanceInput.disabled = disabled;
    this.blockSpecialFrequencyInput.disabled = disabled;
    this.blockNormalCheckbox.disabled = disabled;
    this.blockGarbageCheckbox.disabled = disabled;
    this.blockFillerCheckbox.disabled = disabled;
    this.blockFlashingCheckbox.disabled = disabled;
    this.blockMatchAnyColorCheckbox.disabled = disabled;
    this.blockCounterCheckbox.disabled = disabled;
    this.blockClearEveryOtherLineCheckbox.disabled = disabled;
    this.blockIgnoreChainConnectionsCheckbox.disabled = disabled;
    this.blockIgnoreMovingDownCheckbox.disabled = disabled;
    this.blockRequireChainPresenceCheckbox.disabled = disabled;
    this.blockAddToExplodingChainCheckbox.disabled = disabled;
    this.blockRemoveColorFieldCheckbox.disabled = disabled;
    this.blockDiamondColorFieldCheckbox.disabled = disabled;

    if (!block) {
      this.blockNameInput.value = '';
      this.blockColorInput.value = '#808080';
      this.blockSpecialColorInput.value = '#ff00ff';
      this.blockSpecialChanceInput.value = '0';
      this.blockSpecialFrequencyInput.value = '0';
      this.blockNormalCheckbox.checked = false;
      this.blockGarbageCheckbox.checked = false;
      this.blockFillerCheckbox.checked = false;
      this.blockFlashingCheckbox.checked = false;
      this.blockMatchAnyColorCheckbox.checked = false;
      this.blockCounterCheckbox.checked = false;
      this.blockClearEveryOtherLineCheckbox.checked = false;
      this.blockIgnoreChainConnectionsCheckbox.checked = false;
      this.blockIgnoreMovingDownCheckbox.checked = false;
      this.blockRequireChainPresenceCheckbox.checked = false;
      this.blockAddToExplodingChainCheckbox.checked = false;
      this.blockRemoveColorFieldCheckbox.checked = false;
      this.blockDiamondColorFieldCheckbox.checked = false;
      this.blockRewardLabel.textContent = 'No reward piece assigned.';
      this.blockPaletteList.innerHTML = '';
      this.currentBlockPaletteIndex = 0;
      return;
    }

    if (!block.colors || block.colors.length === 0) {
      block.colors = [new BobColor(128, 128, 128)];
    }
    this.currentBlockPaletteIndex = Math.max(0, Math.min(this.currentBlockPaletteIndex, block.colors.length - 1));

    this.blockNameInput.value = block.name || 'Unnamed Block';
    this.blockColorInput.value = this.bobColorToHex(block.colors[this.currentBlockPaletteIndex] ?? block.colors[0] ?? block.specialColor);
    this.blockSpecialColorInput.value = this.bobColorToHex(block.specialColor ?? block.colors[0] ?? null);
    this.blockSpecialChanceInput.value = String(block.randomSpecialBlockChanceOneOutOf || 0);
    this.blockSpecialFrequencyInput.value = String(block.frequencySpecialBlockTypeOnceEveryNPieces || 0);
    this.blockNormalCheckbox.checked = block.useInNormalPieces;
    this.blockGarbageCheckbox.checked = block.useAsGarbage || block.isGarbageBlockType;
    this.blockFillerCheckbox.checked = block.useAsPlayingFieldFiller;
    this.blockFlashingCheckbox.checked = block.flashingSpecialType;
    this.blockMatchAnyColorCheckbox.checked = block.matchAnyColor;
    this.blockCounterCheckbox.checked = block.counterType;
    this.blockClearEveryOtherLineCheckbox.checked = block.clearEveryOtherLineOnGridWhenCleared;
    this.blockIgnoreChainConnectionsCheckbox.checked = block.ignoreWhenCheckingChainConnections;
    this.blockIgnoreMovingDownCheckbox.checked = block.ignoreWhenMovingDownBlocks;
    this.blockRequireChainPresenceCheckbox.checked = block.chainConnectionsMustContainAtLeastOneBlockWithThisTrue;
    this.blockAddToExplodingChainCheckbox.checked = block.addToChainIfConnectedUpDownLeftRightToExplodingChainBlocks;
    this.blockRemoveColorFieldCheckbox.checked = block.removeAllBlocksOfColorOnFieldBlockIsSetOn;
    this.blockDiamondColorFieldCheckbox.checked = block.changeAllBlocksOfColorOnFieldBlockIsSetOnToDiamondColor;
    const rewardPiece = block.makePieceTypeWhenCleared_UUID?.[0]
      ? this.currentGameType.pieceTypes.find((piece) => piece.uuid === block.makePieceTypeWhenCleared_UUID[0])?.name || 'custom reward piece'
      : null;
    this.blockRewardLabel.textContent = rewardPiece ? `Reward piece on clear: ${rewardPiece}` : 'No reward piece assigned.';
    this.blockPaletteList.innerHTML = block.colors.map((color, index) => {
      const activeClass = index === this.currentBlockPaletteIndex ? ' active' : '';
      return `<button type="button" class="block-palette-swatch${activeClass}" data-palette-index="${index}" style="background:${this.bobColorToHex(color)}" title="Palette color ${index + 1}"></button>`;
    }).join('');
    this.syncBlockConversionControls();
  }

  private syncPieceBlockOverrideControl(): void {
    if (!this.pieceBlockOverrideSelect) return;
    const selectedPiece = this.currentGameType.pieceTypes[this.pieceList.selectedIndex] ?? null;
    const currentOverride = selectedPiece?.overrideBlockTypes_UUID?.[0] ?? '';
    this.pieceBlockOverrideSelect.innerHTML = '<option value="">Use random/default block pool</option>';
    this.currentGameType.blockTypes.forEach((block) => {
      const option = document.createElement('option');
      option.value = block.uuid;
      option.textContent = block.name || 'Unnamed Block';
      this.pieceBlockOverrideSelect.appendChild(option);
    });
    this.pieceBlockOverrideSelect.value = currentOverride;
    this.pieceBlockOverrideSelect.disabled = this.pieceList.selectedIndex === -1;
  }

  private removeSelectedBlock(): void {
    const block = this.getSelectedBlock();
    if (!block) {
      ToastManager.showInfo('Select a block to remove.');
      return;
    }

    const confirmed = window.confirm(`Remove block "${block.name || 'Unnamed Block'}"? Any piece overrides using it will be cleared.`);
    if (!confirmed) {
      ToastManager.showInfo('Block removal cancelled.');
      return;
    }

    const removedUuid = block.uuid;
    const removedName = block.name || 'Unnamed Block';
    this.currentGameType.blockTypes = this.currentGameType.blockTypes.filter((candidate) => candidate.uuid !== removedUuid);
    this.currentGameType.pieceTypes.forEach((piece) => {
      piece.overrideBlockTypes_UUID = piece.overrideBlockTypes_UUID.filter((uuid) => uuid !== removedUuid);
    });
    this.currentGameType.blockTypes.forEach((candidate) => {
      candidate.whenSetTurnAllTouchingBlocksOfFromTypesIntoToTypeAndFadeOut = candidate.whenSetTurnAllTouchingBlocksOfFromTypesIntoToTypeAndFadeOut.filter((pair) => pair.fromType_UUID !== removedUuid && pair.toType_UUID !== removedUuid);
    });
    this.updateBlockList();
    this.updateSummary();
    this.pushRecentAction(`Removed block: ${removedName}`);
    ToastManager.showInfo(`Removed block: ${removedName}`);
  }

  private applySelectedBlockToPiece(): void {
    const selectedPiece = this.currentGameType.pieceTypes[this.pieceList.selectedIndex] ?? null;
    if (!selectedPiece) {
      ToastManager.showInfo('Select a piece first.');
      return;
    }

    const blockUuid = this.pieceBlockOverrideSelect.value;
    if (!blockUuid) {
      selectedPiece.overrideBlockTypes_UUID = [];
      this.updateSummary();
      this.pushRecentAction(`Cleared block override for ${selectedPiece.name || 'selected piece'}.`);
      ToastManager.showInfo('Cleared piece block override.');
      return;
    }

    const block = this.currentGameType.blockTypes.find((candidate) => candidate.uuid === blockUuid);
    if (!block) {
      ToastManager.showInfo('Selected block is no longer available.');
      return;
    }

    selectedPiece.overrideBlockTypes_UUID = [block.uuid];
    this.syncPieceBlockOverrideControl();
    this.updateSummary();
    this.pushRecentAction(`Assigned block ${block.name || 'selected block'} to ${selectedPiece.name || 'selected piece'}.`);
    ToastManager.showInfo(`Assigned block override: ${block.name || 'selected block'}.`);
  }

  private clearSelectedPieceBlockOverride(): void {
    const selectedPiece = this.currentGameType.pieceTypes[this.pieceList.selectedIndex] ?? null;
    if (!selectedPiece) {
      ToastManager.showInfo('Select a piece first.');
      return;
    }
    selectedPiece.overrideBlockTypes_UUID = [];
    this.syncPieceBlockOverrideControl();
    this.updateSummary();
    this.pushRecentAction(`Cleared block override for ${selectedPiece.name || 'selected piece'}.`);
    ToastManager.showInfo('Cleared piece block override.');
  }

  private assignSelectedPieceAsBlockReward(): void {
    const block = this.getSelectedBlock();
    const selectedPiece = this.currentGameType.pieceTypes[this.pieceList.selectedIndex] ?? null;
    if (!block) {
      ToastManager.showInfo('Select a block first.');
      return;
    }
    if (!selectedPiece) {
      ToastManager.showInfo('Select a piece to use as the clear reward.');
      return;
    }
    block.makePieceTypeWhenCleared_UUID = [selectedPiece.uuid];
    this.updateBlockDetails();
    this.updateSummary();
    this.pushRecentAction(`Assigned clear reward piece ${selectedPiece.name || 'selected piece'} to ${block.name || 'selected block'}.`);
    ToastManager.showInfo(`Assigned clear reward: ${selectedPiece.name || 'selected piece'}.`);
  }

  private clearSelectedBlockReward(): void {
    const block = this.getSelectedBlock();
    if (!block) {
      ToastManager.showInfo('Select a block first.');
      return;
    }
    block.makePieceTypeWhenCleared_UUID = [];
    this.updateBlockDetails();
    this.updateSummary();
    this.pushRecentAction(`Cleared reward piece for ${block.name || 'selected block'}.`);
    ToastManager.showInfo('Cleared block reward piece.');
  }

  private syncBlockConversionControls(): void {
    const block = this.getSelectedBlock();
    const options = ['<option value="">Select block</option>']
      .concat(this.currentGameType.blockTypes.map((candidate) => `<option value="${candidate.uuid}">${candidate.name || 'Unnamed Block'}</option>`));
    this.blockConversionFromSelect.innerHTML = options.join('');
    this.blockConversionToSelect.innerHTML = options.join('');
    const disabled = !block;
    this.blockConversionFromSelect.disabled = disabled;
    this.blockConversionToSelect.disabled = disabled;

    if (!block) {
      this.blockConversionList.innerHTML = '<div style="font-size:12px; color:#888;">Select a block to edit conversion pairs.</div>';
      return;
    }

    const entries = block.whenSetTurnAllTouchingBlocksOfFromTypesIntoToTypeAndFadeOut;
    if (!entries.length) {
      this.blockConversionList.innerHTML = '<div style="font-size:12px; color:#888;">No conversion pairs configured.</div>';
      return;
    }

    this.blockConversionList.innerHTML = entries.map((pair, index) => {
      const fromName = this.currentGameType.blockTypes.find((candidate) => candidate.uuid === pair.fromType_UUID)?.name || 'Unknown From';
      const toName = this.currentGameType.blockTypes.find((candidate) => candidate.uuid === pair.toType_UUID)?.name || 'Unknown To';
      return `<div style="display:flex; gap:8px; align-items:center; justify-content:space-between; background:#1b1b1b; border:1px solid #2f2f2f; border-radius:6px; padding:6px 8px;"><span style="font-size:12px; color:#ddd;">${fromName} → ${toName}</span><button data-conversion-index="${index}">Remove</button></div>`;
    }).join('');
  }

  private addSelectedBlockConversionPair(): void {
    const block = this.getSelectedBlock();
    if (!block) {
      ToastManager.showInfo('Select a block first.');
      return;
    }
    const fromUuid = this.blockConversionFromSelect.value;
    const toUuid = this.blockConversionToSelect.value;
    if (!fromUuid || !toUuid) {
      ToastManager.showInfo('Select both a source and target block.');
      return;
    }
    block.whenSetTurnAllTouchingBlocksOfFromTypesIntoToTypeAndFadeOut.push(new TurnFromBlockTypeToType(fromUuid, toUuid));
    this.syncBlockConversionControls();
    this.updateSummary();
    const fromName = this.currentGameType.blockTypes.find((candidate) => candidate.uuid === fromUuid)?.name || 'source block';
    const toName = this.currentGameType.blockTypes.find((candidate) => candidate.uuid === toUuid)?.name || 'target block';
    this.pushRecentAction(`Added conversion pair ${fromName} → ${toName} for ${block.name || 'selected block'}.`);
    ToastManager.showInfo(`Added conversion pair ${fromName} → ${toName}.`);
  }

  private removeSelectedBlockConversionPair(index: number): void {
    const block = this.getSelectedBlock();
    if (!block) return;
    const removed = block.whenSetTurnAllTouchingBlocksOfFromTypesIntoToTypeAndFadeOut.splice(index, 1)[0];
    this.syncBlockConversionControls();
    this.updateSummary();
    const fromName = this.currentGameType.blockTypes.find((candidate) => candidate.uuid === removed?.fromType_UUID)?.name || 'source block';
    const toName = this.currentGameType.blockTypes.find((candidate) => candidate.uuid === removed?.toType_UUID)?.name || 'target block';
    this.pushRecentAction(`Removed conversion pair ${fromName} → ${toName} from ${block.name || 'selected block'}.`);
    ToastManager.showInfo(`Removed conversion pair ${fromName} → ${toName}.`);
  }

  private clearSelectedBlockConversionPairs(): void {
    const block = this.getSelectedBlock();
    if (!block) {
      ToastManager.showInfo('Select a block first.');
      return;
    }
    if (!block.whenSetTurnAllTouchingBlocksOfFromTypesIntoToTypeAndFadeOut.length) {
      ToastManager.showInfo('No conversion pairs to clear.');
      return;
    }
    block.whenSetTurnAllTouchingBlocksOfFromTypesIntoToTypeAndFadeOut = [];
    this.syncBlockConversionControls();
    this.updateSummary();
    this.pushRecentAction(`Cleared conversion pairs for ${block.name || 'selected block'}.`);
    ToastManager.showInfo('Cleared conversion pairs.');
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

  private selectPiece(index: number): void {
    if (this.currentGameType.pieceTypes.length === 0) {
      this.pieceList.selectedIndex = -1;
      this.currentEditingRotation = 0;
      const pieceNameDisplay = this.container.querySelector('#piece-name-display');
      if (pieceNameDisplay) pieceNameDisplay.textContent = 'Select a piece';
      const grid = this.container.querySelector('#piece-shape-editor');
      if (grid) grid.innerHTML = '<div style="grid-column: span 4; color:#888;">Add a piece to start editing.</div>';
      const rotLabel = this.container.querySelector('#rot-label');
      if (rotLabel) rotLabel.textContent = 'Rotation: none';
      this.updateSummary();
      return;
    }

    const clampedIndex = Math.max(0, Math.min(index, this.currentGameType.pieceTypes.length - 1));
    this.pieceList.selectedIndex = clampedIndex;
    this.currentEditingRotation = 0;
    this.renderPieceShapeEditor();
    this.syncPieceBlockOverrideControl();
    this.updateSummary();
  }

  private cloneRotation(source: Rotation): Rotation {
    const rotation = new Rotation();
    rotation.blockOffsets = source.blockOffsets.map((offset) => ({ x: offset.x, y: offset.y }));
    return rotation;
  }

  private clonePieceType(source: PieceType): PieceType {
    const clone = new PieceType();
    clone.name = source.name ? `${source.name} Copy` : 'Piece Copy';
    clone.color = source.color ? source.color.clone() : null;
    clone.frequencySpecialPieceTypeOnceEveryNPieces = source.frequencySpecialPieceTypeOnceEveryNPieces;
    clone.randomSpecialPieceChanceOneOutOf = source.randomSpecialPieceChanceOneOutOf;
    clone.flashingSpecialType = source.flashingSpecialType;
    clone.clearEveryRowPieceIsOnIfAnySingleRowCleared = source.clearEveryRowPieceIsOnIfAnySingleRowCleared;
    clone.turnBackToNormalPieceAfterNPiecesLock = source.turnBackToNormalPieceAfterNPiecesLock;
    clone.fadeOutOnceSetInsteadOfAddedToGrid = source.fadeOutOnceSetInsteadOfAddedToGrid;
    clone.useAsNormalPiece = source.useAsNormalPiece;
    clone.useAsGarbagePiece = source.useAsGarbagePiece;
    clone.useAsPlayingFieldFillerPiece = source.useAsPlayingFieldFillerPiece;
    clone.disallowAsFirstPiece = source.disallowAsFirstPiece;
    clone.spriteName = source.spriteName;
    clone.bombPiece = source.bombPiece;
    clone.weightPiece = source.weightPiece;
    clone.pieceRemovalShooterPiece = source.pieceRemovalShooterPiece;
    clone.pieceShooterPiece = source.pieceShooterPiece;
    clone.overrideBlockTypes_UUID = [...source.overrideBlockTypes_UUID];
    clone.isGarbagePieceType = source.isGarbagePieceType;
    clone.isBomb = source.isBomb;
    clone.isWeight = source.isWeight;
    clone.isSubtractor = source.isSubtractor;
    clone.isShooter = source.isShooter;
    clone.rotationSet.rotations = source.rotationSet.rotations.map((rotation) => this.cloneRotation(rotation));
    return clone;
  }

  private duplicateSelectedPiece(): void {
    const ptIndex = this.pieceList.selectedIndex;
    if (ptIndex === -1) {
      ToastManager.showInfo('Select a piece to duplicate.');
      return;
    }

    const duplicated = this.clonePieceType(this.currentGameType.pieceTypes[ptIndex]);
    this.currentGameType.pieceTypes.splice(ptIndex + 1, 0, duplicated);
    this.updatePieceList();
    this.selectPiece(ptIndex + 1);
    this.pushRecentAction(`Duplicated piece: ${duplicated.name}`);
    ToastManager.showInfo(`Duplicated piece: ${duplicated.name}`);
  }

  private removeSelectedPiece(): void {
    const ptIndex = this.pieceList.selectedIndex;
    if (ptIndex === -1) {
      ToastManager.showInfo('Select a piece to remove.');
      return;
    }

    const target = this.currentGameType.pieceTypes[ptIndex];
    const confirmed = window.confirm(`Remove piece "${target?.name || 'Unnamed Piece'}" and all of its rotations?`);
    if (!confirmed) {
      ToastManager.showInfo('Piece removal cancelled.');
      return;
    }

    const removed = this.currentGameType.pieceTypes.splice(ptIndex, 1)[0];
    this.updatePieceList();
    this.selectPiece(Math.min(ptIndex, this.currentGameType.pieceTypes.length - 1));
    this.pushRecentAction(`Removed piece: ${removed?.name || 'Unnamed Piece'}`);
    ToastManager.showInfo(`Removed piece: ${removed?.name || 'Unnamed Piece'}`);
  }

  private duplicateSelectedRotation(): void {
    const ptIndex = this.pieceList.selectedIndex;
    if (ptIndex === -1) {
      ToastManager.showInfo('Select a piece first.');
      return;
    }

    const pt = this.currentGameType.pieceTypes[ptIndex];
    if (pt.rotationSet.size() === 0) {
      ToastManager.showInfo('No rotations to duplicate.');
      return;
    }

    const duplicate = this.cloneRotation(pt.rotationSet.get(this.currentEditingRotation));
    pt.rotationSet.rotations.splice(this.currentEditingRotation + 1, 0, duplicate);
    this.currentEditingRotation += 1;
    this.renderPieceShapeEditor();
    this.updateSummary();
    this.pushRecentAction(`Duplicated rotation for ${pt.name || 'selected piece'}.`);
    ToastManager.showInfo(`Duplicated rotation for ${pt.name || 'selected piece'}.`);
  }

  private normalizeCurrentRotation(): void {
    const ptIndex = this.pieceList.selectedIndex;
    if (ptIndex === -1) {
      ToastManager.showInfo('Select a piece first.');
      return;
    }

    const rotation = this.currentGameType.pieceTypes[ptIndex].rotationSet.get(this.currentEditingRotation);
    if (!rotation || rotation.blockOffsets.length === 0) {
      ToastManager.showInfo('No blocks to normalize.');
      return;
    }

    const minX = Math.min(...rotation.blockOffsets.map((offset) => offset.x));
    const minY = Math.min(...rotation.blockOffsets.map((offset) => offset.y));
    rotation.blockOffsets = rotation.blockOffsets.map((offset) => ({ x: offset.x - minX, y: offset.y - minY }));
    this.renderPieceShapeEditor();
    this.updateSummary();
    this.pushRecentAction('Normalized the current rotation.');
    ToastManager.showInfo('Normalized current rotation to top-left origin.');
  }

  private centerCurrentRotation(): void {
    const ptIndex = this.pieceList.selectedIndex;
    if (ptIndex === -1) {
      ToastManager.showInfo('Select a piece first.');
      return;
    }

    const rotation = this.currentGameType.pieceTypes[ptIndex].rotationSet.get(this.currentEditingRotation);
    if (!rotation || rotation.blockOffsets.length === 0) {
      ToastManager.showInfo('No blocks to center.');
      return;
    }

    this.centerRotation(rotation);
    this.renderPieceShapeEditor();
    this.updateSummary();
    this.pushRecentAction('Centered the current rotation.');
    ToastManager.showInfo('Centered current rotation inside the 4×4 editor grid.');
  }

  private centerAllRotations(): void {
    const ptIndex = this.pieceList.selectedIndex;
    if (ptIndex === -1) {
      ToastManager.showInfo('Select a piece first.');
      return;
    }

    const pt = this.currentGameType.pieceTypes[ptIndex];
    if (pt.rotationSet.size() === 0) {
      ToastManager.showInfo('No rotations to center.');
      return;
    }

    for (let i = 0; i < pt.rotationSet.size(); i++) {
      const rotation = pt.rotationSet.get(i);
      if (!rotation || rotation.blockOffsets.length === 0) continue;
      this.centerRotation(rotation);
    }

    this.renderPieceShapeEditor();
    this.updateSummary();
    this.pushRecentAction(`Centered all rotations for ${pt.name || 'selected piece'}.`);
    ToastManager.showInfo(`Centered all rotations for ${pt.name || 'selected piece'}.`);
  }

  private normalizeAllRotations(): void {
    const ptIndex = this.pieceList.selectedIndex;
    if (ptIndex === -1) {
      ToastManager.showInfo('Select a piece first.');
      return;
    }

    const pt = this.currentGameType.pieceTypes[ptIndex];
    if (pt.rotationSet.size() === 0) {
      ToastManager.showInfo('No rotations to normalize.');
      return;
    }

    for (let i = 0; i < pt.rotationSet.size(); i++) {
      const rotation = pt.rotationSet.get(i);
      if (!rotation || rotation.blockOffsets.length === 0) continue;
      const minX = Math.min(...rotation.blockOffsets.map((offset) => offset.x));
      const minY = Math.min(...rotation.blockOffsets.map((offset) => offset.y));
      rotation.blockOffsets = rotation.blockOffsets.map((offset) => ({ x: offset.x - minX, y: offset.y - minY }));
    }

    this.renderPieceShapeEditor();
    this.updateSummary();
    this.pushRecentAction(`Normalized all rotations for ${pt.name || 'selected piece'}.`);
    ToastManager.showInfo(`Normalized all rotations for ${pt.name || 'selected piece'}.`);
  }

  private centerRotation(rotation: Rotation): void {
    const xs = rotation.blockOffsets.map((offset) => offset.x);
    const ys = rotation.blockOffsets.map((offset) => offset.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    const targetMinX = Math.floor((4 - width) / 2);
    const targetMinY = Math.floor((4 - height) / 2);
    rotation.blockOffsets = rotation.blockOffsets.map((offset) => ({
      x: offset.x - minX + targetMinX,
      y: offset.y - minY + targetMinY,
    }));
  }

  private removeDuplicateRotations(): void {
    const ptIndex = this.pieceList.selectedIndex;
    if (ptIndex === -1) {
      ToastManager.showInfo('Select a piece first.');
      return;
    }

    const pt = this.currentGameType.pieceTypes[ptIndex];
    const duplicateIndices = [...this.getDuplicateRotationIndices()].sort((a, b) => b - a);
    if (duplicateIndices.length === 0) {
      ToastManager.showInfo('No duplicate rotations to remove.');
      return;
    }

    const confirmed = window.confirm(`Remove ${duplicateIndices.length} duplicate rotation(s) from "${pt.name || 'selected piece'}"?`);
    if (!confirmed) {
      ToastManager.showInfo('Duplicate cleanup cancelled.');
      return;
    }

    duplicateIndices.forEach((index) => {
      pt.rotationSet.rotations.splice(index, 1);
      if (this.currentEditingRotation >= index && this.currentEditingRotation > 0) {
        this.currentEditingRotation -= 1;
      }
    });

    this.currentEditingRotation = Math.min(this.currentEditingRotation, Math.max(0, pt.rotationSet.size() - 1));
    this.renderPieceShapeEditor();
    this.updateSummary();
    this.pushRecentAction(`Cleared ${duplicateIndices.length} duplicate rotation(s).`);
    ToastManager.showInfo(`Removed ${duplicateIndices.length} duplicate rotation(s).`);
  }

  private removeEmptyRotations(): void {
    const ptIndex = this.pieceList.selectedIndex;
    if (ptIndex === -1) {
      ToastManager.showInfo('Select a piece first.');
      return;
    }

    const pt = this.currentGameType.pieceTypes[ptIndex];
    const emptyIndices = pt.rotationSet.rotations
      .map((rotation, index) => ({ rotation, index }))
      .filter(({ rotation }) => rotation.blockOffsets.length === 0)
      .map(({ index }) => index)
      .sort((a, b) => b - a);

    if (emptyIndices.length === 0) {
      ToastManager.showInfo('No empty rotations to remove.');
      return;
    }

    const confirmed = window.confirm(`Remove ${emptyIndices.length} empty rotation(s) from "${pt.name || 'selected piece'}"?`);
    if (!confirmed) {
      ToastManager.showInfo('Empty-rotation cleanup cancelled.');
      return;
    }

    emptyIndices.forEach((index) => {
      pt.rotationSet.rotations.splice(index, 1);
      if (this.currentEditingRotation >= index && this.currentEditingRotation > 0) {
        this.currentEditingRotation -= 1;
      }
    });

    this.currentEditingRotation = Math.min(this.currentEditingRotation, Math.max(0, pt.rotationSet.size() - 1));
    this.renderPieceShapeEditor();
    this.updateSummary();
    this.pushRecentAction(`Cleared ${emptyIndices.length} empty rotation(s).`);
    ToastManager.showInfo(`Removed ${emptyIndices.length} empty rotation(s).`);
  }

  private removeSelectedRotation(): void {
    const ptIndex = this.pieceList.selectedIndex;
    if (ptIndex === -1) {
      ToastManager.showInfo('Select a piece first.');
      return;
    }

    const pt = this.currentGameType.pieceTypes[ptIndex];
    if (pt.rotationSet.size() === 0) {
      ToastManager.showInfo('No rotations to remove.');
      return;
    }

    const confirmed = window.confirm(`Remove rotation ${this.currentEditingRotation} from "${pt.name || 'selected piece'}"?`);
    if (!confirmed) {
      ToastManager.showInfo('Rotation removal cancelled.');
      return;
    }

    pt.rotationSet.rotations.splice(this.currentEditingRotation, 1);
    if (pt.rotationSet.size() === 0) {
      this.currentEditingRotation = 0;
    } else {
      this.currentEditingRotation = Math.min(this.currentEditingRotation, pt.rotationSet.size() - 1);
    }
    this.renderPieceShapeEditor();
    this.updateSummary();
    this.pushRecentAction(`Removed a rotation from ${pt.name || 'selected piece'}.`);
    ToastManager.showInfo(`Removed rotation from ${pt.name || 'selected piece'}.`);
  }

  private getRotationBlockCount(rotation: Rotation | null): number {
    return rotation?.blockOffsets.length ?? 0;
  }

  private getRotationSignature(rotation: Rotation | null): string {
    if (!rotation) return 'empty';
    return [...rotation.blockOffsets]
      .map((offset) => `${offset.x},${offset.y}`)
      .sort()
      .join('|');
  }

  private getRotationBoundingBox(rotation: Rotation | null): string {
    if (!rotation || rotation.blockOffsets.length === 0) return '0×0';
    const xs = rotation.blockOffsets.map((offset) => offset.x);
    const ys = rotation.blockOffsets.map((offset) => offset.y);
    const width = Math.max(...xs) - Math.min(...xs) + 1;
    const height = Math.max(...ys) - Math.min(...ys) + 1;
    return `${width}×${height}`;
  }

  private getRotationSymmetry(rotation: Rotation | null): string {
    if (!rotation || rotation.blockOffsets.length === 0) return 'none';
    const xs = rotation.blockOffsets.map((offset) => offset.x);
    const ys = rotation.blockOffsets.map((offset) => offset.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const occupied = new Set(rotation.blockOffsets.map((offset) => `${offset.x},${offset.y}`));

    let horizontal = true;
    let vertical = true;
    for (const offset of rotation.blockOffsets) {
      const mirrorX = maxX - (offset.x - minX);
      const mirrorY = maxY - (offset.y - minY);
      if (!occupied.has(`${mirrorX},${offset.y}`)) horizontal = false;
      if (!occupied.has(`${offset.x},${mirrorY}`)) vertical = false;
    }

    if (horizontal && vertical) return 'horizontal + vertical';
    if (horizontal) return 'horizontal';
    if (vertical) return 'vertical';
    return 'none';
  }

  private getDuplicateRotationIndices(): Set<number> {
    const selectedPiece = this.currentGameType.pieceTypes[this.pieceList.selectedIndex] ?? null;
    const duplicates = new Set<number>();
    if (!selectedPiece) return duplicates;

    const firstSeen = new Map<string, number>();
    for (let i = 0; i < selectedPiece.rotationSet.size(); i++) {
      const signature = this.getRotationSignature(selectedPiece.rotationSet.get(i));
      if (firstSeen.has(signature)) {
        duplicates.add(i);
      } else {
        firstSeen.set(signature, i);
      }
    }
    return duplicates;
  }

  private getSelectedPieceAnalytics(): { uniqueRotations: number; duplicateRotations: number } {
    const selectedPiece = this.currentGameType.pieceTypes[this.pieceList.selectedIndex] ?? null;
    if (!selectedPiece) {
      return { uniqueRotations: 0, duplicateRotations: 0 };
    }

    const signatures = new Set<string>();
    for (let i = 0; i < selectedPiece.rotationSet.size(); i++) {
      signatures.add(this.getRotationSignature(selectedPiece.rotationSet.get(i)));
    }

    return {
      uniqueRotations: signatures.size,
      duplicateRotations: Math.max(0, selectedPiece.rotationSet.size() - signatures.size),
    };
  }

  private renderRotationOverview(): void {
    const list = this.container.querySelector('#rotation-overview-list');
    if (!list) return;

    list.innerHTML = '';
    const ptIndex = this.pieceList.selectedIndex;
    if (ptIndex === -1) {
      list.innerHTML = '<div style="color:#777; font-size:12px;">Select a piece to inspect its rotations.</div>';
      return;
    }

    const pt = this.currentGameType.pieceTypes[ptIndex];
    if (!pt || pt.rotationSet.size() === 0) {
      list.innerHTML = '<div style="color:#777; font-size:12px;">No rotations yet.</div>';
      return;
    }

    const duplicateIndices = this.getDuplicateRotationIndices();

    for (let i = 0; i < pt.rotationSet.size(); i++) {
      const rotation = pt.rotationSet.get(i);
      const duplicateClass = duplicateIndices.has(i) ? ' duplicate' : '';
      const card = document.createElement('div');
      card.className = `rotation-card${i === this.currentEditingRotation ? ' active' : ''}${duplicateClass}`;
      card.onclick = () => {
        this.currentEditingRotation = i;
        this.renderPieceShapeEditor();
        this.updateSummary();
      };

      const title = document.createElement('div');
      title.className = 'rotation-card-title';
      title.textContent = `R${i}`;
      card.appendChild(title);

      const miniGrid = document.createElement('div');
      miniGrid.className = 'rotation-mini-grid';
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          const cell = document.createElement('div');
          const filled = rotation.blockOffsets.some((offset) => offset.x === x && offset.y === y);
          cell.className = `rotation-mini-cell${filled ? ' filled' : ''}`;
          miniGrid.appendChild(cell);
        }
      }
      card.appendChild(miniGrid);

      const count = document.createElement('div');
      count.className = 'rotation-card-count';
      const duplicateLabel = duplicateIndices.has(i) ? ' • duplicate' : '';
      count.textContent = `${this.getRotationBlockCount(rotation)} blocks • ${this.getRotationBoundingBox(rotation)} • ${this.getRotationSymmetry(rotation)}${duplicateLabel}`;
      card.appendChild(count);

      list.appendChild(card);
    }
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

  private getEnabledRuleLabels(): string[] {
    const labels: string[] = [];
    if (this.currentGameType.moveDownAllLinesOverBlankSpacesAtOnce) labels.push('cascade gravity');
    if (this.currentGameType.gravityRule_onlyMoveDownDisconnectedBlocks) labels.push('disconnected gravity');
    if (this.currentGameType.chainRule_CheckRow) labels.push('row chains');
    if (this.currentGameType.chainRule_CheckColumn) labels.push('column chains');
    if (this.currentGameType.chainRule_CheckDiagonal) labels.push('diagonal chains');
    if (this.currentGameType.chainRule_CheckRecursive) labels.push('recursive search');
    if (this.currentGameType.nextPieceEnabled) labels.push('next preview');
    if (this.currentGameType.holdPieceEnabled) labels.push('hold piece');
    if (this.currentGameType.currentPieceRule_getNewPiecesRandomlyOutOfBagWithOneOfEachPieceUntilEmpty) labels.push('bag randomizer');
    if (this.currentGameType.hardDropPunchThroughToLowestValidGridPosition) labels.push('hard-drop punch');
    if (this.currentGameType.twoSpaceWallKickAllowed) labels.push('two-space kick');
    if (this.currentGameType.diagonalWallKickAllowed) labels.push('diagonal kick');
    if (this.currentGameType.pieceClimbingAllowed) labels.push('piece climbing');
    if (this.currentGameType.flip180Allowed) labels.push('180 flip');
    if (this.currentGameType.floorKickAllowed) labels.push('floor kick');
    return labels;
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
    const enabledRules = this.getEnabledRuleLabels();
    const selectedRotation = selectedPiece && selectedRotationCount > 0 ? selectedPiece.rotationSet.get(this.currentEditingRotation) : null;
    const analytics = this.getSelectedPieceAnalytics();
    const symmetry = this.getRotationSymmetry(selectedRotation);
    const selectedBlock = this.getSelectedBlock();
    const selectedBlockOverride = selectedPiece?.overrideBlockTypes_UUID?.[0]
      ? this.currentGameType.blockTypes.find((block) => block.uuid === selectedPiece.overrideBlockTypes_UUID[0])?.name || 'custom block override'
      : 'default/random pool';
    const selectedBlockFlags = selectedBlock
      ? [
          selectedBlock.flashingSpecialType ? 'flashing' : null,
          selectedBlock.matchAnyColor ? 'match-any' : null,
          selectedBlock.counterType ? 'counter' : null,
          selectedBlock.clearEveryOtherLineOnGridWhenCleared ? 'clear-alt-lines' : null,
          selectedBlock.ignoreWhenCheckingChainConnections ? 'ignore-chain' : null,
          selectedBlock.ignoreWhenMovingDownBlocks ? 'ignore-moving-down' : null,
          selectedBlock.chainConnectionsMustContainAtLeastOneBlockWithThisTrue ? 'required-in-chain' : null,
          selectedBlock.addToChainIfConnectedUpDownLeftRightToExplodingChainBlocks ? 'exploding-chain-link' : null,
          selectedBlock.removeAllBlocksOfColorOnFieldBlockIsSetOn ? 'remove-color-field' : null,
          selectedBlock.changeAllBlocksOfColorOnFieldBlockIsSetOnToDiamondColor ? 'diamond-color-field' : null,
        ].filter(Boolean).join(', ') || 'none'
      : 'none';
    const selectedBlockReward = selectedBlock?.makePieceTypeWhenCleared_UUID?.[0]
      ? this.currentGameType.pieceTypes.find((piece) => piece.uuid === selectedBlock.makePieceTypeWhenCleared_UUID[0])?.name || 'custom reward piece'
      : 'none';
    const selectedBlockConversionCount = selectedBlock?.whenSetTurnAllTouchingBlocksOfFromTypesIntoToTypeAndFadeOut?.length || 0;

    this.summaryPanel.innerHTML = `
      <h3>Rules Summary</h3>
      <ul>
        <li><span class="summary-highlight">Mode:</span> ${this.modeSelect.value || this.currentGameType.gameMode}</li>
        <li><span class="summary-highlight">Grid:</span> ${this.gridWidthInput.value || this.currentGameType.gridWidth} × ${this.gridHeightInput.value || this.currentGameType.gridHeight}</li>
        <li><span class="summary-highlight">Gravity / Lock:</span> ${this.gravityInput.value || this.currentGameType.gravityRule_ticksToMoveDownBlocksOverBlankSpaces} / ${this.lockDelayInput.value || this.currentGameType.maxLockDelayTicks}</li>
        <li><span class="summary-highlight">Chain / Next:</span> ${this.chainAmountInput.value || this.currentGameType.chainRule_AmountPerChain} / ${this.nextPiecesInput.value || this.currentGameType.numberOfNextPiecesToShow}</li>
        <li><span class="summary-highlight">Pieces:</span> ${pieceCount} total, ${rotationCount} rotations, ${filledCells} filled cells</li>
        <li><span class="summary-highlight">Blocks:</span> ${blockCount} configured block types</li>
        <li><span class="summary-highlight">Selected block:</span> ${selectedBlock?.name || 'None selected'} (${selectedBlockFlags})</li>
        <li><span class="summary-highlight">Special block rules:</span> chance ${selectedBlock?.randomSpecialBlockChanceOneOutOf || 0}, frequency ${selectedBlock?.frequencySpecialBlockTypeOnceEveryNPieces || 0}</li>
        <li><span class="summary-highlight">Block clear reward:</span> ${selectedBlockReward}</li>
        <li><span class="summary-highlight">Block conversions:</span> ${selectedBlockConversionCount} pair(s)</li>
        <li><span class="summary-highlight">Editing:</span> ${selectedPieceName} (${selectedRotationCount} rotations)</li>
        <li><span class="summary-highlight">Piece block override:</span> ${selectedBlockOverride}</li>
        <li><span class="summary-highlight">Current rotation:</span> ${this.getRotationBlockCount(selectedRotation)} blocks in a ${this.getRotationBoundingBox(selectedRotation)} box</li>
        <li><span class="summary-highlight">Current symmetry:</span> ${symmetry}</li>
        <li><span class="summary-highlight">Rotation uniqueness:</span> ${analytics.uniqueRotations} unique / ${analytics.duplicateRotations} duplicate</li>
        <li><span class="summary-highlight">Enabled rules:</span> ${enabledRules.length > 0 ? enabledRules.join(', ') : 'none'}</li>
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
    this.currentGameType.moveDownAllLinesOverBlankSpacesAtOnce = this.cascadeGravityCheckbox.checked;
    this.currentGameType.gravityRule_onlyMoveDownDisconnectedBlocks = this.disconnectedGravityCheckbox.checked;
    this.currentGameType.chainRule_CheckRow = this.chainRowCheckbox.checked;
    this.currentGameType.chainRule_CheckColumn = this.chainColumnCheckbox.checked;
    this.currentGameType.chainRule_CheckDiagonal = this.chainDiagonalCheckbox.checked;
    this.currentGameType.chainRule_CheckRecursive = this.recursiveChainCheckbox.checked;
    this.currentGameType.nextPieceEnabled = this.nextPieceEnabledCheckbox.checked;
    this.currentGameType.holdPieceEnabled = this.holdPieceEnabledCheckbox.checked;
    this.currentGameType.currentPieceRule_getNewPiecesRandomlyOutOfBagWithOneOfEachPieceUntilEmpty = this.bagRandomizerCheckbox.checked;
    this.currentGameType.hardDropPunchThroughToLowestValidGridPosition = this.hardDropPunchCheckbox.checked;
    this.currentGameType.twoSpaceWallKickAllowed = this.twoSpaceWallKickCheckbox.checked;
    this.currentGameType.diagonalWallKickAllowed = this.diagonalWallKickCheckbox.checked;
    this.currentGameType.pieceClimbingAllowed = this.pieceClimbingCheckbox.checked;
    this.currentGameType.flip180Allowed = this.flip180Checkbox.checked;
    this.currentGameType.floorKickAllowed = this.floorKickCheckbox.checked;
  }

  private save() {
    this.applyFormValuesToGameType();
    
    // Save to local storage for now
    localStorage.setItem('custom-game-type', JSON.stringify(this.currentGameType));
    AchievementManager.incrementStat('customGamesCreated');
    this.saveAchievementSnapshot();
    this.updateSummary();
    this.pushRecentAction('Saved the current ruleset to browser storage.');
    ToastManager.showInfo('Custom game saved to local browser storage.');
  }

  private getPresetSlotKey(slot: number): string {
      return `custom-game-type-slot-${slot}`;
  }

  private getPresetCatalogEntries(): PresetCatalogEntry[] {
      return [
          { key: 'classic', family: 'Competitive Drop', title: 'Classic Drop', description: 'Balanced modern drop rules with hold and bag randomizer enabled.', mode: 'DROP', grid: '10×20', gravityLock: '100 / 500', preview: '3 next • hold on', chain: '4-chain • row focus' },
          { key: 'sprint', family: 'Competitive Drop', title: 'Sprint Drop', description: 'Fast preview-heavy drop tuning for speed clears and quick retries.', mode: 'DROP', grid: '10×20', gravityLock: '40 / 240', preview: '5 next • hold on', chain: '4-chain • row focus' },
          { key: 'cascade', family: 'Puzzle Chainers', title: 'Cascade Puzzle', description: 'Compact chain-oriented board with recursive cascade checks enabled.', mode: 'DROP', grid: '8×16', gravityLock: '120 / 450', preview: '3 next • hold off', chain: '3-chain • row/column/diag' },
          { key: 'zen', family: 'Puzzle Chainers', title: 'Zen Garden', description: 'Slower forgiving chain sandbox for calm experimentation and pattern setup.', mode: 'DROP', grid: '10×18', gravityLock: '220 / 900', preview: '5 next • hold on', chain: '4-chain • recursive' },
          { key: 'stack', family: 'Arcade Stackers', title: 'Stack Arcade', description: 'Compact stack rules tuned for quick arcade rounds and pressure play.', mode: 'STACK', grid: '6×12', gravityLock: '90 / 350', preview: '3 next • hold off', chain: '3-chain • row/column' },
          { key: 'micro', family: 'Arcade Stackers', title: 'Micro Stack', description: 'Tiny-grid stack challenge for dense short-form sessions.', mode: 'STACK', grid: '5×10', gravityLock: '70 / 220', preview: '2 next • hold off', chain: '3-chain • row/column' },
      ];
  }

  private getPresetSlotMetaKey(slot: number): string {
      return `custom-game-type-slot-meta-${slot}`;
  }

  private renderUnifiedTemplateLibrary(): void {
      if (!this.unifiedTemplateLibraryPanel) return;
      const filterButtons = [
          { key: 'all', label: 'All Sources' },
          { key: 'built-in', label: 'Built-In' },
          { key: 'slot', label: 'Saved Slots' },
          { key: 'history', label: 'History' },
      ].map((filter) => `<button data-library-filter="${filter.key}"${this.unifiedTemplateLibraryFilter === filter.key ? ' style="background:#00ff88; color:#111;"' : ''}>${filter.label}</button>`).join('');

      const builtInCards = (this.unifiedTemplateLibraryFilter === 'all' || this.unifiedTemplateLibraryFilter === 'built-in')
        ? this.getPresetCatalogEntries()
            .filter(e => !this.librarySearchQuery || e.title.toLowerCase().includes(this.librarySearchQuery) || e.family.toLowerCase().includes(this.librarySearchQuery))
            .map((entry) => `
          <div class="library-card">
            <div class="library-source">Built-In Template • ${entry.family}</div>
            <div class="library-title">${entry.title}</div>
            <div class="library-details">${entry.description}</div>
            <div class="library-details">${entry.mode} • Grid ${entry.grid} • Gravity/Lock ${entry.gravityLock}</div>
            <div class="library-details">${entry.preview} • ${entry.chain}</div>
            <div class="library-actions">
              <button data-library-preset="${entry.key}">Apply</button>
              <button data-library-save-slot="1" data-library-preset="${entry.key}">Save 1</button>
              <button data-library-save-slot="2" data-library-preset="${entry.key}">Save 2</button>
              <button data-library-save-slot="3" data-library-preset="${entry.key}">Save 3</button>
            </div>
          </div>
        `).join('')
        : '';

      const slotCards = (this.unifiedTemplateLibraryFilter === 'all' || this.unifiedTemplateLibraryFilter === 'slot')
        ? [1, 2, 3].map((slot) => {
            const meta = this.getPresetSlotMetadata(slot);
            if (!meta) return '';
            if (this.librarySearchQuery && !meta.gameName.toLowerCase().includes(this.librarySearchQuery)) return '';
            const when = meta.timestamp ? new Date(meta.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'saved earlier';
            return `
              <div class="library-card">
                <div class="library-source">Saved Slot</div>
                <div class="library-title">Slot ${slot}: ${this.escapeHistoryText(meta.gameName || `Slot ${slot}`)}</div>
                <div class="library-details">${meta.mode} • ${meta.pieceCount} pieces • ${meta.rotationCount} rotations • ${when}</div>
                <div class="library-actions">
                  <button data-library-load-slot="${slot}">Load</button>
                  <button data-library-slot-delete="${slot}" style="background:#440000; color:#ff8888; border-color:#660000;">Delete</button>
                </div>
              </div>
            `;
          }).join('')
        : '';

      const historyCards = (this.unifiedTemplateLibraryFilter === 'all' || this.unifiedTemplateLibraryFilter === 'history')
        ? this.getRecentHistory()
            .map((entry, index) => ({ entry, index }))
            .filter(item => !this.librarySearchQuery || item.entry.gameName.toLowerCase().includes(this.librarySearchQuery))
            .map((item) => {
            const when = new Date(item.entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return `
              <div class="library-card">
                <div class="library-source">Recent ${item.entry.source === 'share' ? 'Share' : 'Import'}</div>
                <div class="library-title">${this.escapeHistoryText(item.entry.gameName || 'Unnamed Ruleset')}</div>
                <div class="library-details">${item.entry.pieceCount} pieces • ${item.entry.rotationCount} rotations • ${when}</div>
                <div class="library-actions">
                  <button data-library-history-load="${item.index}">Load</button>
                  <button data-library-history-copy="${item.index}">Copy Link</button>
                  <button data-library-history-delete="${item.index}" style="background:#440000; color:#ff8888; border-color:#660000;">Delete</button>
                </div>
              </div>
            `;
          }).join('')
        : '';

      const cards = `${builtInCards}${slotCards}${historyCards}` || `<div class="library-card"><div class="library-title">No templates found matching filters.</div></div>`;
      this.unifiedTemplateLibraryPanel.innerHTML = `<h3>Unified Template Library</h3><div class="library-filter-row">${filterButtons}</div><div class="library-grid">${cards}</div>`;
  }

  private deletePresetSlot(slot: number): void {
      if (!confirm(`Delete saved template in slot ${slot}?`)) return;
      localStorage.removeItem(this.getPresetSlotKey(slot));
      localStorage.removeItem(this.getPresetSlotMetaKey(slot));
      this.renderUnifiedTemplateLibrary();
      this.renderPresetSlotStatus();
      this.pushRecentAction(`Deleted preset slot ${slot}.`);
      ToastManager.showInfo(`Deleted preset slot ${slot}.`);
  }

  private deleteRecentHistoryEntry(index: number): void {
      const history = this.getRecentHistory();
      const entry = history[index];
      if (!entry) return;
      if (!confirm(`Delete history entry: ${entry.gameName}?`)) return;
      history.splice(index, 1);
      this.saveRecentHistory(history);
      this.renderUnifiedTemplateLibrary();
      this.renderRecentHistory();
      this.pushRecentAction(`Deleted history entry: ${entry.gameName}.`);
      ToastManager.showInfo(`Deleted history entry.`);
  }

  private renderTemplateCatalog(): void {
      if (!this.templateCatalogPanel) return;
      const entries = this.getPresetCatalogEntries().filter((entry) => this.templateCatalogModeFilter === 'all' || entry.mode === this.templateCatalogModeFilter);
      const filterButtons = [
          { key: 'all', label: 'All Templates' },
          { key: 'DROP', label: 'Drop Templates' },
          { key: 'STACK', label: 'Stack Templates' },
      ].map((filter) => `<button data-template-filter="${filter.key}"${this.templateCatalogModeFilter === filter.key ? ' style="background:#00ff88; color:#111;"' : ''}>${filter.label}</button>`).join('');
      const cards = entries.map((entry) => `
        <div class="template-catalog-card">
          <div class="template-catalog-family">${entry.family}</div>
          <div class="template-catalog-title">${entry.title}</div>
          <div class="template-catalog-description">${entry.description}</div>
          <div class="template-catalog-details">${entry.mode} • Grid ${entry.grid} • Gravity/Lock ${entry.gravityLock}</div>
          <div class="template-catalog-details">${entry.preview} • ${entry.chain}</div>
          <div class="template-catalog-actions">
            <button data-template-apply="${entry.key}">Apply</button>
            <button data-template-save-slot="1" data-template-key="${entry.key}">Save 1</button>
            <button data-template-save-slot="2" data-template-key="${entry.key}">Save 2</button>
            <button data-template-save-slot="3" data-template-key="${entry.key}">Save 3</button>
          </div>
        </div>
      `).join('');
      this.templateCatalogPanel.innerHTML = `<h3>Template Browser</h3><div class="template-catalog-filters">${filterButtons}</div><div class="template-catalog-grid">${cards}</div>`;
  }

  private getPresetSlotMetadata(slot: number): PresetSlotMetadata | null {
      try {
          const raw = localStorage.getItem(this.getPresetSlotMetaKey(slot));
          if (raw) return JSON.parse(raw) as PresetSlotMetadata;
          const data = localStorage.getItem(this.getPresetSlotKey(slot));
          if (!data) return null;
          const gameType = GameType.fromJSON(data);
          return {
              slot,
              gameName: gameType.name || `Slot ${slot}`,
              mode: gameType.gameMode,
              pieceCount: gameType.pieceTypes.length,
              rotationCount: gameType.pieceTypes.reduce((sum, pt) => sum + pt.rotationSet.size(), 0),
              timestamp: 0,
          };
      } catch (error) {
          console.error('Failed to read preset slot metadata', error);
          return null;
      }
  }

  private renderPresetSlotStatus(): void {
      if (!this.presetSlotsPanel) return;
      const rows = [1, 2, 3].map((slot) => {
          const meta = this.getPresetSlotMetadata(slot);
          if (!meta) {
              return `<div class="preset-slot-entry"><div class="preset-slot-meta"><div class="preset-slot-title">Slot ${slot}</div><div class="preset-slot-details">Empty</div></div></div>`;
          }
          const when = meta.timestamp ? new Date(meta.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'saved earlier';
          return `
            <div class="preset-slot-entry">
              <div class="preset-slot-meta">
                <div class="preset-slot-title">Slot ${slot}: ${this.escapeHistoryText(meta.gameName || `Slot ${slot}`)}</div>
                <div class="preset-slot-details">${meta.mode} • ${meta.pieceCount} pieces • ${meta.rotationCount} rotations • ${when}</div>
              </div>
              <div class="recent-history-actions">
                <button data-library-load-slot="${slot}">Load</button>
                <button data-library-slot-delete="${slot}" style="background:#440000; color:#ff8888; border-color:#660000;">Delete</button>
              </div>
            </div>`;
      }).join('');
      this.presetSlotsPanel.innerHTML = `<h3>Saved Template Slots</h3>${rows}`;
  }

  private applyPresetToGameType(target: GameType, preset: PresetCatalogEntry['key']): void {
      switch (preset) {
          case 'classic':
              target.name = 'Classic Drop';
              target.gameMode = GamePlayMode.DROP;
              target.gridWidth = 10;
              target.gridHeight = 20;
              target.numberOfNextPiecesToShow = 3;
              target.maxLockDelayTicks = 500;
              target.gravityRule_ticksToMoveDownBlocksOverBlankSpaces = 100;
              target.chainRule_AmountPerChain = 4;
              target.moveDownAllLinesOverBlankSpacesAtOnce = false;
              target.gravityRule_onlyMoveDownDisconnectedBlocks = false;
              target.chainRule_CheckRow = true;
              target.chainRule_CheckColumn = false;
              target.chainRule_CheckDiagonal = false;
              target.chainRule_CheckRecursive = false;
              target.nextPieceEnabled = true;
              target.holdPieceEnabled = true;
              target.currentPieceRule_getNewPiecesRandomlyOutOfBagWithOneOfEachPieceUntilEmpty = true;
              target.hardDropPunchThroughToLowestValidGridPosition = false;
              target.twoSpaceWallKickAllowed = true;
              target.diagonalWallKickAllowed = true;
              target.pieceClimbingAllowed = true;
              target.flip180Allowed = true;
              target.floorKickAllowed = true;
              break;
          case 'sprint':
              target.name = 'Sprint Drop';
              target.gameMode = GamePlayMode.DROP;
              target.gridWidth = 10;
              target.gridHeight = 20;
              target.numberOfNextPiecesToShow = 5;
              target.maxLockDelayTicks = 240;
              target.gravityRule_ticksToMoveDownBlocksOverBlankSpaces = 40;
              target.chainRule_AmountPerChain = 4;
              target.moveDownAllLinesOverBlankSpacesAtOnce = false;
              target.gravityRule_onlyMoveDownDisconnectedBlocks = false;
              target.chainRule_CheckRow = true;
              target.chainRule_CheckColumn = false;
              target.chainRule_CheckDiagonal = false;
              target.chainRule_CheckRecursive = false;
              target.nextPieceEnabled = true;
              target.holdPieceEnabled = true;
              target.currentPieceRule_getNewPiecesRandomlyOutOfBagWithOneOfEachPieceUntilEmpty = true;
              target.hardDropPunchThroughToLowestValidGridPosition = false;
              target.twoSpaceWallKickAllowed = true;
              target.diagonalWallKickAllowed = true;
              target.pieceClimbingAllowed = true;
              target.flip180Allowed = true;
              target.floorKickAllowed = true;
              break;
          case 'cascade':
              target.name = 'Cascade Puzzle';
              target.gameMode = GamePlayMode.DROP;
              target.gridWidth = 8;
              target.gridHeight = 16;
              target.numberOfNextPiecesToShow = 3;
              target.maxLockDelayTicks = 450;
              target.gravityRule_ticksToMoveDownBlocksOverBlankSpaces = 120;
              target.chainRule_AmountPerChain = 3;
              target.moveDownAllLinesOverBlankSpacesAtOnce = true;
              target.gravityRule_onlyMoveDownDisconnectedBlocks = true;
              target.chainRule_CheckRow = true;
              target.chainRule_CheckColumn = true;
              target.chainRule_CheckDiagonal = true;
              target.chainRule_CheckRecursive = true;
              target.nextPieceEnabled = true;
              target.holdPieceEnabled = false;
              target.currentPieceRule_getNewPiecesRandomlyOutOfBagWithOneOfEachPieceUntilEmpty = false;
              target.hardDropPunchThroughToLowestValidGridPosition = false;
              target.twoSpaceWallKickAllowed = false;
              target.diagonalWallKickAllowed = false;
              target.pieceClimbingAllowed = false;
              target.flip180Allowed = false;
              target.floorKickAllowed = false;
              break;
          case 'zen':
              target.name = 'Zen Garden';
              target.gameMode = GamePlayMode.DROP;
              target.gridWidth = 10;
              target.gridHeight = 18;
              target.numberOfNextPiecesToShow = 5;
              target.maxLockDelayTicks = 900;
              target.gravityRule_ticksToMoveDownBlocksOverBlankSpaces = 220;
              target.chainRule_AmountPerChain = 4;
              target.moveDownAllLinesOverBlankSpacesAtOnce = true;
              target.gravityRule_onlyMoveDownDisconnectedBlocks = false;
              target.chainRule_CheckRow = true;
              target.chainRule_CheckColumn = true;
              target.chainRule_CheckDiagonal = false;
              target.chainRule_CheckRecursive = true;
              target.nextPieceEnabled = true;
              target.holdPieceEnabled = true;
              target.currentPieceRule_getNewPiecesRandomlyOutOfBagWithOneOfEachPieceUntilEmpty = true;
              target.hardDropPunchThroughToLowestValidGridPosition = false;
              target.twoSpaceWallKickAllowed = false;
              target.diagonalWallKickAllowed = false;
              target.pieceClimbingAllowed = false;
              target.flip180Allowed = true;
              target.floorKickAllowed = false;
              break;
          case 'stack':
              target.name = 'Stack Arcade';
              target.gameMode = GamePlayMode.STACK;
              target.gridWidth = 6;
              target.gridHeight = 12;
              target.numberOfNextPiecesToShow = 3;
              target.maxLockDelayTicks = 350;
              target.gravityRule_ticksToMoveDownBlocksOverBlankSpaces = 90;
              target.chainRule_AmountPerChain = 3;
              target.moveDownAllLinesOverBlankSpacesAtOnce = false;
              target.gravityRule_onlyMoveDownDisconnectedBlocks = false;
              target.chainRule_CheckRow = true;
              target.chainRule_CheckColumn = true;
              target.chainRule_CheckDiagonal = false;
              target.chainRule_CheckRecursive = false;
              target.nextPieceEnabled = true;
              target.holdPieceEnabled = false;
              target.currentPieceRule_getNewPiecesRandomlyOutOfBagWithOneOfEachPieceUntilEmpty = false;
              target.hardDropPunchThroughToLowestValidGridPosition = false;
              target.twoSpaceWallKickAllowed = true;
              target.diagonalWallKickAllowed = false;
              target.pieceClimbingAllowed = false;
              target.flip180Allowed = false;
              target.floorKickAllowed = false;
              break;
          case 'micro':
              target.name = 'Micro Stack';
              target.gameMode = GamePlayMode.STACK;
              target.gridWidth = 5;
              target.gridHeight = 10;
              target.numberOfNextPiecesToShow = 2;
              target.maxLockDelayTicks = 220;
              target.gravityRule_ticksToMoveDownBlocksOverBlankSpaces = 70;
              target.chainRule_AmountPerChain = 3;
              target.moveDownAllLinesOverBlankSpacesAtOnce = false;
              target.gravityRule_onlyMoveDownDisconnectedBlocks = false;
              target.chainRule_CheckRow = true;
              target.chainRule_CheckColumn = true;
              target.chainRule_CheckDiagonal = false;
              target.chainRule_CheckRecursive = false;
              target.nextPieceEnabled = true;
              target.holdPieceEnabled = false;
              target.currentPieceRule_getNewPiecesRandomlyOutOfBagWithOneOfEachPieceUntilEmpty = false;
              target.hardDropPunchThroughToLowestValidGridPosition = false;
              target.twoSpaceWallKickAllowed = true;
              target.diagonalWallKickAllowed = false;
              target.pieceClimbingAllowed = false;
              target.flip180Allowed = false;
              target.floorKickAllowed = false;
              break;
      }
  }

  private applyPreset(preset: PresetCatalogEntry['key']): void {
      this.applyFormValuesToGameType();
      this.applyPresetToGameType(this.currentGameType, preset);
      this.loadFromGameType();
      this.selectPiece(0);
      this.pushRecentAction(`Applied preset: ${this.currentGameType.name}`);
      ToastManager.showInfo(`Applied preset: ${this.currentGameType.name}`);
  }

  private savePresetTemplateToSlot(preset: PresetCatalogEntry['key'], slot: number): void {
      this.applyFormValuesToGameType();
      const cloned = GameType.fromJSON(JSON.stringify(this.currentGameType));
      this.applyPresetToGameType(cloned, preset);
      localStorage.setItem(this.getPresetSlotKey(slot), JSON.stringify(cloned));
      const metadata: PresetSlotMetadata = {
          slot,
          gameName: cloned.name || `Slot ${slot}`,
          mode: cloned.gameMode,
          pieceCount: cloned.pieceTypes.length,
          rotationCount: cloned.pieceTypes.reduce((sum, pt) => sum + pt.rotationSet.size(), 0),
          timestamp: Date.now(),
      };
      localStorage.setItem(this.getPresetSlotMetaKey(slot), JSON.stringify(metadata));
      this.renderPresetSlotStatus();
      this.pushRecentAction(`Saved template ${cloned.name || preset} to preset slot ${slot}.`);
      ToastManager.showInfo(`Saved template ${cloned.name || preset} to preset slot ${slot}.`);
  }

  private savePresetSlot(slot: number): void {
      this.applyFormValuesToGameType();
      localStorage.setItem(this.getPresetSlotKey(slot), JSON.stringify(this.currentGameType));
      const metadata: PresetSlotMetadata = {
          slot,
          gameName: this.currentGameType.name || `Slot ${slot}`,
          mode: this.currentGameType.gameMode,
          pieceCount: this.currentGameType.pieceTypes.length,
          rotationCount: this.currentGameType.pieceTypes.reduce((sum, pt) => sum + pt.rotationSet.size(), 0),
          timestamp: Date.now(),
      };
      localStorage.setItem(this.getPresetSlotMetaKey(slot), JSON.stringify(metadata));
      this.renderPresetSlotStatus();
      this.pushRecentAction(`Saved the current ruleset to preset slot ${slot}.`);
      ToastManager.showInfo(`Saved current ruleset to preset slot ${slot}.`);
  }

  private getRecentHistoryKey(): string {
      return 'custom-game-history';
  }

  private getRecentHistory(): RecentGameHistoryEntry[] {
      try {
          const raw = localStorage.getItem(this.getRecentHistoryKey());
          if (!raw) return [];
          const parsed = JSON.parse(raw) as RecentGameHistoryEntry[];
          return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
          console.error('Failed to read custom game history', error);
          return [];
      }
  }

  private saveRecentHistory(entries: RecentGameHistoryEntry[]): void {
      localStorage.setItem(this.getRecentHistoryKey(), JSON.stringify(entries.slice(0, 5)));
  }

  private pushRecentAction(label: string): void {
      this.recentActions = [{ label, timestamp: Date.now() }, ...this.recentActions].slice(0, 8);
      this.renderRecentActions();
  }

  private renderRecentActions(): void {
      if (!this.recentActionsPanel) return;
      if (this.recentActions.length === 0) {
          this.recentActionsPanel.innerHTML = `
            <h3>Recent Actions</h3>
            <div class="recent-actions-empty">No recent editor actions yet.</div>
          `;
          return;
      }

      const rows = this.recentActions.map((entry) => {
          const safeLabel = this.escapeHistoryText(entry.label);
          const when = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return `
            <div class="recent-action-entry">
              <div class="recent-action-meta">
                <div class="recent-action-title">${safeLabel}</div>
                <div class="recent-action-details">${when}</div>
              </div>
            </div>
          `;
      }).join('');

      this.recentActionsPanel.innerHTML = `<h3>Recent Actions</h3>${rows}`;
  }

  private escapeHistoryText(value: string): string {
      return value
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
  }

  private pushRecentHistoryEntry(source: 'import' | 'share', payload: string, gameType: GameType): void {
      const entry: RecentGameHistoryEntry = {
          source,
          payload,
          gameName: gameType.name || (source === 'share' ? 'Shared Ruleset' : 'Imported Ruleset'),
          pieceCount: gameType.pieceTypes.length,
          rotationCount: gameType.pieceTypes.reduce((sum, pt) => sum + pt.rotationSet.size(), 0),
          timestamp: Date.now(),
      };
      const deduped = this.getRecentHistory().filter((existing) => existing.payload !== payload);
      this.saveRecentHistory([entry, ...deduped]);
      this.renderRecentHistory();
  }

  private renderRecentHistory(): void {
      if (!this.recentHistoryPanel) return;
      const entries = this.getRecentHistory();
      if (entries.length === 0) {
          this.recentHistoryPanel.innerHTML = `
            <h3>Recent Share / Import History</h3>
            <div class="recent-history-empty">No recent shared or imported rulesets yet.</div>
          `;
          return;
      }

      const rows = entries.map((entry, index) => {
          const when = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const safeName = this.escapeHistoryText(entry.gameName || 'Unnamed Ruleset');
          return `
            <div class="recent-history-entry">
              <div class="recent-history-meta">
                <div class="recent-history-title">${safeName} • ${entry.source === 'share' ? 'shared' : 'imported'}</div>
                <div class="recent-history-details">${entry.pieceCount} pieces • ${entry.rotationCount} rotations • ${when}</div>
              </div>
              <div class="recent-history-actions">
                <button data-history-action="load" data-history-index="${index}">Load</button>
                <button data-history-action="copy" data-history-index="${index}">Copy Link</button>
                <button data-history-action="delete" data-history-index="${index}" style="background:#440000; color:#ff8888; border-color:#660000;">Delete</button>
              </div>
            </div>
          `;
      }).join('');

      this.recentHistoryPanel.innerHTML = `<h3>Recent Share / Import History</h3>${rows}`;
  }

  private loadRecentHistoryEntry(index: number): void {
      const entry = this.getRecentHistory()[index];
      if (!entry) {
          ToastManager.showInfo('That history entry is no longer available.');
          return;
      }
      try {
          const decoded = BobNet.fromBase64GZippedGSON(entry.payload);
          if (!decoded) throw new Error('Decoded payload was empty.');
          this.currentGameType = GameType.fromJSON(JSON.stringify(decoded));
          this.loadFromGameType();
          this.selectPiece(0);
          ToastManager.showInfo(`Loaded recent ${entry.source} history: ${entry.gameName || 'ruleset'}.`);
      } catch (error) {
          console.error(error);
          alert('Failed to load the selected history entry.');
      }
  }

  private copyRecentHistoryEntry(index: number): void {
      const entry = this.getRecentHistory()[index];
      if (!entry) {
          ToastManager.showInfo('That history entry is no longer available.');
          return;
      }
      const url = `${window.location.origin}${window.location.pathname}#play=${entry.payload}`;
      navigator.clipboard.writeText(url).then(() => {
          ToastManager.showInfo(`Copied recent ${entry.source} link to clipboard.`);
      }).catch((error) => {
          console.error('Failed to copy recent history link:', error);
          prompt('Copy this link manually:', url);
      });
  }

  private loadPresetSlot(slot: number): void {
      const data = localStorage.getItem(this.getPresetSlotKey(slot));
      if (!data) {
          ToastManager.showInfo(`Preset slot ${slot} is empty.`);
          return;
      }
      try {
          this.currentGameType = GameType.fromJSON(data);
          this.loadFromGameType();
          this.selectPiece(0);
          this.renderPresetSlotStatus();
          this.pushRecentAction(`Loaded preset slot ${slot}.`);
          ToastManager.showInfo(`Loaded preset slot ${slot}.`);
      } catch (e) {
          console.error(e);
          alert(`Failed to load preset slot ${slot}.`);
      }
  }

  private async load() {
    const data = localStorage.getItem('custom-game-type');
    if (data) {
      try {
          this.currentGameType = GameType.fromJSON(data);
          this.loadFromGameType();
          this.selectPiece(0);
          this.pushRecentAction('Loaded the saved browser ruleset.');
          alert('Game type loaded!');
      } catch (e) {
          console.error(e);
          alert('Failed to load game type.');
      }
    }
  }

  private importSharedGame(): void {
      const input = prompt('Paste a full share URL or raw #play payload:');
      if (!input) return;

      const trimmed = input.trim();
      const playIndex = trimmed.indexOf('#play=');
      const payload = playIndex >= 0 ? trimmed.substring(playIndex + 6) : trimmed;

      try {
          const decoded = BobNet.fromBase64GZippedGSON(payload);
          if (!decoded) throw new Error('Decoded payload was empty.');
          this.currentGameType = GameType.fromJSON(JSON.stringify(decoded));
          this.loadFromGameType();
          this.selectPiece(0);
          this.pushRecentHistoryEntry('import', payload, this.currentGameType);
          this.pushRecentAction(`Imported shared ruleset: ${this.currentGameType.name || 'Imported Ruleset'}.`);
          ToastManager.showInfo('Imported shared game configuration.');
      } catch (e) {
          console.error(e);
          alert('Failed to import shared game configuration.');
      }
  }

  private createNew() {
    this.currentGameType = new GameType();


    const namePanel = new Panel({ width: 350, height: 80, backgroundColor: 0x111111, backgroundAlpha: 0.9, borderColor: 0x555555 });
    namePanel.setPosition(20, 380);
    const nameLabel = new PIXIText({ text: "Game Name", style: { fill: 0xcccccc, fontSize: 16 } });
    nameLabel.position.set(10, 10);
    namePanel.addChild(nameLabel);
    this.pixiNameInput = new TextInput("Enter Game Name", { width: 330, height: 30 });
    this.pixiNameInput.setPosition(10, 35);
    this.pixiNameInput.on("change", (val: string) => {
      this.nameInput.value = val;
      this.applyFormValuesToGameType();
      this.updateSummary();
    });
    namePanel.addChild(this.pixiNameInput.container);
    this.pixiContainer.addChild(namePanel.container);

    const actionPanel = new Panel({ width: 350, height: 120, backgroundColor: 0x000000, backgroundAlpha: 0.8 });
    actionPanel.setPosition(20, 20);

    const saveBtn = new Button("Save to Slot 1", { width: 140, height: 30 });
    saveBtn.on("click", () => this.savePresetSlot(1));
    saveBtn.setPosition(10, 10);
    actionPanel.addChild(saveBtn.container);


    const infoLabel = new PIXIText({ text: "Porting UI to Native Pixi", style: { fill: 0xffffff, fontSize: 16 } });
    infoLabel.position.set(10, 85);
    actionPanel.addChild(infoLabel);


    const aiPanel = new Panel({ width: 350, height: 100, backgroundColor: 0x220022, backgroundAlpha: 0.9, borderColor: 0xff00ff });
    aiPanel.setPosition(20, 140);

    const aiTitle = new PIXIText({ text: "Generative AI Tools", style: { fill: 0xff88ff, fontSize: 18, fontWeight: "bold" } });
    aiTitle.position.set(10, 10);
    aiPanel.addChild(aiTitle);

    const txt2SpriteBtn = new Button("Text-to-Sprite", { width: 150, height: 30, backgroundColor: 0x440044 });
    txt2SpriteBtn.on("click", () => GenerativeAIManager.generateSpriteFromText("blue hero character walking"));
    txt2SpriteBtn.setPosition(10, 45);
    aiPanel.addChild(txt2SpriteBtn.container);

    const txt2TileBtn = new Button("Text-to-Tileset", { width: 150, height: 30, backgroundColor: 0x440044 });
    txt2TileBtn.on("click", () => GenerativeAIManager.generateTilesetFromText("16x16 dungeon stone floor"));

    const palettePanel = new Panel({ width: 350, height: 100, backgroundColor: 0x002222, backgroundAlpha: 0.9, borderColor: 0x00ffff });
    palettePanel.setPosition(20, 260);

    const paletteTitle = new PIXIText({ text: "Color Palette", style: { fill: 0x88ffff, fontSize: 18, fontWeight: "bold" } });
    paletteTitle.position.set(10, 10);
    palettePanel.addChild(paletteTitle);

    const addColorBtn = new Button("Add Color", { width: 150, height: 30, backgroundColor: 0x004444 });
    addColorBtn.setPosition(10, 45);
    palettePanel.addChild(addColorBtn.container);

    const rmColorBtn = new Button("Remove Color", { width: 150, height: 30, backgroundColor: 0x004444 });
    rmColorBtn.setPosition(170, 45);
    palettePanel.addChild(rmColorBtn.container);

    this.pixiContainer.addChild(palettePanel.container);

    const timelinePanel = new Panel({ width: 350, height: 100, backgroundColor: 0x222200, backgroundAlpha: 0.9, borderColor: 0xffff00 });
    timelinePanel.setPosition(380, 260);

    const timelineTitle = new PIXIText({ text: "Animation Timeline", style: { fill: 0xffff88, fontSize: 18, fontWeight: "bold" } });
    timelineTitle.position.set(10, 10);
    timelinePanel.addChild(timelineTitle);

    const playBtn = new Button("Play", { width: 100, height: 30, backgroundColor: 0x444400 });
    playBtn.setPosition(10, 45);
    timelinePanel.addChild(playBtn.container);

    const stopBtn = new Button("Stop", { width: 100, height: 30, backgroundColor: 0x444400 });
    stopBtn.setPosition(120, 45);
    timelinePanel.addChild(stopBtn.container);

    this.pixiContainer.addChild(timelinePanel.container);


    txt2TileBtn.setPosition(170, 45);
    aiPanel.addChild(txt2TileBtn.container);

    this.pixiContainer.addChild(aiPanel.container);

    const saveBtn2 = new Button("Save 2", { width: 70, height: 30 });
    saveBtn2.on("click", () => this.savePresetSlot(2));
    saveBtn2.setPosition(10, 45);
    actionPanel.addChild(saveBtn2.container);
    const loadBtn2 = new Button("Load 2", { width: 70, height: 30 });
    loadBtn2.on("click", () => this.loadPresetSlot(2));
    loadBtn2.setPosition(85, 45);
    actionPanel.addChild(loadBtn2.container);
    const saveBtn3 = new Button("Save 3", { width: 70, height: 30 });
    saveBtn3.on("click", () => this.savePresetSlot(3));
    saveBtn3.setPosition(160, 45);
    actionPanel.addChild(saveBtn3.container);
    const loadBtn3 = new Button("Load 3", { width: 70, height: 30 });
    loadBtn3.on("click", () => this.loadPresetSlot(3));
    loadBtn3.setPosition(235, 45);
    actionPanel.addChild(loadBtn3.container);

    const loadBtn = new Button("Load from Slot 1", { width: 140, height: 30 });
    loadBtn.on("click", () => this.loadPresetSlot(1));
    loadBtn.setPosition(160, 10);
    actionPanel.addChild(loadBtn.container);

    this.pixiContainer.addChild(actionPanel.container);
    this.loadFromGameType();
    this.selectPiece(0);
    this.updateSummary();
    this.pushRecentAction('Started a new custom ruleset.');
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
      this.pushRecentHistoryEntry('share', b64, this.currentGameType);
      this.pushRecentAction(`Generated a share link for ${this.currentGameType.name || 'current ruleset'}.`);
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
