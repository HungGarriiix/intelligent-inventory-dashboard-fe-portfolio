# CLAUDE.md

Guidance for Claude when working in this repo. Read this first, then check **`STATUS.md`** (live
project state) and **`.kiro/specs/intelligent-inventory-dashboard/tasks.md`** (the task checklist).

---

## 1. What this project is

**Intelligent Inventory Dashboard** — a Next.js (App Router) + TypeScript web app that gives
dealership **Managers** a real-time view of vehicle stock across all dealerships.

Three core capabilities:
1. **Inventory list** — paginated, filterable, sortable table of all vehicles, with a stats banner and CSV export.
2. **Aging-stock identification** — the system auto-computes `isAging` (vehicle in inventory **> 90 days**) and surfaces it inline + in a dedicated view.
3. **Action logging** — Managers log/update a proposed action (e.g. "Price Reduction Planned") per aging vehicle, with author + timestamp and append-only history.

Data is static JSON served through Next.js API routes; a **service layer** abstracts fetches so the
backend can be swapped (e.g. ASP.NET) by changing one env var, `API_BASE_URL`.

**Source of truth for scope:** `requirements.md` (14 requirements, EARS), `design.md` (architecture,
types, API contracts, 34 correctness properties), `PLANNING.md` (high-level). When code and spec
disagree, the spec wins unless `STATUS.md` records an intentional deviation.

---

## 2. Tech stack (as actually installed — verify against `package.json`)

- **Next.js 15.5.19** (App Router) + **React 18.3.1** + **TypeScript 5**
  - ⚠️ Specs still say "Next 14"; we upgraded to 15 to fix the lint toolchain. `design.md` says "14+", which covers it.
- **MUI 6** (`@mui/material`) + Emotion · **Tailwind 3** · **SWR** (client data) · **dayjs** (UTC date math)
- **next-intl** (i18n, default locale `en`) · **iron-session** + **bcryptjs** (auth) · **zod** (schema validation)
- **ESLint 9** (flat config `eslint.config.mjs`) + `typescript-eslint` 8 + `eslint-config-next` 15
- **Vitest 2** + **fast-check 3** (tests) — see Wave 0 gap below

---

## 3. Commands

| Command | What it does |
|---|---|
| `make dev` / `npm run dev` | Dev server |
| `make build` / `make start` | Production build / serve |
| `make lint` / `npm run lint` | `next lint` — **must pass before marking any coding task complete** |
| `make install` | `npm install --legacy-peer-deps` |
| `npx tsc --noEmit` | Typecheck |
| `npx vitest --run` | Single-pass test run (used at checkpoints) |

**Dev env is Windows** (PowerShell). Prefer the PowerShell tool for shell ops; `$_` gets mangled if
you nest PowerShell inside Bash.

**Lint caveats:** `next lint` is **deprecated** (removed in Next 16); it works on 15 but re-touches
`tsconfig.json` and prints a cosmetic "Next.js plugin not detected" warning. `eslint .` is verified
clean and is the future replacement. Type-aware linting is scoped to `**/*.{ts,tsx}` in the flat config.

---

## 4. Folder design

```
/src
  /app                      ← App Router; server components + API routes ONLY
    layout.tsx, page.tsx, error.tsx, not-found.tsx
    /login/page.tsx
    /manager
      layout.tsx            ← shared nav (auth enforced by middleware, not here)
      error.tsx
      /inventory/page.tsx       → renders InventoryView
      /aging-stock/page.tsx     → renders AgingStockView
    /api
      /vehicles/route.ts                GET (filters, pagination, pageSize=all)
      /vehicles/aging/route.ts          GET
      /dealerships/route.ts             GET
      /vehicle-actions/route.ts         GET + POST
      /auth/login|logout/route.ts       POST
  /views                    ← Client components, one per route; own ALL state
    /login/LoginView.tsx
    /manager/inventory/InventoryView.tsx
    /manager/aging-stock/AgingStockView.tsx
  /components
    /common                 ← prop-driven, zero screen/entity knowledge
      Table, Pagination, FilterBar, Badge, Modal, SearchInput, StatsBanner, ErrorPage
      LogoutButton, ThemeRegistry, ThemeToggle, IntlProvider
    /inventory              AgingBadge, VehicleRow, InventoryFilters, ExportCsvButton
    /aging-stock            ActionStatusBadge, AgingVehicleCard, VehicleActionPanel
  /services                 ← vehicles.ts, dealerships.ts, vehicleActions.ts, auth.ts, apiClient.ts (ONLY place reading API_BASE_URL)
  /lib                      ← agingUtils, logger, csvExport, filterUtils, sortUtils, dataStore, session
  /schemas                  ← zod schemas split by entity: auth.ts, vehicleAction.ts (NOT in original spec — added for validation)
  /config/routes.ts         ← nav + route config (add a screen = add one entry here)
  /types                    ← entities.ts, api.ts, ui.ts
  /data/*.json              ← users, dealerships, vehicles, vehicle-actions (source of truth)
/messages/en.json           ← all UI strings
middleware.ts               ← guards /manager/*; redirects authed users off /login
next.config.ts              ← security headers (CSP, HSTS, X-Frame-Options, …)
```

