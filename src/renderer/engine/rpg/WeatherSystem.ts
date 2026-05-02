/**
 * WeatherSystem — dynamic weather effects for the game world.
 *
 * Features:
 * - 6 weather types (Clear, Rain, Snow, Fog, Sandstorm, Storm)
 * - Smooth transitions between weather states
 * - Day/night cycle integration
 * - Particle counts scale with intensity
 * - Weather affects gameplay (visibility, movement speed, encounter rates)
 * - Region-specific default weather
 *
 * Usage:
 *   const weather = new WeatherSystem();
 *   weather.setWeather("rain", 0.7);
 *   weather.update(dt);
 */

export type WeatherType = "clear" | "rain" | "snow" | "fog" | "sandstorm" | "storm";

export interface WeatherState {
	type: WeatherType;
	intensity: number; // 0-1
	windSpeed: number; // 0-1
	windDirection: number; // radians
	temperature: number; // -20 to 40
	visibility: number; // 0-1
}

export interface WeatherEffects {
	visibilityModifier: number;
	speedModifier: number;
	encounterRateModifier: number;
	fireDamageModifier: number;
	iceDamageModifier: number;
	particleCount: number;
}

const WEATHER_CONFIG: Record<WeatherType, {
	name: string;
	icon: string;
	color: number;
	overlayAlpha: number;
	defaultIntensity: number;
	defaultWindSpeed: number;
}> = {
	clear:     { name: "Clear",     icon: "☀️", color: 0x4488ff, overlayAlpha: 0,    defaultIntensity: 0,   defaultWindSpeed: 0.1 },
	rain:      { name: "Rain",      icon: "🌧", color: 0x2244aa, overlayAlpha: 0.15, defaultIntensity: 0.6, defaultWindSpeed: 0.3 },
	snow:      { name: "Snow",      icon: "❄️", color: 0xccddff, overlayAlpha: 0.1,  defaultIntensity: 0.5, defaultWindSpeed: 0.2 },
	fog:       { name: "Fog",       icon: "🌫", color: 0x888888, overlayAlpha: 0.3,  defaultIntensity: 0.7, defaultWindSpeed: 0.05 },
	sandstorm: { name: "Sandstorm", icon: "🏜", color: 0xccaa44, overlayAlpha: 0.25, defaultIntensity: 0.8, defaultWindSpeed: 0.8 },
	storm:     { name: "Storm",     icon: "⛈", color: 0x112244, overlayAlpha: 0.35, defaultIntensity: 0.9, defaultWindSpeed: 0.7 },
};

export class WeatherSystem {
	private current: WeatherState;
	private target: WeatherState;
	private transitionProgress = 1; // 1 = complete
	private transitionDuration = 3; // seconds
	private time = 0;
	private regionWeather: Map<string, WeatherType> = new Map();
	private log: string[] = [];

	constructor() {
		this.current = this.createDefaultState("clear");
		this.target = { ...this.current };

		// Default region weather
		this.regionWeather.set("townyuu", "clear");
		this.regionWeather.set("dark_forest", "fog");
		this.regionWeather.set("beach", "clear");
		this.regionWeather.set("dragon_lair", "storm");
	}

	private createDefaultState(type: WeatherType): WeatherState {
		const config = WEATHER_CONFIG[type];
		return {
			type,
			intensity: config.defaultIntensity,
			windSpeed: config.defaultWindSpeed,
			windDirection: Math.random() * Math.PI * 2,
			temperature: type === "snow" ? -5 : type === "sandstorm" ? 38 : 20,
			visibility: type === "fog" ? 0.3 : type === "storm" ? 0.4 : type === "sandstorm" ? 0.3 : 0.9,
		};
	}

	/** Set current weather with optional transition */
	setWeather(type: WeatherType, intensity?: number, transition = true): void {
		const config = WEATHER_CONFIG[type];
		this.target = {
			type,
			intensity: intensity ?? config.defaultIntensity,
			windSpeed: config.defaultWindSpeed,
			windDirection: Math.random() * Math.PI * 2,
			temperature: this.current.temperature,
			visibility: this.calculateVisibility(type, intensity ?? config.defaultIntensity),
		};

		if (transition) {
			this.transitionProgress = 0;
			this.log.push(`Weather changing: ${this.current.type} → ${type}`);
		} else {
			this.current = { ...this.target };
			this.transitionProgress = 1;
			this.log.push(`Weather set: ${type}`);
		}
	}

	private calculateVisibility(type: WeatherType, intensity: number): number {
		switch (type) {
			case "clear": return 0.95;
			case "rain": return 0.7 - intensity * 0.2;
			case "snow": return 0.6 - intensity * 0.3;
			case "fog": return 0.4 - intensity * 0.3;
			case "sandstorm": return 0.3 - intensity * 0.2;
			case "storm": return 0.3 - intensity * 0.2;
		}
	}

	/** Get region-specific weather */
	setRegionWeather(region: string, type: WeatherType): void {
		this.regionWeather.set(region, type);
	}

	/** Apply region weather when entering a region */
	enterRegion(region: string): void {
		const weather = this.regionWeather.get(region) ?? "clear";
		this.setWeather(weather);
	}

	/** Update each frame */
	update(dt: number): void {
		this.time += dt;

		if (this.transitionProgress < 1) {
			this.transitionProgress += dt / this.transitionDuration;
			if (this.transitionProgress >= 1) {
				this.transitionProgress = 1;
				this.current = { ...this.target };
			} else {
				// Interpolate
				const t = this.transitionProgress;
				this.current.intensity = this.lerp(this.current.intensity, this.target.intensity, t);
				this.current.windSpeed = this.lerp(this.current.windSpeed, this.target.windSpeed, t);
				this.current.visibility = this.lerp(this.current.visibility, this.target.visibility, t);
			}
		}

		// Wind direction slowly drifts
		this.current.windDirection += (Math.random() - 0.5) * 0.01;
	}

	/** Get gameplay effects */
	getEffects(): WeatherEffects {
		const { type, intensity, visibility } = this.current;
		const config = WEATHER_CONFIG[type];

		return {
			visibilityModifier: visibility,
			speedModifier: type === "snow" ? 0.85 : type === "sandstorm" ? 0.8 : type === "storm" ? 0.9 : 1.0,
			encounterRateModifier: type === "rain" ? 1.2 : type === "storm" ? 1.5 : type === "fog" ? 1.3 : 1.0,
			fireDamageModifier: type === "rain" ? 0.7 : type === "snow" ? 0.5 : type === "storm" ? 0.3 : 1.0,
			iceDamageModifier: type === "snow" ? 1.5 : type === "storm" ? 1.2 : 1.0,
			particleCount: Math.floor(intensity * (type === "rain" ? 200 : type === "snow" ? 100 : type === "sandstorm" ? 150 : 0)),
		};
	}

	/** Get current state */
	getState(): WeatherState { return { ...this.current }; }

	/** Get config */
	static getConfig(type: WeatherType) { return WEATHER_CONFIG[type]; }

	/** Get all types */
	static getAllTypes(): WeatherType[] { return ["clear", "rain", "snow", "fog", "sandstorm", "storm"]; }

	/** Is transitioning */
	isTransitioning(): boolean { return this.transitionProgress < 1; }

	/** Get log */
	getLog(): string[] { return [...this.log]; }

	private lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
}
