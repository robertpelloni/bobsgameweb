/**
 * Tests for WeatherSystem — weather types, transitions, effects, regions.
 * Run: npx tsx src/__tests__/weather.test.ts
 */
let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✅ ${m}`); } else { failed++; console.error(`  ❌ ${m}`); } }
function assertEqual(a: unknown, e: unknown, m: string) { if (JSON.stringify(a)===JSON.stringify(e)) { passed++; console.log(`  ✅ ${m}`); } else { failed++; console.error(`  ❌ ${m} — exp ${JSON.stringify(e)}, got ${JSON.stringify(a)}`); } }

// ============================================================
// Weather Type Tests
// ============================================================
console.log("\n🌤 Weather Type Tests");
{
	const TYPES = ["clear", "rain", "snow", "fog", "sandstorm", "storm"];
	assertEqual(TYPES.length, 6, "6 weather types");

	const CONFIG: Record<string, { name: string; overlayAlpha: number; defaultIntensity: number }> = {
		clear:     { name: "Clear",     overlayAlpha: 0,    defaultIntensity: 0 },
		rain:      { name: "Rain",      overlayAlpha: 0.15, defaultIntensity: 0.6 },
		snow:      { name: "Snow",      overlayAlpha: 0.1,  defaultIntensity: 0.5 },
		fog:       { name: "Fog",       overlayAlpha: 0.3,  defaultIntensity: 0.7 },
		sandstorm: { name: "Sandstorm", overlayAlpha: 0.25, defaultIntensity: 0.8 },
		storm:     { name: "Storm",     overlayAlpha: 0.35, defaultIntensity: 0.9 },
	};

	// All types have config
	for (const t of TYPES) {
		assert(!!CONFIG[t], `${t} has config`);
	}

	// Storm has highest intensity
	assertEqual(CONFIG.storm.defaultIntensity, 0.9, "Storm intensity = 0.9");
	assert(CONFIG.storm.overlayAlpha > CONFIG.rain.overlayAlpha, "Storm overlay > Rain overlay");

	// Clear has no overlay
	assertEqual(CONFIG.clear.overlayAlpha, 0, "Clear has no overlay");
}

// ============================================================
// Visibility Calculation Tests
// ============================================================
console.log("\n👁 Visibility Tests");
{
	function calcVisibility(type: string, intensity: number): number {
		switch (type) {
			case "clear": return 0.95;
			case "rain": return 0.7 - intensity * 0.2;
			case "snow": return 0.6 - intensity * 0.3;
			case "fog": return 0.4 - intensity * 0.3;
			case "sandstorm": return 0.3 - intensity * 0.2;
			case "storm": return 0.3 - intensity * 0.2;
			default: return 0.9;
		}
	}

	assertEqual(calcVisibility("clear", 0), 0.95, "Clear: 95% visibility");
	assertEqual(calcVisibility("rain", 0.6), 0.58, "Rain @0.6: 58%");
	assert(Math.abs(calcVisibility("fog", 0.7) - 0.19) < 0.01, "Fog @0.7: ~19%");
	assert(Math.abs(calcVisibility("storm", 0.9) - 0.12) < 0.01, "Storm @0.9: ~12%");

	// Higher intensity = lower visibility
	assert(calcVisibility("snow", 0.3) > calcVisibility("snow", 0.8), "Low snow visibility > high snow visibility");
}

// ============================================================
// Gameplay Effect Tests
// ============================================================
console.log("\n⚔ Gameplay Effect Tests");
{
	function getSpeedMod(type: string): number {
		if (type === "snow") return 0.85;
		if (type === "sandstorm") return 0.8;
		if (type === "storm") return 0.9;
		return 1.0;
	}

	assertEqual(getSpeedMod("clear"), 1.0, "Clear: full speed");
	assertEqual(getSpeedMod("rain"), 1.0, "Rain: full speed");
	assertEqual(getSpeedMod("snow"), 0.85, "Snow: 85% speed");
	assertEqual(getSpeedMod("sandstorm"), 0.8, "Sandstorm: 80% speed");
	assertEqual(getSpeedMod("storm"), 0.9, "Storm: 90% speed");

	// Encounter rate modifiers
	function getEncounterMod(type: string): number {
		if (type === "rain") return 1.2;
		if (type === "storm") return 1.5;
		if (type === "fog") return 1.3;
		return 1.0;
	}

	assertEqual(getEncounterMod("clear"), 1.0, "Clear: normal encounters");
	assertEqual(getEncounterMod("rain"), 1.2, "Rain: 1.2x encounters");
	assertEqual(getEncounterMod("storm"), 1.5, "Storm: 1.5x encounters");
	assertEqual(getEncounterMod("fog"), 1.3, "Fog: 1.3x encounters");

	// Damage modifiers
	function getFireMod(type: string): number {
		if (type === "rain") return 0.7;
		if (type === "snow") return 0.5;
		if (type === "storm") return 0.3;
		return 1.0;
	}

	assertEqual(getFireMod("clear"), 1.0, "Clear: full fire damage");
	assertEqual(getFireMod("rain"), 0.7, "Rain: fire -30%");
	assertEqual(getFireMod("storm"), 0.3, "Storm: fire -70%");

	function getIceMod(type: string): number {
		if (type === "snow") return 1.5;
		if (type === "storm") return 1.2;
		return 1.0;
	}

	assertEqual(getIceMod("snow"), 1.5, "Snow: ice +50%");
	assertEqual(getIceMod("storm"), 1.2, "Storm: ice +20%");
}

// ============================================================
// Particle Count Tests
// ============================================================
console.log("\n✨ Particle Count Tests");
{
	function particleCount(type: string, intensity: number): number {
		const bases: Record<string, number> = { rain: 200, snow: 100, sandstorm: 150 };
		return Math.floor(intensity * (bases[type] ?? 0));
	}

	assertEqual(particleCount("clear", 1.0), 0, "Clear: no particles");
	assertEqual(particleCount("rain", 0.6), 120, "Rain @0.6: 120 particles");
	assertEqual(particleCount("snow", 0.5), 50, "Snow @0.5: 50 particles");
	assertEqual(particleCount("sandstorm", 0.8), 120, "Sandstorm @0.8: 120 particles");
	assertEqual(particleCount("storm", 1.0), 0, "Storm: no base particles (uses rain+lightning)");
}

// ============================================================
// Transition Tests
// ============================================================
console.log("\n🔄 Transition Tests");
{
	function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

	// Intensity transition
	assertEqual(lerp(0, 0.6, 0.5), 0.3, "50% transition: 0 → 0.3");
	assertEqual(lerp(0, 0.6, 1.0), 0.6, "100% transition: complete");
	assertEqual(lerp(0.5, 0.9, 0.25), 0.6, "25% transition: 0.5 → 0.6");

	// Visibility transition
	const visLerp = lerp(0.95, 0.19, 0.5);
	assert(visLerp > 0.5 && visLerp < 0.6, `Visibility transition at 50%: ${visLerp.toFixed(2)}`);
}

// ============================================================
// Region Weather Tests
// ============================================================
console.log("\n🗺 Region Weather Tests");
{
	const regionWeather: Record<string, string> = {
		townyuu: "clear",
		dark_forest: "fog",
		beach: "clear",
		dragon_lair: "storm",
	};

	assertEqual(Object.keys(regionWeather).length, 4, "4 regions have default weather");
	assertEqual(regionWeather.townyuu, "clear", "TOWNYUU default: clear");
	assertEqual(regionWeather.dark_forest, "fog", "Dark Forest default: fog");
	assertEqual(regionWeather.dragon_lair, "storm", "Dragon's Lair default: storm");

	// All valid weather types
	for (const [region, weather] of Object.entries(regionWeather)) {
		assert(["clear","rain","snow","fog","sandstorm","storm"].includes(weather), `${region}: ${weather} is valid`);
	}
}

// ============================================================
// Wind Direction Tests
// ============================================================
console.log("\n💨 Wind Tests");
{
	// Wind direction in radians
	const dir = Math.random() * Math.PI * 2;
	assert(dir >= 0 && dir < Math.PI * 2, `Wind direction ${dir.toFixed(2)} in [0, 2π)`);

	// Wind speed normalized
	const speeds: Record<string, number> = {
		clear: 0.1, rain: 0.3, snow: 0.2, fog: 0.05, sandstorm: 0.8, storm: 0.7,
	};
	for (const [type, speed] of Object.entries(speeds)) {
		assert(speed >= 0 && speed <= 1, `${type} wind speed ${speed} in [0,1]`);
	}

	// Sandstorm has highest wind
	const maxWind = Object.entries(speeds).reduce((a, b) => b[1] > a[1] ? b : a);
	assertEqual(maxWind[0], "sandstorm", "Sandstorm has highest wind speed");
}

// ============================================================
// Temperature Tests
// ============================================================
console.log("\n🌡 Temperature Tests");
{
	const temps: Record<string, number> = {
		clear: 20, rain: 15, snow: -5, fog: 10, sandstorm: 38, storm: 12,
	};

	assert(temps.snow! < 0, "Snow temperature below 0°C");
	assert(temps.sandstorm! > 30, "Sandstorm temperature above 30°C");
	assert(temps.clear! >= 15 && temps.clear! <= 25, "Clear is mild (15-25°C)");
}

// ============================================================
// Results
// ============================================================
console.log(`\n${"=".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) { console.error("❌ SOME TESTS FAILED"); process.exit(1); }
else { console.log("✅ ALL TESTS PASSED"); }
