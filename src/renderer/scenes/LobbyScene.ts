import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Scene, SceneConfig } from '../state/Scene';
import { StateManager } from '../state/StateManager';
import { SceneTransition } from '../state/SceneTransition';
import { NetworkManager, LobbyRoom } from '../../shared/puzzle/NetworkManager';
import { PuzzleScene } from '../puzzle/PuzzleScene';
import { SERVER_URL } from '../../shared/Config';

export interface LobbyRoomExt extends LobbyRoom {
    hasPassword?: boolean;
    isTournament?: boolean;
}

export class LobbyScene extends Scene {
    private networkManager: NetworkManager;
    private roomListContainer: Container;
    private leaderboardContainer: Container;
    private titleText!: Text;
    private connectingText!: Text;
    private uiElements: HTMLElement[] = [];
    private chatContainer: HTMLElement | null = null;
    private bracketContainer: HTMLElement | null = null;
    private playersContainer: HTMLElement | null = null;

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

        this.connectingText = new Text({ text: 'Connecting to Server...', style: { fill: '#ffff00', fontSize: 24 } });
        this.connectingText.anchor.set(0.5, 0);
        this.connectingText.position.set(this.app.screen.width / 2, 100);
        this.container.addChild(this.connectingText);

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
                    <label style="display: flex; align-items: center; gap: 5px;">
                        <input type="checkbox" id="roomTournamentInput" /> Tournament
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
            const isTournament = (document.getElementById('roomTournamentInput') as HTMLInputElement).checked;
            const gameMode = (document.getElementById('gameModeInput') as HTMLSelectElement).value;
            const startLevel = parseInt((document.getElementById('startLevelInput') as HTMLInputElement).value) || 1;
            this.networkManager.createRoom({ name, password, isPrivate, gameMode, startLevel, isTournament });
        };

        document.getElementById('backBtn')!.onclick = () => {
            SceneTransition.popWithFade(this.app);
        };

        this.networkManager.connect(SERVER_URL);
        this.setupNetworkHandlers();
        
        const playerName = localStorage.getItem('playerName') || 'Player' + Math.floor(Math.random() * 1000);
        this.networkManager.setName(playerName);
        
        // Initial refresh
        setTimeout(() => {
            this.refreshRoomList();
            this.refreshLeaderboard();
        }, 500);
    }

    private setupNetworkHandlers(): void {
        this.networkManager.on('connected', () => {
            if (this.connectingText) {
                this.connectingText.text = 'Connected!';
                setTimeout(() => {
                    if (this.connectingText) this.connectingText.visible = false;
                }, 1000);
            }
        });

        this.networkManager.on('disconnected', () => {
            if (this.connectingText) {
                this.connectingText.text = 'Disconnected. Reconnecting...';
                this.connectingText.visible = true;
            }
        });

        this.networkManager.on('roomCreated', (room: LobbyRoom) => {
            const password = (document.getElementById('roomPasswordInput') as HTMLInputElement)?.value || "";
            this.networkManager.joinRoom({ id: room.id, password });
        });

        this.networkManager.on('joinedRoom', (room: any) => {
            this.titleText.text = `Waiting in ${room.name}...`;
            this.uiElements.forEach(el => el.style.display = 'none');
            this.roomListContainer.visible = false;
            this.leaderboardContainer.visible = false;
            
            this.createPlayersUI(room.playerNames || []);
            this.createChatUI();
            
            if (room.isTournament) {
                this.showTournamentBracket(room.id);
            }
        });

        this.networkManager.on('roomUpdated', (data: { playerNames: string[] }) => {
            this.updatePlayersUI(data.playerNames);
        });

        this.networkManager.on('chatMessage', (data: { message: string, name: string, timestamp: number }) => {
            this.handleChatMessage(data);
        });

        this.networkManager.on('gameStart', (data: { seed: number, gameMode: string, startLevel: number }) => {
            console.log('Game starting with seed:', data.seed, 'Mode:', data.gameMode, 'Level:', data.startLevel);
            if (this.bracketContainer) {
                this.bracketContainer.style.display = 'none';
            }
            this.manager.push(new PuzzleScene({
                name: 'Puzzle',
                app: this.app,
                camera: this.camera ?? undefined,
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
        const tourneyStr = room.isTournament ? " [TOURNAMENT]" : "";
        
        // Display state
        let stateColor = '#aaaaaa';
        if (room.state === 'LOBBY') stateColor = '#00ff00';
        else if (room.state === 'PLAYING') stateColor = '#ffaa00';
        
        const stateText = new Text({ text: `[${room.state}]`, style: { fill: stateColor, fontSize: 20, fontWeight: 'bold' } });
        row.addChild(stateText);

        const text = new Text({ text: `${room.name}${lockStr}${tourneyStr} (${room.players}/${room.maxPlayers})`, style: { fill: '#ffffff', fontSize: 24 } });
        text.position.set(120, -2);
        row.addChild(text);

        const joinBtn = this.createStyledButton('Join', 100, 40);
        joinBtn.position.set(550, -5);
        joinBtn.on('pointerdown', () => {
            let password = "";
            if (room.hasPassword) {
                password = prompt(`Enter password for room ${room.name}:`) || "";
            }
            this.networkManager.joinRoom({ id: room.id, password });
        });
        row.addChild(joinBtn);

        const watchBtn = this.createStyledButton('Watch', 100, 40);
        watchBtn.position.set(670, -5);
        watchBtn.on('pointerdown', () => {
            this.networkManager.joinRoom({ id: room.id, spectator: true });
        });
        row.addChild(watchBtn);

        if (room.isTournament) {
            const bracketBtn = this.createStyledButton('Bracket', 120, 40);
            bracketBtn.position.set(790, -5);
            bracketBtn.on('pointerdown', () => {
                this.showTournamentBracket(room.id);
            });
            row.addChild(bracketBtn);
        }

        return row;
    }

    private createStyledButton(label: string, w: number, h: number): Container {
        const btn = new Container();
        const g = new Graphics();
        g.roundRect(0, 0, w, h, 10);
        g.fill(0x3366ff);
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

    private showTournamentBracket(roomId: string): void {
        this.networkManager.getTournamentBracket(roomId, (data: any) => {
            if (this.bracketContainer) {
                this.bracketContainer.remove();
            }

            this.bracketContainer = document.createElement('div');
            this.bracketContainer.style.position = 'absolute';
            this.bracketContainer.style.left = '50%';
            this.bracketContainer.style.top = '150px';
            this.bracketContainer.style.transform = 'translateX(-50%)';
            this.bracketContainer.style.width = '600px';
            this.bracketContainer.style.height = '400px';
            this.bracketContainer.style.background = 'rgba(0,0,0,0.9)';
            this.bracketContainer.style.color = 'white';
            this.bracketContainer.style.display = 'flex';
            this.bracketContainer.style.flexDirection = 'column';
            this.bracketContainer.style.padding = '20px';
            this.bracketContainer.style.borderRadius = '8px';
            this.bracketContainer.style.border = '2px solid #ffcc00';

            let html = `<h2 style="text-align:center; color:#ffcc00; margin-top:0;">TOURNAMENT BRACKET</h2>`;
            html += `<div style="display:flex; justify-content:space-around; flex-grow:1; align-items:center;">`;
            
            // Very basic visual representation using flexbox
            const rounds = [1, 2]; // Hardcoded for dummy data demo
            
            rounds.forEach(r => {
                const roundMatches = data.matches.filter((m: any) => m.round === r);
                html += `<div style="display:flex; flex-direction:column; justify-content:space-around; height:100%;">
`;
                roundMatches.forEach((m: any) => {
                    html += `
                        <div style="border: 1px solid #666; padding: 10px; margin: 10px; background: #222; min-width: 120px; text-align: center;">
                            <div style="border-bottom: 1px solid #444; padding-bottom: 5px;">${m.p1 || '-'}</div>
                            <div style="padding-top: 5px;">${m.p2 || '-'}</div>
                            ${m.winner ? `<div style="color: #ffcc00; margin-top: 5px; font-weight: bold;">Winner: ${m.winner}</div>` : ''}
                        </div>
                    `;
                });
                html += `</div>`;
            });
            
            html += `</div>`;
            html += `<button id="closeBracketBtn" style="padding: 10px; background: #ffcc00; color: black; font-weight: bold; border: none; cursor: pointer; margin-top: 10px;">Close Bracket</button>`;
            
            this.bracketContainer.innerHTML = html;
            document.body.appendChild(this.bracketContainer);
            this.uiElements.push(this.bracketContainer);

            document.getElementById('closeBracketBtn')!.onclick = () => {
                if (this.bracketContainer) {
                    this.bracketContainer.style.display = 'none';
                }
            };
        });
    }

    private createPlayersUI(playerNames: string[]): void {
        if (this.playersContainer) return;

        this.playersContainer = document.createElement('div');
        this.playersContainer.style.position = 'absolute';
        this.playersContainer.style.left = '20px';
        this.playersContainer.style.top = '120px';
        this.playersContainer.style.width = '200px';
        this.playersContainer.style.background = 'rgba(0,0,0,0.8)';
        this.playersContainer.style.color = 'white';
        this.playersContainer.style.display = 'flex';
        this.playersContainer.style.flexDirection = 'column';
        this.playersContainer.style.padding = '10px';
        this.playersContainer.style.borderRadius = '8px';
        this.playersContainer.style.border = '1px solid #00ff00';

        document.body.appendChild(this.playersContainer);
        this.uiElements.push(this.playersContainer);
        
        this.updatePlayersUI(playerNames);
    }

    private updatePlayersUI(playerNames: string[]): void {
        if (!this.playersContainer) return;
        
        let html = `<h3 style="margin-top:0; color:#00ff00; border-bottom:1px solid #444; padding-bottom:5px;">Players (${playerNames.length})</h3>`;
        html += `<ul style="list-style:none; padding:0; margin:0; margin-top:10px;">`;
        playerNames.forEach(name => {
            html += `<li style="padding: 5px 0; font-size: 16px;">• ${name}</li>`;
        });
        html += `</ul>`;
        
        this.playersContainer.innerHTML = html;
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
        this.chatContainer = null;
        this.bracketContainer = null;
        this.playersContainer = null;
    }
}
