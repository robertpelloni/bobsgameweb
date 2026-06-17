/**
 * Tests for Physics engine and WasmPhysicsBridge.
 * Run: npx tsx src/__tests__/physics.test.ts
 */
let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✅ ${m}`); } else { failed++; console.error(`  ❌ ${m}`); } }
function assertEqual(a: unknown, e: unknown, m: string) { if (JSON.stringify(a)===JSON.stringify(e)) { passed++; console.log(`  ✅ ${m}`); } else { failed++; console.error(`  ❌ ${m} — exp ${JSON.stringify(e)}, got ${JSON.stringify(a)}`); } }

import { Physics } from "../renderer/engine/physics/Physics";

console.log("\n📦 Physics Engine Tests");
{
    const physics = new Physics();

    // Add bodies
    const body1 = physics.addBody({
        x: 0, y: 0, width: 32, height: 32,
        vx: 0, vy: 0, mass: 1, restitution: 0.5, friction: 0.5,
        isStatic: false, isTrigger: false, tag: "player"
    });

    const body2 = physics.addBody({
        x: 10, y: 10, width: 32, height: 32,
        vx: 0, vy: 0, mass: 1, restitution: 0.5, friction: 0.5,
        isStatic: true, isTrigger: false, tag: "wall"
    });

    assertEqual(physics.bodyCount, 2, "Physics body count = 2");

    // Simulation step
    const collisions = physics.step(0.016);
    assert(collisions.length > 0, "Collision detected");

    // Position change due to gravity and resolution
    assert(body1.y > 0, "Player body moved");
}

console.log("\n📏 Spatial Query Tests");
{
    const physics = new Physics();
    physics.addBody({
        x: 100, y: 100, width: 50, height: 50,
        vx: 0, vy: 0, mass: 1, restitution: 0, friction: 0,
        isStatic: true, isTrigger: false, tag: "test"
    });

    const results = physics.queryArea(110, 110, 10, 10);
    assertEqual(results.length, 1, "queryArea found body");

    const ptResults = physics.queryPoint(125, 125);
    assertEqual(ptResults.length, 1, "queryPoint found body");
}

console.log("\n🔦 Raycast Tests");
{
    const physics = new Physics();
    physics.addBody({
        x: 200, y: 0, width: 20, height: 100,
        vx: 0, vy: 0, mass: 1, restitution: 0, friction: 0,
        isStatic: true, isTrigger: false, tag: "wall"
    });

    const hit = physics.raycast(0, 50, 1, 0, 500);
    assert(hit !== null, "Raycast hit wall");
    if (hit) {
        assertEqual(hit.body?.tag, "wall", "Raycast hit correct tag");
        assertEqual(hit.distance, 200, "Raycast hit correct distance");
        assertEqual(hit.normalX, -1, "Raycast hit correct normal");
    }
}

console.log(`\n${"=".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
