# Intelligent Inventory Dashboard — Planning Document

---

## Project Requirements

**Domain:** Supply

**Task:** Build an Intelligent Inventory Dashboard to give dealership managers a real-time overview of their vehicle stock.

### Core Requirements

1. **Inventory Visualization** — Display a filterable, paginated list of all vehicles across all dealerships. Filters include dealership, make, model, and age.
2. **Aging Stock Identification** — Automatically identify and prominently display "aging stock" (vehicles in inventory for more than 90 days) with visual indicators on the inventory list and a dedicated aging stock view.
3. **Actionable Insights** — Allow a manager to log and persist a status or proposed action for each aging vehicle (e.g., "Price Reduction Planned"), including free-text notes, with timestamps and author tracking.

---

## Actors

| Actor | Status | Notes |
|---|---|---|
| Manager | Active | Full access to all vehicles across all dealerships |
| Admin | Parked | System config and user management — future scope |
| System | Background | Auto-calculates aging, flags vehicles >90 days |

---

## Entities & Fields

### User

| Field | Type | Notes |
|---|---|---|
| `id` | string | Unique identifier |
| `email` | string | Login credential |
| `password` | string | Hashed |
| `role` | enum | `Manager` \| `Admin` |
| `firstName` | string | |
| `lastName` | string | |
| `phone` | string | |
| `createdAt` | datetime | |
| `updatedAt` | datetime | |

### Dealership

| Field | Type | Notes |
|---|---|---|
| `id` | string | Unique identifier |
| `name` | string | Dealership name |
| `address` | string | Street address |
| `city` | string | |
| `state` | string | |
| `phone` | string | |
| `email` | string | |
| `createdAt` | datetime | |
| `updatedAt` | datetime | |

### Vehicle

| Field | Type | Notes |
|---|---|---|
| `id` | string | Unique identifier |
| `dealershipId` | string | FK → Dealership |
| `make` | string | e.g. Toyota |
| `model` | string | e.g. Camry |
| `year` | number | e.g. 2022 |
| `vin` | string | Vehicle Identification Number |
| `trim` | string | e.g. XSE, Limited |
| `color` | string | Exterior color |
| `mileage` | number | In miles/km |
| `price` | number | Listed price |
| `condition` | enum | `New` \| `Used` \| `Certified Pre-Owned` |
| `status` | enum | `Available` \| `Sold` \| `Reserved` |
| `dateAddedToInventory` | datetime | Used to calculate days in inventory |
| `isAging` | boolean | Computed: days in inventory > 90 |
| `createdAt` | datetime | |
| `updatedAt` | datetime | |

### VehicleAction

| Field | Type | Notes |
|---|---|---|
| `id` | string | Unique identifier |
| `vehicleId` | string | FK → Vehicle |
| `userId` | string | FK → User (who logged it) |
| `action` | string | e.g. "Price Reduction Planned", "Auction Scheduled" |
| `notes` | string | Free-text context |
| `createdAt` | datetime | When the action was logged |
| `updatedAt` | datetime | When the action was last modified |

---

## Entity Relationships

### Entity ↔ Entity

- `User` has a `role` (Manager or Admin)
- `User (Manager)` can access all `Dealerships`
- `Dealership` owns many `Vehicles`
- `Vehicle` belongs to one `Dealership`
- `VehicleAction` belongs to one `Vehicle`
- `VehicleAction` is logged by one `User`

### Entity ↔ Actor

- `Dealership Manager` is a `User` with role = Manager
- `Dealership Manager` views and filters all `Vehicles` across all `Dealerships`
- `Dealership Manager` logs `VehicleActions` against aging `Vehicles`
- `System` monitors `Vehicles` and computes `isAging` based on `dateAddedToInventory`

---

## Screens

1. **Inventory List** — paginated list of all vehicles across all dealerships, with filters for dealership / make / model / age; stats banner (total, aging, actioned counts); sortable columns; aging vehicles flagged inline; CSV export
2. **Aging Stock View** — focused view of vehicles where `isAging = true`, showing current action statuses, sorted by days descending
3. **Vehicle Action Panel** — modal or side panel where a manager logs or updates a proposed action for an aging vehicle

---

## Key Behaviors

- Managers see all vehicles across all dealerships
- Dealership is a filter on the inventory list, not an access boundary
- System auto-flags vehicles exceeding 90 days in inventory (`isAging = true`)
- Managers log proposed actions against aging vehicles, persisted with timestamp and author

---

## Tech Stack

| Category | Library / Tool | Notes |
|---|---|---|
| Framework | `next` | App Router + TypeScript |
| Language | `typescript` | Type safety |
| UI | `@mui/material` | Core MUI components |
| UI | `@mui/icons-material` | MUI icon set |
| UI | `@mui/x-data-grid` | Advanced data grid with pagination, sorting, filtering |
| UI | `@emotion/react` + `@emotion/styled` | MUI peer dependencies |
| UI | `tailwindcss` | Utility-first CSS for layout and spacing |
| UI | `clsx` | Conditional className utility |
| Data Fetching | `swr` | Client-side fetching with caching and loading/error states |
| Utilities | `dayjs` | Date calculation (days in inventory) |
| Linting | `eslint` + `eslint-config-next` | Code quality |
| Automation | `Makefile` | Automates dev, build, start, lint, install, clean |
| Localization | `next-intl` | i18n support for App Router (server + client components) |

