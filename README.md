# SmartBuild India — Base-v1

**SmartBuild India** is an AI-assisted construction planning platform. The intended
end-to-end product flow is:

```
Create Project → Upload floor plans → AI-assisted plan analysis → User review/confirm
→ Quantity & material estimation → Cost scenarios → Labour & duration → Interactive 3D → Reports
```

**This repository currently contains Base-v1 only: the common foundation** that all four
team members build on. It intentionally does **not** implement floor-plan upload, AI
analysis, estimation, materials, costing, labour, 3D, or reports.

---

## Base-v1 scope

| Included | Not included (later modules) |
|---|---|
| Spring Boot REST API (`/api/**`) | Floor plan upload & storage |
| Health endpoint | AI / OCR plan analysis |
| `Project` entity + full CRUD | Quantity & material estimation |
| Request/response DTOs + validation | Cost scenarios & pricing |
| Consistent JSON error handling | Labour & duration calculations |
| PostgreSQL persistence | Interactive 3D model |
| React + TypeScript + Vite frontend | Report generation |
| Landing, project list, create form, workspace shell | Authentication / users |
| Honest placeholders for all future modules | Cloud, Redis, Kafka, payments |

---

## Technology stack

**Backend** — Java 21 · Maven · Spring Boot 3.5.16 · Spring Web · Spring Data JPA ·
Jakarta Bean Validation · PostgreSQL driver · JUnit 5 + Mockito + MockMvc

**Frontend** — Vite 8 · React 19 · TypeScript · React Router 7 · Axios ·
hand-written CSS with design tokens (no UI framework)

**Database** — PostgreSQL (local development database name: `smartbuild_db`)

---

## Repository structure

```
.
├── README.md              ← you are here
├── .gitignore
├── .env.example           ← backend environment template (copy to .env)
├── backend/               ← Spring Boot API
│   ├── .env.example       ← mirror of the backend section of the root template
│   ├── pom.xml
│   └── src/
│       ├── main/java/com/smartbuild/
│       │   ├── config/        CORS configuration
│       │   ├── controller/    Health + Project REST controllers
│       │   ├── dto/           ProjectRequest, ProjectResponse, ApiError
│       │   ├── exception/     GlobalExceptionHandler, ResourceNotFoundException
│       │   ├── model/         Project entity, ProjectStatus enum
│       │   ├── repository/    ProjectRepository (JPA)
│       │   └── service/       ProjectService (all business operations)
│       ├── main/resources/    application.yml
│       └── test/java/         model, service, controller and config tests (no DB required)
├── frontend/              ← React client
│   └── src/
│       ├── api/           axios client + project API calls
│       ├── components/    Button, FormField, PageHeader, state components, StatusBadge
│       ├── layouts/       AppLayout (public), ProjectWorkspaceLayout (workspace shell)
│       ├── pages/         Home, Projects, Create Project, Not Found, workspace pages
│       ├── styles/        design tokens + global styles
│       └── types/         TypeScript types matching the API contract
└── docs/                  ← setup, architecture, API contract, database, handoff
```

---

## Prerequisites

| Tool | Version used | Notes |
|---|---|---|
| JDK | 21 | `java -version` |
| Maven | 3.8+ | `mvn -version` |
| Node.js | 20.19+ or 22.12+ | `node -v` |
| npm | 10+ | `npm -v` |
| PostgreSQL | 14+ (16 tested) | running server |

Full step-by-step instructions: **[docs/setup.md](docs/setup.md)**.

---

## Quick start

```bash
# 1. Database (once)
psql -U postgres <<'SQL'
CREATE DATABASE smartbuild_db;
CREATE ROLE smartbuild WITH LOGIN PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE smartbuild_db TO smartbuild;
SQL

psql -U postgres -d smartbuild_db <<'SQL'
GRANT ALL ON SCHEMA public TO smartbuild;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO smartbuild;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO smartbuild;
SQL

# 2. Backend  (terminal 1)
export DB_PASSWORD=your_password          # Windows PowerShell: $env:DB_PASSWORD="your_password"
cd backend && mvn spring-boot:run

# 3. Frontend (terminal 2)
cd frontend && npm install && npm run dev
```

> **[docs/setup.md](docs/setup.md) §3 is the authoritative database setup.** If this
> quick start and that file ever disagree, follow `docs/setup.md`. The schema grant is
> required on PostgreSQL 15 and newer, otherwise Hibernate fails with
> `permission denied for schema public`.

Then open <http://localhost:5173>.

### Important URLs

