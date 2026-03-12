import { BobColor } from "../BobColor";
import { RotationSet, Rotation, BlockOffset, Piece, RotationType } from "./Piece";

export class PieceType {
    public name: string = "";
    public uuid: string = "";
    public description: string = "";

    public color: BobColor | null = null;
    public rotationSet: RotationSet = new RotationSet();

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

    public static create(rs: RotationSet): PieceType {
        const pt = new PieceType();
        pt.rotationSet = rs;
        return pt;
    }

    public static emptyPieceType: PieceType = PieceType.create(new RotationSet("Empty"));
    public static oneBlockCursorPieceType: PieceType = PieceType.create(Piece.get1BlockCursorRotationSet());
    public static twoBlockHorizontalCursorPieceType: PieceType = PieceType.create(Piece.get2BlockHorizontalCursorRotationSet());
    public static twoBlockVerticalCursorPieceType: PieceType = PieceType.create(Piece.get2BlockVerticalCursorRotationSet());
    public static threeBlockHorizontalCursorPieceType: PieceType = PieceType.create(Piece.get3BlockHorizontalCursorRotationSet());
    public static threeBlockVerticalCursorPieceType: PieceType = PieceType.create(Piece.get3BlockVerticalCursorRotationSet());
    public static fourBlockCursorPieceType: PieceType = PieceType.create(Piece.get4BlockCursorRotationSet());
    public static threeBlockVerticalSwapPieceType: PieceType = PieceType.create(Piece.get3BlockVerticalRotationSet());
    public static threeBlockHorizontalSwapPieceType: PieceType = PieceType.create(Piece.get3BlockHorizontalRotationSet());
    public static threeBlockTPieceType: PieceType = PieceType.create(Piece.get3BlockTRotationSet());
    public static threeBlockLPieceType: PieceType = PieceType.create(Piece.get3BlockLRotationSet());
    public static threeBlockJPieceType: PieceType = PieceType.create(Piece.get3BlockJRotationSet());
    public static threeBlockIPieceType: PieceType = PieceType.create(Piece.get3BlockIRotationSet());
    public static threeBlockCPieceType: PieceType = PieceType.create(Piece.get3BlockCRotationSet());
    public static threeBlockDPieceType: PieceType = PieceType.create(Piece.get3BlockDRotationSet());
    public static fourBlockOPieceType: PieceType = PieceType.create(Piece.get4BlockORotationSet());
    public static fourBlockSolidPieceType: PieceType = PieceType.create(Piece.get4BlockSolidRotationSet());
    public static nineBlockSolidPieceType: PieceType = PieceType.create(Piece.get9BlockSolidRotationSet());
    public static fourBlockIPieceType: PieceType = PieceType.create(Piece.get4BlockIRotationSet(RotationType.SRS));
    public static fourBlockJPieceType: PieceType = PieceType.create(Piece.get4BlockJRotationSet(RotationType.SRS));
    public static fourBlockLPieceType: PieceType = PieceType.create(Piece.get4BlockLRotationSet(RotationType.SRS));
    public static fourBlockSPieceType: PieceType = PieceType.create(Piece.get4BlockSRotationSet(RotationType.SRS));
    public static fourBlockTPieceType: PieceType = PieceType.create(Piece.get4BlockTRotationSet(RotationType.SRS));
    public static fourBlockZPieceType: PieceType = PieceType.create(Piece.get4BlockZRotationSet(RotationType.SRS));

    constructor() {
        this.uuid = crypto.randomUUID();
        const r = new Rotation();
        r.blockOffsets.push(new BlockOffset(0, 0));
        this.rotationSet.rotations.push(r);
    }
}
