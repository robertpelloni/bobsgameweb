/**
 * BranchingDialogueSystem — tree-based dialogue with choices, conditions, and effects.
 *
 * Features:
 * - Node-based dialogue tree (each node has text + optional choices)
 * - Conditional branches (check flags, items, stats)
 * - Choice effects (set flags, give items, change stats)
 * - NPC personality/mood tracking
 * - Quest-giving from dialogue
 * - Reusable dialogue trees (templates)
 *
 * Usage:
 *   const tree = DialogueTree.fromJSON(data);
 *   const engine = new BranchingDialogueSystem(tree);
 *   engine.start();
 *   engine.selectChoice(0);
 */
export interface DialogueChoice {
	text: string;
	condition?: {
		type: "flag" | "item" | "stat" | "quest";
		key: string;
		operator?: "==" | "!=" | ">=" | "<=";
		value?: string | number;
	};
	effect?: {
		type: "set_flag" | "give_item" | "change_stat" | "start_quest" | "change_mood";
		key: string;
		value?: string | number;
	};
	nextNode?: string; // ID of next dialogue node (or undefined = end)
}

export interface DialogueNode {
	id: string;
	speaker: string;
	text: string;
	choices?: DialogueChoice[];
	nextNode?: string; // Auto-advance to this node (no choice)
	effect?: {
		type: string;
		key: string;
		value?: string | number;
	};
	portrait?: string; // Portrait identifier
	mood?: "neutral" | "happy" | "sad" | "angry" | "surprised";
}

export interface DialogueTree {
	id: string;
	nodes: Map<string, DialogueNode>;
	startNode: string;
}

export interface DialogueState {
	currentNodeId: string;
	history: string[];
	mood: number; // -100 to 100
	flags: Set<string>;
}

export class BranchingDialogueSystem {
	private tree: DialogueTree;
	private state: DialogueState;
	private nodeMap: Map<string, DialogueNode>;

	// Callbacks
	private onText?: (speaker: string, text: string, choices?: DialogueChoice[]) => void;
	private onEnd?: () => void;
	private onEffect?: (effect: { type: string; key: string; value?: string | number }) => void;

	constructor(tree: DialogueTree) {
		this.tree = tree;
		this.nodeMap = tree.nodes;
		this.state = {
			currentNodeId: tree.startNode,
			history: [],
			mood: 0,
			flags: new Set(),
		};
	}

	/** Set callbacks */
	setCallbacks(
		onText: (speaker: string, text: string, choices?: DialogueChoice[]) => void,
		onEnd: () => void,
		onEffect?: (effect: { type: string; key: string; value?: string | number }) => void,
	): void {
		this.onText = onText;
		this.onEnd = onEnd;
		this.onEffect = onEffect;
	}

	/** Start the dialogue from the beginning */
	start(): void {
		this.state = {
			currentNodeId: this.tree.startNode,
			history: [],
			mood: 0,
			flags: new Set(),
		};
		this.showCurrent();
	}

	/** Get current node */
	getCurrentNode(): DialogueNode | null {
		return this.nodeMap.get(this.state.currentNodeId) ?? null;
	}

	/** Get available choices (filtered by conditions) */
	getAvailableChoices(): DialogueChoice[] {
		const node = this.getCurrentNode();
		if (!node?.choices) return [];

		return node.choices.filter(choice => {
			if (!choice.condition) return true;
			return this.checkCondition(choice.condition);
		});
	}

	/** Select a choice by index */
	selectChoice(index: number): void {
		const choices = this.getAvailableChoices();
		if (index < 0 || index >= choices.length) return;

		const choice = choices[index]!;

		// Record in history
		this.state.history.push(this.state.currentNodeId);

		// Apply choice effect
		if (choice.effect) {
			this.applyEffect(choice.effect);
		}

		// Advance to next node
		if (choice.nextNode) {
			this.state.currentNodeId = choice.nextNode;
			this.showCurrent();
		} else {
			this.end();
		}
	}

	/** Advance without choice (auto-advance nodes) */
	advance(): void {
		const node = this.getCurrentNode();
		if (!node) { this.end(); return; }

		this.state.history.push(this.state.currentNodeId);

		// Apply node effect
		if (node.effect) {
			this.applyEffect(node.effect);
		}

		if (node.nextNode) {
			this.state.currentNodeId = node.nextNode;
			this.showCurrent();
		} else if (!node.choices?.length) {
			this.end();
		}
	}

	/** Go back to previous node */
	goBack(): void {
		if (this.state.history.length === 0) return;
		const prev = this.state.history.pop()!;
		this.state.currentNodeId = prev;
		this.showCurrent();
	}

	/** Get dialogue state */
	getState(): DialogueState {
		return this.state;
	}

