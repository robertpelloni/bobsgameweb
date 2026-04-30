import { GameLogic } from "./GameLogic";
import { BobColor } from "../BobColor";

export class PuzzlePlayer {
    public gameLogic: GameLogic;

    public confirmed: boolean = false;
    
    public selectGameSequenceOrSingleGameTypeMiniMenuShowing: boolean = true;
    public selectGameSequenceMiniMenuShowing: boolean = false;
    public gameSequenceOptionsMiniMenuShowing: boolean = false;
    public selectSingleGameTypeMiniMenuShowing: boolean = false;
    public setGameSequence: boolean = false;
    public setDifficulty: boolean = false;

    public allowAnalogControls: boolean = true;
    public slamWithY: boolean = true;
    public slamWithR: boolean = false;
    public slamWithUp: boolean = true;

    public slamLock: boolean = true;
    public singleDownLock: boolean = false;
    public doubleDownLock: boolean = true;

    public hue: number = 1.0;

    public gridBorderColor: BobColor = new BobColor(255, 255, 255);
    public gridCheckeredBackgroundColor1: BobColor = BobColor.black;
    public gridCheckeredBackgroundColor2: BobColor = new BobColor(8, 8, 8);
    public screenBackgroundColor: BobColor = BobColor.black;
    public gridRule_showWarningForFieldThreeQuartersFilled: boolean = true;

    public UP_HELD: boolean = false;
    public DOWN_HELD: boolean = false;
    public LEFT_HELD: boolean = false;
    public RIGHT_HELD: boolean = false;
    public ROTATECW_HELD: boolean = false;
    public ROTATECCW_HELD: boolean = false;
    public HOLDRAISE_HELD: boolean = false;
    public SLAM_HELD: boolean = false;
    public PAUSE_HELD: boolean = false;
    public CONFIRM_HELD: boolean = false;
    public CANCEL_HELD: boolean = false;

    public getInputMask(): number {
        let mask = 0;
        if (this.UP_HELD) mask |= (1 << 0);
        if (this.DOWN_HELD) mask |= (1 << 1);
        if (this.LEFT_HELD) mask |= (1 << 2);
        if (this.RIGHT_HELD) mask |= (1 << 3);
        if (this.ROTATECW_HELD) mask |= (1 << 4);
        if (this.ROTATECCW_HELD) mask |= (1 << 5);
        if (this.HOLDRAISE_HELD) mask |= (1 << 6);
        if (this.SLAM_HELD) mask |= (1 << 7);
        if (this.PAUSE_HELD) mask |= (1 << 8);
        return mask;
    }

    public setInputMask(mask: number): void {
        this.UP_HELD = (mask & (1 << 0)) !== 0;
        this.DOWN_HELD = (mask & (1 << 1)) !== 0;
        this.LEFT_HELD = (mask & (1 << 2)) !== 0;
        this.RIGHT_HELD = (mask & (1 << 3)) !== 0;
        this.ROTATECW_HELD = (mask & (1 << 4)) !== 0;
        this.ROTATECCW_HELD = (mask & (1 << 5)) !== 0;
        this.HOLDRAISE_HELD = (mask & (1 << 6)) !== 0;
        this.SLAM_HELD = (mask & (1 << 7)) !== 0;
        this.PAUSE_HELD = (mask & (1 << 8)) !== 0;
    }

    public LAST_UP_HELD: boolean = false;
    public LAST_DOWN_HELD: boolean = false;
    public LAST_LEFT_HELD: boolean = false;
    public LAST_RIGHT_HELD: boolean = false;
    public LAST_ROTATECW_HELD: boolean = false;
    public LAST_ROTATECCW_HELD: boolean = false;
    public LAST_HOLDRAISE_HELD: boolean = false;
    public LAST_SLAM_HELD: boolean = false;
    public LAST_PAUSE_HELD: boolean = false;
    public LAST_CONFIRM_HELD: boolean = false;
    public LAST_CANCEL_HELD: boolean = false;

    private UP_PRESSED: boolean = false;
    private DOWN_PRESSED: boolean = false;
    private LEFT_PRESSED: boolean = false;
    private RIGHT_PRESSED: boolean = false;
    private ROTATECW_PRESSED: boolean = false;
    private ROTATECCW_PRESSED: boolean = false;
    private HOLDRAISE_PRESSED: boolean = false;
    private SLAM_PRESSED: boolean = false;
    private PAUSE_PRESSED: boolean = false;
    private CONFIRM_PRESSED: boolean = false;
    private CANCEL_PRESSED: boolean = false;

    constructor(gameLogic: GameLogic) {
        this.gameLogic = gameLogic;
        gameLogic.player = this;
    }

    public upPressed(): boolean { if (this.UP_PRESSED) { this.UP_PRESSED = false; return true; } return false; }
    public downPressed(): boolean { if (this.DOWN_PRESSED) { this.DOWN_PRESSED = false; return true; } return false; }
    public leftPressed(): boolean { if (this.LEFT_PRESSED) { this.LEFT_PRESSED = false; return true; } return false; }
    public rightPressed(): boolean { if (this.RIGHT_PRESSED) { this.RIGHT_PRESSED = false; return true; } return false; }
    public rotateCWPressed(): boolean { if (this.ROTATECW_PRESSED) { this.ROTATECW_PRESSED = false; return true; } return false; }
    public rotateCCWPressed(): boolean { if (this.ROTATECCW_PRESSED) { this.ROTATECCW_PRESSED = false; return true; } return false; }
    public holdRaisePressed(): boolean { if (this.HOLDRAISE_PRESSED) { this.HOLDRAISE_PRESSED = false; return true; } return false; }
    public slamPressed(): boolean { if (this.SLAM_PRESSED) { this.SLAM_PRESSED = false; return true; } return false; }
    public pausePressed(): boolean { if (this.PAUSE_PRESSED) { this.PAUSE_PRESSED = false; return true; } return false; }
    public confirmPressed(): boolean { if (this.CONFIRM_PRESSED) { this.CONFIRM_PRESSED = false; return true; } return false; }
    public cancelPressed(): boolean { if (this.CANCEL_PRESSED) { this.CANCEL_PRESSED = false; return true; } return false; }

    public resetPressedButtons(): void {
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

    public setButtonStates(): void {
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
    }

    public setPressedButtons(): void {
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
}
