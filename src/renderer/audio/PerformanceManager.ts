import { AudioManager } from './AudioManager';

/**
 * PerformanceManager — Handles run-time audio performance adjustments.
 *
 * Detects low-end environments (e.g. mobile) and adjusts
 * audio quality and playback strategies.
 */
export class PerformanceManager {
    private static isLowEnd = false;

    public static init(): void {
        this.detectEnvironment();
    }

    private static detectEnvironment(): void {
        const ua = navigator.userAgent.toLowerCase();
        const isMobile = /iphone|ipad|ipod|android|blackberry|mini|windows\sphone/i.test(ua);

        // Check for reduced motion or hardware constraints if needed
        this.isLowEnd = isMobile || (navigator as any).deviceMemory < 4;

        if (this.isLowEnd) {
            console.log("[Performance] Low-end environment detected. Optimizing audio...");
            this.optimize();
        }
    }

    private static optimize(): void {
        // Example: Disable complex tracker effects or force OGG usage
        // This is where we'd toggle fallback behavior in AudioManager
    }

    public static get shouldPreferCompressed(): boolean {
        return this.isLowEnd;
    }
}
