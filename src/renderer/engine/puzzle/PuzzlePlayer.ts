// @ts-nocheck
/**
 * PuzzlePlayer — puzzle game player with input handling, controls, and settings.
 *
 * Ported from okgame C++ Puzzle/PuzzlePlayer.h.
 * Manages per-player controls, DAS (Delayed Auto Shift), game controller,
 * and player-specific visual settings.
 */

import type { GameLogic } from './GameLogic';

export class PuzzlePlayer {
    gameLogic: GameLogic | null = null;

    // Player info
    confirmed = false;
    name = 'Player';
    hue = 1.0;
    userID = -1;

    // Input state — held
    UP_HELD = false;
    DOWN_HELD = false;
    LEFT_HELD = false;
    RIGHT_HELD = false;
    ROTATECW_HELD = false;
    ROTATECCW_HELD = false;
    HOLDRAISE_HELD = false;
    SLAM_HELD = false;
    PAUSE_HELD = false;
    CONFIRM_HELD = false;
    CANCEL_HELD = false;

    // Input state — previous frame
    private LAST_UP_HELD = false;
    private LAST_DOWN_HELD = false;
    private LAST_LEFT_HELD = false;
    private LAST_RIGHT_HELD = false;
    private LAST_ROTATECW_HELD = false;
    private LAST_ROTATECCW_HELD = false;
    private LAST_HOLDRAISE_HELD = false;
    private LAST_SLAM_HELD = false;
    private LAST_PAUSE_HELD = false;
    private LAST_CONFIRM_HELD = false;
    private LAST_CANCEL_HELD = false;

    // Input state — pressed (consumed on read)
    private UP_PRESSED = false;
    private DOWN_PRESSED = false;
    private LEFT_PRESSED = false;
    private RIGHT_PRESSED = false;
    private ROTATECW_PRESSED = false;
    private ROTATECCW_PRESSED = false;
    private HOLDRAISE_PRESSED = false;
    private SLAM_PRESSED = false;
    private PAUSE_PRESSED = false;
    private CONFIRM_PRESSED = false;
    private CANCEL_PRESSED = false;

    // DAS (Delayed Auto Shift)
    private upRepeatedStarted = false;
    private upRepeating = false;
    private upLastTime = 0;
    private downRepeatedStarted = false;
    private downRepeating = false;
    private downLastTime = 0;

    // Settings
    slamWithY = true;
    slamWithR = false;
    slamWithUp = true;
    slamLock = true;
    singleDownLock = false;
    doubleDownLock = true;
    allowAnalogControls = true;

    // Visual settings
    gridBorderColor = 0xffffff;
    gridCheckeredBGColor1 = 0x000000;
    gridCheckeredBGColor2 = 0x080808;
    screenBackgroundColor = 0x000000;
    showFieldWarning = true;

    // Menu state
    selectGameSequenceOrSingleGameTypeMiniMenuShowing = true;
    selectGameSequenceMiniMenuShowing = false;
    selectSingleGameTypeMiniMenuShowing = false;

    constructor(gameLogic?: GameLogic) {
        if (gameLogic) {
            this.gameLogic = gameLogic;
        }
    }

    // ============================================================
    // Input polling
    // ============================================================

    upPressed(): boolean { if (this.UP_PRESSED) { this.UP_PRESSED = false; return true; } return false; }
    downPressed(): boolean { if (this.DOWN_PRESSED) { this.DOWN_PRESSED = false; return true; } return false; }
    leftPressed(): boolean { if (this.LEFT_PRESSED) { this.LEFT_PRESSED = false; return true; } return false; }
    rightPressed(): boolean { if (this.RIGHT_PRESSED) { this.RIGHT_PRESSED = false; return true; } return false; }
    rotateCWPressed(): boolean { if (this.ROTATECW_PRESSED) { this.ROTATECW_PRESSED = false; return true; } return false; }
    rotateCCWPressed(): boolean { if (this.ROTATECCW_PRESSED) { this.ROTATECCW_PRESSED = false; return true; } return false; }
    holdRaisePressed(): boolean { if (this.HOLDRAISE_PRESSED) { this.HOLDRAISE_PRESSED = false; return true; } return false; }
    slamPressed(): boolean { if (this.SLAM_PRESSED) { this.SLAM_PRESSED = false; return true; } return false; }
    pausePressed(): boolean { if (this.PAUSE_PRESSED) { this.PAUSE_PRESSED = false; return true; } return false; }
    confirmPressed(): boolean { if (this.CONFIRM_PRESSED) { this.CONFIRM_PRESSED = false; return true; } return false; }
    cancelPressed(): boolean { if (this.CANCEL_PRESSED) { this.CANCEL_PRESSED = false; return true; } return false; }

