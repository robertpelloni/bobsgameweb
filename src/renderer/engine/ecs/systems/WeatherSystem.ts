import { System } from '../System';
import { EntityId } from '../Entity';
import { Component } from '../Component';
import { WeatherComponent } from '../components/WeatherComponent';
import { WeatherRenderer } from '../../graphics/WeatherRenderer';
import { Container } from 'pixi.js';

export class WeatherSystem extends System {
    private renderer: WeatherRenderer | null = null;
    private container: Container;

    constructor(container: Container) {
        super();
        this.container = container;
    }

    public update(dt: number, entities: Map<EntityId, Map<string, Component>>): void {
        for (const [entityId, components] of entities) {
            const weather = components.get('Weather') as WeatherComponent;

            if (weather) {
                if (!this.renderer) {
                    // Use standard screen size or pass from scene
                    this.renderer = new WeatherRenderer(this.container, 1280, 720);
                }

                if (this.renderer.getWeather() !== weather.type) {
                    this.renderer.setWeather(weather.type as any, weather.intensity);
                }

                this.renderer.update(dt / 1000);
            }
        }
    }
}
