# Implementation Plan: Intelligent Inventory Dashboard

## Overview

Incremental implementation of the Intelligent Inventory Dashboard in TypeScript/Next.js (App Router). Tasks build from the foundation (project scaffolding, types, data files) through the service layer and API routes, into UI views and components, finishing with cross-cutting concerns (auth, observability, security, i18n, CSV export). Each task wires directly into previously implemented pieces so no code is left orphaned.

---

## Tasks

- [x] 1. Scaffold project structure and static data files
  - Initialise the Next.js 14 project with TypeScript, Tailwind CSS, MUI, SWR, dayjs, next-intl, iron-session, and fast-check as dependencies
  - Install ESLint 9 with TypeScript support: `eslint@^9`, `typescript-eslint@^8` (provides `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin` via the unified package), and `eslint-config-next` (pinned to the Next.js version in use)
  - Create `eslint.config.mjs` (ESLint 9 flat config) that enables the `typescript-eslint` recommended rules, Next.js core web vitals rules, and sets `parser` to `@typescript-eslint/parser` with `project: true` for type-aware linting
  - Create the directory skeleton: `/src/app`, `/src/views`, `/src/components/common`, `/src/components/inventory`, `/src/components/aging-stock`, `/src/services`, `/src/lib`, `/src/config`, `/src/types`, `/src/data`, `/messages`
  - Populate `/src/data/users.json`, `/src/data/dealerships.json`, `/src/data/vehicles.json`, and `/src/data/vehicle-actions.json` with realistic seed records (at least 60 vehicles, spread across 3 dealerships, ~20 with `dateAddedToInventory` older than 90 days, several with VehicleActions)
  - Create `.env.local` (gitignored) with `SESSION_SECRET` and leave `API_BASE_URL` unset (defaults to `/api`)
  - Create `Makefile` with `dev`, `build`, `start`, `lint`, `install`, `clean` targets; the `lint` target runs `next lint` which invokes the flat config via `eslint.config.mjs`
  - Run `make lint` — fix any errors before marking complete
  - _Requirements: 8.1–8.9, 12.1–12.6_

- [x] 2. Define TypeScript types and interfaces
  - [x] 2.1 Create `/src/types/entities.ts` with `User`, `Dealership`, `Vehicle`, `VehicleWithComputed`, `VehicleAction`, `VehicleActionWithAuthor`, and all enum types
    - Mirror the exact shapes in the design document
    - Run `make lint` — fix any errors before marking complete
    - _Requirements: 2.2, 4.4, 5.2, 6.3_
  - [x] 2.2 Create `/src/types/api.ts` with all request/response types and the `ApiError` class
    - Include `GetVehiclesParams`, `GetVehiclesResponse`, `GetAgingVehiclesResponse`, `GetDealershipsResponse`, `GetVehicleActionsParams`, `GetVehicleActionsResponse`, `CreateVehicleActionBody`, `CreateVehicleActionResponse`, `ApiErrorResponse`
    - Run `make lint` — fix any errors before marking complete
    - _Requirements: 8.1–8.9, 12.4, 12.5_
  - [x] 2.3 Create `/src/types/ui.ts` with `FilterDefinition`, `FilterState`, `FilterType`, `SelectFilterOption`, `MetricDefinition`, `ColumnDefinition`, `SortState`, `SortDirection`
    - Run `make lint` — fix any errors before marking complete
    - _Requirements: 3.1, 2.8, 2.7, 13.1, 13.3, 13.5_

