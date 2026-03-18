import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Scene, SceneConfig } from '../state/Scene';
import { NetworkManager, LobbyRoom } from '../../shared/puzzle/NetworkManager';
import { PuzzleScene } from '../puzzle/PuzzleScene';

export class LobbyScene extends Scene {
    private networkManager: NetworkManager;
    private roomListContainer: Container;
    private titleText!: Text;
    private createButton!: Container;

    constructor(config: SceneConfig) {
        super(config);
        this.networkManager = new NetworkManager(null);
        this.roomListContainer = new Container();
    }

    public async create(): Promise<void> {
        this.container.addChild(this.roomListContainer);

        const style = new TextStyle({
            fill: '#ffffff',
            fontSize: 36,
            fontWeight: 'bold'
        });

        this.titleText = new Text({ text: 'Multiplayer Lobby', style });
        this.titleText.anchor.set(0.5, 0);
        this.titleText.position.set(this.app.screen.width / 2, 50);
        this.container.addChild(this.titleText);

        this.createButton = this.createStyledButton('Create Room', 200, 50);
        this.createButton.position.set(this.app.screen.width / 2 - 100, 120);
        this.createButton.on('pointerdown', () => this.networkManager.createRoom('New Room'));
        this.container.addChild(this.createButton);

        this.networkManager.connect('http://localhost:6065');
        this.setupNetworkHandlers();
        
        // Initial refresh
        setTimeout(() => this.refreshRoomList(), 500);
    }

    private setupNetworkHandlers(): void {
        this.networkManager.on('roomCreated', (room: LobbyRoom) => {
            this.networkManager.joinRoom(room.id);
        });

        this.networkManager.on('joinedRoom', (room: LobbyRoom) => {
            this.titleText.text = `Waiting in ${room.name}...`;
            this.createButton.visible = false;
            this.roomListContainer.visible = false;
        });

        this.networkManager.on('gameStart', (data: { seed: number }) => {
            console.log('Game starting with seed:', data.seed);
            this.manager.push(new PuzzleScene({ 
                name: 'Puzzle',
                app: this.app,
                multiplayer: true,
                seed: data.seed 
            }));
        });
    }

    private refreshRoomList(): void {
        this.networkManager.listRooms((rooms) => {
            this.roomListContainer.removeChildren();
            rooms.forEach((room, index) => {
                const roomRow = this.createRoomRow(room, index);
                this.roomListContainer.addChild(roomRow);
            });
        });
    }

    private createRoomRow(room: LobbyRoom, index: number): Container {
        const row = new Container();
        row.position.set(100, 200 + index * 60);

        const text = new Text({ text: `${room.name} (${room.players}/${room.maxPlayers})`, style: { fill: '#ffffff', fontSize: 24 } });
        row.addChild(text);

        const joinBtn = this.createStyledButton('Join', 100, 40);
        joinBtn.position.set(400, 0);
        joinBtn.on('pointerdown', () => this.networkManager.joinRoom(room.id));
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

    protected async destroy(): Promise<void> {
        this.networkManager.disconnect();
        this.roomListContainer.destroy({ children: true });
    }
}
