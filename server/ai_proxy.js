/**
 * Simple Express proxy server to handle Generative AI requests.
 * Securely holds API keys (OpenAI, Stable Diffusion, etc.)
 * and forwards requests from the frontend client.
 */

const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();

app.use(cors());
app.use(express.json());

const PORT = 8080;

// Initialize OpenAI. It expects process.env.OPENAI_API_KEY to be set.
// If it's not set, it will fallback to mock behavior.
let openai = null;
try {
    if (process.env.OPENAI_API_KEY) {
        openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        console.log("[AI Proxy] OpenAI initialized with API Key.");
    } else {
        console.warn("[AI Proxy] Warning: OPENAI_API_KEY not found. Using mock fallback mode.");
    }
} catch (e) {
    console.error("[AI Proxy] Failed to initialize OpenAI:", e);
}

app.post('/api/generate/sprite', async (req, res) => {
    const { prompt } = req.body;
    console.log(`[AI Proxy] Received Text-to-Sprite request: "${prompt}"`);

    if (openai) {
        try {
            // Using DALL-E 3 to generate a pixel art sprite sheet conceptually
            const response = await openai.images.generate({
                model: "dall-e-3",
                prompt: "Create a pixel art sprite sheet on a transparent background for a 2D video game. " + prompt,
                n: 1,
                size: "1024x1024",
                response_format: "b64_json"
            });

            res.json({
                success: true,
                type: 'sprite',
                prompt: prompt,
                message: 'Successfully generated via OpenAI.',
                imageUrl: `data:image/png;base64,${response.data[0].b64_json}`
            });
            return;
        } catch (e) {
            console.error("[AI Proxy] OpenAI API error:", e);
            // Fallthrough to mock
        }
    }

    // Simulate generation time for mock
    await new Promise(resolve => setTimeout(resolve, 1500));

    res.json({
        success: true,
        type: 'sprite',
        prompt: prompt,
        message: 'Mock successful payload from AI Proxy.',
        imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' // 1x1 transparent red pixel mock
    });
});

app.post('/api/generate/tileset', async (req, res) => {
    const { prompt } = req.body;
    console.log(`[AI Proxy] Received Text-to-Tileset request: "${prompt}"`);

    if (openai) {
        try {
            const response = await openai.images.generate({
                model: "dall-e-3",
                prompt: "Create a seamless 2D pixel art tilemap grid for a video game environment. " + prompt,
                n: 1,
                size: "1024x1024",
                response_format: "b64_json"
            });

            res.json({
                success: true,
                type: 'tileset',
                prompt: prompt,
                message: 'Successfully generated via OpenAI.',
                imageUrl: `data:image/png;base64,${response.data[0].b64_json}`
            });
            return;
        } catch (e) {
            console.error("[AI Proxy] OpenAI API error:", e);
            // Fallthrough to mock
        }
    }

    // Simulate generation time for mock
    await new Promise(resolve => setTimeout(resolve, 2000));

    res.json({
        success: true,
        type: 'tileset',
        prompt: prompt,
        message: 'Mock successful payload from AI Proxy.',
        imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' // 1x1 blue pixel mock
    });
});

app.listen(PORT, () => {
    console.log(`[AI Proxy] Server running on http://localhost:${PORT}`);
});
