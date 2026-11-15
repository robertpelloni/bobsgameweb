# GitHub Copilot Instructions (`bobsgameweb`)

> **Master Governance Reference:** Always read and obey **[AGENTS.md](./AGENTS.md)** as the single source of truth for architectural rules, commenting depth, `VERSION.md` synchronization, and submodule hygiene.

## Quick Copilot Checklist
- **UI Architecture**: Maintain consolidated single-page surfaces (`src/renderer/scenes/MainMenuScene.ts`, `src/renderer/scenes/SettingsScene.ts`) with visible inline descriptions and `Tooltip` (`ⓘ`) wiring on every interactive control.
- **TypeScript Targets**: Renderer code compiles under `tsconfig.json` (ESM/Vite); Electron main & preload compile under `tsconfig.main.json` (`CommonJS` -> `dist/main/`).
- **Version Single Source**: Never hardcode version numbers in UI scenes; import `APP_VERSION` from `src/shared/Config.ts` (populated from `VERSION.md`).