- [x] 3. Implement core utility libraries
  - [x] 3.1 Implement `/src/lib/agingUtils.ts` — `computeAgingFields(vehicle)` using dayjs UTC, `AGING_THRESHOLD_DAYS = 90`
    - Missing `dateAddedToInventory` returns `{ daysInInventory: 0, isAging: false }`
    - Run `make lint` — fix any errors before marking complete
    - _Requirements: 4.1–4.5_
  - [x] 3.2 Write property tests for `computeAgingFields`
    - **Property 1: Aging threshold correctness** — for any integer `d`, `isAging` is `true` iff `d > 90`
    - **Property 2: Days-in-inventory computation** — for any past UTC date, `daysInInventory` equals the whole-day difference from that date to today
    - **Validates: Requirements 4.1, 4.2, 4.3**
  - [x] 3.3 Implement `/src/lib/logger.ts` — `LogEntry` interface, `LogTransport` interface, `Logger` interface, `devTransport`, `prodTransport`, `createLogger`, and exported `logger` singleton
    - Include `extractIp(req)` and `generateCorrelationId()` utilities
    - Run `make lint` — fix any errors before marking complete
    - _Requirements: 11.1–11.10_
  - [x] 3.4 Write property tests for the logger module
    - **Property 26: Logger emits all required structured fields** — for any completed request params, the emitted entry contains non-empty `method`, `path`, `status`, `durationMs`, `correlationId`, `ip`, `timestamp`
    - **Property 27: Logger IP extraction follows priority order** — for any combo of header presence, `extractIp` returns correct priority value
    - **Property 29: Log level matches response status class** — for any status `s`, level is `error` when `s >= 400`, `info` otherwise
    - **Property 30: Logger failure does not affect API response** — when transport throws, API still responds correctly
    - **Validates: Requirements 11.2, 11.3, 11.6, 11.10**
  - [x] 3.5 Implement `/src/lib/csvExport.ts` — `CSV_COLUMNS` definition, `escapeCsvValue`, `generateCsv(vehicles)`, `downloadCsv(csv, date)`
    - Run `make lint` — fix any errors before marking complete
    - _Requirements: 14.2–14.6_
  - [x] 3.6 Write property tests for `generateCsv`
    - **Property 33: CSV export contains all filtered vehicles with required columns** — for any array of `VehicleWithComputed` records, first line is the header with all 12 columns, subsequent lines equal input length, all values present
    - **Property 34: CSV filename includes correct export date** — for any date `d`, filename is `inventory-export-YYYY-MM-DD.csv`
    - **Validates: Requirements 14.2, 14.3, 14.4, 14.5**
  - [x] 3.7 Implement filter and sort utility functions in `/src/lib/filterUtils.ts` and `/src/lib/sortUtils.ts`
    - `applyFilters(vehicles, filterState)` — returns only records matching all active (non-empty) filter criteria
    - `applySort(vehicles, sortState)` — sorts by the given column and direction
    - `resetPageOnFilterChange(setPage)` — helper that always resets to page 1
    - Run `make lint` — fix any errors before marking complete
    - _Requirements: 3.2–3.9, 2.8–2.9_
  - [x] 3.8 Write property tests for filter and sort utilities
    - **Property 7: Table sort produces correctly ordered results** — for any array and any sortable column, ascending sort yields non-decreasing order, descending yields non-increasing
    - **Property 8: Filter conjunction results match all active criteria** — for any array and any filter combo, result contains exactly records satisfying every active criterion
    - **Property 9: Filter clear restores full dataset** — clearing all filters returns the unfiltered dataset
    - **Property 10: Filter application resets pagination to page 1** — for any `p >= 1` and any filter change, page is reset to 1
    - **Validates: Requirements 2.8, 2.9, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8**

- [x] 4. Checkpoint — Ensure all utility tests pass
  - Run `npx vitest --run` and confirm all utility and property tests in step 3 are green before proceeding.

