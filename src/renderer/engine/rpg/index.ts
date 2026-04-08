// RPG Engine Module — complete omni-engine RPG subsystem
export { Player, type PlayerConfig } from './Player';
export { Character, type CharacterConfig } from '../entity/Character';
export { Item } from './Item';
export { Wallet } from './Wallet';
export { GameClock } from './Clock';
export { Easing } from './Easing';
export { FriendCharacter, type FriendCharacterConfig } from './FriendCharacter';
export { FriendManager } from './FriendManager';

// Event system
export {
    Flag,
    Skill,
    Dialogue,
    GameString,
    EventParameter,
    EventParameterType,
    EventCommand,
    EventCommandType,
    BobEvent,
    EventTrigger,
    EventManager,
} from './event';
