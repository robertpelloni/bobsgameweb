import { AssetData } from '../AssetData';
import { MapData } from '../MapData';

export interface ActorData {
    id: number;
    name: string;
    classId: number;
    initialLevel: number;
    faceName: string;
    characterName: string;
    description: string;
    persona?: string;   // For AI conversational context
    mood?: string;      // Current emotional state
}

export interface SkillData {
    id: number;
    name: string;
    description: string;
    mpCost: number;
    tpCost: number;
    scope: number; // 0: None, 1: One Enemy, 2: All Enemies, etc.
    actionType: number; // Damage, Recover, etc.
}

export interface ItemData {
    id: number;
    name: string;
    description: string;
    price: number;
    consumable: boolean;
    itypeId: number; // 1: Regular, 2: Key
}

export interface EnemyData {
    id: number;
    name: string;
    mhp: number;
    mmp: number;
    atk: number;
    def: number;
    mat: number;
    mdf: number;
    agi: number;
    luk: number;
    exp: number;
    gold: number;
}

export class RPGDatabase {
    public actors: ActorData[] = [];
    public skills: SkillData[] = [];
    public items: ItemData[] = [];
    public weapons: any[] = [];
    public armors: any[] = [];
    public enemies: EnemyData[] = [];
    public troops: any[] = [];
    public states: any[] = [];
    
    public maps: MapData[] = [];
    public assets: AssetData[] = [];
}