- [x] 5. Implement the service layer
  - [x] 5.1 Implement `/src/services/vehicles.ts` — `fetchVehicles(params)`, `fetchAgingVehicles()`, `vehicleKeys` SWR key factory; reads `API_BASE_URL` from `process.env`
    - Use the shared `apiFetch` helper pattern from the design; throw `ApiError` on non-2xx
    - Run `make lint` — fix any errors before marking complete
    - _Requirements: 12.1–12.6_
  - [x] 5.2 Implement `/src/services/dealerships.ts` — `fetchDealerships()`, `dealershipKeys`
    - Run `make lint` — fix any errors before marking complete
    - _Requirements: 12.1–12.6_
  - [x] 5.3 Implement `/src/services/vehicleActions.ts` — `fetchVehicleActions(vehicleId)`, `createVehicleAction(body)`, `vehicleActionKeys`
    - Run `make lint` — fix any errors before marking complete
    - _Requirements: 12.1–12.6_
  - [x] 5.4 Write property tests for the service layer
    - **Property 31: Service layer routes requests to API_BASE_URL** — for any `API_BASE_URL` value, all outbound requests use it as base prefix
    - **Property 32: Service layer throws typed ApiError on non-2xx** — for any non-2xx status, service throws `ApiError` with matching `status` and non-empty `message`
    - **Validates: Requirements 12.2, 12.3, 12.5**

- [x] 6. Implement API routes
  - [x] 6.1 Implement `GET /api/vehicles` — `/src/app/api/vehicles/route.ts`
    - Read `vehicles.json` and `dealerships.json`; apply filter params (`dealership`, `make`, `model`, `age`); compute `isAging`/`daysInInventory` via `computeAgingFields`; paginate to 25 per page; support `pageSize=all` for CSV export
    - Join `dealershipName` from dealerships; return `GetVehiclesResponse` shape
    - Attach `X-Request-ID` header; log via `logger`
    - Run `make lint` — fix any errors before marking complete
    - _Requirements: 4.3, 4.4, 8.1, 8.7, 8.8, 11.1–11.9_
  - [x] 6.2 Write property tests for `GET /api/vehicles`
    - **Property 3: Vehicle API response always includes computed fields** — every item in `data` has `isAging` (boolean) and `daysInInventory` (non-negative integer)
    - **Property 21: GET /api/vehicles returns correctly filtered and paginated results** — for any filter combo and page, result is the correct slice of matching records with correct `total`
    - **Property 24: Out-of-range page returns empty data with correct total** — for any `p` where `(p-1)*25 >= total`, response is `{ data: [], total: N, page: p, pageSize: 25 }`
    - **Validates: Requirements 4.4, 8.1, 8.7, 8.8**
  - [x] 6.3 Implement `GET /api/vehicles/aging` — `/src/app/api/vehicles/aging/route.ts`
    - Return all vehicles where computed `isAging = true`; attach `X-Request-ID`; log via `logger`
    - Run `make lint` — fix any errors before marking complete
    - _Requirements: 4.3, 4.4, 5.1, 8.2_
  - [x] 6.4 Write property test for `GET /api/vehicles/aging`
    - **Property 11: Aging Stock View contains only isAging vehicles** — response contains exactly vehicles where `isAging = true`, none omitted, none extra
    - **Validates: Requirement 5.1, 8.2**
  - [x] 6.5 Implement `GET /api/dealerships` — `/src/app/api/dealerships/route.ts`
    - Return all dealership records; attach `X-Request-ID`; log via `logger`
    - Run `make lint` — fix any errors before marking complete
    - _Requirements: 8.3_
  - [x] 6.6 Implement `GET /api/vehicle-actions` and `POST /api/vehicle-actions` — `/src/app/api/vehicle-actions/route.ts`
    - GET: accept `vehicleId` query param, return matching `VehicleActionWithAuthor` records (join `authorFullName` from users), ordered by `createdAt` descending
    - POST: validate body (`vehicleId`, `userId`, `action` required; character limits); verify `vehicleId` exists (404 if not); persist new record to `vehicle-actions.json`; return HTTP 201 with created record; attach `X-Request-ID`; log via `logger`
    - Run `make lint` — fix any errors before marking complete
    - _Requirements: 6.3, 7.2, 7.3, 8.4, 8.5, 8.6, 8.9, 10.5, 10.6_
  - [x] 6.7 Write property tests for `POST /api/vehicle-actions`
    - **Property 15: VehicleAction persisted record contains all required fields** — for any valid payload, response contains all submitted fields plus non-empty `id` and `createdAt`
    - **Property 19: Update preserves prior action history** — for any N existing records, after a successful POST there are N+1 records, all prior unchanged
    - **Property 20: Character limits enforced on action label and notes** — action label > 500 or notes > 2000 returns HTTP 400, no write occurs
    - **Property 23: POST returns 400 for each missing required field** — for any body missing `vehicleId`, `userId`, or `action`, returns 400 with `field` and `message` keys
    - **Validates: Requirements 6.3, 7.2, 7.6, 8.6, 10.5, 10.6**
  - [x] 6.8 Write property test for `GET /api/vehicle-actions`
    - **Property 22: GET /api/vehicle-actions filters correctly by vehicleId** — for any dataset spanning multiple vehicleIds, result contains exactly records where `vehicleId = X`
    - **Validates: Requirement 8.4**
  - [x] 6.9 Implement auth API routes — `/src/app/api/auth/login/route.ts` and `/src/app/api/auth/logout/route.ts`
    - POST `/auth/login`: validate credentials against `users.json` (bcryptjs compare), set iron-session cookie with `SessionPayload` (userId, role, email, expiresAt = now + 8h)
    - POST `/auth/logout`: clear the session cookie; redirect to `/login`
    - Run `make lint` — fix any errors before marking complete
    - _Requirements: 1.2, 1.3, 1.5_

