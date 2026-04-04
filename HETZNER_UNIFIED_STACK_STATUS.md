# Hetzner Unified Stack Status — Live Verification Snapshot

This document captures the **actual observed state** of the Hetzner consolidation effort for `bobsgame` + `fwber`.

## Target direction
Hetzner is becoming the primary host for:
- web backends
- websocket/realtime services
- Redis
- MySQL
- PostgreSQL
- TLS termination via nginx

The only planned exception is the `fwber` frontend, which remains on Vercel.

## Verified infrastructure state
Observed on `5.161.250.43`:
- `nginx` active on `:80` and `:443`
- `redis-server` active on `127.0.0.1:6379`
- `mysql` active on `127.0.0.1:3306`
- `postgresql@16-main` active on `127.0.0.1:5432`
- `bobsgameweb-server` active on `127.0.0.1:6065`
- additional fwber services present:
  - `fwber-queue.service`
  - `fwber-reverb.service`
  - `fwber-geo.service`

## Domain / endpoint status matrix
### `ws.bobsgame.com`
- DNS on public resolver: `5.161.250.43`
- TLS cert present on Hetzner
- `https://ws.bobsgame.com/` → `200 OK`
- `https://ws.bobsgame.com/healthz` → `200 OK`
- `https://ws.bobsgame.com/socket.io/?EIO=4&transport=polling` → `200 OK`
- status: **working**

### `bobsgame.com`
- public DNS check from `dns.google` during this snapshot did **not** return an `A`/`CNAME` answer
- separate earlier cutover work successfully rebuilt the frontend against `https://ws.bobsgame.com`
- if the apex is now meant to live on Hetzner instead of DreamHost, nginx/site config + public DNS should be verified explicitly
- status: **needs explicit DNS/web serving verification**

### `fwber.me`
- public DNS currently resolves to non-Hetzner addresses
- HTTPS response is served by **Vercel**
- this matches the current plan that the fwber frontend remains on Vercel
- status: **working as Vercel frontend**

### `api.fwber.me`
- public DNS: `5.161.250.43`
- TLS cert present on Hetzner
- `https://api.fwber.me/up` → `200 OK`
- `https://api.fwber.me/` → `500 Internal Server Error`
- the service is alive enough to answer `/up`, but the root app route still has an application-level failure
- status: **partially working; app/root route still broken**

### `ws.fwber.me`
- public DNS: `5.161.250.43`
- TLS cert present on Hetzner
- `https://ws.fwber.me` → `404 Not Found`
- `fwber-reverb.service` exists and is running, so the current problem is likely nginx upstream routing/path alignment rather than total service absence
- status: **service exists, public route not wired correctly yet**

### `mercure.fwber.me`
- public DNS: `5.161.250.43`
- no cert directory was observed during this snapshot
- `https://mercure.fwber.me/.well-known/mercure` → `502 Bad Gateway`
- status: **broken upstream / not fully provisioned**

## TLS inventory observed on Hetzner
Present in `/etc/letsencrypt/live/`:
- `ws.bobsgame.com`
- `api.fwber.me`
- `ws.fwber.me`
- `geo.fwber.me`

Not observed in the same directory during this snapshot:
- `mercure.fwber.me`
- `bobsgame.com`
- `fwber.me`

## Shared datastore status
### Redis
- installed
- active
- localhost-only
- protected mode enabled
- recommended namespace model: key prefixes like `bg:*` and `fw:*`

### MySQL
- installed
- active
- localhost-only
- current project direction: shared MySQL server with app-level table prefixes, e.g. `bg_` and `fw_`

### PostgreSQL
- installed during this consolidation session
- cluster `16/main` active
- localhost-only
- recommended separation model: shared DB with schemas `bg` and `fw`

## Most important conclusion
The Hetzner box is already a real unified backend platform, not just a planned one:
- `ws.bobsgame.com` is live and healthy
- Redis/MySQL/Postgres are all present locally
- fwber backend services already exist on the machine

The remaining work is mostly **routing, application configuration, and apex-domain cutover cleanup**, not foundational infrastructure.

## Recommended next actions
1. verify where `bobsgame.com` apex should terminate now that DNS is being moved to Hetzner
2. create a Hetzner nginx/site plan for `bobsgame.com` if the static frontend is leaving DreamHost
3. fix `api.fwber.me` root-route application error while preserving `/up`
4. fix `ws.fwber.me` nginx/upstream routing to the running Reverb service
5. fix the `mercure.fwber.me` upstream and TLS/proxy path
6. formalize shared namespace conventions in app env/configs:
   - Redis prefixes: `bg:` / `fw:`
   - MySQL table prefixes: `bg_` / `fw_`
   - PostgreSQL schemas: `bg` / `fw`