    resetPressedButtons(): void {
        this.UP_PRESSED = false;
        this.DOWN_PRESSED = false;
        this.LEFT_PRESSED = false;
        this.RIGHT_PRESSED = false;
        this.ROTATECW_PRESSED = false;
        this.ROTATECCW_PRESSED = false;
        this.HOLDRAISE_PRESSED = false;
        this.SLAM_PRESSED = false;
        this.PAUSE_PRESSED = false;
        this.CONFIRM_PRESSED = false;
        this.CANCEL_PRESSED = false;
    }

    /**
     * Save current held state and reset for next frame.
     */
    setButtonStates(): void {
        this.LAST_UP_HELD = this.UP_HELD;
        this.LAST_DOWN_HELD = this.DOWN_HELD;
        this.LAST_LEFT_HELD = this.LEFT_HELD;
        this.LAST_RIGHT_HELD = this.RIGHT_HELD;
        this.LAST_ROTATECW_HELD = this.ROTATECW_HELD;
        this.LAST_ROTATECCW_HELD = this.ROTATECCW_HELD;
        this.LAST_HOLDRAISE_HELD = this.HOLDRAISE_HELD;
        this.LAST_SLAM_HELD = this.SLAM_HELD;
        this.LAST_PAUSE_HELD = this.PAUSE_HELD;
        this.LAST_CONFIRM_HELD = this.CONFIRM_HELD;
        this.LAST_CANCEL_HELD = this.CANCEL_HELD;

        this.UP_HELD = false;
        this.DOWN_HELD = false;
        this.LEFT_HELD = false;
        this.RIGHT_HELD = false;
        this.ROTATECW_HELD = false;
        this.ROTATECCW_HELD = false;
        this.HOLDRAISE_HELD = false;
        this.SLAM_HELD = false;
        this.PAUSE_HELD = false;
        this.CONFIRM_HELD = false;
        this.CANCEL_HELD = false;
    }

    /**
     * Detect rising edges (just pressed this frame).
     */
    setPressedButtons(): void {
        if (this.UP_HELD && !this.LAST_UP_HELD) this.UP_PRESSED = true;
        if (this.DOWN_HELD && !this.LAST_DOWN_HELD) this.DOWN_PRESSED = true;
        if (this.LEFT_HELD && !this.LAST_LEFT_HELD) this.LEFT_PRESSED = true;
        if (this.RIGHT_HELD && !this.LAST_RIGHT_HELD) this.RIGHT_PRESSED = true;
        if (this.ROTATECW_HELD && !this.LAST_ROTATECW_HELD) this.ROTATECW_PRESSED = true;
        if (this.ROTATECCW_HELD && !this.LAST_ROTATECCW_HELD) this.ROTATECCW_PRESSED = true;
        if (this.HOLDRAISE_HELD && !this.LAST_HOLDRAISE_HELD) this.HOLDRAISE_PRESSED = true;
        if (this.SLAM_HELD && !this.LAST_SLAM_HELD) this.SLAM_PRESSED = true;
        if (this.PAUSE_HELD && !this.LAST_PAUSE_HELD) this.PAUSE_PRESSED = true;
        if (this.CONFIRM_HELD && !this.LAST_CONFIRM_HELD) this.CONFIRM_PRESSED = true;
        if (this.CANCEL_HELD && !this.LAST_CANCEL_HELD) this.CANCEL_PRESSED = true;
    }

    // ============================================================
    // DAS (Delayed Auto Shift) for up/down repeat
    // ============================================================

    updateDAS(ticks: number): void {
        const dasDelay = 170; // ms before repeat starts
        const dasRate = 50;   // ms between repeats

        // Up DAS
        if (this.UP_HELD) {
            if (!this.upRepeatedStarted) {
                this.upRepeatedStarted = true;
                this.upLastTime = ticks;
            } else if (!this.upRepeating && ticks - this.upLastTime >= dasDelay) {
                this.upRepeating = true;
                this.upLastTime = ticks;
                this.UP_PRESSED = true;
            } else if (this.upRepeating && ticks - this.upLastTime >= dasRate) {
                this.upLastTime = ticks;
                this.UP_PRESSED = true;
            }
        } else {
            this.upRepeatedStarted = false;
            this.upRepeating = false;
        }

        // Down DAS
        if (this.DOWN_HELD) {
            if (!this.downRepeatedStarted) {
                this.downRepeatedStarted = true;
                this.downLastTime = ticks;
            } else if (!this.downRepeating && ticks - this.downLastTime >= dasDelay) {
                this.downRepeating = true;
                this.downLastTime = ticks;
                this.DOWN_PRESSED = true;
            } else if (this.downRepeating && ticks - this.downLastTime >= dasRate) {
                this.downLastTime = ticks;
                this.DOWN_PRESSED = true;
            }
        } else {
            this.downRepeatedStarted = false;
            this.downRepeating = false;
        }
    }

    // ============================================================
    // Utility
    // ============================================================

    isNetworkPlayer(): boolean {
        // Network game support implementation
        if (this.gameSequence instanceof NetworkGameSequence) {
            return this.gameSequence.isNetworkGame();
        }
        return false;
    }

    getID(): string {
        return `${this.userID}.local`;
    }
}
