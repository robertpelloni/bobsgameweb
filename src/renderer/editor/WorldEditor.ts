import { RPGDatabase, ActorData } from '../../shared/database/RPGDatabase';
import { networkManager } from '../puzzle';
import { SERVER_URL } from '../../shared/Config';
import { AchievementManager } from '../data/AchievementManager';
import { getAchievementIdentity } from '../data/AchievementIdentity';
import { ToastManager } from '../ui/ToastManager';

import { Container, Text as PIXIText } from "pixi.js";
import { EventSheetEditor } from "./EventSheetEditor";
import { Panel } from "../ui/Panel";
import { Button } from "../ui/Button";
import { ParticleEmitter, ParticlePresets } from "../engine/graphics/ParticleSystem";

export class WorldEditor {
    public pixiContainer: Container = new Container();

    private container: HTMLElement;
    private db: RPGDatabase = new RPGDatabase();
    private particlePanel: Panel | null = null;

    constructor(parent: HTMLElement | string) {
        let parentElement: HTMLElement | null;
        if (typeof parent === 'string') {
            parentElement = document.getElementById(parent);
        } else {
            parentElement = parent;
        }

        if (!parentElement) {
            throw new Error(`Parent element not found: ${parent}`);
        }
        
        this.container = document.createElement('div');
        this.container.className = 'world-editor';
        parentElement.appendChild(this.container);

        if (!networkManager.connected) {
            networkManager.connect(SERVER_URL);
        }
        networkManager.on('connected', () => this.loadAchievementSnapshot());
        
        this.buildUI();
        this.loadFromServer();

        const eventSheetPanel = new Panel({ width: 400, height: 200, backgroundColor: 0x111111, backgroundAlpha: 0.9, borderColor: 0xaa00aa });
        eventSheetPanel.setPosition(420, 20);

        const esTitle = new PIXIText({ text: "Visual Event Sheet", style: { fill: 0xee88ee, fontSize: 18, fontWeight: "bold" } });
        esTitle.position.set(10, 10);
        eventSheetPanel.addChild(esTitle);

        const openSheetBtn = new Button("Open Event Builder", { width: 200, height: 30, backgroundColor: 0x440044 });

        const sheetEditor = new EventSheetEditor();
        sheetEditor.container.visible = false;
        sheetEditor.container.position.set(50, 50);
        this.pixiContainer.addChild(sheetEditor.container);

        openSheetBtn.on("click", () => { sheetEditor.container.visible = true; });
        sheetEditor.on("close", () => { sheetEditor.container.visible = false; });

        openSheetBtn.setPosition(10, 45);
        eventSheetPanel.addChild(openSheetBtn.container);

        this.pixiContainer.addChild(eventSheetPanel.container);

        // Particle Testing Panel
        this.particlePanel = new Panel({ width: 400, height: 200, backgroundColor: 0x111111, backgroundAlpha: 0.9, borderColor: 0x00ffff });
        this.particlePanel.setPosition(420, 240);
        const pTitle = new PIXIText({ text: "Particle Testing", style: { fill: 0x88ffff, fontSize: 18, fontWeight: "bold" } });
        pTitle.position.set(10, 10);
        this.particlePanel.addChild(pTitle);

        const spawnFireBtn = new Button("Burst Fire", { width: 120, height: 30, backgroundColor: 0x440000 });
        spawnFireBtn.setPosition(10, 45);
        spawnFireBtn.on("click", () => {
            const fire = ParticlePresets.fire(200, 100);
            this.particlePanel!.addChild(fire.container);
            let interval: any;
            const update = () => {
                fire.update(0.016);
                fire.render();
                if (fire.count === 0) {
                    fire.destroy();
                    clearInterval(interval);
                }
            };
            // Simplification for editor testing
            interval = setInterval(update, 16);
        });
        this.particlePanel.addChild(spawnFireBtn.container);

        this.pixiContainer.addChild(this.particlePanel.container);

        this.loadAchievementSnapshot();
    }

    private buildUI() {
        this.container.innerHTML = `
            <style>
                .world-editor { background: #1a1a1a; color: #eee; padding: 20px; border-radius: 8px; font-family: sans-serif; width: 800px; }
                .editor-header { display: flex; justify-content: space-between; margin-bottom: 20px; }
                .tab-content { background: #222; padding: 15px; border-radius: 4px; height: 400px; overflow-y: auto; }
                .actor-row { display: flex; gap: 10px; margin-bottom: 10px; border-bottom: 1px solid #444; padding-bottom: 5px; }
                input { background: #333; border: 1px solid #555; color: #fff; padding: 5px; border-radius: 3px; }
            </style>
            <div class="editor-header">
                <div>
                    <h2>RPG World Database Editor</h2>
                    <div id="server-status" style="font-size: 12px; color: #888;">Server: Polling...</div>
                </div>
                <div>
                    <button id="btn-ai-gen" style="background:#4400aa; color:#fff;">AI GEN SPRITE</button>
                    <button id="btn-add-actor">+ Actor</button>
                    <button id="btn-save-db" style="background:#004400; color:#fff;">SAVE TO SERVER</button>
                </div>
            </div>
            <div class="tab-content" id="actor-list">
                <!-- Actors will be listed here -->
            </div>
        `;

        this.container.querySelector('#btn-save-db')?.addEventListener('click', () => this.saveToServer());
        this.container.querySelector('#btn-add-actor')?.addEventListener('click', () => this.addActor());
        this.container.querySelector('#btn-ai-gen')?.addEventListener('click', () => this.generateAiSprite());

        // Polling for server stats
        setInterval(() => this.pollServerStatus(), 5000);
        this.pollServerStatus();
    }

