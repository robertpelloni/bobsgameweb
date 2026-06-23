🛠️ ALPHA SOFTWARE UNDER CONSTRUCTION — Use at your own risk. Backwards compatibility not guaranteed.

# bob's game (okgame) - puzzle game engine

Restoring the legacy Java engine (v8830) into a modern TypeScript/PixiJS puzzle game engine.

## Workflow

### Development
- `npm run dev`: Start local Vite server.
- `npm run dev:electron`: Start local development with Electron.
- `npm run typecheck`: Run TypeScript compiler checks.
- `npm run lint`: Run ESLint.

### Build
- `npm run build`: Compile TypeScript and build for production.
- `npm run build:electron`: Build Electron production assets.

### Deployment (Hetzner)
The primary deployment path is to the Hetzner nginx host using the automated rollback script.

```bash
# Deploy to Hetzner with automatic rollback on failure
FRONTEND_HOST=5.161.250.43 FRONTEND_USER=root BACKEND_URL=https://ws.bobsgame.com FRONTEND_URL=https://bobsgame.com npm run deploy:hetzner
```

## Documentation
- `VISION.md`: Project's ultimate goal and foundational concepts.
- `MEMORY.md`: Architectural observations and design preferences.
- `ROADMAP.md`: Long-term structural milestones.
- `TODO.md`: Immediate bug fixes and explicit tasks.
- `DEPLOY.md`: Detailed deployment and environment setup instructions.
- `CHANGELOG.md`: Version tracking and recovery milestones.
