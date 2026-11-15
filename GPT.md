# GPT.md — OpenAI / Codex Model Instructions

> **Master Governance Reference:** Read and follow **[AGENTS.md](./AGENTS.md)** in full first. All universal repository directives, versioning standards (`VERSION.md`), BelowNormal process priority rules, binary retention policies, and documentation mandates live in `AGENTS.md`.

## GPT / Codex-Specific Overrides & Execution Notes
- Do not split settings or menus into nested subpages when they can be consolidated onto the single-page `MainMenuScene.ts` or `SettingsScene.ts` surfaces with `Tooltip` descriptions.
- Use `scripts/local-ops.ps1` (Windows) to start, probe, tail logs, and cleanly stop owned local services (`6065`, `6066`, `3000`, `electron`) at `BelowNormal` priority.
