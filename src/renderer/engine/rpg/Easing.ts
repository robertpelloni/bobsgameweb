/**
 * Easing functions ported from okgame C++ Engine.
 * Used by cinematics, tweening, and event systems.
 */

export class Easing {
    static linear(t: number, b: number, c: number, d: number): number {
        return (c * t) / d + b;
    }

    static easeInQuad(t: number, b: number, c: number, d: number): number {
        t /= d;
        return c * t * t + b;
    }

    static easeOutQuad(t: number, b: number, c: number, d: number): number {
        t /= d;
        return -c * t * (t - 2) + b;
    }

    static easeInOutQuad(t: number, b: number, c: number, d: number): number {
        t /= d / 2;
        if (t < 1) return (c / 2) * t * t + b;
        t--;
        return (-c / 2) * (t * (t - 2) - 1) + b;
    }

    static easeInCubic(t: number, b: number, c: number, d: number): number {
        t /= d;
        return c * t * t * t + b;
    }

    static easeOutCubic(t: number, b: number, c: number, d: number): number {
        t /= d;
        t--;
        return c * (t * t * t + 1) + b;
    }

    static easeInOutCubic(t: number, b: number, c: number, d: number): number {
        t /= d / 2;
        if (t < 1) return (c / 2) * t * t * t + b;
        t -= 2;
        return (c / 2) * (t * t * t + 2) + b;
    }

    static easeInQuart(t: number, b: number, c: number, d: number): number {
        t /= d;
        return c * t * t * t * t + b;
    }

    static easeOutQuart(t: number, b: number, c: number, d: number): number {
        t /= d;
        t--;
        return -c * (t * t * t * t - 1) + b;
    }

    static easeInOutQuart(t: number, b: number, c: number, d: number): number {
        t /= d / 2;
        if (t < 1) return (c / 2) * t * t * t * t + b;
        t -= 2;
        return (-c / 2) * (t * t * t * t - 2) + b;
    }

    static easeInBack(t: number, b: number, c: number, d: number): number {
        const s = 1.70158;
        const t2 = t / d;
        return c * t2 * t2 * ((s + 1) * t2 - s) + b;
    }

    static easeOutBack(t: number, b: number, c: number, d: number): number {
        const s = 1.70158;
        const t2 = (t / d) - 1;
        return c * (t2 * t2 * ((s + 1) * t2 + s) + 1) + b;
    }

    static easeInOutBack(t: number, b: number, c: number, d: number): number {
        const s = 1.70158 * 1.525;
        const t2 = t / (d / 2);
        if (t2 < 1) return (c / 2) * (t2 * t2 * ((s + 1) * t2 - s)) + b;
        const t3 = t2 - 2;
        return (c / 2) * (t3 * t3 * ((s + 1) * t3 + s) + 2) + b;
    }

    static easeOutElastic(t: number, b: number, c: number, d: number): number {
        if (t === 0) return b;
        const t2 = t / d;
        if (t2 === 1) return b + c;
        const p = d * 0.3;
        const s = p / 4;
        return c * Math.pow(2, -10 * t2) * Math.sin(((t2 * d - s) * (2 * Math.PI)) / p) + c + b;
    }

    static easeOutBounce(t: number, b: number, c: number, d: number): number {
        const t2 = t / d;
        if (t2 < 1 / 2.75) {
            return c * (7.5625 * t2 * t2) + b;
        } else if (t2 < 2 / 2.75) {
            const t3 = t2 - 1.5 / 2.75;
            return c * (7.5625 * t3 * t3 + 0.75) + b;
        } else if (t2 < 2.5 / 2.75) {
            const t3 = t2 - 2.25 / 2.75;
            return c * (7.5625 * t3 * t3 + 0.9375) + b;
        } else {
            const t3 = t2 - 2.625 / 2.75;
            return c * (7.5625 * t3 * t3 + 0.984375) + b;
        }
    }

    /**
     * Ease out with parabolic bounce overshoot.
     */
    static easeOutParabolicBounce(t: number, b: number, c: number, d: number): number {
        let t2 = t / d;
        if (t2 > 1.0) t2 = 1.0;
        // Overshoot at ~0.6 then settle
        const overshoot = 1.0 + 0.15 * Math.sin(t2 * Math.PI);
        const base = 1.0 - (1.0 - t2) * (1.0 - t2); // ease out quad
        return b + c * base * overshoot;
    }

    /**
     * Ease in with back slingshot (undershoot).
     */
    static easeInBackSlingshot(t: number, b: number, c: number, d: number): number {
        let t2 = t / d;
        if (t2 > 1.0) t2 = 1.0;
        const s = 1.70158;
        return c * t2 * t2 * ((s + 1) * t2 - s) + b;
    }
}
