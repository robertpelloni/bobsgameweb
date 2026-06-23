/**
 * Stress test for Physics engine.
 * Simulates high density of bodies to evaluate broad-phase and narrow-phase performance.
 * Run: npx tsx src/__tests__/physics-stress.test.ts
 */
import { Physics } from "../renderer/engine/physics/Physics";

const BODY_COUNT = 500;
const ITERATIONS = 100;
const DT = 0.016;

console.log(`\n🚀 Starting Physics Stress Test: ${BODY_COUNT} bodies...`);

const physics = new Physics();

// Create random bodies in a 2000x2000 area
for (let i = 0; i < BODY_COUNT; i++) {
    physics.addBody({
        x: Math.random() * 2000,
        y: Math.random() * 2000,
        width: 16,
        height: 16,
        vx: (Math.random() - 0.5) * 100,
        vy: (Math.random() - 0.5) * 100,
        mass: 1,
        restitution: 0.5,
        friction: 0.5,
        isStatic: false,
        isTrigger: false,
        tag: "npc"
    });
}

// Add some static walls
for (let i = 0; i < 20; i++) {
    physics.addBody({
        x: Math.random() * 2000,
        y: Math.random() * 2000,
        width: 100,
        height: 20,
        vx: 0, vy: 0,
        mass: 1000,
        restitution: 0.2,
        friction: 0.8,
        isStatic: true,
        isTrigger: false,
        tag: "wall"
    });
}

const start = performance.now();

let totalCollisions = 0;
for (let i = 0; i < ITERATIONS; i++) {
    const collisions = physics.step(DT);
    totalCollisions += collisions.length;
}

const end = performance.now();
const totalTime = end - start;
const avgTime = totalTime / ITERATIONS;

console.log(`\n📊 Results (${ITERATIONS} frames):`);
console.log(`  Total Time: ${totalTime.toFixed(2)}ms`);
console.log(`  Avg Frame Time: ${avgTime.toFixed(2)}ms`);
console.log(`  Total Collisions Resolved: ${totalCollisions}`);
console.log(`  Bodies: ${physics.bodyCount}`);

if (avgTime < 16) {
    console.log("  ✅ Performance Target Met (<16ms per frame)");
} else {
    console.warn("  ⚠️ Performance Target Missed (>16ms per frame)");
}
