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
- a **shared MySQL database** can be used if desired, with app-level table prefixes
- application users can still remain separate per app/service even if the database is shared

Recommended conventions:
- shared database name: `platform_shared`
- `bobsgame` table prefix: `bg_`
- `fwber` table prefix: `fw_`

## Security recommendation
Prefer separate DB users for each app even if they share one database:
- `bg_app` → uses tables prefixed with `bg_`
- `fw_app` → uses tables prefixed with `fw_`

The separation in MySQL is therefore mostly by:
- runtime config
- migration discipline
- table naming conventions

## Provision example
Example SQL template is included here:
- `server/ops/mysql/create-app-db.sql.example`

## Migration flow
### 1. Verify Hetzner MySQL
Run locally:

```bash
BACKEND_HOST=5.161.250.43 BACKEND_USER=root ./scripts/check-mysql-hetzner.sh
```

### 2. Create destination DB/user(s) on Hetzner
Use the example SQL template and create the shared database plus the application users you want.

### 3. Recreate or import schema/data
If there is no meaningful production user data yet, the simplest path is often:
- create the schema fresh on Hetzner
- run app migrations / bootstrap scripts
- skip legacy dump/import entirely

If you do need to import legacy content later, the general pattern is:

```bash
mysqldump -h OLD_MYSQL_HOST -u OLD_USER -p --databases OLD_DATABASE > old_database.sql
mysql -u root -p < old_database.sql
```

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
1. create the shared MySQL database on Hetzner
2. set the namespace/prefix rules (`bg_` / `fw_`)
3. recreate `bobsgame` schema state there first
4. verify app functionality
5. recreate or migrate `fwber`
6. cut over remaining app configs

## Related files
- `REDIS_SHARED_SERVICES.md`
- `POSTGRES_SHARED_SERVICES.md`
- `HETZNER_UNIFIED_STACK_STATUS.md`
- `BACKEND_DEPLOY.md`
- `HETZNER_SETUP.md`
