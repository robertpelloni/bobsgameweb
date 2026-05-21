/**
 * NPCDialogue - Original game dialogue system
 * Loads dialogue data from /game_script.json at runtime.
 */

export interface ParsedDialogue {
  caption: string;
  lines: string[];
  noCancel?: boolean;
}

export interface AreaTrigger {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
  dialogueId: number;
}

interface GameScript {
  version: string;
  dialogues: Record<string, { id: number; name: string; caption: string; rawText?: string; text?: string; lines: string[] }>;
  areaEvents: Record<string, Array<{ areaName: string; x: number; y: number; w: number; h: number; eventType: string; dialogueIds: number[] }>>;
  mapEntities: Record<string, Array<{ name: string; spriteName: string; x: number; y: number }>>;
  npcDialogueMap: Record<string, { name: string; dialogueIds: number[]; lines: string[]; caption: string }>;
  npcDialogues: Record<string, { lines: string[]; caption: string }>;
  areaDialogues: Record<string, { lines: string[]; caption: string }>;
}

let scriptData: GameScript | null = null;
let scriptLoaded = false;

export async function loadGameScript(): Promise<void> {
  if (scriptLoaded) return;
  try {
    const resp = await fetch('/game_script.json');
    if (resp.ok) {
      scriptData = await resp.json();
      const dlgCount = Object.keys(scriptData!.dialogues || {}).length;
      const npcCount = Object.keys(scriptData!.npcDialogues || {}).length;
      const warpCount = Object.values(scriptData!.areaEvents || {}).flat().filter((a: any) => a.eventType === 'warp').length;
      console.log('[NPCDialogue] Loaded:', dlgCount, 'dialogues,', npcCount, 'NPCs,', warpCount, 'warps');
    } else {
      console.warn('[NPCDialogue] Failed to load game_script.json:', resp.status);
    }
  } catch (e) {
    console.warn('[NPCDialogue] Error:', e);
  }
  scriptLoaded = true;
  if (scriptData) {
    const allTriggers: AreaTrigger[] = [];
    for (const mn of Object.keys(scriptData.areaEvents || {})) {
      allTriggers.push(...getAreaTriggersForMap(mn));
    }
    AREA_TRIGGERS = allTriggers;
    console.log('[NPCDialogue] Built', AREA_TRIGGERS.length, 'area triggers');
  }
}

