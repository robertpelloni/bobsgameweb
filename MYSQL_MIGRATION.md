# MySQL Migration Plan — DreamHost to Hetzner

## Current direction
The architecture is moving toward:
- **Hetzner** as the long-running backend host
- **Hetzner MySQL** as the main database host
- **DreamHost** no longer being the long-term database home

At the time of writing, Hetzner already has:
- MySQL installed
- MySQL active
- bound to `127.0.0.1:3306`

That is a strong starting point.

## Recommended end state
- `bobsgame` backend services connect to local Hetzner MySQL
- `fwber` backend services that move to Hetzner connect to the same MySQL host via localhost
- databases remain separated logically, e.g.:
  - `bobsgame`
  - `fwber`
- application users remain separate per app/service

## Security recommendation
Prefer separate DB users for each app:
- `bobsgame_user` → `bobsgame` DB
- `fwber_user` → `fwber` DB

Do not share one DB user across everything unless absolutely necessary.

## Provision example
Example SQL template is included here:
- `server/ops/mysql/create-app-db.sql.example`

## Migration flow
### 1. Verify Hetzner MySQL
Run locally:

```bash
BACKEND_HOST=5.161.250.43 BACKEND_USER=root ./scripts/check-mysql-hetzner.sh
```

### 2. Create destination DBs/users on Hetzner
Use the example SQL template and create real DB/user pairs.

### 3. Export data from DreamHost MySQL
General pattern:

```bash
mysqldump -h OLD_MYSQL_HOST -u OLD_USER -p --databases OLD_DATABASE > old_database.sql
```

### 4. Import on Hetzner
General pattern on the Hetzner server:

```bash
mysql -u root -p < old_database.sql
```

Or import directly into the target DB.

### 5. Update backend app configs
Change application DB hosts to the Hetzner-local database location.
For services running on the same Hetzner box, use:
- `127.0.0.1`
- or local socket/localhost depending on the runtime

### 6. Verify app-level DB usage
After migration, verify:
- app can connect
- reads work
- writes work
- schema-dependent features function

## Suggested sequencing
1. Migrate `bobsgame` DB first or whichever is simplest
2. verify app functionality
3. migrate `fwber`
4. cut over remaining app configs
5. keep DreamHost DB as fallback until confidence is high

## Related files
- `REDIS_SHARED_SERVICES.md`
- `BACKEND_DEPLOY.md`
- `HETZNER_SETUP.md`
