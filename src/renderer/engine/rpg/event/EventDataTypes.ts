/**
 * DialogueData — dialogue conversation data definition.
 * Ported from Java com.bobsgame.shared.DialogueData.
 */
export class DialogueData {
    id = -1;
    name = '';
    speakerName = '';
    text = '';
    portraitName = '';
    choices: { text: string; flagToSet?: string; nextDialogueID?: number }[] = [];
    onEndFlagID = -1;
    voiceFile = '';

    constructor(data?: Partial<DialogueData>) {
        if (data) Object.assign(this, data);
    }

    static fromJSON(data: Record<string, unknown>): DialogueData {
        return new DialogueData({
            id: (data.id as number) ?? -1,
            name: (data.name as string) ?? '',
            speakerName: (data.speakerName as string) ?? '',
            text: (data.text as string) ?? '',
            choices: (data.choices as DialogueData['choices']) ?? [],
        });
    }

    toJSON(): Record<string, unknown> {
        return { ...this } as Record<string, unknown>;
    }
}

/**
 * FlagData — boolean game state flag definition.
 * Ported from Java com.bobsgame.shared.FlagData.
 */
export class FlagData {
    id = -1;
    name = '';
    defaultValue = false;
    saveOnExit = true;

    constructor(data?: Partial<FlagData>) {
        if (data) Object.assign(this, data);
    }

    static fromJSON(data: Record<string, unknown>): FlagData {
        return new FlagData({
            id: (data.id as number) ?? -1,
            name: (data.name as string) ?? '',
            defaultValue: (data.defaultValue as boolean) ?? false,
        });
    }

    toJSON(): Record<string, unknown> {
        return { ...this } as Record<string, unknown>;
    }
}

/**
 * SkillData — numeric skill/stat definition.
 * Ported from Java com.bobsgame.shared.SkillData.
 */
export class SkillData {
    id = -1;
    name = '';
    description = '';
    minValue = 0;
    maxValue = 100;
    defaultValue = 0;
    iconSprite = '';

    constructor(data?: Partial<SkillData>) {
        if (data) Object.assign(this, data);
    }

    static fromJSON(data: Record<string, unknown>): SkillData {
        return new SkillData({
            id: (data.id as number) ?? -1,
            name: (data.name as string) ?? '',
            description: (data.description as string) ?? '',
            maxValue: (data.maxValue as number) ?? 100,
        });
    }

    toJSON(): Record<string, unknown> {
        return { ...this } as Record<string, unknown>;
    }
}

/**
 * GameStringData — localized string definition.
 * Ported from Java com.bobsgame.shared.GameStringData.
 */
export class GameStringData {
    id = -1;
    name = '';
    text = '';
    language = 'en';

    constructor(data?: Partial<GameStringData>) {
        if (data) Object.assign(this, data);
    }

    static fromJSON(data: Record<string, unknown>): GameStringData {
        return new GameStringData({
            id: (data.id as number) ?? -1,
            name: (data.name as string) ?? '',
            text: (data.text as string) ?? '',
            language: (data.language as string) ?? 'en',
        });
    }

    toJSON(): Record<string, unknown> {
        return { ...this } as Record<string, unknown>;
    }
}
