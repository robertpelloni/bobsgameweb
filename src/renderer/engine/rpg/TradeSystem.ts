/**
 * TradeSystem — player-to-player and NPC trading.
 *
 * Features:
 * - Player-to-player trade with confirm/cancel
 * - NPC shop trades with haggling
 * - Item rarity affects trade value
 * - Trade reputation effects
 * - Trade history logging
 * - Secure two-phase commit (offer → confirm)
 *
 * Usage:
 *   const trade = new TradeSystem();
 *   trade.initiateTrade("player1", "player2");
 *   trade.offerItem("player1", "iron_sword", 1);
 *   trade.offerGold("player2", 100);
 *   trade.confirm("player1");
 *   trade.confirm("player2");
 *   const result = trade.execute();
 */

export type TradeState = "idle" | "negotiating" | "offering" | "confirmed" | "executed" | "cancelled";

export interface TradeOffer {
	playerId: string;
	items: Map<string, number>; // itemId → quantity
	gold: number;
	confirmed: boolean;
}

export interface TradeResult {
	success: boolean;
	player1: string;
	player2: string;
	items1To2: Map<string, number>; // items from p1 → p2
	items2To1: Map<string, number>;
	gold1To2: number;
	gold2To1: number;
	timestamp: number;
}

export interface TradeRecord {
	id: string;
	result: TradeResult;
	date: number;
}

const RARITY_VALUE: Record<string, number> = {
	common: 1, uncommon: 3, rare: 8, epic: 20, legendary: 50,
};

export class TradeSystem {
	private state: TradeState = "idle";
	private player1: string = "";
	private player2: string = "";
	private offers: Map<string, TradeOffer> = new Map();
	private history: TradeRecord[] = [];
	private tradeCounter = 0;
	private haggleBonus = 0;

	/** Initiate a trade between two players */
	initiateTrade(player1: string, player2: string): boolean {
		if (this.state !== "idle") return false;
		if (player1 === player2) return false;

		this.player1 = player1;
		this.player2 = player2;
		this.offers.clear();
		this.offers.set(player1, { playerId: player1, items: new Map(), gold: 0, confirmed: false });
		this.offers.set(player2, { playerId: player2, items: new Map(), gold: 0, confirmed: false });
		this.state = "negotiating";
		return true;
	}

	/** Offer an item */
	offerItem(playerId: string, itemId: string, quantity: number, rarity: string = "common"): boolean {
		if (this.state !== "negotiating") return false;
		const offer = this.offers.get(playerId);
		if (!offer) return false;

		offer.confirmed = false; // Reset confirm on new offer
		this.resetOtherConfirmation(playerId);
		const current = offer.items.get(itemId) ?? 0;
		offer.items.set(itemId, current + quantity);
		return true;
	}

	/** Offer gold */
	offerGold(playerId: string, amount: number): boolean {
		if (this.state !== "negotiating" || amount < 0) return false;
		const offer = this.offers.get(playerId);
		if (!offer) return false;

		offer.confirmed = false;
		this.resetOtherConfirmation(playerId);
		offer.gold = amount;
		return true;
	}

	/** Remove an item from offer */
	removeItem(playerId: string, itemId: string): boolean {
		if (this.state !== "negotiating") return false;
		const offer = this.offers.get(playerId);
		if (!offer) return false;

		offer.confirmed = false;
		this.resetOtherConfirmation(playerId);
		return offer.items.delete(itemId);
	}

	/** Confirm your side of the trade */
	confirm(playerId: string): boolean {
		if (this.state !== "negotiating") return false;
		const offer = this.offers.get(playerId);
		if (!offer) return false;

		offer.confirmed = true;

		// Check if both confirmed
		const allConfirmed = Array.from(this.offers.values()).every(o => o.confirmed);
		if (allConfirmed) {
			this.state = "confirmed";
		}
		return true;
	}

	/** Cancel trade */
	cancel(): void {
		this.state = "cancelled";
		this.offers.clear();
	}

	/** Execute the trade (both confirmed) */
	execute(): TradeResult | null {
		if (this.state !== "confirmed") return null;

		const offer1 = this.offers.get(this.player1)!;
		const offer2 = this.offers.get(this.player2)!;

		const result: TradeResult = {
			success: true,
			player1: this.player1,
			player2: this.player2,
			items1To2: new Map(offer1.items),
			items2To1: new Map(offer2.items),
			gold1To2: offer1.gold,
			gold2To1: offer2.gold,
			timestamp: Date.now(),
		};

		this.tradeCounter++;
		const record: TradeRecord = {
			id: `trade_${this.tradeCounter}`,
			result,
			date: result.timestamp,
		};
		this.history.push(record);

		this.state = "executed";
		this.offers.clear();
		return result;
	}

	/** Calculate value of an offer */
	evaluateOffer(offer: TradeOffer): number {
		let value = offer.gold;
		for (const [itemId, qty] of offer.items) {
			// Base value from item name heuristic
			const rarity = this.guessRarity(itemId);
			value += (RARITY_VALUE[rarity] ?? 1) * qty * 10;
		}
		return value;
	}

	/** Check if trade is fair (within threshold) */
	isFair(threshold = 0.3): boolean {
		const offer1 = this.offers.get(this.player1);
		const offer2 = this.offers.get(this.player2);
		if (!offer1 || !offer2) return false;

		const val1 = this.evaluateOffer(offer1);
		const val2 = this.evaluateOffer(offer2);
		if (val1 === 0 && val2 === 0) return true;
		const ratio = Math.min(val1, val2) / Math.max(val1, val2);
		return ratio >= (1 - threshold);
	}

	/** NPC haggling — try to get a better price */
	haggle(skillLevel: number): { success: boolean; discount: number } {
		const chance = 0.3 + skillLevel * 0.05;
		const success = Math.random() < chance;
		const discount = success ? 0.05 + Math.random() * 0.15 : 0;
		if (success) this.haggleBonus = discount;
		return { success, discount };
	}

	/** Get haggle-adjusted price */
	getHaggledPrice(basePrice: number): number {
		return Math.floor(basePrice * (1 - this.haggleBonus));
	}

	/** Reset haggle */
	resetHaggle(): void { this.haggleBonus = 0; }

	/** Get state */
	getState(): TradeState { return this.state; }

	/** Get offer */
	getOffer(playerId: string): TradeOffer | undefined {
		return this.offers.get(playerId);
	}

	/** Get history */
	getHistory(): TradeRecord[] { return [...this.history]; }

	/** Get trade count */
	getTradeCount(): number { return this.history.length; }

	/** Check if trading */
	isTrading(): boolean { return this.state !== "idle"; }

	/** Reset to idle */
	reset(): void {
		this.state = "idle";
		this.offers.clear();
		this.haggleBonus = 0;
	}

	private guessRarity(itemId: string): string {
		if (itemId.includes("legend") || itemId.includes("dragon")) return "legendary";
		if (itemId.includes("epic") || itemId.includes("ancient")) return "epic";
		if (itemId.includes("rare") || itemId.includes("magic")) return "rare";
		if (itemId.includes("steel") || itemId.includes("silver")) return "uncommon";
		return "common";
	}

	private resetOtherConfirmation(playerId: string): void {
		for (const [id, offer] of this.offers) {
			if (id !== playerId) offer.confirmed = false;
		}
	}
}
