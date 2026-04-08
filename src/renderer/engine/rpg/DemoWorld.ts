/**
 * DemoWorld — generates a visual demo RPG world for the ClientGameEngine.
 *
 * Creates a test map with terrain tiles, a walkable player character,
 * NPCs, decorative elements, and a HUD overlay. This serves as the
 * visual representation of the RPG world until real map data is loaded.
 *
 * The map is a procedurally generated town scene with:
 * - Grass, paths, water, trees, buildings
 * - Player character (arrow keys to move)
 * - NPCs standing at fixed positions
 * - HUD showing clock, wallet, location
 */
import {
    Container, Graphics, Text, TextStyle, Sprite, Texture,
} from 'pixi.js';
import { Logger } from '../debug/Logger';

const log = new Logger('DemoWorld');

// Tile types for the demo map
enum Tile {
    GRASS = 0x2d5a1e,
    PATH = 0xc4a35a,
    WATER = 0x2244aa,
    TREE = 0x1a4a0e,
    BUILDING = 0x664422,
    ROOF = 0x882222,
    FLOWER = 0x44aa22,
    DOOR = 0x553311,
    FENCE = 0x8b7355,
    BRIDGE = 0x9b8355,
}

const TILE_SIZE = 32;
const MAP_W = 30;
const MAP_H = 22;

export interface DemoWorldConfig {
    width: number;
    height: number;
}

export class DemoWorld {
    private container: Container;
    private mapContainer: Container;
    private entityContainer: Container;
    private hudContainer: Container;

    private width: number;
    private height: number;

    // Player state
    playerX = 15 * TILE_SIZE;
    playerY = 10 * TILE_SIZE;
    playerSpeed = 120; // pixels per second
    playerDir = 0; // 0=down, 1=left, 2=right, 3=up

    // NPCs
    private npcs: { x: number; y: number; color: number; name: string; dir: number; dialogue: string[] }[] = [];

    // Clock
    private gameTime = 0;

    // Dialogue state
    private showDialogue = false;
    private dialogueLines: string[] = [];
    private dialogueIndex = 0;
    private dialogueNPC = '';
    private dialogueTimer = 0;
    private dialogueCharIndex = 0;
    private readonly DIALOGUE_SPEED = 30; // chars per second

    // Map data (simple 2D array)
    private tiles: number[][] = [];

    // Input state
    private keys: Record<string, boolean> = {};

    constructor(config: DemoWorldConfig) {
        this.width = config.width;
        this.height = config.height;
        this.container = new Container();
        this.mapContainer = new Container();
        this.entityContainer = new Container();
        this.hudContainer = new Container();

        this.container.addChild(this.mapContainer);
        this.container.addChild(this.entityContainer);
        this.container.addChild(this.hudContainer);

        this.generateMap();
        this.setupInput();
        this.placeNPCs();
        log.info('DemoWorld created');
    }

    // ============================================================
    // Map Generation
    // ============================================================

    private generateMap(): void {
        // Fill with grass
        for (let y = 0; y < MAP_H; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < MAP_W; x++) {
                this.tiles[y][x] = Tile.GRASS;
            }
        }

        // River (horizontal, rows 8-9)
        for (let x = 0; x < MAP_W; x++) {
            this.tiles[8][x] = Tile.WATER;
            this.tiles[9][x] = Tile.WATER;
        }

        // Bridge at column 15
        this.tiles[8][15] = Tile.BRIDGE;
        this.tiles[9][15] = Tile.BRIDGE;

        // Main path (horizontal)
        for (let x = 3; x < MAP_W - 3; x++) {
            this.tiles[5][x] = Tile.PATH;
            this.tiles[6][x] = Tile.PATH;
        }

        // Path going south from bridge
        for (let y = 6; y < 8; y++) {
            this.tiles[y][15] = Tile.PATH;
        }

        // Buildings (north side)
        this.fillRect(3, 1, 5, 3, Tile.BUILDING);
        this.fillRect(3, 0, 5, 1, Tile.ROOF);
        this.tiles[3][5] = Tile.DOOR; // Cafe door

