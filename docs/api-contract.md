# API contract — Base-v1

Everything the backend actually serves, as captured from running instances
(Spring Boot 3.5.16 on `:8080`, PostgreSQL 16 in Docker). The error and validation
captures were re-taken during the current documentation pass; the older create/list
captures come from an earlier session against the same code. Ids and timestamps below
are verbatim — **your ids and timestamps will differ**.

- Base URL for every example: `http://localhost:8080`
- Content type: `application/json` for requests that have a body
- Frontend calls these through the Vite proxy (`/api` → `:8080`), so in the browser the
  same paths are `http://localhost:5173/api/...`

Endpoints in this document are the complete Base-v1 surface. There are no others —
verify with `grep -r "Mapping" backend/src/main/java` if you want to check.

File upload (`multipart/form-data`) is **FUTURE — not implemented in Base-v1**; when it
is added, its endpoint and error/status rows must be added here too (see
[base-files.md § File uploads](base-files.md#file-uploads)).

---

## Endpoint summary

| Method | Path | Success | Body | Always-on errors |
|---|---|---|---|---|
| GET | `/api/health` | 200 `{"status":"UP"}` | — | 405 for other methods |
| POST | `/api/projects` | **201** + `Location: /api/projects/{id}` | `ProjectResponse` | 400 validation / malformed |
| GET | `/api/projects` | 200 array of `ProjectResponse` | `ProjectResponse[]` | — |
| GET | `/api/projects/{id}` | 200 `ProjectResponse` | `ProjectResponse` | 400 bad id, 404 missing |
| PUT | `/api/projects/{id}` | 200 `ProjectResponse` | `ProjectResponse` | 400 validation / malformed, 404 missing |
| DELETE | `/api/projects/{id}` | **204** no body | — | 404 missing |

Four more responses can be produced on **any** `/api/**` path before an endpoint
handler runs — 404 for an unknown path, 400 for the wrong `Content-Type`, 406 for an
unsatisfiable `Accept`, and 400 when the database rejects a value. They are captured
in [Cross-cutting errors](#cross-cutting-errors).

---

## Cross-cutting errors

All four below were captured against a running instance in this documentation pass.

### Unknown path → 404 `NOT_FOUND`

```bash
curl -i http://localhost:8080/api/does-not-exist
```

```text
HTTP/1.1 404
Content-Type: application/json

{"timestamp":"2026-09-30T21:14:01.903992562Z","status":404,"error":"NOT_FOUND","message":"No resource found for the requested path"}
```

Any URL no mapping claims gets this response — including non-`/api` paths on the API
port (`GET /foo` and even `GET /` return the same 404 body; the backend serves no
static content). Handlers: `NoResourceFoundException` and `NoHandlerFoundException`.
This used to fall through to 500; it is 404 now.

### Wrong `Content-Type` on POST/PUT → 400 `BAD_REQUEST`

```bash
curl -i -X POST http://localhost:8080/api/projects -H 'Content-Type: text/plain' -d 'hello'
```

```text
HTTP/1.1 400
{"timestamp":"2026-09-30T21:14:01.937435558Z","status":400,"error":"BAD_REQUEST","message":"Unsupported content type; expected application/json"}
```

The request body is never parsed in this case, so the handler is
`HttpMediaTypeNotSupportedException`.

### Unsatisfiable `Accept` header → 406, empty body

```bash
curl -s -D - -o /dev/null -H 'Accept: application/xml' http://localhost:8080/api/health
```

```text
HTTP/1.1 406
Vary: Origin
Vary: Access-Control-Request-Method
Vary: Access-Control-Request-Headers
Accept: application/json, application/*+json
Content-Length: 0
Date: Wed, 30 Sep 2026 22:21:42 GMT
```

No `Content-Type` is sent and there is no body at all: `curl … | wc -c` → `0`.
Spring can only serialise JSON, and the client has declared it will not accept JSON,
so there is no way to render an `ApiError` the client could read: the response is
**406 with an empty body**. The handler
`GlobalExceptionHandler#handleNotAcceptable` *is* written to answer
**400** with `"Requested response format is not supported; expected application/json"`,
but that body can never be encoded for a client that refuses JSON, so the 406 status is
what arrives.

Two consequences:

- Never assume every error has a JSON body — check the status code first.
- Caveat captured in this pass: if the request would *also* have produced an error
  body, the nested failure surfaces differently. `Accept: application/xml` on
  `/api/projects/9999` (whose 404 body cannot be rendered either) returned
  **500 with an empty body**, and the server log records
  `Failure in @ExceptionHandler GlobalExceptionHandler#handleNotFound`.

### Data rule violated at the database → 400 `BAD_REQUEST`

```bash
curl -i -X POST http://localhost:8080/api/projects -H 'Content-Type: application/json' \
  -d '{"name":"Nul Test","state":"Karnataka\u0000X","district":"Bengaluru Urban","city":"Bengaluru","constructionType":"Residential","landAreaSqFt":100,"builtUpAreaSqFt":100,"floorCount":1}'
```

```text
HTTP/1.1 400
{"timestamp":"2026-09-30T21:14:58.097869593Z","status":400,"error":"BAD_REQUEST","message":"The request could not be stored because it violates a data rule"}
```

That request passes every bean-validation rule — to Java, `state` is an ordinary
16-character string — but PostgreSQL rejects the NUL byte with
`ERROR: 22021 invalid byte sequence for encoding "UTF8": 0x00`.
`DataIntegrityViolationException` is mapped to **400**, not 500, and the transaction
is rolled back (`GET /api/projects` returned `[]` immediately afterwards).

---

## GET /api/health

**Purpose.** Liveness check. No database access — it returns `UP` even if PostgreSQL is
down, so it tells you "the JVM and Tomcat are alive", nothing more.

```bash
curl -i http://localhost:8080/api/health
```

```text
HTTP/1.1 200
Content-Type: application/json

{"status":"UP"}
```

| Status | When |
|---|---|
| 200 | always, while the process is up |
| 405 | any other method — captured with `curl -s -X POST http://localhost:8080/api/health`: `{"timestamp":"2026-09-30T22:21:42.043358916Z","status":405,"error":"METHOD_NOT_ALLOWED","message":"Request method 'POST' is not supported"}` |

---

## POST /api/projects

**Purpose.** Create one project. The response body is the created row, and the
`Location` header points at it.

```bash
curl -i -X POST http://localhost:8080/api/projects \
  -H 'Content-Type: application/json' \
  -d '{
  "name": "Docs Smoke Villa",
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

Response — captured:

```text
HTTP/1.1 201
Location: /api/projects/18
Content-Type: application/json
```

```json
{"id":18,"name":"Docs Smoke Villa","state":"Karnataka","district":"Bengaluru Urban","city":"Bengaluru","constructionType":"Residential","landAreaSqFt":2400.00,"builtUpAreaSqFt":1800.50,"floorCount":2,"budget":4500000.00,"status":"DRAFT","createdAt":"2026-09-30T21:45:29.058967577Z","updatedAt":"2026-09-30T21:45:29.058967577Z"}
```

| Status | When |
|---|---|
| **201** | created; `Location` is always `/api/projects/{id}` |
| 400 `VALIDATION_ERROR` | any required field missing/invalid (see [validation notes](#validation-notes)) |
| 400 `BAD_REQUEST` | body is not JSON, `status` is not one of `DRAFT`/`ACTIVE`/`COMPLETED`/`ARCHIVED`, or the `Content-Type` is not `application/json` (see [cross-cutting errors](#cross-cutting-errors)) |
| 500 `INTERNAL_ERROR` | last-resort catch-all — no instance is reachable through normal validation any more; see [error code vocabulary](#error-code-vocabulary) |

Notes:

- `status` omitted → **`DRAFT`** (captured: request above has no `status`, response has
  `"status":"DRAFT"`).
- `status` supplied → used as-is. Captured: a request carrying `"status":"ACTIVE"`
  returned `"status":"ACTIVE"` (and nothing else was defaulted around it).
- `budget` omitted or `null` → `"budget": null`.
- `id`, `createdAt`, `updatedAt` in the request body are **ignored** — they are not
  fields of `ProjectRequest`.
- Numbers are JSON numbers; they land in `BigDecimal` columns with fixed scale, and
  `@Digits` caps them at the column precision before the database is involved —
  `landAreaSqFt`/`builtUpAreaSqFt` at 10+2 digits, `budget` at 12+2 digits.

---

## GET /api/projects

**Purpose.** List every project, **newest first** (`createdAt` descending). Unpaginated
in Base-v1 — see the [note](#pagination) below.

```bash
curl -s http://localhost:8080/api/projects
```

Response — captured (two projects, created two seconds apart):

```json
[
  {"id":20,"name":"Beta Towers","state":"Maharashtra","district":"Pune","city":"Pune","constructionType":"Commercial","landAreaSqFt":5000.00,"builtUpAreaSqFt":12000.00,"floorCount":9,"budget":null,"status":"DRAFT","createdAt":"2026-09-30T21:48:06.057419Z","updatedAt":"2026-09-30T21:48:06.057419Z"},
  {"id":19,"name":"Alpha Quarters","state":"Karnataka","district":"Bengaluru Urban","city":"Bengaluru","constructionType":"Residential","landAreaSqFt":1200.00,"builtUpAreaSqFt":950.00,"floorCount":1,"budget":2500000.00,"status":"ACTIVE","createdAt":"2026-09-30T21:48:04.006808Z","updatedAt":"2026-09-30T21:48:04.006808Z"}
]
```

`id` 20 was created after `id` 19 and therefore comes first — ordering is by `createdAt`
desc, not by id.

| Status | When |
|---|---|
| 200 | always (an empty database returns `[]`, not 204) |
| 405 | any other method |

<a id="pagination"></a>**Pagination:** there is none in Base-v1. No `page`, `size`,
`limit` or `offset` parameters exist, and no response envelope wraps the array. Every
project is returned on every call. This is a documented limitation, not an oversight —
see the root [README](../README.md#current-limitations-honest-list).

---

## GET /api/projects/{id}

**Purpose.** Fetch one project.

```bash
curl -i http://localhost:8080/api/projects/19
```

Response — captured:

```text
HTTP/1.1 200
Content-Type: application/json
```

```json
{"id":19,"name":"Alpha Quarters","state":"Karnataka","district":"Bengaluru Urban","city":"Bengaluru","constructionType":"Residential","landAreaSqFt":1200.00,"builtUpAreaSqFt":950.00,"floorCount":1,"budget":2500000.00,"status":"ACTIVE","createdAt":"2026-09-30T21:48:04.006808Z","updatedAt":"2026-09-30T21:48:04.006808Z"}
```

404 — captured:

```bash
curl -i http://localhost:8080/api/projects/9999
```

```text
HTTP/1.1 404
```

```json
{"timestamp":"2026-09-30T21:48:16.303041245Z","status":404,"error":"NOT_FOUND","message":"Project not found with id 9999"}
```

| Status | When |
|---|---|
| 200 | project exists |
| 400 `BAD_REQUEST` | `{id}` is not a number — `"Invalid value for path variable 'id'"` (captured with `/api/projects/abc`) |
| 404 `NOT_FOUND` | no row with that id |
| 405 | e.g. `PATCH /api/projects/19` |

---

<a id="put"></a>
## PUT /api/projects/{id}

**Purpose.** Full update. The body is a complete `ProjectRequest`; every field in it
overwrites the stored value (there is no partial/merge semantics).

```bash
curl -i -X PUT http://localhost:8080/api/projects/12 \
  -H 'Content-Type: application/json' \
  -d '{
  "name": "Docs Smoke Villa Updated",
  "state": "Karnataka",
  "district": "Bengaluru Urban",
  "city": "Mysuru",
  "constructionType": "Commercial",
  "landAreaSqFt": 3000.00,
  "builtUpAreaSqFt": 2200.00,
  "floorCount": 3,
  "budget": null
}'
```

Response — captured:

```text
HTTP/1.1 200
Content-Type: application/json
```

```json
{"id":12,"name":"Docs Smoke Villa Updated","state":"Karnataka","district":"Bengaluru Urban","city":"Mysuru","constructionType":"Commercial","landAreaSqFt":3000.00,"builtUpAreaSqFt":2200.00,"floorCount":3,"budget":null,"status":"DRAFT","createdAt":"2026-09-30T21:16:42.057588Z","updatedAt":"2026-09-30T21:16:42.057588Z"}
```

What this single capture demonstrates:

- `"budget": null` in the request → **cleared**: the response has `"budget": null`.
- `status` omitted from the request → **kept**: the project was `DRAFT` before and after.
- `createdAt` is unchanged.

**`updatedAt` gotcha (documented on purpose):** in the PUT *response* it is still the
**old** timestamp (`…21:16:42.057588Z`, the creation time) even though the row was
written at `…21:17:00.538033Z`. The response is built inside the `@Transactional`
service method, while `@PreUpdate` only runs when Hibernate flushes at commit —
i.e. *after* the response object already copied the field. A follow-up `GET`
returns the real value:

```bash
curl -s http://localhost:8080/api/projects/12
```

```json
{"id":12,"name":"Docs Smoke Villa Updated",…,"createdAt":"2026-09-30T21:16:42.057588Z","updatedAt":"2026-09-30T21:17:00.538033Z"}
```

Confirmed twice in this pass (the second `PUT` returned `updatedAt`
`2026-09-30T21:17:00.538033Z` — the value the first `PUT` had written — while the
row actually moved to `2026-09-30T21:17:38.829927Z`). Rule: **read `updatedAt` back
with a GET if you need the write time.** Creating is unaffected, because `IDENTITY`
id generation forces the insert (and therefore `@PrePersist`) to happen before the
response is built — that is why a 201 body carries exact, 9-fractional-digit
timestamps.

| Status | When |
|---|---|
| **200** | updated; body is the updated row |
| 400 `VALIDATION_ERROR` / `BAD_REQUEST` | invalid or malformed body — **even if the id does not exist**, see the note below |
| 404 `NOT_FOUND` | valid body, but no row with that id (captured: `PUT /api/projects/9999`) |
| 405 | other methods |

**Ordering gotcha (documented on purpose):** bean validation runs in the controller
*before* the service looks the row up. A `PUT` to a **non-existent** id with an
**invalid** body therefore returns **400**, not 404. Captured:

```bash
curl -i -X PUT http://localhost:8080/api/projects/9999 \
  -H 'Content-Type: application/json' -d '{"name":""}'
```

```text
HTTP/1.1 400
{"timestamp":"2026-09-30T21:18:39.534899663Z","status":400,"error":"VALIDATION_ERROR","message":"Validation failed for 8 field(s)","fieldErrors":{"name":"must not be blank","district":"must not be blank","landAreaSqFt":"must not be null","floorCount":"must not be null","builtUpAreaSqFt":"must not be null","state":"must not be blank","city":"must not be blank","constructionType":"must not be blank"}}
```

With a **valid** body the same id returns 404. Do not write client logic that expects
404 for "unknown id" regardless of body validity.

---

## DELETE /api/projects/{id}

**Purpose.** Remove one project permanently.

```bash
curl -i -X DELETE http://localhost:8080/api/projects/19
```

```text
HTTP/1.1 204
Content-Length: 0
```

No body, no `Content-Type`. Deleting an id that does not exist:

```bash
curl -i -X DELETE http://localhost:8080/api/projects/9999
```

```text
HTTP/1.1 404
{"timestamp":"2026-09-30T21:48:16.303041245Z","status":404,"error":"NOT_FOUND","message":"Project not found with id 9999"}
```

| Status | When |
|---|---|
| **204** | the row was deleted; there is no body |
| 404 | no row with that id |
| 405 | other methods |

There is no cascade logic in Base-v1: `projects` is the only table, so nothing else is
affected. **FUTURE — not implemented in Base-v1:** when other tables gain a
`project_id` foreign key, the delete behaviour of those rows must be decided then.

---

# Frozen contract

These shapes are frozen. Backend (`backend/src/main/java/com/smartbuild/dto/`),
frontend (`frontend/src/types/project.ts`) and this document must stay identical. The
tables below are complete — no field exists that is not listed.

## `ProjectRequest` — request body for POST and PUT

Single record used for both create and update.

```json
{
  "name": "Greenfield Villa",
  "state": "Karnataka",
  "district": "Bengaluru Urban",
  "city": "Bengaluru",
  "constructionType": "Residential",
  "landAreaSqFt": 2400.00,
  "builtUpAreaSqFt": 1800.50,
  "floorCount": 2,
  "budget": 4500000.00,
  "status": "DRAFT"
}
```

| Field | Type | Required? | Rule (Jakarta Bean Validation on `dto/ProjectRequest`) |
|---|---|---|---|
| `name` | string | **required** | `@NotBlank`, `@Size(min=2, max=150)` |
| `state` | string | **required** | `@NotBlank`, `@Size(max=100)` |
| `district` | string | **required** | `@NotBlank`, `@Size(max=100)` |
| `city` | string | **required** | `@NotBlank`, `@Size(max=100)` |
| `constructionType` | string | **required** | `@NotBlank`, `@Size(max=100)` — free text on the API side; the UI offers `Residential`, `Commercial`, `Industrial`, `Institutional`, `Mixed Use`, `Other` |
| `landAreaSqFt` | number | **required** | `@NotNull`, `@Positive`, `@Digits(integer=10, fraction=2)` |
| `builtUpAreaSqFt` | number | **required** | `@NotNull`, `@Positive`, `@Digits(integer=10, fraction=2)` |
| `floorCount` | integer | **required** | `@NotNull`, `@Min(1)`, `@Max(200)` |
| `budget` | number | optional | `@PositiveOrZero` **only when present**, plus `@Digits(integer=12, fraction=2)`; `null`/absent allowed |
| `status` | enum | optional | one of `DRAFT`, `ACTIVE`, `COMPLETED`, `ARCHIVED`; `null`/absent allowed |

Unknown extra JSON properties are not rejected — verified live: a POST carrying an
unknown `"totallyUnknownField"` returned **201** and the field never reached the entity.
(Spring Boot's Jackson builder disables `FAIL_ON_UNKNOWN_PROPERTIES`.) Extra properties
are silently dropped.

### `null` semantics (create vs update)

| Field | On **create**, `null`/absent | On **update**, `null`/absent |
|---|---|---|
| `status` | → stored as `DRAFT` (the `Project` field initializer) | → **keep the existing status** (`ProjectService` only calls `setStatus` when non-null) |
| `budget` | → stored as `NULL` (no budget) | → **cleared to `NULL`** (`copyRequestToEntity` always assigns `request.budget()`) |
| any required field | → 400 `VALIDATION_ERROR` | → 400 `VALIDATION_ERROR` (validation runs before the lookup) |

`budget` and `status` therefore behave *differently* from each other on update. That is
intentional and covered by `ProjectServiceTest`.

## `ProjectResponse` — response body for 200/201

Field names, order and types are the frozen contract; the values below are the
contract's illustrative example (real captures are in the endpoint sections above).

```json
{
  "id": 1,
  "name": "Greenfield Villa",
  "state": "Karnataka",
  "district": "Bengaluru Urban",
  "city": "Bengaluru",
  "constructionType": "Residential",
  "landAreaSqFt": 2400.00,
  "builtUpAreaSqFt": 1800.50,
  "floorCount": 2,
  "budget": 4500000.00,
  "status": "DRAFT",
  "createdAt": "2026-10-01T10:15:30.123456Z",
  "updatedAt": "2026-10-01T10:15:30.123456Z"
}
```

| Field | Type | Nullable | Notes |
|---|---|---|---|
| `id` | integer (`Long`) | no | server-assigned identity; never accepted on input |
| `name` | string | no | |
| `state` | string | no | |
| `district` | string | no | |
| `city` | string | no | |
| `constructionType` | string | no | |
| `landAreaSqFt` | number | no | `BigDecimal` scale 2 |
| `builtUpAreaSqFt` | number | no | `BigDecimal` scale 2 |
| `floorCount` | integer | no | 1–200 |
| `budget` | number \| `null` | **yes** | `null` when never set or cleared |
| `status` | string enum | no | always present: `DRAFT` \| `ACTIVE` \| `COMPLETED` \| `ARCHIVED` |
| `createdAt` | ISO-8601 timestamp | no | UTC, server-managed |
| `updatedAt` | ISO-8601 timestamp | no | UTC, server-managed |

Timestamp details, observed live: a freshly created row (the `POST` capture above) returned
`"createdAt":"2026-09-30T21:45:29.058967577Z"` (9 fractional digits, straight from the
JVM `Instant`), and the **same row** read back with `GET /api/projects/18` returned
`"createdAt":"2026-09-30T21:45:29.058968Z"` (6 fractional digits — PostgreSQL
`timestamp` precision is microseconds). Clients must not depend on a fixed number of
fractional digits.

<a id="apierror"></a>
## `ApiError` — every non-2xx JSON body

```json
{
  "timestamp": "2026-09-30T21:17:00.723247258Z",
  "status": 400,
  "error": "VALIDATION_ERROR",
  "message": "Validation failed for 3 field(s)",
  "fieldErrors": {
    "name": "must not be blank",
    "landAreaSqFt": "must be greater than 0",
    "floorCount": "must be greater than or equal to 1"
  }
}
```

| Field | Type | Present when |
|---|---|---|
| `timestamp` | ISO-8601 timestamp | always |
| `status` | integer | always — mirrors the HTTP status |
| `error` | string | always — the [error code](#error-code-vocabulary) |
| `message` | string | always — human-readable, safe to show to a user |
| `fieldErrors` | object of `field` → message | **only** for `VALIDATION_ERROR`; omitted otherwise (`@JsonInclude(NON_NULL)`) |

`fieldErrors` key order follows Hibernate Validator's binding order; treat it as an
unordered map.

**The message for a given field is not always the same one.** Where a field carries two
constraints that a single bad value violates — `name` has both `@NotBlank` and
`@Size(min = 2)`, so `""` breaks both — Hibernate reports one of them, and *which* one
varies between identical runs. Five back-to-back requests with the same body returned
`"must be between 2 and 150 characters"` three times and `"must not be blank"` twice.
Clients must match on the field name, never on the exact wording.

### Real examples, one per error class

**400 — validation** (captured):

```bash
curl -i -X POST http://localhost:8080/api/projects -H 'Content-Type: application/json' \
  -d '{"name":"","state":"Karnataka","district":"Bengaluru Urban","city":"Bengaluru","constructionType":"Residential","landAreaSqFt":-100,"builtUpAreaSqFt":1800.50,"floorCount":0}'
```

```text
HTTP/1.1 400
{"timestamp":"2026-09-30T21:17:00.723247258Z","status":400,"error":"VALIDATION_ERROR","message":"Validation failed for 3 field(s)","fieldErrors":{"floorCount":"must be greater than or equal to 1","landAreaSqFt":"must be greater than 0","name":"must not be blank"}}
```

**400 — malformed body** (captured, truncated JSON):

```bash
curl -i -X POST http://localhost:8080/api/projects -H 'Content-Type: application/json' -d '{"name": '
```

```text
HTTP/1.1 400
{"timestamp":"2026-09-30T21:17:00.757379948Z","status":400,"error":"BAD_REQUEST","message":"Malformed request body"}
```

The same code covers an unknown enum value — captured with `"status":"BOGUS"`:

```text
HTTP/1.1 400
{"timestamp":"2026-09-30T21:17:00.810586240Z","status":400,"error":"BAD_REQUEST","message":"Malformed request body"}
```

and a non-numeric path variable — captured with `/api/projects/abc`:

```text
HTTP/1.1 400
{"timestamp":"2026-09-30T21:17:00.852824092Z","status":400,"error":"BAD_REQUEST","message":"Invalid value for path variable 'id'"}
```

**400 — unsupported content type** and **400 — data rule violated** are captured in
[Cross-cutting errors](#cross-cutting-errors); both use `BAD_REQUEST` with their own
fixed messages.

**404 — not found** (captured):

```text
HTTP/1.1 404
{"timestamp":"2026-09-30T21:26:02.066613365Z","status":404,"error":"NOT_FOUND","message":"Project not found with id 9999"}
```

Message format is fixed: `"Project not found with id {id}"`.
`fieldErrors` is absent. An **unknown path** gets the other fixed 404 message,
`"No resource found for the requested path"` (see
[Cross-cutting errors](#cross-cutting-errors)).

**405 — method not allowed** (captured, `PATCH /api/projects/19`):

```text
HTTP/1.1 405
{"timestamp":"2026-09-30T21:49:21.249250004Z","status":405,"error":"METHOD_NOT_ALLOWED","message":"Request method 'PATCH' is not supported"}
```

**500 — internal error.** No instance could be produced in this pass: every value
that used to be able to overflow a column is now stopped by `@Digits` at validation
time (see note 4 below). The catch-all handler still exists as a safety net for
genuinely unexpected failures — a database that dies mid-request, an OOM — and when
it fires the body is always the constant:

```text
HTTP/1.1 500
{"timestamp":"…","status":500,"error":"INTERNAL_ERROR","message":"An unexpected error occurred"}
```

Stack traces, SQL, and exception class names are **never** in the response — they go
to the server log only (`GlobalExceptionHandler` calls `log.error("Unexpected error", ex)`).
(The one 500 that *was* captured in this pass is the empty-bodied
`Accept`-header case described in [Cross-cutting errors](#cross-cutting-errors); it is
not an `ApiError`.)

### Error code vocabulary

| `error` | HTTP status | Produced by |
|---|---|---|
| `VALIDATION_ERROR` | 400 | `MethodArgumentNotValidException` — bean validation on `ProjectRequest` |
| `BAD_REQUEST` | 400 | malformed JSON, unknown enum value, non-numeric `{id}`, wrong request `Content-Type` (`HttpMediaTypeNotSupportedException`), or a value the database rejects (`DataIntegrityViolationException`) |
| `NOT_FOUND` | 404 | `ResourceNotFoundException` from `ProjectService` (`"Project not found with id …"`), or an unclaimed path (`NoResourceFoundException` / `NoHandlerFoundException` → `"No resource found for the requested path"`) |
| `METHOD_NOT_ALLOWED` | 405 | HTTP method the mapping does not support (`PATCH`, `POST /api/health`, …) |
| *(no body)* | 406 | unsatisfiable `Accept` header — Spring cannot render any body the client will accept |
| `INTERNAL_ERROR` | 500 | catch-all handler; message is always `"An unexpected error occurred"` |

The frontend maps these via `toApiError()` in `frontend/src/api/client.ts`, which also
synthesises `NETWORK_ERROR` when no response arrives at all (backend down).

---

## Validation notes

1. **Validation runs before the handler.** `@Valid @RequestBody` is evaluated while
   binding the request, so `ProjectService` is never called with an invalid body.
   Consequences:
   - `PUT /api/projects/9999` + invalid body → **400**, not 404 (see the captured
     example in the PUT section). This surprises people — it is the single most common
     wrong assumption about this API.
   - The 404 check only happens for valid bodies.
2. **Validation runs before the transaction.** Nothing is written when validation
   fails; a 400 leaves the database untouched.
3. **Messages come from the annotations** in `dto/ProjectRequest`
   (`"must not be blank"`, `"must be between 2 and 150 characters"`,
   `"must be at most 100 characters"`,
   `"must not be null"`, `"must be greater than 0"`,
   `"must be greater than or equal to 1"`, `"must be less than or equal to 200"`,
   `"must be greater than or equal to 0"`,
   `"must have at most 10 digits before and 2 after the decimal point"`,
   `"must have at most 12 digits before and 2 after the decimal point"`),
   not from a message bundle. `"must be at most 100 characters"` comes from
   `@Size(max = 100)` on `state`/`district`/`city`/`constructionType`. The last two come
   from `@Digits(integer = 10, fraction = 2)`
   on `landAreaSqFt`/`builtUpAreaSqFt` and `@Digits(integer = 12, fraction = 2)` on
   `budget` — captured in this pass:

   ```bash
   curl -s -X POST http://localhost:8080/api/projects -H 'Content-Type: application/json' \
     -d '{"name":"Overflow Probe","state":"Karnataka","district":"Bengaluru Urban","city":"Bengaluru","constructionType":"Residential","landAreaSqFt":100,"builtUpAreaSqFt":100,"floorCount":1,"budget":99999999999999999999}'
   # → 400 VALIDATION_ERROR, fieldErrors.budget = "must have at most 12 digits before and 2 after the decimal point"
   ```

   The digit counts line up with the columns on purpose: 10+2 = 12 = `NUMERIC(12,2)`,
   and 12+2 = 14 = `NUMERIC(14,2)` (see [database.md](database.md)).
4. **The database re-checks everything — and the API now gets there first.**
   `NOT NULL`, `VARCHAR(150)`/`VARCHAR(100)` lengths, `NUMERIC(12,2)`/`NUMERIC(14,2)`
   precision and the enum check constraint remain the last line of defence. `@Digits`
   and `@Size` mean no known request can still violate them: the overflow that used to
   surface as **500** now returns **400** `VALIDATION_ERROR` at bean-validation time.
   A value that somehow slips past validation *and* breaks a column constraint is
   caught by `DataIntegrityViolationException` and surfaces as **400** `BAD_REQUEST`
   with `"The request could not be stored because it violates a data rule"` — captured
   in [Cross-cutting errors](#cross-cutting-errors).
5. **`constructionType` is free text** on the API. The UI's dropdown is a convenience;
   the API accepts any non-blank string up to 100 characters.
6. **Ordering of `GET /api/projects`** is `createdAt` descending, implemented as
   `findAll(Sort.by(Sort.Direction.DESC, "createdAt"))` in `ProjectService`. Ties
   (identical timestamps) have no defined secondary order.

## See also

- [database.md](database.md) — column types behind these JSON types
- [architecture.md](architecture.md) — which layer enforces what
- [base-files.md](base-files.md) — where to add new endpoints without breaking this
  contract
