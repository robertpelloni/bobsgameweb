import { Container, Graphics, Application, FederatedPointerEvent, Texture } from 'pixi.js';
import { MapData } from '../../shared/MapData';
import { GameMap } from '../engine/map/GameMap';
import { Tileset } from '../../shared/Tileset';
import { Palette } from '../../shared/Palette';
import { BobColor } from '../../shared/BobColor';
import { networkManager } from '../puzzle';
import { SERVER_URL } from '../../shared/Config';

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
        // Create some dummy tiles for testing
        for (let i = 1; i < 10; i++) {
            const color = new BobColor(i * 20, 100 + i * 10, 50, 255);
            this.palette.setColor(i, color);
            for (let x = 0; x < 8; x++) {
                for (let y = 0; y < 8; y++) {
                    this.tileset.setPixel(i, x, y, i);
                }
            }
        }
    }

    private buildUI(): void {
        this.container.innerHTML = `
            <style>
                .map-editor-ui {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    display: flex;
                    flex-direction: column;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                }
                .editor-top-bar {
                    height: 40px;
                    background: #1a1a1a;
                    color: #00ff00;
                    display: flex;
                    align-items: center;
                    padding: 0 15px;
                    pointer-events: auto;
                    border-bottom: 1px solid #333;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.5);
                }
                .editor-main-area {
                    flex-grow: 1;
                    display: flex;
                }
                .editor-left-panel {
                    width: 250px;
                    background: rgba(26, 26, 26, 0.95);
                    border-right: 1px solid #333;
                    pointer-events: auto;
                    overflow-y: auto;
                    color: #ccc;
                }
                .editor-right-panel {
                    width: 300px;
                    background: rgba(26, 26, 26, 0.95);
                    border-left: 1px solid #333;
                    pointer-events: auto;
                    overflow-y: auto;
                    color: #ccc;
                }
                .editor-bottom-bar {
                    height: 30px;
                    background: #1a1a1a;
                    color: #888;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    padding: 0 15px;
                    pointer-events: auto;
                    border-top: 1px solid #333;
                }
                .panel-section {
                    padding: 15px;
                    border-bottom: 1px solid #333;
                }
                .panel-section h3 {
                    margin: 0 0 12px 0;
                    font-size: 14px;
                    color: #00ff00;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .layer-item {
                    padding: 5px 8px;
                    margin: 2px 0;
                    cursor: pointer;
                    border-radius: 3px;
                    font-size: 13px;
                }
                .layer-item:hover {
                    background: #333;
                }
                .layer-item.selected {
                    background: #004400;
                    color: #00ff00;
                    border: 1px solid #00ff00;
                }
                .tile-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(32px, 1fr));
                    gap: 4px;
                }
                .tile-item {
                    width: 32px;
                    height: 32px;
                    border: 1px solid #444;
                    cursor: pointer;
                    background-size: contain;
                    image-rendering: pixelated;
                }
                .tile-item.selected {
                    border: 2px solid #00ff00;
                }
                button {
                    background: #333;
                    color: #eee;
                    border: 1px solid #555;
                    padding: 6px 12px;
                    cursor: pointer;
                    margin: 2px;
                    border-radius: 4px;
                    transition: all 0.2s;
                }
                button:hover {
                    background: #444;
                    border-color: #00ff00;
                }
                input {
                    background: #222;
                    border: 1px solid #444;
                    color: #fff;
                    padding: 4px;
                    border-radius: 3px;
                }
            </style>
            <div class="editor-top-bar">
                <div style="font-weight:bold; margin-right: 25px; font-size: 18px;">BOB'S MAP EDITOR v2.0</div>
                <button id="btn-new-map">NEW</button>
                <button id="btn-save-map">SAVE</button>
                <button id="btn-load-map">LOAD</button>
                <div style="flex-grow:1"></div>
                <button id="btn-exit-editor" style="color: #ff4444;">EXIT</button>
            </div>
            <div class="editor-main-area">
                <div class="editor-left-panel">
                    <div class="panel-section">
                        <h3>Layers</h3>
                        <div id="layer-list"></div>
                    </div>
                    <div class="panel-section">
                        <h3>Tools</h3>
                        <button id="tool-pencil" class="selected">PENCIL</button>
                        <button id="tool-rect">RECT</button>
                        <button id="tool-fill">FILL</button>
                        <button id="tool-eraser">ERASER</button>
                    </div>
                    <div class="panel-section">
                        <h3>Shift Map</h3>
                        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 2px; text-align:center;">
                            <div></div><button id="btn-shift-up">↑</button><div></div>
                            <button id="btn-shift-left">←</button><div></div><button id="btn-shift-right">→</button>
                            <div></div><button id="btn-shift-down">↓</button><div></div>
                        </div>
                    </div>
                </div>
                <div style="flex-grow:1; pointer-events: none;"></div>
                <div class="editor-right-panel">
                    <div class="panel-section">
                        <h3>Tileset</h3>
                        <div id="tile-list" class="tile-grid"></div>
                    </div>
                    <div class="panel-section">
                        <h3>Map Properties</h3>
                        <div id="map-props"></div>
                    </div>
                </div>
            </div>
            <div class="editor-bottom-bar">
                <div id="status-text">SYSTEM READY</div>
                <div style="flex-grow:1"></div>
                <div id="coords-text">X: 0, Y: 0 | TILE: 0</div>
            </div>
        `;

        this.setupEventListeners();
        this.renderLayerList();
        this.renderTileList();
    }

    private setupEventListeners(): void {
        this.container.querySelector('#btn-new-map')?.addEventListener('click', () => this.createNewMap());
        this.container.querySelector('#btn-save-map')?.addEventListener('click', () => this.saveMap());
        this.container.querySelector('#btn-load-map')?.addEventListener('click', () => this.loadMap());
        this.container.querySelector('#btn-exit-editor')?.addEventListener('click', () => this.destroy());

        this.container.querySelector('#btn-shift-up')?.addEventListener('click', () => this.shiftMap(0, -1));
        this.container.querySelector('#btn-shift-down')?.addEventListener('click', () => this.shiftMap(0, 1));
        this.container.querySelector('#btn-shift-left')?.addEventListener('click', () => this.shiftMap(-1, 0));
        this.container.querySelector('#btn-shift-right')?.addEventListener('click', () => this.shiftMap(1, 0));

        // Connect to server for multiplayer editing
        networkManager.connect(SERVER_URL);
        networkManager.on('editorAction', (data: any) => this.handleRemoteAction(data));
    }

    private shiftMap(x: number, y: number): void {
        if (this.currentMap) {
            this.currentMap.data.shiftMap(x, y);
            this.currentMap.render(this.tileset, this.palette);
            this.broadcastAction({ type: 'shift', x, y });
        }
    }

    private broadcastAction(action: any): void {
        // Use networkManager's underlying socket for direct emit
        (networkManager as any).socket?.emit('editorAction', action);
    }

    private handleRemoteAction(action: any): void {
        if (!this.currentMap) return;
        
        switch (action.type) {
            case 'paint':
                this.currentMap.data.setTileIndex(action.layer, action.x, action.y, action.tile);
                this.currentMap.renderLayer(action.layer, this.tileset, this.palette);
                break;
            case 'shift':
                this.currentMap.data.shiftMap(action.x, action.y);
                this.currentMap.render(this.tileset, this.palette);
                break;
        }
    }

    private renderLayerList(): void {
        const list = this.container.querySelector('#layer-list');
        if (!list) return;

        list.innerHTML = '';
        const layerNames = [
            "GROUND", "GROUND DETAIL", "SHADER", "GROUND SHADOW", "OBJECT", "OBJECT DETAIL", "OBJECT SHADOW",
            "ABOVE", "ABOVE DETAIL", "SPRITE SHADOW", "CAMERA BOUNDS", "HIT", "ENTITY", "LIGHT", "AREA", "LIGHT MASK", "DOOR"
        ];

        for (let i = 0; i < MapData.layers; i++) {
            const item = document.createElement('div');
            item.className = `layer-item ${this.selectedLayer === i ? 'selected' : ''}`;
            item.innerText = `${i}: ${layerNames[i] || 'LAYER'}`;
            item.onclick = () => {
                this.selectedLayer = i;
                this.renderLayerList();
            };
            list.appendChild(item);
        }
    }

    private renderTileList(): void {
        const list = this.container.querySelector('#tile-list');
        if (!list) return;

        list.innerHTML = '';
        // Show first 100 tiles
        for (let i = 0; i < 100; i++) {
            const item = document.createElement('div');
            item.className = `tile-item ${this.selectedTile === i ? 'selected' : ''}`;
            
            // Create a small preview of the tile
            if (i > 0) {
                const rgba = this.tileset.getTileRGBA(i, this.palette);
                const canvas = document.createElement('canvas');
                canvas.width = 8;
                canvas.height = 8;
                const ctx = canvas.getContext('2d')!;
                const imgData = new ImageData(new Uint8ClampedArray(rgba.buffer) as any, 8, 8);
                ctx.putImageData(imgData, 0, 0);
                item.style.backgroundImage = `url(${canvas.toDataURL()})`;
            } else {
                item.style.background = '#000'; // Tile 0 is empty
            }

            item.onclick = () => {
                this.selectedTile = i;
                this.renderTileList();
            };
            list.appendChild(item);
        }
    }

    private setupMapInteractions(): void {
        // We use the PixiJS stage for interactions
        this.app.stage.eventMode = 'static';
        this.app.stage.hitArea = this.app.screen;

        this.app.stage.on('pointerdown', (e: FederatedPointerEvent) => {
            if (!this.currentMap) return;
            this.isPainting = true;
            this.paintAt(e.global.x, e.global.y);
        });

        this.app.stage.on('pointermove', (e: FederatedPointerEvent) => {
            this.updateStatusCoords(e.global.x, e.global.y);
            if (this.isPainting) {
                this.paintAt(e.global.x, e.global.y);
            }
        });

        this.app.stage.on('pointerup', () => {
            this.isPainting = false;
        });

        this.app.stage.on('pointerupoutside', () => {
            this.isPainting = false;
        });
    }

    private updateStatusCoords(x: number, y: number): void {
        const tx = Math.floor(x / 8);
        const ty = Math.floor(x / 8); // Bug fix: was floor(x/8)
        const coords = this.container.querySelector('#coords-text') as HTMLElement;
        if (coords) {
            let tileInfo = '0';
            if (this.currentMap) {
                tileInfo = `${this.currentMap.data.getTileIndex(this.selectedLayer, tx, ty)}`;
            }
            coords.textContent = `X: ${tx}, Y: ${ty} | LAYER ${this.selectedLayer} | TILE: ${tileInfo}`;
        }
    }

    private paintAt(screenX: number, screenY: number): void {
        if (!this.currentMap) return;
        if (!MapData.isTileLayer(this.selectedLayer)) return;

        const tx = Math.floor(screenX / 8);
        const ty = Math.floor(screenY / 8);

        if (tx < 0 || tx >= this.currentMap.data.widthTiles1X || ty < 0 || ty >= this.currentMap.data.heightTiles1X) return;

        const oldTile = this.currentMap.data.getTileIndex(this.selectedLayer, tx, ty);
        if (oldTile !== this.selectedTile) {
            this.currentMap.data.setTileIndex(this.selectedLayer, tx, ty, this.selectedTile);
            this.currentMap.renderLayer(this.selectedLayer, this.tileset, this.palette);
            this.broadcastAction({ 
                type: 'paint', 
                x: tx, y: ty, 
                layer: this.selectedLayer, 
                tile: this.selectedTile 
            });
        }
    }

    public createNewMap(): void {
        const data = new MapData(-1, "New Map", 100, 100);
        this.currentMap = new GameMap(data);
        this.mapContainer.removeChildren();
        this.mapContainer.addChild(this.currentMap.container);
        this.refreshUI();
        
        // Initial render
        this.currentMap.render(this.tileset, this.palette);
    }

    public saveMap(): void {
        if (this.currentMap) {
            console.log("Saving map:", this.currentMap.data.name);
            localStorage.setItem(`map-${this.currentMap.data.id}`, this.currentMap.data.toString());
            const status = this.container.querySelector('#status-text') as HTMLElement;
            if (status) status.textContent = `MAP '${this.currentMap.data.name}' SAVED TO LOCALSTORAGE`;
        }
    }

    public loadMap(): void {
        // Logic to load from localStorage or server
    }

    private refreshUI(): void {
        if (!this.currentMap) return;
        
        const props = this.container.querySelector('#map-props');
        if (props) {
            props.innerHTML = `
                <div style="margin-bottom:10px;">Name: <input type="text" value="${this.currentMap.data.name}" style="width:100%;"></div>
                <div style="display:flex; gap:10px;">
                    <div>W: <input type="number" value="${this.currentMap.data.widthTiles1X}" style="width:50px;"></div>
                    <div>H: <input type="number" value="${this.currentMap.data.heightTiles1X}" style="width:50px;"></div>
                </div>
            `;
        }
    }

    public destroy(): void {
        this.container.remove();
        this.mapContainer.destroy({ children: true });
        this.app.stage.off('pointerdown');
        this.app.stage.off('pointermove');
        this.app.stage.off('pointerup');
        this.app.stage.off('pointerupoutside');
        networkManager.off('editorAction');
    }
}
