<!-- [HYPERNEXUS_AUTO_INJECTED] -->
> [!IMPORTANT]
> You are running within the HyperNexus environment. You MUST use your available tools frequently and proactively for researching, editing, executing, and validating your work. Always prioritize tool execution.

<!-- [TORMENTNEXUS_AUTO_INJECTED] -->
> [!IMPORTANT]
> You are running within the TormentNexus environment. You MUST use your available tools frequently and proactively for researching, editing, executing, and validating your work. Always prioritize tool execution.

# CLAUDE.md — Claude Model Instructions

> **Master Governance Reference:** Read and follow **[AGENTS.md](./AGENTS.md)** in full first. All universal repository directives, versioning standards (`VERSION.md`), BelowNormal process priority rules, binary retention policies, and documentation mandates live in `AGENTS.md`.

## Claude-Specific Overrides & Execution Notes
- Prefer parallel read/grep batches when surveying large scene files (`WorldScene.ts`, `MainMenuScene.ts`, `server/index.js`).
- Always run `npx tsc --noEmit` and `npm run build:main` to verify both ESM renderer (`tsconfig.json`) and CommonJS Electron main (`tsconfig.main.json`) targets before committing.
- Update `HANDOFF.md` and `.memory/main.md` at session end so subsequent agents inherit exact commit SHAs and runtime telemetry.