- [x] 7. Checkpoint — Ensure all API route tests pass
  - Run `npx vitest --run` and confirm all API route tests are green before proceeding.

- [x] 8. Implement route protection and navigation config
  - [x] 8.1 Implement `middleware.ts`
    - ⚠️ **Deviation:** placed at `src/middleware.ts` (not project root). Next.js 15 requires middleware inside `src/` when the project uses a `src/` directory — root-level file is ignored (verified via `.next/server/middleware-manifest.json`).
    - Protect all `/manager` routes; redirect unauthenticated requests to `/login`
    - Redirect authenticated users who navigate to `/login` to `/manager/inventory`
    - Invalidate and redirect when session `expiresAt` is in the past
    - Run `make lint` — fix any errors before marking complete
    - _Requirements: 1.1, 1.4, 1.6, 1.7, 10.3_
  - [x] 8.2 Implement `/src/config/routes.ts` — `RouteConfig` interface, `routes` record, `navItems` derived array
    - Run `make lint` — fix any errors before marking complete
    - _Requirements: 13.2, 13.4_
  - [x] 8.3 Implement `/src/app/manager/layout.tsx` (server component) — renders shared nav from `navItems`, wraps children; auth is enforced by middleware, not the layout
    - Run `make lint` — fix any errors before marking complete
    - _Requirements: 13.2, 13.4_

- [ ] 9. Implement the i18n configuration and message file
  - Configure `next-intl` in `next.config.ts` (or dedicated `i18n.ts` config) with default locale `en`; set `onMissingTranslation` to return the key itself
  - Create `/messages/en.json` with all translation keys: `nav`, `filters`, `stats`, `table`, `errors`, `actions`, `panel`
  - Run `make lint` — fix any errors before marking complete
  - _Requirements: 9.1, 9.2, 9.3, 9.4_
  - [x] 9.1 Write property test for missing translation key fallback
    - **Property 25: Missing translation key returns the key itself** — for any key string absent from the locale file, `t(key)` returns the key string unchanged
    - **Validates: Requirement 9.3**

