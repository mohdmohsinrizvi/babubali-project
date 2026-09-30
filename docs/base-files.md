# Base files — what everything is for

A guided tour so a new member never has to guess. Each entry says **what it is**,
**why it exists**, and **when you would touch it**.

Start with the [root README](../README.md) for scope and stack, then
[architecture.md](architecture.md) for the request flow.

---

## Root files

### `README.md`

**What it is.** The front door: what SmartBuild India is, what Base-v1 does and does
not contain, the stack, the repo map, prerequisites, quick start, environment variables,
commands, the documentation index, the honest limitations list and the four-member
boundary table.

**Why it exists.** It is the first file anyone opens; it must never promise features
that are not there (that is why the limitations list is explicit about placeholders,
missing auth and missing migrations).

**When you would touch it.** Only when *facts* change: a new endpoint, a new script, a
new document, or a limitation you have actually removed. Not for marketing edits.

### `.gitignore`

**What it is.** Tells git what never enters the repository: OS/editor junk, IDE files,
`.env` / `.env.*` (but **not** `.env.example`), `backend/target/`,
`frontend/node_modules/`, `frontend/dist/`, logs, `uploads/`, database files.

**Why it exists.** Secrets and build output must stay local. The `.env` rules are the
important ones — that is where a real `DB_PASSWORD` would live.

