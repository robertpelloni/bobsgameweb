import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Scene, SceneConfig } from '../state/Scene';
import { NetworkManager, LobbyRoom } from '../../shared/puzzle/NetworkManager';
import { PuzzleScene } from '../puzzle/PuzzleScene';

export interface LobbyRoomExt extends LobbyRoom {
    hasPassword?: boolean;
}

export class LobbyScene extends Scene {
    private networkManager: NetworkManager;
    private roomListContainer: Container;
    private leaderboardContainer: Container;
    private titleText!: Text;
    private uiElements: HTMLElement[] = [];
    private chatContainer: HTMLElement | null = null;

    constructor(config: SceneConfig) {
        super(config);
        this.networkManager = new NetworkManager(null);
        this.roomListContainer = new Container();
        this.leaderboardContainer = new Container();
    }

    public async create(): Promise<void> {
        this.container.addChild(this.roomListContainer);
        this.container.addChild(this.leaderboardContainer);

        const style = new TextStyle({
            fill: '#ffffff',
            fontSize: 36,
            fontWeight: 'bold'
        });

        this.titleText = new Text({ text: 'Multiplayer Lobby', style });
        this.titleText.anchor.set(0.5, 0);
        this.titleText.position.set(this.app.screen.width / 2, 50);
        this.container.addChild(this.titleText);

        const createRoomDiv = document.createElement('div');
        createRoomDiv.style.position = 'absolute';
        createRoomDiv.style.left = '50%';
        createRoomDiv.style.top = '120px';
        createRoomDiv.style.transform = 'translateX(-50%)';
        createRoomDiv.style.display = 'flex';
        createRoomDiv.style.gap = '10px';
        createRoomDiv.style.background = 'rgba(0,0,0,0.7)';
        createRoomDiv.style.padding = '10px';
        createRoomDiv.style.borderRadius = '8px';
        createRoomDiv.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 5px;">
                <div style="display: flex; gap: 10px;">
                    <input type="text" id="roomNameInput" placeholder="Room Name" value="New Room" style="padding: 5px;" />
                    <input type="password" id="roomPasswordInput" placeholder="Password (Optional)" style="padding: 5px;" />
                </div>
                <div style="display: flex; gap: 10px; align-items: center; color: white;">
                    <select id="gameModeInput" style="padding: 5px;">
                        <option value="marathon">Marathon</option>
                        <option value="sprint">Sprint (40 Lines)</option>
                        <option value="ultra">Ultra (3 Min)</option>
                    </select>
                    <input type="number" id="startLevelInput" value="1" min="1" max="20" style="width: 50px; padding: 5px;" />
                    <label style="display: flex; align-items: center; gap: 5px;">
                        <input type="checkbox" id="roomPrivateInput" /> Private
                    </label>
                </div>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button id="createRoomBtn" style="padding: 5px 10px; cursor: pointer;">Create Room</button>
                    <button id="backBtn" style="padding: 5px 10px; cursor: pointer;">Back</button>
                </div>
            </div>
        `;
        document.body.appendChild(createRoomDiv);
        this.uiElements.push(createRoomDiv);

        document.getElementById('createRoomBtn')!.onclick = () => {
            const name = (document.getElementById('roomNameInput') as HTMLInputElement).value;
            const password = (document.getElementById('roomPasswordInput') as HTMLInputElement).value;
            const isPrivate = (document.getElementById('roomPrivateInput') as HTMLInputElement).checked;
            const gameMode = (document.getElementById('gameModeInput') as HTMLSelectElement).value;
            const startLevel = parseInt((document.getElementById('startLevelInput') as HTMLInputElement).value) || 1;
            this.networkManager.createRoom({ name, password, isPrivate, gameMode, startLevel });
        };

        document.getElementById('backBtn')!.onclick = () => {
            this.manager.pop();
        };

        this.networkManager.connect('http://localhost:6065');
        this.setupNetworkHandlers();
        
        // Initial refresh
        setTimeout(() => {
            this.refreshRoomList();
            this.refreshLeaderboard();
        }, 500);
    }

    private setupNetworkHandlers(): void {
        this.networkManager.on('roomCreated', (room: LobbyRoom) => {
            const password = (document.getElementById('roomPasswordInput') as HTMLInputElement)?.value || "";
            this.networkManager.joinRoom({ id: room.id, password });
        });

        this.networkManager.on('joinedRoom', (room: LobbyRoom) => {
            this.titleText.text = `Waiting in ${room.name}...`;
            this.uiElements.forEach(el => el.style.display = 'none');
            this.roomListContainer.visible = false;
            this.leaderboardContainer.visible = false;
            this.createChatUI();
        });

        this.networkManager.on('chatMessage', (data: { message: string, name: string, timestamp: number }) => {
            this.handleChatMessage(data);
        });

        this.networkManager.on('gameStart', (data: { seed: number, gameMode: string, startLevel: number }) => {
            console.log('Game starting with seed:', data.seed, 'Mode:', data.gameMode, 'Level:', data.startLevel);
            this.manager.push(new PuzzleScene({ 
                name: 'Puzzle',
                app: this.app,
                multiplayer: true,
                seed: data.seed,
                gameMode: data.gameMode as any,
                startLevel: data.startLevel
            }));
        });

        this.networkManager.on('error', (msg: string) => {
            alert("Error: " + msg);
        });
    }

    private refreshRoomList(): void {
        this.networkManager.listRooms((rooms: LobbyRoomExt[]) => {
            this.roomListContainer.removeChildren();
            rooms.forEach((room, index) => {
                const roomRow = this.createRoomRow(room, index);
                this.roomListContainer.addChild(roomRow);
            });
        });
    }

    private refreshLeaderboard(): void {
        this.networkManager.getLeaderboard('marathon', (data) => {
            this.leaderboardContainer.removeChildren();
            
            const title = new Text({ text: 'Top Scores (Marathon)', style: { fill: '#ffff00', fontSize: 28 } });
            title.position.set(600, 200);
            this.leaderboardContainer.addChild(title);

            data.scores.forEach((score, index) => {
                const row = new Container();
                row.position.set(600, 250 + index * 40);
                const text = new Text({ text: `${index + 1}. ${score.name}: ${score.score} pts`, style: { fill: '#ffffff', fontSize: 20 } });
                row.addChild(text);
                this.leaderboardContainer.addChild(row);
            });
        });
    }

    private createRoomRow(room: LobbyRoomExt, index: number): Container {
        const row = new Container();
        row.position.set(100, 200 + index * 60);

        const lockStr = room.hasPassword ? " 🔒" : "";
        const text = new Text({ text: `${room.name}${lockStr} (${room.players}/${room.maxPlayers})`, style: { fill: '#ffffff', fontSize: 24 } });
        row.addChild(text);

        const joinBtn = this.createStyledButton('Join', 100, 40);
        joinBtn.position.set(400, 0);
        joinBtn.on('pointerdown', () => {
            let password = "";
            if (room.hasPassword) {
                password = prompt(`Enter password for room ${room.name}:`) || "";
            }
            this.networkManager.joinRoom({ id: room.id, password });
        });
        row.addChild(joinBtn);

        return row;
    }

    private createStyledButton(label: string, w: number, h: number): Container {
        const btn = new Container();
        const g = new Graphics();
        g.beginFill(0x3366ff);
        g.drawRoundedRect(0, 0, w, h, 10);
        g.endFill();
        btn.addChild(g);

        const t = new Text({ text: label, style: { fill: '#ffffff', fontSize: 20 } });
        t.anchor.set(0.5);
        t.position.set(w / 2, h / 2);
        btn.addChild(t);

        btn.eventMode = 'static';
        btn.cursor = 'pointer';
        return btn;
    }

    public onUpdate(delta: number): void {
        // Auto refresh every 5 seconds
        if (Math.floor(Date.now() / 5000) !== Math.floor((Date.now() - delta * 16) / 5000)) {
            this.refreshRoomList();
        }
    }

    private createChatUI(): void {
        if (this.chatContainer) return;

        this.chatContainer = document.createElement('div');
        this.chatContainer.style.position = 'absolute';
        this.chatContainer.style.left = '50%';
        this.chatContainer.style.top = '120px';
        this.chatContainer.style.transform = 'translateX(-50%)';
        this.chatContainer.style.width = '400px';
        this.chatContainer.style.height = '300px';
        this.chatContainer.style.background = 'rgba(0,0,0,0.8)';
        this.chatContainer.style.color = 'white';
        this.chatContainer.style.display = 'flex';
        this.chatContainer.style.flexDirection = 'column';
        this.chatContainer.style.padding = '10px';
        this.chatContainer.style.borderRadius = '8px';
        this.chatContainer.style.border = '1px solid #3366ff';

        this.chatContainer.innerHTML = `
            <div id="chatMessages" style="flex-grow: 1; overflow-y: auto; margin-bottom: 10px; font-family: monospace; font-size: 14px;"></div>
            <div style="display: flex; gap: 5px;">
                <input type="text" id="chatInput" placeholder="Type a message..." style="flex-grow: 1; padding: 5px; background: #222; color: white; border: 1px solid #444;" />
                <button id="sendChatBtn" style="padding: 5px 10px; background: #3366ff; color: white; border: none; cursor: pointer;">Send</button>
            </div>
        `;

        document.body.appendChild(this.chatContainer);
        this.uiElements.push(this.chatContainer);

        const input = document.getElementById('chatInput') as HTMLInputElement;
        const sendBtn = document.getElementById('sendChatBtn') as HTMLButtonElement;

        const sendMessage = () => {
            const msg = input.value.trim();
            if (msg) {
                const name = localStorage.getItem('playerName') || 'Player';
                this.networkManager.sendChat(msg, name);
                input.value = '';
            }
        };

        sendBtn.onclick = sendMessage;
        input.onkeydown = (e) => {
            if (e.key === 'Enter') sendMessage();
        };
    }

    private handleChatMessage(data: { message: string, name: string, timestamp: number }): void {
        const messagesDiv = document.getElementById('chatMessages');
        if (messagesDiv) {
            const msgEl = document.createElement('div');
            const time = new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            msgEl.innerHTML = `<span style="color: #888;">[${time}]</span> <span style="color: #3366ff; font-weight: bold;">${data.name}:</span> ${data.message}`;
            messagesDiv.appendChild(msgEl);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
    }

    protected async destroy(): Promise<void> {
        this.networkManager.disconnect();
        this.roomListContainer.destroy({ children: true });
        this.uiElements.forEach(el => el.remove());
        this.uiElements = [];
    }
}

