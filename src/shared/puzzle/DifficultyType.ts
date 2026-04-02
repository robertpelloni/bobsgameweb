export class DifficultyType {
    public name: string = "";

    public initialLineDropSpeedTicks: number = 1000;
    public minimumLineDropSpeedTicks: number = 64;
    public maxStackRise: number = 400;
    public minStackRise: number = 30;

    public extraStage1Level: number = 10;
    public extraStage2Level: number = 15;
    public extraStage3Level: number = 20;
    public extraStage4Level: number = 25;
    public creditsLevel: number = 30;

    public playingFieldGarbageSpawnRuleAmount: number = 5;
    public maximumBlockTypeColors: number = 8;

    public randomlyFillGrid: boolean = true;
    public randomlyFillGridStartY: number = 10;
    public randomlyFillGridAmount: number = 30;

    public pieceTypesToDisallow_UUID: string[] = [];
    public blockTypesToDisallow_UUID: string[] = [];

    constructor(name: string = "") {
        this.name = name;
    }
}
