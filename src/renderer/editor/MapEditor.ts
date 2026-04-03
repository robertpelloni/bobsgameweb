import { Container, Graphics, Application, FederatedPointerEvent, Texture, Sprite } from 'pixi.js';
import { MapData } from '../../shared/MapData';
import { GameMap } from '../engine/map/GameMap';
import { Tileset } from '../../shared/Tileset';
import { Palette } from '../../shared/Palette';
import { BobColor } from '../../shared/BobColor';
import { networkManager } from '../puzzle';
import { SERVER_URL } from '../../shared/Config';

import { AutoTiler } from '../../shared/AutoTiler';

export class MapEditor {
    private app: Application;
    private container: HTMLElement;
    private mapContainer: Container;
    
    private currentMap: GameMap | null = null;
    private tileset: Tileset;
    private palette: Palette;

    private selectedLayer: number = MapData.MAP_GROUND_LAYER;
    private selectedTile: number = 1;
    private isPainting: boolean = false;

    private activeTab: string = 'map';
    private currentFrameIndex: number = 0;
    private spriteFrames: Uint8ClampedArray[] = [new Uint8ClampedArray(128 * 128 * 4).fill(0)];
    private spriteTool: 'pencil' | 'fill' = 'pencil';
    private mapTool: 'pencil' | 'fill' | 'rect' | 'entity' | 'autotile' = 'pencil';
    private isDrawingSprite: boolean = false;
    private isPaintingMap: boolean = false;

    constructor(parentElementId: string, app: Application) {
        this.app = app;
        const parent = document.getElementById(parentElementId);
        if (!parent) throw new Error(`Element with id ${parentElementId} not found`);

        this.container = document.createElement('div');
        this.container.className = 'map-editor-ui';
        parent.appendChild(this.container);

        this.mapContainer = new Container();
        this.app.stage.addChild(this.mapContainer);

        this.tileset = new Tileset(5000);
        this.palette = new Palette(256);
        this.createDummyData();

        this.buildUI();
        this.setupMapInteractions();
    }

    private createDummyData() {
        for (let i = 1; i < 10; i++) {
            const color = new BobColor(i * 20, 100 + i * 10, 50, 255);
            this.palette.setColor(i, color);
            for (let x = 0; x < 8; x++) {
                for (let y = 0; y < 8; y++) {
                    this.tileset.setPixel(i, x, y, i);
                }
            }
        }

        // Create 16-tile Auto-Tile blob (Tiles 100-115)
        const autoColor = new BobColor(0, 200, 0, 255); // Green grass
        const edgeColor = new BobColor(100, 100, 0, 255); // Brown dirt edge
        this.palette.setColor(100, autoColor);
        this.palette.setColor(101, edgeColor);

        for (let i = 0; i < 16; i++) {
            const tileId = 100 + i;
            for (let x = 0; x < 8; x++) {
                for (let y = 0; y < 8; y++) {
                    let isEdge = false;
                    // Bitmask: N=1, E=2, S=4, W=8
                    if (!(i & 1) && y < 2) isEdge = true; // No North neighbor
                    if (!(i & 2) && x > 5) isEdge = true; // No East neighbor
                    if (!(i & 4) && y > 5) isEdge = true; // No South neighbor
                    if (!(i & 8) && x < 2) isEdge = true; // No West neighbor

                    this.tileset.setPixel(tileId, x, y, isEdge ? 101 : 100);
                }
            }
        }
    }

