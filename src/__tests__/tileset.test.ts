/**
 * Unit tests for Tileset + Palette — pixel manipulation, RGBA generation.
 *
 * Run with: npx tsx src/__tests__/tileset.test.ts
 */
import { Tileset } from "../shared/Tileset";
import { Palette } from "../shared/Palette";
import { BobColor } from "../shared/BobColor";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
	if (condition) { passed++; console.log(`  ✅ ${message}`); }
	else { failed++; console.error(`  ❌ ${message}`); }
}

function assertEqual(actual: unknown, expected: unknown, message: string): void {
	if (JSON.stringify(actual) === JSON.stringify(expected)) {
		passed++; console.log(`  ✅ ${message}`);
	} else {
		failed++; console.error(`  ❌ ${message} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
	}
}

// ============================================================
// Palette Tests
// ============================================================

console.log("\n🎨 Palette Tests");

{
	const p = new Palette(256);
	assertEqual(p.numColors, 256, "Palette has 256 colors");
	assertEqual(p.colors.length, 256, "Colors array has 256 entries");
}

{
	const p = new Palette(16);
	p.setColor(1, new BobColor(255, 0, 0, 255));
	p.setColor(2, new BobColor(0, 255, 0, 255));
	p.setColor(3, new BobColor(0, 0, 255, 255));

	const c1 = p.getColor(1);
	assertEqual(c1.r, 255, "Color 1 R = 255");
	assertEqual(c1.g, 0, "Color 1 G = 0");
	assertEqual(c1.b, 0, "Color 1 B = 0");

	const c2 = p.getColor(2);
	assertEqual(c2.g, 255, "Color 2 G = 255");

	const c0 = p.getColor(0);
	assertEqual(c0.a, 0, "Color 0 is transparent");
}

{
	const p = new Palette(16);
	p.setColor(5, new BobColor(128, 64, 32, 255));
	assert(p.getColorInt(5) !== 0, "Color 5 int is non-zero");
}

// ============================================================
// Tileset Tests
// ============================================================

console.log("\n🖼️ Tileset Tests");

{
	const ts = new Tileset(100);
	assertEqual(ts.numTiles, 100, "Tileset has 100 tiles");
	assertEqual(ts.tilePaletteIndex.length, 100 * 64, "Tileset buffer has 6400 entries");
}

{
	const ts = new Tileset(10);
	ts.setPixel(0, 0, 0, 5);
	ts.setPixel(0, 7, 7, 3);
	ts.setPixel(0, 3, 4, 1);

	assertEqual(ts.getPixel(0, 0, 0), 5, "Pixel (0,0) of tile 0 = 5");
	assertEqual(ts.getPixel(0, 7, 7), 3, "Pixel (7,7) of tile 0 = 3");
	assertEqual(ts.getPixel(0, 3, 4), 1, "Pixel (3,4) of tile 0 = 1");
	assertEqual(ts.getPixel(0, 1, 1), 0, "Unset pixel = 0");
}

{
	const ts = new Tileset(10);
	assert(ts.isTileBlank(0), "New tile is blank");

	ts.setPixel(0, 3, 3, 1);
	assert(!ts.isTileBlank(0), "Tile with pixel set is not blank");
}

{
	const ts = new Tileset(10);
	// isTileBlank with out-of-range reads from buffer (no crash = OK)
	assert(typeof ts.isTileBlank(999) === 'boolean', "Out-of-range tile returns boolean");
}

// ============================================================
// RGBA Generation Tests
// ============================================================

console.log("\n🌈 RGBA Generation Tests");

{
	const ts = new Tileset(10);
	const p = new Palette(16);
	p.setColor(1, new BobColor(255, 0, 0, 255));
	p.setColor(2, new BobColor(0, 255, 0, 255));

	// Set all pixels of tile 0 to color index 1
	for (let y = 0; y < 8; y++)
		for (let x = 0; x < 8; x++)
			ts.setPixel(0, x, y, 1);

	const rgba = ts.getTileRGBA(0, p);
	assertEqual(rgba.length, 8 * 8 * 4, "RGBA buffer is 256 bytes");

	// First pixel should be red (255, 0, 0, 255)
	assertEqual(rgba[0], 255, "R = 255");
	assertEqual(rgba[1], 0, "G = 0");
	assertEqual(rgba[2], 0, "B = 0");
	assertEqual(rgba[3], 255, "A = 255");
}

{
	const ts = new Tileset(10);
	const p = new Palette(16);
	// Color 0 is transparent by default

	// All pixels at color 0 should be transparent
	const rgba = ts.getTileRGBA(0, p);
	assertEqual(rgba[3], 0, "Color index 0 produces transparent pixel");
}

{
	const ts = new Tileset(10);
	const p = new Palette(16);
	p.setColor(1, new BobColor(100, 150, 200, 255));

	// Single pixel at (2, 3)
	ts.setPixel(0, 2, 3, 1);
	const rgba = ts.getTileRGBA(0, p);
	const offset = (3 * 8 + 2) * 4;

	assertEqual(rgba[offset], 100, "Custom pixel R");
	assertEqual(rgba[offset + 1], 150, "Custom pixel G");
	assertEqual(rgba[offset + 2], 200, "Custom pixel B");
	assertEqual(rgba[offset + 3], 255, "Custom pixel A");

	// Neighboring pixel should be transparent
	const neighborOffset = (3 * 8 + 1) * 4;
	assertEqual(rgba[neighborOffset + 3], 0, "Neighbor pixel transparent");
}

// ============================================================
// BobColor Tests
// ============================================================

console.log("\n🎨 BobColor Tests");

{
	const c = new BobColor(255, 128, 64, 255);
	assertEqual(c.r, 255, "BobColor r = 255");
	assertEqual(c.g, 128, "BobColor g = 128");
	assertEqual(c.b, 64, "BobColor b = 64");
	assertEqual(c.a, 255, "BobColor a = 255");
}

{
	const c = new BobColor(0xFF, 0x80, 0x40, 0xFF);
	// toInt returns signed 32-bit with alpha in high byte
	assert(c.toInt() !== 0, "toInt produces non-zero value");
}

// ============================================================
// Results
// ============================================================

console.log(`\n${"=".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) {
	console.error("❌ SOME TESTS FAILED");
	process.exit(1);
} else {
	console.log("✅ ALL TESTS PASSED");
}
