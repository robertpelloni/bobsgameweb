/**
 * EventScript — Simplified event script interpreter
 * Supports the most common patterns from the original game:
 * - if(isPlayerTouchingThisArea() == TRUE){enterThisWarp}
 * - if(isPlayerTouchingThisArea() == TRUE){doDialogueWithCaption(DIALOGUE.N)}
 * - if(isFlagSet(FLAG.N) == TRUE/FALSE){...}
 * - if(isActionButtonHeld() == TRUE){...}
 */

import { FlagManager } from './FlagManager';
import { DialogueTracker } from './DialogueTracker';
import { getOriginalDialogue } from '../map/NPCDialogue';

export interface EventContext {
  playerX: number;
  playerY: number;
  areaX: number;
  areaY: number;
  areaW: number;
  areaH: number;
  actionButtonHeld: boolean;
  showDialogue: (lines: string[], caption?: string) => void;
  enterWarp: (destMap: string, destX: number, destY: number) => void;
  setFlag: (flagId: number, value: boolean) => void;
}

/** Parse and execute an event script string */
export function executeEventScript(script: string, ctx: EventContext): boolean {
  // Remove outer braces if present
  let text = script.trim();
  if (text.startsWith('{') && text.endsWith('}')) {
    text = text.slice(1, -1);
  }

  return executeBlock(text, ctx);
}

/** Execute a block of event commands */
function executeBlock(block: string, ctx: EventContext): boolean {
  let pos = 0;
  while (pos < block.length) {
    const remaining = block.slice(pos);

    // Check for if() qualifier
    const ifMatch = remaining.match(/^if\(([^)]+)\)\s*==\s*(TRUE|FALSE)\s*\{/);
    if (ifMatch) {
      const qualifier = ifMatch[1];
      const expectedResult = ifMatch[2] === 'TRUE';
      const conditionStart = pos + ifMatch[0].length;

      // Find matching closing brace
      const braceEnd = findMatchingBrace(block, conditionStart - 1);
      if (braceEnd < 0) return false;

      const conditionBlock = block.slice(conditionStart, braceEnd);
      const conditionResult = evaluateQualifier(qualifier, ctx);

      if (conditionResult === expectedResult) {
        executeBlock(conditionBlock, ctx);
      }

      pos = braceEnd + 1;
      // Skip any else-if blocks
      continue;
    }

    // Check for command
    const cmdMatch = remaining.match(/^([a-zA-Z]+)(?:\(([^)]*)\))?\s*[,}]/);
    if (cmdMatch) {
      const cmd = cmdMatch[1];
      const args = cmdMatch[2] || '';
      executeCommand(cmd, args, ctx);
      pos += cmdMatch[0].length;
      continue;
    }

    // Skip unrecognized content
    pos++;
  }

  return true;
}

/** Find matching closing brace */
function findMatchingBrace(text: string, openPos: number): number {
  let depth = 1;
  let pos = openPos + 1;
  while (pos < text.length && depth > 0) {
    if (text[pos] === '{') depth++;
    if (text[pos] === '}') depth--;
    pos++;
  }
  return depth === 0 ? pos - 1 : -1;
}

/** Evaluate a qualifier condition */
function evaluateQualifier(qualifier: string, ctx: EventContext): boolean {
  if (qualifier === 'isPlayerTouchingThisArea()') {
    return ctx.playerX >= ctx.areaX && ctx.playerX < ctx.areaX + ctx.areaW &&
           ctx.playerY >= ctx.areaY && ctx.playerY < ctx.areaY + ctx.areaH;
  }

  if (qualifier === 'isActionButtonHeld()') {
    return ctx.actionButtonHeld;
  }

  const flagMatch = qualifier.match(/isFlagSet\(FLAG\.(\d+)\)/);
  if (flagMatch) {
    return FlagManager.isFlagSet(parseInt(flagMatch[1]));
  }

  const dialogueDoneMatch = qualifier.match(/hasFinishedDialogue\(DIALOGUE\.(\d+)\)/);
  if (dialogueDoneMatch) {
    return DialogueTracker.isDone(parseInt(dialogueDoneMatch[1]));
  }

  return false;
}

/** Execute a single event command */
function executeCommand(cmd: string, args: string, ctx: EventContext): void {
  // enterThisWarp
  if (cmd === 'enterThisWarp') {
    // Warp is handled by the area system - just signal it
    // The actual warp data comes from the area's destination fields
    return;
  }

  // doDialogue(DIALOGUE.N)
  const dialogueMatch = cmd.match(/^doDialogue$/) || cmd.match(/^doDialogueWithCaption$/);
  if (dialogueMatch && args) {
    const dlgMatch = args.match(/DIALOGUE\.(\d+)/);
    if (dlgMatch) {
      const dlgId = parseInt(dlgMatch[1]);
      const dialogue = getOriginalDialogue(dlgId);
      if (dialogue) {
        ctx.showDialogue(dialogue.lines, dialogue.caption);
        DialogueTracker.setDone(dlgId);
      }
    }
    return;
  }

  // doDialogueIfNew - only show if not seen before
  if (cmd === 'doDialogueIfNew' && args) {
    const dlgMatch = args.match(/DIALOGUE\.(\d+)/);
    if (dlgMatch) {
      const dlgId = parseInt(dlgMatch[1]);
      if (!DialogueTracker.isDone(dlgId)) {
        const dialogue = getOriginalDialogue(dlgId);
        if (dialogue) {
          ctx.showDialogue(dialogue.lines, dialogue.caption);
          DialogueTracker.setDone(dlgId);
        }
      }
    }
    return;
  }

  // setFlagTrue(FLAG.N) / setFlagFalse(FLAG.N)
  if (cmd === 'setFlagTrue' || cmd === 'setFlag') {
    const flagMatch = args.match(/FLAG\.(\d+)/);
    if (flagMatch) {
      const flagId = parseInt(flagMatch[1]);
      ctx.setFlag(flagId, true);
      FlagManager.setFlag(flagId, true);
    }
    return;
  }

  if (cmd === 'setFlagFalse') {
    const flagMatch = args.match(/FLAG\.(\d+)/);
    if (flagMatch) {
      const flagId = parseInt(flagMatch[1]);
      ctx.setFlag(flagId, false);
      FlagManager.setFlag(flagId, false);
    }
    return;
  }

  // setDialogueDone(DIALOGUE.N)
  if (cmd === 'setDialogueDone' && args) {
    const dlgMatch = args.match(/DIALOGUE\.(\d+)/);
    if (dlgMatch) {
      DialogueTracker.setDone(parseInt(dlgMatch[1]));
    }
    return;
  }

  // changeMap(MAP, x, y)
  if (cmd === 'changeMap' && args) {
    const parts = args.split(',').map(s => s.trim());
    if (parts.length >= 3) {
      const mapName = parts[0];
      const x = parseInt(parts[1]) || 0;
      const y = parseInt(parts[2]) || 0;
      ctx.enterWarp(mapName, x, y);
    }
    return;
  }

  // Unknown command - silently skip
  console.log(`[EventScript] Unknown command: ${cmd}(${args})`);
}