- [x] 10. Implement common UI components
  - [x] 10.1 Implement `/src/components/common/FilterBar.tsx`
    - Accept `filterDefs: FilterDefinition[]`, `value: FilterState`, `onChange: (FilterState) => void`; render MUI Select or ToggleButtonGroup per definition; emit `onFilterChange` on each change; zero knowledge of vehicle or route data
    - Run `make lint` — fix any errors before marking complete
    - _Requirements: 3.1, 13.1, 13.3_
  - [x] 10.2 Implement `/src/components/common/Table.tsx`
    - Accept `columns: ColumnDefinition[]`, `rows: T[]`, `sort: SortState`, `onSort: (col) => void`; render sortable column headers with asc/desc toggle; render cells via `renderCell` if provided
    - Run `make lint` — fix any errors before marking complete
    - _Requirements: 2.1, 2.8, 2.9, 13.1_
  - [x] 10.3 Implement `/src/components/common/Pagination.tsx`
    - Accept `page`, `totalPages`, `onPageChange`; render previous/next buttons and current page indicator
    - Run `make lint` — fix any errors before marking complete
    - _Requirements: 2.3_
  - [x] 10.4 Implement `/src/components/common/Badge.tsx`, `/src/components/common/Modal.tsx`, `/src/components/common/SearchInput.tsx`
    - Badge: generic coloured label; Modal: accessible MUI Dialog wrapper accepting `open`, `onClose`, `children`; SearchInput: debounced text input
    - Run `make lint` — fix any errors before marking complete
    - _Requirements: 13.1_
  - [x] 10.5 Implement `/src/components/common/StatsBanner.tsx`
    - Accept `metrics: MetricDefinition[]`; map over array to render metric cards with optional highlight colour; zero hard-coded metric references
    - Run `make lint` — fix any errors before marking complete
    - _Requirements: 2.7, 13.5_
  - [x] 10.6 Write property test for StatsBanner
    - **Property 6: StatsBanner values match computed dataset counts** — for any array of `VehicleWithComputed` records and `VehicleAction` records, displayed values equal total count, aging count, and actioned count
    - **Validates: Requirement 2.7**
  - [x] 10.7 Implement `/src/components/common/ErrorPage.tsx`
    - Accept `title`, `message`, `showRetry?`, `showHome?`, `onRetry?`; render i18n error UI with conditional buttons
    - Run `make lint` — fix any errors before marking complete
    - _Requirements: 5.6_

- [x] 11. Implement inventory-specific components
  - [x] 11.1 Implement `/src/components/inventory/AgingBadge.tsx`
    - Render a visible MUI Chip/Badge only when `isAging = true`; returns null when false
    - Run `make lint` — fix any errors before marking complete
    - _Requirements: 2.5, 2.6_
  - [x] 11.2 Implement `/src/components/inventory/VehicleRow.tsx`
    - Render all required fields: dealership name, make, model, year, trim, color, mileage, price, condition, status, `daysInInventory`; embed `AgingBadge` when `isAging = true`
    - Run `make lint` — fix any errors before marking complete
    - _Requirements: 2.2, 2.5_
  - [x] 11.3 Write property tests for VehicleRow
    - **Property 4: VehicleRow renders all required fields** — for any `VehicleWithComputed` object, rendered output includes all 11 required fields
    - **Property 5: AgingBadge presence matches isAging flag** — for any `VehicleWithComputed`, AgingBadge is present iff `isAging = true`
    - **Validates: Requirements 2.2, 2.5, 2.6**
  - [x] 11.4 Implement `/src/components/inventory/InventoryFilters.tsx`
    - Wrap `FilterBar` with inventory-specific `FilterDefinition` array (dealership, make, model, age toggle); pass dealership options from props
    - Run `make lint` — fix any errors before marking complete
    - _Requirements: 3.1_

