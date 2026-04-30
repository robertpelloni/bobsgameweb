# Shared PostgreSQL Plan — Hetzner Unified Stack

The Hetzner server (`5.161.250.43`) now has PostgreSQL installed as part of the unified backend stack for `bobsgame` + `fwber`.

## Current observed state
Verified on the Hetzner host:
- PostgreSQL 16 is installed
- `postgresql.service` is enabled
- cluster `postgresql@16-main` is active
- bound to `127.0.0.1:5432` and `::1:5432`
- default auth is local peer + localhost SCRAM

This is a strong default for internal app/database usage on the same VPS.

## Recommended usage model
The current direction is to share a single PostgreSQL server between apps while keeping namespaces separate.

Recommended split:
- **Database**: one shared application database, for example `platform_shared`
- **Schema `bg`**: `bobsgame` tables, views, functions, migrations
- **Schema `fw`**: `fwber` tables, views, functions, migrations

This keeps the host/database count simple while still giving clean separation.

## Role strategy
Recommended roles:
- `bg_app` — runtime app role for `bobsgame`
- `fw_app` — runtime app role for `fwber`

Each role should default to its own schema and use strong passwords if TCP auth is used.

## Connection style
For services running on the Hetzner box itself, prefer localhost:

```txt
postgresql://bg_app:SECRET@127.0.0.1:5432/platform_shared
postgresql://fw_app:SECRET@127.0.0.1:5432/platform_shared
```

## Namespace conventions
Recommended defaults:
- `bobsgame` PostgreSQL schema: `bg`
- `fwber` PostgreSQL schema: `fw`

If a framework insists on one schema only, use schema-qualified migrations or set the search path explicitly.

## Security posture
Current setup is good because:
- PostgreSQL is not publicly exposed
- localhost-only access reduces attack surface
- SCRAM is already configured for host auth

## Provision example
Example SQL template:
- `server/ops/postgres/create-shared-db.sql.example`

## Verification
Use the helper script:

```bash
BACKEND_HOST=5.161.250.43 BACKEND_USER=root ./scripts/check-postgres-hetzner.sh
```
