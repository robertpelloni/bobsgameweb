import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Scene, SceneConfig } from '../state/Scene';

export interface TournamentResultData {
    winnerName: string;
    finalBracket: any[];
    stats: {
        totalGames: number;
        topCombo: number;
        topChain: number;
    };
}

export class TournamentResultsScene extends Scene {
    private data: TournamentResultData;
    private uiElements: HTMLElement[] = [];

    constructor(config: SceneConfig & { data: TournamentResultData }) {
        super(config);
        this.data = config.data;
    }

    public async create(): Promise<void> {
        const style = new TextStyle({
            fill: '#ffcc00',
            fontSize: 48,
            fontWeight: 'bold',
            dropShadow: {
                alpha: 0.5,
                angle: Math.PI / 6,
                blur: 4,
                color: '#000000',
                distance: 6,
            }
        });

        const title = new Text({ text: 'TOURNAMENT COMPLETE', style });
        title.anchor.set(0.5, 0);
        title.position.set(this.app.screen.width / 2, 50);
        this.container.addChild(title);

        const winnerStyle = new TextStyle({
            fill: '#ffffff',
            fontSize: 36,
            fontWeight: 'bold'
        });

        const winnerText = new Text({ text: `WINNER: ${this.data.winnerName}`, style: winnerStyle });
        winnerText.anchor.set(0.5, 0);
        winnerText.position.set(this.app.screen.width / 2, 130);
        this.container.addChild(winnerText);

        this.createStatsUI();
        this.createBracketPreview();
        this.createButtons();
    }

    private createStatsUI(): void {
        const statsDiv = document.createElement('div');
        statsDiv.style.position = 'absolute';
        statsDiv.style.left = '50%';
        statsDiv.style.top = '200px';
        statsDiv.style.transform = 'translateX(-50%)';
        statsDiv.style.width = '400px';
        statsDiv.style.background = 'rgba(0,0,0,0.7)';
        statsDiv.style.color = 'white';
        statsDiv.style.padding = '20px';
        statsDiv.style.borderRadius = '8px';
        statsDiv.style.border = '1px solid #ffcc00';
        statsDiv.style.fontFamily = 'monospace';

        statsDiv.innerHTML = `
            <h3 style="margin-top:0; color:#ffcc00; text-align:center;">TOURNAMENT STATS</h3>
            <div style="display:flex; justify-content:space-between; margin: 10px 0;">
                <span>Total Matches:</span>
                <span>${this.data.stats.totalGames}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin: 10px 0;">
                <span>Highest Combo:</span>
                <span>${this.data.stats.topCombo}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin: 10px 0;">
                <span>Highest Chain:</span>
                <span>${this.data.stats.topChain}</span>
            </div>
        `;

        document.body.appendChild(statsDiv);
        this.uiElements.push(statsDiv);
    }

    private createBracketPreview(): void {
        const bracketDiv = document.createElement('div');
        bracketDiv.style.position = 'absolute';
        bracketDiv.style.left = '50%';
        bracketDiv.style.top = '380px';
        bracketDiv.style.transform = 'translateX(-50%)';
        bracketDiv.style.width = '600px';
        bracketDiv.style.height = '200px';
        bracketDiv.style.background = 'rgba(0,0,0,0.5)';
        bracketDiv.style.border = '1px solid #444';
        bracketDiv.style.display = 'flex';
        bracketDiv.style.alignItems = 'center';
        bracketDiv.style.justifyContent = 'center';
        bracketDiv.style.color = '#888';
        bracketDiv.innerHTML = 'Final Bracket State Visualization (Stub)';
        
        document.body.appendChild(bracketDiv);
        this.uiElements.push(bracketDiv);
    }

    private createButtons(): void {
        const btnDiv = document.createElement('div');
        btnDiv.style.position = 'absolute';
        btnDiv.style.left = '50%';
        btnDiv.style.bottom = '50px';
        btnDiv.style.transform = 'translateX(-50%)';
        btnDiv.innerHTML = `
            <button id="exitTourneyBtn" style="padding: 15px 30px; font-size: 20px; background: #ffcc00; color: black; border: none; font-weight: bold; cursor: pointer; border-radius: 4px;">RETURN TO LOBBY</button>
        `;
        document.body.appendChild(btnDiv);
        this.uiElements.push(btnDiv);

        document.getElementById('exitTourneyBtn')!.onclick = () => {
            this.manager.popTo('Lobby');
        };
    }

    protected async destroy(): Promise<void> {
        this.uiElements.forEach(el => el.remove());
        this.uiElements = [];
    }
}