- [x] 12. Implement aging-stock-specific components
  - [x] 12.1 Implement `/src/components/aging-stock/ActionStatusBadge.tsx`
    - Accept `latestAction: VehicleAction | null`; render badge with `action` text if present, otherwise render "No Action Recorded" label
    - Run `make lint` — fix any errors before marking complete
    - _Requirements: 5.3, 5.4_
  - [x] 12.2 Write property test for ActionStatusBadge
    - **Property 13: ActionStatusBadge shows most recent action** — for any non-empty list of `VehicleAction` records, badge displays `action` from the record with highest `createdAt`
    - **Validates: Requirement 5.4**
  - [x] 12.3 Implement `/src/components/aging-stock/AgingVehicleCard.tsx`
    - Render dealership name, make, model, year, trim, `daysInInventory`, price, and `ActionStatusBadge`; emit `onSelect(vehicleId)` on click
    - Run `make lint` — fix any errors before marking complete
    - _Requirements: 5.2, 5.3, 5.4, 6.1_
  - [x] 12.4 Write property test for AgingVehicleCard
    - **Property 12: AgingVehicleCard renders all required fields** — for any `VehicleWithComputed` where `isAging = true`, rendered output includes all 7 required fields
    - **Validates: Requirement 5.2**
  - [x] 12.5 Implement `/src/components/aging-stock/VehicleActionPanel.tsx`
    - Render inside `Modal`; action label field (max 500 chars) and notes textarea (max 2000 chars); pre-populate from `latestAction` prop via `useEffect`; client-side validation blocks submit if action label is empty/whitespace; display inline validation errors; render `ActionHistory` list ordered by `createdAt` descending; emit `onSubmit(body)` and `onClose()`
    - Run `make lint` — fix any errors before marking complete
    - _Requirements: 6.1, 6.2, 6.5, 6.6, 6.7, 7.1, 7.3, 7.4, 7.6_
  - [x] 12.6 Write property tests for VehicleActionPanel
    - **Property 16: Action history displayed in descending createdAt order** — for any list of `VehicleActionWithAuthor` records, rendered history is in non-increasing `createdAt` order
    - **Property 17: Empty or whitespace action label is rejected** — for any string of only whitespace, submit does not dispatch POST and validation error is shown
    - **Property 18: Panel pre-populates from most recent action** — for any non-empty list of VehicleActions, panel opens with action label and notes from the record with highest `createdAt`
    - **Validates: Requirements 6.6, 6.7, 7.1, 7.3, 7.4**

- [x] 13. Implement views (client components)
  - [x] 13.1 Implement `/src/views/manager/inventory/InventoryView.tsx`
    - Own all state: `filters`, `page`, `sort`; use SWR `useVehicles(filters, page)` for paginated data and `useVehicles({ ...filters, pageSize: 'all' })` for CSV export data; reset page to 1 on filter change; wire `StatsBanner`, `InventoryFilters`, `Table` (with `VehicleRow`), `Pagination`, and `ExportCsvButton`; handle SWR loading and error states; empty state when no vehicles
    - Run `make lint` — fix any errors before marking complete
    - _Requirements: 2.1–2.9, 3.1–3.9, 14.1, 14.6_
  - [x] 13.2 Implement `/src/views/manager/aging-stock/AgingStockView.tsx`
    - Use SWR `useAgingVehicles()` with `shouldRetryOnError: false`; sort by `daysInInventory` descending on first render; render `AgingVehicleCard` list; open `Modal` with `VehicleActionPanel` on vehicle select; handle submit via `createVehicleAction` then `mutate()`; show inline error on submit failure; display error message + retry control on SWR error; empty state when no aging vehicles
    - Run `make lint` — fix any errors before marking complete
    - _Requirements: 5.1–5.7, 6.1–6.7, 7.1–7.6_
  - [x] 13.3 Write property test for AgingStockView initial sort
    - **Property 14: Aging vehicles initially sorted by daysInInventory descending** — for any array of aging vehicles with distinct `daysInInventory` values, initial render displays vehicles in non-increasing order
    - **Validates: Requirement 5.5**
  - [x] 13.4 Implement `/src/views/login/LoginView.tsx`
    - Client component; email + password fields; submit calls POST `/api/auth/login`; on success redirect to `/manager/inventory`; on failure display inline error without redirecting
    - Run `make lint` — fix any errors before marking complete
    - _Requirements: 1.2, 1.3_

