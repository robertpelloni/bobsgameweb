import { ToastManager } from "../ui/ToastManager";

export class GenerativeAIManager {

    // Configurable endpoint for AI operations.
    // In production, this would point to a local proxy or remote server to protect API keys.
    private static AI_ENDPOINT = "http://localhost:8080/api/generate";

    public static async generateSpriteFromText(prompt: string): Promise<void> {
        console.log(`[GenAI] Starting Text-to-Sprite generation for prompt: "${prompt}"`);
        ToastManager.showInfo(`Initiating AI Sprite generation: ${prompt}`);

        try {
            // Attempt to hit the actual inference endpoint
            const response = await fetch(`${this.AI_ENDPOINT}/sprite`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            ToastManager.showInfo("AI Sprite generation complete!");
            console.log(`[GenAI] Sprite generation finished:`, data);

<<<<<<< HEAD
<<<<<<< HEAD
            // TODO: Process data.imageUrl or data.base64 into the sprite editor canvas
=======
            document.dispatchEvent(new CustomEvent("ai-asset-generated", {
                detail: {
                    type: "sprite",
                    prompt,
                    data: data.imageUrl || data.base64
                }
            }));
>>>>>>> origin/jules-3-0-10-sanitization-and-editor-updates-534417342975684788
=======
            // TODO: Process data.imageUrl or data.base64 into the sprite editor canvas
>>>>>>> origin/jules-3-0-9-engine-sync-12991498515375513677
        } catch (e) {
            console.warn(`[GenAI] Failed to connect to AI backend (${(e as Error).message}). Falling back to mock delay.`);
            ToastManager.showInfo(`AI Connection Failed. Simulating generation...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            ToastManager.showInfo("AI Sprite generation complete! (Mock Fallback)");
        }
    }

    public static async generateTilesetFromText(prompt: string): Promise<void> {
        console.log(`[GenAI] Starting Text-to-Tileset generation for prompt: "${prompt}"`);
        ToastManager.showInfo(`Initiating AI Tileset generation: ${prompt}`);

        try {
            const response = await fetch(`${this.AI_ENDPOINT}/tileset`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            ToastManager.showInfo("AI Tileset generation complete!");
            console.log(`[GenAI] Tileset generation finished:`, data);

<<<<<<< HEAD
<<<<<<< HEAD
            // TODO: Process data into the tilemap editor
=======
            document.dispatchEvent(new CustomEvent("ai-asset-generated", {
                detail: {
                    type: "tileset",
                    prompt,
                    data: data.imageUrl || data.base64 || data
                }
            }));
>>>>>>> origin/jules-3-0-10-sanitization-and-editor-updates-534417342975684788
=======
            // TODO: Process data into the tilemap editor
>>>>>>> origin/jules-3-0-9-engine-sync-12991498515375513677
        } catch (e) {
            console.warn(`[GenAI] Failed to connect to AI backend (${(e as Error).message}). Falling back to mock delay.`);
            ToastManager.showInfo(`AI Connection Failed. Simulating generation...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            ToastManager.showInfo("AI Tileset generation complete! (Mock Fallback)");
        }
    }
<<<<<<< HEAD
<<<<<<< HEAD
=======

    public static async generateDialogue(characterName: string, prompt: string): Promise<void> {
        console.log(`[GenAI] Starting Text-to-Dialogue generation for "${characterName}": "${prompt}"`);
        ToastManager.showInfo(`Generating AI Dialogue for ${characterName}...`);

        try {
            const response = await fetch(`${this.AI_ENDPOINT}/dialogue`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ characterName, prompt })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            ToastManager.showInfo("AI Dialogue generation complete!");

            document.dispatchEvent(new CustomEvent("ai-asset-generated", {
                detail: {
                    type: "dialogue",
                    characterName,
                    prompt,
                    data: data.lines
                }
            }));
        } catch (e) {
            console.warn(`[GenAI] Failed to connect to AI backend (${(e as Error).message}). Falling back to mock delay.`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            ToastManager.showInfo("AI Dialogue generation complete! (Mock Fallback)");

            document.dispatchEvent(new CustomEvent("ai-asset-generated", {
                detail: {
                    type: "dialogue",
                    characterName,
                    prompt,
                    data: [`I am ${characterName}.`, `I don't know what to say about "${prompt}".`, "I'm just a mock."]
                }
            }));
        }
    }

    public static async chatWithNPC(characterName: string, prompt: string, persona?: string, history?: any[]): Promise<string> {
        console.log(`[GenAI] Conversing with "${characterName}": "${prompt}"`);

        try {
            const response = await fetch(`${this.AI_ENDPOINT}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ characterName, prompt, persona, history })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.response;
        } catch (e) {
            console.warn(`[GenAI] Chat failed: ${(e as Error).message}`);
            return `[Connection Error] ${characterName} is speechless.`;
        }
    }
>>>>>>> origin/jules-3-0-10-sanitization-and-editor-updates-534417342975684788
=======
>>>>>>> origin/jules-3-0-9-engine-sync-12991498515375513677
}
