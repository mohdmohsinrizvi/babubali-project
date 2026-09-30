# Verification — commands actually executed

Every row below was re-run by the documentation pass, on this machine, against this
working tree. Results are PASS / FAIL / BLOCKED only — nothing is inferred.

Companion documents: [setup.md](setup.md) · [architecture.md](architecture.md) ·
[api-contract.md](api-contract.md) · [database.md](database.md) ·
[base-files.md](base-files.md) · [root README](../README.md)

---

## Environment

| Component | Observed on this machine | Notes |
|---|---|---|
| OS | **Linux Mint 22.3 (Zena)**, Ubuntu 24.04 base | `cat /etc/os-release` (the JDK build string also says `Ubuntu-24.04`) |
| Java | **OpenJDK 21.0.12.1** (build `21.0.12.1+1-1-24.04.4-Ubuntu`) | `java -version` |
| Maven | **3.8.7** (`/usr/share/maven`) | `mvn -version` |
| Node.js | **v22.23.3** | `node -v` |
| npm | **10.9.9** | `npm -v` |
| PostgreSQL server | **Not installed on the host** — `psql`, `pg_isready` and the server binaries are absent, so no local cluster exists | `command -v psql` → not found |
| PostgreSQL used for integration | **Docker container `smartbuild-pg`**, image `pgvector/pgvector:pg16`, reports `PostgreSQL 16.15 (Debian 16.15-1.pgdg12+2)`, published on `0.0.0.0:5432` | `docker ps`, `docker exec smartbuild-pg psql -U smartbuild -d smartbuild_db -c 'select version()'` |
| Docker | **Available** — Docker `29.1.3` | `docker --version` |
| Backend process | Running on `:8080` during these checks — **PID 84214**, `java -jar target/smartbuild-backend-0.1.0.jar`, up ~34 minutes. Not started, not stopped by this pass. | `ps`, `curl /api/health` |
| Frontend dev server | Running on `127.0.0.1:5173` — **PID 85227**, `node …/frontend/node_modules/.bin/vite`. Not started, not stopped by this pass. | `ss -ltnp` |
| Git repository | **None** — the working tree has no `.git` | `git status` → "not a git repository" |

---

## Checks run

| # | Check | Command | Result | Notes |
|---|---|---|---|---|
| 1 | Backend compiles | `mvn -q -DskipTests compile` (in `backend/`) | **PASS** | exit 0; quiet mode produced no output, i.e. no warnings/errors |
| 2 | Backend tests | `mvn test` (in `backend/`) | **PASS** | **38 tests, 0 failures, 0 errors, 0 skipped**, `BUILD SUCCESS`. Breakdown: `ProjectTest` 4, `HealthControllerTest` 1, `ProjectControllerTest` 20, `WebConfigTest` 3, `ProjectServiceTest` 10 |
| 3 | Frontend type-check + build | `npm run build` (in `frontend/`) | **PASS** | `tsc -b && vite build` — no type errors; `vite v8.3.1`; `108 modules transformed`; output `dist/index.html` 0.61 kB, `dist/assets/index-CdDk66aI.css` 15.14 kB (gzip 3.38 kB), `dist/assets/index-CfgfqsgC.js` 333.06 kB (gzip 106.62 kB); `built in 710ms` |
| 4 | Frontend lint | `npm run lint` (in `frontend/`) | **PASS** | `oxlint` exit 0, no warnings or errors reported (rules configured in `frontend/.oxlintrc.json`) |
| 5 | API smoke: health, create, list, get, update, delete + error paths | `curl` against the backend on `:8080`, backed by the Docker PostgreSQL container `smartbuild-pg` | **PASS** | Exact commands, status codes and bodies below |
| 6 | Fresh-copy test | tar the tree (excluding `node_modules/`, `target/`, `dist/`) to `/tmp/opencode/fresh-copy3`, then compile, test, `npm ci`, build, lint **and boot** there | **PASS** | Details below |
| 7 | Vite dev-server proxy | `curl http://localhost:5173/api/health` and `http://localhost:5173/api/does-not-exist` | **PASS** | **200** `{"status":"UP"}` and **404** — the proxy forwards to `:8080` server-side; no CORS is involved on this path |
| 8 | Browser end-to-end | `node /tmp/opencode/e2e.js` | **PASS** | **32 checks, 32 passed, 0 failed**; details below |
| 9 | Packaging + zip round-trip | `zip -r` the tree excluding build output and secrets, extract to a clean directory, compile/test/build/lint there | **PASS** | `SmartBuild-Base-v1.zip`, 107 files, 124 kB; archive contains no `node_modules/`, `target/`, `dist/`, `.git/`, `.env`, `uploads/`, `logs/` or `data/`; extraction reproduced all four command results; details in §6 |

