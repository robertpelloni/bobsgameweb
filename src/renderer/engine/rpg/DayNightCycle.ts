/**
 * DayNightCycle — time-of-day system with lighting and mood changes.
 *
 * Features:
 * - 6 phases (Dawn, Morning, Midday, Afternoon, Dusk, Night)
 * - Real-time cycle (configurable speed)
 * - Lighting overlay colors and alpha per phase
 * - Phase-specific events (callbacks)
 * - Creature spawn modifiers per phase
 * - Shop open/close based on time
 *
 * Usage:
 *   const cycle = new DayNightCycle();
 *   cycle.setSpeed(60); // 1 real second = 1 game minute
 *   cycle.update(dt);
 *   cycle.getPhase(); // "midday"
 */

export type DayPhase = "dawn" | "morning" | "midday" | "afternoon" | "dusk" | "night";

export interface PhaseConfig {
	name: string;
	icon: string;
	startHour: number;
	endHour: number;
	skyColor: number;
	ambientAlpha: number;
	overlayColor: number;
	overlayAlpha: number;
	lightColor: number;
	encounterMod: number;
	shopOpen: boolean;
	music?: string;
}

export interface DayState {
	hour: number;
	minute: number;
	phase: DayPhase;
	dayCount: number;
	totalMinutes: number;
}

const PHASES: PhaseConfig[] = [
	{ name: "Dawn", icon: "🌅", startHour: 5, endHour: 7, skyColor: 0xff8844, ambientAlpha: 0.8, overlayColor: 0xff6622, overlayAlpha: 0.1, lightColor: 0xffccaa, encounterMod: 0.8, shopOpen: false, music: "morning" },
	{ name: "Morning", icon: "☀️", startHour: 7, endHour: 11, skyColor: 0x4488ff, ambientAlpha: 1.0, overlayColor: 0xffffff, overlayAlpha: 0, lightColor: 0xffffff, encounterMod: 1.0, shopOpen: true, music: "town" },
	{ name: "Midday", icon: "☀", startHour: 11, endHour: 14, skyColor: 0x2266dd, ambientAlpha: 1.0, overlayColor: 0xffffff, overlayAlpha: 0, lightColor: 0xffffff, encounterMod: 0.8, shopOpen: true, music: "town" },
	{ name: "Afternoon", icon: "🌤", startHour: 14, endHour: 17, skyColor: 0x4488cc, ambientAlpha: 0.95, overlayColor: 0xffaa44, overlayAlpha: 0.05, lightColor: 0xffeedd, encounterMod: 1.0, shopOpen: true, music: "town" },
	{ name: "Dusk", icon: "🌇", startHour: 17, endHour: 20, skyColor: 0xcc4422, ambientAlpha: 0.7, overlayColor: 0x442200, overlayAlpha: 0.2, lightColor: 0xffaa66, encounterMod: 1.3, shopOpen: false, music: "evening" },
	{ name: "Night", icon: "🌙", startHour: 20, endHour: 5, skyColor: 0x0a0a2a, ambientAlpha: 0.4, overlayColor: 0x000022, overlayAlpha: 0.4, lightColor: 0x4444aa, encounterMod: 1.8, shopOpen: false, music: "night" },
];

export class DayNightCycle {
	private hour = 8; // Start at 8 AM
	private minute = 0;
	private dayCount = 1;
	private speed = 60; // 1 real second = 1 game minute
	private totalMinutes = 480; // 8 * 60
	private paused = false;

	private _onPhaseChange: ((phase: DayPhase, config: PhaseConfig) => void) | null = null;
	private _onNewDay: ((dayCount: number) => void) | null = null;
	private lastPhase: DayPhase = "morning";

	/** Set game speed (1 real second = N game minutes) */
	setSpeed(speed: number): void { this.speed = Math.max(1, speed); }

	/** Set current time */
	setTime(hour: number, minute: number): void {
		this.hour = hour % 24;
		this.minute = minute % 60;
		this.totalMinutes = this.dayCount * 24 * 60 + this.hour * 60 + this.minute;
	}

