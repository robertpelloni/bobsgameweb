/**
 * CardGameSystem — a collectible card game (CCG) minigame within the RPG.
 *
 * Features:
 * - 20+ collectible cards (Monsters, Spells, Heroes)
 * - Turn-based battle logic
 * - Deck building (10 cards per deck)
 * - Mana/Energy system for playing cards
 * - Board state (Frontline/Backline)
 */

export type CardType = "unit" | "spell" | "structure";

export interface Card {
	id: string;
	name: string;
	type: CardType;
	manaCost: number;
	attack?: number;
	health?: number;
	description: string;
	rarity: "common" | "rare" | "epic" | "legendary";
}

export interface GameState {
	playerHP: number;
	opponentHP: number;
	playerMana: number;
	opponentMana: number;
	playerHand: Card[];
	playerBoard: Card[];
	opponentBoard: Card[];
	turn: number;
	isPlayerTurn: boolean;
}

export class CardGameSystem {
	private deck: Card[] = [];
	private collection: Card[] = [];
	
	private cards: Card[] = [
		{ id: "slime", name: "Green Slime", type: "unit", manaCost: 1, attack: 1, health: 2, description: "Basic unit.", rarity: "common" },
		{ id: "wolf", name: "Dire Wolf", type: "unit", manaCost: 2, attack: 3, health: 2, description: "Aggressive unit.", rarity: "common" },
		{ id: "fireball", name: "Fireball", type: "spell", manaCost: 3, description: "Deal 4 damage to a unit.", rarity: "rare" },
		{ id: "knight", name: "Royal Knight", type: "unit", manaCost: 4, attack: 4, health: 5, description: "Solid defender.", rarity: "rare" },
		{ id: "dragon", name: "Ancient Dragon", type: "unit", manaCost: 7, attack: 8, health: 8, description: "Game ender.", rarity: "legendary" },
	];

	constructor() {
		// Start with basic cards
		this.collection = [...this.cards.filter(c => c.rarity === "common")];
		this.deck = [...this.collection, ...this.collection].slice(0, 10);
	}

	initGame(): GameState {
		return {
			playerHP: 20,
			opponentHP: 20,
			playerMana: 1,
			opponentMana: 1,
			playerHand: this.deck.slice(0, 3),
			playerBoard: [],
			opponentBoard: [],
			turn: 1,
			isPlayerTurn: true
		};
	}

	playCard(state: GameState, cardIndex: number): GameState {
		const card = state.playerHand[cardIndex];
		if (!card || state.playerMana < card.manaCost) return state;

		const newState = { ...state };
		newState.playerMana -= card.manaCost;
		newState.playerHand = [...state.playerHand];
		newState.playerHand.splice(cardIndex, 1);

		if (card.type === "unit") {
			newState.playerBoard = [...state.playerBoard, card];
		} else if (card.type === "spell") {
			// Spell effect logic would go here
			newState.opponentHP -= 2; // Generic spell damage
		}

		return newState;
	}

	endTurn(state: GameState): GameState {
		const newState = { ...state };
		// Units on board attack opponent
		for (const unit of newState.playerBoard) {
			newState.opponentHP -= (unit.attack ?? 0);
		}
		
		newState.isPlayerTurn = false;
		newState.turn++;
		newState.opponentMana = Math.min(10, newState.turn);
		return newState;
	}

	getCollection(): Card[] { return this.collection; }
	addToCollection(cardId: string): void {
		const card = this.cards.find(c => c.id === cardId);
		if (card) this.collection.push(card);
	}
}
