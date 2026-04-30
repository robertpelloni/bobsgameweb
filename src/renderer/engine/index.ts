/**
 * Engine module barrel export — re-exports all engine subsystems.
 *
 * Import specific modules from their sub-directories for tree-shaking:
 *   import { AudioManager } from './engine/audio';
 *
 * Or use this barrel for convenience:
 *   import { AudioManager } from './engine';
 */

// Audio
export { AudioManager, AudioChannel } from './audio/AudioManager';
export { AudioUtils } from './audio/AudioUtils';

// Cinematics
export { CinematicsManager } from './cinematics/CinematicsManager';
export { CutsceneEngine } from './cinematics/CutsceneEngine';

// Debug
export { DebugConsole } from './debug/DebugConsole';
export { Logger, LogLevel } from './debug/Logger';

// Entity
export { Cameraman } from './entity/Cameraman';
export { Character } from './entity/Character';
export { PathFinder } from './entity/PathFinder';
export { SpriteAnimation } from './entity/SpriteAnimation';
export { SpriteManager } from './entity/SpriteManager';
export { BobSprite } from './entity/BobSprite';

// Graphics
export { ParticleEmitter, ParticlePresets } from './graphics/ParticleSystem';

// Input
export { ControlsManager } from './input/ControlsManager';

// Map
export { GameMap } from './map/GameMap';
export { MapLoader } from './map/MapLoader';
export { MapManager } from './map/MapManager';

// ND (Handheld console)
export { ND, NDButton } from './nd/ND';

// Network
export { NetworkManager } from './network/NetworkManager';
export { ServerConnection } from './network/ServerConnection';

// Physics
export { Physics } from './physics/Physics';

// Puzzle
export { Grid } from './puzzle/Grid';
export { GameLogic } from './puzzle/GameLogic';
export { OKGame } from './puzzle/OKGame';

// RPG
export { Player } from './rpg/Player';
export { Item } from './rpg/Item';
export { Wallet } from './rpg/Wallet';
export { ActionManager } from './rpg/ActionManager';
export { ClientGameEngine } from './rpg/ClientGameEngine';

// Shared
export { GlobalSettings } from './shared/GlobalSettings';
export { OKMath } from './shared/OKMath';
export { OKColor } from './shared/OKColor';

// Stadium
export { TournamentManager } from './stadium/TournamentManager';

// State
export { StateManager } from './state/StateManager';

// Text
export { DialogueBox } from './text/TextEngine';
export { TextManager } from './text/TextManager';
