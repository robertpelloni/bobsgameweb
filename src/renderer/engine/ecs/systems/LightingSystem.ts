import { System } from '../System';
import { EntityId } from '../Entity';
import { Component } from '../Component';
import { LightComponent } from '../components/LightComponent';
import { TransformComponent } from '../components/TransformComponent';
import { Application, Container, Graphics, RenderTexture, Sprite, Texture, BLEND_MODES } from 'pixi.js';

export class LightingSystem extends System {
    private app: Application;
    private lightTexture: RenderTexture;
    private lightSprite: Sprite;
    private lightLayer: Container;
    private tempContainer: Container;
    private backgroundGraphic: Graphics;
    
    private lightBrush: Sprite;
    
    public ambientColor: number = 0xffffff;
    private timeOfDay: number = 0; // 0.0 to 1.0 (24h cycle)
    public dayDuration: number = 60.0;

    constructor(app: Application, parentContainer: Container) {
        super();
        this.app = app;
        
        this.lightTexture = RenderTexture.create({ width: app.screen.width, height: app.screen.height });
        this.lightSprite = new Sprite(this.lightTexture);
        this.lightSprite.blendMode = 'multiply' as BLEND_MODES;
        
        this.lightLayer = new Container();
        this.lightLayer.addChild(this.lightSprite);
        parentContainer.addChild(this.lightLayer);

        this.tempContainer = new Container();
        this.backgroundGraphic = new Graphics();
        this.tempContainer.addChild(this.backgroundGraphic);

        // Create a radial gradient brush for lights
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d')!;
        const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 128, 128);

        const tex = Texture.from(canvas);
        this.lightBrush = new Sprite(tex);
        this.lightBrush.anchor.set(0.5);
        this.lightBrush.blendMode = 'add' as BLEND_MODES;
    }

    public update(dt: number, entities: Map<EntityId, Map<string, Component>>): void {
        this.timeOfDay = (this.timeOfDay + (dt / this.dayDuration)) % 1.0;
        this.updateAmbientColor();

        // 1. Draw background ambient darkness
        this.backgroundGraphic.clear();
        this.backgroundGraphic.rect(0, 0, this.app.screen.width, this.app.screen.height);
        this.backgroundGraphic.fill({ color: this.ambientColor, alpha: 1.0 });
        
        // Remove old dynamic light sprites
        while (this.tempContainer.children.length > 1) {
            this.tempContainer.removeChildAt(1);
        }
        
        // 2. Draw all dynamic lights using ADD blend mode over the ambient background
        for (const [entityId, components] of entities) {
            const light = components.get('Light') as LightComponent;
            const transform = components.get('Transform') as TransformComponent;

            if (light && transform) {
                let currentRadius = light.radius;
                if (light.flicker) {
                    currentRadius = light.baseRadius + Math.sin(Date.now() / 200 * light.flickerSpeed) * (light.baseRadius * 0.1);
                }

                // Create a temporary sprite for this frame
                const sprite = new Sprite(this.lightBrush.texture);
                sprite.anchor.set(0.5);
                sprite.blendMode = 'add' as BLEND_MODES;
                sprite.tint = light.color;
                sprite.alpha = light.intensity;
                
                // Note: If the world has a camera, we need to subtract camera position here.
                // Assuming global coordinates for now or that the lightLayer moves with the camera.
                // If the lightLayer is a child of the camera container, we don't need to subtract screen coords!
                sprite.position.set(transform.x, transform.y);
                
                // The base brush is 128x128. Scale it to the desired radius.
                const scale = (currentRadius * 2) / 128;
                sprite.scale.set(scale);

                this.tempContainer.addChild(sprite);
            }
        }

        // Render the composite container to the texture
        this.app.renderer.render({
            container: this.tempContainer,
            target: this.lightTexture,
            clear: true
        });
    }

    private updateAmbientColor(): void {
        // Sunrise -> Day -> Sunset -> Night
        let r = 255, g = 255, b = 255;
        
        if (this.timeOfDay < 0.25) { // Midnight to Dawn
            const t = this.timeOfDay / 0.25;
            r = this.lerp(20, 255, t);
            g = this.lerp(20, 150, t);
            b = this.lerp(80, 100, t);
        } else if (this.timeOfDay < 0.5) { // Dawn to Noon
            const t = (this.timeOfDay - 0.25) / 0.25;
            r = this.lerp(255, 255, t);
            g = this.lerp(150, 255, t);
            b = this.lerp(100, 255, t);
        } else if (this.timeOfDay < 0.75) { // Noon to Dusk
            const t = (this.timeOfDay - 0.5) / 0.25;
            r = this.lerp(255, 255, t);
            g = this.lerp(255, 120, t);
            b = this.lerp(255, 100, t);
        } else { // Dusk to Midnight
            const t = (this.timeOfDay - 0.75) / 0.25;
            r = this.lerp(255, 20, t);
            g = this.lerp(120, 20, t);
            b = this.lerp(100, 80, t);
        }
        
        this.ambientColor = (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
    }

    private lerp(start: number, end: number, t: number): number {
        return start + (end - start) * t;
    }

    public resize(width: number, height: number): void {
        this.lightTexture.resize(width, height);
    }
}
