/**
 * Wallet — tracks in-game currency.
 *
 * Ported from okgame C++ Engine/Engine/rpg/Wallet.
 */
export class Wallet {
    private _money = 0;
    private _lastMoney = -1;
    private _onChange?: (current: number, previous: number) => void;

    constructor(startingMoney = 19.99, onChange?: (current: number, previous: number) => void) {
        this._money = startingMoney;
        this._onChange = onChange;
    }

    get money(): number {
        return this._money;
    }

    set money(value: number) {
        const prev = this._money;
        this._money = Math.round(value * 100) / 100;
        if (prev !== this._money) {
            this._lastMoney = prev;
            this._onChange?.(this._money, prev);
        }
    }

    add(amount: number): void {
        this.money = this._money + amount;
    }

    subtract(amount: number): boolean {
        if (this._money >= amount) {
            this.money = this._money - amount;
            return true;
        }
        return false; // Not enough money
    }

    has(amount: number): boolean {
        return this._money >= amount;
    }

    getMoneyString(): string {
        return `$${this._money.toFixed(2)}`;
    }

    get lastMoney(): number {
        return this._lastMoney;
    }
}
