/**
 * WeatherRenderer — standalone weather effect renderer for the RPG world.
 *
 * Supports:
 * - Rain (diagonal streaks with splash effects)
 * - Snow (drifting flakes with wind)
 * - Fog (layered translucent overlays)
 * - Sandstorm (swirling particles)
 * - Clear (no effect)
 *
 * Usage:
 *   const weather = new WeatherRenderer(container, width, height);
 *   weather.setWeather("rain", 0.8);
 *   weather.update(dt);
 */
import { Container, Graphics } from "pixi.js";

export type WeatherType = "clear" | "rain" | "snow" | "fog" | "sandstorm";

interface Particle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	maxLife: number;
	size: number;
	alpha: number;
}

export class WeatherRenderer {
	private container: Container;
	private width: number;
	private height: number;
	private graphics: Graphics;
	private particles: Particle[] = [];
	private weatherType: WeatherType = "clear";
	private intensity = 1.0;
	private wind = 0;
	private time = 0;

	// Limits
	private maxParticles = 300;

	constructor(container: Container, width: number, height: number) {
		this.container = container;
		this.width = width;
		this.height = height;
		this.graphics = new Graphics();
		this.container.addChild(this.graphics);
	}

	/** Set weather type and intensity (0-1) */
	setWeather(type: WeatherType, intensity = 1.0): void {
		this.weatherType = type;
		this.intensity = Math.max(0, Math.min(1, intensity));
		this.particles = [];

		switch (type) {
			case "rain":
				this.maxParticles = Math.floor(200 * intensity);
				this.wind = 2;
				break;
			case "snow":
				this.maxParticles = Math.floor(150 * intensity);
				this.wind = 0.5;
				break;
			case "fog":
				this.maxParticles = 0; // Fog uses overlay, not particles
				this.wind = 0;
				break;
			case "sandstorm":
				this.maxParticles = Math.floor(250 * intensity);
				this.wind = 5;
				break;
			default:
				this.maxParticles = 0;
				break;
		}
	}

	/** Get current weather type */
	getWeather(): WeatherType {
		return this.weatherType;
	}

	/** Update weather effects each frame */
	update(dt: number): void {
		this.time += dt;
		this.graphics.clear();

		if (this.weatherType === "clear") return;

		// Spawn new particles
		this.spawnParticles();

		// Update and render particles
		this.updateParticles(dt);
		this.renderParticles();

		// Overlay effects
		if (this.weatherType === "fog") {
			this.renderFog();
		}

		// Screen tint for weather
		this.renderTint();
	}

	private spawnParticles(): void {
		const toSpawn = Math.min(5, this.maxParticles - this.particles.length);
		if (toSpawn <= 0) return;

		for (let i = 0; i < toSpawn; i++) {
			let p: Particle;

			switch (this.weatherType) {
				case "rain":
					p = {
						x: Math.random() * (this.width + 100) - 50,
						y: -10 - Math.random() * 50,
						vx: this.wind + Math.random() * 2,
						vy: 300 + Math.random() * 200,
						life: 2,
						maxLife: 2,
						size: 1 + Math.random() * 1.5,
						alpha: 0.3 + Math.random() * 0.3,
					};
					break;
				case "snow":
					p = {
						x: Math.random() * this.width,
						y: -5,
						vx: Math.sin(this.time + Math.random() * 6) * 20,
						vy: 30 + Math.random() * 40,
						life: 8,
						maxLife: 8,
						size: 2 + Math.random() * 3,
						alpha: 0.5 + Math.random() * 0.4,
					};
					break;
				case "sandstorm":
					p = {
						x: -10,
						y: Math.random() * this.height,
						vx: 200 + Math.random() * 300,
						vy: (Math.random() - 0.5) * 60,
						life: 3,
						maxLife: 3,
						size: 1 + Math.random() * 2,
						alpha: 0.2 + Math.random() * 0.3,
					};
					break;
				default:
					continue;
			}

			this.particles.push(p);
		}
	}

	private updateParticles(dt: number): void {
		for (let i = this.particles.length - 1; i >= 0; i--) {
			const p = this.particles[i];

			p.x += p.vx * dt;
			p.y += p.vy * dt;
			p.life -= dt;

			// Wind variation
			if (this.weatherType === "snow") {
				p.vx = Math.sin(this.time * 0.5 + p.x * 0.01) * 25;
			}

			// Remove dead or off-screen particles
			if (p.life <= 0 || p.y > this.height + 10 || p.x > this.width + 50 || p.x < -50) {
				this.particles.splice(i, 1);
			}
		}
	}

	private renderParticles(): void {
		for (const p of this.particles) {
			const fadeIn = Math.min(1, (p.maxLife - p.life) * 3);
			const fadeOut = Math.min(1, p.life * 2);
			const alpha = p.alpha * fadeIn * fadeOut;

			switch (this.weatherType) {
				case "rain":
					// Diagonal streak
					this.graphics.moveTo(p.x, p.y);
					this.graphics.lineTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02);
					this.graphics.stroke({ color: 0x6688cc, width: p.size, alpha });
					break;
				case "snow":
					// Round flake
					this.graphics.circle(p.x, p.y, p.size);
					this.graphics.fill({ color: 0xffffff, alpha });
					break;
				case "sandstorm":
					// Small brown dot
					this.graphics.circle(p.x, p.y, p.size);
					this.graphics.fill({ color: 0xccaa66, alpha });
					break;
			}
		}
	}

	private renderFog(): void {
		// Layered fog overlay with moving bands
		for (let i = 0; i < 3; i++) {
			const yOffset = Math.sin(this.time * 0.2 + i * 2) * 30;
			const xOffset = Math.cos(this.time * 0.15 + i * 3) * 50;

			this.graphics.rect(
				xOffset - 50,
				(this.height / 3) * i + yOffset,
				this.width + 100,
				this.height / 3,
			);
			this.graphics.fill({
				color: 0x8899aa,
				alpha: 0.08 * this.intensity * (1 + Math.sin(this.time * 0.3 + i) * 0.3),
			});
		}
	}

	private renderTint(): void {
		let tintAlpha = 0;
		let tintColor = 0x000000;

		switch (this.weatherType) {
			case "rain":
				tintAlpha = 0.05 * this.intensity;
				tintColor = 0x001133;
				break;
			case "snow":
				tintAlpha = 0.03 * this.intensity;
				tintColor = 0x223344;
				break;
			case "fog":
				tintAlpha = 0.1 * this.intensity;
				tintColor = 0x445566;
				break;
			case "sandstorm":
				tintAlpha = 0.08 * this.intensity;
				tintColor = 0x332200;
				break;
		}

		if (tintAlpha > 0) {
			this.graphics.rect(0, 0, this.width, this.height);
			this.graphics.fill({ color: tintColor, alpha: tintAlpha });
		}
	}

	/** Transition weather over time */
	transitionTo(type: WeatherType, duration = 2): void {
		// Simple: just set immediately (could lerp intensity for smooth transition)
		this.setWeather(type, this.intensity);
	}

	/** Destroy and cleanup */
	destroy(): void {
		this.graphics.destroy();
		this.particles = [];
	}
}
