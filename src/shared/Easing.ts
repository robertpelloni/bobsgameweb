export type EasingFn = (t: number, b: number, c: number, d: number) => number;

export class Easing {
    public static linearTween(t: number, b: number, c: number, d: number): number {
        return c * t / d + b;
    }

    public static linear(t: number, b: number, c: number, d: number): number {
        return Easing.linearTween(t, b, c, d);
    }

    public static easeInQuadratic(t: number, b: number, c: number, d: number): number {
        return c * (t /= d) * t + b;
    }

    public static easeOutQuadratic(t: number, b: number, c: number, d: number): number {
        return -c * (t /= d) * (t - 2) + b;
    }

    public static easeInOutQuadratic(t: number, b: number, c: number, d: number): number {
        if ((t /= d / 2) < 1) return c / 2 * t * t + b;
        return -c / 2 * ((--t) * (t - 2) - 1) + b;
    }

    public static easeInCubic(t: number, b: number, c: number, d: number): number {
        return c * (t /= d) * t * t + b;
    }

    public static easeOutCubic(t: number, b: number, c: number, d: number): number {
        return c * ((t = t / d - 1) * t * t + 1) + b;
    }

    public static easeInOutCubic(t: number, b: number, c: number, d: number): number {
        if ((t /= d / 2) < 1) return c / 2 * t * t * t + b;
        return c / 2 * ((t -= 2) * t * t + 2) + b;
    }

    public static easeInQuartic(t: number, b: number, c: number, d: number): number {
        return c * (t /= d) * t * t * t + b;
    }

    public static easeOutQuartic(t: number, b: number, c: number, d: number): number {
        return -c * ((t = t / d - 1) * t * t * t - 1) + b;
    }

    public static easeInOutQuartic(t: number, b: number, c: number, d: number): number {
        if ((t /= d / 2) < 1) return c / 2 * t * t * t * t + b;
        return -c / 2 * ((t -= 2) * t * t * t - 2) + b;
    }

    public static easeInQuintic(t: number, b: number, c: number, d: number): number {
        return c * (t /= d) * t * t * t * t + b;
    }

    public static easeOutQuintic(t: number, b: number, c: number, d: number): number {
        return c * ((t = t / d - 1) * t * t * t * t + 1) + b;
    }

    public static easeInOutQuintic(t: number, b: number, c: number, d: number): number {
        if ((t /= d / 2) < 1) return c / 2 * t * t * t * t * t + b;
        return c / 2 * ((t -= 2) * t * t * t * t + 2) + b;
    }

    public static easeInSinusoidal(t: number, b: number, c: number, d: number): number {
        return -c * Math.cos(t / d * (Math.PI / 2)) + c + b;
    }

    public static easeOutSinusoidal(t: number, b: number, c: number, d: number): number {
        return c * Math.sin(t / d * (Math.PI / 2)) + b;
    }

    public static easeInOutSinusoidal(t: number, b: number, c: number, d: number): number {
        return -c / 2 * (Math.cos(Math.PI * t / d) - 1) + b;
    }

    public static easeInExponential(t: number, b: number, c: number, d: number): number {
        return (t === 0) ? b : c * Math.pow(2, 10 * (t / d - 1)) + b;
    }

    public static easeOutExponential(t: number, b: number, c: number, d: number): number {
        return (t === d) ? b + c : c * (-Math.pow(2, -10 * t / d) + 1) + b;
    }

    public static easeInOutExponential(t: number, b: number, c: number, d: number): number {
        if (t === 0) return b;
        if (t === d) return b + c;
        if ((t /= d / 2) < 1) return c / 2 * Math.pow(2, 10 * (t - 1)) + b;
        return c / 2 * (-Math.pow(2, -10 * --t) + 2) + b;
    }

    public static easeInCircular(t: number, b: number, c: number, d: number): number {
        return -c * (Math.sqrt(1 - (t /= d) * t) - 1) + b;
    }

    public static easeOutCircular(t: number, b: number, c: number, d: number): number {
        return c * Math.sqrt(1 - (t = t / d - 1) * t) + b;
    }

    public static easeInOutCircular(t: number, b: number, c: number, d: number): number {
        if ((t /= d / 2) < 1) return -c / 2 * (Math.sqrt(1 - t * t) - 1) + b;
        return c / 2 * (Math.sqrt(1 - (t -= 2) * t) + 1) + b;
    }

