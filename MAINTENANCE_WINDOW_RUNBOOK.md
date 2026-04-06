# Maintenance Window Runbook — bobsgameweb Backend Restart

This runbook is the top-level orchestration guide for the future allowed restart of the `bobsgameweb-server` backend.

It is intentionally split into clear phases so operators can:
- capture the exact pre-maintenance state
- dry-run the planned restart sequence
- execute the restart only when explicitly allowed
- compare before/after state
- confirm runtime drift is resolved
- verify the public production stack after the restart

> **Important:** This document describes the future maintenance-window workflow. It does **not** imply that a restart should happen right now.

---

## Current Known Baseline
As of the current audited state:
- local tracked backend source is newer than the running backend process
- backend files on disk on Hetzner are aligned to tracked source
- the running backend process still serves an older `/healthz` version until a restart is performed
- the public frontend on `bobsgame.com` is already pointed at `https://ws.bobsgame.com`

That means the restart window is now primarily about collapsing **runtime drift**, not fixing filesystem drift.

---

## Phase 1 — Capture Pre-Restart Snapshot
Before touching the running service, capture a read-only snapshot.

```bash
BACKEND_HOST=5.161.250.43 \
BACKEND_URL=https://ws.bobsgame.com \
EXPECTED_BACKEND_VERSION=2.1.52 \
SNAPSHOT_FILE=artifacts/pre-restart-2.1.52.txt \
./scripts/snapshot-backend-restart-readiness.sh
```

This records:
- backend drift audit
- backend health snapshot
- current runtime version from `/healthz`
- current systemd service status
- current journal tail
- current public frontend asset refs
- current main/pixi asset names
- current backend-origin marker inside the live main bundle

### Success criteria
- snapshot file is written successfully
- backend is currently healthy enough to serve `/`, `/healthz`, and Socket.io polling
- service is `active/running`

---

## Phase 2 — Dry-Run the Restart Workflow
Before the real restart, run the dry-run helper.

```bash
BACKEND_HOST=5.161.250.43 \
BACKEND_URL=https://ws.bobsgame.com \
EXPECTED_BACKEND_VERSION=2.1.52 \
./scripts/run-backend-maintenance-restart.sh
```

This should:
- rerun the drift audit
- confirm the expected backend version target
- stop short of restarting because `EXECUTE_BACKEND_RESTART=1` is **not** set

### Success criteria
- dry-run completes cleanly
- no restart is performed
- output clearly shows the exact execute command for the real maintenance step

---

## Phase 3 — Execute the Restart Only When Explicitly Allowed
When the maintenance window is truly open and restart is allowed, run:

```bash
BACKEND_HOST=5.161.250.43 \
BACKEND_URL=https://ws.bobsgame.com \
EXPECTED_BACKEND_VERSION=2.1.52 \
EXECUTE_BACKEND_RESTART=1 \
./scripts/run-backend-maintenance-restart.sh
```

This performs:
1. pre-restart drift audit
2. `systemctl restart bobsgameweb-server`
3. strict backend runtime version check
4. post-restart drift audit
5. optional full production stack verification

### Success criteria
- strict backend check passes without `ALLOW_BACKEND_RUNTIME_DRIFT=1`
- `/healthz` reports `2.1.52`
- post-restart drift audit shows:
  - local source = remote files = running process

---

## Phase 4 — Compare Snapshot vs Current State
After the restart, compare the saved snapshot to the new live state.

```bash
SNAPSHOT_FILE=artifacts/pre-restart-2.1.52.txt \
BACKEND_HOST=5.161.250.43 \
BACKEND_URL=https://ws.bobsgame.com \
EXPECTED_BACKEND_VERSION=2.1.52 \
./scripts/compare-backend-restart-snapshot.sh
```

This should highlight:
- runtime version changed from the old value to `2.1.52`
- `MainPID` changed
- `ExecMainStartTimestamp` changed
- service remained `active/running`
- public frontend asset stability (or intentional change, if frontend was also redeployed)

### Success criteria
- runtime version changed since snapshot
- `MainPID` changed since snapshot
- current runtime version matches `2.1.52`
- service remains healthy

---

## Phase 5 — Strict Backend Health Verification
Run the backend checker in strict mode.

```bash
BACKEND_URL=https://ws.bobsgame.com \
EXPECTED_BACKEND_VERSION=2.1.52 \
./scripts/check-backend-host.sh
```

### Success criteria
- `/` returns `200`
- `/healthz` returns `200`
- `/healthz` reports `2.1.52`
- Socket.io polling returns `200`
- no drift-tolerance flag is required

---

## Phase 6 — Full Public Production Verification
Finish with the full production stack verifier in strict mode.

```bash
BACKEND_URL=https://ws.bobsgame.com \
EXPECTED_BACKEND_VERSION=2.1.52 \
FRONTEND_URL=https://bobsgame.com \
./scripts/verify-production-stack.sh
```

This verifies:
- backend health
- backend version alignment
- frontend asset refs
- backend-origin embedding
- editor markers
- lazy runtime chunk families

### Success criteria
- full verifier passes without `ALLOW_BACKEND_RUNTIME_DRIFT=1`
- public site still serves the intended frontend build
- public bundle still points at `https://ws.bobsgame.com`

---

## If the Restart Fails
If the restart does not come back healthy:

1. collect diagnostics
   ```bash
   BACKEND_HOST=5.161.250.43 BACKEND_USER=root DOMAIN_NAME=ws.bobsgame.com ./scripts/collect-backend-diagnostics.sh
   ```
2. review `BACKEND_RECOVERY.md`
3. compare the pre-restart snapshot against the broken post-restart state
4. decide whether to:
   - fix permissions/config and restart again, or
   - roll back backend files if a specific regression is identified

---

## Minimal Command Checklist
If you just need the condensed operator sequence:

```bash
# 1) snapshot before restart
BACKEND_HOST=5.161.250.43 BACKEND_URL=https://ws.bobsgame.com EXPECTED_BACKEND_VERSION=2.1.52 SNAPSHOT_FILE=artifacts/pre-restart-2.1.52.txt ./scripts/snapshot-backend-restart-readiness.sh

# 2) dry-run the maintenance helper
BACKEND_HOST=5.161.250.43 BACKEND_URL=https://ws.bobsgame.com EXPECTED_BACKEND_VERSION=2.1.52 ./scripts/run-backend-maintenance-restart.sh

# 3) actual restart, only when explicitly allowed
BACKEND_HOST=5.161.250.43 BACKEND_URL=https://ws.bobsgame.com EXPECTED_BACKEND_VERSION=2.1.52 EXECUTE_BACKEND_RESTART=1 ./scripts/run-backend-maintenance-restart.sh

# 4) compare before vs after
SNAPSHOT_FILE=artifacts/pre-restart-2.1.52.txt BACKEND_HOST=5.161.250.43 BACKEND_URL=https://ws.bobsgame.com EXPECTED_BACKEND_VERSION=2.1.52 ./scripts/compare-backend-restart-snapshot.sh

# 5) strict backend verification
BACKEND_URL=https://ws.bobsgame.com EXPECTED_BACKEND_VERSION=2.1.52 ./scripts/check-backend-host.sh

# 6) strict full production verification
BACKEND_URL=https://ws.bobsgame.com EXPECTED_BACKEND_VERSION=2.1.52 FRONTEND_URL=https://bobsgame.com ./scripts/verify-production-stack.sh
```

---

## Operational Principle
The maintenance window should be considered complete only when:
- snapshot exists
- restart occurred intentionally
- comparison confirms expected movement
- strict backend verification passes
- strict full production verification passes

Until then, treat the restart as incomplete.