---

## Localization (i18n)

- Library: `next-intl` — supports both server and client components in the App Router
- Default locale: `en` (English)
- All UI strings are externalized into `/messages/en.json`
- Structure is designed to support additional locales in the future with minimal changes

---

## Observability

| Concern | Approach |
|---|---|
| Logging | Structured logs via `/src/lib/logger.ts` wrapper — all API routes use the Logger, never `console.log` directly |
| Log fields | HTTP method, path, status code, duration (ms), Correlation ID, client IP, severity (info / error) |
| IP extraction | Read from `x-forwarded-for` header first (set by Nginx), fall back to `x-real-ip`, then socket remote address; use first value from comma-separated proxy chain |
| Tracing | Unique Correlation ID generated per request, returned in `X-Request-ID` response header |
| Metrics | Request duration tracked via `performance.now()` per API route, logged alongside each response |
| Local dev | `NODE_ENV=development` → pretty-printed human-readable lines to stdout (colored, indented) |
| Production | `NODE_ENV=production` → compact structured JSON to stdout, captured by pm2 / systemd on EC2 |
| Swappability | Logger exposes a swappable output interface — target (console → Datadog / CloudWatch) changed in `logger.ts` only |

---

## Backend Abstraction Strategy

| Concern | Approach |
|---|---|
| Service Layer | `/src/services` — one module per entity; views and components never call `fetch` directly |
| Base URL | `API_BASE_URL` env variable; defaults to `/api` (internal Next.js routes) if not set |
| Backend swap | Set `API_BASE_URL` to external backend URL (e.g., ASP.NET) — zero view or component changes required |
| Typed contracts | Each service module exports typed functions; signatures stay stable across backend swaps |
| Error handling | Service layer throws typed errors on non-2xx responses; views handle them for error state display |

---

## Security

Targeting deployment on AWS EC2 (or similar cloud VM) with Nginx as a reverse proxy.

| Concern | Approach |
|---|---|
| HTTPS | Enforced via Nginx reverse proxy with SSL/TLS termination (Let's Encrypt) |
| HTTP Security Headers | Set in `next.config.ts`: `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Referrer-Policy` |
| Route Protection | `middleware.ts` guards all `/manager` routes — unauthenticated users redirected to `/login` |
| API Input Validation | POST routes validate request body before writing to JSON files |
| Secrets Management | Sensitive values stored in `.env.local` — never committed to version control |
| `.gitignore` | `.env.local`, `node_modules`, `.next` excluded from repository |

---

```
/src
  /app                              ← Next.js App Router (server components only)
    /login
      page.tsx                      ← Server component → renders LoginView
    /manager
      layout.tsx                    ← Server layout (auth guard, shared nav)
      /inventory
        page.tsx                    ← Server component → renders InventoryView
      /aging-stock
        page.tsx                    ← Server component → renders AgingStockView
    /api
      /vehicles
        route.ts                    ← GET /api/vehicles (supports query params: dealership, make, model, age, page)
      /vehicles/aging
        route.ts                    ← GET /api/vehicles/aging
      /dealerships
        route.ts                    ← GET /api/dealerships
      /vehicle-actions
        route.ts                    ← GET + POST /api/vehicle-actions

  /views                            ← Client components, one per route
    /login
      LoginView.tsx
    /manager
      /inventory
        InventoryView.tsx           ← Core client component for inventory page
      /aging-stock
        AgingStockView.tsx          ← Core client component for aging stock page

  /components
    /common                         ← Reusable across all screens
      Table.tsx
      Pagination.tsx
      FilterBar.tsx
      Badge.tsx
      Modal.tsx
      SearchInput.tsx
    /inventory                      ← Screen-specific to inventory list
      InventoryFilters.tsx
      VehicleRow.tsx
      AgingBadge.tsx
    /aging-stock                    ← Screen-specific to aging stock view
      AgingVehicleCard.tsx
      VehicleActionPanel.tsx
      ActionStatusBadge.tsx

  /data                             ← Static JSON files (source of truth)
    users.json
    dealerships.json
    vehicles.json
    vehicle-actions.json

  /messages                         ← i18n translation files
    en.json
```

---

## Page → View Pattern

Each page strictly follows this flow:

```
app/.../page.tsx  (Server Component)
  └── renders one View  (Client Component)
        └── composes components from /components
```

- Server components handle initial data fetching and pass props down
- Views own all interactivity and client-side state
- Screen-specific components live under their named subfolder in `/components`
- Shared/reusable components live in `/components/common`

---

## Makefile Commands

| Command | Description |
|---|---|
| `make dev` | Start development server |
| `make build` | Build for production |
| `make start` | Start production server |
| `make lint` | Run ESLint |
| `make install` | Install dependencies |
| `make clean` | Remove `.next` and `node_modules` |
