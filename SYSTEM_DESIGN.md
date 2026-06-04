# System Design Document — Intelligent Inventory Dashboard

**Version:** 1.0 · **Date:** 2026-06-05 · **Stack:** Next.js 15 · TypeScript 5 · MUI 6

---

## 1. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Browser (Client)                           │
│                                                                     │
│  ┌──────────────┐   ┌───────────────────┐   ┌──────────────────┐  │
│  │  LoginView   │   │  InventoryView     │   │  AgingStockView  │  │
│  │  (React)     │   │  (React + SWR)     │   │  (React + SWR)   │  │
│  └──────┬───────┘   └────────┬──────────┘   └────────┬─────────┘  │
│         │                    │                         │            │
│         └──────────┬─────────┘─────────────────────────┘           │
│                    │  HTTP (fetch via /src/services/*.ts)           │
└────────────────────┼────────────────────────────────────────────────┘
                     │
         ┌───────────▼────────────────────────────────────┐
         │              Next.js Server (Node.js)           │
         │                                                  │
         │  ┌─────────────────────────────────────────┐   │
         │  │           src/middleware.ts              │   │
         │  │  Session check → redirect /login if     │   │
         │  │  unauthenticated on /manager/* routes   │   │
         │  └───────────────────┬─────────────────────┘   │
         │                      │                          │
         │  ┌───────────────────▼─────────────────────┐   │
         │  │         App Router (Server Components)   │   │
         │  │  /login/page.tsx                         │   │
         │  │  /manager/inventory/page.tsx             │   │
         │  │  /manager/aging-stock/page.tsx           │   │
         │  │  Each renders exactly one View component │   │
         │  └───────────────────┬─────────────────────┘   │
         │                      │                          │
         │  ┌───────────────────▼─────────────────────┐   │
         │  │              API Routes                  │   │
         │  │  GET  /api/vehicles       (filter+page)  │   │
         │  │  POST /api/vehicles       (create)       │   │
         │  │  GET  /api/vehicles/aging               │   │
         │  │  GET  /api/dealerships                  │   │
         │  │  GET  /api/vehicle-actions              │   │
         │  │  POST /api/vehicle-actions              │   │
         │  │  POST /api/auth/login|logout            │   │
         │  └───────────────────┬─────────────────────┘   │
         │                      │                          │
         │  ┌───────────────────▼─────────────────────┐   │
         │  │           Service Layer                  │   │
         │  │  src/services/vehicles.ts               │   │
         │  │  src/services/vehicleActions.ts         │   │
         │  │  src/services/dealerships.ts            │   │
         │  │  src/services/auth.ts                   │   │
         │  │  src/services/apiClient.ts              │   │
         │  │  ← Only place reading API_BASE_URL      │   │
         │  └───────────────────┬─────────────────────┘   │
         │                      │                          │
         │  ┌───────────────────▼─────────────────────┐   │
         │  │           Data / Lib Layer               │   │
         │  │  src/lib/dataStore.ts  ← file R/W        │   │
         │  │  src/lib/agingUtils.ts ← isAging compute │   │
         │  │  src/lib/logger.ts     ← structured log  │   │
         │  │  src/lib/csvExport.ts                    │   │
         │  │  src/schemas/*.ts      ← Zod validation  │   │
         │  └───────────────────┬─────────────────────┘   │
         │                      │                          │
         │  ┌───────────────────▼─────────────────────┐   │
         │  │           Static JSON Data Store         │   │
         │  │  src/data/vehicles.json                 │   │
         │  │  src/data/vehicle-actions.json          │   │
         │  │  src/data/dealerships.json              │   │
         │  │  src/data/users.json                    │   │
         │  └─────────────────────────────────────────┘   │
         └──────────────────────────────────────────────────┘

Session state: iron-session encrypted cookie (8h TTL)
Theme state:   localStorage (light/dark toggle)
```

---

## 2. Component Roles

### Browser Layer

| Component | Role |
|-----------|------|
| `LoginView` | Email + password form. Calls `POST /api/auth/login`. On success: `window.location.href` redirect (avoids SWR remount race). |
| `InventoryView` | Owns filter/sort/pagination state. Fetches all vehicles via `pageSize=all` SWR, slices client-side for sort stability. Renders `StatsBanner`, `InventoryFilters`, `Table`, `ExportCsvButton`, `CreateVehicleDialog`. |
| `AgingStockView` | Fetches aging vehicles + all vehicle-actions at mount. Derives `latestActionMap` (vehicleId → latest action). Renders `StatsBanner` + sorted `AgingVehicleCard` list + `Modal`/`VehicleActionPanel`. |
| `NavBar` | MUI AppBar with route links + `ThemeToggle` + `LogoutButton`. Server-rendered shell; logout via `window.location.href` (not `router.push`) to fully clear SWR cache. |

### Server Layer

| Component | Role |
|-----------|------|
| `src/middleware.ts` | Runs before every request matching `/manager/*`. Reads iron-session cookie; redirects unauthenticated users to `/login`. Also redirects authenticated users off `/login`. Placed in `src/` (not root) — required by Next.js 15 when `src/` directory exists. |
| `app/.../page.tsx` | Thin server components. Each renders exactly one View. No business logic. |
| `API routes` | Validate input (Zod), compute derived fields (`isAging`, `daysInInventory`), read/write JSON store, return typed responses. Use `src/lib/logger.ts` (never `console.log`). |

### Service Layer

| Component | Role |
|-----------|------|
| `apiClient.ts` | Single `apiFetch()` wrapper. Reads `API_BASE_URL` (defaults to `/api`). Throws typed `ApiError(status, message, field?)` on non-2xx. Only file allowed to read `API_BASE_URL`. |
| `vehicles.ts` | `getVehicles(filters)`, `getAgingVehicles()`, `createVehicle(body)` |
| `vehicleActions.ts` | `getVehicleActions(vehicleId)`, `fetchAllVehicleActions()`, `createVehicleAction(body)` |
| `dealerships.ts` | `getDealerships()` |
| `auth.ts` | `login(email, password)`, `logout()` |

### Data / Lib Layer

| Component | Role |
|-----------|------|
| `dataStore.ts` | All JSON file reads/writes. `getVehicles()`, `appendVehicle()`, `getVehicleActions()`, `appendVehicleAction()`, `getDealerships()`, `getUsers()`. Single source of truth for file I/O. |
| `agingUtils.ts` | `computeAgingFields(dateAdded, now)` — dayjs UTC diff, threshold `> 90` days. Never stored; always computed. |
| `logger.ts` | Structured logger. Dev: pretty-print. Prod: JSON. `X-Request-ID` correlation ID threaded through all API log calls. Logging failures suppressed (never crash request). |
| `csvExport.ts` | `exportToCsv(vehicles, filename)` — client-side Blob + anchor click. No server round-trip. |
| `constants.ts` | All magic numbers and validation messages: `AGING_THRESHOLD_DAYS`, `MAX_ACTION_LENGTH`, `VIN_LENGTH`, `SESSION_TTL_MS`, etc. |
| `schemas/*.ts` | Zod schemas for API boundary validation: `auth.ts`, `vehicleAction.ts`, `vehicle.ts`. |

---

## 3. Data Flow

### Read Flow — Inventory Page

```
1. Browser navigates to /manager/inventory
2. middleware.ts reads iron-session cookie
   → valid: proceed
   → invalid/missing: redirect to /login
3. app/manager/inventory/page.tsx (server component) renders <InventoryView />
4. InventoryView mounts → useSWR(['/vehicles', { pageSize: 'all' }])
5. SWR calls services/vehicles.ts → getVehicles({ pageSize: 'all' })
6. apiClient.ts → fetch('/api/vehicles?pageSize=all')
7. API route → dataStore.getVehicles() → reads vehicles.json
8. API route → agingUtils.computeAgingFields() for each vehicle
9. API route → joins dealershipName from dealerships.json
10. Returns VehicleWithComputed[] wrapped in { data, total, page, pageSize }
11. InventoryView receives data → applies client-side filter + sort + slice
12. Renders Table, StatsBanner, filters
```

### Write Flow — Create Vehicle

```
1. Manager clicks "Add Vehicle" → CreateVehicleDialog opens
2. Manager fills 12 fields, clicks Submit
3. CreateVehicleDialog calls services/vehicles.ts → createVehicle(body)
4. apiClient.ts → POST /api/vehicles with JSON body
5. API route (nodejs runtime) → createVehicleSchema.safeParse(body)
   → invalid: return 400 { field, message }
   → valid: continue
6. Verify dealershipId exists in dealerships.json → 404 if not
7. Generate UUID via node:crypto → randomUUID()
8. Default dateAddedToInventory = today (ISO) if not provided
9. dataStore.appendVehicle(vehicle) → appends to vehicles.json
10. computeAgingFields() on new record → return 201 { data: VehicleWithComputed }
11. CreateVehicleDialog onSuccess callback → mutate() (SWR cache invalidation)
12. InventoryView re-fetches → table updates with new vehicle
```

### Auth Flow

```
1. POST /api/auth/login
   → bcryptjs.compare(password, user.passwordHash)
   → iron-session.save({ userId, role, email, expiresAt: now + 8h })
   → Set-Cookie (HttpOnly, Secure, SameSite=Lax)
2. Subsequent requests: middleware reads cookie → SessionPayload
3. POST /api/auth/logout → session.destroy() → 200
```

### Action Logging Flow

```
1. Manager clicks aging vehicle card → VehicleActionPanel opens in Modal
2. Manager selects action label + optional notes → submit
3. POST /api/vehicle-actions → validate (Zod: label ≤ 500, notes ≤ 2000)
4. Append to vehicle-actions.json with { id, vehicleId, userId, action, notes, createdAt }
5. SWR mutate → AgingStockView re-fetches actions → latestActionMap updates → badge updates
```

---

## 4. Technology Choices and Justifications

### Next.js 15 (App Router)

**Why:** Unifies frontend and backend in one process — no separate Express/Fastify server needed for this scale. App Router gives React Server Components (zero-bundle server rendering), file-system routing, and co-located API routes (`/app/api/**`). And allows seamless third-party libraries integration without modifying the existing source code while using React.

**Specific wins for this project:**
- API routes alongside page routes = single `npm run dev`, single deployment unit
- Server components render layout/shell server-side → faster initial paint, no auth flicker
- `export const runtime = 'nodejs'` per route lets `node:crypto` work without polyfills
- Built-in code splitting + prefetching; no webpack config

**Tradeoff:** Next.js 15 deprecated `next lint` (removed in 16). Mitigated: `eslint .` works directly and is the future replacement.

### TypeScript 5

**Why:** Contracts enforced at build time. `VehicleWithComputed`, `CreateVehicleBody`, `ApiError` — shape mismatches caught before runtime. `tsc --noEmit` is a mandatory gate in CI.

### MUI 6 + Tailwind CSS 3

**Why MUI:** Production-ready accessible components (Table, Dialog, AppBar). Building `<Table>` + `<Modal>` from scratch would be error-prone and off-scope.

**Why Tailwind alongside MUI:** MUI covers structural components; Tailwind handles custom one-off styles (aging badge color `text-orange-600`, card backgrounds) without fighting MUI's `sx` prop for every small thing. CSS vars in `tailwind.config.ts` tie to MUI theme tokens.

### SWR 2

**Why:** Stale-while-revalidate pattern. Cache shared across components — `InventoryView` and `NavBar` share the same vehicle count without prop drilling. `mutate()` after write operations gives instant UI update without full page reload. Auto-deduplication prevents duplicate in-flight requests.

**Key pattern:** `pageSize=all` + client-side slice — fetches full dataset once, sorts/filters in memory. Avoids re-fetching on every sort/filter interaction. Viable at this scale (~60 vehicles); would revisit with server-side sort for 10k+ records.

### iron-session + bcryptjs

**Why iron-session:** Encrypted, tamper-proof cookie session. No Redis/database session store needed. Cookie is HttpOnly + Secure + SameSite=Lax. 8h TTL enforced via `expiresAt` in session payload checked by middleware.

**Why bcryptjs:** Pure JS bcrypt (no native bindings). Works in any Node environment without build tools.

### Zod 4

**Why:** Runtime validation at every API boundary. `safeParse()` gives typed error shapes; schema doubles as TypeScript type source via `z.infer<>`. Caught Zod v4 API change during implementation: `ZodError.errors` → `ZodError.issues` — lesson: pin major versions.

### dayjs (UTC)

**Why:** Accurate aging calculation requires UTC-normalized date diff. dayjs UTC plugin gives `dayjs.utc(date).diff(dayjs.utc(now), 'day')` without timezone shifts corrupting the > 90 day threshold. Smaller bundle than moment.js.

### next-intl

**Why:** i18n without prop drilling. `useTranslations()` hook in any client component; `getTranslations()` in server components. All 150+ UI strings centralized in `messages/en.json`. Adding a locale = add one JSON file + one config entry. Custom `useI18n()` hook wraps `useTranslations()` so components don't import next-intl directly — swappable.

### Vitest 2 + fast-check 3

**Why Vitest:** Vite-native, no Jest config overhead, native ESM, TypeScript first-class.

**Why fast-check:** 34 design-spec correctness properties each run ≥ 100 randomized inputs. Property `"isAging is true iff daysInInventory > 90"` with 100 random dates catches off-by-one errors that a single example test would miss. Property-based testing is the right tool for pure utility functions with clear invariants.

---

## 5. Observability Strategy

### Structured Logging (`src/lib/logger.ts`)

Every API route logs via `logger` — never `console.log`. Log entries include:

```json
{
  "timestamp": "2026-06-05T10:23:41.123Z",
  "level": "info",
  "requestId": "a3f9b2c1-...",
  "method": "POST",
  "path": "/api/vehicles",
  "statusCode": 201,
  "durationMs": 12
}
```

- **Dev:** Pretty-printed with color (readable in terminal)
- **Prod:** Newline-delimited JSON (parseable by Datadog, CloudWatch, Loki, etc.)
- **Correlation ID:** `X-Request-ID` header threaded through request lifecycle. Client can pass its own ID; server generates one if absent.
- **Logging failures suppressed:** Logger is wrapped in try/catch — a log write failure never crashes a request.

### Error Classification

API routes distinguish:
- `400 Bad Request` — client input error (Zod validation failure, field + message returned)
- `404 Not Found` — referenced resource doesn't exist (unknown vehicleId/dealershipId)
- `401 Unauthorized` — unauthenticated (middleware redirects before route runs)
- `500 Internal Server Error` — unexpected failure, logged with stack trace

Client displays inline errors for 400 (field-level in forms) and toast/banner for 5xx.

### Metrics (Current State)

No dedicated metrics pipeline at this scale — JSON file store doesn't benefit from it. Observable signals available without instrumentation:
- Response time visible in browser DevTools Network tab
- Request logs include `durationMs` — can be parsed from log stream
- Test suite passes = behavioral contract upheld

### Metrics (Production Roadmap)

When the backend swaps to a real database (`API_BASE_URL` env var change), the observability layer grows:

| Signal | Tool | What to measure |
|--------|------|-----------------|
| Request latency | OpenTelemetry → Tempo | p50/p95/p99 per route |
| Error rate | OpenTelemetry → Prometheus | 4xx/5xx per route |
| DB query time | ORM instrumentation | slow query detection |
| Auth failures | Log aggregation | brute-force detection |
| Client errors | Sentry (browser SDK) | unhandled JS exceptions |

### Tracing

Current: `X-Request-ID` correlation ID visible in logs. Full distributed tracing (OpenTelemetry spans) is a one-file add to `apiClient.ts` and the API route handlers when the backend becomes distributed.

---

## 6. GenAI in the Design Phase

### Tool Pipeline

Design used two GenAI tools in sequence:

**Kiro (spec-task-execution agent)** — Analyzed, figured the ambigities and generated the formal specification layer based on given requirements before any code existed:
- `requirements.md` — 15 EARS-format acceptance criteria. Kiro prompted to cover edge cases: missing `dateAddedToInventory`, invalid VIN length, concurrent writes, session expiry mid-session.
- `design.md` — Full architecture: type contracts, API contracts (request/response shapes, status codes, error shapes), 34 correctness properties. Properties were AI-generated by reasoning about invariants in each layer (date math, pagination boundaries, auth state transitions).
- `tasks.md` — Dependency wave graph (8 waves, ~58 tasks). Kiro analyzed which tasks could parallelize and which had hard dependencies, then produced a graph that prevented building on an unstable base.

**Claude Code (this CLI)** — Implementation, debugging, and quality assurance against the Kiro-generated spec:
- Enforced spec as ground truth throughout. Deviations flagged and recorded in `STATUS.md` rather than silently merged.
- Generated 35 Vitest tests translating the 34 design.md correctness properties directly into fast-check assertions.
- Diagnosed runtime bugs systematically (Zod v4 API change, Next.js 15 middleware placement, SWR cache race conditions).
- Synchronized 5 documentation files (`requirements.md`, `design.md`, `tasks.md`, `CLAUDE.md`, `STATUS.md`) after each feature addition.

### What GenAI Contributed to Architecture

**Edge case discovery:** The 34 correctness properties in `design.md` were AI-generated by asking "what invariants must hold at every layer?" This surfaced edge cases a human might skip in initial design:
- `isAging` must handle null/missing `dateAddedToInventory` (→ default `{0, false}`)
- `daysInInventory` must be non-negative (negative would mean future date — a data quality signal)
- Pagination with `pageSize=all` needed explicit typing (`number | 'all'`) to avoid type widening bugs

**Dependency ordering:** Kiro's wave graph correctly identified that `agingUtils.ts` must exist before API routes (routes call it), services must exist before views (views call them), and Zod schemas must exist before route handlers. Manual task lists often get this wrong.

**API contract precision:** Kiro generated explicit JSON examples for every request/response shape including error shapes. This meant the frontend could be built against a stable contract even before the backend existed, and both were verified to match at the end.

### GenAI Harnessing Strategy

The key insight is that **AI output quality is determined by input structure**. Rather than prompting AI with vague descriptions ("build an inventory dashboard"), the spec files were written as structured contracts that an AI could implement unambiguously and verify against. As the source code goes bigger, the spec files are updated frequently to ensure the AI models could follow the changes without losing context like chat models did.

#### Spec File Design as AI Input Engineering

**`requirements.md` — EARS format**

All 15 requirements use the EARS (Easy Approach to Requirements Syntax) format with explicit trigger keywords:
- `WHEN <trigger>, THE <component> SHALL <response>` — event-driven behavior
- `IF <condition>, THEN THE <component> SHALL <response>` — conditional behavior
- `WHILE <state>, THE <component> SHALL <response>` — state-invariant behavior

This format forces every acceptance criterion to be: (a) scoped to one component, (b) trigger-bounded, (c) observable, and (d) testable. AI cannot generate vague code when given `WHEN a Manager submits valid credentials on the login page, THE Dashboard SHALL authenticate the Manager and redirect to /manager/inventory` — the behavior is precisely specified. Compare this to "the login should work", which an AI would implement with unpredictable scope.

The glossary at the top of `requirements.md` gave the AI a controlled vocabulary — `Manager`, `System`, `Inventory_List`, `isAging` — preventing it from inventing synonyms or mixing up entity names across files.

**`design.md` — 34 numbered correctness properties**

The 34 correctness properties in `design.md` serve as an AI-checkable behavioral contract. Each property names a specific invariant:
- _Property 1: Aging threshold correctness_ — `isAging` is `true` iff `daysInInventory > 90`
- _Property 14: Aging vehicles initially sorted by daysInInventory descending_
- _Property 26: Logger emits all required structured fields_

Numbering them forces completeness — an AI implementing Property 7 (sort order) can be told "write fast-check assertions for Property 7 and tag them `// Property 7:`" and the output maps exactly back to the spec. This made test generation mechanical rather than creative.

**`tasks.md` — dependency wave graph**

Tasks are organized into 8 waves with explicit dependency comments (`_Requirements: 4.1–4.5_`). The AI (Kiro) analyzed the dependency graph to determine which tasks could parallelize and which had hard ordering constraints. The result is a build order where:
- Types exist before services call them
- Zod schemas exist before route handlers import them
- `agingUtils.ts` exists before API routes compute aging fields
- Services exist before views try to call them

This prevented the most common AI failure mode: implementing component A that depends on component B, then discovering B doesn't exist yet and either hallucinating its interface or leaving broken imports.

#### Context File Architecture

**`CLAUDE.md` as standing operating procedure.** Written once, loaded at every session start. Contains non-negotiable conventions in §5 that are `grep`-checkable — not style preferences but architectural rules with binary pass/fail:
- `grep -r "console.log" src/app/api/` must return zero results
- `grep -r "fetch(" src/views/ src/components/` must return zero results
- `grep -r "API_BASE_URL" src/ --include="*.ts" --exclude-dir=services` must return zero results

These rules were checkable by the AI itself and by automated CI guards. The AI could not accidentally violate them without the lint gate catching it.

**`STATUS.md` as session state.** Multi-session AI work fails when the AI "forgets" where it stopped. `STATUS.md` contains: current wave, last completed task, and all deviations from spec. At session start, the AI reads STATUS.md before any code — this single read gives full context without re-reading the entire codebase. The session-boundary protocol was: implement → lint gate → tick `tasks.md` checkbox → update `STATUS.md` → report.

#### Confirmation Loop Pattern

Every implementation step followed: propose → confirm → execute → verify → report. This one-task-at-a-time loop prevents multi-step drift — if the AI makes a wrong assumption in step 2 of a 10-step chain, it compounds through step 10 before a human sees it. With the confirmation loop, wrong assumptions surface at step 2.

The confirmation pattern also created natural checkpoints for humans to redirect. The AI proposing "next task: implement `agingUtils.ts`" before acting gives the human a chance to say "actually, do `constants.ts` first" — which is how `src/lib/constants.ts` (not in the original spec) got added as a pre-requisite before the AI started writing magic numbers inline.

### Constraints Applied to GenAI

- **One task at a time, with human confirmation between steps.** Prevented multi-step drift where an AI makes a wrong assumption in step 2 and compounds it through step 8.
- **Lint gate enforced per task.** AI output that passed lint could not introduce style/type debt.
- **Spec as ground truth.** When AI-generated code deviated from `design.md`, the code was fixed — not the spec. This kept the spec authoritative.
- **No silent "improvements."** Adjacent code was not cleaned up unless explicitly requested. Every changed line traces to a specific task requirement.