	/** Set a flag */
	setFlag(flag: string): void {
		this.state.flags.add(flag);
	}

	/** Check a flag */
	hasFlag(flag: string): boolean {
		return this.state.flags.has(flag);
	}

	/** Get mood (-100 to 100) */
	getMood(): number {
		return this.state.mood;
	}

	private showCurrent(): void {
		const node = this.getCurrentNode();
		if (!node) { this.end(); return; }

		if (this.onText) {
			this.onText(node.speaker, node.text, node.choices);
		}
	}

	private end(): void {
		if (this.onEnd) this.onEnd();
	}

	private checkCondition(condition: DialogueChoice["condition"]): boolean {
		if (!condition) return true;

		switch (condition.type) {
			case "flag":
				const hasFlag = this.state.flags.has(condition.key);
				if (condition.operator === "!=") return !hasFlag;
				return hasFlag;
			case "stat":
				// Would check player stats — simplified
				return true;
			case "item":
				// Would check inventory — simplified
				return true;
			case "quest":
				// Would check quest status — simplified
				return true;
			default:
				return true;
		}
	}

	private applyEffect(effect: DialogueChoice["effect"]): void {
		if (!effect) return;

		switch (effect.type) {
			case "set_flag":
				if (effect.key) this.state.flags.add(effect.key);
				break;
			case "change_mood":
				this.state.mood = Math.max(-100, Math.min(100, this.state.mood + Number(effect.value ?? 0)));
				break;
			case "give_item":
			case "change_stat":
			case "start_quest":
				break;
		}

		if (this.onEffect) this.onEffect(effect);
	}

	/** Build a dialogue tree from a simple JSON structure */
	static fromJSON(data: {
		id: string;
		startNode: string;
		nodes: DialogueNode[];
	}): DialogueTree {
		const nodes = new Map<string, DialogueNode>();
		for (const node of data.nodes) {
			nodes.set(node.id, node);
		}
		return { id: data.id, nodes, startNode: data.startNode };
	}
}

// ============================================================
// Pre-built dialogue trees
// ============================================================

export const SHOPKEEPER_DIALOGUE = BranchingDialogueSystem.fromJSON({
	id: "shopkeep_basic",
	startNode: "greeting",
	nodes: [
		{
			id: "greeting",
			speaker: "Shopkeep",
			text: "Welcome to my shop! What can I do for you?",
			choices: [
				{ text: "What do you sell?", nextNode: "wares" },
				{ text: "Tell me about the town.", nextNode: "town_info" },
				{ text: "Nothing, thanks.", nextNode: "goodbye" },
			],
		},
		{
			id: "wares",
			speaker: "Shopkeep",
			text: "I sell weapons, armor, potions, and traveling supplies. Best prices in TOWNYUU!",
			mood: "happy",
			choices: [
				{ text: "I'll take a look.", nextNode: "browse" },
				{ text: "Any special deals?", nextNode: "deals", condition: { type: "flag", key: "met_shopkeep" } },
				{ text: "Maybe later.", nextNode: "goodbye" },
			],
		},
		{
			id: "deals",
			speaker: "Shopkeep",
			text: "For a regular customer like you, I can offer 20% off potions! Come back anytime.",
			mood: "happy",
			effect: { type: "set_flag", key: "shop_discount" },
			choices: [
				{ text: "Thanks!", nextNode: "goodbye" },
			],
		},
		{
			id: "town_info",
			speaker: "Shopkeep",
			text: "TOWNYUU is a peaceful place. But lately, strange creatures have been appearing in the forest to the east. Be careful if you go there.",
			mood: "neutral",
			choices: [
				{ text: "I can handle it.", nextNode: "brave" },
				{ text: "Thanks for the warning.", nextNode: "goodbye" },
			],
		},
		{
			id: "brave",
			speaker: "Shopkeep",
			text: "Ha! I like your spirit. Take this health potion, on the house. You'll need it.",
			mood: "happy",
			effect: { type: "give_item", key: "health_potion" },
			choices: [
				{ text: "Thank you!", nextNode: "goodbye" },
			],
		},
		{
			id: "browse",
			speaker: "Shopkeep",
			text: "Take your time! Let me know when you're ready.",
			effect: { type: "set_flag", key: "met_shopkeep" },
			nextNode: "goodbye",
		},
		{
			id: "goodbye",
			speaker: "Shopkeep",
			text: "Come again! Safe travels, adventurer.",
			mood: "happy",
		},
	],
});

