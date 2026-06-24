import { ParticleEmitter, ParticlePresets } from '../renderer/engine/graphics/ParticleSystem';

console.log("Running Particle System Tests...");

// Mock Container for testing
class MockContainer {
    children: any[] = [];
    addChild(c: any) { this.children.push(c); }
    removeChild(c: any) {
        const idx = this.children.indexOf(c);
        if (idx !== -1) this.children.splice(idx, 1);
    }
}

function testEmitter() {
    console.log("Testing ParticleEmitter...");
    const container = new MockContainer() as any;
    const emitter = new ParticleEmitter(container, {
        maxParticles: 100,
        spawnRate: 10,
        lifeTime: [1, 2],
        speed: [50, 100],
        color: [0xffffff, 0xff0000]
    });

    // Initial state
    if (emitter.count !== 0) throw new Error("Emitter should start empty");

    // Update to spawn particles
    emitter.update(0.5); // Should spawn 5 particles
    console.log(`Particles spawned: ${emitter.count}`);
    if (emitter.count === 0) throw new Error("Particles should have spawned");

    // Update to age particles
    emitter.update(3); // All should be dead
    console.log(`Particles after aging: ${emitter.count}`);
    if (emitter.count !== 0) throw new Error("Particles should have died");

    emitter.destroy();
    console.log("✅ ParticleEmitter test passed");
}

function testPresets() {
    console.log("Testing ParticlePresets...");
    const container = new MockContainer() as any;

    const fire = ParticlePresets.fire(0, 0);
    if (!fire) throw new Error("Fire preset failed");

    const explosion = ParticlePresets.explosion(0, 0);
    if (!explosion) throw new Error("Explosion preset failed");

    const snow = ParticlePresets.snow(0, 0, 100, 100);
    if (!snow) throw new Error("Snow preset failed");

    console.log("✅ ParticlePresets test passed");
}

try {
    testEmitter();
    testPresets();
    console.log("\n==================================================");
    console.log("Results: 2 passed, 0 failed");
    console.log("✅ ALL TESTS PASSED");
} catch (e) {
    console.error("\n❌ TEST FAILED:");
    console.error(e);
    process.exit(1);
}
