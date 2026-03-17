import { BobColor } from "../BobColor";
import { RotationSet, Rotation, BlockOffset, Piece } from "./Piece";

export class PieceType {
    public static readonly emptyPieceType = new PieceType("empty");

    public uuid: string = "";
    public name: string = "";
    public color: BobColor | null = null;
    public rotationSet: RotationSet = new RotationSet("");

    public frequencySpecialPieceTypeOnceEveryNPieces: number = 0;
    public randomSpecialPieceChanceOneOutOf: number = 0;
    public flashingSpecialType: boolean = false;
    public clearEveryRowPieceIsOnIfAnySingleRowCleared: boolean = false;
    public turnBackToNormalPieceAfterNPiecesLock: number = -1;
    public fadeOutOnceSetInsteadOfAddedToGrid: boolean = false;

    public useAsNormalPiece: boolean = false;
    public useAsGarbagePiece: boolean = false;
    public useAsPlayingFieldFillerPiece: boolean = false;
    public disallowAsFirstPiece: boolean = false;

    public spriteName: string = "";

    public bombPiece: boolean = false;
    public weightPiece: boolean = false;
    public pieceRemovalShooterPiece: boolean = false;
    public pieceShooterPiece: boolean = false;

    public overrideBlockTypes_UUID: string[] = [];

    // Legacy/compatibility fields
    public isGarbagePieceType: boolean = false;
    public isBomb: boolean = false;
    public isWeight: boolean = false;
    public isSubtractor: boolean = false;
    public isShooter: boolean = false;

    constructor(name: string = "", rs: RotationSet = new RotationSet("")) {
        this.uuid = crypto.randomUUID();
        this.name = name;
        this.rotationSet = rs;
        if (this.rotationSet.size() === 0) {
            const r = new Rotation();
            r.add(new BlockOffset(0, 0));
            this.rotationSet.add(r);
        }
    }

    public isSpecialType(): boolean {
        if (this.randomSpecialPieceChanceOneOutOf !== 0) return true;
        if (this.frequencySpecialPieceTypeOnceEveryNPieces !== 0) return true;
        if (this.flashingSpecialType) return true;
        return this.bombPiece || this.weightPiece || this.pieceRemovalShooterPiece || this.pieceShooterPiece || this.isBomb || this.isWeight || this.isSubtractor || this.isShooter;
    }
}

export const PieceTypes = {
    I: (() => {
        const pt = new PieceType('I', Piece.get4BlockIRotationSet(0));
        pt.useAsNormalPiece = true;
        return pt;
    })(),
    O: (() => {
        const pt = new PieceType('O', Piece.get4BlockORotationSet());
        pt.useAsNormalPiece = true;
        return pt;
    })(),
    T: (() => {
        const pt = new PieceType('T', Piece.get4BlockTRotationSet(0));
        pt.useAsNormalPiece = true;
        return pt;
    })(),
    S: (() => {
        const pt = new PieceType('S', Piece.get4BlockSRotationSet(0));
        pt.useAsNormalPiece = true;
        return pt;
    })(),
    Z: (() => {
        const pt = new PieceType('Z', Piece.get4BlockZRotationSet(0));
        pt.useAsNormalPiece = true;
        return pt;
    })(),
    J: (() => {
        const pt = new PieceType('J', Piece.get4BlockJRotationSet(0));
        pt.useAsNormalPiece = true;
        return pt;
    })(),
    L: (() => {
        const pt = new PieceType('L', Piece.get4BlockLRotationSet(0));
        pt.useAsNormalPiece = true;
        return pt;
    })(),
};

export const STANDARD_PIECE_TYPES = [
    PieceTypes.I,
    PieceTypes.O,
    PieceTypes.T,
    PieceTypes.S,
    PieceTypes.Z,
    PieceTypes.J,
    PieceTypes.L,
];