| URL | Purpose |
|---|---|
| <http://localhost:5173> | Frontend |
| <http://localhost:5173/projects> | My Projects |
| <http://localhost:8080/api/health> | Health check → `{"status":"UP"}` |
| <http://localhost:8080/api/projects> | Project collection |

---

## Environment variables

Backend reads from the process environment (see [`.env.example`](.env.example)).
`DB_PASSWORD` has **no usable default** — `application.yml` falls back to an empty
string, which PostgreSQL then rejects with
`FATAL: password authentication failed for user "smartbuild"`.

| Variable | Default | Purpose |
|---|---|---|
| `DB_URL` | `jdbc:postgresql://localhost:5432/smartbuild_db` | JDBC connection URL |
| `DB_USERNAME` | `smartbuild` | Database role |
| `DB_PASSWORD` | *(none — required)* | Database password |
| `DB_DDL_AUTO` | `update` | Hibernate schema mode |
| `SERVER_PORT` | `8080` | API port |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Comma-separated allowed origins |

Frontend reads `VITE_API_BASE_URL` (default `/api`, proxied to `localhost:8080` in dev).
See [`frontend/.env.example`](frontend/.env.example).

No secrets are committed to this repository.

---

## Commands

```bash
# Backend
cd backend
mvn test              # unit + controller tests (no database needed)
mvn spring-boot:run   # run the API on :8080
mvn package           # build the jar into backend/target/

# Frontend
cd frontend
npm install
npm run dev           # dev server on :5173
npm run build         # type-check + production build
npm run lint          # oxlint
```

---

## Documentation index

| Document | Contents |
|---|---|
| [docs/setup.md](docs/setup.md) | Step-by-step first run, for a teammate who has never seen the project |
| [docs/architecture.md](docs/architecture.md) | Request flow, layer responsibilities, how Members 2/3/4 attach |
| [docs/api-contract.md](docs/api-contract.md) | Every Base-v1 endpoint with request/response/error examples |
| [docs/database.md](docs/database.md) | `projects` table, field meanings, ER diagram, schema management |
| [docs/base-files.md](docs/base-files.md) | What each directory/file is for and where to add your module |
| [docs/verification.md](docs/verification.md) | Commands actually executed and their PASS/FAIL/BLOCKED results |

---

## Current limitations (honest list)

- **Future module routes are placeholders.** Plans, AI Analysis, Estimation, Materials,
  Labour & Timeline, 3D Model and Reports render explanatory empty states — no data, no
  fake charts, no sample values.
- **No authentication.** Anyone who can reach the API can read and modify projects.
- **No request-size cap.** The JSON body is not limited, which is acceptable on
  localhost and not acceptable on a public deployment.
- **No edit/delete UI.** `updateProject` and `deleteProject` exist in
  `frontend/src/api/projects.ts` and are covered by the API contract, but Base-v1 has no
  screen that calls them yet.
- **No migrations.** The schema is generated by Hibernate (`ddl-auto=update`).
  Flyway/Liquibase are deliberately *not* included in Base-v1. Before real data matters,
  one of the team should introduce migrations.
- **No pagination.** `GET /api/projects` returns every project. Fine at student-project
  scale; revisit if lists grow.
- **No file storage.** There is no upload directory because nothing uploads yet.
- **`constructionType` is a free-text field** validated only as non-blank/max 100
  characters. The UI offers a fixed list; the API does not enforce it.

---

## Team module boundaries

The `Project` record and its `id` are the **common project identity**. Every later module
references a project by `projectId`.

| Member | Owns | Starts here |
|---|---|---|
| **1 (Base)** | `/backend` foundation, `/frontend` shell, `/docs`, root files | Done — this repository |
| **2** | Floor plan upload + AI plan analysis | New `plans` / `analysis` routes, new entities referencing `Project.id` |
| **3** | Quantity, materials, cost, labour, duration | New `estimation` / `materials` / `labour` routes, read `Project` fields |
| **4** | Dashboard, interactive 3D, reports | New `3d` / `reports` routes, consume Member 2/3 outputs |

Shared rules for all members:

1. Do not change existing API paths, `ProjectResponse` field names, the workspace URL
   segments, or the error-code vocabulary in `docs/api-contract.md` — add new entries
   instead. Never rename a workspace segment; existing links would break.
2. All business validation and calculation lives in the backend.
3. The frontend never duplicates backend calculation logic.
4. New workspace tabs are added in `frontend/src/types/workspace.ts` — one entry there
   creates the route, the sidebar link and the overview card together.
