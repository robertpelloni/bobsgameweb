import { Container, Graphics, Application } from 'pixi.js';
import { MapData } from '../../shared/MapData';

export class MapEditor {
    private app: Application;
    private container: HTMLElement;
    private mapContainer: Container;
    private currentMapData: MapData | null = null;

    // UI Panels
    private leftPanel!: HTMLElement;
    private rightPanel!: HTMLElement;
    private bottomPanel!: HTMLElement;

    constructor(parentElementId: string, app: Application) {
        this.app = app;
        const parent = document.getElementById(parentElementId);
        if (!parent) throw new Error(`Element with id ${parentElementId} not found`);

        this.container = document.createElement('div');
        this.container.className = 'map-editor-ui';
        parent.appendChild(this.container);

        this.mapContainer = new Container();
        this.app.stage.addChild(this.mapContainer);

        this.buildUI();
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
                }
                .editor-top-bar {
                    height: 40px;
                    background: #222;
                    color: white;
                    display: flex;
                    align-items: center;
                    padding: 0 10px;
                    pointer-events: auto;
                    border-bottom: 1px solid #444;
                }
                .editor-main-area {
                    flex-grow: 1;
                    display: flex;
                }
                .editor-left-panel {
                    width: 250px;
                    background: rgba(34, 34, 34, 0.9);
                    border-right: 1px solid #444;
                    pointer-events: auto;
                    overflow-y: auto;
                }
                .editor-right-panel {
                    width: 300px;
                    background: rgba(34, 34, 34, 0.9);
                    border-left: 1px solid #444;
                    pointer-events: auto;
                    overflow-y: auto;
                }
                .editor-bottom-bar {
                    height: 30px;
                    background: #222;
                    color: #aaa;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    padding: 0 10px;
                    pointer-events: auto;
                    border-top: 1px solid #444;
                }
                .panel-section {
                    padding: 10px;
                    border-bottom: 1px solid #333;
                }
                .panel-section h3 {
                    margin: 0 0 10px 0;
                    font-size: 14px;
                    color: #ffcc00;
                }
                button {
                    background: #444;
                    color: white;
                    border: 1px solid #666;
                    padding: 5px 10px;
                    cursor: pointer;
                    margin: 2px;
                }
                button:hover {
                    background: #555;
                }
            </style>
            <div class="editor-top-bar">
                <div style="font-weight:bold; margin-right: 20px;">Map Editor</div>
                <button id="btn-new-map">New Map</button>
                <button id="btn-save-map">Save</button>
                <button id="btn-load-map">Load</button>
                <div style="flex-grow:1"></div>
                <button id="btn-exit-editor">Exit</button>
            </div>
            <div class="editor-main-area">
                <div class="editor-left-panel">
                    <div class="panel-section">
                        <h3>Layers</h3>
                        <div id="layer-list"></div>
                    </div>
                    <div class="panel-section">
                        <h3>Tileset</h3>
                        <div id="tileset-preview" style="width:100%; height:200px; background:#000;"></div>
                    </div>
                </div>
                <div style="flex-grow:1; pointer-events: none;"></div>
                <div class="editor-right-panel">
                    <div class="panel-section">
                        <h3>Map Properties</h3>
                        <div id="map-props"></div>
                    </div>
                    <div class="panel-section">
                        <h3>Tools</h3>
                        <button id="tool-pencil">Pencil</button>
                        <button id="tool-rect">Rect</button>
                        <button id="tool-fill">Fill</button>
                        <button id="tool-select">Select</button>
                    </div>
                </div>
            </div>
            <div class="editor-bottom-bar">
                <div id="status-text">Ready</div>
                <div style="flex-grow:1"></div>
                <div id="coords-text">X: 0, Y: 0</div>
            </div>
        `;

        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        this.container.querySelector('#btn-new-map')?.addEventListener('click', () => this.createNewMap());
        this.container.querySelector('#btn-save-map')?.addEventListener('click', () => this.saveMap());
        this.container.querySelector('#btn-load-map')?.addEventListener('click', () => this.loadMap());
    }

    public createNewMap(): void {
        this.currentMapData = new MapData(-1, "New Map");
        this.refreshUI();
    }

    public saveMap(): void {
        if (this.currentMapData) {
            console.log("Saving map:", this.currentMapData.name);
            localStorage.setItem(`map-${this.currentMapData.id}`, this.currentMapData.toString());
        }
    }

    public loadMap(): void {
        // Logic to load from localStorage or server
    }

    private refreshUI(): void {
        if (!this.currentMapData) return;
        
        const props = this.container.querySelector('#map-props');
        if (props) {
            props.innerHTML = `
                <div>Name: <input type="text" value="${this.currentMapData.name}"></div>
                <div>Width: <input type="number" value="${this.currentMapData.widthTiles1X}"></div>
                <div>Height: <input type="number" value="${this.currentMapData.heightTiles1X}"></div>
            `;
        }
    }

    public destroy(): void {
        this.container.remove();
        this.mapContainer.destroy({ children: true });
    }
}
