# Shared Redis Plan — Hetzner Realtime Host

The Hetzner server (`5.161.250.43`) is now the right place for shared realtime/event infrastructure used by both **bobsgame** and **fwber**.

## Current observed state
Verified on the Hetzner host:
- `redis-server` is installed
- `redis-server` is active
- bound only to `127.0.0.1:6379` and `::1:6379`
- `protected-mode yes`
- `redis-cli ping` returns `PONG`

This is already a good default for an internal shared Redis.

## Recommended usage model
Because multiple apps/services will share Redis on the same host, use separate logical DB indexes by responsibility.

Suggested split:
- **DB 0** — `bobsgame` websocket / matchmaking / ephemeral shared state
- **DB 1** — `fwber` websocket / Mercure / Reverb / pub-sub-related state
- **DB 2** — shared rate limits / locks / cross-service transient coordination (optional)
- **DB 3+** — reserved for future growth

## Recommended connection style
For services running on the Hetzner box itself, use localhost:

```txt
redis://127.0.0.1:6379/0
redis://127.0.0.1:6379/1
```

Examples:
- `bobsgame` → `redis://127.0.0.1:6379/0`
- `fwber` realtime side → `redis://127.0.0.1:6379/1`

## Security posture
Current setup is good because:
- Redis is not publicly exposed
- nginx handles public traffic separately
- services on the VPS can still use Redis over localhost

## Optional future hardening
Not required immediately, but worth considering later:
- configure `maxmemory` + eviction policy if cache-like usage grows
- add `requirepass` only if you later need to support non-local clients or stronger local auth separation
- enable AOF persistence if the Redis usage evolves from ephemeral coordination into durability-sensitive data

## Operational reminder
Redis here should primarily be treated as:
- shared transient state
- pub/sub
- caches
- coordination

Keep canonical durable data in MySQL / persistent stores unless the design explicitly requires Redis durability.

## Verification
Use the helper script:

```bash
BACKEND_HOST=5.161.250.43 BACKEND_USER=root ./scripts/check-redis-hetzner.sh
```