    public static easeInElastic(t: number, b: number, c: number, d: number, a: number): number {
        if (t === 0) return b;
        if ((t /= d) === 1) return b + c;
        let p = d * .3;
        let s = 0;
        if (a < Math.abs(c)) { a = c; s = p / 4; }
        else s = p / (2 * Math.PI) * Math.asin(c / a);
        return -(a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p)) + b;
    }

    public static easeOutElastic(t: number, b: number, c: number, d: number, a: number): number {
        if (t === 0) return b;
        if ((t /= d) === 1) return b + c;
        let p = d * .3;
        let s = 0;
        if (a < Math.abs(c)) { a = c; s = p / 4; }
        else s = p / (2 * Math.PI) * Math.asin(c / a);
        return a * Math.pow(2, -10 * t) * Math.sin((t * d - s) * (2 * Math.PI) / p) + c + b;
    }

    public static easeInOutElastic(t: number, b: number, c: number, d: number, a: number): number {
        if (t === 0) return b;
        if ((t /= d / 2) === 2) return b + c;
        let p = d * (.3 * 1.5);
        let s = 0;
        if (a < Math.abs(c)) { a = c; s = p / 4; }
        else s = p / (2 * Math.PI) * Math.asin(c / a);
        if (t < 1) return -.5 * (a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p)) + b;
        return a * Math.pow(2, -10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p) * .5 + c + b;
    }

    public static easeInBackSlingshot(t: number, b: number, c: number, d: number): number {
        let s = 1.70158;
        return c * (t /= d) * t * ((s + 1) * t - s) + b;
    }

    public static easeOutBackOvershoot(t: number, b: number, c: number, d: number): number {
        let s = 1.70158;
        return c * ((t = t / d - 1) * t * ((s + 1) * t + s) + 1) + b;
    }

    public static easeInOutBackSlingshotOvershoot(t: number, b: number, c: number, d: number): number {
        let s = 1.70158;
        if ((t /= d / 2) < 1) return c / 2 * (t * t * (((s *= (1.525)) + 1) * t - s)) + b;
        return c / 2 * ((t -= 2) * t * (((s *= (1.525)) + 1) * t + s) + 2) + b;
    }

    public static easeInParabolicBounce(t: number, b: number, c: number, d: number): number {
        return c - Easing.easeOutParabolicBounce(d - t, 0, c, d) + b;
    }

    public static easeOutParabolicBounce(t: number, b: number, c: number, d: number): number {
        if ((t /= d) < (1 / 2.75)) return c * (7.5625 * t * t) + b;
        else if (t < (2 / 2.75)) return c * (7.5625 * (t -= (1.5 / 2.75)) * t + .75) + b;
        else if (t < (2.5 / 2.75)) return c * (7.5625 * (t -= (2.25 / 2.75)) * t + .9375) + b;
        else return c * (7.5625 * (t -= (2.625 / 2.75)) * t + .984375) + b;
    }

    public static easeInOutParabolicBounce(t: number, b: number, c: number, d: number): number {
        if (t < d / 2) return Easing.easeInParabolicBounce(t * 2, 0, c, d) * .5 + b;
        return Easing.easeOutParabolicBounce(t * 2 - d, 0, c, d) * .5 + c * .5 + b;
    }

    public static lerp(start: number, end: number, amt: number): number {
        return (1 - amt) * start + amt * end;
    }

    public static clamp(val: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, val));
    }

    public static normalize(val: number, min: number, max: number): number {
        return (val - min) / (max - min);
    }

    public static remap(val: number, inMin: number, max: number, outMin: number, outMax: number): number {
        return Easing.lerp(outMin, outMax, Easing.normalize(val, inMin, max));
    }

    public static smoothstep(edge0: number, edge1: number, x: number): number {
        const t = Easing.clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
        return t * t * (3.0 - 2.0 * t);
    }

    public static smootherstep(edge0: number, edge1: number, x: number): number {
        const t = Easing.clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
}

export const lerp = Easing.lerp;
export const clamp = Easing.clamp;
export const normalize = Easing.normalize;
export const remap = Easing.remap;
export const smoothstep = Easing.smoothstep;
export const smootherstep = Easing.smootherstep;
