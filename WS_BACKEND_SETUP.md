# DreamHost Backend Subdomain Setup — `ws.bobsgame.com`

This checklist is the fastest path to getting the multiplayer / Socket.io backend live in production while keeping the static frontend on `bobsgame.com`.

## Goal
- `bobsgame.com` serves the static web app
- `ws.bobsgame.com` serves the Node/Socket.io backend
- frontend build points to `https://ws.bobsgame.com`

## Current Known Facts
- Static frontend on `bobsgame.com` is already live.
- `https://bobsgame.com/socket.io/...` currently returns `404`.
- `server/app.js` now exists as a Passenger-friendly Node startup file.
- Backend now exposes:
  - `GET /` → plain-text running message
  - `GET /healthz` → JSON health payload

## DreamHost Panel Steps
1. Open DreamHost panel.
2. Create a subdomain:
   - **Domain:** `ws.bobsgame.com`
3. Configure it as a website / web directory rooted at:
   - `~/bobsgame.com/server`
4. If DreamHost offers Node/Passenger app settings for the subdomain:
   - choose Node app hosting
   - set startup file to `app.js`
   - set Node version to the newest available version supported by DreamHost

## Remote Files Expected
Under `~/bobsgame.com/server/` you should now have at least:
- `app.js`
- `index.js`
- `package.json`
- `node_modules/` (or install them if missing)

## First Smoke Test
After the subdomain is configured, verify these in a browser or with curl:

```bash
curl -i https://ws.bobsgame.com/
curl -i https://ws.bobsgame.com/healthz
curl -i "https://ws.bobsgame.com/socket.io/?EIO=4&transport=polling"
```

Expected:
- `/` returns `200`
- `/healthz` returns JSON with `ok: true`
- `/socket.io/...` should stop returning Apache `404`

## Frontend Build Command
Once the backend host is live, rebuild the frontend with:

```bash
VITE_SERVER_URL=https://ws.bobsgame.com npm run build
```

Then redeploy the static frontend to `bobsgame.com`.

## If Node Packages Need Install on DreamHost
SSH in and run:

```bash
cd ~/bobsgame.com/server
npm install
```

If `npm` is not in shell PATH but DreamHost Node hosting works through Passenger, use the DreamHost panel tools/documentation for Node app dependency install or locate the full npm path.

## Debugging Guide
### If `/healthz` returns 404
- subdomain is probably serving Apache static files only
- Passenger/Node app is not attached yet

### If `/healthz` returns 500
- Node app is starting but failing during boot
- inspect DreamHost app logs / Passenger logs

### If `/healthz` works but `/socket.io` fails
- Socket.io path/proxying is still not reaching the running server correctly
- verify the Node app is actually using `server/index.js` via `app.js`

## Recommended Sequence
1. Configure `ws.bobsgame.com`
2. Verify `https://ws.bobsgame.com/healthz`
3. Rebuild frontend with `VITE_SERVER_URL=https://ws.bobsgame.com`
4. Redeploy frontend
5. Test multiplayer from `bobsgame.com`
