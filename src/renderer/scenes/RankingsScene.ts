import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Scene, SceneConfig } from '../state/Scene';
import { networkManager } from '../puzzle';
import { SceneTransition } from '../state/SceneTransition';
import { StateManager } from '../state/StateManager';
import { InputManager } from '../input/InputManager';
import { PuzzleScene, PuzzleSceneConfig } from '../puzzle/PuzzleScene';
import { BobNet } from '../puzzle/BobNet';
import { AchievementManager } from '../data/AchievementManager';

export class RankingsScene extends Scene {
    private background!: Graphics;
    private titleText!: Text;
    private listContainer: Container;

    constructor(config: SceneConfig) {
        super(config);
        this.listContainer = new Container();
    }

    public async create(): Promise<void> {
        this.createBackground();
        this.createTitle();
        this.container.addChild(this.listContainer);

        // Fetch rankings from server
        // Using getLeaderboard with a specific 'elo' mode or similar
        networkManager.getLeaderboard('marathon', (data: any) => {
            this.renderRankings(data.scores);
        });
    }

    private createBackground(): void {
        this.background = new Graphics();
        this.background.rect(0, 0, this.width, this.height);
        this.background.fill({ color: 0x050510, alpha: 1.0 });
        this.container.addChild(this.background);
    }

    private createTitle(): void {
        const style = new TextStyle({
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: 48,
            fill: 0x00ff00,
            stroke: { color: 0x000000, width: 4 }
        });
        this.titleText = new Text({ text: 'GLOBAL RANKINGS', style });
        this.titleText.anchor.set(0.5);
        this.titleText.position.set(this.width / 2, 60);
        this.container.addChild(this.titleText);
    }

    private renderRankings(scores: any[]): void {
        this.listContainer.removeChildren();
        
        const headerStyle = new TextStyle({ fill: 0x888888, fontSize: 16 });
        const headers = new Text({ text: 'RANK      NAME                ELO      SCORE', style: headerStyle });
        headers.position.set(this.width / 2 - 250, 120);
        this.listContainer.addChild(headers);

        scores.forEach((s, i) => {
            const row = new Container();
            row.position.set(this.width / 2 - 250, 160 + i * 35);
            
            const rank = new Text({ text: `#${i + 1}`, style: { fill: 0xffd700, fontSize: 18 } });
            const name = new Text({ text: s.name.substring(0, 15).padEnd(15), style: { fill: 0xffffff, fontSize: 18 } });
            const elo = new Text({ text: (s.elo || 1000).toString(), style: { fill: 0x00ff00, fontSize: 18 } });
            const score = new Text({ text: s.score.toLocaleString(), style: { fill: 0xaaaaaa, fontSize: 16 } });

            name.x = 80;
            elo.x = 280;
            score.x = 380;

            row.addChild(rank, name, elo, score);

            if (s.replay) {
                const watchBtn = new Container();
                const btnBg = new Graphics();
                btnBg.roundRect(0, 0, 80, 24, 4);
                btnBg.fill(0xaa0000);
                watchBtn.addChild(btnBg);
                
                const btnTxt = new Text({ text: '▶ WATCH', style: { fill: 0xffffff, fontSize: 12, fontWeight: 'bold' } });
                btnTxt.anchor.set(0.5);
                btnTxt.position.set(40, 12);
                watchBtn.addChild(btnTxt);

                watchBtn.position.set(500, -2);
                watchBtn.eventMode = 'static';
                watchBtn.cursor = 'pointer';
                
                watchBtn.on('pointerdown', () => this.playReplay(s.replay));
                
                row.addChild(watchBtn);
            }

            this.listContainer.addChild(row);
        });
    }

    private playReplay(replayB64: string): void {
        try {
            const jsonObj = BobNet.fromBase64GZippedGSON(replayB64);
            if (jsonObj) {
                AchievementManager.incrementStat('matchesSpectated');
                const puzzleConfig: PuzzleSceneConfig = {
                    name: 'puzzle-replay',
                    app: this.app,
                    camera: this.camera ?? undefined,
                    replayData: JSON.stringify(jsonObj)
                };
                const puzzleScene = new PuzzleScene(puzzleConfig);
                SceneTransition.pushWithFade(this.app, puzzleScene);
            } else {
                alert("Failed to load replay data.");
            }
        } catch (e) {
            console.error("Replay load error:", e);
            alert("Failed to parse replay.");
        }
    }

    protected onUpdate(dt: number): void {
        if (InputManager.isCancelPressed()) {
            StateManager.pop();
        }
    }
}
