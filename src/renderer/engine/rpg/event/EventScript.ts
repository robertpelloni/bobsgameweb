/**
 * EventScript — complete visual scripting command and qualifier registry.
 *
 * Ported from Java engine com.bobsgame.shared.EventData.
 * This is the full event scripting language for bob's game,
 * supporting triggers, conditions, actions, entity control, camera, dialogue, and more.
 */

// ============================================================
// Event Types (when events run)
// ============================================================

export enum EventType {
    PROJECT_INITIAL_LOADER = -3,
    PROJECT_CUTSCENE_DONT_RUN_UNTIL_CALLED = -2,
    MAP_RUN_ONCE_BEFORE_LOAD = -1,
    NORMAL_REPEAT_WHILE_MAP_RUNNING = 0,
    MAP_DONT_RUN_UNTIL_CALLED = 1,
    MAP_RUN_ONCE_AFTER_LOAD = 2,
}

// ============================================================
// Event Script Command
// ============================================================

export class EventScriptCommand {
    readonly command: string;
    readonly comment: string;

    constructor(command: string, comment = '') {
        this.command = command;
        this.comment = comment;
    }

    /** Get the base command name (before underscore parameters) */
    getCommand(): string {
        const idx = this.command.indexOf('_');
        return idx >= 0 ? this.command.substring(0, idx) : this.command;
    }

    /** Get the full command string with argument type hints */
    getCommandWithArguments(): string {
        return this.command;
    }

    toString(): string {
        return this.command;
    }
}

// ============================================================
// Event Script Qualifier (condition check)
// ============================================================

export class EventScriptQualifier extends EventScriptCommand {
    constructor(command: string, comment = '') {
        super(command, comment);
    }
}

// ============================================================
// Qualifiers (conditions)
// ============================================================