const FALLBACK_DIALOGUE: Record<string, string[]> = {
  mom: ["Yuu! Don't forget to go to school today!", "Did you finish your homework?", "Dinner will be ready at 6.", "Make sure you brush your teeth!"],
  dad: ["Hey sport!", "How was school?", "Did you take out the trash?", "I'm watching the game, shh."],
  hallmonitor: ["Halt! Where's your hall pass?", "No running in the halls!", "...I take my job very seriously.", "Back to class!"],
  nurse: ["Are you feeling okay?", "Here, take this and call your mom.", "The doctor will see you in... 3 hours.", "No, you can't go home."],
  sleazyunclebob: ["Hey there, kiddo!"],
  janitor: ["This job ain't so bad.", "Kids these days...", "Mop mop mop.", "I seen things in this school..."],
  cat: ["Meow.", "*purrs*"],
  momo: ["Woof! Woof woof!"],
  bob: ["I'm Bob. This is my game."],
  bobOLD: ["It's been a long time..."],
  ghost: ["OOOOOooooooo..."],
  alien: ["... beep boop ..."],
  puppy: ["Yip yip!"],
  bird: ["Chirp chirp!"],
  hamster: ["*squeak squeak*"],
  bigdog: ["WOOF WOOF!"],
  chris: ["Hey, what's up?"],
  prostitute: ["Hey there, handsome..."],
  richnerdguy: ["I just bought the new GPU.", "My PC cost more than your car.", "144 FPS, obviously.", "Have you tried turning it off and on again?"],
  trafficcharityguy: ["Excuse me!", "Spare some change?", "Help a guy out?", "God bless you."],
  guitarguy: ["*strums a melancholy tune*", "Wish you were here...", "Know any requests?", "*plays a minor chord*"],
  deliicecreamman: ["Ice cream! Get your ice cream!", "Try our new flavor!", "That'll be .50.", "Brain freeze! Ha!"],
  hotdogvendor: ["Hot dogs! Get your hot dogs here!", "Mustard or ketchup?", "Two dollars each!", "Best dogs in town!"],
  pizzaguy: ["Welcome to Pizza Place!", "Today's special: pepperoni!", "That'll be 2.99.", "Extra cheese? Coming right up!"],
  securityguard: ["Move along.", "Nothing to see here.", "I'll ask the questions.", "Keep your hands where I can see them."],
  convict: ["...", "I didn't do it.", "You got a smoke?", "How many years left..."],
  escapedconvict: ["You didn't see NOTHING, got it?!", "Keep walking, pal.", "I was never here.", "...*runs away*"],
  firefighter: ["Remember: stop, drop, and roll!", "Stay low if there's smoke.", "Never go back into a burning building.", "We rescue cats too, you know."],
  paramedic: ["Is everyone okay?", "On a scale of 1-10, how much does it hurt?", "Stay calm, help is on the way.", "Don't move the injured!"],
  professor: ["Ah, an inquisitive mind!", "The answer is always 42.", "Read chapter 14 for tomorrow.", "There are no stupid questions..."],
  psychiatrist: ["And how does that make you feel?", "Tell me about your childhood.", "Mmm-hmm. Continue.", "That's 00 for today's session."],
  cameraguy: ["Rolling in 3... 2... 1...", "Cut! That was terrible.", "We're live in 5 minutes!", "Get that out of the shot!"],
  newsreportermale: ["This just in!", "We go now to our field reporter.", "More details at 11.", "Breaking news!"],
  newsreporterfemale: ["Reports indicate something strange...", "The situation is developing.", "We're getting conflicting reports.", "Stay tuned for updates."],
  diseased: ["*coughs violently*"],
  crippled: ["Watch out... it's slippery."],
  islandhermit: ["I've been on this island for 37 years..."],
  officeworkerfemale: ["TPS reports are due by Friday.", "Did you get the memo?", "I need more coffee.", "Is it 5 o'clock yet?"],
  officeworkermale: ["Another day in paradise...", "Meeting in 10 minutes.", "Has anyone seen my stapler?", "I'm going to need you to come in on Saturday."],
  fatmeekcoder: ["So I was debugging this race condition..."],
  skinnymeekcoder: ["Just one more feature..."],
  maleangryteacher: ["Sit down and be quiet!", "NO TALKING!", "This will be on the test!", "I SAID SIT DOWN!"],
  femaleangryteacher: ["Open your books to page 394."],
  malesadteacher: ["I just wanted to make a difference..."],
  femalesadteacher: ["They keep cutting the budget..."],
  givenupteacher: ["Just... do whatever."],
  grannycluelessteacher: ["What year is it?"],
  oldmomo: ["*mumbles incoherently*"],
  yuu: ["..."],
  yuurunning: ["Can't talk! Running!"],
  principal: ["Look, kid. I just don't like you, ok?"],
  secretary: ["Hello."],
  baby: ["*gurgles happily*"],
  librarian: ["It's a library!", "Shhhhh!", "Please be quiet.", "Do you have a library card?"],
  pcteacher: ["The cursor was spinning when I got here."],
  friendsmom: ["Hello, dear!"],
  friendsdad: ["Hey there!"],
  youngmom: ["Oh, hello!"],
  youngdad: ["Hey!"],
  crazylady: ["THE VOICES WON'T STOP!"],
 roundBlackGarbageCanOnWheelsFullOfTrash: ["*smells terrible*"],
};