    private buildUI(): void {
        this.container.innerHTML = `
            <style>
                .map-editor-ui {
                    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                    pointer-events: none; display: flex; flex-direction: column;
                    font-family: 'Segoe UI', sans-serif; background: rgba(0,0,0,0.3);
                }
                .editor-top-bar {
                    height: 45px; background: #111; color: #00ff00;
                    display: flex; align-items: center; padding: 0 15px;
                    pointer-events: auto; border-bottom: 1px solid #333;
                }
                .editor-tabs {
                    display: flex; background: #222; pointer-events: auto;
                }
                .tab-btn {
                    padding: 8px 20px; cursor: pointer; color: #888; border: none; background: none;
                }
                .tab-btn.active {
                    background: #333; color: #00ff00; border-bottom: 2px solid #00ff00;
                }
                .editor-main-area { flex-grow: 1; display: flex; }
                .editor-panel {
                    width: 280px; background: rgba(20, 20, 20, 0.95);
                    border-right: 1px solid #333; pointer-events: auto;
                    overflow-y: auto; color: #ccc;
                }
                .panel-section { padding: 15px; border-bottom: 1px solid #333; }
                .panel-section h3 { margin: 0 0 10px 0; font-size: 12px; color: #00ff00; text-transform: uppercase; }
                .layer-item { padding: 4px 8px; margin: 2px 0; cursor: pointer; font-size: 12px; }
                .layer-item.selected { background: #004400; color: #00ff00; }
                .tile-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(32px, 1fr)); gap: 4px; }
                .tile-item { width: 32px; height: 32px; border: 1px solid #444; cursor: pointer; image-rendering: pixelated; }
                .tile-item.selected { border: 2px solid #00ff00; }
                button { background: #333; color: #eee; border: 1px solid #555; padding: 5px 10px; cursor: pointer; border-radius: 3px; }
                .hidden { display: none !important; }
            </style>
            <div class="editor-top-bar">
                <div style="font-weight:bold; margin-right: 20px;">OK-ENGINE OMNI-EDITOR</div>
                <button id="btn-save-server">SAVE SERVER</button>
                <button id="btn-load-server">LOAD SERVER</button>
                <div style="flex-grow:1"></div>
                <button id="btn-exit-editor" style="color: #ff4444;">EXIT</button>
            </div>
            <div class="editor-tabs">
                <button class="tab-btn active" data-tab="map">MAP</button>
                <button class="tab-btn" data-tab="sprites">SPRITES</button>
                <button class="tab-btn" data-tab="entities">ENTITIES</button>
                <button class="tab-btn" data-tab="assets">ASSETS</button>
            </div>
            <div class="editor-main-area">
                <div id="panel-map" class="editor-panel">
                    <div class="panel-section">
                        <h3>Layers</h3>
                        <div id="layer-list"></div>
                    </div>
                    <div class="panel-section">
                        <h3>Tools</h3>
                        <button id="tool-pencil">PENCIL</button>
                        <button id="tool-fill">FILL</button>
                        <button id="tool-autotile">AUTO-TILE</button>
                        <div style="margin-top:10px; display:grid; grid-template-columns:repeat(3, 1fr); gap:2px;">
                            <div></div><button id="btn-shift-up">↑</button><div></div>
                            <button id="btn-shift-left">←</button><div></div><button id="btn-shift-right">→</button>
                            <div></div><button id="btn-shift-down">↓</button><div></div>
                        </div>
                    </div>
                </div>
                <div id="panel-sprites" class="editor-panel hidden">
                    <div class="panel-section">
                        <h3>Sprites</h3>
                        <select id="sprite-list" style="width:100%; height:150px; background:#111; color:#fff;" size="10"></select>
                    </div>
                    <div class="panel-section">
                        <h3>Layers & Frames (Aseprite Parity)</h3>
                        <div style="display:flex; gap:10px; margin-bottom:10px;">
                            <button id="btn-add-frame">ADD FRAME</button>
                            <button id="btn-add-sprite-layer">ADD LAYER</button>
                        </div>
                        <div id="timeline" style="height:60px; background:#111; overflow-x:auto; display:flex; gap:2px; padding:5px;"></div>
                    </div>
                    <div class="panel-section">
                        <h3>Canvas</h3>
                        <div style="position:relative; width:128px; height:128px; margin:0 auto;">
                            <canvas id="onion-skin" width="128" height="128" style="position:absolute; top:0; left:0; pointer-events:none; opacity:0.3;"></canvas>
                            <canvas id="sprite-canvas" width="128" height="128" style="position:absolute; top:0; left:0; background:#000; border:1px solid #00ff00; cursor:crosshair;"></canvas>
                        </div>
                        <div style="margin-top:10px; display:flex; gap:5px; justify-content:center;">
                            <button id="sprite-tool-pencil" class="selected">PENCIL</button>
                            <button id="sprite-tool-fill">FILL</button>
                            <label><input type="checkbox" id="onion-skin-toggle"> ONION SKIN</label>
                        </div>
                    </div>
                </div>
                <div id="panel-entities" class="editor-panel hidden">
                    <div class="panel-section"><h3>Actors</h3><div id="actor-list"></div></div>
                </div>
                <div id="panel-assets" class="editor-panel hidden">
                    <div class="panel-section">
                        <h3>Server Assets</h3>
                        <div style="display:flex; gap:5px; margin-bottom:10px;">
                            <button id="btn-list-sprites">SPRITES</button>
                            <button id="btn-list-audio">AUDIO</button>
                        </div>
                        <div id="asset-browser-list" style="background:#111; height:400px; overflow-y:auto; padding:5px;">
                            <!-- Assets listed here -->
                        </div>
                    </div>
                </div>
                <div style="flex-grow:1; pointer-events:none;"></div>
                <div class="editor-panel" style="border-right:none; border-left:1px solid #333;">
                    <div class="panel-section">
                        <h3>Tileset</h3>
                        <div id="tile-list" class="tile-grid"></div>
                    </div>
                </div>
            </div>
            <div class="editor-top-bar" style="height:25px; font-size:10px; border-top:1px solid #333; border-bottom:none;">
                <div id="status-text">SYSTEM READY</div>
                <div style="flex-grow:1"></div>
                <div id="coords-text">X: 0, Y: 0</div>
            </div>
        `;

        this.setupEventListeners();
        this.renderLayerList();
        this.renderTileList();
        this.initSpriteEditor();
    }

