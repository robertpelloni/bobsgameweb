/**
 * Block — puzzle block definition with types, colors, and special abilities.
 *
 * Ported from okgame C++ Puzzle/Block.h.
 * Represents a single block on the puzzle grid with animation state,
 * special behaviors, and chain/clear rules.
 */

export enum AnimationState {
    NORMAL = 0,
    DROPPING = 1,
    TOUCHING_BOTTOM = 2,
    SET_AT_BOTTOM = 3,
    FLASHING = 4,
    REMOVING = 5,
    PRESSURE = 6,
}

export interface BlockColor {
    r: number;
    g: number;
    b: number;
}

export class BlockType {
    name = '';
    uuid = '';
    spriteName = '';
    specialSpriteName = '';

    // Usage flags
    useInNormalPieces = false;
    useAsGarbage = false;
    useAsPlayingFieldFiller = false;
    ignoreWhenMovingDownBlocks = false;
    chainConnectionsMustContainAtLeastOneBlockWithThisTrue = false;
    ignoreWhenCheckingChainConnections = false;

    // Colors
    colors: BlockColor[] = [];
    specialColor: BlockColor | null = null;

    // Special block properties
    randomSpecialBlockChanceOneOutOf = 0;
    frequencySpecialBlockTypeOnceEveryNPieces = 0;
    flashingSpecialType = false;
    turnBackToNormalBlockAfterNPiecesLock = -1;

    // When cleared effects
    makePieceTypeWhenCleared_UUID: string[] = [];
    clearEveryOtherLineOnGridWhenCleared = false;

    // Counter / Pac-Man types
    counterType = false;
    pacmanType = false;
    pacJarType = false;
    ticksToChangeDirection = 1000;

    // Chain expansion
    ifConnectedUpDownLeftRightToExplodingBlockChangeIntoThisType_UUID: string[] = [];
    addToChainIfConnectedUpDownLeftRightToExplodingChainBlocks = false;

    // Color effects
    removeAllBlocksOfColorOnFieldBlockIsSetOn = false;
    changeAllBlocksOfColorOnFieldBlockIsSetOnToDiamondColor = false;
    matchAnyColor = false;

    // Start values
    counterStartValue = 0;
    pacmanDirection = 0; // 0=right, 1=down, 2=left, 3=up

    constructor(init?: Partial<BlockType>) {
        Object.assign(this, init);
    }

    static fromJSON(data: Record<string, unknown>): BlockType {
        const bt = new BlockType();
        bt.name = (data.name as string) ?? '';
        bt.uuid = (data.uuid as string) ?? '';
        bt.spriteName = (data.spriteName as string) ?? '';
        bt.useInNormalPieces = (data.useInNormalPieces as boolean) ?? false;
        bt.useAsGarbage = (data.useAsGarbage as boolean) ?? false;
        bt.flashingSpecialType = (data.flashingSpecialType as boolean) ?? false;
        bt.matchAnyColor = (data.matchAnyColor as boolean) ?? false;
        bt.counterType = (data.counterType as boolean) ?? false;
        bt.pacmanType = (data.pacmanType as boolean) ?? false;
        bt.colors = (data.colors as BlockColor[]) ?? [];
        bt.randomSpecialBlockChanceOneOutOf = (data.randomSpecialBlockChanceOneOutOf as number) ?? 0;
        bt.turnBackToNormalBlockAfterNPiecesLock = (data.turnBackToNormalBlockAfterNPiecesLock as number) ?? -1;
        return bt;
    }
}

export class Block {
    type: BlockType;
    x = 0;
    y = 0;
    animationState: AnimationState = AnimationState.NORMAL;
    color: BlockColor;
    special = false;
    counterValue = 0;
    pacmanDirection = 0;

    // Animation
    flashTimer = 0;
    removeTimer = 0;
    dropDistance = 0;
    dropSpeed = 0;

    // Grid reference
    gridX = -1;
    gridY = -1;

    constructor(type: BlockType, color?: BlockColor) {
        this.type = type;
        this.color = color ?? (type.colors.length > 0
            ? type.colors[Math.floor(Math.random() * type.colors.length)]
            : { r: 255, g: 255, b: 255 });
        this.special = type.flashingSpecialType;
        this.counterValue = type.counterStartValue;
        this.pacmanDirection = type.pacmanDirection;
    }

    setGridPosition(gx: number, gy: number): void {
        this.gridX = gx;
        this.gridY = gy;
        this.x = gx;
        this.y = gy;
    }

    isSettled(): boolean {
        return this.animationState === AnimationState.SET_AT_BOTTOM ||
            this.animationState === AnimationState.NORMAL;
    }

    isClearing(): boolean {
        return this.animationState === AnimationState.FLASHING ||
            this.animationState === AnimationState.REMOVING;
    }

    clone(): Block {
        const b = new Block(this.type, { ...this.color });
        b.gridX = this.gridX;
        b.gridY = this.gridY;
        b.x = this.x;
        b.y = this.y;
        b.animationState = this.animationState;
        b.special = this.special;
        b.counterValue = this.counterValue;
        return b;
    }
}