export const Qualifiers = {
    // Player interaction
    isPlayerTouchingThisArea: new EventScriptQualifier('isPlayerTouchingThisArea'),
    isPlayerWalkingIntoThisDoor: new EventScriptQualifier('isPlayerWalkingIntoThisDoor'),
    isPlayerTouchingThisEntity: new EventScriptQualifier('isPlayerTouchingThisEntity'),
    isPlayerTouchingAnyEntityUsingThisSprite: new EventScriptQualifier('isPlayerTouchingAnyEntityUsingThisSprite'),
    isPlayerWalkingIntoDoor_DOOR: new EventScriptQualifier('isPlayerWalkingIntoDoor_DOOR'),
    isPlayerWalkingIntoWarp_WARP: new EventScriptQualifier('isPlayerWalkingIntoWarp_WARP'),
    isActionButtonHeld: new EventScriptQualifier('isActionButtonHeld'),
    isPlayerAutoPilotOn: new EventScriptQualifier('isPlayerAutoPilotOn'),

    // State checks
    isFlagSet_FLAG: new EventScriptQualifier('isFlagSet_FLAG'),
    hasSkillAtLeast_SKILL_FLOAT1: new EventScriptQualifier('hasSkillAtLeast_SKILL_FLOAT1'),
    isCurrentState_STATE: new EventScriptQualifier('isCurrentState_STATE'),
    hasMoneyAtLeastAmount_FLOAT: new EventScriptQualifier('hasMoneyAtLeastAmount_FLOAT'),
    hasMoneyLessThanAmount_FLOAT: new EventScriptQualifier('hasMoneyLessThanAmount_FLOAT'),
    hasItem_ITEM: new EventScriptQualifier('hasItem_ITEM'),
    hasGame_GAME: new EventScriptQualifier('hasGame_GAME'),

    // Position checks
    isPlayerStandingInArea_AREA: new EventScriptQualifier('isPlayerStandingInArea_AREA'),
    isEntityStandingInArea_ENTITY_AREA: new EventScriptQualifier('isEntityStandingInArea_ENTITY_AREA'),

    // Time checks
    hourPastOrEqualTo_INT23: new EventScriptQualifier('hourPastOrEqualTo_INT23'),
    hourLessThan_INT23: new EventScriptQualifier('hourLessThan_INT23'),
    minutePastOrEqualTo_INT59: new EventScriptQualifier('minutePastOrEqualTo_INT59'),
    minuteLessThan_INT59: new EventScriptQualifier('minuteLessThan_INT59'),

    // Player properties
    isPlayerMale: new EventScriptQualifier('isPlayerMale'),
    isPlayerFemale: new EventScriptQualifier('isPlayerFemale'),

    // Entity checks
    isEntitySpawned_ENTITY: new EventScriptQualifier('isEntitySpawned_ENTITY'),
    isEntityAtArea_ENTITY_AREA: new EventScriptQualifier('isEntityAtArea_ENTITY_AREA'),
    isAreaEmpty_AREA: new EventScriptQualifier('isAreaEmpty_AREA'),
    isAnyEntityUsingSprite_SPRITE: new EventScriptQualifier('isAnyEntityUsingSprite_SPRITE'),

    // Dialogue
    hasFinishedDialogue_DIALOGUE: new EventScriptQualifier('hasFinishedDialogue_DIALOGUE'),
    isTextBoxOpen: new EventScriptQualifier('isTextBoxOpen'),
    isTextAnswerBoxOpen: new EventScriptQualifier('isTextAnswerBoxOpen'),
    isTextAnswerSelected_INT4: new EventScriptQualifier('isTextAnswerSelected_INT4'),
    isTextAnswerSelected_STRING: new EventScriptQualifier('isTextAnswerSelected_STRING'),

    // Random
    randomEqualsOneOutOfLessThan_INT: new EventScriptQualifier('randomEqualsOneOutOfLessThan_INT'),
    randomEqualsOneOutOfIncluding_INT: new EventScriptQualifier('randomEqualsOneOutOfIncluding_INT'),

    // Audio
    isAnyMusicPlaying: new EventScriptQualifier('isAnyMusicPlaying'),
    isMusicPlaying_MUSIC: new EventScriptQualifier('isMusicPlaying_MUSIC'),

    // Weather
    isRaining: new EventScriptQualifier('isRaining'),
    isWindy: new EventScriptQualifier('isWindy'),
    isSnowing: new EventScriptQualifier('isSnowing'),
    isFoggy: new EventScriptQualifier('isFoggy'),
    isMapOutside: new EventScriptQualifier('isMapOutside'),

    // Social
    hasTalkedToThisToday: new EventScriptQualifier('hasTalkedToThisToday'),

    // Time since flag
    hasBeenMinutesSinceFlagSet_FLAG_INT: new EventScriptQualifier('hasBeenMinutesSinceFlagSet_FLAG_INT'),
    hasBeenHoursSinceFlagSet_FLAG_INT23: new EventScriptQualifier('hasBeenHoursSinceFlagSet_FLAG_INT23'),
    hasBeenDaysSinceFlagSet_FLAG_INT: new EventScriptQualifier('hasBeenDaysSinceFlagSet_FLAG_INT'),

    // Activation state
    isThisActivated: new EventScriptQualifier('isThisActivated'),
    hasActivatedThisEver: new EventScriptQualifier('hasActivatedThisEver'),
    hasActivatedThisSinceEnterRoom: new EventScriptQualifier('hasActivatedThisSinceEnterRoom'),
    hasBeenHereEver: new EventScriptQualifier('hasBeenHereEver'),
    hasBeenHereSinceEnterRoom: new EventScriptQualifier('hasBeenHereSinceEnterRoom'),

    // Light
    isLightOn_LIGHT: new EventScriptQualifier('isLightOn_LIGHT'),
} as const;

// ============================================================
// Commands (actions)
// ============================================================