	/** Update each frame */
	update(dt: number): void {
		if (this.paused) return;

		const gameMinutesElapsed = dt * this.speed / 60;
		this.totalMinutes += gameMinutesElapsed;

		this.minute += gameMinutesElapsed;
		while (this.minute >= 60) {
			this.minute -= 60;
			this.hour++;
		}

		while (this.hour >= 24) {
			this.hour -= 24;
			this.dayCount++;
			if (this._onNewDay) this._onNewDay(this.dayCount);
		}

		// Check phase change
		const newPhase = this.getPhase();
		if (newPhase !== this.lastPhase) {
			this.lastPhase = newPhase;
			if (this._onPhaseChange) {
				this._onPhaseChange(newPhase, this.getPhaseConfig());
			}
		}
	}

	/** Get current phase */
	getPhase(): DayPhase {
		const h = this.hour;
		if (h >= 5 && h < 7) return "dawn";
		if (h >= 7 && h < 11) return "morning";
		if (h >= 11 && h < 14) return "midday";
		if (h >= 14 && h < 17) return "afternoon";
		if (h >= 17 && h < 20) return "dusk";
		return "night";
	}

	/** Get phase config */
	getPhaseConfig(): PhaseConfig {
		const phase = this.getPhase();
		return PHASES.find(p => {
			if (phase === "night") return p.startHour === 20;
			return p.startHour === PHASES.find(pp => pp.name.toLowerCase() === phase)!.startHour;
		}) ?? PHASES[2]!;
	}

	/** Get all phase configs */
	static getPhases(): PhaseConfig[] { return [...PHASES]; }

	/** Get current state */
	getState(): DayState {
		return {
			hour: this.hour,
			minute: Math.floor(this.minute),
			phase: this.getPhase(),
			dayCount: this.dayCount,
			totalMinutes: Math.floor(this.totalMinutes),
		};
	}

	/** Get formatted time */
	getTimeString(): string {
		const h = Math.floor(this.hour);
		const m = Math.floor(this.minute);
		const ampm = h >= 12 ? "PM" : "AM";
		const displayH = h % 12 || 12;
		return `${displayH}:${m.toString().padStart(2, "0")} ${ampm}`;
	}

	/** Is it daytime */
	isDaytime(): boolean {
		const phase = this.getPhase();
		return phase !== "night" && phase !== "dusk";
	}

	/** Is shop open */
	isShopOpen(): boolean {
		return this.getPhaseConfig().shopOpen;
	}

	/** Get encounter modifier */
	getEncounterMod(): number {
		return this.getPhaseConfig().encounterMod;
	}

	/** Get overlay info for rendering */
	getOverlay(): { color: number; alpha: number } {
		const config = this.getPhaseConfig();
		return { color: config.overlayColor, alpha: config.overlayAlpha };
	}

	/** Pause/resume */
	pause(): void { this.paused = true; }
	resume(): void { this.paused = false; }
	isPaused(): boolean { return this.paused; }

	/** Get day count */
	getDayCount(): number { return this.dayCount; }

	/** Get speed */
	getSpeed(): number { return this.speed; }

	/** Set callbacks */
	onPhaseChange(cb: (phase: DayPhase, config: PhaseConfig) => void): void { this._onPhaseChange = cb; }
	onNewDay(cb: (dayCount: number) => void): void { this._onNewDay = cb; }

	/** Serialize */
	toJSON(): object {
		return { hour: this.hour, minute: this.minute, dayCount: this.dayCount, speed: this.speed, totalMinutes: this.totalMinutes };
	}

	/** Deserialize */
	static fromJSON(data: any): DayNightCycle {
		const cycle = new DayNightCycle();
		cycle.hour = data.hour ?? 8;
		cycle.minute = data.minute ?? 0;
		cycle.dayCount = data.dayCount ?? 1;
		cycle.speed = data.speed ?? 60;
		cycle.totalMinutes = data.totalMinutes ?? 480;
		return cycle;
	}
}
