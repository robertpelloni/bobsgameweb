import { Character, CharacterConfig } from '../entity/Character';

export interface PlayerConfig extends CharacterConfig {
  playerId?: string;
}

export class Player extends Character {
  public playerId: string;
  
  constructor(config?: PlayerConfig) {
    super(config);
    this.playerId = config?.playerId ?? 'local_player';
  }
  
  public override update(dt: number) {
    super.update(dt);
    // Add specific player input handling and network synchronization here
  }
}
