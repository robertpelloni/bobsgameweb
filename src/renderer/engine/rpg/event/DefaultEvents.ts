/**
 * DefaultEvents — registers a starter set of RPG events for the game world.
 *
 * These events are loaded on game start and provide the foundation for
 * the event-driven RPG gameplay: map enter greetings, NPC dialogues,
 * item pickups, area transitions, and tutorial sequences.
 */
import { EventManager } from "./EventManager";
import { BobEvent, EventTrigger } from "./BobEvent";
import { EventCommand, EventCommandType } from "./EventCommand";
import { EventParameter, EventParameterType } from "./EventParameter";

export class DefaultEvents {
	/**
	 * Register all default events into the given EventManager.
	 * Called once during ClientGameEngine initialization.
	 */
	static register(engine: EventManager): void {
		// ---- Tutorial flag ----
		engine.setFlag(1, false); // tutorial_complete
		engine.setFlag(2, false); // talked_to_innkeeper
		engine.setFlag(3, false); // visited_market

		// ---- Event 100: Town Welcome (fires on map enter) ----
		const welcome = new BobEvent(100, "Town Welcome", EventTrigger.ENTER_AREA);
		welcome.commands = [
			new EventCommand("SHOW_MESSAGE", [
				new EventParameter(EventParameterType.STRING, "Welcome to TOWNYUU!"),
			], EventCommandType.COMMAND),
			new EventCommand("SET_FLAG", [
				new EventParameter(EventParameterType.NUMBER, 1),
				new EventParameter(EventParameterType.NUMBER, 1),
			], EventCommandType.COMMAND),
		];
		engine.registerEvent(welcome);

		// ---- Event 101: Innkeeper Dialogue (fires on NPC talk) ----
		const innkeeper = new BobEvent(101, "Innkeeper Greeting", EventTrigger.TALK);
		innkeeper.commands = [
			new EventCommand(
				"IF_NOT_FLAG",
				[new EventParameter(EventParameterType.NUMBER, 2)],
				EventCommandType.QUALIFIER_TRUE,
			),
		];
		// First talk — give intro quest
		const firstTalk = new EventCommand(
			"SHOW_MESSAGE",
			[
				new EventParameter(
					EventParameterType.STRING,
					"Traveler! You look weary. Rest here at the inn.",
				),
			],
			EventCommandType.COMMAND,
		);
		innkeeper.commands[0]?.addChild(firstTalk);
		innkeeper.commands[0]?.addChild(
			new EventCommand("SET_FLAG", [
				new EventParameter(EventParameterType.NUMBER, 2),
				new EventParameter(EventParameterType.NUMBER, 1),
			], EventCommandType.COMMAND),
		);
		engine.registerEvent(innkeeper);

		// ---- Event 102: Market Visit (fires on area enter) ----
		const market = new BobEvent(102, "Market Visit", EventTrigger.ENTER_AREA);
		market.commands = [
			new EventCommand(
				"IF_NOT_FLAG",
				[new EventParameter(EventParameterType.NUMBER, 3)],
				EventCommandType.QUALIFIER_TRUE,
			),
		];
		market.commands[0]?.addChild(
			new EventCommand("SHOW_MESSAGE", [
				new EventParameter(
					EventParameterType.STRING,
					"The bustling market of TOWNYUU! Vendors hawk their wares.",
				),
			], EventCommandType.COMMAND),
		);
		market.commands[0]?.addChild(
			new EventCommand("SET_FLAG", [
				new EventParameter(EventParameterType.NUMBER, 3),
				new EventParameter(EventParameterType.NUMBER, 1),
			], EventCommandType.COMMAND),
		);
		engine.registerEvent(market);

		// ---- Event 200: Bridge Crossing (fires on touch) ----
		const bridge = new BobEvent(200, "Bridge Crossing", EventTrigger.TOUCH);
		bridge.commands = [
			new EventCommand(
				"IF_NOT_FLAG",
				[new EventParameter(EventParameterType.NUMBER, 10)],
				EventCommandType.QUALIFIER_TRUE,
			),
		];
		bridge.commands[0]?.addChild(
			new EventCommand("SHOW_MESSAGE", [
				new EventParameter(
					EventParameterType.STRING,
					"You cross the old wooden bridge over the river...",
				),
			], EventCommandType.COMMAND),
		);
		bridge.commands[0]?.addChild(
			new EventCommand("SET_FLAG", [
				new EventParameter(EventParameterType.NUMBER, 10),
				new EventParameter(EventParameterType.NUMBER, 1),
			], EventCommandType.COMMAND),
		);
		engine.registerEvent(bridge);

		// ---- Event 300: Auto-event — Tutorial Check ----
		const tutorial = new BobEvent(300, "Tutorial Auto-Check", EventTrigger.AUTO);
		tutorial.commands = [
			new EventCommand(
				"IF_NOT_FLAG",
				[new EventParameter(EventParameterType.NUMBER, 1)],
				EventCommandType.QUALIFIER_TRUE,
			),
		];
		tutorial.commands[0]?.addChild(
			new EventCommand("SHOW_MESSAGE", [
				new EventParameter(
					EventParameterType.STRING,
					"Use WASD/Arrow keys to move. Press E/Space to interact.",
				),
			], EventCommandType.COMMAND),
		);
		engine.registerEvent(tutorial);

		// ---- Event 400: Champion Flag (set when all flags are true) ----
		const champion = new BobEvent(400, "All-Around Explorer", EventTrigger.FLAG_CHANGE);
		champion.commands = [
			new EventCommand(
				"IF_FLAG",
				[
					new EventParameter(EventParameterType.NUMBER, 1),
					new EventParameter(EventParameterType.NUMBER, 2),
					new EventParameter(EventParameterType.NUMBER, 3),
				],
				EventCommandType.QUALIFIER_TRUE,
			),
		];
		champion.commands[0]?.addChild(
			new EventCommand("SHOW_MESSAGE", [
				new EventParameter(
					EventParameterType.STRING,
					"🏆 Achievement: All-Around Explorer! You've seen everything in TOWNYUU.",
				),
			], EventCommandType.COMMAND),
		);
		engine.registerEvent(champion);

		// ---- Skills ----
		engine.setSkill(1, 0); // exploration_level
		engine.setSkill(2, 0); // battles_won
		engine.setSkill(3, 0); // puzzles_solved

		// ---- Dialogues ----
		engine.setDialogueDone(1, false); // innkeeper_intro
		engine.setDialogueDone(2, false); // shopkeeper_intro
		engine.setDialogueDone(3, false); // bridge_story

		// ---- Game Strings ----
		engine.getOrCreateString(1, "town_name", "TOWNYUU");
		engine.getOrCreateString(2, "inn_name", "The Restful Traveler");
		engine.getOrCreateString(3, "shop_name", "Wandering Wares");
	}
}
