/**
 * Unit tests for input validation utilities.
 *
 * Run with: npx tsx src/__tests__/validation.test.ts
 */

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

function assertThrows(fn: () => void, message: string): void {
	try {
		fn();
		failed++; console.error(`  ❌ ${message} — expected throw`);
	} catch {
		passed++; console.log(`  ✅ ${message}`);
	}
}

// Import validation functions inline
import {
	validateString, validateNumber, validateInt,
	validateObject, validateArray,
	sanitizeHtml, validatePlayerName, validateRoomId,
	ValidationError,
} from "../shared/validation.js";

// ============================================================
// String Validation Tests
// ============================================================

console.log("\n🛡 String Validation Tests");

{
	assertEqual(validateString("hello", "test"), "hello", "Valid string passes");
	assertEqual(validateString("  trim  ", "test"), "trim", "String is trimmed by default");
	assertEqual(validateString("  keep  ", "test", { trim: false }), "  keep  ", "No trim when disabled");
	assertEqual(validateString("", "test", { allowEmpty: true }), "", "Empty allowed");

	assertThrows(() => validateString(123, "test"), "Number rejected as string");
	assertThrows(() => validateString(null, "test"), "Null rejected as string");
	assertThrows(() => validateString("", "test"), "Empty string rejected by default");
	assertThrows(() => validateString("ab", "test", { minLength: 3 }), "Too short rejected");
	assertThrows(() => validateString("abcde", "test", { maxLength: 3 }), "Too long rejected");
	assertThrows(() => validateString("abc123", "test", { pattern: /^[a-z]+$/ }), "Pattern mismatch rejected");
	assertEqual(validateString("hello", "test", { pattern: /^[a-z]+$/ }), "hello", "Pattern match passes");
}

// ============================================================
// Number Validation Tests
// ============================================================

console.log("\n🛡 Number Validation Tests");

{
	assertEqual(validateNumber(5, "test"), 5, "Valid number passes");
	assertEqual(validateNumber(0, "test"), 0, "Zero passes");
	assertEqual(validateNumber(-1, "test"), -1, "Negative passes");
	assertEqual(validateNumber(3.14, "test"), 3.14, "Float passes");

	assertThrows(() => validateNumber("5", "test"), "String rejected as number");
	assertThrows(() => validateNumber(NaN, "test"), "NaN rejected");
	assertThrows(() => validateNumber(Infinity, "test"), "Infinity rejected");

	assertEqual(validateInt(5, "test"), 5, "Valid integer passes");
	assertThrows(() => validateInt(3.14, "test"), "Float rejected as integer");

	assertThrows(() => validateNumber(0, "test", { positive: true }), "Zero rejected for positive");
	assertThrows(() => validateNumber(-1, "test", { positive: true }), "Negative rejected for positive");

	assertEqual(validateNumber(5, "test", { min: 1, max: 10 }), 5, "Within range passes");
	assertThrows(() => validateNumber(0, "test", { min: 1 }), "Below min rejected");
	assertThrows(() => validateNumber(11, "test", { max: 10 }), "Above max rejected");
}

// ============================================================
// Object Validation Tests
// ============================================================

console.log("\n🛡 Object Validation Tests");

{
	assertEqual(validateObject({ a: 1 }, "test"), { a: 1 }, "Valid object passes");
	assertThrows(() => validateObject(null, "test"), "Null rejected as object");
	assertThrows(() => validateObject([], "test"), "Array rejected as object");
	assertThrows(() => validateObject("str", "test"), "String rejected as object");

	assertEqual(
		validateObject({ name: "test", age: 5 }, "test", { required: ["name"] }),
		{ name: "test", age: 5 },
		"Object with required field passes",
	);
	assertThrows(() => validateObject({ age: 5 }, "test", { required: ["name"] }), "Missing required rejected");
	assertThrows(
		() => validateObject({ name: "test", extra: true }, "test", { required: ["name"], optional: ["age"] }),
		"Unexpected field rejected",
	);
}

// ============================================================
// Array Validation Tests
// ============================================================

console.log("\n🛡 Array Validation Tests");

{
	assertEqual(validateArray([1, 2, 3], "test"), [1, 2, 3], "Valid array passes");
	assertThrows(() => validateArray("str", "test"), "String rejected as array");
	assertThrows(() => validateArray({}, "test"), "Object rejected as array");

	assertEqual(validateArray([1], "test", { minLength: 1 }), [1], "Array meets minLength");
	assertThrows(() => validateArray([], "test", { minLength: 1 }), "Empty array rejected for minLength");
	assertThrows(() => validateArray([1, 2, 3, 4], "test", { maxLength: 2 }), "Long array rejected for maxLength");
}

// ============================================================
// Sanitization Tests
// ============================================================

console.log("\n🛡 HTML Sanitization Tests");

{
	assertEqual(sanitizeHtml("<script>alert('xss')</script>"), "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;", "HTML tags sanitized");
	assertEqual(sanitizeHtml('a"b'), "a&quot;b", "Quotes sanitized");
	assertEqual(sanitizeHtml("hello world"), "hello world", "Clean text unchanged");
}

// ============================================================
// Player Name Validation Tests
// ============================================================

console.log("\n🛡 Player Name Validation Tests");

{
	assertEqual(validatePlayerName("Alice"), "Alice", "Valid name passes");
	assertEqual(validatePlayerName("Bob_123"), "Bob_123", "Name with underscore and numbers");
	assertEqual(validatePlayerName("  trim  "), "trim", "Name trimmed");

	assertThrows(() => validatePlayerName(""), "Empty name rejected");
	assertThrows(() => validatePlayerName("A".repeat(33)), "33-char name rejected");
	assertThrows(() => validatePlayerName("<script>"), "HTML in name rejected");
	assertThrows(() => validatePlayerName("name@host"), "Special chars in name rejected");
}

// ============================================================
// Room ID Validation Tests
// ============================================================

console.log("\n🛡 Room ID Validation Tests");

{
	assertEqual(validateRoomId("abc123"), "abc123", "Valid room ID");
	assertEqual(validateRoomId("room-456"), "room-456", "Room ID with hyphens");

	assertThrows(() => validateRoomId(""), "Empty room ID rejected");
	assertThrows(() => validateRoomId("room 123"), "Space in room ID rejected");
	assertThrows(() => validateRoomId("room_123"), "Underscore in room ID rejected");
}

// ============================================================
// ValidationError Structure Tests
// ============================================================

console.log("\n🛡 ValidationError Structure Tests");

{
	try {
		validateString(123, "myField");
	} catch (e: any) {
		assert(e instanceof ValidationError, "Is ValidationError instance");
		assertEqual(e.field, "myField", "Error has field name");
		assertEqual(e.rule, "type", "Error has rule");
		assertEqual(e.name, "ValidationError", "Error name is ValidationError");
	}
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