**When you would touch it.** Rarely, and only to *add* an ignore pattern for a new kind
of generated artefact (a new build directory, a new tool's cache). Never to un-ignore
`.env`.

### `.env.example`

**What it is.** A commented template of the backend's environment variables:
`DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DDL_AUTO`, `SERVER_PORT`,
`CORS_ALLOWED_ORIGINS`. Safe to commit because the password is `change-me`.

**Why it exists.** It is the authoritative list of variables the backend reads, and the
thing a teammate copies to `.env`.

**When you would touch it.** When `application.yml` gains a new `${...}` variable, or a
default changes. Remember: Spring Boot does **not** load `.env` automatically — see
[setup.md §4](setup.md#4-configure-environment-variables).

### `backend/.env.example`

**What it is.** The same six variables again, written from the backend's point of view.
Its own header says it is a *"Mirror of the backend section of `../.env.example` — keep
the two files in sync."*

**Why it exists.** Someone working only inside `backend/` should not have to know that
the root template exists.

**When you would touch it.** Always together with the root `.env.example` — if the two
ever disagree, the root file wins (it is the one [setup.md](setup.md) and the root
README point at).

---

## Backend build & configuration

### `backend/pom.xml`

**What it is.** The Maven build. Parent `spring-boot-starter-parent:3.5.16`,
coordinates `com.smartbuild:smartbuild-backend:0.1.0`, `<java.version>21</java.version>`,
and exactly five dependencies:

| Dependency | Why it is here |
|---|---|
| `spring-boot-starter-web` | REST controllers, Jackson, embedded Tomcat |
| `spring-boot-starter-data-jpa` | `JpaRepository`, Hibernate |
| `spring-boot-starter-validation` | `@NotBlank`, `@Positive`, … on `ProjectRequest` |
| `postgresql` (runtime) | JDBC driver |
| `spring-boot-starter-test` (test) | JUnit 5, Mockito, MockMvc, AssertJ |

**Why it exists.** It is the whole build contract — versions come from the parent, so
you never pin Spring versions by hand. Its shortness is deliberate: no Lombok, no
MapStruct, no Flyway/Liquibase.

**When you would touch it.** Adding a dependency your module genuinely needs (a PDF
library for reports, for example) — and then telling the team, because every new
dependency is a shared decision. Not for version bumps "while passing through".

### `backend/src/main/resources/application.yml`

**What it is.** Runtime configuration, entirely placeholder-driven:

```yaml
server.port:              ${SERVER_PORT:8080}
spring.datasource.url:     ${DB_URL:jdbc:postgresql://localhost:5432/smartbuild_db}
spring.datasource.username: ${DB_USERNAME:smartbuild}
spring.datasource.password: ${DB_PASSWORD:}          # empty-string default (see below)
spring.jpa.hibernate.ddl-auto: ${DB_DDL_AUTO:update}
spring.jpa.open-in-view:   false
app.cors.allowed-origins:  ${CORS_ALLOWED_ORIGINS:http://localhost:5173}
```

Note the `${DB_PASSWORD:}` syntax: the colon with nothing after it means *"default to
the empty string"*. The value therefore always resolves — Spring never fails with
`Could not resolve placeholder` — and an unset password reaches Hikari as `""`, which
PostgreSQL then rejects with
`FATAL: password authentication failed for user "smartbuild"`. The comment on that line
describes exactly this: `# defaults to an empty string; supply DB_PASSWORD or PostgreSQL
rejects the login`. See [setup.md §10](setup.md#10-troubleshooting) for the exact
failure text.

**Why it exists.** Same code runs on every machine; only the environment differs.
`open-in-view: false` is a correctness setting, not a preference: it forces all DB work
to happen inside service transactions instead of leaking a session into the view layer.

**When you would touch it.** Adding a placeholder for a genuinely new setting. Not to
put a password in it — `DB_PASSWORD` must stay environment-supplied, never literal.

---

## Backend packages (`com.smartbuild`)

Frozen = the seven existing packages and the `com.smartbuild` root stay exactly as they
are. Each member adds NEW sub-packages under `com.smartbuild` (for example
`com.smartbuild.plan`) and may add their own DTO records to `com.smartbuild.dto`. Never
add a class to another member's package. The same wording appears under
**Package map** in [architecture.md](architecture.md).

### `config` — `WebConfig.java`

**What it is.** One `@Configuration` registering a `WebMvcConfigurer` that applies CORS
to `/api/**`: allowed origins from `app.cors.allowed-origins` — split on `,`, each entry
`.trim()`-ed, and empty entries dropped, so `"http://a, ,http://b,"` becomes exactly two
origins — methods `GET, POST, PUT, DELETE, OPTIONS`, headers
`Content-Type, Authorization, Accept`, `allowCredentials(false)`, `maxAge(3600)`.

**Why it exists.** CORS must be configured from properties so each machine can declare
its own dev origin, and must **never** be `*` once credentials are in play.

**When you would touch it.** Only if a new HTTP method or header must be allowed for a
module. If your frontend runs on another port, you usually change
`CORS_ALLOWED_ORIGINS` instead of this file.

### `controller` — `HealthController`, `ProjectController`

**What it is.** The HTTP surface. `HealthController` maps `GET /api/health` →
`{"status":"UP"}`. `ProjectController` maps `/api/projects` to five methods
(POST, GET, GET/{id}, PUT/{id}, DELETE/{id}), annotates bodies with `@Valid`, and does
the `201` + `Location` / `204` status handling.

**Why it exists.** Thin by design: controllers translate HTTP ↔ service calls and
nothing else. No transactions, no repository access, no business rules.

**When you would touch it.** Adding mappings for a new resource — ideally a *new*
controller class rather than growing `ProjectController`.

### `dto` — `ProjectRequest`, `ProjectResponse`, `ApiError`

- **`ProjectRequest`** — the only accepted input shape, a `record` carrying all bean
  validation annotations. Used for both create and update.
- **`ProjectResponse`** — the only output shape, a `record` with a single static
  factory `ProjectResponse.from(Project entity)`.
- **`ApiError`** — the error envelope with `of(...)` and `withFieldErrors(...)`
  factories; `fieldErrors` is `@JsonInclude(NON_NULL)` so it disappears unless it has
  content.

**Why they exist.** Entity fields must never be bound directly to JSON: a client that
could set `createdAt` or `id` would corrupt the contract. Records also make the frozen
shapes easy to diff.

**When you would touch them.** Almost never — see
[Files you must not casually edit](#files-you-must-not-casually-edit). New modules add
*their own* DTOs.

#### `ProjectResponse` specifically

It is the contract object: 13 fields, in a fixed order, mirrored field-for-field by
`frontend/src/types/project.ts`. `from(entity)` is the single mapping point — if you
change a field here, you change every client. It never exposes entity internals beyond
the 13 columns.

### `model` — `Project`, `ProjectStatus`

**What it is.** The JPA entity for the `projects` table (see
[database.md](database.md)) and the four-value status enum.

**Why it exists.** It is the single source of schema truth — Hibernate reads it to
create/alter the table (`ddl-auto=update`).

**When you would touch it.** Adding a column that is genuinely part of the shared
`Project` (rare; discuss it first). Module-specific data belongs in a **new** entity in
a new package, not as columns on `Project`.

### `repository` — `ProjectRepository`

**What it is.** `interface ProjectRepository extends JpaRepository<Project, Long> {}` —
empty on purpose.

**Why it exists.** Spring Data gives `findById`, `findAll(Sort)`, `save`, `delete` out of
the box; Base-v1 needs nothing else. Custom queries are written only when a real need
appears (a `@Query` or derived method), not speculatively.

**When you would touch it.** Your module reads `Project` through
`ProjectRepository.findById(...)`; you rarely change this interface. Member 3 in
particular will *read* it, not modify it.

### `service` — `ProjectService`

**What it is.** The only place business operations live: `create`, `getAll`, `getById`,
`update`, `delete`. Writes are `@Transactional`, reads `@Transactional(readOnly = true)`.
It copies request fields onto the entity with `copyRequestToEntity(...)` and returns
`ProjectResponse.from(entity)` — the mapping itself lives on the DTO record — and throws
`ResourceNotFoundException` when `findById` is empty.

**Why it exists.** This is where semantics live that no annotation can express:

- `create`: null `status` stays `DRAFT` (entity default), null `budget` stored as null.
- `update`: null `status` keeps the existing value; null `budget` **clears** it — the
  method carries a comment saying exactly that, and `ProjectServiceTest` pins it.
- `getAll`: `findAll(Sort.by(DESC, "createdAt"))`.

**When you would touch it.** Adding operations for your own resources. If you need a
new *rule about projects themselves*, change it here (with a test), never in a
controller or a page.

### `exception` — `ResourceNotFoundException`, `GlobalExceptionHandler`

#### `GlobalExceptionHandler`

**What it is.** A `@RestControllerAdvice` with **ten** `@ExceptionHandler` methods
(`handleNoResource` covers two exception types) that turn every failure into an
`ApiError`:

| Exception | Status | `error` code |
|---|---|---|
| `MethodArgumentNotValidException` | 400 | `VALIDATION_ERROR` (+ `fieldErrors`) |
| `MethodArgumentTypeMismatchException` | 400 | `BAD_REQUEST` — `"Invalid value for path variable 'id'"` |
| `HttpMessageNotReadableException` | 400 | `BAD_REQUEST` — `"Malformed request body"` |
| `HttpMediaTypeNotSupportedException` | 400 | `BAD_REQUEST` — `"Unsupported content type; expected application/json"` |
| `HttpMediaTypeNotAcceptableException` | 406 in practice | no body — see the note below (the code asks for 400 with `"Requested response format is not supported; expected application/json"`) |
| `NoResourceFoundException` / `NoHandlerFoundException` | 404 | `NOT_FOUND` — `"No resource found for the requested path"` (an unknown path such as `GET /api/does-not-exist`; this used to fall through to 500) |
| `DataIntegrityViolationException` | 400 | `BAD_REQUEST` — `"The request could not be stored because it violates a data rule"` |
| `HttpRequestMethodNotSupportedException` | 405 | `METHOD_NOT_ALLOWED` |
| `ResourceNotFoundException` | 404 | `NOT_FOUND` |
| `Exception` (catch-all) | 500 | `INTERNAL_ERROR`, message `"An unexpected error occurred"` |

There is deliberately **no** `MissingServletRequestParameterException` handler: no
Base-v1 endpoint declares an `@RequestParam`, so the case cannot arise.

Note on `HttpMediaTypeNotAcceptableException`: the method is written to answer 400, but
a client that sends `Accept: application/xml` cannot be given *any* body, so Spring
fails while writing the handler's own response and the client ends up with
**406 and an empty body** (or 500 with an empty body when the failure happens inside a
different handler). Captured and explained in
[api-contract.md § Cross-cutting errors](api-contract.md#cross-cutting-errors).

**Why it exists.** Consistency, and safety. Without it each controller would invent its
own error JSON, and the catch-all is what guarantees a stack trace never reaches a
client — it logs server-side (`log.error("Unexpected error", ex)`) and returns a
constant message.

**When you would touch it.** Adding a handler for a new exception type your module
introduces (say a file-storage failure). Do **not** loosen the catch-all, and do not
start returning exception messages to clients.

#### `ResourceNotFoundException`

**What it is.** A `RuntimeException` with a static factory
`notFound("Project", id)` producing `"Project not found with id 99"`.

**Why it exists.** One canonical 404 message format, produced in one place.

**When you would touch it.** Reuse it from your services; extend the factory only if
you need a different resource noun.

### `backend/src/test/**` — and why no database is needed

**38 tests in five classes, all green** (`mvn test` → `Tests run: 38, Failures: 0`):

| Test class | Tests | Style | What it proves |
|---|---|---|---|
| `service/ProjectServiceTest` | 10 | Mockito unit (`@ExtendWith(MockitoExtension.class)`, `@Mock ProjectRepository`) | mapping, sorting (`createdAt` desc), status defaults, null-status/null-budget update semantics, 404 throwing |
| `controller/ProjectControllerTest` | 20 | `@WebMvcTest(ProjectController.class)` + `@MockitoBean ProjectService` | status codes, `Location` header, JSON paths, 400/404/405 shapes, malformed JSON, `@Digits` rejections, unknown-path 404, wrong-`Content-Type` 400, timestamp always present |
| `controller/HealthControllerTest` | 1 | `@WebMvcTest(HealthController.class)` | `GET /api/health` → 200 `{"status":"UP"}` |
| `config/WebConfigTest` | 3 | `@WebMvcTest(ProjectController.class)` + `@Import(WebConfig.class)` | CORS: allowed-origin preflight → 200, unknown origin → 403, no CORS headers outside `/api/**` |
| `model/ProjectTest` | 4 | plain JUnit + AssertJ (no Spring) | `DRAFT` default, `@PrePersist` sets both timestamps, `@PreUpdate` touches only `updatedAt`, the `@Column`/`@PrePersist`/`@PreUpdate` annotations themselves |

**Why they need no database.** The repository is mocked in the service test, and the
service itself is mocked in the controller tests — `@WebMvcTest` boots a sliced web
context without `DataSource`/JPA, so nothing ever connects to PostgreSQL. `mvn test`
therefore works on a machine with no PostgreSQL at all.

**When you would touch them.** Every time you change behaviour: add a test alongside the
change. Follow the existing split — business rules go in `ProjectServiceTest`, HTTP
behaviour in a `*ControllerTest`, entity/lifecycle behaviour in `ProjectTest`, and CORS
in `WebConfigTest`.

---

## Frontend

### `frontend/src/App.tsx` — the router

**What it is.** The entire route table, using plain `<BrowserRouter>` + `<Routes>`:

- Public pages under `<Route element={<AppLayout />}>`: `/`, `/projects`,
  `/projects/new`.
- `/projects/:projectId` → `<Navigate to={OVERVIEW_SEGMENT} replace />`.
- Workspace pages nested under `<Route path="/projects/:projectId" element={<ProjectWorkspaceLayout />}>`
  — **not written out by hand**: `App.tsx` maps `WORKSPACE_MODULES` and renders
  `ModulePlaceholderPage` (with `title` and `description`) for every entry whose
  `placeholder` is `true`, and `OverviewPage` for entries whose `placeholder` is
  `false` (today exactly one entry, `overview`).
- `*` → `NotFoundPage` (which shows an extra **Back to My Projects** button whenever
  the URL starts with `/projects/`, next to the usual **Back to home**).

**Why it exists.** One file to read when you need to know "where does this screen live".
Keeping placeholders as explicit routes is what makes Base-v1 honest: the tabs exist and
say they are not implemented.

**When you would touch it.** When the *element* for a route changes, rather than its
existence. Two cases:

1. a module is **not yet real** — nothing to do here; declare it in
   [`types/workspace.ts`](#workspace-ts) (step 3 of the "where do I add my module"
   recipe) and the route appears with its placeholder;
2. a module **becomes real** — the non-placeholder branch currently hard-codes
   `OverviewPage`, so as soon as a second module flips `placeholder` to `false` you must
   replace that ternary with a `segment` → component lookup.

Never move workspace routes out of the `/projects/:projectId` branch, or `projectId` is
lost.

<a id="workspace-ts"></a>
### `frontend/src/types/workspace.ts` — the workspace manifest

**What it is.** The single source of truth for the project workspace. It exports:

| Export | What it is |
|---|---|
| `WorkspaceModule` | the interface: `segment`, `navLabel`, `title`, `description`, `placeholder` |
| `OVERVIEW_SEGMENT` | `'overview'` — used by `App.tsx` for the redirect and by `OverviewPage` to exclude itself from the module cards |
| `WORKSPACE_MODULES` | the eight entries: `overview` (real) plus `plans`, `analysis`, `estimation`, `materials`, `labour`, `3d`, `reports` (all `placeholder: true`) |

Three files consume it, so the route, the sidebar link and the overview card can never
drift apart:

1. `App.tsx` builds the workspace `<Route>`s from it;
2. `ProjectWorkspaceLayout` builds the sidebar from it;
3. `OverviewPage` builds the "Project modules" cards from it
   (`WORKSPACE_MODULES.filter(m => m.segment !== OVERVIEW_SEGMENT)`).

**Why it exists.** Three separate views need the same eight modules — the routes in
`App.tsx`, the sidebar links in `ProjectWorkspaceLayout`, and the cards on
`OverviewPage`. With three hand-maintained lists, every new tab needs three coordinated
edits and one of them is always forgotten; with one array, they are three `map()`s over
the same data.

**When you would touch it.** Every time you add, reorder or un-placeholder a workspace
section. Entries may be added and reordered, but a `segment` must **never** be renamed —
segments are public URLs, so renaming one breaks every existing link such as
`/projects/42/estimation`. Add the entry here first, then (only if `placeholder`
becomes `false`) swap the element in `App.tsx`.

### `frontend/src/api/client.ts` — the only axios instance

**What it is.** `axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
headers: {'Content-Type':'application/json'}, timeout: 15000 })`, plus `toApiError(err)`
which normalises anything thrown into the `ApiError` shape — including a synthesised
`NETWORK_ERROR` when no response arrives (backend down).

Every call inherits the **15 s timeout** set here. A slow future endpoint (an AI
analysis call, for example) should pass `{ timeout: n }` as a per-request option in its
own api file; otherwise axios aborts the call and `toApiError` reports a misleading
`NETWORK_ERROR` for what was really a slow server. New modules must also reuse the
error-code vocabulary and the `201` + `Location` / `204` conventions documented in
[api-contract.md](api-contract.md) — see
[error code vocabulary](api-contract.md#error-code-vocabulary).

**Why it exists.** One place for base URL, headers and timeout; one place that decides
how server errors reach the UI. Pages must never build URLs by hand.

**When you would touch it.** Adding interceptors or another error helper if several
modules need them. If you find yourself editing the base URL inside a page, stop — that
belongs here (or in `frontend/.env`).

### `frontend/src/api/projects.ts` — typed calls

**What it is.** Five functions — `listProjects()`, `getProject(id)`,
`createProject(data)`, `updateProject(id, data)`, `deleteProject(id)` — each a thin
`client.get/post/put/delete` returning the typed payload.

**Why it exists.** Pages never see axios; they see promises typed as
`ProjectResponse[]` / `ProjectResponse`. This is the natural home for your module's API
functions (`api/estimation.ts`, `api/plans.ts`, …).

**When you would touch it.** To add functions for new endpoints. Do not change the
existing five signatures — other pages depend on them.

### `frontend/src/types/project.ts` — the contract in TypeScript

**What it is.** `ProjectStatus` (four-literal union), `ProjectRequest`,
`ProjectResponse`, `ApiError`, and `CONSTRUCTION_TYPES` (the six UI options).

**Why it exists.** It is the compile-time copy of the backend contract: if the backend
and this file disagree, `npm run build` fails — which is the point.

**When you would touch it.** Only for a coordinated, agreed contract change. Otherwise
add *new* type files next to it for your module's payloads. (Its sibling
`types/workspace.ts` is not part of the API contract — it is the workspace manifest
described [above](#workspace-ts).)

### `frontend/src/layouts/ProjectWorkspaceLayout.tsx` — the workspace shell

**What it is.** The layout every `/projects/:projectId/*` page renders inside. It:

1. reads `useParams<{ projectId: string }>()`, converts with `Number(...)` and rejects
   non-positive/non-integer ids with an error state (with a **Back to My Projects**
   link);
2. fetches the project in a `useEffect` keyed on `[projectId, attempt]`, with loading /
   error / ready phases. Every state is tagged `{projectId, attempt}` and a state that
   belongs to a different id (or an earlier retry) is ignored and replaced by a fresh
   loading state — so moving from project 4 to project 7 can never flash project 4's
   header. The error phase has a working **Retry** button (`setAttempt(v => v + 1)`)
   plus **Back to My Projects**;
3. renders the header (name, `StatusBadge`, city/state) and the eight-item nav from
   `WORKSPACE_MODULES`, each link built as `` `/projects/${projectId}/${segment}` ``
   with a "coming soon" marker on placeholders. The header **scrolls away** (it is
   deliberately not sticky — see the comment in the CSS) while the sidebar is
   `position: sticky; top: var(--space-4)`;
4. passes the loaded project to children via `<Outlet context={{ project }} />`.

**Why it exists.** The `projectId` must never be lost while navigating between modules,
and the project must not be re-fetched by every tab.

**When you would touch it.** Almost never for nav changes — the nav comes from
[`types/workspace.ts`](#workspace-ts). Touch it to change the shell itself: header
layout, loading/error presentation, the outlet context. Child pages read the project
with `useOutletContext<{ project: ProjectResponse }>()`, exactly as `OverviewPage` does.

### `frontend/src/styles/tokens.css` — design tokens

**What it is.** A `:root` block of CSS custom properties: colours
(`--color-primary: #1d4ed8`, `--color-text`, `--color-danger`, soft variants), radii,
shadows, spacing (`--space-1` … `--space-8`), `--font-sans`, `--header-height`. It is
imported first in `main.tsx`.

**Why it exists.** Hand-written CSS stays coherent only if colours and spacing are
defined once. Every component stylesheet uses `var(--color-…)` rather than a literal.

**When you would touch it.** To add a token you need repeatedly (a new semantic colour).
Not to restyle the app — that means editing component CSS, and should be a deliberate,
team-wide change.

Related: `styles/global.css` (reset, base typography, `.container`, `.muted`,
`.pill`, form controls) and `components/components.css` (button/badge/state classes).
In the current stylesheet, buttons also define `.btn.is-loading { cursor: progress }`,
`.form-field--invalid .form-field__label` paints its label `--color-danger`, and
`.not-found__actions` centres the two buttons on the 404 page. There are no `.stack` /
`.row` utility classes — they were removed as unused, so do not reference them in new
pages.

### A few components worth knowing before you edit them

| File | Behaviour to preserve |
|---|---|
| `frontend/src/components/StatusBadge.tsx` | Maps the four `ProjectStatus` values to a styled pill; **any other value falls back to rendering the raw string**, so a backend status added later still shows (not blank) even before its style exists. |
| `frontend/src/pages/workspace/OverviewPage.tsx` | Module cards are generated from `WORKSPACE_MODULES` — the file filters them into a local `MODULE_LINKS` (excluding `OVERVIEW_SEGMENT`), so a new module appears on the Overview page automatically. `budget` is rendered as **Not set** when it is `null` (`project.budget == null`, so `0` still prints as `0`). |
| `frontend/src/pages/NotFoundPage.tsx` | Two actions: **Back to home** always; **Back to My Projects** only when the path starts with `/projects/`. The oversized `404` glyph uses `--color-text-muted`, not `--color-text`. |
| `frontend/src/components/*` and `frontend/src/styles/global.css` | Placeholder-page body text also uses `--color-text-muted` for contrast on `--color-surface`. |

---

## The three "where do I add my module" recipes

### Member 2 (Plans / AI Analysis)

1. **Backend packages.** Create `com.smartbuild.plan` (and/or `com.smartbuild.analysis`)
   — FUTURE, not implemented in Base-v1. In each: `model/FloorPlan.java` with
   `@Column(name = "project_id") private Long projectId;` (or `@ManyToOne Project`),
   `repository/FloorPlanRepository.java extends JpaRepository<FloorPlan, Long>`,
   `service/FloorPlanService.java` (`@Transactional`, loads the project first via
   `ProjectRepository.findById` and throws `ResourceNotFoundException` if absent), and
   `controller/FloorPlanController.java` mapped to
   `/api/projects/{projectId}/plans` — FUTURE, not implemented in Base-v1.
2. **Validation and errors.** Put constraints on a new DTO record in `com.smartbuild.dto`
   (e.g. `FloorPlanRequest`), reuse `@Valid`, and let `GlobalExceptionHandler` produce
   the `ApiError`. Add a handler only for exceptions specific to uploads/analysis.
3. **Frontend route.** Declare the entries in `WORKSPACE_MODULES` in
   `frontend/src/types/workspace.ts` (set `placeholder: false` for `plans` and
   `analysis`) — that creates the routes, the sidebar links and the overview cards in
   one edit. Then in `frontend/src/App.tsx`, replace the corresponding
   `<ModulePlaceholderPage>` element with your page component, keeping the route inside
   the `<Route path="/projects/:projectId" element={<ProjectWorkspaceLayout />}>`
   branch — FUTURE, not implemented in Base-v1. Any nested sub-route (for example
   `analysis/:resultId`) must be a hand-written `<Route>` child inside that same
   `/projects/:projectId` branch in `App.tsx`, never a top-level route, or the
   workspace shell and outlet context are lost.
4. **Frontend plumbing.** Add `frontend/src/api/plans.ts` using the shared client, types
   in `frontend/src/types/`, and read the project from
   `useOutletContext<{ project: ProjectResponse }>()` instead of re-fetching. Do not
   edit the nav by hand — it follows `WORKSPACE_MODULES` automatically. Add your
   endpoint(s) and their error/status rows to [api-contract.md](api-contract.md) so it
   stays the complete API surface.
5. **Before you write the upload endpoint**, read
   [File uploads in Base-v1](#file-uploads) below — the multipart limits and the error
   handling have to be added together with it.

<a id="file-uploads"></a>
### File uploads in Base-v1 — FUTURE, not implemented

Everything in this subsection describes what Member 2 must add. **Base-v1 contains no
file-upload or file-storage code at all** — no upload directory, no storage service, no
multipart configuration.

- The floor-plan upload will be `multipart/form-data`. No Base-v1 endpoint accepts it.
- Spring Boot's unconfigured defaults apply: **1 MB max file size / 10 MB max request
  size** (`spring.servlet.multipart.max-file-size` / `max-request-size`).
  `backend/src/main/resources/application.yml` contains no `multipart` block at all, so
  those defaults are in force today — **a PDF over 1 MB will fail**.
- `MaxUploadSizeExceededException` is not handled by `GlobalExceptionHandler`; it falls
  through the catch-all and surfaces as the generic **500 `INTERNAL_ERROR`**. When
  Member 2 adds uploads, they must also raise `spring.servlet.multipart.max-file-size`
  and `max-request-size` in `application.yml` and add a dedicated
  `@ExceptionHandler(MaxUploadSizeExceededException.class)` that returns a clean **4xx**
  with an `ApiError` body.
- `/uploads/` is already listed in the root `.gitignore` — that is the intended storage
  directory. It is **not** created or used by Base-v1.
- The shared axios client (`frontend/src/api/client.ts`) sets
  `Content-Type: application/json` as a default header. axios removes/overrides that
  header automatically when the body is `FormData`, so `client.post(url, formData)`
  works as-is — but the member must **not** set `Content-Type` manually (the boundary
  would be wrong).

### Member 3 (Estimation / Materials / Labour)

1. **Backend packages.** Create `com.smartbuild.estimation`, `com.smartbuild.material`,
   `com.smartbuild.labour` with entity + repository + service + controller each —
   FUTURE, not implemented in Base-v1. Controllers mount under
   `/api/projects/{projectId}/estimation`, `/api/projects/{projectId}/materials` and
   `/api/projects/{projectId}/labour`.
2. **Read project data, do not copy it.** Estimation needs land area, built-up area,
   `floorCount` and `budget`. Load them through `ProjectRepository.findById(projectId)`
   (or `ProjectService.getById`) inside your service — FUTURE, not implemented in
   Base-v1. Never accept those numbers in the request body: the client would then be the
   second source of truth.
3. **All calculation stays backend-side.** Quantities, costs and durations are computed
   in the service and returned as data; the UI only renders them — see
   [architecture.md](architecture.md#why-the-frontend-has-no-business-calculations).
4. **Frontend route.** Flip `placeholder` to `false` for `estimation`, `materials` and
   `labour` in `types/workspace.ts`, then replace the matching
   `<ModulePlaceholderPage>` elements in `App.tsx` with real pages under
   `/projects/:projectId/...` — FUTURE, not implemented in Base-v1. Add
   `api/estimation.ts` etc.; keep every new response type out of `types/project.ts`.
   Any nested sub-route (for example `estimation/:lineId`) must be a hand-written
   `<Route>` child inside the existing `/projects/:projectId` branch in `App.tsx`,
   never a top-level route, or the workspace shell and outlet context are lost. Add your
   endpoint(s) and their error/status rows to [api-contract.md](api-contract.md) so it
   stays the complete API surface.

### Member 4 (3D / Reports)

1. **Backend packages.** Create `com.smartbuild.visualization` and
   `com.smartbuild.report` (entity + repository + service + controller) mounted at
   `/api/projects/{projectId}/3d` and `/api/projects/{projectId}/reports` — FUTURE, not
   implemented in Base-v1.
2. **Consume Members 2 and 3, do not recompute.** Reports aggregate floor-plan,
   analysis and estimation output by reading *their* repositories/entities, and the 3D
   view renders the geometry/quantities they produced — FUTURE, not implemented in
   Base-v1. If a number needs changing, change it where it is calculated (Members 2/3),
   not in the report. If the Members 2/3 tables do not exist yet, build the dashboard
   from `Project` alone and guard report queries so they render an empty state instead
   of a 500.
3. **Frontend route.** Flip `placeholder` to `false` for `3d` and `reports` in
   `types/workspace.ts`, then replace the matching elements in `App.tsx` — FUTURE, not
   implemented in Base-v1. Heavy rendering libraries are your dependency decision; add
   them to `frontend/package.json` and say so in the PR. Any nested sub-route (for
   example `reports/:reportId`) must be a hand-written `<Route>` child inside the
   existing `/projects/:projectId` branch in `App.tsx`, never a top-level route, or the
   workspace shell and outlet context are lost.
4. **Keep the workspace contract.** Same outlet context, same
   `/projects/${projectId}/...` links, same loading/error state components. Add your
   endpoint(s) and their error/status rows to [api-contract.md](api-contract.md) so it
   stays the complete API surface.

---

## Files you must not casually edit

| File | Why |
|---|---|
| `frontend/src/types/project.ts` | Compile-time copy of the API contract. A unilateral edit desynchronises frontend and backend — it either breaks the build or, worse, compiles while the server sends different JSON. Change it only together with a coordinated backend change. |
| `frontend/src/types/workspace.ts` | One list drives three views (routes, sidebar, overview cards). An entry added here appears everywhere at once — which is the point, but it means a careless edit changes navigation for every project. Add entries, do not restructure the file. |
| `backend/.../dto/ProjectResponse.java` | Every client depends on these 13 field names and their types. The root README's shared rule #1 forbids changing them: add new endpoints instead. |
| Root `.gitignore` | Its `.env` rules are what keep passwords out of the repository, and the `target/`, `node_modules/`, `dist/` rules keep binaries out. Loosening any of them risks committing secrets or build output. |
| `backend/src/main/resources/application.yml` defaults | `DB_PASSWORD` resolves to the empty string when unset (an intentional "supply it or authentication fails" failure mode), `open-in-view: false` is a correctness setting, CORS must never default to `*`, and `ddl-auto` is a documented local-dev compromise. Changing a default silently changes every teammate's environment. |

Also treat as frozen without saying so twice: the endpoint paths in
`ProjectController` (documented in [api-contract.md](api-contract.md)) and the package
layout under `com.smartbuild` (frozen as defined above).

---

See also: [setup.md](setup.md) to run it, [database.md](database.md) for the table,
[verification.md](verification.md) for what has actually been tested.