        this.fillRect(10, 1, 5, 3, Tile.BUILDING);
        this.fillRect(10, 0, 5, 1, Tile.ROOF);
        this.tiles[3][12] = Tile.DOOR; // Shop door

        this.fillRect(20, 1, 5, 3, Tile.BUILDING);
        this.fillRect(20, 0, 5, 1, Tile.ROOF);
        this.tiles[3][22] = Tile.DOOR; // Stadium door

        // Trees scattered
        const treePositions = [
            [0, 0], [1, 6], [2, 12], [0, 15], [1, 20], [0, 25],
            [11, 4], [11, 8], [11, 12],
            [MAP_H - 1, 2], [MAP_H - 1, 8], [MAP_H - 1, 14],
            [MAP_H - 2, 5], [MAP_H - 2, 18], [MAP_H - 1, 22],
            [MAP_H - 1, 26], [MAP_H - 2, 28],
        ];
        for (const [ty, tx] of treePositions) {
            if (ty < MAP_H && tx < MAP_W && this.tiles[ty][tx] === Tile.GRASS) {
                this.tiles[ty][tx] = Tile.TREE;
            }
        }

        // Flowers
        const flowerPositions = [
            [4, 7], [4, 8], [4, 14], [4, 20],
            [12, 3], [12, 10], [12, 25],
        ];
        for (const [fy, fx] of flowerPositions) {
            if (fy < MAP_H && fx < MAP_W && this.tiles[fy][fx] === Tile.GRASS) {
                this.tiles[fy][fx] = Tile.FLOWER;
            }
        }