### 5. API smoke — exact commands and observed status codes

Performed with `curl` against `http://localhost:8080` while the backend was connected to
the `smartbuild-pg` container (`smartbuild` / `smartbuild_db`). Every row created by this
pass was deleted again; the final list was `[]` and `select count(*) from projects`
returned `0`.

| Step | Command | Observed |
|---|---|---|
| Health | `curl -s -w "\nHTTP %{http_code}\n" http://localhost:8080/api/health` | `{"status":"UP"}` — **200** |
| Create A | `curl -i -X POST http://localhost:8080/api/projects -H 'Content-Type: application/json' -d '{"name":"Pass Smoke A",…,"budget":4500000.00}'` | **201**, `Location: /api/projects/16`, `"status":"DRAFT"` although `status` was omitted, `createdAt 2026-09-30T21:42:50.619231736Z` |
| Create B (2 s later) | same body with `"name":"Pass Smoke B"` | **201**, `id 17`, `createdAt 2026-09-30T21:42:52.772125021Z` |
| List | `curl -s http://localhost:8080/api/projects` | **200**; `17` returned before `16` — `createdAt` **descending** |
| Get one | `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/api/projects/16` | **200** |
| Update | `curl -s -o body -w "%{http_code}" -X PUT http://localhost:8080/api/projects/16 -H 'Content-Type: application/json' -d '{"name":"Pass Smoke A Updated",…}'` | **200**; response `updatedAt` `21:42:50.619232Z` (the **creation** value — stale, see next row), `createdAt` unchanged |
| Update, DB side | `docker exec smartbuild-pg psql … -c "select updated_at, created_at from projects where id=16"` | `updated_at 2026-09-30 21:42:53.140723+00`, `created_at 2026-09-30 21:42:50.619232+00` — the database advanced, the JSON did not. This is the `@PreUpdate`-after-response-build behaviour documented in [api-contract.md § PUT](api-contract.md#put) |
| Delete | `curl -s -o /dev/null -D - -X DELETE http://localhost:8080/api/projects/16` | `HTTP/1.1 204`, empty body |
| Delete again | same command | **404** |
| Get deleted | `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/api/projects/16` | **404** |
| Cleanup | `DELETE /api/projects/17` | **204**, then `GET /api/projects` → `[]`, `count(*) = 0` |

Error-path probes (same session, same server; bodies reproduced verbatim):

| Probe | Observed |
|---|---|
| POST with `name:""`, `landAreaSqFt:-100`, `floorCount:0` | **400** `VALIDATION_ERROR`, `"Validation failed for 3 field(s)"`, three `fieldErrors` — this run reported `"name":"must be between 2 and 150 characters"`; five identical requests returned that message three times and `"must not be blank"` twice (the `@NotBlank` + `@Size` pair on `name` is not order-stable — see [api-contract.md § ApiError](api-contract.md#apierror)) |
| POST with body `{"name": ` | **400** `BAD_REQUEST`, `"Malformed request body"` |
| POST with `"status":"BOGUS"` | **400** `BAD_REQUEST`, `"Malformed request body"` |
| `GET /api/projects/abc` | **400** `BAD_REQUEST`, `"Invalid value for path variable 'id'"` |
| `PATCH /api/projects/19` | **405** `METHOD_NOT_ALLOWED` |
| `PUT /api/projects/9999` with **invalid** body | **400** `VALIDATION_ERROR` (validation before lookup — as documented) |
| `PUT /api/projects/9999` with **valid** body | **404** `NOT_FOUND` |
| `DELETE /api/projects/9999` | **404** `NOT_FOUND` |
| `GET /api/projects/9999` | **404**, `"Project not found with id 9999"` |
| POST with `"budget": 99999999999999999999` (beyond `@Digits` for `NUMERIC(14,2)`) | **400** `VALIDATION_ERROR`, `"Validation failed for 1 field(s)"`, `"budget":"must have at most 12 digits before and 2 after the decimal point"`; nothing inserted |
| POST with `"landAreaSqFt":12345678901.00` (11 integer digits) | **400** `VALIDATION_ERROR`, `"landAreaSqFt":"must have at most 10 digits before and 2 after the decimal point"` |
| POST with an unknown extra property (`"totallyUnknownField":"hello"`) | **201** — extra JSON properties are ignored, not rejected; the row was created and then deleted |
| POST with a NUL byte (`"\u0000"`) in `state` (passes bean validation, fails the database) | **400** `BAD_REQUEST`, `"The request could not be stored because it violates a data rule"` (SQLState 22021, `invalid byte sequence for encoding "UTF8": 0x00`); transaction rolled back, nothing persisted |
| `POST /api/health` | **405** `METHOD_NOT_ALLOWED`, `"Request method 'POST' is not supported"` |
| **`GET /api/does-not-exist`** | **404** `NOT_FOUND`, `"No resource found for the requested path"` (unknown path — not a 500) |
| **POST with `Content-Type: text/plain`** | **400** `BAD_REQUEST`, `"Unsupported content type; expected application/json"` |
| **`GET /api/health` with `Accept: application/xml`** | **406**, **empty body** (`Content-Length: 0`) — the error itself cannot be serialised for that client |
| **`GET /api/projects/9999` with `Accept: application/xml`** | **500**, empty body (the 404 handler fails while writing); server log shows `Failure in @ExceptionHandler GlobalExceptionHandler#handleNotFound`. Documented in [api-contract.md § Cross-cutting errors](api-contract.md#cross-cutting-errors) |
| Schema check — `docker exec smartbuild-pg psql -U smartbuild -d smartbuild_db -c '\d projects'` | table exactly as documented in [database.md](database.md), incl. the full `projects_status_check` text |

### 6. Fresh-copy test — what was and was not performed

**Performed:**

1. Copied the working tree to `/tmp/opencode/fresh-copy3` with
   `tar -C <repo-root> -cf - --exclude=node_modules --exclude=target --exclude=dist . | tar -xf -`
   — i.e. **no build output and no installed dependencies** came along. A `find` over the
   copy confirmed zero `node_modules/`, `target/` and `dist/` directories.
2. In the copy: `mvn -q -DskipTests compile` → exit **0**.
3. In the copy: `mvn test` → **38 tests, 0 failures**, `BUILD SUCCESS`
   (`ProjectTest` 4, `HealthControllerTest` 1, `ProjectControllerTest` 20,
   `WebConfigTest` 3, `ProjectServiceTest` 10).
4. In the copy: `npm ci` (strict install from `package-lock.json`) → exit **0**,
   `found 0 vulnerabilities`.
5. In the copy: `npm run build` → **PASS** (identical artifacts to the working tree:
   `index-CfgfqsgC.js` 333.06 kB / gzip 106.62 kB, `index-CdDk66aI.css` 15.14 kB,
   108 modules).
6. In the copy: `npm run lint` → **PASS** (exit 0).
7. In the copy: `mvn -DskipTests package` → `target/smartbuild-backend-0.1.0.jar`, then
   booted it with `SERVER_PORT=8081` (`DB_PASSWORD` supplied) against the same PostgreSQL
   → `Started SmartbuildApplication in 23.96 seconds`, and a full CRUD cycle against
   `:8081` returned **201 → 200 → 204**, list back to `[]`. The jar was then stopped.
8. **Zip round-trip**: `SmartBuild-Base-v1.zip` was built from this tree (excluding
   `node_modules/`, `backend/target/`, `frontend/dist/`, `.git/`, `.env`, `uploads/`,
   `logs/`, `data/` and the zip itself), unlisted entries were checked to contain none
   of those, and the archive was extracted to a clean directory. Inside the extraction:
   `mvn -q -DskipTests compile` exit 0, `mvn test` **38 tests, 0 failures**,
   `npm ci` 0 vulnerabilities, `npm run build` PASS with the identical bundle hash
   (`index-CfgfqsgC.js` 333.06 kB / gzip 106.62 kB), `npm run lint` PASS.
   107 files, 124 kB.

This proves the tree builds **and runs** from source alone: nothing depends on files that
are git-ignored, on a previously populated `target/`, or on a pre-existing
`node_modules/`.

**Not performed:**

- No `git clone` (the tree is not a git repository) — see the blockers below.
- No `npm run dev` / Vite in the fresh copy; the browser end-to-end check (§ 8) ran
  against the working tree's dev server.
- No Windows execution — see the blockers below.

### 7. Vite dev-server proxy

With `npm run dev` already serving on `:5173` and the backend on `:8080`:

```text
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/api/health          → 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/api/does-not-exist  → 404
```

Both answers come from the backend, forwarded by Vite server-side — which is exactly
why the default setup needs no CORS at all.

### 8. Browser end-to-end — `node /tmp/opencode/e2e.js`

| | |
|---|---|
| Command executed | `node /tmp/opencode/e2e.js` |
| Result | **PASS** — `TOTAL 32  PASS 32  FAIL 0`, exit code 0 |
| Environment | Local PostgreSQL via Docker container **`smartbuild-pg`**; backend on `:8080`; frontend dev server on `:5173` |
| Cleanup | The one row it created was deleted afterwards; `GET /api/projects` returned `[]` and `count(*) = 0` |

Coverage of the 32 checks:

| Group | Checks |
|---|---|
| Landing page | renders hero; does not claim the modules work; contains no fake statistics |
| Project list | lists an existing project; created project appears; list card shows the city |
| New-project form | all eight fields present (name, state, district, city, land area, built-up area, floors, budget); empty submit blocks navigation; empty submit marks fields invalid (`aria-invalid` count = 6) |
| Create → workspace | submission navigates to `/projects/{id}/overview`; overview shows the submitted name, real area, floors, budget, and status `Draft` |
| Workspace shell | sidebar keeps `projectId` when switching tabs (`/projects/15/estimation`); project name still visible on another tab |
| Honest placeholders | placeholder page is honest and shows no fake numbers |
| 404 | 404 page renders; offers "back to projects" from project URLs; 404 *inside* a project shows the project escape link |
| Missing project | shows the error state; offers a working **Retry** |
| Responsive | no horizontal overflow at 375 px (`overflow=false`) |

**Not covered by this run:** cross-origin behaviour (everything went through the proxy),
authentication, and any module beyond Overview.

---

## Known documentation gaps

**None currently open — every row previously listed here is resolved.** The rows used
to describe the root `README.md` and `backend/src/main/resources/application.yml` as
they were before a later correction pass fixed those two files. Each one was re-checked
against the current files in this pass and now reads as follows:

| Where | Was reported as wrong | Current state (re-checked in this pass) |
|---|---|---|
| Root `README.md`, quick start | ran only `GRANT ALL PRIVILEGES ON DATABASE smartbuild_db TO smartbuild` | The quick start now carries the full PostgreSQL 15+ recipe — `GRANT ALL PRIVILEGES ON DATABASE …`, `GRANT ALL ON SCHEMA public TO smartbuild` and `ALTER DEFAULT PRIVILEGES … GRANT ALL ON TABLES/SEQUENCES` — and states that [setup.md §3](setup.md#3-create-the-postgresql-database) is authoritative if the two disagree |
| Root `README.md`, env-var notes | "`DB_PASSWORD` has no default" | Now says `DB_PASSWORD` has **no usable default** and that `application.yml` "falls back to an empty string, which PostgreSQL then rejects" — consistent with [setup.md §4](setup.md#4-configure-environment-variables) |
| Root `README.md`, shared rule #4 | new workspace tabs are added in `frontend/src/App.tsx` | Now points at `frontend/src/types/workspace.ts`; one entry there creates the route, the sidebar link and the overview card together — see [base-files.md § workspace manifest](base-files.md#workspace-ts) |
| Root `README.md`, repository structure | omitted `backend/.env.example` | The repo map now lists `backend/.env.example` as a mirror of the root template — documented in [base-files.md](base-files.md) |
| `backend/src/main/resources/application.yml` | comment `# no default — must be supplied` | The comment now reads `# defaults to an empty string; supply DB_PASSWORD or PostgreSQL rejects the login`, which matches Spring's actual `${DB_PASSWORD:}` behaviour — explained in [setup.md §4](setup.md#4-configure-environment-variables) |

---

## Known blockers / not verified

Every row below is **BLOCKED** — nothing here is a PASS, and nothing here is a FAIL.
The "Why" column says what stood in the way.

| Item | Status | Why | How to close it |
|---|---|---|---|
| Browser-level **cross-origin** CORS behaviour | **BLOCKED** | check 8 ran in a real browser, but every request went through the Vite proxy, so no cross-origin request was ever made; `WebConfig` was read instead | Set `VITE_API_BASE_URL=http://localhost:8080/api`, load the app, and confirm requests succeed only when `CORS_ALLOWED_ORIGINS` matches the page origin (and fail with 403 otherwise) |
| Backend startup **failures** (missing `DB_PASSWORD`, `DB_URL` unreachable, PostgreSQL stopped, missing schema grant) | **BLOCKED** | reproducing them means stopping/restarting the shared running backend, which was out of scope | Stop PostgreSQL, run `mvn spring-boot:run`, record the exact failure text; repeat with `DB_PASSWORD` unset. Expected texts are listed in [setup.md §10](setup.md#10-troubleshooting) |
| Windows PowerShell / winget / scoop commands | **BLOCKED** | this is a Linux machine; PowerShell instructions were written for the reader | Run [setup.md](setup.md) §2–§9 on a Windows box and correct any command that differs |
| `git clone` instructions | **BLOCKED** | no `.git` directory and no remote in this working tree | `git clone <url> && cd <dir>` on a machine with access |
| Long-running / load behaviour, pagination under many rows | **BLOCKED** | Base-v1 has no pagination and no seed of large data | Create e.g. 1000 rows and time `GET /api/projects` before relying on it |

Nothing in the nine checks above is marked PASS unless the command was run in this pass
and returned success.

---

## Re-verification commands

Run from the repository root, in order. Expected result for each is in brackets.

```bash
# 0. Prerequisites
java -version          # [21.x]
mvn -version           # [3.8+]
node -v && npm -v      # [v22.x / 10.x]

# 1. Backend compiles                       [exit 0, no output]
cd backend && mvn -q -DskipTests compile

# 2. Backend tests (no database needed)     [Tests run: 38, Failures: 0, BUILD SUCCESS]
mvn test

# 3. Frontend type-check + build            [exit 0, dist/ written, 108 modules]
cd ../frontend
npm ci                                      # or: npm install
npm run build

# 4. Frontend lint                          [exit 0]
npm run lint
```

For check 5 you need a running PostgreSQL and then the backend:

```bash
# 5a. Database (once) — see docs/setup.md §3 for the GRANT-only variant
docker run -d --name smartbuild-pg \
  -e POSTGRES_USER=smartbuild \
  -e POSTGRES_PASSWORD=<your-own-password> \
  -e POSTGRES_DB=smartbuild_db \
  -p 5432:5432 pgvector/pgvector:pg16

# 5b. Backend (terminal 1)
cd backend
export DB_PASSWORD=<your-own-password>     # PowerShell: $env:DB_PASSWORD="<your-own-password>"
mvn spring-boot:run                        # expect: Started SmartbuildApplication

# 5c. Frontend (terminal 2)
cd frontend && npm run dev                 # expect: Local: http://localhost:5173/

# 5d. Smoke sequence (terminal 3) — expected codes in brackets
curl -s http://localhost:8080/api/health                                  # [200 {"status":"UP"}]
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8080/api/projects \
  -H 'Content-Type: application/json' \
  -d '{"name":"Verify Project","state":"Karnataka","district":"Bengaluru Urban","city":"Bengaluru","constructionType":"Residential","landAreaSqFt":2400.00,"builtUpAreaSqFt":1800.50,"floorCount":2,"budget":4500000.00}'   # [201]
curl -s http://localhost:8080/api/projects                               # [200 array, newest first]
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/api/projects/1   # [200 or 404]
curl -s -o /dev/null -w "%{http_code}\n" -X PUT http://localhost:8080/api/projects/1 \
  -H 'Content-Type: application/json' \
  -d '{"name":"Verify Project 2","state":"Karnataka","district":"Bengaluru Urban","city":"Bengaluru","constructionType":"Residential","landAreaSqFt":2400.00,"builtUpAreaSqFt":1800.50,"floorCount":2}'   # [200]
curl -s -o /dev/null -w "%{http_code}\n" -X DELETE http://localhost:8080/api/projects/1   # [204]
curl -s -o /dev/null -w "%{http_code}\n" -X DELETE http://localhost:8080/api/projects/1   # [404]
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/api/health  # [200, once the dev server runs]

# 5e. Error paths
curl -s -o /dev/null -w "%{http_code}\n" -X PATCH http://localhost:8080/api/projects/1 \
  -H 'Content-Type: application/json' -d '{}'                             # [405]
curl -s -X POST http://localhost:8080/api/projects -H 'Content-Type: application/json' \
  -d '{"name":""}'                                                         # [400 VALIDATION_ERROR]
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/api/projects/abc   # [400 BAD_REQUEST]
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/api/does-not-exist # [404 NOT_FOUND]
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8080/api/projects \
  -H 'Content-Type: text/plain' -d '{}'                                    # [400 BAD_REQUEST]
curl -s -o /dev/null -w "%{http_code}\n" -H 'Accept: application/xml' \
  http://localhost:8080/api/health                                         # [406, empty body]

# 6. Fresh-copy test (independent of your working tree)
rm -rf /tmp/smartbuild-fresh && mkdir -p /tmp/smartbuild-fresh
tar -C <repo-root> -cf - --exclude=node_modules --exclude=target --exclude=dist . \
  | tar -C /tmp/smartbuild-fresh -xf -
cd /tmp/smartbuild-fresh/backend && mvn -q -DskipTests compile && mvn test   # [38 tests, 0 failures]
cd /tmp/smartbuild-fresh/frontend && npm ci && npm run build && npm run lint  # [exit 0]

# 7. Browser end-to-end (backend and dev server must be running)
node /tmp/opencode/e2e.js                                                    # [TOTAL 32  PASS 32  FAIL 0]

# 8. Packaging (run from <repo-root>)
zip -r -q /tmp/SmartBuild-Base-v1.zip . \
  -x "*/node_modules/*" -x "./backend/target/*" -x "./frontend/dist/*" \
  -x "./.git/*" -x "./.env" -x "*/.env" -x "./uploads/*" -x "./data/*" \
  -x "./logs/*" -x "./*.log" -x "./*.zip" -x "./.DS_Store" -x "*/.DS_Store"
unzip -l /tmp/SmartBuild-Base-v1.zip | grep -E "node_modules|/target/|/dist/|\.env$|\.git/"  # [no output]
mkdir -p /tmp/zip-check && unzip -q /tmp/SmartBuild-Base-v1.zip -d /tmp/zip-check
cd /tmp/zip-check/backend && mvn -q -DskipTests compile && mvn test   # [38 tests, 0 failures]
cd /tmp/zip-check/frontend && npm ci && npm run build && npm run lint # [exit 0]
```

Finally, check the schema matches [database.md](database.md):

```bash
docker exec -it smartbuild-pg psql -U smartbuild -d smartbuild_db -c '\d projects'
```
