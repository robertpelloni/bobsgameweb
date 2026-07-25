/**
 * WeatherRenderer — standalone weather effect renderer for the RPG world.
 *
 * Now uses the unified ParticleSystem for rain, snow, and sandstorms.
 */
import { Container, Graphics } from "pixi.js";
import { ParticleEmitter, ParticlePresets } from "./ParticleSystem";
import { WebGPUParticleSystem } from "./WebGPUParticleSystem";

export type WeatherType = "clear" | "rain" | "snow" | "fog" | "sandstorm";

export class WeatherRenderer {
	private container: Container;
	private width: number;
	private height: number;
	private graphics: Graphics;
	private emitter: ParticleEmitter | null = null;
	private webgpuEmitter: WebGPUParticleSystem | null = null;
	private useWebGPU: boolean = false;
	private weatherType: WeatherType = "clear";
	private intensity = 1.0;
	private time = 0;

	constructor(container: Container, width: number, height: number) {
		this.container = container;
		this.width = width;
		this.height = height;
		this.graphics = new Graphics();
		this.useWebGPU = 'gpu' in navigator;
		this.container.addChild(this.graphics);
	}

	/** Set weather type and intensity (0-1) */
	setWeather(type: WeatherType, intensity = 1.0): void {
		if (this.weatherType === type && this.intensity === intensity) return;

		this.weatherType = type;
		this.intensity = Math.max(0, Math.min(1, intensity));

		if (this.emitter) {
			this.emitter.destroy();
			this.emitter = null;
		}

        if (type === "clear") {
            if (this.webgpuEmitter) {
                // Future cleanup hook: this.webgpuEmitter.destroy();
                // For now, we must remove it from the container to prevent frozen particles/leaks
                // if it has a container/view exposed.
                if ((this.webgpuEmitter as any).container) {
                    this.container.removeChild((this.webgpuEmitter as any).container);
                    (this.webgpuEmitter as any).container.destroy();
                }
                this.webgpuEmitter = null;
            }
            return;
        }

		if (this.useWebGPU && !this.webgpuEmitter) {
            const app = (window as any).app || (globalThis as any).__app;
            if (app) {
			    this.webgpuEmitter = new WebGPUParticleSystem(app, this.container);
			    this.webgpuEmitter.init(100000);
            } else {
                this.useWebGPU = false;
            }
		}

		if (this.useWebGPU && this.webgpuEmitter) {
            // WebGPU particles active
		}

		switch (type) {
			case "rain":
				if (!this.useWebGPU) {
					this.emitter = ParticlePresets.rain(this.width / 2, -10, this.width + 100);
					this.container.addChild(this.emitter.container);
				}
				break;
			case "snow":
				if (!this.useWebGPU) {
					this.emitter = ParticlePresets.snow(this.width / 2, -10, this.width + 100);
					this.container.addChild(this.emitter.container);
				}
				break;
			// Sandstorm and Fog could use specific presets or overlays
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

		if (this.emitter) {
			this.emitter.update(dt);
			this.emitter.render();
		}

		if (this.webgpuEmitter) {
		    this.webgpuEmitter.update(dt);
		}

		if (this.weatherType === "fog") {
			this.renderFog();
		}

		this.renderTint();
	}

	private renderFog(): void {
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
		this.setWeather(type, this.intensity);
	}

	/** Destroy and cleanup */
	destroy(): void {
		this.graphics.destroy();
		if (this.emitter) this.emitter.destroy();
	}
}
