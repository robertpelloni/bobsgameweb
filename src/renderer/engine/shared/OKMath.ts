/**
 * OKMath — math utilities for the game engine.
 *
 * Ported from okgame C++ Utility/OKMath.
 * Provides distance, collision, random, and power-of-two utilities.
 */

export class OKMath {
    // ============================================================
    // Distance
    // ============================================================

    static distance(x1: number, y1: number, x2: number, y2: number): number {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    static distanceSq(x1: number, y1: number, x2: number, y2: number): number {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return dx * dx + dy * dy;
    }

    static manhattan(x1: number, y1: number, x2: number, y2: number): number {
        return Math.abs(x2 - x1) + Math.abs(y2 - y1);
    }

    // ============================================================
    // Collision
    // ============================================================

    static isXYTouchingXY(x: number, y: number, x2: number, y2: number): boolean {
        return x === x2 && y === y2;
    }

    static isXYXYTouchingXY(left: number, top: number, right: number, bottom: number, x: number, y: number): boolean {
        return x >= left && x <= right && y >= top && y <= bottom;
    }

    static isXYTouchingXYXY(x: number, y: number, left: number, top: number, right: number, bottom: number): boolean {
        return x >= left && x <= right && y >= top && y <= bottom;
    }

    static isXYXYTouchingXYXY(
        myLeft: number, myTop: number, myRight: number, myBottom: number,
        left: number, top: number, right: number, bottom: number,
    ): boolean {
        return myLeft <= right && myRight >= left && myTop <= bottom && myBottom >= top;
    }

    static isXYTouchingXYByAmount(x: number, y: number, x2: number, y2: number, amt: number): boolean {
        return OKMath.distance(x, y, x2, y2) <= amt;
    }

    static isXYXYTouchingXYByAmount(left: number, top: number, right: number, bottom: number, x: number, y: number, amt: number): boolean {
        const cx = (left + right) / 2;
        const cy = (top + bottom) / 2;
        return OKMath.distance(cx, cy, x, y) <= amt;
    }

    // ============================================================
    // Random
    // ============================================================

    static random(): number {
        return Math.random();
    }

    static randomFloat(): number {
        return Math.random();
    }

    static randomInt(): number {
        return Math.floor(Math.random() * 0x7FFFFFFF);
    }

    static randLessThan(n: number): number {
        return Math.floor(Math.random() * n);
    }

    static randUpToIncluding(n: number): number {
        return Math.floor(Math.random() * (n + 1));
    }

    static randMinMax(from: number, to: number): number {
        return from + Math.floor(Math.random() * (to - from + 1));
    }

    static randLessThanFloat(n: number): number {
        return Math.random() * n;
    }

    static randMinMaxFloat(from: number, to: number): number {
        return from + Math.random() * (to - from);
    }

    /** Random element from an array */
    static randomElement<T>(arr: T[]): T {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    /** Shuffle array in-place (Fisher-Yates) */
    static shuffle<T>(arr: T[]): T[] {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    // ============================================================
    // Power-of-two
    // ============================================================

    static getClosestPowerOfTwo(v: number): number {
        return Math.pow(2, Math.round(Math.log2(v)));
    }

    static isTexturePowerOfTwo(width: number, height: number): boolean {
        return OKMath.isPowerOfTwo(width) && OKMath.isPowerOfTwo(height);
    }

    static isPowerOfTwo(v: number): boolean {
        return v > 0 && (v & (v - 1)) === 0;
    }

    static powerOfTwo(v: number): number {
        let p = 1;
        while (p < v) p <<= 1;
        return p;
    }

    static get2Fold(v: number): number {
        return OKMath.powerOfTwo(v);
    }

    // ============================================================
    // Interpolation
    // ============================================================

    static lerp(a: number, b: number, t: number): number {
        return a + (b - a) * t;
    }

    static clamp(v: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, v));
    }

    static wrapAngle(angle: number): number {
        return ((angle % 360) + 360) % 360;
    }

    static degToRad(deg: number): number {
        return deg * Math.PI / 180;
    }

    static radToDeg(rad: number): number {
        return rad * 180 / Math.PI;
    }

    // ============================================================
    // Angle
    // ============================================================

    static angleBetween(x1: number, y1: number, x2: number, y2: number): number {
        return Math.atan2(y2 - y1, x2 - x1);
    }

    static directionFromAngle(angle: number): number {
        // Returns 0-7 for 8 directions
        const normalized = ((angle * 180 / Math.PI) % 360 + 360) % 360;
        return Math.round(normalized / 45) % 8;
    }
}
