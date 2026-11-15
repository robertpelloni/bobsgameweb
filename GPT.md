# GPT.md — OpenAI / Codex Model Instructions

> **Master Governance Reference:** Read and follow **[AGENTS.md](./AGENTS.md)** in full first. All universal repository directives, versioning standards (`VERSION.md`), Hetzner live-only deployment rules, binary retention policies, and documentation mandates live in `AGENTS.md`.

## GPT / Codex-Specific Overrides & Execution Notes
- Do not split settings or menus into nested subpages when they can be consolidated onto the single-page `MainMenuScene.ts` or `SettingsScene.ts` surfaces with `Tooltip` descriptions.
- **No Local Servers:** Never start local Node/Vite/AI servers; deploy and verify directly against live Hetzner (`https://bobsgame.com` and `https://ws.bobsgame.com`) via `./scripts/deploy-with-rollback.sh`.
