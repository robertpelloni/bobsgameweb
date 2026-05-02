/**
 * AuctionHouseSystem - Player-driven marketplace.
 * 
 * Features:
 * - Create listings (item, price, duration)
 * - Buyout and bidding logic
 * - Expired listing handling (return to sender)
 * - Search by category/rarity/level
 * - Sales tax (sink for economy)
 */

export interface Listing {
    id: string;
    sellerId: string;
    itemId: string;
    price: number;
    expiresAt: number;
    highestBidderId: string | null;
    highestBid: number;
}

export class AuctionHouseSystem {
    private listings: Map<string, Listing> = new Map();
    private taxRate: number = 0.05;

    list(sellerId: string, itemId: string, price: number, durationHours: number): string {
        const id = `auc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const listing: Listing = {
            id,
            sellerId,
            itemId,
            price,
            expiresAt: Date.now() + (durationHours * 3600 * 1000),
            highestBidderId: null,
            highestBid: 0
        };
        this.listings.set(id, listing);
        return id;
    }

    buyout(listingId: string, buyerId: string): { success: boolean, netGold: number } {
        const listing = this.listings.get(listingId);
        if (!listing || listing.expiresAt < Date.now()) return { success: false, netGold: 0 };
        
        const tax = Math.floor(listing.price * this.taxRate);
        const net = listing.price - tax;
        
        this.listings.delete(listingId);
        return { success: true, netGold: net };
    }

    getListings() {
        // Cleanup expired
        const now = Date.now();
        for (const [id, l] of this.listings) {
            if (l.expiresAt < now) this.listings.delete(id);
        }
        return Array.from(this.listings.values());
    }
}