export const Commands = {
    // Blocking
    blockUntilActionButtonPressed: new EventScriptCommand('blockUntilActionButtonPressed'),
    blockUntilActionCaptionButtonPressed_STRING: new EventScriptCommand('blockUntilActionCaptionButtonPressed_STRING'),
    blockUntilCancelButtonPressed: new EventScriptCommand('blockUntilCancelButtonPressed'),
    blockForTicks_INT: new EventScriptCommand('blockForTicks_INT'),
    blockUntilClockHour_INT23: new EventScriptCommand('blockUntilClockHour_INT23'),
    blockUntilClockMinute_INT59: new EventScriptCommand('blockUntilClockMinute_INT59'),
    alwaysBlockWhileNotStandingHere: new EventScriptCommand('alwaysBlockWhileNotStandingHere'),

    // Map state
    loadMapState_STATE: new EventScriptCommand('loadMapState_STATE'),
    runEvent_EVENT: new EventScriptCommand('runEvent_EVENT'),
    blockUntilEventDone_EVENT: new EventScriptCommand('blockUntilEventDone_EVENT'),
    clearThisEvent: new EventScriptCommand('clearThisEvent'),
    clearEvent_EVENT: new EventScriptCommand('clearEvent_EVENT'),

    // Activation
    setThisActivated_BOOL: new EventScriptCommand('setThisActivated_BOOL'),
    toggleThisActivated: new EventScriptCommand('toggleThisActivated'),
    setLastBeenHereTime: new EventScriptCommand('setLastBeenHereTime'),
    resetLastBeenHereTime: new EventScriptCommand('resetLastBeenHereTime'),

    // Flags & Skills
    setFlag_FLAG_BOOL: new EventScriptCommand('setFlag_FLAG_BOOL'),
    setFlagTrue_FLAG: new EventScriptCommand('setFlagTrue_FLAG'),
    setFlagFalse_FLAG: new EventScriptCommand('setFlagFalse_FLAG'),
    giveSkillPoints_SKILL_INT: new EventScriptCommand('giveSkillPoints_SKILL_INT'),
    removeSkillPoints_SKILL_INT: new EventScriptCommand('removeSkillPoints_SKILL_INT'),
    setSkillPoints_SKILL_INT: new EventScriptCommand('setSkillPoints_SKILL_INT'),

    // Map transitions
    enterThisDoor: new EventScriptCommand('enterThisDoor'),
    enterThisWarp: new EventScriptCommand('enterThisWarp'),
    enterDoor_DOOR: new EventScriptCommand('enterDoor_DOOR'),
    enterWarp_WARP: new EventScriptCommand('enterWarp_WARP'),
    changeMap_MAP_AREA: new EventScriptCommand('changeMap_MAP_AREA'),
    changeMap_MAP_DOOR: new EventScriptCommand('changeMap_MAP_DOOR'),
    changeMap_MAP_WARP: new EventScriptCommand('changeMap_MAP_WARP'),
    changeMap_MAP_INT_INT: new EventScriptCommand('changeMap_MAP_INT_INT'),

    // Dialogue
    doDialogue_DIALOGUE: new EventScriptCommand('doDialogue_DIALOGUE'),
    doDialogueWithCaption_DIALOGUE: new EventScriptCommand('doDialogueWithCaption_DIALOGUE'),
    doDialogueIfNew_DIALOGUE: new EventScriptCommand('doDialogueIfNew_DIALOGUE'),
    blockUntilTextBoxClosed: new EventScriptCommand('blockUntilTextBoxClosed'),
    blockUntilTextAnswerBoxClosed: new EventScriptCommand('blockUntilTextAnswerBoxClosed'),
    doCinematicTextNoBorder_DIALOGUE_INTy: new EventScriptCommand('doCinematicTextNoBorder_DIALOGUE_INTy'),

    // Sprite
    setSpriteBox0_ENTITY: new EventScriptCommand('setSpriteBox0_ENTITY'),
    setSpriteBox1_ENTITY: new EventScriptCommand('setSpriteBox1_ENTITY'),
    setSpriteBox0_SPRITE: new EventScriptCommand('setSpriteBox0_SPRITE'),
    setSpriteBox1_SPRITE: new EventScriptCommand('setSpriteBox1_SPRITE'),

    // Door/Area/Warp
    setDoorOpenAnimation_DOOR_BOOLopenClose: new EventScriptCommand('setDoorOpenAnimation_DOOR_BOOLopenClose'),
    setDoorActionIcon_DOOR_BOOLonOff: new EventScriptCommand('setDoorActionIcon_DOOR_BOOLonOff'),
    setDoorDestination_DOOR_DOORdestination: new EventScriptCommand('setDoorDestination_DOOR_DOORdestination'),
    setAreaActionIcon_AREA_BOOLonOff: new EventScriptCommand('setAreaActionIcon_AREA_BOOLonOff'),
    setWarpDestination_WARP_WARPdestination: new EventScriptCommand('setWarpDestination_WARP_WARPdestination'),

    // Camera
    setCameraNoTarget: new EventScriptCommand('setCameraNoTarget'),
    setCameraTargetToArea_AREA: new EventScriptCommand('setCameraTargetToArea_AREA'),
    setCameraTargetToEntity_ENTITY: new EventScriptCommand('setCameraTargetToEntity_ENTITY'),
    setCameraIgnoreBounds_BOOL: new EventScriptCommand('setCameraIgnoreBounds_BOOL'),
    setCameraTargetToPlayer: new EventScriptCommand('setCameraTargetToPlayer'),
    blockUntilCameraReaches_AREA: new EventScriptCommand('blockUntilCameraReaches_AREA'),
    blockUntilCameraReachesPlayer: new EventScriptCommand('blockUntilCameraReachesPlayer'),
    pushCameraState: new EventScriptCommand('pushCameraState'),
    popCameraState: new EventScriptCommand('popCameraState'),
    setCameraAutoZoomByPlayerMovement_BOOL: new EventScriptCommand('setCameraAutoZoomByPlayerMovement_BOOL'),
    setCameraZoom_FLOAT: new EventScriptCommand('setCameraZoom_FLOAT'),
    setCameraSpeed_FLOAT: new EventScriptCommand('setCameraSpeed_FLOAT'),

    // Player control
    setPlayerControlsEnabled_BOOL: new EventScriptCommand('setPlayerControlsEnabled_BOOL'),
    enablePlayerControls: new EventScriptCommand('enablePlayerControls'),
    disablePlayerControls: new EventScriptCommand('disablePlayerControls'),
    setPlayerAutoPilot_BOOL: new EventScriptCommand('setPlayerAutoPilot_BOOL'),
    setPlayerExists_BOOL: new EventScriptCommand('setPlayerExists_BOOL'),
    setPlayerShowNameCaption_BOOL: new EventScriptCommand('setPlayerShowNameCaption_BOOL'),

    // Player movement
    playerSetToArea_AREA: new EventScriptCommand('playerSetToArea_AREA'),
    playerSetToDoor_DOOR: new EventScriptCommand('playerSetToDoor_DOOR'),
    playerSetToTileXY_INTxTile1X_INTyTile1X: new EventScriptCommand('playerSetToTileXY_INTxTile1X_INTyTile1X'),
    playerWalkToArea_AREA: new EventScriptCommand('playerWalkToArea_AREA'),
    playerWalkToDoor_DOOR: new EventScriptCommand('playerWalkToDoor_DOOR'),
    playerWalkToEntity_ENTITY: new EventScriptCommand('playerWalkToEntity_ENTITY'),
    playerWalkToTileXY_INTxTile1X_INTyTile1X: new EventScriptCommand('playerWalkToTileXY_INTxTile1X_INTyTile1X'),
    playerBlockUntilReachesArea_AREA: new EventScriptCommand('playerBlockUntilReachesArea_AREA'),
    playerWalkToAreaAndBlockUntilThere_AREA: new EventScriptCommand('playerWalkToAreaAndBlockUntilThere_AREA'),
    playerWalkToEntityAndBlockUntilThere_ENTITY: new EventScriptCommand('playerWalkToEntityAndBlockUntilThere_ENTITY'),
    playerWalkToDoorAndBlockUntilThere_DOOR: new EventScriptCommand('playerWalkToDoorAndBlockUntilThere_DOOR'),
    playerStandAndShuffle: new EventScriptCommand('playerStandAndShuffle'),
    playerStandAndShuffleAndFaceEntity_ENTITY: new EventScriptCommand('playerStandAndShuffleAndFaceEntity_ENTITY'),

    // Player animation
    playerDoAnimationByNameOnce_STRINGanimationName_INTticksPerFrame: new EventScriptCommand('playerDoAnimationByNameOnce_STRINGanimationName_INTticksPerFrame'),
    playerDoAnimationByNameLoop_STRINGanimationName_INTticksPerFrame: new EventScriptCommand('playerDoAnimationByNameLoop_STRINGanimationName_INTticksPerFrame'),
    playerStopAnimating: new EventScriptCommand('playerStopAnimating'),
    playerSetMovementSpeed_INTticksPerPixel: new EventScriptCommand('playerSetMovementSpeed_INTticksPerPixel'),
    playerSetFaceMovementDirection_STRINGdirection: new EventScriptCommand('playerSetFaceMovementDirection_STRINGdirection'),
    playerSetToAlpha_FLOAT: new EventScriptCommand('playerSetToAlpha_FLOAT'),

    // Entity control (generic)
    entitySetToArea_ENTITY_AREA: new EventScriptCommand('entitySetToArea_ENTITY_AREA'),
    entitySetToDoor_ENTITY_DOOR: new EventScriptCommand('entitySetToDoor_ENTITY_DOOR'),
    entitySetToTileXY_ENTITY_INTxTile1X_INTyTile1X: new EventScriptCommand('entitySetToTileXY_ENTITY_INTxTile1X_INTyTile1X'),
    entityWalkToArea_ENTITY_AREA: new EventScriptCommand('entityWalkToArea_ENTITY_AREA'),
    entityWalkToDoor_ENTITY_DOOR: new EventScriptCommand('entityWalkToDoor_ENTITY_DOOR'),
    entityWalkToEntity_ENTITY_ENTITY: new EventScriptCommand('entityWalkToEntity_ENTITY_ENTITY'),
    entityWalkToTileXY_ENTITY_INTxTile1X_INTyTile1X: new EventScriptCommand('entityWalkToTileXY_ENTITY_INTxTile1X_INTyTile1X'),
    entityWalkToAreaAndBlockUntilThere_ENTITY_AREA: new EventScriptCommand('entityWalkToAreaAndBlockUntilThere_ENTITY_AREA'),
    entityWalkToEntityAndBlockUntilThere_ENTITY_ENTITY: new EventScriptCommand('entityWalkToEntityAndBlockUntilThere_ENTITY_ENTITY'),
    entityStandAndShuffle_ENTITY: new EventScriptCommand('entityStandAndShuffle_ENTITY'),
    entityStandAndShuffleAndFacePlayer_ENTITY: new EventScriptCommand('entityStandAndShuffleAndFacePlayer_ENTITY'),
    entityStandAndShuffleAndFaceEntity_ENTITY_ENTITY: new EventScriptCommand('entityStandAndShuffleAndFaceEntity_ENTITY_ENTITY'),
    entityDoAnimationByNameOnce_ENTITY_STRINGanimationName_INTticksPerFrame: new EventScriptCommand('entityDoAnimationByNameOnce_ENTITY_STRINGanimationName_INTticksPerFrame'),
    entityDoAnimationByNameLoop_ENTITY_STRINGanimationName_INTticksPerFrame: new EventScriptCommand('entityDoAnimationByNameLoop_ENTITY_STRINGanimationName_INTticksPerFrame'),
    entitySetMovementSpeed_ENTITY_INTticksPerPixel: new EventScriptCommand('entitySetMovementSpeed_ENTITY_INTticksPerPixel'),
    entitySetToAlpha_ENTITY_FLOAT: new EventScriptCommand('entitySetToAlpha_ENTITY_FLOAT'),

    // Cinematics
    screenFadeToColor_COLOR_INTms: new EventScriptCommand('screenFadeToColor_COLOR_INTms'),
    screenFadeFromColor_COLOR_INTms: new EventScriptCommand('screenFadeFromColor_COLOR_INTms'),
    screenSetLetterbox_BOOL_INTms: new EventScriptCommand('screenSetLetterbox_BOOL_INTms'),
    screenSetShake_INTms_INTmaxX_INTmaxY: new EventScriptCommand('screenSetShake_INTms_INTmaxX_INTmaxY'),
    setGameSpeed_FLOAT: new EventScriptCommand('setGameSpeed_FLOAT'),
    blockUntilFadeDone: new EventScriptCommand('blockUntilFadeDone'),

    // Music & Sound
    playMusic_MUSIC_BOOLloop: new EventScriptCommand('playMusic_MUSIC_BOOLloop'),
    playSound_SOUND: new EventScriptCommand('playSound_SOUND'),
    stopMusic: new EventScriptCommand('stopMusic'),
    stopAllSounds: new EventScriptCommand('stopAllSounds'),

    // Money & Items
    giveMoney_FLOAT: new EventScriptCommand('giveMoney_FLOAT'),
    removeMoney_FLOAT: new EventScriptCommand('removeMoney_FLOAT'),
    giveItem_ITEM: new EventScriptCommand('giveItem_ITEM'),
    removeItem_ITEM: new EventScriptCommand('removeItem_ITEM'),

    // Weather
    setRaining_BOOL: new EventScriptCommand('setRaining_BOOL'),
    setWindy_BOOL: new EventScriptCommand('setWindy_BOOL'),
    setSnowing_BOOL: new EventScriptCommand('setSnowing_BOOL'),
    setFoggy_BOOL: new EventScriptCommand('setFoggy_BOOL'),

    // Light
    setLightOn_LIGHT_BOOL: new EventScriptCommand('setLightOn_LIGHT_BOOL'),
    setLightColor_LIGHT_COLOR: new EventScriptCommand('setLightColor_LIGHT_COLOR'),
    setLightRadius_LIGHT_FLOAT: new EventScriptCommand('setLightRadius_LIGHT_FLOAT'),
} as const;

// ============================================================
// Registry
// ============================================================

/** All qualifiers indexed by command name */
export const ALL_QUALIFIERS: Record<string, EventScriptQualifier> = Object.fromEntries(
    Object.entries(Qualifiers).map(([, q]) => [q.getCommand(), q]),
);

/** All commands indexed by command name */
export const ALL_COMMANDS: Record<string, EventScriptCommand> = Object.fromEntries(
    Object.entries(Commands).map(([, c]) => [c.getCommand(), c]),
);
