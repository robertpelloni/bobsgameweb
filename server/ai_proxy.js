/**
 * Simple Express proxy server to handle Generative AI requests.
 * In a real production environment, this securely holds API keys (OpenAI, Stable Diffusion, etc.)
 * and forwards requests from the frontend client.
 */

const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const PORT = 8080;

app.post('/api/generate/sprite', async (req, res) => {
    const { prompt } = req.body;
    console.log(`[AI Proxy] Received Text-to-Sprite request: "${prompt}"`);

    // Simulate generation time
    await new Promise(resolve => setTimeout(resolve, 1500));

    // In production, this calls OpenAI DALL-E 3 or Stable Diffusion:
    // const aiResponse = await fetch('https://api.openai.com/v1/images/generations', { ... });

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

    // Simulate generation time
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
