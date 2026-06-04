# Intelligent Inventory Dashboard

A Next.js (App Router) + TypeScript web app giving dealership Managers a real-time view of vehicle stock across all dealerships.

**Four core capabilities:**

1. **Inventory list** — paginated, filterable, sortable table with stats banner and CSV export
2. **Aging-stock identification** — auto-computed `isAging` (> 90 days in inventory), surfaced inline and in a dedicated view
3. **Action logging** — Managers log proposed actions per aging vehicle (append-only history, author + timestamp)
4. **Vehicle creation** (additional) — Add new vehicles via dialog; validated, persisted, returned with computed fields

---

## Prerequisites

- Node.js 18+
- npm 9+

---

## Getting Started

### 1. Install dependencies

```bash
npm install --legacy-peer-deps
```

> `--legacy-peer-deps` is required due to MUI 6 + React 18 peer dep resolution.

### 2. Configure environment

`.env.local` is already present with a dev session secret. Do not commit this file.

```env
SESSION_SECRET=<minimum 32 character random string>
# API_BASE_URL=https://your-backend.com/api   # leave unset to use internal /api routes
```

### 3. Run dev server

```bash
npm run dev
```

App runs at [http://localhost:3000](http://localhost:3000). Login redirects to `/manager/inventory`.

---

## Demo Credentials

| Email | Password | Role |
|-------|----------|------|
| `jane.smith@dealergroup.com` | `Password123!` | Manager |
| `robert.jones@dealergroup.com` | `Password123!` | Manager |
| `admin@dealergroup.com` | `Password123!` | Admin |

Session expires after 8 hours.

---

## Build & Run Production

```bash
npm run build
npm run start
```

---

## Commands Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint via `next lint` |
| `npm test` | Run all tests once (Vitest) |
| `npm run test:watch` | Vitest in watch mode |
| `npx tsc --noEmit` | TypeScript type check |
| `npx eslint .` | Direct ESLint (alternative to `next lint`) |

---

## Testing

```bash
npm test
```

Runs **35 tests** using [Vitest](https://vitest.dev/) + [fast-check](https://fast-check.dev/) property-based testing + [@testing-library/react](https://testing-library.com/).

**Test coverage includes:**
- 34 design-spec correctness properties (≥ 100 runs each via fast-check)
- Unit tests for concrete edge cases (empty state, error state)
- Property 14: aging vehicles sorted by `daysInInventory` descending

Watch mode:

```bash
npm run test:watch
```

---

## Project Structure

```
/src
  /app                  ← App Router: server components + API routes
    /login
    /manager
      /inventory        ← renders InventoryView
      /aging-stock      ← renders AgingStockView
    /api
      /vehicles         ← GET (filter/paginate) + POST (create)
      /vehicles/aging   ← GET aging vehicles
      /dealerships      ← GET
      /vehicle-actions  ← GET + POST
      /auth/login|logout
  /views                ← Client components owning all state
  /components
    /common             ← Prop-driven, zero entity knowledge
    /inventory
    /aging-stock
  /services             ← All fetch calls live here (apiClient.ts reads API_BASE_URL)
  /lib                  ← Utils, logger, dataStore, constants
  /schemas              ← Zod validation schemas
  /types                ← entities.ts, api.ts, ui.ts
  /data/*.json          ← Static data (users, dealerships, vehicles, vehicle-actions)
/messages/en.json       ← All UI strings (next-intl)
src/middleware.ts       ← Route guard for /manager/*
```

---

## Tech Stack

| Layer | Library |
|-------|---------|
| Framework | Next.js 15.5 (App Router) |
| Language | TypeScript 5 |
| UI | MUI 6 + Tailwind CSS 3 |
| State / data | SWR 2 |
| Auth | iron-session + bcryptjs |
| Validation | Zod 4 |
| i18n | next-intl |
| Date math | dayjs (UTC) |
| Testing | Vitest 2 + fast-check 3 + @testing-library/react |

---

## AI Collaboration Narrative

This project was built using a two-tool AI pipeline: **Kiro** (spec-task-execution agent) for structured specification and scaffolding, and **Claude Code** (this CLI) for implementation, debugging, and quality assurance.

### Strategy

**Phase 1 — Spec first with Kiro**

Kiro generated the formal specification layer before any code was written:
- `requirements.md` — 15 EARS-format acceptance criteria covering every user-facing behavior
- `design.md` — architecture decisions, type contracts, API contracts, 34 correctness properties
- `tasks.md` — dependency-wave execution graph (8 waves, ~58 tasks with explicit checkboxes)

This forced every requirement to be reasoned about explicitly before implementation. The wave graph (types → utils → services → API routes → middleware → components → views) made dependencies explicit and prevented building on an unstable base.

**Phase 2 — Wave-by-wave implementation with Claude Code**

Claude Code executed each wave sequentially, one task at a time, with mandatory verification gates:
- Per task: implement → `eslint .` clean → run relevant tests → tick `tasks.md` checkbox → report
- At checkpoints (tasks 4, 7, 16, 18): full `npx vitest --run` before proceeding
- At session start: read `STATUS.md` to resume exactly where the previous session ended

The `CLAUDE.md` file acted as the standing operating procedure — it captured conventions (no direct `fetch` in components, `API_BASE_URL` only in services, structured logging, etc.) so Claude Code enforced them consistently across sessions without re-explanation.

### Verification and Refinement Process

**Spec as ground truth.** When code and spec disagreed, the spec won. Intentional deviations (e.g., Next.js 15 vs spec's "14+", `middleware.ts` moved to `src/` for Next.js 15 compatibility) were recorded in `STATUS.md` rather than silently patched.

**Property-based testing.** The 34 correctness properties in `design.md` were translated directly into fast-check tests. This meant the test suite wasn't just checking "it renders" — it verified invariants like "aging threshold is strictly > 90 days", "daysInInventory is always non-negative", "sort order is preserved across pagination" across hundreds of randomized inputs.

**Grep guards.** Three architectural rules were enforced by `grep` as part of Wave 8 final validation: no `console.log` in API routes, no direct `fetch` in views/components, `API_BASE_URL` never read outside `services/`. These caught violations that static types couldn't.

**Runtime debugging.** Several bugs surfaced only during browser testing and were diagnosed systematically:
- `LogoutButton` had a `router.push + router.refresh()` race condition — fixed by switching to `window.location.href`
- `POST /api/vehicles` returned 500 on all validation errors — root cause was a Zod v4 API change (`ZodError.errors` renamed to `ZodError.issues`); identified by testing the happy path first, then invalid fields, then reading the error handler source
- `middleware.ts` at project root was silently ignored by Next.js 15 when a `src/` directory exists — fixed by moving it to `src/middleware.ts`

**Iterative refinement.** Post-completion additions (dark mode, NavBar, vehicle creation) were handled the same way as the original implementation: spec the requirement first (added Requirement 15 to `requirements.md`), then implement, then update all docs to stay in sync. The AI was constrained to one change at a time with explicit confirmation between steps.

### What Worked Well

- **Spec-first discipline** meant Claude Code always had a precise target. Ambiguity was resolved at the requirements layer, not during implementation.
- **`STATUS.md` as session state** let multi-session work resume without context loss. The AI could pick up mid-wave without re-reading the entire codebase. 
- And with **a set of skills from Caveman and Karpathy's**, it ensures the models' output to be refined within the goal define, and the tradeoff between performance, precision and cost optimization.
- **Mandatory lint gate** (no task marked complete until `eslint .` passed) prevented technical debt from accumulating. Every session ended in a clean state.
- **Kiro's wave graph** caught dependency order issues that would have caused rework — for example, ensuring Zod schemas existed before API route handlers, and service functions existed before views tried to call them.

### Tradeoffs

- One-task-at-a-time with confirmation slows velocity but eliminates the "AI went off in a wrong direction for 20 minutes" failure mode.
- Property-based tests require more setup than unit tests but cover edge cases that a human wouldn't think to write explicitly — particularly valuable for date math and pagination boundary conditions.
- Keeping `CLAUDE.md`, `STATUS.md`, `tasks.md`, and `design.md` all synchronized is overhead, but it paid off when bugs required reading back the spec to confirm the intended behavior.
- Combined with some skills from Caveman to minimize token lose, and Karpathy's to redirect to goal-driven goals and adds verification layers regarding business logics.
