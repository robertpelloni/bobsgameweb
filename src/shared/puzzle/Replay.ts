export interface ReplayFrame {
    tick: number;
    inputs: number; // Bitmask of inputs
}

export interface ReplayData {
    version: string;
    gameTypeUUID: string;
    seed: number;
    frames: ReplayFrame[];
    playerName: string;
    score: number;
    lines: number;
    time: number;
}

export class ReplayRecorder {
    private frames: ReplayFrame[] = [];
    private lastMask: number = 0;

    public recordFrame(tick: number, inputMask: number): void {
        if (inputMask !== this.lastMask) {
            this.frames.push({ tick, inputs: inputMask });
            this.lastMask = inputMask;
        }
    }

    public getFrames(): ReplayFrame[] {
        return this.frames;
    }

    public exportJSON(meta: Partial<ReplayData>): string {
        const data: ReplayData = {
            version: '2.1.31',
            gameTypeUUID: meta.gameTypeUUID || '',
            seed: meta.seed || 0,
            frames: this.frames,
            playerName: meta.playerName || 'Unknown',
            score: meta.score || 0,
            lines: meta.lines || 0,
            time: meta.time || 0
        };
        return JSON.stringify(data);
    }
}

export class ReplayPlayer {
    private frames: ReplayFrame[] = [];
    private currentIndex: number = 0;
    private currentMask: number = 0;

    public loadJSON(json: string): ReplayData | null {
        try {
            const data: ReplayData = JSON.parse(json);
            this.frames = data.frames || [];
            this.currentIndex = 0;
            this.currentMask = 0;
            return data;
        } catch (e) {
            console.error("Failed to parse replay data", e);
            return null;
        }
    }

    public getInputMaskForTick(tick: number): number {
        // If the next frame's tick has been reached, update the current mask
        while (this.currentIndex < this.frames.length && this.frames[this.currentIndex].tick <= tick) {
            this.currentMask = this.frames[this.currentIndex].inputs;
            this.currentIndex++;
        }
        return this.currentMask;
    }
}
