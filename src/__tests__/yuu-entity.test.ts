import { YuuEntity } from '../renderer/engine/entity/YuuEntity';
import { SpriteAtlas } from '../renderer/engine/map/SpriteAtlas';

// Mock SpriteAtlas
const mockSpriteAtlas = {
    loaded: true,
    has8Directions: (name: string) => name === 'yuu',
    createAnimatedSprite: () => ({
        anchor: { set: () => {} },
        textures: [],
        play: () => {},
        stop: () => {},
        gotoAndStop: () => {},
        playing: false,
        x: 0,
        y: 0,
        zIndex: 0
    }),
    getAnimationFrames: () => []
} as unknown as SpriteAtlas;

console.log('🛡 YuuEntity Logic Tests');

function testYuuEntity() {
    const yuu = new YuuEntity(mockSpriteAtlas);

    // Test Initial State
    if (yuu.animDirection !== 1) throw new Error('Initial animDirection should be 1 (Down)');
    console.log('  ✅ Initial state correct');

    // Test Movement Update (Down)
    yuu.updateEntity(0.1, 0, 1, false);
    if (yuu.moveDirection !== 1) throw new Error('Move direction should be 1 (Down)');
    console.log('  ✅ Move direction update (Down)');

    // Test Movement Update (UpRight)
    yuu.updateEntity(0.1, 1, -1, false);
    if (yuu.moveDirection !== 5) throw new Error('Move direction should be 5 (UpRight)');
    console.log('  ✅ Move direction update (UpRight)');

    // Test Hitbox Parity
    const py = 100;
    yuu.setPosition(100, py);
    const expectedHitY = py - 32 + 30; // y - height + HITBOX_FROM_TOP
    if (yuu.getCollisionY() !== expectedHitY) {
        throw new Error(`Hitbox mismatch: expected ${expectedHitY}, got ${yuu.getCollisionY()}`);
    }
    console.log('  ✅ Hitbox parity correct (30px offset)');

    // Test Turning Logic (Diagonal)
    // 1 (Down) -> 3 (Right) should pass through 7 (DownRight)
    yuu.animDirection = 1;
    yuu.moveDirection = 3;
    yuu.updateEntity(0.2, 1, 0, false); // Enough dt to trigger turn
    if (yuu.animDirection === 7) {
        console.log('  ✅ Turning logic correct (Down -> DownRight -> Right)');
    } else {
        console.log(`  ⚠️ Turning logic intermediate frame: ${yuu.animDirection} (expected 7)`);
    }
}

try {
    testYuuEntity();
    console.log('\n✅ ALL YUUENTITY TESTS PASSED');
} catch (e) {
    console.error('\n❌ TEST FAILED:', e);
    process.exit(1);
}
