# Bob's Game Web — Project Roadmap

## Project Purpose
Port the original Java-based "Bob's Game" RPG/puzzle game to a fully featured browser-based experience using TypeScript, PixiJS v8, and an Entity-Component-System (ECS) architecture. The game is deployed to a Hetzner production server.

## Current State (as of commit 4d1468b8)

**Production:** Live at https://bobsgame.com, served from Hetzner at `/srv/www/bobsgame.com`. Backend WebSocket server at https://ws.bobsgame.com (Node.js on port 6065, proxied via nginx on port 443).

**Hit Detection — Just Restored from Java Source:**
- Created `HitDetectionSystem.ts` — a pixel-level hit detection system that exactly mirrors the original Java engine's collision model
- Replaced the old tile-layer heuristic `isHitTile` with Java-accurate:
  - `Map.getHitLayerValueAtPixels(x, y)` — independent int[] hit layer
  - `Entity.checkXYAgainstNonWalkableEntities(x, y)` — entity bounding box collision
  - Direction-specific probe points matching Java's UP/DOWN/LEFT/RIGHT checks
  - `hitLayerEnabled` global toggle, `ignoreHitLayer`, `ignoreHitPlayer`, `nonWalkable` entity properties
- Legacy fallback preserved for maps without utility layers loaded

**Build Configuration Issue:**
- `publicDir: 'data'` in vite.config.ts causes the entire 2.5GB data directory (lancedb, maps) to be copied into dist/renderer
- Deploy scripts that upload the entire dist/ directory timeout on the 2.5GB transfer
- Workaround: only deploy index.html + assets/ (439KB) — the data files are already on the server

**Engine Infrastructure:**
- EngineScene wraps ClientGameEngine with scene-based StateManager
- WorldScene handles RPG map rendering, player movement, collision
- ECS framework with Transform, Sprite, Behavior, Combat, Quest, Inventory, Teleport, Weather, Lighting, Particle components
- Tile-based rendering with dynamic chunk loading, shadow composites
- Legacy map loader for recovered Java map data

**Deployment:**
- Hetzner server at 5.161.250.43
- nginx serves frontend from `/srv/www/bobsgame.com`
- WebSocket backend proxied on ws.bobsgame.com:443 → localhost:6065
- Other services on same server: fwber, AI Hustle Machine, databases (MySQL/PostgreSQL/Redis)
- SSH as root with key-based auth from ~/.ssh

## Key Decisions Made

1. **PixiJS v8** — Chosen as the WebGL/Canvas renderer for browser compatibility and performance
2. **ECS Architecture** — Entity-Component-System for decoupled game logic (World.ts + systems)
3. **Hit Detection from Java Source** — Reimplemented `HitDetectionSystem.ts` matching the original Java engine's pixel-level collision model, not the simplified tile-layer heuristic
4. **Hit Layer as Independent Int Array** — Matches Java's approach: hit layer is loaded separately by MD5 hash, not derived from tile JSON layers
5. **Hybrid Collision** — Primary: pixel-level HitDetectionSystem; fallback: legacy tile-layer heuristic for maps without utility layers
6. **Hetzner Production** — Single VPS hosting both frontend (nginx) and backend (Node.js WebSocket on port 6065)
7. **Submodule Structure** — `bg/` parent repo with `bobsgameweb/` as a git submodule pointing to robertpelloni/bobsgameweb

## Milestones

### Completed
- ✓ Java hit detection system ported to TypeScript (HitDetectionSystem.ts, 4d1468b8)
- ✓ WorldScene.isHitTile updated to use pixel-level collision with legacy fallback
- ✓ PerformanceMonitor created (was missing from repo, causing build failures on fresh clone)
- ✓ Deployment pipeline: commit → push → deploy to Hetzner
- ✓ Port entries added to /etc/services (Hetzner) and Windows services config

### In Progress / Planned
- ⏳ Fix `publicDir: 'data'` issue to exclude lancedb/maps from build output, or update deploy scripts to only upload assets/
- ⏳ Player movement freeze debugging (tile 839 wall markers in map JSON)
- ⏳ Full map traversal testing with new hit detection system
- ⏳ NPC dialogue system integration
- ⏳ Combat system completion
- ⏳ Inventory and quest systems

## Open Questions / Risks

- The `lancedb/` directory at 2.2GB is included in `data/` via `publicDir`. Is it needed in the frontend build? Should it be removed from `publicDir` or excluded?
- The hit layer data (loaded by MD5 hash from cache) — need to verify the data files exist on the server and are properly served
- Entity `nonWalkable`, `ignoreHitLayer`, `ignoreHitPlayer` properties need to be wired up from the entity data model to the HitDetectionSystem's Collider interface
