/**
 * FrameState — puzzle game frame synchronization state.
 *
 * Ported from Java com.bobsgame.puzzle.FrameState.
 * Used for network multiplayer frame synchronization.
 */

export class FrameState {
    frameNumber = 0;
    state: 'waiting' | 'playing' | 'gameover' = 'waiting';
    lastInputFrame = -1;
    currentPieceX = 0;
    currentPieceY = 0;
    currentPieceRotation = 0;
    gridChecksum = 0;

    // Timing
    gameTime = 0;
    lastFrameTime = 0;

    encode(): string {
        return [
            this.frameNumber,
            this.state,
            this.lastInputFrame,
            this.currentPieceX,
            this.currentPieceY,
            this.currentPieceRotation,
            this.gridChecksum,
            this.gameTime,
        ].join(':');
    }

    static decode(s: string): FrameState {
        const parts = s.split(':');
        const fs = new FrameState();
        fs.frameNumber = parseInt(parts[0]) || 0;
        fs.state = (parts[1] as 'waiting' | 'playing' | 'gameover') || 'waiting';
        fs.lastInputFrame = parseInt(parts[2]) || -1;
        fs.currentPieceX = parseInt(parts[3]) || 0;
        fs.currentPieceY = parseInt(parts[4]) || 0;
        fs.currentPieceRotation = parseInt(parts[5]) || 0;
        fs.gridChecksum = parseInt(parts[6]) || 0;
        fs.gameTime = parseFloat(parts[7]) || 0;
        return fs;
    }

    clone(): FrameState {
        const fs = new FrameState();
        fs.frameNumber = this.frameNumber;
        fs.state = this.state;
        fs.lastInputFrame = this.lastInputFrame;
        fs.currentPieceX = this.currentPieceX;
        fs.currentPieceY = this.currentPieceY;
        fs.currentPieceRotation = this.currentPieceRotation;
        fs.gridChecksum = this.gridChecksum;
        fs.gameTime = this.gameTime;
        return fs;
    }
}