    private async pollServerStatus() {
        try {
            const resp = await fetch(\`\${SERVER_URL}/stats\`);
            const stats = await resp.json();
            const el = this.container.querySelector('#server-status');
            if (el) {
                let statusText = `Server: Online | Players: ${stats.players} | Rooms: ${stats.rooms} | Uptime: ${stats.uptime}s`;

                // Show regional breakdown if available
                if (stats.mapPopulation) {
                    const maps = Object.keys(stats.mapPopulation);
                    if (maps.length > 0) {
                        statusText += ` | Clusters: ${maps.length}`;
                    }
                }

                el.textContent = statusText;
                el.style.color = '#00ff00';
            }
        } catch (e) {
            const el = this.container.querySelector('#server-status');
            if (el) {
                el.textContent = 'Server: Offline';
                el.style.color = '#ff0000';
            }
        }
    }

    private generateAiSprite() {
        const userInput = window.prompt("Enter prompt for NPC sprite (e.g. 'Old wizard with a blue robe'):");
        if (userInput) {
            GenerativeAIManager.generateSpriteFromText(userInput);
            
            const onGenerated = (ev: any) => {
                const { type, data } = ev.detail;
                if (type === 'sprite') {
                    AchievementManager.incrementStat('aiSpritesGenerated');
                    ToastManager.showInfo(`AI Sprite generated from: ${userInput}`);
                    this.saveAchievementSnapshot();

                    // Automatically add an actor with this sprite
                    const actor: ActorData = {
                        id: this.db.actors.length + 1,
                        name: "AI NPC",
                        classId: 1,
                        initialLevel: 1,
                        faceName: data,
                        characterName: data,
                        description: userInput
                    };
                    this.db.actors.push(actor);
                    this.renderActors();
                    document.removeEventListener('ai-asset-generated', onGenerated);
                }
            };
            document.addEventListener('ai-asset-generated', onGenerated);
        }
    }

    private loadFromServer() {
        networkManager.loadRPGDatabase((data) => {
            if (data.success) {
                Object.assign(this.db, data.db);
                this.renderActors();
            }
        });
    }

    private saveToServer() {
        networkManager.saveRPGDatabase(this.db, (data) => {
            if (data.success) {
                ToastManager.showInfo("Database saved to server.");
                this.saveAchievementSnapshot();
            } else {
                ToastManager.showError("Save failed: " + data.error);
            }
        });
    }

    private addActor() {
        const actor: ActorData = {
            id: this.db.actors.length + 1,
            name: "New Actor",
            classId: 1,
            initialLevel: 1,
            faceName: "",
            characterName: "",
            description: ""
        };
        this.db.actors.push(actor);
        AchievementManager.incrementStat('actorsCreated');
        ToastManager.showInfo("Actor added to world database.");
        this.saveAchievementSnapshot();
        this.renderActors();
    }

    private loadAchievementSnapshot() {
        const identity = getAchievementIdentity();
        networkManager.loadAchievementData(identity, (data) => {
            if (data?.success && data.snapshot) {
                AchievementManager.mergeSnapshot(data.snapshot);
            }
        });
    }

    private saveAchievementSnapshot() {
        const identity = getAchievementIdentity();
        networkManager.saveAchievementData(identity, AchievementManager.exportSnapshot());
    }

    private renderActors() {
        const list = this.container.querySelector('#actor-list')!;
        list.innerHTML = '';
        this.db.actors.forEach((actor, index) => {
            const row = document.createElement('div');
            row.className = 'actor-row';
            row.innerHTML = `
                <div class="actor-row">
                    <span>ID: ${actor.id}</span>
                    <input type="text" value="${actor.name}" class="actor-name-input">
                    <input type="text" placeholder="Character Sprite" value="${actor.characterName}" class="actor-sprite-input">
                    <button class="btn-edit-interaction" data-id="${actor.id}">INTERACTIONS</button>
                </div>
            `;
            list.appendChild(row);
        });

        list.querySelectorAll('.btn-edit-interaction').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt((e.target as HTMLElement).dataset.id!);
                const actor = this.db.actors.find(a => a.id === id);
                if (!actor) return;

                const choice = confirm("Use AI to generate dialogue? (Cancel for manual entry)");
                if (choice) {
                    const prompt = window.prompt(`Enter a persona/context for ${actor.name}:`, "A grumpy old man who hates kids.");
                    if (prompt) {
                        GenerativeAIManager.generateDialogue(actor.name, prompt);

                        const onGenerated = (ev: any) => {
                            const { type, characterName, data } = ev.detail;
                            if (type === 'dialogue' && characterName === actor.name) {
                                actor.description = data.join(" ");
                                ToastManager.showInfo(`Dialogue generated for ${actor.name}`);
                                document.removeEventListener('ai-asset-generated', onGenerated);
                            }
                        };
                        document.addEventListener('ai-asset-generated', onGenerated);
                    }
                } else {
                    const text = prompt("Enter NPC Dialogue:");
                    if (text) {
                        actor.description = text;
                        ToastManager.showInfo(`Dialogue updated for ${actor.name}`);
                    }
                }
            });
        });
    }
}
