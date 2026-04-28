import { ToastManager } from "../ui/ToastManager";

export class GenerativeAIManager {

    public static async generateSpriteFromText(prompt: string): Promise<void> {
        console.log(`[GenAI] Starting Text-to-Sprite generation for prompt: "${prompt}"`);
        ToastManager.showInfo(`Initiating AI Sprite generation: ${prompt}`);

        // TODO: Hook up to actual inference endpoint (e.g. OpenAI DALL-E, local Stable Diffusion, etc.)
        // For now, simulate network latency
        await new Promise(resolve => setTimeout(resolve, 2000));

        ToastManager.showInfo("AI Sprite generation complete! (Mock)");
        console.log(`[GenAI] Mock Sprite generation finished.`);
    }

    public static async generateTilesetFromText(prompt: string): Promise<void> {
        console.log(`[GenAI] Starting Text-to-Tileset generation for prompt: "${prompt}"`);
        ToastManager.showInfo(`Initiating AI Tileset generation: ${prompt}`);

        // TODO: Hook up to actual inference endpoint
        await new Promise(resolve => setTimeout(resolve, 2000));

        ToastManager.showInfo("AI Tileset generation complete! (Mock)");
        console.log(`[GenAI] Mock Tileset generation finished.`);
    }
}
