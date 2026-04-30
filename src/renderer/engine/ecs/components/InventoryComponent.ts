import { Component } from '../Component';

export interface InventoryItem {
    id: number;
    itemId: number; // Reference to RPGDatabase.ItemData
    quantity: number;
}

export class InventoryComponent extends Component {
    public readonly typeName = 'Inventory';
    public items: InventoryItem[] = [];
    public gold: number = 0;
}
