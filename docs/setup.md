# Setup — first run on a clean machine

Written for a teammate who has **never run this project**. Commands are shown for
**Windows PowerShell** first; a short Linux/macOS note follows each step where the
command differs.

> **Note on code blocks:** blocks tagged `bash` are Linux/macOS. Windows PowerShell
> users should follow the PowerShell variants given in this file.

What you will end up with:

| Process | URL | Terminal |
|---|---|---|
| PostgreSQL | `localhost:5432` | Docker or native service |
| Backend (Spring Boot) | <http://localhost:8080> | terminal 1 |
| Frontend (Vite dev server) | <http://localhost:5173> | terminal 2 |

Related reading: [architecture.md](architecture.md) · [api-contract.md](api-contract.md) ·
[database.md](database.md) · [base-files.md](base-files.md) · [verification.md](verification.md)

---

## 1. Get the code

**From git:**

```powershell
git clone <repository-url> smartbuild
Set-Location smartbuild
```

**From the Base-v1 zip:** extract it anywhere without spaces in the path, then:

```powershell
Set-Location <extracted-folder>
```

You should now see `README.md`, `.env.example`, `backend/`, `frontend/` and `docs/`.

> Linux/macOS: same commands, `cd` instead of `Set-Location`.

---

## 2. Check prerequisites

Run each check. Anything that errors or reports an older major version means the tool
is missing — install it using the table below the checks.

```powershell
java -version
mvn -version
node -v
npm -v
psql --version
```

What a correct output looks like (versions from the machine this documentation was
written on; any version in the required range is fine):

| Check | Command | Correct output looks like |
|---|---|---|
| Java 21 | `java -version` | `openjdk version "21.0.12.1" 2026-08-18` — must start with `21.` |
| Maven 3.8+ | `mvn -version` | `Apache Maven 3.8.7` (first line) |
| Node 20.19+ / 22.12+ | `node -v` | `v22.23.3` |
| npm 10+ | `npm -v` | `10.9.9` |
| PostgreSQL 14+ (16 tested) | `psql --version` | `psql (PostgreSQL) 16.x` |

`java -version` prints to stderr — that is normal, the text still appears.

If `psql` is not on `PATH` but PostgreSQL is installed, the server can still be fine;
`pg_isready` (Windows: `"C:\Program Files\PostgreSQL\16\bin\pg_isready.exe"`) tells you
whether it is accepting connections. Expected: `accepting connections`.

### Install hints