**Page → View pattern (strict):** `app/.../page.tsx` (server) renders exactly one `View` (client),
which composes `/components`. Server components fetch + pass props; Views own interactivity/state.

---

## 5. Non-negotiable conventions (enforced by spec + CI grep checks)

- **No direct `fetch`** in `/src/views/**` or `/src/components/**` — go through `/src/services`.
- **`API_BASE_URL` read only in `/src/services/**`** (defaults to `/api`). Services throw typed `ApiError(status, message, field?)` on non-2xx.
- **No `console.log` in `/src/app/api/**`** — use `/src/lib/logger.ts` (structured; correlation ID in `X-Request-ID`; dev=pretty / prod=JSON; logging failures suppressed).
- **`isAging` / `daysInInventory` are computed server-side** (`computeAgingFields`, dayjs UTC, threshold `> 90`, missing date → `{0, false}`) — **never stored** in `vehicles.json`.
- **All UI strings via next-intl** keys in `/messages/en.json`; missing key → return the key itself.
- **Common components are fully prop-driven** (FilterBar takes filter defs, StatsBanner takes metric defs, Table takes columns) — no hard-coded entities/routes.
- **Enums** (`entities.ts`): `condition: 'New'|'Used'|'CPO'` (note: `PLANNING.md` says "Certified Pre-Owned" — data uses `CPO`), `status: 'Available'|'Sold'|'Reserved'`, `role: 'Manager'|'Admin'`.
- **Validation:** action label ≤ 500 chars, notes ≤ 2000; POST validates body before any file write; missing `vehicleId`/`userId`/`action` → 400 with `{field, message}`; unknown `vehicleId` → 404.

---

## 6. Implementation plan (waves)

Follow the dependency-wave graph at the bottom of `tasks.md`. High level:

- **Wave 0 (prep — not in tasks.md, do before any test task):** add `vitest.config.ts`, a `test` script, and `@testing-library/react` + `jsdom`/`happy-dom` + `msw`.
- **Wave 1:** types (`2.1–2.3`) + route config (`8.2`)
- **Wave 2:** pure utils + property tests (`3.1–3.8`) → **Checkpoint 4**
- **Wave 3:** service layer (`5.x`) + API routes (`6.x`) → **Checkpoint 7**
- **Wave 4:** `middleware.ts` (`8.1`), manager layout (`8.3`), i18n (`9`), security headers (`15`)
- **Wave 5:** common components (`10.x`)
- **Wave 6:** inventory + aging-stock components (`11.x`, `12.x`)
- **Wave 7:** views, pages, error boundaries, CSV button (`13.x`, `14.x`, `17.x`)
- **Wave 8:** final validation (`16`, `18`) — `npx vitest --run`, `make lint`, and the grep guards in §5

**Testing:** 34 fast-check properties (≥100 runs each), tagged
`// Feature: intelligent-inventory-dashboard, Property N: <text>`. Unit tests only for concrete
scenarios (empty/error states) — don't duplicate property coverage.

---

## 7. Working agreement / workflow

This is how we work in this repo:

1. **One step at a time. Wait for the user's confirmation before each step** — do not batch-run multiple
   tasks. Propose the next task, confirm, execute, report, then pause.
