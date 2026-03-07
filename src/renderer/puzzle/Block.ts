import { EventEmitter } from 'eventemitter3';
import { Color, Colors } from './Color';
import { BlockType, BlockTypes } from './BlockType';
import type { Piece } from './Piece';
import type { Grid } from './Grid';

export enum AnimationState {
  NORMAL = 0,
  DROPPING = 1,
  TOUCHING_BOTTOM = 2,
  SET_AT_BOTTOM = 3,
  FLASHING = 4,
  REMOVING = 5,
  PRESSURE = 6,
}

export interface BlockEvents {
  stateChange: (state: AnimationState) => void;
  colorChange: (color: Color) => void;
  remove: () => void;
}

export interface BlockConfig {
  blockType?: BlockType;
  color?: Color;
  xInPiece?: number;
  yInPiece?: number;
}

export class Block extends EventEmitter<BlockEvents> {
  private _blockType: BlockType;
  private _color: Color;

  xInPiece: number = 0;
  yInPiece: number = 0;
  xGrid: number = -1;
  yGrid: number = -1;

  piece: Piece | null = null;
  grid: Grid | null = null;

  animationState: AnimationState = AnimationState.NORMAL;
  animationFrame: number = 0;
  animationFrameTicks: number = 0;

  setInGrid: boolean = false;
  locking: boolean = false;
  lockingAnimationFrame: number = 0;

  fadingOut: boolean = false;
  disappearingAlpha: number = 1.0;

  flashingToBeRemoved: boolean = false;
  flashingToBeRemovedLightDarkToggle: boolean = false;

  connectedUp: boolean = false;
  connectedDown: boolean = false;
  connectedLeft: boolean = false;
  connectedRight: boolean = false;

  connectedUpRight: boolean = false;
  connectedDownRight: boolean = false;
  connectedUpLeft: boolean = false;
  connectedDownLeft: boolean = false;

  interpolateSwappingWithX: number = 0;
  interpolateSwappingWithY: number = 0;
  swapTicks: number = 0;

  popping: boolean = false;
  ateBlocks: boolean = false;
  didFlashingColoredDiamond: boolean = false;
  direction: number = -1;
  directionChangeTicksCounter: number = 0;

  counterCount: number = -1;

  ticksSinceLastMovement: number = 0;

  constructor(config?: BlockConfig) {
    super();
    this._blockType = config?.blockType ?? BlockTypes.NORMAL;
    this._color = config?.color ?? this._blockType.getRandomColor();
    this.xInPiece = config?.xInPiece ?? 0;
    this.yInPiece = config?.yInPiece ?? 0;

    if (this._blockType.counterType !== 0) {
      this.counterCount = this._blockType.counterStartAmount;
    }
  }

  get blockType(): BlockType {
    return this._blockType;
  }

  set blockType(value: BlockType) {
    this._blockType = value;
  }

  get color(): Color {
    return this._color;
  }

  set color(value: Color) {
    if (!this._color.equals(value)) {
      this._color = value;
      this.emit('colorChange', value);
    }
  }

  setRandomColor(): void {
    this.color = this._blockType.getRandomColor();
  }

  setState(state: AnimationState): void {
    if (this.animationState !== state) {
      this.animationState = state;
      this.animationFrame = 0;
      this.animationFrameTicks = 0;
      this.emit('stateChange', state);
    }
  }

  resetConnections(): void {
    this.connectedUp = false;
    this.connectedDown = false;
    this.connectedLeft = false;
    this.connectedRight = false;
  }

  setGridPosition(x: number, y: number): void {
    this.xGrid = x;
    this.yGrid = y;
  }

  setPieceOffset(x: number, y: number): void {
    this.xInPiece = x;
    this.yInPiece = y;
  }

  matchesColor(other: Block): boolean {
    return this._color.equals(other._color);
  }

  matchesType(other: Block): boolean {
    return this._blockType.uuid === other._blockType.uuid;
  }

  startFadeOut(): void {
    this.fadingOut = true;
    this.disappearingAlpha = 1.0;
  }

  updateFadeOut(dt: number, fadeSpeed: number = 1.0): boolean {
    if (!this.fadingOut) return false;

    this.disappearingAlpha -= dt * fadeSpeed;
    if (this.disappearingAlpha <= 0) {
      this.disappearingAlpha = 0;
      this.emit('remove');
      return true;
    }
    return false;
  }

  startLocking(): void {
    this.locking = true;
    this.lockingAnimationFrame = 0;
  }

  isLocking(): boolean {
    return this.locking;
  }

  finishLocking(): void {
    this.locking = false;
    this.setInGrid = true;
    this.setState(AnimationState.SET_AT_BOTTOM);
  }

  clone(): Block {
    const block = new Block({
      blockType: this._blockType,
      color: this._color,
      xInPiece: this.xInPiece,
      yInPiece: this.yInPiece,
    });
    block.xGrid = this.xGrid;
    block.yGrid = this.yGrid;
    block.animationState = this.animationState;
    block.setInGrid = this.setInGrid;
    block.counterCount = this.counterCount;
    return block;
  }

  update(ticks: number, game: PuzzleGame): void {
    if (this.fadingOut) {
      this.disappearingAlpha -= ticks * 0.005;
      if (this.disappearingAlpha <= 0) {
        this.disappearingAlpha = 0;
        this.fadingOut = false;
        // remove from game.fadingOutBlocks...
      }
    }

    if (this.locking) {
      this.lockingAnimationFrame++;
      if (this.lockingAnimationFrame > 8) {
        this.locking = false;
        this.lockingAnimationFrame = 0;
      }
    }

    if (this.popping) {
      if (this.animationFrame === -1) {
        this.popping = false;
        // change type logic...
      }
    }

    // pacman and special behavior logic...
  }

  breakConnectionsInPiece(): void {
    // connection breaking logic...
  }
}
