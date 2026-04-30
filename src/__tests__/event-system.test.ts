/**
 * Unit tests for the Event system — EventScript parsing, EventCommand, EventManager.
 *
 * Run with: npx tsx src/__tests__/event-system.test.ts
 */
import { EventCommand, EventCommandType } from "../renderer/engine/rpg/event/EventCommand";
import { EventParameter, EventParameterType } from "../renderer/engine/rpg/event/EventParameter";
import { EventManager } from "../renderer/engine/rpg/event/EventManager";
import { BobEvent, EventTrigger } from "../renderer/engine/rpg/event/BobEvent";

// ============================================================
// Test framework
// ============================================================

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
	if (condition) {
		passed++;
		console.log(`  ✅ ${message}`);
	} else {
		failed++;
		console.error(`  ❌ ${message}`);
	}
}

function assertEqual(actual: unknown, expected: unknown, message: string): void {
	if (JSON.stringify(actual) === JSON.stringify(expected)) {
		passed++;
		console.log(`  ✅ ${message}`);
	} else {
		failed++;
		console.error(`  ❌ ${message} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
	}
}

// ============================================================
// EventParameter Tests
// ============================================================

console.log("\n📦 EventParameter Tests");

{
	const p = new EventParameter(EventParameterType.NUMBER, 42);
	assert(p.asNumber() === 42, "Number parameter returns correct value");
	assertEqual(p.type, EventParameterType.NUMBER, "Number parameter has NUMBER type");
}

{
	const p = new EventParameter(EventParameterType.STRING, "Hello World");
	assertEqual(p.asString(), "Hello World", "String parameter returns correct value");
	assertEqual(p.type, EventParameterType.STRING, "String parameter has STRING type");
}

{
	const p = new EventParameter(EventParameterType.NUMBER, 0);
	assert(p.asNumber() === 0, "Zero value parameter works");
}

// ============================================================
// EventCommand Tests
// ============================================================

console.log("\n📦 EventCommand Tests");

{
	const cmd = EventCommand.parse("SHOW_MESSAGE:Hello World");
	assertEqual(cmd.commandString, "SHOW_MESSAGE", "Parsed command string");
	assertEqual(cmd.parameters.length, 1, "Has 1 parameter");
	assertEqual(cmd.parameters[0]?.value, "Hello World", "Parameter value is correct string");
}

{
	const cmd = EventCommand.parse("SET_FLAG:1:0");
	assertEqual(cmd.commandString, "SET_FLAG", "Parsed SET_FLAG command");
	assertEqual(cmd.parameters.length, 2, "SET_FLAG has 2 parameters");
	assertEqual(cmd.parameters[0]?.asNumber(), 1, "First param is 1");
	assertEqual(cmd.parameters[1]?.asNumber(), 0, "Second param is 0");
}

{
	const cmd = EventCommand.parse("IF_FLAG:5");
	assertEqual(cmd.type, EventCommandType.COMMAND, "IF_FLAG is COMMAND type (not qualifier)");
}

{
	const cmd = new EventCommand("TEST", [], EventCommandType.COMMAND);
	const child = new EventCommand("CHILD", [], EventCommandType.COMMAND);
	cmd.addChild(child);
	assertEqual(cmd.children.length, 1, "Child added");
	assertEqual(cmd.children[0]?.commandString, "CHILD", "Child has correct command string");
	assertEqual(child.parent, cmd, "Child has parent reference");
}

{
	const cmd = new EventCommand("TEST", [], EventCommandType.COMMAND);
	const child1 = new EventCommand("C1", [], EventCommandType.COMMAND);
	const child2 = new EventCommand("C2", [], EventCommandType.COMMAND);
	cmd.addChild(child1);
	cmd.addChild(child2);
	assertEqual(cmd.getNextChild()?.commandString, "C1", "First child retrieved");
	assertEqual(cmd.getNextChild()?.commandString, "C2", "Second child retrieved");
	assertEqual(cmd.getNextChild(), null, "No more children");
	cmd.reset();
	assertEqual(cmd.getNextChild()?.commandString, "C1", "After reset, first child again");
}

// ============================================================
// EventManager Tests
// ============================================================

console.log("\n📦 EventManager Tests");

{
	const em = new EventManager();
	assertEqual(em.flags.size, 0, "New EventManager has no flags");
	assertEqual(em.skills.size, 0, "New EventManager has no skills");
	assertEqual(em.events.size, 0, "New EventManager has no events");
}

{
	const em = new EventManager();
	em.setFlag(1, true);
	assert(em.checkFlag(1), "Flag 1 is set to true");
	em.setFlag(1, false);
	assert(!em.checkFlag(1), "Flag 1 is set to false");
	assert(!em.checkFlag(999), "Non-existent flag returns false");
}

{
	const em = new EventManager();
	em.setSkill(1, 50);
	assertEqual(em.getSkillValue(1), 50, "Skill 1 has value 50");
	assertEqual(em.getSkillValue(999), 0, "Non-existent skill returns 0");
	em.setSkill(1, 100);
	assertEqual(em.getSkillValue(1), 100, "Skill 1 updated to 100");
}

{
	const em = new EventManager();
	em.setDialogueDone(1, true);
	assert(em.isDialogueDone(1), "Dialogue 1 is done");
	assert(!em.isDialogueDone(999), "Non-existent dialogue returns false");
}

{
	const em = new EventManager();
	em.getOrCreateString(1, "town_name", "TOWNYUU");
	assertEqual(em.getString(1), "TOWNYUU", "String 1 has correct value");
	assertEqual(em.getString(999), "", "Non-existent string returns empty");
}

// ============================================================
// EventManager Event Registration & Triggering
// ============================================================

console.log("\n📦 EventManager Trigger Tests");

{
	const em = new EventManager();
	const evt = new BobEvent(100, "Test Event", EventTrigger.TALK);
	evt.commands = [
		new EventCommand("SET_FLAG", [
			new EventParameter(EventParameterType.NUMBER, 10),
			new EventParameter(EventParameterType.NUMBER, 1),
		], EventCommandType.COMMAND),
	];
	em.registerEvent(evt);
	assertEqual(em.events.size, 1, "Event registered");

	em.triggerEvents(EventTrigger.TALK);
	em.update();
	assert(em.checkFlag(10), "Flag 10 set by event command");
}

{
	const em = new EventManager();
	let messageReceived = "";
	em.setShowMessageCallback((text: string) => { messageReceived = text; });

	const evt = new BobEvent(200, "Message Event", EventTrigger.ENTER_AREA);
	evt.commands = [
		new EventCommand("SHOW_MESSAGE", [
			new EventParameter(EventParameterType.STRING, "Welcome!"),
		], EventCommandType.COMMAND),
	];
	em.registerEvent(evt);
	em.triggerEvents(EventTrigger.ENTER_AREA);
	em.update();
	assertEqual(messageReceived, "Welcome!", "Message callback received correct text");
}

{
	const em = new EventManager();
	// Trigger AUTO event
	const autoEvt = new BobEvent(300, "Auto Event", EventTrigger.AUTO);
	autoEvt.commands = [
		new EventCommand("SET_FLAG", [
			new EventParameter(EventParameterType.NUMBER, 20),
			new EventParameter(EventParameterType.NUMBER, 1),
		], EventCommandType.COMMAND),
	];
	em.registerEvent(autoEvt);
	em.triggerEvents(EventTrigger.AUTO);
	em.update();
	assert(em.checkFlag(20), "AUTO trigger fires event");
}

// ============================================================
// Serialization Tests
// ============================================================

console.log("\n📦 Serialization Tests");

{
	const em = new EventManager();
	em.setFlag(1, true);
	em.setFlag(2, false);
	em.setSkill(1, 75);
	em.setDialogueDone(1, true);
	em.getOrCreateString(1, "name", "Test");

	const data = em.getSaveData();
	const em2 = new EventManager();
	em2.loadFromSave(data);

	assert(em2.checkFlag(1), "Flag 1 restored");
	assert(!em2.checkFlag(2), "Flag 2 restored as false");
	assertEqual(em2.getSkillValue(1), 75, "Skill 1 restored");
	assert(em2.isDialogueDone(1), "Dialogue 1 restored");
	assertEqual(em2.getString(1), "Test", "String 1 restored");
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
