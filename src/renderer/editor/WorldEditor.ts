import { RPGDatabase, ActorData } from '../../shared/database/RPGDatabase';
import { networkManager } from '../puzzle';
import { SERVER_URL } from '../../shared/Config';
import { AchievementManager } from '../data/AchievementManager';
import { ToastManager } from '../ui/ToastManager';

export class WorldEditor {
    private container: HTMLElement;
    private db: RPGDatabase = new RPGDatabase();

    constructor(parentElementId: string) {
        const parent = document.getElementById(parentElementId);
        if (!parent) throw new Error(`Element with id ${parentElementId} not found`);
        
        this.container = document.createElement('div');
        this.container.className = 'world-editor';
        parent.appendChild(this.container);

        if (!networkManager.connected) {
            networkManager.connect(SERVER_URL);
        }
        networkManager.on('connected', () => this.loadAchievementSnapshot());
        
        this.buildUI();
        this.loadFromServer();
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
                <h2>RPG World Database Editor</h2>
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
    }

    private generateAiSprite() {
        const userInput = window.prompt("Enter prompt for NPC sprite (e.g. 'Old wizard with a blue robe'):");
        if (userInput) {
            networkManager.emit('generateAsset', { type: 'npc_sprite', prompt: userInput });
            ToastManager.showInfo("AI sprite generation started...");
            
            networkManager.once('assetGenerated', (data: any) => {
                if (data.success) {
                    AchievementManager.incrementStat('aiSpritesGenerated');
                    ToastManager.showInfo(`AI Sprite generated: ${data.assetId}`);
                    this.saveAchievementSnapshot();
                    // Automatically add an actor with this sprite
                    const actor: ActorData = {
                        id: this.db.actors.length + 1,
                        name: "AI Generated NPC",
                        classId: 1,
                        initialLevel: 1,
                        faceName: data.url,
                        characterName: data.url,
                        description: userInput
                    };
                    this.db.actors.push(actor);
                    this.renderActors();
                }
            });
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
        const playerName = localStorage.getItem('playerName') || 'WebPlayer';
        networkManager.loadAchievementData(playerName, (data) => {
            if (data?.success && data.snapshot) {
                AchievementManager.mergeSnapshot(data.snapshot);
            }
        });
    }

    private saveAchievementSnapshot() {
        const playerName = localStorage.getItem('playerName') || 'WebPlayer';
        networkManager.saveAchievementData(playerName, AchievementManager.exportSnapshot());
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
                const id = (e.target as HTMLElement).dataset.id;
                const text = prompt("Enter NPC Dialogue:");
                if (text) {
                    alert(`Interaction saved for NPC ${id}: "${text}"`);
                }
            });
        });
    }
}