    private setupEventListeners(): void {
        this.container.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = (e.target as HTMLElement).dataset.tab!;
                this.switchTab(tab);
            });
        });

        this.container.querySelector('#btn-save-server')?.addEventListener('click', () => this.saveToServer());
        this.container.querySelector('#btn-load-server')?.addEventListener('click', () => this.loadFromServer());
        this.container.querySelector('#btn-exit-editor')?.addEventListener('click', () => this.destroy());

        this.container.querySelector('#btn-shift-up')?.addEventListener('click', () => this.shiftMap(0, -1));
        this.container.querySelector('#btn-shift-down')?.addEventListener('click', () => this.shiftMap(0, 1));
        this.container.querySelector('#btn-shift-left')?.addEventListener('click', () => this.shiftMap(-1, 0));
        this.container.querySelector('#btn-shift-right')?.addEventListener('click', () => this.shiftMap(1, 0));

        this.container.querySelector('#tool-pencil')?.addEventListener('click', (e) => {
            this.mapTool = 'pencil';
            this.updateMapToolUI(e.target as HTMLElement);
        });
        this.container.querySelector('#tool-fill')?.addEventListener('click', (e) => {
            this.mapTool = 'fill';
            this.updateMapToolUI(e.target as HTMLElement);
        });
        this.container.querySelector('#tool-autotile')?.addEventListener('click', (e) => {
            this.mapTool = 'autotile';
            this.updateMapToolUI(e.target as HTMLElement);
        });
        this.container.querySelector('#tool-rect')?.addEventListener('click', (e) => {
            this.mapTool = 'rect';
            this.updateMapToolUI(e.target as HTMLElement);
        });
        this.container.querySelector('#tool-entity')?.addEventListener('click', (e) => {
            this.mapTool = 'entity';
            this.updateMapToolUI(e.target as HTMLElement);
        });

        this.container.querySelector('#btn-list-sprites')?.addEventListener('click', () => this.listAssets('sprites'));
        this.container.querySelector('#btn-list-audio')?.addEventListener('click', () => this.listAssets('audio'));

        this.container.querySelector('#btn-add-frame')?.addEventListener('click', () => {
            this.spriteFrames.push(new Uint8ClampedArray(128 * 128 * 4).fill(0));
            this.currentFrameIndex = this.spriteFrames.length - 1;
            this.updateTimeline();
            this.renderSpriteCanvas();
        });
        
        this.container.querySelector('#onion-skin-toggle')?.addEventListener('change', (e) => {
            const canvas = this.container.querySelector('#onion-skin') as HTMLElement;
            if (canvas) canvas.style.display = (e.target as HTMLInputElement).checked ? 'block' : 'none';
        });

        this.container.querySelector('#sprite-tool-pencil')?.addEventListener('click', (e) => {
            this.spriteTool = 'pencil';
            this.container.querySelectorAll('#sprite-tool-pencil, #sprite-tool-fill').forEach(btn => btn.classList.remove('selected'));
            (e.target as HTMLElement).classList.add('selected');
        });

        this.container.querySelector('#sprite-tool-fill')?.addEventListener('click', (e) => {
            this.spriteTool = 'fill';
            this.container.querySelectorAll('#sprite-tool-pencil, #sprite-tool-fill').forEach(btn => btn.classList.remove('selected'));
            (e.target as HTMLElement).classList.add('selected');
        });

        networkManager.connect(SERVER_URL);
        networkManager.on('editorAction', (data: any) => this.handleRemoteAction(data));
        networkManager.on('assetList', (data: any) => this.renderAssetList(data.files));
    }

    private listAssets(type: string): void {
        networkManager.emit('listAssets', type);
    }

    private renderAssetList(files: string[]): void {
        const list = this.container.querySelector('#asset-browser-list')!;
        list.innerHTML = '';
        files.forEach(file => {
            const item = document.createElement('div');
            item.style.padding = '5px';
            item.style.borderBottom = '1px solid #333';
            item.style.cursor = 'pointer';
            item.style.fontSize = '12px';
            item.innerText = file;
            item.onclick = () => {
                alert(`Selected asset: ${file}`);
            };
            list.appendChild(item);
        });
    }

    private updateTimeline(): void {
        const timeline = this.container.querySelector('#timeline')!;
        timeline.innerHTML = '';
        for (let i = 0; i < this.spriteFrames.length; i++) {
            const frame = document.createElement('div');
            frame.style.minWidth = '20px';
            frame.style.height = '100%';
            frame.style.background = i === this.currentFrameIndex ? '#00ff00' : '#444';
            frame.style.border = '1px solid #111';
            frame.onclick = () => { 
                this.currentFrameIndex = i; 
                this.updateTimeline(); 
                this.renderSpriteCanvas();
            };
            timeline.appendChild(frame);
        }
    }

    private initSpriteEditor(): void {
        const canvas = this.container.querySelector('#sprite-canvas') as HTMLCanvasElement;
        if (!canvas) return;

        const getMousePos = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            return {
                x: Math.floor((e.clientX - rect.left) * scaleX),
                y: Math.floor((e.clientY - rect.top) * scaleY)
            };
        };

        canvas.addEventListener('mousedown', (e) => {
            this.isDrawingSprite = true;
            const pos = getMousePos(e);
            this.handleSpriteInput(pos);
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!this.isDrawingSprite) return;
            const pos = getMousePos(e);
            if (this.spriteTool === 'pencil') {
                this.handleSpriteInput(pos);
            }
        });

        window.addEventListener('mouseup', () => this.isDrawingSprite = false);
        
        this.updateTimeline();
        this.renderSpriteCanvas();
    }

    private handleSpriteInput(pos: {x: number, y: number}): void {
        const {x, y} = pos;
        if (x < 0 || x >= 128 || y < 0 || y >= 128) return;
        
        const frame = this.spriteFrames[this.currentFrameIndex];
        const color = this.palette.getColor(this.selectedTile);
        const r = (color.toInt() >> 16) & 0xff;
        const g = (color.toInt() >> 8) & 0xff;
        const b = color.toInt() & 0xff;
        const a = 255;

        if (this.spriteTool === 'pencil') {
            this.setSpritePixel(x, y, r, g, b, a, true);
        } else if (this.spriteTool === 'fill') {
            this.floodFillSprite(x, y, r, g, b, a);
            // Broadcast full frame update after flood fill
            networkManager.emit('editorAction', { type: 'spriteFrame', frame: this.currentFrameIndex, data: Array.from(this.spriteFrames[this.currentFrameIndex]) });
        }
        
        this.renderSpriteCanvas();
    }

    private setSpritePixel(x: number, y: number, r: number, g: number, b: number, a: number, emit: boolean = false): void {
        const frame = this.spriteFrames[this.currentFrameIndex];
        const idx = (y * 128 + x) * 4;
        
        if (frame[idx] === r && frame[idx+1] === g && frame[idx+2] === b && frame[idx+3] === a) return;
        
        frame[idx] = r; frame[idx+1] = g; frame[idx+2] = b; frame[idx+3] = a;
        if (emit) {
            networkManager.emit('editorAction', { type: 'spritePixel', frame: this.currentFrameIndex, x, y, r, g, b, a });
        }
    }

    private floodFillSprite(startX: number, startY: number, fillR: number, fillG: number, fillB: number, fillA: number): void {
        const frame = this.spriteFrames[this.currentFrameIndex];
        const startIdx = (startY * 128 + startX) * 4;
        const targetR = frame[startIdx];
        const targetG = frame[startIdx+1];
        const targetB = frame[startIdx+2];
        const targetA = frame[startIdx+3];

        if (targetR === fillR && targetG === fillG && targetB === fillB && targetA === fillA) return;

        const stack: {x: number, y: number}[] = [{x: startX, y: startY}];
        const visited = new Set<string>();

        while (stack.length > 0) {
            const {x, y} = stack.pop()!;
            const key = `${x},${y}`;
            if (visited.has(key)) continue;
            visited.add(key);

            const idx = (y * 128 + x) * 4;
            if (frame[idx] === targetR && frame[idx+1] === targetG && frame[idx+2] === targetB && frame[idx+3] === targetA) {
                this.setSpritePixel(x, y, fillR, fillG, fillB, fillA);
                
                if (x > 0) stack.push({x: x - 1, y});
                if (x < 127) stack.push({x: x + 1, y});
                if (y > 0) stack.push({x, y: y - 1});
                if (y < 127) stack.push({x, y: y + 1});
            }
        }
    }

    private renderSpriteCanvas(): void {
        const canvas = this.container.querySelector('#sprite-canvas') as HTMLCanvasElement;
        const onionCanvas = this.container.querySelector('#onion-skin') as HTMLCanvasElement;
        if (!canvas || !onionCanvas) return;

        const ctx = canvas.getContext('2d')!;
        const frame = this.spriteFrames[this.currentFrameIndex];
        const imgData = new ImageData(frame as any, 128, 128);
        ctx.putImageData(imgData, 0, 0);

        const onionCtx = onionCanvas.getContext('2d')!;
        onionCtx.clearRect(0, 0, 128, 128);
        if (this.currentFrameIndex > 0) {
            const prevFrame = this.spriteFrames[this.currentFrameIndex - 1];
            const prevImgData = new ImageData(prevFrame as any, 128, 128);
            onionCtx.putImageData(prevImgData, 0, 0);
        }
    }

    private switchTab(tab: string): void {
        this.activeTab = tab;
        this.container.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', (btn as HTMLElement).dataset.tab === tab));
        this.container.querySelectorAll('.editor-panel').forEach(panel => panel.classList.add('hidden'));
        this.container.querySelector(`#panel-${tab}`)?.classList.remove('hidden');
    }

    private updateMapToolUI(target: HTMLElement): void {
        this.container.querySelectorAll('#tool-pencil, #tool-fill, #tool-rect, #tool-entity, #tool-autotile').forEach(btn => btn.classList.remove('selected'));
        target.classList.add('selected');
    }

    private handleRemoteAction(action: any): void {
        if (action.type === 'spritePixel') {
            const frame = this.spriteFrames[action.frame];
            if (frame) {
                const idx = (action.y * 128 + action.x) * 4;
                frame[idx] = action.r;
                frame[idx+1] = action.g;
                frame[idx+2] = action.b;
                frame[idx+3] = action.a;
                if (this.currentFrameIndex === action.frame) this.renderSpriteCanvas();
            }
            return;
        } else if (action.type === 'spriteFrame') {
            const frame = this.spriteFrames[action.frame];
            if (frame) {
                frame.set(action.data);
                if (this.currentFrameIndex === action.frame) this.renderSpriteCanvas();
            }
            return;
        }
        if (!this.currentMap) return;
        if (action.type === 'paint') {
            this.currentMap.data.setTileIndex(action.layer, action.x, action.y, action.tile);
            this.currentMap.renderLayer(action.layer, this.tileset, this.palette);
        } else if (action.type === 'shift') {
            this.currentMap.data.shiftMap(action.x, action.y);
            this.currentMap.render(this.tileset, this.palette);
        }
    }

    private saveToServer(): void {
        if (this.currentMap) {
            networkManager.emit('saveMap', { mapId: this.currentMap.data.id, mapData: this.currentMap.data });
        }
    }

    private loadFromServer(): void {
        const id = prompt("Enter Map ID:");
        if (id) networkManager.emit('loadMap', id);
    }

    private shiftMap(x: number, y: number): void {
        if (this.currentMap) {
            this.currentMap.data.shiftMap(x, y);
            this.currentMap.render(this.tileset, this.palette);
            networkManager.emit('editorAction', { type: 'shift', x, y });
        }
    }

    private renderLayerList(): void {
        const list = this.container.querySelector('#layer-list')!;
        list.innerHTML = '';
        const layerNames = ["GROUND", "G-DETAIL", "SHADER", "G-SHADOW", "OBJECT", "O-DETAIL", "O-SHADOW", "ABOVE", "A-DETAIL", "S-SHADOW", "CAMERA", "HIT", "ENTITY", "LIGHT", "AREA", "L-MASK", "DOOR"];
        for (let i = 0; i < MapData.layers; i++) {
            const item = document.createElement('div');
            item.className = `layer-item ${this.selectedLayer === i ? 'selected' : ''}`;
            item.innerText = `${i}: ${layerNames[i]}`;
            item.onclick = () => { this.selectedLayer = i; this.renderLayerList(); };
            list.appendChild(item);
        }
    }

    private renderTileList(): void {
        const list = this.container.querySelector('#tile-list')!;
        list.innerHTML = '';
        for (let i = 0; i < 100; i++) {
            const item = document.createElement('div');
            item.className = `tile-item ${this.selectedTile === i ? 'selected' : ''}`;
            if (i > 0) {
                const rgba = this.tileset.getTileRGBA(i, this.palette);
                const canvas = document.createElement('canvas');
                canvas.width = 8; canvas.height = 8;
                const ctx = canvas.getContext('2d')!;
                ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba.buffer) as any, 8, 8), 0, 0);
                item.style.backgroundImage = `url(${canvas.toDataURL()})`;
            }
            item.onclick = () => { this.selectedTile = i; this.renderTileList(); };
            list.appendChild(item);
        }
    }

    private setupMapInteractions(): void {
        this.app.stage.eventMode = 'static';
        this.app.stage.on('pointerdown', (e) => { this.isPainting = true; this.paintAt(e.global.x, e.global.y, false); });
        this.app.stage.on('pointermove', (e) => { 
            this.updateStatusCoords(e.global.x, e.global.y);
            if (this.isPainting) this.paintAt(e.global.x, e.global.y, true); 
        });
        this.app.stage.on('pointerup', () => this.isPainting = false);
    }

    private updateStatusCoords(x: number, y: number): void {
        const tx = Math.floor(x / 8), ty = Math.floor(y / 8);
        const el = this.container.querySelector('#coords-text')!;
        el.textContent = `X: ${tx}, Y: ${ty} | LAYER: ${this.selectedLayer} | TILE: ${this.selectedTile}`;
    }

    private paintAt(x: number, y: number, isMove: boolean = false): void {
        if (!this.currentMap || this.activeTab !== 'map') return;
        const tx = Math.floor(x / 8), ty = Math.floor(y / 8);

        if (this.mapTool === 'fill' && !isMove) {
            this.floodFillMap(tx, ty);
            return;
        }

        if (this.mapTool === 'autotile') {
            this.applyAutoTile(tx, ty);
            return;
        }

        if (this.mapTool === 'rect') {
            // Demo for rect tool: in a full implementation, you'd record startX/Y on mousedown, 
            // draw a preview box on mousemove, and commit on mouseup. 
            // For now, we'll just treat it as pencil during 'move' to keep it simple, 
            // but the architecture is ready.
        }

        if (this.mapTool === 'entity' && !isMove) {
            if (this.selectedLayer === MapData.MAP_ENTITY_LAYER) {
                // In a real engine, this would open an Entity Config dialog and place an EventData
                alert(`Placed Entity at ${tx}, ${ty}`);
            } else {
                alert("Please select the ENTITY layer to place entities.");
            }
            return;
        }

        if (this.mapTool === 'pencil' || this.mapTool === 'rect') {
            if (!MapData.isTileLayer(this.selectedLayer)) return;
            if (tx < 0 || tx >= this.currentMap.data.widthTiles1X || ty < 0 || ty >= this.currentMap.data.heightTiles1X) return;

            const oldTile = this.currentMap.data.getTileIndex(this.selectedLayer, tx, ty);
            if (oldTile !== this.selectedTile) {
                this.currentMap.data.setTileIndex(this.selectedLayer, tx, ty, this.selectedTile);
                this.currentMap.renderLayer(this.selectedLayer, this.tileset, this.palette);
                networkManager.emit('editorAction', { type: 'paint', x: tx, y: ty, layer: this.selectedLayer, tile: this.selectedTile });
            }
        }
    }

    private applyAutoTile(tx: number, ty: number): void {
        if (!this.currentMap || !MapData.isTileLayer(this.selectedLayer)) return;
        if (tx < 0 || tx >= this.currentMap.data.widthTiles1X || ty < 0 || ty >= this.currentMap.data.heightTiles1X) return;

        // AutoTile Base is 100 for this demo
        const baseTileId = 100;
        
        // Temporarily set it so neighbors calculate correctly
        this.currentMap.data.setTileIndex(this.selectedLayer, tx, ty, baseTileId);
        
        const updateTile = (x: number, y: number) => {
            if (x < 0 || x >= this.currentMap!.data.widthTiles1X || y < 0 || y >= this.currentMap!.data.heightTiles1X) return;
            const t = this.currentMap!.data.getTileIndex(this.selectedLayer, x, y);
            if (t >= 100 && t <= 115) { // If it's part of the autotile set
                const mask = AutoTiler.getBitmask4(this.currentMap!.data, this.selectedLayer, x, y, baseTileId);
                const actualTile = baseTileId + mask;
                this.currentMap!.data.setTileIndex(this.selectedLayer, x, y, actualTile);
                networkManager.emit('editorAction', { type: 'paint', x, y, layer: this.selectedLayer, tile: actualTile });
            }
        };

        updateTile(tx, ty);
        updateTile(tx, ty - 1);
        updateTile(tx + 1, ty);
        updateTile(tx, ty + 1);
        updateTile(tx - 1, ty);

        this.currentMap.renderLayer(this.selectedLayer, this.tileset, this.palette);
    }

    private floodFillMap(startX: number, startY: number): void {
        if (!this.currentMap || !MapData.isTileLayer(this.selectedLayer)) return;

        const targetTile = this.currentMap.data.getTileIndex(this.selectedLayer, startX, startY);
        if (targetTile === this.selectedTile) return;

        const stack: {x: number, y: number}[] = [{x: startX, y: startY}];
        const visited = new Set<string>();

        while (stack.length > 0) {
            const {x, y} = stack.pop()!;
            const key = `${x},${y}`;
            if (visited.has(key)) continue;
            visited.add(key);

            if (x < 0 || x >= this.currentMap.data.widthTiles1X || y < 0 || y >= this.currentMap.data.heightTiles1X) continue;

            const current = this.currentMap.data.getTileIndex(this.selectedLayer, x, y);
            if (current === targetTile) {
                this.currentMap.data.setTileIndex(this.selectedLayer, x, y, this.selectedTile);
                // Queue for network broadcast or send as a bulk operation
                networkManager.emit('editorAction', { type: 'paint', x, y, layer: this.selectedLayer, tile: this.selectedTile });
                
                stack.push({x: x - 1, y});
                stack.push({x: x + 1, y});
                stack.push({x, y: y - 1});
                stack.push({x, y: y + 1});
            }
        }
        this.currentMap.renderLayer(this.selectedLayer, this.tileset, this.palette);
    }

    public createNewMap(): void {
        this.currentMap = new GameMap(new MapData(-1, "New Map", 100, 100));
        this.mapContainer.removeChildren();
        this.mapContainer.addChild(this.currentMap.container);
        this.currentMap.render(this.tileset, this.palette);
    }

    public destroy(): void {
        this.container.remove();
        this.mapContainer.destroy({ children: true });
        networkManager.off('editorAction');
    }
}
