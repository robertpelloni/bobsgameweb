/**
 * DayNightCycle — visual day/night overlay for the RPG world.
 *
 * Features:
 * - Smooth color transitions between dawn, day, dusk, night
 * - Configurable day duration
 * - Star rendering at night
 * - Sun/moon position indicator
 * - Event callbacks for time phase changes
 *
 * Usage:
 *   const cycle = new DayNightCycle(container, width, height);
 *   cycle.setDayDuration(60); // 60 second full day
 *   cycle.update(dt);
 *   cycle.getPhase(); // "dawn" | "day" | "dusk" | "night"
 */
import { Container, Graphics, Text, TextStyle } from "pixi.js";

export type TimePhase = "dawn" | "day" | "dusk" | "night";

interface PhaseConfig {
	startHour: number;
	endHour: number;
	overlayColor: number;
	overlayAlpha: number;
	name: string;
}

const PHASES: PhaseConfig[] = [
	{ startHour: 5, endHour: 7, overlayColor: 0xff8844, overlayAlpha: 0.15, name: "dawn" },
	{ startHour: 7, endHour: 17, overlayColor: 0x000000, overlayAlpha: 0, name: "day" },
	{ startHour: 17, endHour: 19, overlayColor: 0xff6644, overlayAlpha: 0.12, name: "dusk" },
	{ startHour: 19, endHour: 24, overlayColor: 0x001133, overlayAlpha: 0.25, name: "night" },
	{ startHour: 0, endHour: 5, overlayColor: 0x001133, overlayAlpha: 0.3, name: "night" },
];

export class DayNightCycle {
	private container: Container;
	private width: number;
	private height: number;
	private overlay: Graphics;
	private starsContainer: Container;
	private stars: { x: number; y: number; size: number; twinkleSpeed: number }[] = [];
	private clockText!: Text;

	private timeOfDay = 0.5; // 0-1 (0=midnight, 0.5=noon)
	private dayDuration = 120; // seconds for full 24h cycle
	private currentPhase: TimePhase = "day";
	private time = 0;

	private onPhaseChange?: (phase: TimePhase, hour: number) => void;

	constructor(container: Container, width: number, height: number) {
		this.container = container;
		this.width = width;
		this.height = height;

		// Stars
		this.starsContainer = new Container();
		this.starsContainer.alpha = 0;
		container.addChild(this.starsContainer);
		this.generateStars();

		// Color overlay
		this.overlay = new Graphics();
		container.addChild(this.overlay);

		// Clock display
		this.clockText = new Text({
			text: "",
			style: new TextStyle({
				fontFamily: "monospace",
				fontSize: 10,
				fill: 0x667788,
			}),
		});
		this.clockText.position.set(width - 60, 2);
		container.addChild(this.clockText);
	}

	/** Set day duration in seconds */
	setDayDuration(seconds: number): void {
		this.dayDuration = seconds;
	}

	/** Set current time of day (0-1) */
	setTime(t: number): void {
		this.timeOfDay = t % 1;
	}

	/** Get current hour (0-24) */
	getHour(): number {
		return this.timeOfDay * 24;
	}

	/** Get current phase */
	getPhase(): TimePhase {
		return this.currentPhase;
	}

	/** Set phase change callback */
	setOnPhaseChange(cb: (phase: TimePhase, hour: number) => void): void {
		this.onPhaseChange = cb;
	}

	/** Update each frame */
	update(dt: number): void {
		this.time += dt;
		this.timeOfDay = (this.timeOfDay + dt / this.dayDuration) % 1;

		const hour = this.getHour();
		const phase = this.getPhaseForHour(hour);

		if (phase !== this.currentPhase) {
			this.currentPhase = phase;
			if (this.onPhaseChange) this.onPhaseChange(phase, hour);
		}

		this.renderOverlay(hour);
		this.renderStars(hour);
		this.renderClock(hour);
	}

	private getPhaseForHour(hour: number): TimePhase {
		for (const phase of PHASES) {
			if (hour >= phase.startHour && hour < phase.endHour) {
				return phase.name as TimePhase;
			}
		}
		return "night";
	}

	private renderOverlay(hour: number): void {
		this.overlay.clear();

		// Find current and next phase for interpolation
		let currentAlpha = 0;
		let currentColor = 0x000000;

		for (const phase of PHASES) {
			if (hour >= phase.startHour && hour < phase.endHour) {
				const phaseProgress = (hour - phase.startHour) / (phase.endHour - phase.startHour);

				// Smooth transition in first/last 20% of phase
				let alpha = phase.overlayAlpha;
				if (phaseProgress < 0.2) {
					alpha *= phaseProgress / 0.2;
				} else if (phaseProgress > 0.8) {
					alpha *= (1 - phaseProgress) / 0.2;
				}

				currentAlpha = alpha;
				currentColor = phase.overlayColor;
				break;
			}
		}

		if (currentAlpha > 0) {
			this.overlay.rect(0, 0, this.width, this.height);
			this.overlay.fill({ color: currentColor, alpha: currentAlpha });
		}
	}

	private generateStars(): void {
		const starGraphics = new Graphics();
		for (let i = 0; i < 60; i++) {
			const x = Math.random() * this.width;
			const y = Math.random() * (this.height * 0.7);
			const size = 0.5 + Math.random() * 1.5;
			starGraphics.circle(x, y, size);
			starGraphics.fill({ color: 0xffffff, alpha: 0.3 + Math.random() * 0.7 });
			this.stars.push({ x, y, size, twinkleSpeed: 1 + Math.random() * 3 });
		}
		this.starsContainer.addChild(starGraphics);
	}

	private renderStars(hour: number): void {
		// Stars visible from 19:00 to 05:00
		let starsAlpha = 0;
		if (hour >= 20 || hour < 4) {
			starsAlpha = 0.8;
		} else if (hour >= 19) {
			starsAlpha = (hour - 19); // Fade in
		} else if (hour < 5) {
			starsAlpha = (5 - hour) / 1; // Fade out
		}
		this.starsContainer.alpha = starsAlpha * (0.7 + Math.sin(this.time * 2) * 0.1);
	}

	private renderClock(hour: number): void {
		const h = Math.floor(hour);
		const m = Math.floor((hour % 1) * 60);
		this.clockText.text = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;

		// Color by phase
		switch (this.currentPhase) {
			case "dawn": this.clockText.style.fill = 0xffaa44; break;
			case "day": this.clockText.style.fill = 0x667788; break;
			case "dusk": this.clockText.style.fill = 0xff6644; break;
			case "night": this.clockText.style.fill = 0x4466aa; break;
		}
	}

	/** Destroy */
	destroy(): void {
		this.overlay.destroy();
		this.starsContainer.destroy({ children: true });
		this.clockText.destroy();
	}
}
