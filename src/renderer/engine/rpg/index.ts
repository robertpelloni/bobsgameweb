// RPG Engine Module — complete omni-engine RPG subsystem
export { Player, type PlayerConfig } from './Player';
export { Character as RPGCharacter } from '../entity/Character';
export { Item } from './Item';
export { Wallet } from './Wallet';
export { GameClock } from './Clock';
export { Easing } from './Easing';
export { FriendCharacter, type FriendCharacterConfig } from './FriendCharacter';
export { FriendManager } from './FriendManager';
export { BGClientEngine } from './BGClientEngine';
export { ClientGameEngine } from './ClientGameEngine';

// GUI system
export * from './gui';

// Action system
export { ActionManager, type ActionCaptionType, type ActionContext } from './ActionManager';

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

// Save system
export { GameSave, type SaveSlot } from './save';