        // Fence along south area
        for (let x = 2; x < MAP_W - 2; x++) {
            if (this.tiles[MAP_H - 3][x] === Tile.GRASS) {
                this.tiles[MAP_H - 3][x] = Tile.FENCE;
            }
        }
    }

    private fillRect(x: number, y: number, w: number, h: number, tile: number): void {
        for (let dy = 0; dy < h; dy++) {
            for (let dx = 0; dx < w; dx++) {
                if (y + dy < MAP_H && x + dx < MAP_W) {
                    this.tiles[y + dy][x + dx] = tile;
                }
            }
        }
    }

    // ============================================================
    // NPCs
    // ============================================================

    private placeNPCs(): void {
        this.npcs = [
            { x: 6 * TILE_SIZE, y: 5 * TILE_SIZE, color: 0xff6644, name: 'Barista', dir: 0, dialogue: [
                'Welcome to the Cafe!',
                'We have the best coffee in town.',
                'Have you tried the nD yet? Press ENTER to open it!',
            ]},
            { x: 13 * TILE_SIZE, y: 5 * TILE_SIZE, color: 0x44aaff, name: 'Shopkeep', dir: 0, dialogue: [
                'Welcome to my shop!',
                'I sell all kinds of items for your adventure.',
                'The puzzle tournament starts soon at the Stadium!',
            ]},
            { x: 15 * TILE_SIZE, y: 7 * TILE_SIZE, color: 0x44ff88, name: 'Fisherman', dir: 0, dialogue: [
                'I\'ve been fishing here all day...',
                'The fish aren\'t biting, but the view is nice.',
                'Did you know this river flows all the way to the ocean?',
            ]},
            { x: 22 * TILE_SIZE, y: 5 * TILE_SIZE, color: 0xffaa44, name: 'Coach', dir: 0, dialogue: [
                'The Stadium is closed for renovations.',
                'But you can still play on your nD!',
                'Press ENTER to open it and start playing!',
            ]},
            { x: 15 * TILE_SIZE, y: 15 * TILE_SIZE, color: 0xff44aa, name: 'Villager', dir: 3, dialogue: [
                'Nice day for a walk, isn\'t it?',
                'I heard there\'s a new puzzle game type coming soon.',
            ]},
            { x: 8 * TILE_SIZE, y: 18 * TILE_SIZE, color: 0xaa44ff, name: 'Gamer', dir: 2, dialogue: [
                'I\'m practicing my speedrun strats!',
                'My best time on Master difficulty is 2:34.',
                'You should try the online multiplayer — it\'s intense!',
            ]},
        ];
    }

    // ============================================================
    // Input
    // ============================================================

    private setupInput(): void {
        window.addEventListener('keydown', (e) => { this.keys[e.key] = true; });
        window.addEventListener('keyup', (e) => { this.keys[e.key] = false; });
    }

    // ============================================================
    // Update
    // ============================================================

    update(dt: number): void {
        this.gameTime += dt;

        // If dialogue is showing, only handle dialogue input
        if (this.showDialogue) {
            this.dialogueTimer += dt;

            // Advance text
            if (this.dialogueIndex < this.dialogueLines.length) {
                const line = this.dialogueLines[this.dialogueIndex];
                this.dialogueCharIndex = Math.min(line.length, Math.floor(this.dialogueTimer * this.DIALOGUE_SPEED));
            }

            // Space/Enter advances dialogue
            if (this.keys[' '] || this.keys['Enter']) {
                this.keys[' '] = false;
                this.keys['Enter'] = false;

                const line = this.dialogueLines[this.dialogueIndex];
                if (this.dialogueCharIndex < line.length) {
                    // Show full line immediately
                    this.dialogueCharIndex = line.length;
                } else {
                    // Next line or close
                    this.dialogueIndex++;
                    this.dialogueTimer = 0;
                    this.dialogueCharIndex = 0;
                    if (this.dialogueIndex >= this.dialogueLines.length) {
                        this.showDialogue = false;
                    }
                }
            }
            return;
        }

        // Player movement
        let dx = 0, dy = 0;
        if (this.keys['ArrowUp'] || this.keys['w'] || this.keys['W']) { dy = -1; this.playerDir = 3; }
        if (this.keys['ArrowDown'] || this.keys['s'] || this.keys['S']) { dy = 1; this.playerDir = 0; }
        if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) { dx = -1; this.playerDir = 1; }
        if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) { dx = 1; this.playerDir = 2; }

        // Space / E to interact with NPCs
        if (this.keys[' '] || this.keys['e'] || this.keys['E']) {
            this.keys[' '] = false;
            this.keys['e'] = false;
            this.keys['E'] = false;
            this.tryInteractNPC();
        }

        // Normalize diagonal
        if (dx !== 0 && dy !== 0) {
            const len = Math.sqrt(dx * dx + dy * dy);
            dx /= len;
            dy /= len;
        }

        const newX = this.playerX + dx * this.playerSpeed * dt;
        const newY = this.playerY + dy * this.playerSpeed * dt;

        // Collision check (can't walk on water, trees, buildings, fences)
        const tileX = Math.floor(newX / TILE_SIZE);
        const tileY = Math.floor(newY / TILE_SIZE);
        if (tileX >= 0 && tileX < MAP_W && tileY >= 0 && tileY < MAP_H) {
            const tile = this.tiles[tileY][tileX];
            if (tile !== Tile.WATER && tile !== Tile.TREE && tile !== Tile.BUILDING && tile !== Tile.ROOF && tile !== Tile.FENCE) {
                this.playerX = Math.max(0, Math.min((MAP_W - 1) * TILE_SIZE, newX));
                this.playerY = Math.max(0, Math.min((MAP_H - 1) * TILE_SIZE, newY));
            }
        }
    }

    // ============================================================
    // NPC Interaction
    // ============================================================

    private tryInteractNPC(): void {
        const interactDist = TILE_SIZE * 1.5;
        for (const npc of this.npcs) {
            const dx = this.playerX - npc.x;
            const dy = this.playerY - npc.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < interactDist) {
                this.showDialogue = true;
                this.dialogueLines = npc.dialogue;
                this.dialogueIndex = 0;
                this.dialogueNPC = npc.name;
                this.dialogueTimer = 0;
                this.dialogueCharIndex = 0;
                return;
            }
        }
    }

    // ============================================================
    // Render
    // ============================================================

    render(): Container {
        this.container.removeChildren();

        // Camera offset (center on player)
        const camX = Math.max(0, Math.min(MAP_W * TILE_SIZE - this.width, this.playerX - this.width / 2));
        const camY = Math.max(0, Math.min(MAP_H * TILE_SIZE - this.height, this.playerY - this.height / 2));

        // Render map tiles
        this.mapContainer.removeChildren();
        const startTileX = Math.floor(camX / TILE_SIZE);
        const startTileY = Math.floor(camY / TILE_SIZE);
        const endTileX = Math.min(MAP_W, startTileX + Math.ceil(this.width / TILE_SIZE) + 1);
        const endTileY = Math.min(MAP_H, startTileY + Math.ceil(this.height / TILE_SIZE) + 1);

        for (let ty = startTileY; ty < endTileY; ty++) {
            for (let tx = startTileX; tx < endTileX; tx++) {
                if (ty < 0 || tx < 0 || ty >= MAP_H || tx >= MAP_W) continue;
                const tile = this.tiles[ty][tx];
                const g = new Graphics();
                g.rect(0, 0, TILE_SIZE, TILE_SIZE);
                g.fill({ color: tile });

                // Add detail for certain tiles
                if (tile === Tile.WATER) {
                    // Water shimmer
                    const shimmer = Math.sin(this.gameTime * 2 + tx * 0.5 + ty * 0.3) * 0.15;
                    g.rect(0, 0, TILE_SIZE, TILE_SIZE);
                    g.fill({ color: 0x3366cc, alpha: 0.3 + shimmer });
                } else if (tile === Tile.TREE) {
                    // Tree trunk
                    g.rect(TILE_SIZE * 0.3, TILE_SIZE * 0.6, TILE_SIZE * 0.4, TILE_SIZE * 0.4);
                    g.fill({ color: 0x553311 });
                    // Tree canopy
                    g.circle(TILE_SIZE * 0.5, TILE_SIZE * 0.35, TILE_SIZE * 0.4);
                    g.fill({ color: 0x226611 });
                } else if (tile === Tile.DOOR) {
                    g.rect(TILE_SIZE * 0.25, TILE_SIZE * 0.2, TILE_SIZE * 0.5, TILE_SIZE * 0.8);
                    g.fill({ color: 0x442200 });
                    g.circle(TILE_SIZE * 0.6, TILE_SIZE * 0.55, 2);
                    g.fill({ color: 0xccaa00 }); // Door knob
                } else if (tile === Tile.FLOWER) {
                    g.circle(TILE_SIZE * 0.5, TILE_SIZE * 0.5, 4);
                    g.fill({ color: 0xff44aa });
                    g.circle(TILE_SIZE * 0.5, TILE_SIZE * 0.5, 2);
                    g.fill({ color: 0xffff00 });
                } else if (tile === Tile.BRIDGE) {
                    g.rect(0, 0, TILE_SIZE, TILE_SIZE);
                    g.fill({ color: 0x9b8355 });
                    // Planks
                    g.moveTo(0, TILE_SIZE * 0.25);
                    g.lineTo(TILE_SIZE, TILE_SIZE * 0.25);
                    g.stroke({ color: 0x7b6345, width: 1 });
                    g.moveTo(0, TILE_SIZE * 0.75);
                    g.lineTo(TILE_SIZE, TILE_SIZE * 0.75);
                    g.stroke({ color: 0x7b6345, width: 1 });
                }

                g.position.set(tx * TILE_SIZE - camX, ty * TILE_SIZE - camY);
                this.mapContainer.addChild(g);
            }
        }

        this.container.addChild(this.mapContainer);

        // Render entities (NPCs + Player)
        this.entityContainer.removeChildren();

        // Sort entities by Y for proper overlap
        const entities: { y: number; render: () => Container }[] = [];

        // NPCs
        for (const npc of this.npcs) {
            entities.push({
                y: npc.y,
                render: () => this.renderCharacter(npc.x - camX, npc.y - camY, npc.color, npc.dir, npc.name),
            });
        }

        // Player (always rendered)
        entities.push({
            y: this.playerY,
            render: () => this.renderPlayer(this.playerX - camX, this.playerY - camY),
        });

        // Sort by Y and render
        entities.sort((a, b) => a.y - b.y);
        for (const ent of entities) {
            this.entityContainer.addChild(ent.render());
        }

        this.container.addChild(this.entityContainer);

        // HUD
        this.renderHUD();

        // Dialogue box
        if (this.showDialogue) {
            this.renderDialogueBox();
        }

        return this.container;
    }

    private renderCharacter(x: number, y: number, color: number, dir: number, name: string): Container {
        const c = new Container();

        // Shadow
        const shadow = new Graphics();
        shadow.ellipse(0, 0, 10, 4);
        shadow.fill({ color: 0x000000, alpha: 0.3 });
        shadow.position.set(x + TILE_SIZE / 2, y + TILE_SIZE - 2);
        c.addChild(shadow);

        // Body
        const body = new Graphics();
        body.roundRect(-8, -20, 16, 18, 3);
        body.fill({ color: color });
        c.position.set(x + TILE_SIZE / 2, y + TILE_SIZE);
        c.addChild(body);

        // Head
        const head = new Graphics();
        head.circle(0, -24, 7);
        head.fill({ color: 0xffddbb }); // Skin
        c.addChild(head);

        // Eyes (direction-based)
        const eyeOffsets: Record<number, { ex: number; ey: number }[]> = {
            0: [{ ex: -3, ey: -25 }, { ex: 3, ey: -25 }], // down
            1: [{ ex: -4, ey: -25 }], // left
            2: [{ ex: 4, ey: -25 }], // right
            3: [], // up (no eyes visible)
        };
        const eyes = eyeOffsets[dir] ?? eyeOffsets[0];
        for (const eye of eyes) {
            const eyeG = new Graphics();
            eyeG.circle(eye.ex, eye.ey, 1.5);
            eyeG.fill({ color: 0x222222 });
            c.addChild(eyeG);
        }

        // Name label
        const nameStyle = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 9,
            fill: 0xffffff,
            fontWeight: 'bold',
        });
        const nameText = new Text({ text: name, style: nameStyle });
        nameText.anchor.set(0.5);
        nameText.position.set(0, -34);
        c.addChild(nameText);

        return c;
    }

    private renderPlayer(x: number, y: number): Container {
        const c = this.renderCharacter(x, y, 0x3366ff, this.playerDir, 'You');
        // Add a small indicator above player
        const indicator = new Graphics();
        const bob = Math.sin(this.gameTime * 3) * 3;
        indicator.circle(0, -40 + bob, 3);
        indicator.fill({ color: 0x00ff00 });
        c.addChild(indicator);
        return c;
    }

    private renderHUD(): void {
        this.hudContainer.removeChildren();

        // Semi-transparent HUD background at top
        const hudBg = new Graphics();
        hudBg.rect(0, 0, this.width, 36);
        hudBg.fill({ color: 0x000000, alpha: 0.6 });
        this.hudContainer.addChild(hudBg);

        const style = new TextStyle({ fontFamily: 'monospace', fontSize: 12, fill: 0xccccdd });

        // Location
        const locText = new Text({
            text: `📍 ${this.currentMapName || 'TOWNYUU Downstairs'}`,
            style,
        });
        locText.position.set(8, 10);
        this.hudContainer.addChild(locText);

        // Clock
        const hours = Math.floor((this.gameTime / 4) % 24);
        const mins = Math.floor((this.gameTime % 4) * 15);
        const timeText = new Text({
            text: `🕐 ${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`,
            style,
        });
        timeText.position.set(this.width / 2 - 40, 10);
        this.hudContainer.addChild(timeText);

        // Wallet
        const moneyText = new Text({
            text: `💰 $19.99`,
            style: new TextStyle({ fontFamily: 'monospace', fontSize: 12, fill: 0x44ff44 }),
        });
        moneyText.position.set(this.width - 100, 10);
        this.hudContainer.addChild(moneyText);

        // Bottom hint bar
        const hintBg = new Graphics();
        hintBg.rect(0, this.height - 28, this.width, 28);
        hintBg.fill({ color: 0x000000, alpha: 0.5 });
        this.hudContainer.addChild(hintBg);

        const hintStyle = new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 11, fill: 0x666688 });
        const hint = new Text({
            text: 'Arrow Keys: Move  ·  Enter: Open nD  ·  Tab: Menu  ·  ~: Debug Console',
            style: hintStyle,
        });
        hint.anchor.set(0.5);
        hint.position.set(this.width / 2, this.height - 14);
        this.hudContainer.addChild(hint);
    }

    // ============================================================
    // Dialogue Box
    // ============================================================

    private renderDialogueBox(): void {
        const boxW = this.width - 40;
        const boxH = 120;
        const boxX = 20;
        const boxY = this.height - boxH - 40;

        // Background
        const bg = new Graphics();
        bg.roundRect(boxX, boxY, boxW, boxH, 8);
        bg.fill({ color: 0x0a0a2a, alpha: 0.95 });
        bg.stroke({ color: 0x4466aa, width: 2 });
        this.hudContainer.addChild(bg);

        // NPC name
        const nameStyle = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 14,
            fill: 0x44aaff,
            fontWeight: 'bold',
        });
        const nameText = new Text({ text: this.dialogueNPC, style: nameStyle });
        nameText.position.set(boxX + 16, boxY + 10);
        this.hudContainer.addChild(nameText);

        // Separator line
        const sep = new Graphics();
        sep.moveTo(boxX + 10, boxY + 30);
        sep.lineTo(boxX + boxW - 10, boxY + 30);
        sep.stroke({ color: 0x334466, width: 1 });
        this.hudContainer.addChild(sep);

        // Dialogue text (typewriter effect)
        if (this.dialogueIndex < this.dialogueLines.length) {
            const fullLine = this.dialogueLines[this.dialogueIndex];
            const visibleText = fullLine.substring(0, this.dialogueCharIndex);

            const textStyle = new TextStyle({
                fontFamily: 'Arial, sans-serif',
                fontSize: 14,
                fill: 0xddddee,
                wordWrap: true,
                wordWrapWidth: boxW - 32,
            });
            const text = new Text({ text: visibleText, style: textStyle });
            text.position.set(boxX + 16, boxY + 38);
            this.hudContainer.addChild(text);

            // Advance indicator (blinking triangle)
            const allCharsShown = this.dialogueCharIndex >= fullLine.length;
            if (allCharsShown) {
                const blink = Math.sin(this.gameTime * 5) > 0;
                if (blink) {
                    const indicatorStyle = new TextStyle({
                        fontFamily: 'Arial, sans-serif',
                        fontSize: 16,
                        fill: 0x4466aa,
                    });
                    const isLast = this.dialogueIndex >= this.dialogueLines.length - 1;
                    const indicator = new Text({
                        text: isLast ? '▼ END' : '▼',
                        style: indicatorStyle,
                    });
                    indicator.position.set(boxX + boxW - 60, boxY + boxH - 25);
                    this.hudContainer.addChild(indicator);
                }
            }
        }

        // Page indicator
        const pageStyle = new TextStyle({
            fontFamily: 'monospace',
            fontSize: 10,
            fill: 0x445566,
        });
        const page = new Text({
            text: `${this.dialogueIndex + 1}/${this.dialogueLines.length}`,
            style: pageStyle,
        });
        page.position.set(boxX + boxW - 40, boxY + 10);
        this.hudContainer.addChild(page);
    }

    // ============================================================
    // Access
    // ============================================================

    getContainer(): Container { return this.container; }
    getPlayerX(): number { return this.playerX; }
    getPlayerY(): number { return this.playerY; }
    getMapName(): string { return this.currentMapName || 'TOWNYUU Downstairs'; }

    private currentMapName = '';

    setMapName(name: string): void { this.currentMapName = name; }

    destroy(): void {
        this.container.destroy({ children: true });
    }
}
