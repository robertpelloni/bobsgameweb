import { System } from '../System';
import { EntityId } from '../Entity';
import { Component } from '../Component';
import { LightComponent } from '../components/LightComponent';
import { TransformComponent } from '../components/TransformComponent';
import { Application, Container, Graphics, RenderTexture, Sprite, Texture, BLEND_MODES } from 'pixi.js';
import { AudioManager } from '../../../audio/AudioManager';

/** Light data from map_lights.json (extracted from _Project.txt) */
export interface MapLightData {
  name: string;
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
  g: number;
  b: number;
  a: number;
  radius: number;
  falloff: number;
  decay: number;
  focus: number;
  dayLight: boolean;
  nightLight: boolean;
  flickers: boolean;
  changesColor: boolean;
  toggleable: boolean;
}

export class LightingSystem extends System {
  private app: Application;
  private lightTexture: RenderTexture;
  private lightSprite: Sprite;
  private lightLayer: Container;
  private tempContainer: Container;
  private backgroundGraphic: Graphics;
  private lightBrush: Sprite;
  public ambientColor: number = 0xffffff;
  public enableDayNightCycle: boolean = true;
  private timeOfDay: number = 0; // 0.0 to 1.0 (24h cycle)
  public dayDuration: number = 60.0;
  public cameraX: number = 0;
  public cameraY: number = 0;
  public cameraZoom: number = 1;

  /** Per-map lights loaded from map_lights.json */
  private mapLights: MapLightData[] = [];
  private mapLightsCache: Map<string, MapLightData[]> = new Map();
  private lightsLoaded: boolean = false;

  /** Current map name for light lookup */
  public currentMapName: string = '';

  constructor(app: Application, parentContainer: Container) {
    super();
    this.app = app;
    this.lightTexture = RenderTexture.create({ width: app.screen.width, height: app.screen.height });
    this.lightSprite = new Sprite(this.lightTexture);
    this.lightSprite.blendMode = 'multiply' as BLEND_MODES;
    this.lightLayer = new Container();
    this.lightLayer.addChild(this.lightSprite);
    parentContainer.addChild(this.lightLayer);
    this.lightLayer.zIndex = 9995;
    parentContainer.sortableChildren = true;

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

    // Load map lights data
    this.loadMapLights();
  }

  /** Load per-map light data from map_lights.json */
  private async loadMapLights(): Promise<void> {
    try {
      const resp = await fetch('/map_lights.json');
      if (resp.ok) {
        const data = await resp.json();
        for (const [mapName, lights] of Object.entries(data)) {
          this.mapLightsCache.set(mapName, lights as MapLightData[]);
        }
        this.lightsLoaded = true;
        console.log(`[LightingSystem] Loaded lights for ${this.mapLightsCache.size} maps`);
      }
    } catch (e) {
      console.warn('[LightingSystem] Could not load map_lights.json:', e);
    }
  }

  /** Set the current map — loads its lights */
  public setMap(mapName: string): void {
    this.currentMapName = mapName;
    this.mapLights = this.mapLightsCache.get(mapName) ?? [];
    if (this.mapLights.length > 0) {
      console.log(`[LightingSystem] Map "${mapName}": ${this.mapLights.length} lights`);
    }
  }

  private fftData: Uint8Array = new Uint8Array(128);

