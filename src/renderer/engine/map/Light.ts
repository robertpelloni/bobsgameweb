/**
 * Light — dynamic map light with color, radius, flicker, and day/night cycle support.
 *
 * Ported from okgame C++ Engine/map/Light.
 */

export class LightData {
    public id: number;
    public name: string;
    public mapX = 0;
    public mapY = 0;
    public width = 64;
    public height = 64;

    // Color
    public r = 255;
    public g = 255;
    public b = 255;
    public a = 255;

    // Shape
    public radius = 32;
    public focusRadius = 8;
    public blendFalloff = 0.5;
    public decayExponent = 2.0;

    // Day/night
    public isDayLight = true;
    public isNightLight = true;

    // Flicker
    public flickers = false;
    public flickerOnTicks = 100;
    public flickerOffTicks = 20;
    public flickerRandomUpToOn = false;
    public flickerRandomUpToOff = false;

    // Toggle
    public toggleable = false;
    public toggleX = 0;
    public toggleY = 0;

    // Color change
    public changesColor = false;

    constructor(id: number, name = '') {
        this.id = id;
        this.name = name;
    }

    static fromJSON(data: Record<string, unknown>): LightData {
        const light = new LightData(
            (data.id as number) ?? -1,
            (data.name as string) ?? '',
        );
        Object.assign(light, data);
        return light;
    }

    toJSON(): Record<string, unknown> {
        return { ...this } as unknown as Record<string, unknown>;
    }
}

export class Light {
    public data: LightData;
    public isOn = true;
    public isScreenLight = false;

    private flickerTimer = 0;
    private flickerState = true;

    constructor(data: LightData) {
        this.data = data;
    }

    update(dt: number): void {
        if (this.data.flickers && this.isOn) {
            this.flickerTimer += dt;
            const onTime = this.data.flickerRandomUpToOn
                ? Math.random() * this.data.flickerOnTicks
                : this.data.flickerOnTicks;
            const offTime = this.data.flickerRandomUpToOff
                ? Math.random() * this.data.flickerOffTicks
                : this.data.flickerOffTicks;

            if (this.flickerState && this.flickerTimer > onTime) {
                this.flickerState = false;
                this.flickerTimer = 0;
            } else if (!this.flickerState && this.flickerTimer > offTime) {
                this.flickerState = true;
                this.flickerTimer = 0;
            }
        }
    }

    toggle(): void {
        this.isOn = !this.isOn;
    }

    setOnOff(b: boolean): void {
        this.isOn = b;
    }

    /** Get effective alpha considering flicker. */
    getEffectiveAlpha(): number {
        if (!this.isOn) return 0;
        if (this.data.flickers && !this.flickerState) return 0;
        return this.data.a / 255;
    }

    getColor(): { r: number; g: number; b: number; a: number } {
        return {
            r: this.data.r,
            g: this.data.g,
            b: this.data.b,
            a: this.getEffectiveAlpha(),
        };
    }
}
