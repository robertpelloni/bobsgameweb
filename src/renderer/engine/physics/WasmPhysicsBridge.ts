/**
 * WasmPhysicsBridge — Interface for C++ physics integration.
 *
 * Interfaces with the compiled BobUI C++ components via WebAssembly
 * to provide high-performance collision detection and spatial queries.
 *
 * Supports both Wasm-accelerated calls and JS fallbacks.
 */

export interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
}

export class WasmPhysicsBridge {
    private static instance: WasmPhysicsBridge;
    private module: any = null;
    private initialized: boolean = false;

    public static getInstance(): WasmPhysicsBridge {
        if (!this.instance) {
            this.instance = new WasmPhysicsBridge();
        }
        return this.instance;
    }

    public async init(): Promise<void> {
        if (this.initialized) return;

        console.log("[WasmBridge] Initializing C++ porting layer...");
        try {
            // This would load the actual .wasm module generated from PhysicsBridge.cpp
            // For now, we remain in fallback mode until the CI builds the Wasm artifact.
            // this.module = await createPhysicsModule();
            this.initialized = true;
        } catch (e) {
            console.warn("[WasmBridge] Failed to load Wasm module. Using JS fallback.", e);
            this.initialized = true;
        }
    }

    /**
     * Optimized AABB collision check.
     * Calls C++ static method if module is loaded.
     */
    public checkCollision(rect1: Rect, rect2: Rect): boolean {
        if (this.module && this.module.PhysicsBridge) {
            return this.module.PhysicsBridge.checkCollision(rect1, rect2);
        }

        // JS Fallback
        return (
            rect1.x < rect2.x + rect2.w &&
            rect1.x + rect1.w > rect2.x &&
            rect1.y < rect2.y + rect2.h &&
            rect1.y + rect1.h > rect2.y
        );
    }

    /**
     * Batch collision check for high-concurrency scenarios.
     * Uses C++ batch processor if available.
     */
    public checkBatchCollisions(rect: Rect, others: Rect[]): number[] {
        if (this.module && this.module.PhysicsBridge) {
            // Convert to Wasm vector type if necessary
            // return this.module.PhysicsBridge.checkBatchCollisions(rect, others);
        }

        // JS Fallback
        const results: number[] = [];
        for (let i = 0; i < others.length; i++) {
            if (this.checkCollision(rect, others[i])) {
                results.push(i);
            }
        }
        return results;
    }
}
