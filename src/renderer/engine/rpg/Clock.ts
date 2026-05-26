/**
 * Game Clock — in-game time system (day/hour/minute/second).
 *
 * Ported from okgame C++ Engine/Engine/rpg/Clock.
 * Runs independently of real time; can be paused, accelerated, or set manually.
 */
export class GameClock {
    private _paused = false;
    private _fast = false;
    private _unknown = false;

    public ticks = 0;
    public second = 0;
    public minute = 0;
    public hour = 0;
    public day = 0;

    // Accumulator for fractional seconds
    private accumulator = 0;

    /** Game seconds per real second at normal speed */
    private static readonly NORMAL_SPEED = 1;

    /** Game seconds per real second at fast speed */
    private static readonly FAST_SPEED = 60;

    update(dt: number): void {
        if (this._paused) return;

        const speed = this._fast ? GameClock.FAST_SPEED : GameClock.NORMAL_SPEED;
        this.accumulator += dt * speed;

        while (this.accumulator >= 1) {
            this.accumulator -= 1;
            this.ticks++;
            this.second++;

            if (this.second >= 60) {
                this.second = 0;
                this.minute++;
                if (this.minute >= 60) {
                    this.minute = 0;
                    this.hour++;
                    if (this.hour >= 24) {
                        this.hour = 0;
                        this.day++;
                    }
                }
            }
        }
    }

    setTime(day: number, hour: number, minute: number, second: number): void {
        this.day = day;
        this.hour = hour;
        this.minute = minute;
        this.second = second;
    }

    getTimeString(): string {
        return `${String(this.hour).padStart(2, '0')}:${String(this.minute).padStart(2, '0')}`;
    }

    getDayString(): string {
        return `Day ${this.day + 1}`;
    }

    setPaused(b: boolean): void { this._paused = b; }
    isPaused(): boolean { return this._paused; }

    setFast(b: boolean): void { this._fast = b; }
    isFast(): boolean { return this._fast; }

    setUnknown(b: boolean): void { this._unknown = b; }
    isUnknown(): boolean { return this._unknown; }
}
