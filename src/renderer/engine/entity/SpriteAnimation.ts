/**
 * SpriteAnimation — sprite sheet animation system with sequences, directions, and timing.
 *
 * Ported from okgame C++ Engine/entity/BobSprite + Java engine SpriteAnimationSequence.
 */

export interface SpriteAnimationFrame {
    tileIndex: number;
    duration: number; // ms
    offsetX?: number;
    offsetY?: number;
}

export interface SpriteAnimationSequence {
    name: string;
    frames: SpriteAnimationFrame[];
    loop: boolean;
    nextSequence?: string; // sequence to play after this one completes (if not looping)
}

export class SpriteAnimation {
    private sequences: Map<string, SpriteAnimationSequence> = new Map();
    private currentSequence: SpriteAnimationSequence | null = null;
    private currentFrameIndex = 0;
    private frameTimer = 0;
    private _finished = false;
    private _paused = false;

    /**
     * Register an animation sequence.
     */
    addSequence(sequence: SpriteAnimationSequence): void {
        this.sequences.set(sequence.name, sequence);
    }

    /**
     * Start playing a named sequence.
     */
    play(name: string, restartIfSame = false): void {
        const seq = this.sequences.get(name);
        if (!seq) {
            console.warn(`Animation sequence "${name}" not found`);
            return;
        }

        if (this.currentSequence === seq && !restartIfSame && !this._finished) return;

        this.currentSequence = seq;
        this.currentFrameIndex = 0;
        this.frameTimer = 0;
        this._finished = false;
        this._paused = false;
    }

    /**
     * Update the animation timer.
     */
    update(dt: number): void {
        if (this._paused || this._finished || !this.currentSequence) return;

        this.frameTimer += dt;

        const frame = this.currentSequence.frames[this.currentFrameIndex];
        if (!frame) return;

        if (this.frameTimer >= frame.duration) {
            this.frameTimer -= frame.duration;
            this.currentFrameIndex++;

            if (this.currentFrameIndex >= this.currentSequence.frames.length) {
                if (this.currentSequence.loop) {
                    this.currentFrameIndex = 0;
                } else if (this.currentSequence.nextSequence) {
                    this.play(this.currentSequence.nextSequence);
                } else {
                    this.currentFrameIndex = this.currentSequence.frames.length - 1;
                    this._finished = true;
                }
            }
        }
    }

    /**
     * Get the current frame's tile index.
     */
    getCurrentTileIndex(): number {
        if (!this.currentSequence) return 0;
        return this.currentSequence.frames[this.currentFrameIndex]?.tileIndex ?? 0;
    }

    /**
     * Get the current frame's offset.
     */
    getCurrentOffset(): { x: number; y: number } {
        if (!this.currentSequence) return { x: 0, y: 0 };
        const frame = this.currentSequence.frames[this.currentFrameIndex];
        return { x: frame?.offsetX ?? 0, y: frame?.offsetY ?? 0 };
    }

    /**
     * Get the current sequence name.
     */
    getCurrentSequenceName(): string | null {
        return this.currentSequence?.name ?? null;
    }

    isFinished(): boolean { return this._finished; }
    isPaused(): boolean { return this._paused; }

    pause(): void { this._paused = true; }
    resume(): void { this._paused = false; }

    /**
     * Create direction-based animation sequences from a naming convention.
     * e.g., createDirectionalSequences('walk', 4, 100) creates:
     *   walk_down, walk_left, walk_right, walk_up
     */
    static createDirectionalSequences(
        baseName: string,
        directions: number, // 4 or 8
        frameDuration: number,
        framesPerDirection: number,
        startTileIndex: number,
        loop = true,
    ): Map<string, SpriteAnimationSequence> {
        const dirNames = directions === 8
            ? ['down', 'downleft', 'left', 'upleft', 'up', 'upright', 'right', 'downright']
            : ['down', 'left', 'right', 'up'];

        const result = new Map<string, SpriteAnimationSequence>();
        for (let d = 0; d < dirNames.length; d++) {
            const frames: SpriteAnimationFrame[] = [];
            for (let f = 0; f < framesPerDirection; f++) {
                frames.push({
                    tileIndex: startTileIndex + d * framesPerDirection + f,
                    duration: frameDuration,
                });
            }
            const seq: SpriteAnimationSequence = { name: `${baseName}_${dirNames[d]}`, frames, loop };
            result.set(seq.name, seq);
        }
        return result;
    }

    /**
     * Create a simple linear animation from a tile range.
     */
    static createLinearSequence(
        name: string,
        startTile: number,
        endTile: number,
        frameDuration: number,
        loop = true,
    ): SpriteAnimationSequence {
        const frames: SpriteAnimationFrame[] = [];
        for (let i = startTile; i <= endTile; i++) {
            frames.push({ tileIndex: i, duration: frameDuration });
        }
        return { name, frames, loop };
    }
}
