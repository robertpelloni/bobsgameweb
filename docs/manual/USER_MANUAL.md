# bob's game (okgame) — User Manual

Welcome to the ultimate version of 'bob's game'. This manual covers the modern engine's new features and tools.

## 🎮 Basic Controls

| Action | Keyboard | Gamepad |
| :--- | :--- | :--- |
| Move | WASD / Arrows | Left Stick / D-Pad |
| Interact / Confirm | Space / E | A Button |
| Cancel / Back | Escape / Backspace | B Button |
| Sprint | Left Shift | R2 / RT |
| Inventory | I | Y Button |
| Quest Log | Q | X Button |
| Debug Console | ` (Tilde) | - |
| Toggle Visualizer | V | - |

## 🌟 Modern Features

### AI NPC Chat
Engage in real-time conversations with inhabitants of the RPG world.
- Walk up to an NPC and press **E**.
- Select the **[AI] Chat** option when prompted.
- Type your message and hit Enter to receive a context-aware response from the AI.

### Audio Visualization
The game features advanced audio reactives and visualizers.
- **FFT Backgrounds**: The main menu reacts to the music's frequency spectrum. Toggle modes with the **V** key.
- **Full Visualizer**: Access the 'Audio Visualizer' from the main menu for a full-screen ProjectM/Milkdrop experience.
- **Reactive Lighting**: Ambient lights in the RPG world pulse subtly in sync with the background music's bass.

### High-Performance Graphics
- **WebGPU Acceleration**: If your hardware supports it, the engine uses WGSL Compute Shaders for massive particle effects. Toggle this in the **Options** menu.
- **HQ2X Upscaling**: Enable **HD Sprites** in Options to see character sprites upscaled with an edge-aware algorithm for a smoother look.

## 🛠️ Creator Tools

### Map Editor
Generate entire tilesets using text prompts.
- Go to the **AI GEN** tab in the Map Editor.
- Enter a prompt (e.g., "sci-fi metal floor") and click **Generate**.
- The engine auto-slices the result into 8x8 tiles for immediate use.

### World Editor
Create deep personas for your NPCs.
- Add an actor to the database.
- Click **Interactions** and choose **AI Generate Persona**.
- Describe the character's personality to auto-generate lines of dialogue and a behavior profile.

### Sprite Editor
Create and export pixel art.
- Use **HQ2X (H)** to export a high-quality upscaled version of your 16x16 creations.
