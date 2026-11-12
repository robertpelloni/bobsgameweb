# bobsgameweb — "okgame", the bob's game puzzle engine (TypeScript/PixiJS)

This repo (package name `okgame`, version 3.0.33 per `package.json`) is the
modern web re-implementation of **bob's game**: a puzzle game engine being
rebuilt in TypeScript on PixiJS, restoring the legacy Java engine into a form
that runs in the browser, in Electron on desktop, and via Capacitor on mobile.

> **Alpha software under construction.** Backwards compatibility is not
> guaranteed; expect breaking changes and bugs.

## Status

**Actively developed in bursts.** Last commit: **2026-11-07** (Jules session
merge; Electron tray/single-instance work and AI proxy dashboard controls in
the days before). The game is not released; there is no public launch date.

Note: bob's game's Kickstarter campaign was a **failure** — it was not
funded. Do not describe it as funded anywhere.

## What's here

- **Engine & game client** — Vite + TypeScript + PixiJS (`src/`), Howler
  for audio
- **AI proxy server** — `server/ai_proxy.js` (Express), a small backend the
  client talks to
- **Desktop** — Electron + electron-builder, with system tray and
  single-instance locking
- **Mobile** — Capacitor
- **Deployment** — scripted deploy to the Hetzner nginx host with automatic
  rollback (`scripts/deploy-with-rollback.sh`); the live site is
  [bobsgame.com](https://bobsgame.com)

This repo is also a git submodule of
[`robertpelloni/bg`](https://github.com/robertpelloni/bg), the umbrella
workspace for all bob's game engines (C++, Java, and this one). The C++
engine lives in `bg`/`okgame`; the original Java engine is
[`robertpelloni/bobsgameonlinejava`](https://github.com/robertpelloni/bobsgameonlinejava).

## What's not

- No released build, no store page, no public playtest.
- The repo carries a lot of working clutter: session markers, per-assistant
  instruction files, deploy runbooks, and one-off replace scripts.

## Commands

```bash
npm install

npm run dev             # Vite dev server
npm run dev:electron    # Vite + Electron together
npm run server          # AI proxy server only

npm run build           # tsc && vite build
npm run build:electron  # production Electron build
npm run preview

npm run lint            # ESLint over src
npm run typecheck       # tsc --noEmit

npm run deploy:hetzner  # deploy with rollback (see DEPLOY.md)
```

Deploy configuration is via environment (`FRONTEND_HOST`, `FRONTEND_USER`,
`BACKEND_URL`, `FRONTEND_URL`) — see `DEPLOY.md` and the Hetzner notes in
the repo.

## Docs in this repo

`VISION.md` (foundational concepts), `ROADMAP.md` (structural milestones),
`TODO.md` (immediate tasks), `MEMORY.md` (architectural observations),
`CHANGELOG.md` (version/recovery history).

## Last significant activity

- **2026-11-07** — Jules session merge; Electron single-instance locking
  and tray notifications; AI proxy status reporting and dashboard controls.
- **2026-11-06** — Electron system tray and consolidated dashboard UI
  (v3.0.13 work); AI proxy ES-module compatibility fixes for Node v22.

## License

SEE LICENSE in package.json — all rights reserved unless a license file in
the repo says otherwise.

## Links

- Game site: https://bobsgame.com
- Author: https://robertpelloni.com
