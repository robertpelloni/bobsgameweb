import { System } from '../System';
import { EntityId } from '../Entity';
import { Component } from '../Component';
import { WeatherComponent } from '../components/WeatherComponent';
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> origin/jules-3-0-9-engine-sync-12991498515375513677
import { ParticleComponent } from '../components/ParticleComponent';
import { Application, Container } from 'pixi.js';

export class WeatherSystem extends System {
    private app: Application;
    private worldContainer: Container;

    constructor(app: Application, worldContainer: Container) {
        super();
        this.app = app;
        this.worldContainer = worldContainer;
<<<<<<< HEAD
=======
import { WeatherRenderer } from '../../graphics/WeatherRenderer';
import { Container } from 'pixi.js';

export class WeatherSystem extends System {
    private renderer: WeatherRenderer | null = null;
    private container: Container;

    constructor(container: Container) {
        super();
        this.container = container;
>>>>>>> origin/jules-3-0-10-sanitization-and-editor-updates-534417342975684788
=======
>>>>>>> origin/jules-3-0-9-engine-sync-12991498515375513677
    }

    public update(dt: number, entities: Map<EntityId, Map<string, Component>>): void {
        for (const [entityId, components] of entities) {
            const weather = components.get('Weather') as WeatherComponent;
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> origin/jules-3-0-9-engine-sync-12991498515375513677
            const particles = components.get('Particle') as ParticleComponent;

            if (weather && weather.type !== 'none' && particles) {
                this.updateWeatherParticles(weather, particles);
            }
        }
    }

    private updateWeatherParticles(weather: WeatherComponent, particles: ParticleComponent): void {
        const hasWeatherEmitter = particles.emitters.some(e => (e as any).isWeather);
        
        if (!hasWeatherEmitter) {
            if (weather.type === 'rain') {
                particles.emitters.push({
                    count: 10, color: 0x4444ff, life: 1.0, speed: 400, size: 2, gravity: 500,
                    isWeather: true // Custom flag
                } as any);
            } else if (weather.type === 'snow') {
                particles.emitters.push({
                    count: 5, color: 0xffffff, life: 3.0, speed: 50, size: 4, gravity: 20,
                    isWeather: true
                } as any);
<<<<<<< HEAD
=======

            if (weather) {
                if (!this.renderer) {
                    // Use standard screen size or pass from scene
                    this.renderer = new WeatherRenderer(this.container, 1280, 720);
                }

                if (this.renderer.getWeather() !== weather.type) {
                    this.renderer.setWeather(weather.type as any, weather.intensity);
                }

                this.renderer.update(dt / 1000);
>>>>>>> origin/jules-3-0-10-sanitization-and-editor-updates-534417342975684788
=======
>>>>>>> origin/jules-3-0-9-engine-sync-12991498515375513677
            }
        }
    }
}