- [x] 14. Implement page entry points and error boundaries
  - [x] 14.1 Implement server component pages: `/src/app/login/page.tsx` → `LoginView`; `/src/app/manager/inventory/page.tsx` → `InventoryView`; `/src/app/manager/aging-stock/page.tsx` → `AgingStockView`
    - Run `make lint` — fix any errors before marking complete
    - _Requirements: 1.2, 2.1, 5.1_
  - [x] 14.2 Implement error boundaries: `/src/app/error.tsx` (global), `/src/app/manager/error.tsx` (manager-scoped), `/src/app/not-found.tsx`
    - Both `error.tsx` files use the shared `ErrorPage` component; `not-found.tsx` renders "Go to Inventory" link
    - Run `make lint` — fix any errors before marking complete
    - _Requirements: 5.6_

- [x] 15. Implement security headers and `next.config.ts`
  - Add `securityHeaders` array to `next.config.ts`: `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `Referrer-Policy`
  - Apply headers to all responses via `headers()` config key
  - Run `make lint` — fix any errors before marking complete
  - _Requirements: 10.1, 10.2_

- [x] 16. Checkpoint — Ensure all tests pass
  - Run `npx vitest --run` and confirm every test across utility, service, API route, and component test files is green.

- [x] 17. Wire ExportCsvButton into InventoryView
  - [x] 17.1 Create `ExportCsvButton` component (inline in InventoryView or as `/src/components/inventory/ExportCsvButton.tsx`)
    - Always visible; on click calls `generateCsv(allData?.data ?? [])`, then `downloadCsv(csv, dayjs().format('YYYY-MM-DD'))`; no additional API call
    - Run `make lint` — fix any errors before marking complete
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_

- [x] 18. Final checkpoint — Full test run and lint
  - Run `npx vitest --run` — all tests must pass
  - Run `make lint` (`next lint` via `eslint.config.mjs`) — zero ESLint errors and zero `@typescript-eslint` warnings
  - Confirm no `// eslint-disable` suppressions are present without a documented justification comment
  - Verify the smoke/architecture checks from the design: no `console.log` in `/src/app/api/**`, no direct `fetch` in views/components, no `API_BASE_URL` reference outside `/src/services/**`
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- **Every coding task includes a `Run make lint` step** — if lint fails, revise the code and re-run until it passes before marking the task complete
- Checkpoints (tasks 4, 7, 16, 18) ensure incremental validation at natural boundaries
- Property tests use **fast-check** and should be run with `npx vitest --run` (single-pass, not watch mode)
- Property tests validate universal correctness properties; unit tests cover concrete scenarios (empty states, error states, specific interactions)
- The design document's Properties 1–34 are fully covered across tasks 3.2, 3.4, 3.6, 3.8, 5.4, 6.2, 6.4, 6.7, 6.8, 9.1, 10.6, 11.3, 12.2, 12.4, 12.6, 13.3
- `API_BASE_URL` is read exclusively in `/src/services/**` — swapping the backend requires only changing this environment variable

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "2.2", "2.3"] },
    { "id": 1, "tasks": ["3.1", "3.3", "3.5", "3.7", "8.2"] },
    { "id": 2, "tasks": ["3.2", "3.4", "3.6", "3.8", "5.1", "5.2", "5.3"] },
    { "id": 3, "tasks": ["5.4", "6.1", "6.3", "6.5", "6.6", "6.9"] },
    { "id": 4, "tasks": ["6.2", "6.4", "6.7", "6.8", "8.1", "8.3", "9.1"] },
    { "id": 5, "tasks": ["10.1", "10.2", "10.3", "10.4", "10.5", "10.7", "11.1"] },
    { "id": 6, "tasks": ["10.6", "11.2", "11.4", "12.1"] },
    { "id": 7, "tasks": ["11.3", "12.2", "12.3", "12.5"] },
    { "id": 8, "tasks": ["12.4", "12.6", "13.1", "13.4"] },
    { "id": 9, "tasks": ["13.2", "13.3", "14.1", "14.2"] },
    { "id": 10, "tasks": ["17.1"] }
  ]
}
```