2. **Start every work session by re-reading `STATUS.md`** to see the interrupted task and what's done.
3. **Per coding task:** implement → `make lint` (fix until clean) → run any property/unit tests for that
   task → mark the `tasks.md` checkbox `[x]` → report. The lint gate is mandatory.
4. **At checkpoints (tasks 4, 7, 16, 18):** run `npx vitest --run` and confirm green before continuing.
5. **Spec vs. code mismatch:** flag it, don't silently "fix" the spec. Record intentional deviations in `STATUS.md`.
6. **Do not commit or push** unless the user asks. Branch off the default branch first if you do.
7. **Keep `STATUS.md` current** as the source of truth for "where we are."
8. Don't add `eslint-disable` without a justification comment.
9. **On any structural or requirement change** (new file, moved file, spec deviation, scope change): update `.kiro/specs/intelligent-inventory-dashboard/tasks.md` (checkbox state + deviation notes) and `CLAUDE.md` section 8 (status snapshot) before reporting complete.

---

## 8. Current status (snapshot — `STATUS.md` is authoritative)

- **Stage:** Wave 8 — deferred property tests + final checkpoints.
- **All implementation complete (Waves 1–7):** scaffold, types, utils, service layer, API routes, auth,
  middleware, i18n, security headers, all components (common + inventory + aging-stock), all views,
  pages, error boundaries, CSV export. `tsc --noEmit` + `eslint .` + `make lint` all clean.
- **Tests:** 14 utility/property tests passing. 20 of 34 design-spec properties still untested (Wave 8).
- **Runtime bugs fixed (2026-06-03/04):**
  - `LogoutButton`: direct `fetch` in component (violates service-layer rule) + `router.push/refresh` race. Fixed: use `logout()` service + `window.location.href`.
  - `LoginView`: `router.push + router.refresh()` caused SWR remount → stuck `isLoading`. Fixed: `window.location.href`.
  - `middleware.ts` location: was at project root — ignored by Next.js 15 when `src/` exists. Moved to `src/middleware.ts`. Verified via `.next/server/middleware-manifest.json`.
  - CSP `EvalError`: Next.js dev HMR (`react-refresh-utils`) needs `'unsafe-eval'`. Added dev-only to `script-src` in `next.config.ts`.
  - `AgingStockView` action badges always showed "No Action Recorded" on page load (Req 5.4 broken). Root cause: `latestActionMap` built from per-vehicle SWR that only fired after a card was selected. Fixed: added `fetchAllVehicleActions()` service export + `vehicleActionKeys.all` SWR on page load; `latestActionMap` now built from all-actions response at mount.
- **UI + theme additions (2026-06-04):**
  - **Indigo theme:** MUI primary `#6366f1`, dark nav header `#1e1b4b`. Nav tokens centralized as CSS vars in `globals.css` + Tailwind `extend.colors` in `tailwind.config.ts`.
  - **Dark mode:** `tailwind.config.ts` `darkMode: 'class'`; `.dark {}` block in `globals.css`; `ThemeRegistry` rewritten with `ColorModeContext` + `useColorMode()` hook + dual MUI palettes + localStorage persistence + `useEffect` `.dark` class sync.
  - **`ThemeToggle.tsx`** (new `common/` component): moon/sun inline-SVG toggle; placed left of `LogoutButton` in manager layout.
  - **`LogoutButton`** now accepts `className` prop (default `text-gray-600`); nav injects `text-nav-muted hover:text-nav-text`.
  - **`src/schemas/`** (new folder, not in original spec): `auth.ts` + `vehicleAction.ts` zod schemas. `LoginView` + `vehicle-actions` route + `auth/login` route all parse via these schemas; `VehicleActionPanel` `formSchema` hoisted to module scope.
- **Known deviations:** Next 15 vs spec "14" (covered by "14+"); `middleware.ts` in `src/` not root (spec says root); `next lint` deprecated (use `eslint .`); `PLANNING.md` "Certified Pre-Owned" vs data `CPO`; `src/schemas/` not in original spec/design (added for zod validation); `ThemeToggle` + dark mode not in spec (UI enhancement).
- **Next up:** Task 6.2 — property tests for `GET /api/vehicles` (Props 3, 21, 24).