export const MAYOR_DIALOGUE = BranchingDialogueSystem.fromJSON({
	id: "mayor_intro",
	startNode: "welcome",
	nodes: [
		{
			id: "welcome",
			speaker: "Mayor",
			text: "Ah, a new face! Welcome to TOWNYUU. I'm the mayor. We don't get many visitors these days...",
			mood: "neutral",
			choices: [
				{ text: "Why is that?", nextNode: "danger" },
				{ text: "I'm just passing through.", nextNode: "passing" },
				{ text: "I heard you need help.", nextNode: "quest", condition: { type: "flag", key: "heard_rumor" } },
			],
		},
		{
			id: "danger",
			speaker: "Mayor",
			text: "The forest to the east has become dangerous. Strange creatures... some say a dragon has awakened in the mountains. Our adventurers are too afraid to investigate.",
			mood: "sad",
			choices: [
				{ text: "I could help.", nextNode: "quest" },
				{ text: "That sounds dangerous.", nextNode: "warning" },
			],
		},
		{
			id: "passing",
			speaker: "Mayor",
			text: "Well, if you change your mind, we could use a brave soul. Talk to me anytime.",
			mood: "neutral",
		},
		{
			id: "warning",
			speaker: "Mayor",
			text: "It is. But if someone doesn't act soon, the whole town could be in danger. Please, reconsider.",
			mood: "sad",
			choices: [
				{ text: "Alright, I'll help.", nextNode: "quest" },
				{ text: "I need to think about it.", nextNode: "passing" },
			],
		},
		{
			id: "quest",
			speaker: "Mayor",
			text: "You will?! Wonderful! First, talk to the townspeople — they may have useful information. Then head east to the forest. Here, take some gold for supplies.",
			mood: "happy",
			effect: { type: "give_item", key: "gold_50" },
			choices: [
				{ text: "I won't let you down.", nextNode: "accept" },
			],
		},
		{
			id: "accept",
			speaker: "Mayor",
			text: "I believe in you! The fate of TOWNYUU rests in your hands. Good luck, adventurer!",
			mood: "happy",
			effect: { type: "start_quest", key: "q1" },
		},
	],
});

export const MYSTERY_NPC_DIALOGUE = BranchingDialogueSystem.fromJSON({
	id: "mystery_npc",
	startNode: "mysterious",
	nodes: [
		{
			id: "mysterious",
			speaker: "???",
			text: "... You can see me? Interesting. Most people walk right past.",
			mood: "neutral",
			choices: [
				{ text: "Who are you?", nextNode: "identity" },
				{ text: "What do you want?", nextNode: "purpose" },
				{ text: "I must be seeing things.", nextNode: "dismiss" },
			],
		},
		{
			id: "identity",
			speaker: "Shadow",
			text: "I go by many names. But you can call me Shadow. I've been watching this town for a very long time.",
			mood: "neutral",
			choices: [
				{ text: "Why?", nextNode: "watching" },
				{ text: "That's creepy.", nextNode: "creepy" },
			],
		},
		{
			id: "purpose",
			speaker: "Shadow",
			text: "I have information. About the creatures in the forest. About the dragon. Interested?",
			mood: "neutral",
			choices: [
				{ text: "Tell me everything.", nextNode: "secret" },
				{ text: "Why should I trust you?", nextNode: "trust" },
			],
		},
		{
			id: "secret",
			speaker: "Shadow",
			text: "The dragon isn't the real enemy. Something deeper lurks beneath the mountains. Find the ancient shrine in the forest — it will show you the truth.",
			effect: { type: "set_flag", key: "knows_secret" },
			choices: [
				{ text: "I'll find it.", nextNode: "farewell" },
			],
		},
		{
			id: "watching",
			speaker: "Shadow",
			text: "Because something terrible is coming. And you might be the only one who can stop it.",
			mood: "neutral",
			nextNode: "secret",
		},
		{
			id: "creepy",
			speaker: "Shadow",
			text: "Perhaps. But I may be the only ally you have. The truth behind the dragon is not what it seems...",
			mood: "neutral",
			nextNode: "secret",
		},
		{
			id: "trust",
			speaker: "Shadow",
			text: "You shouldn't. But consider — have I asked for anything? I'm offering knowledge, freely given.",
			mood: "neutral",
			choices: [
				{ text: "...Fine. What do you know?", nextNode: "secret" },
				{ text: "No deal.", nextNode: "refuse" },
			],
		},
		{
			id: "dismiss",
			speaker: "Shadow",
			text: "... Perhaps you're right. Or perhaps you'll wish you had listened. I'll be here when you change your mind.",
		},
		{
			id: "refuse",
			speaker: "Shadow",
			text: "As you wish. But remember — you can find me here when you're ready for the truth.",
		},
		{
			id: "farewell",
			speaker: "Shadow",
			text: "Good luck. We may meet again sooner than you think...",
			effect: { type: "set_flag", key: "met_shadow" },
		},
	],
});