  public update(dt: number, entities: Map<EntityId, Map<string, Component>>): void {
    if (this.enableDayNightCycle) {
      this.timeOfDay = (this.timeOfDay + (dt / (this.dayDuration * 1000))) % 1.0;
      this.updateAmbientColor();
    }

    // 0. Process FFT for audio-reactive lighting
    let audioPulse = 0;
    const analyzer = (AudioManager as any).analyzer as AnalyserNode;
    if (analyzer) {
        analyzer.getByteFrequencyData(this.fftData);
        // Use sub-bass / bass frequencies (bins 0-10)
        let sum = 0;
        for (let i = 0; i < 10; i++) sum += this.fftData[i];
        audioPulse = sum / 2550; // normalized 0-1 pulse
    }

    // 1. Draw background ambient darkness
    this.backgroundGraphic.clear();
    this.backgroundGraphic.rect(0, 0, this.app.screen.width, this.app.screen.height);
    this.backgroundGraphic.fill({ color: this.ambientColor, alpha: 1.0 });

    // Remove old dynamic light sprites
    while (this.tempContainer.children.length > 1) {
      this.tempContainer.removeChildAt(1);
    }

    const isDay = this.timeOfDay >= 0.2 && this.timeOfDay <= 0.8;

    // 2. Draw per-map lights (from map_lights.json)
    for (const light of this.mapLights) {
      // Skip lights that don't apply to current time of day
      if (isDay && !light.dayLight) continue;
      if (!isDay && !light.nightLight) continue;

      // Convert world position to screen position
      // Light x/y are in pixel coordinates from _Project.txt
      const screenX = (light.x - this.cameraX) * this.cameraZoom;
      const screenY = (light.y - this.cameraY) * this.cameraZoom;

      // Skip if off-screen (with generous margin for large lights)
      const margin = light.radius * 2 * this.cameraZoom;
      if (screenX < -margin || screenX > this.app.screen.width + margin ||
          screenY < -margin || screenY > this.app.screen.height + margin) continue;

      const sprite = new Sprite(this.lightBrush.texture);
      sprite.anchor.set(0.5);
      sprite.blendMode = 'add' as BLEND_MODES;

      // Color from light data
      const color = (light.r << 16) | (light.g << 8) | light.b;
      sprite.tint = color;

      // Alpha from light data (0-255 -> 0-1), adjusted for falloff
      const alphaBase = light.a / 255;
      // Falloff controls how quickly the light fades from center to edge
      // Higher falloff = more concentrated light
      sprite.alpha = alphaBase * 0.8; // Slight reduction for natural look

      // Flicker effect
      if (light.flickers) {
        sprite.alpha *= 0.85 + Math.random() * 0.15;
      }

      sprite.position.set(screenX, screenY);

      // Scale the 128px brush to the light's radius
      // radius is in 1x pixels, cameraZoom scales it
      const scale = (light.radius * 2 * this.cameraZoom) / 128;
      sprite.scale.set(scale);

      this.tempContainer.addChild(sprite);
    }

    // 3. Draw ECS dynamic lights (from LightComponent entities)
    for (const [entityId, components] of entities) {
      const light = components.get('Light') as LightComponent;
      const transform = components.get('Transform') as TransformComponent;
      if (light && transform) {
        let currentRadius = light.radius;

        // Apply audio pulse to radius if enabled (defaulting to minor impact for immersion)
        if (audioPulse > 0.5) {
            currentRadius *= (1.0 + (audioPulse - 0.5) * 0.2);
        }

        if (light.flicker) {
          currentRadius = light.baseRadius + Math.sin(Date.now() / 200 * light.flickerSpeed) * (light.baseRadius * 0.1);
        }
        const sprite = new Sprite(this.lightBrush.texture);
        sprite.anchor.set(0.5);
        sprite.blendMode = 'add' as BLEND_MODES;
        sprite.tint = light.color;
        sprite.alpha = light.intensity;
        const screenX = (transform.x - this.cameraX) * this.cameraZoom;
        const screenY = (transform.y - this.cameraY) * this.cameraZoom;
        sprite.position.set(screenX, screenY);
        const scale = (currentRadius * 2 * this.cameraZoom) / 128;
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
    if (this.timeOfDay < 0.25) {
      // Midnight to Dawn
      const t = this.timeOfDay / 0.25;
      r = this.lerp(20, 255, t);
      g = this.lerp(20, 150, t);
      b = this.lerp(80, 100, t);
    } else if (this.timeOfDay < 0.5) {
      // Dawn to Noon
      const t = (this.timeOfDay - 0.25) / 0.25;
      r = this.lerp(255, 255, t);
      g = this.lerp(150, 255, t);
      b = this.lerp(100, 255, t);
    } else if (this.timeOfDay < 0.75) {
      // Noon to Dusk
      const t = (this.timeOfDay - 0.5) / 0.25;
      r = this.lerp(255, 255, t);
      g = this.lerp(255, 120, t);
      b = this.lerp(255, 100, t);
    } else {
      // Dusk to Midnight
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