| Tool | Windows (PowerShell) | Linux (Debian/Ubuntu/Mint) |
|---|---|---|
| JDK 21 | `winget install Microsoft.OpenJDK.21` (scoop: `scoop bucket add java` then `scoop install temurin21-jdk`) | `sudo apt update && sudo apt install openjdk-21-jdk` |
| Maven 3.8+ | `winget install Apache.Maven` (or `scoop install maven`) | `sudo apt install maven` (Ubuntu 24.04 ships 3.8.7) |
| Node.js 22 | `winget install OpenJS.NodeJS.LTS` (or `scoop install nodejs-lts`) | **do not use `apt install nodejs`** — Ubuntu 24.04 / Mint 22 ship Node 18, which is below the required 20.19. Install [nvm](https://github.com/nvm-sh/nvm) and run `nvm install 22`, or use the NodeSource 22.x repository. |
| PostgreSQL 16 | `winget install PostgreSQL.PostgreSQL.16` | `sudo apt install postgresql` (Ubuntu 24.04 ships 16) |

Open a **new** terminal after installing so `PATH` is refreshed.

**No local PostgreSQL? Use Docker** (this is how Base-v1 was verified — see
[verification.md](verification.md)):

```bash
docker run -d --name smartbuild-pg \
  -e POSTGRES_USER=smartbuild \
  -e POSTGRES_PASSWORD=SUBSTITUTE_YOUR_OWN_PASSWORD \
  -e POSTGRES_DB=smartbuild_db \
  -p 5432:5432 \
  pgvector/pgvector:pg16
```

Any `postgres:14`+ image works; the `pgvector/pgvector:pg16` image is simply the one
used during verification. Substitute your own password — do not reuse someone else's.

Two consequences of this command: if you started the container this way, the
`smartbuild` role and the `smartbuild_db` database already exist, so **skip §3** (running
it again fails with `role "smartbuild" already exists`). And `psql` is only needed for
§3 and manual checks — Docker users can run
`docker exec -it smartbuild-pg psql -U smartbuild` instead of installing a local client.

---

## 3. Create the PostgreSQL database

You need three things: database `smartbuild_db`, a login role, and privileges for that
role on **both the database and the `public` schema**.

> **This section is the authoritative database setup.** The root `README.md` quick
> start *summarises* this section — including the PostgreSQL 15+ `GRANT ALL ON SCHEMA
> public` and `ALTER DEFAULT PRIVILEGES` blocks. If the two ever disagree, follow this
> file. The re-check is recorded in
> [verification.md](verification.md#known-documentation-gaps).

**Pick your own password.** The examples below use
`SUBSTITUTE_YOUR_OWN_PASSWORD` — replace it everywhere.

### 3a. Recommended: create the database owned by the role

Run as a superuser (`postgres` on a normal install):

```sql
-- psql -U postgres
CREATE ROLE smartbuild LOGIN PASSWORD 'SUBSTITUTE_YOUR_OWN_PASSWORD';
CREATE DATABASE smartbuild_db OWNER smartbuild;
```

This is the shortest path and needs no `GRANT` at all: the owner of a database also
owns its `public` schema (PostgreSQL 15+ hands `public` to `pg_database_owner`).

### 3b. Alternative: `GRANT`-only path (read this before copying the README's three-line version)

```sql
-- psql -U postgres
CREATE DATABASE smartbuild_db;
CREATE ROLE smartbuild LOGIN PASSWORD 'SUBSTITUTE_YOUR_OWN_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE smartbuild_db TO smartbuild;
```

Then **also** grant schema privileges:

```sql
\c smartbuild_db
GRANT ALL ON SCHEMA public TO smartbuild;
```

Why: on **PostgreSQL 15+** the database grant alone is not enough. `PUBLIC` lost
`CREATE` on the `public` schema, so the application role fails with:

```text
ERROR:  permission denied for schema public
```

This was reproduced on PostgreSQL 16 while writing this document: after the database
grant, `CREATE TABLE` failed; after `GRANT ALL ON SCHEMA public`, `CREATE TABLE`,
`INSERT` and `SELECT` all succeeded. Without that grant the backend dies at startup
with a Hibernate schema-creation error, because Base-v1 uses
`spring.jpa.hibernate.ddl-auto=update` (see [database.md](database.md)).

No `ALTER DEFAULT PRIVILEGES` statement is needed in this flow: the application connects
as `smartbuild` and creates `projects` itself, so it owns the table it just created.
Default-privilege grants only matter when a *different* role creates the objects — see
[database.md § Manual SQL](database.md#manual-sql-no-application-required).

### 3c. psql interactive equivalent

The SQL above can also be pasted into an interactive session, one statement per line:

```text
$ psql -U postgres
psql (16.x)
postgres=# CREATE ROLE smartbuild LOGIN PASSWORD 'SUBSTITUTE_YOUR_OWN_PASSWORD';
CREATE ROLE
postgres=# CREATE DATABASE smartbuild_db OWNER smartbuild;
CREATE DATABASE
postgres=# \c smartbuild_db
You are now connected to database "smartbuild_db" as user "postgres".
postgres=# \q
```

(`\c` reconnects to the database but keeps the same user — you stay `postgres`.)

### 3d. Verify

```text
psql -U postgres -d smartbuild_db -c "SELECT has_database_privilege('smartbuild','smartbuild_db','CREATE');"
 has_database_privilege
------------------------
 t
(1 row)
```

`t` means the role can create tables. For the database you created yourself, run the
same check against your own role name.

> Linux/macOS: `sudo -u postgres psql` reaches the superuser without a password.

---

## 4. Configure environment variables

### Spring Boot does not read `.env`

Say it plainly, because it surprises everyone: **a `.env` file is NOT loaded
automatically by Spring Boot.** There is no dotenv plugin in `backend/pom.xml`.
`Copy-Item .env.example .env` on its own changes nothing at runtime — the file documents
the variables, and you still have to put the values into the **process environment**.

`.env` is git-ignored; never commit real passwords.

### What to set

| Variable | Required? | Default in `application.yml` |
|---|---|---|
| `DB_URL` | no | `jdbc:postgresql://localhost:5432/smartbuild_db` |
| `DB_USERNAME` | no | `smartbuild` |
| `DB_PASSWORD` | **yes, in practice** — if it is absent the empty string is used and PostgreSQL rejects the login with `password authentication failed` | `${DB_PASSWORD:}` → *(empty string)* |
| `DB_DDL_AUTO` | no | `update` |
| `SERVER_PORT` | no | `8080` |
| `CORS_ALLOWED_ORIGINS` | no | `http://localhost:5173` |

The password row deserves one more sentence: `${DB_PASSWORD:}` is YAML/Spring syntax
for *"use what `DB_PASSWORD` holds, or `""` if it is unset"*. There is no
`Could not resolve placeholder` failure and no fast, friendly complaint — you only find
out when the connection is refused by PostgreSQL. That is why step 4 always shows an
explicit `DB_PASSWORD` assignment.

### Recommended PowerShell sequence (this is the one that definitely works)

Run from the repository root, in the **same** terminal you will use to start the
backend:

```powershell
# 1. keep a local, git-ignored copy of the template for reference
Copy-Item .env.example .env

# 2. put the values into THIS PowerShell session's environment
$env:DB_URL      = "jdbc:postgresql://localhost:5432/smartbuild_db"
$env:DB_USERNAME = "smartbuild"
$env:DB_PASSWORD = "SUBSTITUTE_YOUR_OWN_PASSWORD"

# 3. start the backend in the same session
Set-Location backend
mvn spring-boot:run
```

PowerShell session variables last until you close that window; set them again in a new
one.

### Alternatives

**jvmArguments (works when you do not want to set shell variables):**

```powershell
Set-Location backend
mvn spring-boot:run "-Dspring-boot.run.jvmArguments=-DDB_PASSWORD=SUBSTITUTE_YOUR_OWN_PASSWORD"
```

System properties are part of the Spring environment, so `${DB_PASSWORD}` resolves.
Add more `-D` flags in the same string if you also need `DB_URL`/`DB_USERNAME`.

**Linux/macOS — export before running:**

```bash
export DB_PASSWORD="SUBSTITUTE_YOUR_OWN_PASSWORD"
cd backend && mvn spring-boot:run
```

**Linux/macOS — source the `.env` file instead of retyping it:**

```bash
set -a; . ./.env; set +a     # "set -a" exports every variable that follows
cd backend && mvn spring-boot:run
```

Frontend variables are different: Vite loads `frontend/.env` / `.env.local` itself
(see [`frontend/.env.example`](../frontend/.env.example)). Nothing extra is needed for
the default `/api` proxy.

---

## 5. Install frontend dependencies

```powershell
Set-Location ..\frontend     # from backend/; or Set-Location frontend from the repo root
npm install
```

Linux/macOS: `cd frontend && npm install`.

`npm install` writes `node_modules/` (git-ignored). Use `npm ci` instead if you want a
strict install from `package-lock.json`.

---

## 6. Run the backend

Terminal 1, from `backend/`:

```powershell
Set-Location backend
$env:DB_PASSWORD = "SUBSTITUTE_YOUR_OWN_PASSWORD"   # if not set in this session yet
mvn spring-boot:run
```

Expected — the line you are waiting for:

```text
Started SmartbuildApplication in 16.81 seconds (process running for 17.935)
```

(Timing varies.) Just above it you should see `Tomcat started on port 8080 (http) with
context path '/'` and `HikariPool-1 - Start completed.`

If it stops with `APPLICATION FAILED TO START`, jump to
[Troubleshooting](#10-troubleshooting).

---

## 7. Run the frontend

Terminal 2:

```powershell
Set-Location frontend
npm run dev
```

Expected:

```text
  VITE v8.3.1  ready in 972 ms

  ➜  Local:   http://localhost:5173/
```

Leave both terminals running.

> Linux/macOS: `cd frontend && npm run dev`.

---

## 8. Verify health

Browser: open <http://localhost:8080/api/health> — you should see:

```json
{"status":"UP"}
```

Or from a shell:

```bash
curl http://localhost:8080/api/health
```

In **Windows PowerShell** `curl` is an alias for `Invoke-WebRequest`, which prints an
object rather than the raw body. Use one of:

```powershell
curl.exe -s http://localhost:8080/api/health     # real curl, ships with Windows 10+
Invoke-RestMethod http://localhost:8080/api/health
```

Then confirm the frontend can reach the API through the proxy:

```powershell
curl.exe -s http://localhost:5173/api/health
```

Same `{"status":"UP"}` body means the Vite proxy → backend path works end to end.

---

## 9. Create the first project

**Option A — through the UI:** open <http://localhost:5173/projects/new>, fill the form
(name, state, district, city, construction type, land area, built-up area, floors;
budget optional) and press **Create Project**. You land on
`/projects/{id}/overview`.

**Option B — curl POST.** The body below is complete and valid (every required field
present):

```bash
curl -i -X POST http://localhost:8080/api/projects \
  -H 'Content-Type: application/json' \
  -d '{
  "name": "Greenfield Villa",
  "state": "Karnataka",
  "district": "Bengaluru Urban",
  "city": "Bengaluru",
  "constructionType": "Residential",
  "landAreaSqFt": 2400.00,
  "builtUpAreaSqFt": 1800.50,
  "floorCount": 2,
  "budget": 4500000.00
}'
```

PowerShell (single-quoted JSON is passed verbatim by `curl.exe`):

```powershell
curl.exe -i -X POST http://localhost:8080/api/projects -H 'Content-Type: application/json' -d '{
  "name": "Greenfield Villa",
  "state": "Karnataka",
  "district": "Bengaluru Urban",
  "city": "Bengaluru",
  "constructionType": "Residential",
  "landAreaSqFt": 2400.00,
  "builtUpAreaSqFt": 1800.50,
  "floorCount": 2,
  "budget": 4500000.00
}'
```

Expected response (structure and timestamp format taken from a real capture — your
`id` and timestamps will differ):

```text
HTTP/1.1 201
Location: /api/projects/1
Content-Type: application/json
```

```json
{"id":1,"name":"Greenfield Villa","state":"Karnataka","district":"Bengaluru Urban","city":"Bengaluru","constructionType":"Residential","landAreaSqFt":2400.00,"builtUpAreaSqFt":1800.50,"floorCount":2,"budget":4500000.00,"status":"DRAFT","createdAt":"2026-09-30T20:11:35.656801553Z","updatedAt":"2026-09-30T20:11:35.656801553Z"}
```

The numeric id depends on how many rows already exist — `Location` always tells you the
one you just made. `status` defaults to `DRAFT` because the request omitted it.

Confirm it is stored:

```powershell
curl.exe -s http://localhost:8080/api/projects
```

Full request/response reference: [api-contract.md](api-contract.md).

---

## 10. Troubleshooting

### Port 8080 already in use

Symptom: `Web server failed to start. Port 8080 was already in use.`

```powershell
# Windows
netstat -ano | findstr :8080
taskkill /PID <pid-from-the-last-column> /F
```

```bash
# Linux/macOS
ss -ltnp | grep :8080
kill <pid>
```

Alternatively set `$env:SERVER_PORT="8081"` before `mvn spring-boot:run`. **If you
change the API port you must also edit the proxy target in
`frontend/vite.config.ts`** — it is hard-coded to `http://localhost:8080`.

### Port 5173 already in use

If port 5173 is taken, Vite reports it and serves on the next free port (5174). With the
default configuration this still works: the browser calls `http://localhost:5174/api`,
the Vite dev server forwards that to `:8080` server-side, and no cross-origin request is
ever made.

It only breaks something if you gave the frontend an absolute API URL
(`VITE_API_BASE_URL=http://localhost:8080/api`): then the browser calls `:8080` directly
from origin `http://localhost:5174`, which the backend must allow:

```powershell
$env:CORS_ALLOWED_ORIGINS = "http://localhost:5173,http://localhost:5174"
```

### `password authentication failed for user "smartbuild"`

`DB_PASSWORD` does not match the role's password, **`DB_PASSWORD` was never set at all
(so the empty string was sent)**, or `DB_USERNAME`/`DB_URL` points at the wrong
database. Re-check step 3 (role) against step 4 (environment), then restart the
backend — environment variables are read at startup only.

### `connection refused` on `localhost:5432`

PostgreSQL is not running.

```bash
# Docker
docker ps                       # is smartbuild-pg Up?
docker start smartbuild-pg      # if it is Exited

# native service (Windows)
Get-Service postgresql*
Start-Service postgresql-16-x64
```

```bash
# native service (Linux)
sudo systemctl status postgresql
sudo systemctl start postgresql
pg_isready
```

Also seen through the frontend as a Vite proxy error (the backend never came up):

```text
[vite] http proxy error: /api/projects
Error: connect ECONNREFUSED 127.0.0.1:8080
```

### `Failed to configure a DataSource` / datasource startup failure

Two distinct causes, both about `backend/src/main/resources/application.yml`:

- **`Failed to configure a DataSource. url attribute is not specified...`** — the JDBC
  url could not be resolved. That happens when `DB_URL` has been set to something empty
  or unparseable. Restore the default:
  `jdbc:postgresql://localhost:5432/smartbuild_db`.
- **`DB_PASSWORD` unset** — `application.yml` declares `${DB_PASSWORD:}`, whose empty
  default resolves to `""` rather than failing property resolution, so the app starts
  with an empty password and the connection is rejected by PostgreSQL
  (`FATAL: password authentication failed for user "smartbuild"`), surfaced as a
  HikariCP failure while the context is starting. Fix: set `DB_PASSWORD` in the same
  shell session (step 4) and restart. Because `ddl-auto=update` runs at startup, the
  app never reaches `Started SmartbuildApplication` until the database accepts it.

  An empty or malformed `DB_URL` is the case that actually produces
  `Failed to configure a DataSource`; an unset password never gets that far — it
  reaches PostgreSQL and fails there.

If PostgreSQL is reachable but the schema grant is missing, you get a Hibernate
`permission denied for schema public` during startup — see step 3b.

### CORS error in the browser

Symptom in the console:

```text
Access to XMLHttpRequest at 'http://localhost:8080/api/projects' from origin
'http://localhost:5174' has been blocked by CORS policy: No 'Access-Control-Allow-Origin'
header is present on the requested resource.
```

Fixes, in the order you should try them:

1. **Do not bypass the proxy.** Leave `VITE_API_BASE_URL` unset (default `/api`). The
   browser then calls `http://localhost:5173/api/...` — same origin — and CORS never
   applies. The proxy is configured in `frontend/vite.config.ts`.
2. If you set `VITE_API_BASE_URL=http://localhost:8080/api` (absolute), CORS applies.
   The backend must allow your exact origin:
   ```powershell
   $env:CORS_ALLOWED_ORIGINS = "http://localhost:5173"
   ```
   then restart the backend. Origins are comma-separated; `*` is deliberately never
   used (`config/WebConfig.java` disables credentials too).
3. If the frontend port drifted (see the 5173 note above) **and** you are using an
   absolute `VITE_API_BASE_URL`, add that port to `CORS_ALLOWED_ORIGINS`. With the
   default `/api` proxy the port does not matter, because no cross-origin request is
   made.

### `npm run build` fails on TypeScript errors

`npm run build` runs `tsc -b && vite build`; the `tsc` step fails first and Vite never
starts, e.g.:

```text
src/pages/ProjectsPage.tsx(12,7): error TS2345: ...
```

- Run `npm run lint` first to clear rule violations (oxlint is fast and does not need a
  build).
- Then read the `tsc` output: it gives `file(line,col): error TS....`. Type errors come
  from mismatched types — most often a field added to `ProjectResponse` in the backend
  but not to `frontend/src/types/project.ts`.
- `npm run dev` will still run with type errors (Vite does not type-check), so a
  green dev server does **not** mean `npm run build` will pass.

### Stale `backend/target`

Symptom: changed Java code is ignored, or the class file at runtime does not match the
source; occasionally a confusing `NoClassDefFoundError` after a branch switch.

```powershell
Set-Location backend
Remove-Item -Recurse -Force target
mvn spring-boot:run
```

```bash
rm -rf backend/target && (cd backend && mvn spring-boot:run)
```

Maven recompiles from scratch. This also clears `target/classes`, which is what
`mvn spring-boot:run` executes when it is not repackaging.

---

## Stop / restart

1. In both terminals press **Ctrl+C** — it must reach the Maven/Node process, not just
   close the terminal pane.
2. Leave PostgreSQL running; it does not need restarting between code changes.
3. Restart order is always **database → backend → frontend**:
   ```powershell
   # 1. database (only if you stopped it)
   docker start smartbuild-pg

   # 2. backend  (terminal 1 — DB_PASSWORD must be set again in a new window)
   $env:DB_PASSWORD = "SUBSTITUTE_YOUR_OWN_PASSWORD"
   Set-Location backend; mvn spring-boot:run

   # 3. frontend (terminal 2)
   Set-Location frontend; npm run dev
   ```
4. The backend must be up before you use the UI; otherwise every page shows the proxy
   error above.

Next: [architecture.md](architecture.md) explains how the pieces fit together, or
[api-contract.md](api-contract.md) if you just want the endpoints.