export function getNPCDialogue(spriteName: string): ParsedDialogue | null {
  const cap = spriteName.charAt(0).toUpperCase() + spriteName.slice(1);
  if (scriptData?.npcDialogues?.[spriteName]?.lines?.length) {
    const d = scriptData.npcDialogues[spriteName];
    return { caption: d.caption || cap, lines: d.lines };
  }
  if (scriptData?.npcDialogueMap?.[spriteName]?.lines?.length) {
    const d = scriptData.npcDialogueMap[spriteName];
    return { caption: d.caption || cap, lines: d.lines };
  }
  const fb = FALLBACK_DIALOGUE[spriteName];
  if (fb?.length) return { caption: cap, lines: [fb[Math.floor(Math.random() * fb.length)]] };
  return null;
}

export function hasDialogue(spriteName: string): boolean {
  if (scriptData?.npcDialogues?.[spriteName]?.lines?.length) return true;
  if (scriptData?.npcDialogueMap?.[spriteName]?.lines?.length) return true;
  if (FALLBACK_DIALOGUE[spriteName]?.length) return true;
  return false;
}

export function getAreaDialogue(areaKey: string): ParsedDialogue | null {
  if (scriptData?.areaDialogues?.[areaKey]?.lines?.length) {
    const d = scriptData.areaDialogues[areaKey];
    return { caption: d.caption || '...', lines: d.lines };
  }
  return null;
}

export function hasAreaDialogue(areaKey: string): boolean {
  return !!scriptData?.areaDialogues?.[areaKey]?.lines?.length;
}

export function getAreaTriggersForMap(mapName: string): AreaTrigger[] {
  const triggers: AreaTrigger[] = [];
  if (scriptData?.areaEvents?.[mapName]) {
    for (const area of scriptData.areaEvents[mapName]) {
      if (area.eventType === 'warp') continue;
      if (area.dialogueIds?.length) {
        triggers.push({
          key: mapName + '.' + area.areaName,
          x: area.x, y: area.y, w: area.w, h: area.h,
          dialogueId: area.dialogueIds[0],
        });
      }
    }
  }
  if (scriptData?.areaDialogues) {
    for (const key of Object.keys(scriptData.areaDialogues)) {
      if (!key.startsWith(mapName + '.')) continue;
      if (triggers.some(t => t.key === key)) continue;
      const areaName = key.replace(mapName + '.', '');
      const areaEv = scriptData.areaEvents?.[mapName]?.find(a => a.areaName === areaName);
      triggers.push({
        key,
        x: areaEv?.x ?? 0, y: areaEv?.y ?? 0, w: areaEv?.w ?? 0, h: areaEv?.h ?? 0,
        dialogueId: areaEv?.dialogueIds?.[0] ?? 0,
      });
    }
  }
  return triggers;
}

export function getMapEntities(mapName: string): Array<{ name: string; spriteName: string; x: number; y: number }> {
  return scriptData?.mapEntities?.[mapName] ?? [];
}

export function getWarpAreasForMap(mapName: string): Array<{ areaName: string; x: number; y: number; w: number; h: number }> {
  if (!scriptData?.areaEvents?.[mapName]) return [];
  return scriptData.areaEvents[mapName]
    .filter(a => a.eventType === 'warp')
    .map(a => ({ areaName: a.areaName, x: a.x, y: a.y, w: a.w, h: a.h }));
}


/** Get a parsed dialogue for an original dialogue ID */
export function getOriginalDialogue(id: number): ParsedDialogue | null {
  if (scriptData?.dialogues) {
    const entry = scriptData.dialogues[String(id)];
    if (entry?.lines?.length) {
      return {
        caption: entry.caption || '...',
        lines: entry.lines,
        noCancel: (entry.rawText || entry.text || '').includes('<NOCANCEL>'),
      };
    }
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getDoorAreasForMap(mapName: string): Array<{ areaName: string; x: number; y: number; w: number; h: number; dialogueIds: number[] }> {
  if (!scriptData?.areaEvents?.[mapName]) return [];
  return scriptData.areaEvents[mapName]
    .filter(a => a.eventType === 'door')
    .map(a => ({ areaName: a.areaName, x: a.x, y: a.y, w: a.w, h: a.h, dialogueIds: a.dialogueIds ?? [] }));
}

export let AREA_TRIGGERS: AreaTrigger[] = [];
