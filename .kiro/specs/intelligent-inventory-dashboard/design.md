# Design Document: Intelligent Inventory Dashboard

## Overview

The Intelligent Inventory Dashboard is a Next.js 14+ (App Router) web application that gives dealership managers a single pane of glass over vehicle inventory. It surfaces aging stock automatically, allows managers to log and track proposed actions against slow-moving vehicles, and exports filtered data to CSV.

The application is structured around four main concerns:

- **Authentication** — session-based login with 8-hour expiry, enforced by `middleware.ts`
- **Inventory List** — paginated, filterable, sortable table of all vehicles with stats summary and CSV export
- **Aging Stock View** — focused view of `isAging = true` vehicles with action-status badges
- **Vehicle Action Panel** — modal for logging/updating proposed actions with full history

All data is served from static JSON files through Next.js API routes. A service layer (`/src/services`) abstracts the fetch calls so the static backend can be swapped for a real API (e.g., ASP.NET) by changing one environment variable (`API_BASE_URL`).

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────┐
│                 Browser (Client)                 │
│                                                  │
│  LoginView  │  InventoryView  │  AgingStockView  │
│             │                 │                  │
│         /src/services  (SWR + typed fetch)       │
└──────────────────────┬──────────────────────────┘
                       │ HTTP (API_BASE_URL)
┌──────────────────────▼──────────────────────────┐
│               Next.js API Routes                 │
│  /api/vehicles  /api/vehicles/aging              │
│  /api/dealerships  /api/vehicle-actions          │
│  /api/auth/login  /api/auth/logout               │
│          src/middleware.ts (auth guard)          │
└──────────────────────┬──────────────────────────┘
                       │ fs.readFileSync / JSON.parse
┌──────────────────────▼──────────────────────────┐
│              Static JSON Data Files              │
│  /src/data/vehicles.json  users.json             │
│             dealerships.json                     │
│             vehicle-actions.json                 │
└─────────────────────────────────────────────────┘
```


### Request / Response Flow

```
Browser                 middleware.ts          Page (Server)        View (Client)        Service Layer         API Route
  │                          │                     │                    │                    │                    │
  │── GET /manager/inventory ─►                    │                    │                    │                    │
  │                          │── check session ───►│                    │                    │                    │
  │                          │   (valid) ──────────►                    │                    │                    │
  │                          │                     │── render page ─────►                    │                    │
  │                          │                     │                    │── fetchVehicles() ─►                    │
  │                          │                     │                    │                    │── GET /api/vehicles►│
  │                          │                     │                    │                    │◄── 200 + JSON ──────│
  │                          │                     │                    │◄── VehiclePage ────│                    │
  │◄── rendered HTML ────────│─────────────────────│────────────────────│                    │                    │
```

### Deployment Topology

```
Internet ──► Nginx (HTTPS, TLS termination, security headers)
              │
              ▼
          Node.js / Next.js server on EC2
              │
              ├─ Serves static assets (/_next/static)
              └─ API routes (/api/*)
```

---

## Component Hierarchy and Data Flow

### File Structure

```
/src
  /app
    layout.tsx                           ← Root layout: ThemeRegistry + IntlProvider
    page.tsx                             ← Root redirect → /manager/inventory
    error.tsx                            ← Global error boundary (500-level, unhandled)
    not-found.tsx                        ← Global 404 page
    /login/page.tsx                      ← Server component, renders LoginView
    /manager
      layout.tsx                         ← Shared nav shell (NavBar); auth enforced by middleware
      error.tsx                          ← Manager-scoped error boundary (renders within nav shell)
      /inventory/page.tsx                ← Renders InventoryView
      /aging-stock/page.tsx              ← Renders AgingStockView (passes userId from session)
    /api
      /vehicles/route.ts                 ← GET /api/vehicles + POST /api/vehicles
      /vehicles/aging/route.ts           ← GET /api/vehicles/aging
      /dealerships/route.ts              ← GET /api/dealerships
      /vehicle-actions/route.ts          ← GET + POST /api/vehicle-actions
      /auth/login/route.ts               ← POST /api/auth/login
      /auth/logout/route.ts              ← POST /api/auth/logout

  /views
    /login/LoginView.tsx                 ← Client component
    /manager
      /inventory/InventoryView.tsx       ← Client component
      /aging-stock/AgingStockView.tsx    ← Client component

  /components
    /common
      Table.tsx
      Pagination.tsx
      FilterBar.tsx
      Badge.tsx
      Modal.tsx
      SearchInput.tsx
      StatsBanner.tsx
      ErrorPage.tsx                      ← Reusable error UI (used by error.tsx files)
      NavBar.tsx                         ← MUI AppBar; nav links + ThemeToggle + LogoutButton
      LogoutButton.tsx                   ← Calls logout() service; redirects via window.location
      ThemeRegistry.tsx                  ← MUI ThemeProvider + dark-mode body styles (useEffect)
      ThemeToggle.tsx                    ← Light/dark toggle; persisted in localStorage
      IntlProvider.tsx                   ← next-intl client provider
    /inventory
      InventoryFilters.tsx
      VehicleRow.tsx
      AgingBadge.tsx
      ExportCsvButton.tsx                ← Always visible; client-side CSV generation, no extra API call
      CreateVehicleDialog.tsx            ← MUI Dialog; 12-field form; calls POST /api/vehicles; onSuccess triggers SWR mutate
    /aging-stock
      AgingVehicleCard.tsx
      VehicleActionPanel.tsx
      ActionStatusBadge.tsx

  /services
    apiClient.ts                         ← Shared apiFetch<T>(); ONLY place reading API_BASE_URL
    vehicles.ts
    dealerships.ts
    vehicleActions.ts
    auth.ts                              ← login() + logout() service functions

  /hooks
    useI18n.ts                           ← useTranslations() wrapper; all client components use this

  /schemas
    auth.ts                              ← Zod loginSchema
    vehicleAction.ts                     ← Zod createVehicleActionSchema (with char-limit rules)
    vehicle.ts                           ← Zod createVehicleSchema (VIN=17, year range, enum validation)

  /config
    routes.ts

  /lib
    agingUtils.ts                        ← computeAgingFields(); pure, UTC dayjs, server-side only
    logger.ts                            ← Structured logger; LogTransport interface; swappable
    csvExport.ts                         ← generateCsv() + downloadCsv(); client-side
    filterUtils.ts                       ← applyFilters(); pure AND-conjunction
    sortUtils.ts                         ← applySort<T>(); generic, pure
    dataStore.ts                         ← readVehicles/readUsers/etc. + appendVehicleAction + appendVehicle (JSON I/O)
    session.ts                           ← iron-session sessionOptions + SessionPayload + TTL
    constants.ts                         ← AGING_THRESHOLD_DAYS, MAX_ACTION_LENGTH, DEFAULT_PAGE_SIZE, VIN_LENGTH, YEAR_MIN, YEAR_MAX, …

  /i18n
    request.ts                           ← next-intl server config (locale en, getMessageFallback, onError)

  /types
    entities.ts
    api.ts
    ui.ts

  /data
    users.json
    dealerships.json
    vehicles.json
    vehicle-actions.json

src/middleware.ts                        ← ⚠️ In src/ (not project root): Next.js 15 ignores root-level
                                            middleware when src/ exists. Protects /manager/*, redirects /login.

/messages/en.json                        ← All UI strings (project root, not inside /src)
```


### Component Tree — Inventory View

```
InventoryView (Client, owns all state)
├── StatsBanner          ← receives metric definitions as props
├── InventoryFilters     ← wraps FilterBar with inventory-specific filter defs
│   └── FilterBar        ← purely prop-driven, emits onFilterChange
├── [Add Vehicle button] ← opens CreateVehicleDialog
├── ExportCsvButton      ← inline; calls generateCsv(allFilteredVehicles)
├── CreateVehicleDialog  ← MUI Dialog; form for new vehicle; onSuccess → mutate()
├── Table                ← prop-driven; receives columns + rows
│   └── VehicleRow[]     ← one per vehicle; renders AgingBadge when isAging
│       └── AgingBadge
└── Pagination           ← receives page, totalPages, onPageChange
```

### Component Tree — Aging Stock View

```
AgingStockView (Client, owns all state)
├── AgingVehicleCard[]   ← one per aging vehicle; renders ActionStatusBadge
│   └── ActionStatusBadge
└── Modal                ← conditionally rendered
    └── VehicleActionPanel
        ├── ActionForm   ← action label + notes fields
        └── ActionHistory[]
```

### Data Flow — Inventory View

```
InventoryView
  │
  ├─ SWR: useDealerships()         → filterOptions (dealership dropdown)
  ├─ SWR: useVehicles(filters, page) → { data: Vehicle[], total: number }
  │         └─ vehicles.ts service → GET /api/vehicles?page=N&dealership=...
  │
  ├─ local state: filters (FilterState), page (number), sort (SortState)
  │
  ├─ allFilteredVehicles (SWR, no pagination) → used for CSV export only
  │         └─ vehicles.ts service → GET /api/vehicles?<filters>&pageSize=all
  │
  └─ handlers: onFilterChange → setFilters + setPage(1)
               onSort        → setSort
               onPageChange  → setPage
               onExportCsv   → generateCsv(allFilteredVehicles)
```

### Data Flow — Aging Stock View

```
AgingStockView
  │
  ├─ SWR: useAgingVehicles()       → AgingVehicle[] (includes latestAction)
  │         └─ vehicles.ts service → GET /api/vehicles/aging
  ├─ SWR: useVehicleActions(vehicleId) → VehicleAction[] (when panel open)
  │
  ├─ local state: selectedVehicleId, panelOpen
  │
  └─ handlers: onSelectVehicle → setSelectedVehicleId + setPanelOpen(true)
               onSubmitAction  → POST /api/vehicle-actions → mutate SWR cache
               onClosePanel    → setPanelOpen(false)
```

---

## TypeScript Type and Interface Definitions

### Entity Types

```typescript
// /src/types/entities.ts

export type UserRole = 'Manager' | 'Admin';
export type VehicleCondition = 'New' | 'Used' | 'CPO';
export type VehicleStatus = 'Available' | 'Sold' | 'Reserved';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phone: string;
  createdAt: string; // ISO 8601
  updatedAt: string;
}

export interface Dealership {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: string;
  dealershipId: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  trim: string;
  color: string;
  mileage: number;
  price: number;
  condition: VehicleCondition;
  status: VehicleStatus;
  dateAddedToInventory: string | null; // ISO 8601 date string
  createdAt: string;
  updatedAt: string;
}

/** Vehicle as returned by the API — includes computed fields */
export interface VehicleWithComputed extends Vehicle {
  isAging: boolean;
  daysInInventory: number;
  dealershipName: string; // joined from Dealership
}

export interface VehicleAction {
  id: string;
  vehicleId: string;
  userId: string;
  action: string;       // max 500 chars
  notes: string;        // max 2000 chars
  createdAt: string;    // ISO 8601
  updatedAt: string;
}

/** VehicleAction as returned by the API — includes author name */
export interface VehicleActionWithAuthor extends VehicleAction {
  authorFullName: string;
}
```


### API Request / Response Types

```typescript
// /src/types/api.ts

// --- GET /api/vehicles ---
export interface GetVehiclesParams {
  page?: number;         // 1-indexed, default 1
  dealership?: string;   // dealership id
  make?: string;
  model?: string;
  age?: 'aging' | 'non-aging';
  pageSize?: number | 'all'; // 'all' used internally for CSV export
}

export interface GetVehiclesResponse {
  data: VehicleWithComputed[];
  total: number;
  page: number;
  pageSize: number;
}

// --- GET /api/vehicles/aging ---
export interface GetAgingVehiclesResponse {
  data: VehicleWithComputed[];
}

// --- GET /api/dealerships ---
export interface GetDealershipsResponse {
  data: Dealership[];
}

// --- GET /api/vehicle-actions ---
export interface GetVehicleActionsParams {
  vehicleId: string;
}

export interface GetVehicleActionsResponse {
  data: VehicleActionWithAuthor[];
}

// --- POST /api/vehicle-actions ---
export interface CreateVehicleActionBody {
  vehicleId: string;
  userId: string;
  action: string;
  notes?: string;
}

export interface CreateVehicleActionResponse {
  data: VehicleActionWithAuthor;
}

// --- POST /api/vehicles ---
export interface CreateVehicleBody {
  dealershipId: string;
  make: string;
  model: string;
  year: number;
  vin: string;          // exactly 17 characters
  trim: string;
  color: string;
  mileage: number;
  price: number;
  condition: VehicleCondition;
  status: VehicleStatus;
  dateAddedToInventory?: string | null; // defaults to today
}

export interface CreateVehicleResponse {
  data: VehicleWithComputed;
}

// --- Error response shape ---
export interface ApiErrorResponse {
  field?: string;   // identifies missing/invalid field for 400s
  message: string;
}

// --- Typed service error ---
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
```

### Filter and UI Configuration Types

```typescript
// /src/types/ui.ts

export type FilterType = 'select' | 'toggle';

export interface SelectFilterOption {
  value: string;
  label: string;
}

export interface FilterDefinition {
  key: string;                       // matches a key in FilterState
  label: string;                     // i18n key or display string
  type: FilterType;
  options?: SelectFilterOption[];    // for type='select'
  toggleOptions?: [string, string];  // [falseLabel, trueLabel] for type='toggle'
  defaultValue: string;
}

export interface FilterState {
  [key: string]: string;
}

// StatsBanner metric definition
export interface MetricDefinition {
  key: string;
  label: string;             // i18n key
  value: number | string;
  highlight?: boolean;       // renders with accent colour
}

// Table column definition
export type SortDirection = 'asc' | 'desc';

export interface ColumnDefinition<T = Record<string, unknown>> {
  key: keyof T & string;
  label: string;            // i18n key
  sortable?: boolean;
  width?: string | number;
  renderCell?: (row: T) => React.ReactNode;
}

export interface SortState {
  column: string;
  direction: SortDirection;
}
```

---

## API Route Contracts

### GET /api/vehicles

**Query params:** `page`, `dealership`, `make`, `model`, `age`, `pageSize`

**Response 200:**
```json
{
  "data": [
    {
      "id": "v1",
      "dealershipId": "d1",
      "dealershipName": "Downtown Motors",
      "make": "Toyota",
      "model": "Camry",
      "year": 2021,
      "vin": "1HGBH41JXMN109186",
      "trim": "LE",
      "color": "Silver",
      "mileage": 32000,
      "price": 22500,
      "condition": "Used",
      "status": "Available",
      "dateAddedToInventory": "2024-06-01",
      "isAging": true,
      "daysInInventory": 127,
      "createdAt": "2024-06-01T00:00:00Z",
      "updatedAt": "2024-06-01T00:00:00Z"
    }
  ],
  "total": 142,
  "page": 1,
  "pageSize": 25
}
```

**Notes:**
- `pageSize` defaults to 25; accepts `all` to return every matching record (for CSV export)
- Out-of-range `page` returns `{ data: [], total: N, page: P, pageSize: 25 }`


### GET /api/vehicles/aging

**Response 200:**
```json
{
  "data": [ /* same VehicleWithComputed shape, all isAging=true */ ]
}
```

### GET /api/dealerships

**Response 200:**
```json
{
  "data": [
    { "id": "d1", "name": "Downtown Motors", "address": "...", "city": "...", "state": "...", "phone": "...", "email": "...", "createdAt": "...", "updatedAt": "..." }
  ]
}
```

### GET /api/vehicle-actions?vehicleId=v1

**Response 200:**
```json
{
  "data": [
    {
      "id": "a1",
      "vehicleId": "v1",
      "userId": "u1",
      "action": "Price Reduction Planned",
      "notes": "Reduced by $2,000",
      "authorFullName": "Jane Smith",
      "createdAt": "2024-10-15T14:00:00Z",
      "updatedAt": "2024-10-15T14:00:00Z"
    }
  ]
}
```

### POST /api/vehicle-actions

**Request body:**
```json
{
  "vehicleId": "v1",
  "userId": "u1",
  "action": "Price Reduction Planned",
  "notes": "Optional free text up to 2000 chars"
}
```

**Response 201:**
```json
{
  "data": { /* VehicleActionWithAuthor */ }
}
```

**Response 400 (missing required field):**
```json
{
  "field": "action",
  "message": "The action field is required."
}
```

**Response 404 (vehicleId not found):**
```json
{
  "message": "Vehicle with id 'v99' not found."
}
```

### POST /api/vehicles

**Request body:**
```json
{
  "dealershipId": "d1",
  "make": "BMW",
  "model": "M3",
  "year": 2025,
  "vin": "1HGBH41JXMN109186",
  "trim": "Base",
  "color": "Silver",
  "mileage": 0,
  "price": 75000,
  "condition": "New",
  "status": "Available",
  "dateAddedToInventory": "2026-06-05"
}
```

**Response 201:**
```json
{
  "data": { /* VehicleWithComputed — includes id, isAging, daysInInventory, dealershipName */ }
}
```

**Response 400 (validation failure):**
```json
{
  "field": "vin",
  "message": "VIN must be exactly 17 characters."
}
```

**Response 404 (dealershipId not found):**
```json
{
  "message": "Dealership with id 'd99' not found."
}
```

**Notes:**
- `id` generated server-side via `crypto.randomUUID()`
- `dateAddedToInventory` defaults to today's ISO date if omitted or null
- Route requires `export const runtime = 'nodejs'` (for `node:crypto`)
- Zod `createVehicleSchema` validates all fields (from `src/schemas/vehicle.ts`)

---

## Service Layer Design

All service functions live in `/src/services`. They read `API_BASE_URL` from `process.env` (defaulting to `/api`) and throw `ApiError` on non-2xx responses. Views use SWR with these functions as fetchers.

```typescript
// /src/services/vehicles.ts

const BASE = process.env.API_BASE_URL ?? '/api';

export async function fetchVehicles(
  params: GetVehiclesParams
): Promise<GetVehiclesResponse> { ... }

export async function fetchAgingVehicles(): Promise<GetAgingVehiclesResponse> { ... }

export async function createVehicle(
  body: CreateVehicleBody
): Promise<CreateVehicleResponse> { ... }

// SWR key factory — stable key for caching
export const vehicleKeys = {
  list: (params: GetVehiclesParams) => ['vehicles', params] as const,
  aging: () => ['vehicles', 'aging'] as const,
};
```

```typescript
// /src/services/dealerships.ts

export async function fetchDealerships(): Promise<GetDealershipsResponse> { ... }

export const dealershipKeys = {
  all: () => ['dealerships'] as const,
};
```

```typescript
// /src/services/vehicleActions.ts

export async function fetchAllVehicleActions(): Promise<GetVehicleActionsResponse> { ... }

export async function fetchVehicleActions(
  vehicleId: string
): Promise<GetVehicleActionsResponse> { ... }

export async function createVehicleAction(
  body: CreateVehicleActionBody
): Promise<CreateVehicleActionResponse> { ... }

export const vehicleActionKeys = {
  all: ['vehicle-actions'] as const,
  byVehicle: (vehicleId: string) => ['vehicle-actions', vehicleId] as const,
};
```

```typescript
// /src/services/auth.ts

export async function login(email: string, password: string): Promise<{ userId: string; role: UserRole; email: string }> { ... }

export async function logout(): Promise<void> { ... }
```

### Error handling pattern in services

```typescript
async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body: ApiErrorResponse = await res.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(res.status, body.message, body.field);
  }
  return res.json() as Promise<T>;
}
```

Views catch `ApiError` in SWR's `onError` callback or in mutation handlers and set local error state to display inline messages.

---

## State Management in Views

State is local to each View (Client Component). No global state store is used. SWR handles server-state caching and invalidation.

### InventoryView state

```typescript
const [filters, setFilters] = useState<FilterState>({
  dealership: '',
  make: '',
  model: '',
  age: '',
});
const [page, setPage] = useState(1);
const [sort, setSort] = useState<SortState>({ column: 'make', direction: 'asc' });

// paginated data for table
const { data, error, isLoading } = useSWR(
  vehicleKeys.list({ ...filters, page, sort }),
  () => fetchVehicles({ ...filters, page })
);

// all matching records for CSV export (no pagination)
const { data: allData } = useSWR(
  vehicleKeys.list({ ...filters, pageSize: 'all' }),
  () => fetchVehicles({ ...filters, pageSize: 'all' })
);

function handleFilterChange(next: FilterState) {
  setFilters(next);
  setPage(1); // always reset to page 1 on filter change
}
```


### AgingStockView state

```typescript
const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
const [panelOpen, setPanelOpen] = useState(false);
const [submitError, setSubmitError] = useState<string | null>(null);

const { data, error, isLoading, mutate } = useSWR(
  vehicleKeys.aging(),
  fetchAgingVehicles,
  { shouldRetryOnError: false }
);

async function handleSubmitAction(body: CreateVehicleActionBody) {
  try {
    await createVehicleAction(body);
    setPanelOpen(false);
    mutate(); // revalidate aging vehicles to refresh action badges
  } catch (e) {
    setSubmitError(e instanceof ApiError ? e.message : 'Submission failed.');
  }
}
```

### VehicleActionPanel state

```typescript
// Owned within the panel component itself
const [actionLabel, setActionLabel] = useState('');
const [notes, setNotes] = useState('');
const [validationError, setValidationError] = useState<string | null>(null);
const [submitError, setSubmitError] = useState<string | null>(null);

// Pre-populate on open with latest action (passed as prop)
useEffect(() => {
  if (latestAction) {
    setActionLabel(latestAction.action);
    setNotes(latestAction.notes ?? '');
  }
}, [latestAction]);
```

---

## Logger Module Design

### Interface

```typescript
// /src/lib/logger.ts

export interface LogEntry {
  level: 'info' | 'error';
  method: string;
  path: string;
  status: number;
  durationMs: number;
  correlationId: string;
  ip: string;
  timestamp: string; // ISO 8601
  [key: string]: unknown; // extensible for additional fields
}

export interface LogTransport {
  emit(entry: LogEntry): void;
}

export interface Logger {
  info(entry: Omit<LogEntry, 'level'>): void;
  error(entry: Omit<LogEntry, 'level'>): void;
}
```

### Implementation

```typescript
// /src/lib/logger.ts (implementation excerpt)

const devTransport: LogTransport = {
  emit(entry) {
    const ts = dayjs(entry.timestamp).format('HH:mm:ss');
    console.log(
      `[${entry.level.toUpperCase()}] ${ts} ${entry.method} ${entry.path} ${entry.status} ${entry.durationMs}ms | ip=${entry.ip} | reqId=${entry.correlationId}`
    );
  },
};

const prodTransport: LogTransport = {
  emit(entry) {
    process.stdout.write(JSON.stringify(entry) + '\n');
  },
};

function createLogger(transport: LogTransport): Logger {
  return {
    info(entry) {
      try { transport.emit({ ...entry, level: 'info' }); } catch { /* suppress */ }
    },
    error(entry) {
      try { transport.emit({ ...entry, level: 'error' }); } catch { /* suppress */ }
    },
  };
}

export const logger = createLogger(
  process.env.NODE_ENV === 'production' ? prodTransport : devTransport
);
```

### IP extraction utility

```typescript
export function extractIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  // socket remote address not available in edge runtime; return unknown
  return 'unknown';
}
```

### Correlation ID utility

```typescript
import { randomUUID } from 'crypto';

export function generateCorrelationId(): string {
  return randomUUID();
}
```

### Usage in API routes

```typescript
// Example: /src/app/api/vehicles/route.ts
export async function GET(req: Request) {
  const correlationId = generateCorrelationId();
  const ip = extractIp(req);
  const start = Date.now();
  let status = 200;

  try {
    const result = handleGetVehicles(req);
    status = 200;
    return NextResponse.json(result, {
      status,
      headers: { 'X-Request-ID': correlationId }
    });
  } catch (e) {
    status = 500;
    return NextResponse.json({ message: 'Internal server error' }, {
      status,
      headers: { 'X-Request-ID': correlationId }
    });
  } finally {
    const entry = { method: 'GET', path: '/api/vehicles', status,
      durationMs: Date.now() - start, correlationId, ip,
      timestamp: new Date().toISOString() };
    status >= 400 ? logger.error(entry) : logger.info(entry);
  }
}
```

---

## Auth / Session Strategy

```
/src/data/users.json              ← hashed passwords (bcryptjs)
src/middleware.ts                 ← reads session cookie, redirects on invalid/absent
                                     ⚠️ Must be in src/ on Next.js 15 (root-level ignored)
/src/lib/session.ts               ← iron-session sessionOptions + SessionPayload type
/src/services/auth.ts             ← login() + logout() service functions (go through apiFetch)
/app/login/page.tsx               ← renders LoginView
/app/api/auth/login/route.ts      ← POST: validate with loginSchema (zod), bcrypt compare, set cookie
/app/api/auth/logout/route.ts     ← POST: session.destroy(), return { ok: true }
```

Session is stored as a signed, encrypted HTTP-only cookie using `iron-session` (or equivalent). Cookie attributes:

| Attribute  | Value                          |
|------------|-------------------------------|
| httpOnly   | true                           |
| secure     | true (via Nginx / HTTPS)       |
| sameSite   | lax                            |
| maxAge     | 28800 (8 hours in seconds)     |
| path       | /                              |

### Session payload

```typescript
interface SessionPayload {
  userId: string;
  role: UserRole;
  email: string;
  expiresAt: number; // Unix timestamp ms
}
```

### Middleware logic (pseudocode)

```typescript
// src/middleware.ts  (⚠️ must be in src/ on Next.js 15)
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Authenticated user on /login → redirect to /manager/inventory
  if (pathname === '/login') {
    if (isAuthenticated(req)) return redirect('/manager/inventory');
    return NextResponse.next();
  }

  // All /manager routes require valid session
  if (pathname.startsWith('/manager')) {
    if (!isAuthenticated(req)) return redirect('/login');
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/login', '/manager/:path*'],
};
```


---

## Route Configuration

```typescript
// /src/config/routes.ts

export interface RouteConfig {
  path: string;
  label: string;      // i18n key
  icon?: string;      // MUI icon name
  navVisible: boolean;
}

export const routes = {
  login: {
    path: '/login',
    label: 'nav.login',
    navVisible: false,
  },
  inventory: {
    path: '/manager/inventory',
    label: 'nav.inventory',
    icon: 'DirectionsCar',
    navVisible: true,
  },
  agingStock: {
    path: '/manager/aging-stock',
    label: 'nav.agingStock',
    icon: 'Warning',
    navVisible: true,
  },
} satisfies Record<string, RouteConfig>;

// Navigation items derived from route config
export const navItems = Object.values(routes).filter(r => r.navVisible);
```

Adding a new screen requires only adding a new entry to `routes`. The manager layout iterates `navItems` to build the nav, and `middleware.ts` protects all `/manager/:path*` via its matcher — no changes needed to either.

---

## FilterBar Filter Definition Schema

```typescript
// /src/types/ui.ts (FilterDefinition, already defined above)

// Example: inventory filter definitions
const inventoryFilterDefs: FilterDefinition[] = [
  {
    key: 'dealership',
    label: 'filters.dealership',
    type: 'select',
    options: dealerships.map(d => ({ value: d.id, label: d.name })),
    defaultValue: '',
  },
  {
    key: 'make',
    label: 'filters.make',
    type: 'select',
    options: makeOptions,
    defaultValue: '',
  },
  {
    key: 'model',
    label: 'filters.model',
    type: 'select',
    options: modelOptions,
    defaultValue: '',
  },
  {
    key: 'age',
    label: 'filters.age',
    type: 'toggle',
    toggleOptions: ['filters.nonAging', 'filters.aging'],
    defaultValue: '',
  },
];
```

FilterBar renders each definition into a MUI Select or ToggleButtonGroup. When any control changes, it emits `onFilterChange(updatedFilterState)`. FilterBar itself has zero knowledge of vehicles, dealerships, or routes.

---

## StatsBanner Metric Definition Schema

```typescript
// Example: inventory stats metrics
const inventoryMetrics = (
  total: number,
  agingCount: number,
  actionedCount: number
): MetricDefinition[] => [
  { key: 'total',    label: 'stats.totalVehicles', value: total },
  { key: 'aging',    label: 'stats.agingVehicles', value: agingCount,    highlight: true },
  { key: 'actioned', label: 'stats.actionedVehicles', value: actionedCount },
];
```

StatsBanner maps over the array to render metric cards. Adding a new summary stat requires no change to StatsBanner.

---

## CSV Export Implementation

```typescript
// /src/lib/csvExport.ts

const CSV_COLUMNS: Array<{ key: keyof VehicleWithComputed | 'dealershipName'; header: string }> = [
  { key: 'dealershipName',      header: 'Dealership' },
  { key: 'make',                header: 'Make' },
  { key: 'model',               header: 'Model' },
  { key: 'year',                header: 'Year' },
  { key: 'trim',                header: 'Trim' },
  { key: 'color',               header: 'Color' },
  { key: 'mileage',             header: 'Mileage' },
  { key: 'price',               header: 'Price' },
  { key: 'condition',           header: 'Condition' },
  { key: 'status',              header: 'Status' },
  { key: 'daysInInventory',     header: 'Days_In_Inventory' },
  { key: 'isAging',             header: 'isAging' },
];

function escapeCsvValue(value: unknown): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateCsv(vehicles: VehicleWithComputed[]): string {
  const header = CSV_COLUMNS.map(c => c.header).join(',');
  const rows = vehicles.map(v =>
    CSV_COLUMNS.map(c => escapeCsvValue(v[c.key])).join(',')
  );
  return [header, ...rows].join('\n');
}

export function downloadCsv(csv: string, date: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `inventory-export-${date}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Usage in InventoryView
function handleExportCsv() {
  const csv = generateCsv(allData?.data ?? []);
  const date = dayjs().format('YYYY-MM-DD');
  downloadCsv(csv, date);
}
```

The export is purely client-side. It uses `allData` — the SWR-cached response from `GET /api/vehicles?<filters>&pageSize=all` — which is already fetched for display purposes. No additional API request is made on export click.

---

## Aging Computation

`isAging` and `daysInInventory` are computed server-side in each API route handler before returning vehicle records.

```typescript
// /src/lib/agingUtils.ts

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

export const AGING_THRESHOLD_DAYS = 90;

export function computeAgingFields(vehicle: Vehicle): {
  daysInInventory: number;
  isAging: boolean;
} {
  if (!vehicle.dateAddedToInventory) {
    return { daysInInventory: 0, isAging: false };
  }
  const added = dayjs.utc(vehicle.dateAddedToInventory).startOf('day');
  const now   = dayjs.utc().startOf('day');
  const daysInInventory = now.diff(added, 'day');
  return {
    daysInInventory,
    isAging: daysInInventory > AGING_THRESHOLD_DAYS,
  };
}
```

This function is pure and deterministic given the same `dateAddedToInventory` and current UTC date — making it straightforwardly testable as a property.


---

## Data Models (JSON File Shapes)

```jsonc
// /src/data/users.json
[
  {
    "id": "u1",
    "email": "manager@example.com",
    "passwordHash": "$2b$10$...",
    "role": "Manager",
    "firstName": "Jane",
    "lastName": "Smith",
    "phone": "555-0100",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
]

// /src/data/dealerships.json
[
  {
    "id": "d1",
    "name": "Downtown Motors",
    "address": "100 Main St",
    "city": "Springfield",
    "state": "IL",
    "phone": "555-0200",
    "email": "downtown@motors.com",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
]

// /src/data/vehicles.json
// isAging and daysInInventory are NOT stored — always computed at query time
[
  {
    "id": "v1",
    "dealershipId": "d1",
    "make": "Toyota",
    "model": "Camry",
    "year": 2021,
    "vin": "1HGBH41JXMN109186",
    "trim": "LE",
    "color": "Silver",
    "mileage": 32000,
    "price": 22500,
    "condition": "Used",
    "status": "Available",
    "dateAddedToInventory": "2024-06-01",
    "createdAt": "2024-06-01T00:00:00Z",
    "updatedAt": "2024-06-01T00:00:00Z"
  }
]

// /src/data/vehicle-actions.json
[
  {
    "id": "a1",
    "vehicleId": "v1",
    "userId": "u1",
    "action": "Price Reduction Planned",
    "notes": "Reduced by $2,000",
    "createdAt": "2024-10-15T14:00:00Z",
    "updatedAt": "2024-10-15T14:00:00Z"
  }
]
```

---

## Error Handling

### Error Pages (Next.js App Router Conventions)

The application uses Next.js `error.tsx` and `not-found.tsx` files to render dedicated error pages when server-side failures occur. These are distinct from client-side SWR error states.

**When error pages trigger:**
- `error.tsx` — catches unhandled runtime errors thrown from server components or page-level code (maps to 500-level errors)
- `not-found.tsx` — renders when a route does not exist or `notFound()` is called explicitly

**Two error boundaries are defined:**

| File | Scope | Behavior |
|---|---|---|
| `/src/app/error.tsx` | Global | Full-page error UI, rendered outside the manager shell. Used when the error occurs before the layout loads. |
| `/src/app/manager/error.tsx` | Manager routes | Error UI rendered *within* the manager layout (nav still visible). Used when a manager page throws server-side. |
| `/src/app/not-found.tsx` | Global | Full-page 404 UI with a "Go to Inventory" link. |

**Reusable `ErrorPage` component** (`/src/components/common/ErrorPage.tsx`) is shared by both `error.tsx` files to avoid duplication. It accepts:

```typescript
interface ErrorPageProps {
  title: string;          // i18n key, e.g. 'errors.serverError'
  message: string;        // i18n key, e.g. 'errors.serverErrorMessage'
  showRetry?: boolean;    // renders a "Try again" button that calls reset()
  showHome?: boolean;     // renders a "Go to Inventory" link
}
```

**`error.tsx` implementation pattern:**

```typescript
// /src/app/manager/error.tsx
'use client';

import { useEffect } from 'react';
import ErrorPage from '@/components/common/ErrorPage';

export default function ManagerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to observability layer if needed (client-side)
    console.error(error);
  }, [error]);

  return (
    <ErrorPage
      title="errors.serverError"
      message="errors.serverErrorMessage"
      showRetry
      onRetry={reset}
      showHome
    />
  );
}
```

**`not-found.tsx` implementation pattern:**

```typescript
// /src/app/not-found.tsx
import ErrorPage from '@/components/common/ErrorPage';

export default function NotFound() {
  return (
    <ErrorPage
      title="errors.notFound"
      message="errors.notFoundMessage"
      showHome
    />
  );
}
```

**Error boundary scope — when each fires:**

```
Browser navigates to /manager/inventory
  └── manager/layout.tsx loads (auth check)
      └── inventory/page.tsx throws (e.g. JSON parse error, unhandled promise)
            → /src/app/manager/error.tsx renders (nav shell still visible)

Browser navigates to /unknown-route
  → /src/app/not-found.tsx renders

Server component outside /manager throws
  → /src/app/error.tsx renders (no nav shell)
```

**Client-side SWR errors stay inline** (error message + retry button within the view), because the page has already loaded successfully — redirecting to an error page would lose filter/pagination state. Only server-side/unhandled errors use the error page pattern.

### Error Scenario Matrix

| Scenario | Handling |
|---|---|
| Unhandled server component error (500-level) | `error.tsx` renders ErrorPage with "Try again" + "Go to Inventory" |
| Unknown route | `not-found.tsx` renders ErrorPage with "Go to Inventory" |
| SWR fetch error (network / 5xx) in client view | Inline error message + retry button in the view (no page redirect) |
| API 400 (validation) | Service throws `ApiError(400, message, field)`; form displays inline field error |
| API 404 from service layer | Service throws `ApiError(404, message)`; view displays inline "not found" message |
| API 500 from service layer | Service throws `ApiError(500, message)`; view displays inline generic error |
| Logger failure | Suppressed silently in try/catch; API route response unaffected |
| Locale file load failure | next-intl falls back to English; no crash |
| Missing `dateAddedToInventory` | `computeAgingFields` returns `{ daysInInventory: 0, isAging: false }` |
| Empty action label on submit | Client-side validation blocks submission; inline error shown |
| Action label > 500 chars | Enforced by `maxLength` on input + server-side validation |
| Notes > 2000 chars | Enforced by `maxLength` on textarea + server-side validation |
| CSV export with empty result | `generateCsv([])` returns header row only — valid CSV |

### API Route Validation (POST /api/vehicle-actions)

```typescript
function validateCreateVehicleActionBody(
  body: unknown
): body is CreateVehicleActionBody {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  if (!b.vehicleId) throw new ApiError(400, 'vehicleId is required.', 'vehicleId');
  if (!b.userId)    throw new ApiError(400, 'userId is required.',    'userId');
  if (!b.action)    throw new ApiError(400, 'action is required.',    'action');
  return true;
}
```

---

## Security Configuration

### HTTP Security Headers (`next.config.ts`)

```typescript
const securityHeaders = [
  { key: 'X-Frame-Options',           value: 'DENY' },
  { key: 'X-Content-Type-Options',    value: 'nosniff' },
  { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",  // Next.js inline scripts
      "style-src 'self' 'unsafe-inline'",   // MUI inline styles
      "img-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self'",
    ].join('; '),
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];
```

HSTS is effective because Nginx terminates TLS and forwards to Next.js over HTTP internally, but browsers see the HTTPS connection and cache the HSTS policy.

---

## Localization

All user-visible strings are resolved through next-intl's `useTranslations` hook in client components and `getTranslations` in server components. API data values (vehicle make, model, etc.) are not translated.

```typescript
// /messages/en.json structure
{
  "nav": { "inventory": "Inventory", "agingStock": "Aging Stock", ... },
  "filters": { "dealership": "Dealership", "make": "Make", ... },
  "stats": { "totalVehicles": "Total Vehicles", "agingVehicles": "Aging", ... },
  "table": { "make": "Make", "model": "Model", "year": "Year", ... },
  "errors": {
    "fetchFailed": "Failed to load data. Please try again.",
    "submitFailed": "Failed to save. Please try again.",
    "actionRequired": "Action label is required.",
    "noVehicles": "No vehicles found.",
    "noAgingVehicles": "No aging vehicles in inventory.",
    "serverError": "Something went wrong",
    "serverErrorMessage": "An unexpected error occurred. Please try again or return to the inventory.",
    "notFound": "Page not found",
    "notFoundMessage": "The page you're looking for doesn't exist."
  },
  "actions": { "export": "Export CSV", "retry": "Retry", "save": "Save", "cancel": "Cancel", "goToInventory": "Go to Inventory" },
  "panel": { "noActionRecorded": "No Action Recorded", ... }
}
```

Missing key fallback is configured in the next-intl provider:

```typescript
// /src/app/layout.tsx or next-intl config
messages={{ onMissingTranslation: ({ key }) => key }}
```


---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

The following properties were derived from the acceptance criteria using the prework analysis. Where multiple criteria map to the same universal invariant, they are consolidated into a single comprehensive property.

---

### Property 1: Aging threshold correctness

*For any* integer number of days `d`, `computeAgingFields` SHALL return `isAging = true` when `d > 90` and `isAging = false` when `d <= 90`.

**Validates: Requirements 4.1, 4.2**

---

### Property 2: Days-in-inventory computation

*For any* UTC date string `dateAddedToInventory` that is in the past, the computed `daysInInventory` SHALL equal the whole number of calendar days elapsed between that date and the current UTC date (i.e., `floor((utcNow - utcAdded) / msPerDay)`).

**Validates: Requirement 4.3**

---

### Property 3: Vehicle API response always includes computed fields

*For any* vehicle record served by the API (whether from `GET /api/vehicles` or `GET /api/vehicles/aging`), the response item SHALL contain both `isAging` (boolean) and `daysInInventory` (non-negative integer).

**Validates: Requirement 4.4**

---

### Property 4: VehicleRow renders all required fields

*For any* `VehicleWithComputed` object, rendering the VehicleRow component SHALL produce output that includes the dealership name, make, model, year, trim, color, mileage, price, condition, status, and `daysInInventory` values from that object.

**Validates: Requirement 2.2**

---

### Property 5: AgingBadge presence matches isAging flag

*For any* `VehicleWithComputed` object, the rendered VehicleRow SHALL display the AgingBadge if and only if `isAging = true`.

**Validates: Requirements 2.5, 2.6**

---

### Property 6: StatsBanner values match computed dataset counts

*For any* array of `VehicleWithComputed` records and any associated `VehicleAction` records, the StatsBanner SHALL display values equal to: (a) the total count of vehicle records, (b) the count of records where `isAging = true`, and (c) the count of distinct vehicleIds among those with `isAging = true` that have at least one action.

**Validates: Requirement 2.7**

---

### Property 7: Table sort produces correctly ordered results

*For any* array of `VehicleWithComputed` records and any sortable column (`make`, `model`, `year`, `mileage`, `price`, `daysInInventory`), applying ascending sort SHALL yield records in non-decreasing order of that column's value, and applying descending sort SHALL yield records in non-increasing order.

**Validates: Requirements 2.8, 2.9**

---

### Property 8: Filter conjunction — results match all active criteria

*For any* array of `VehicleWithComputed` records and any combination of active filter values (dealership, make, model, age), the filtered result SHALL contain exactly the records that satisfy every active filter criterion simultaneously (empty/default filter values are ignored).

**Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6**

---

### Property 9: Filter clear restores full dataset

*For any* array of `VehicleWithComputed` records and any prior filter state, clearing all filters SHALL produce a result equal to the unfiltered full dataset.

**Validates: Requirements 3.7**

---

### Property 10: Filter application resets pagination to page 1

*For any* current page number `p ≥ 1` and any filter change (even if the filter value is the same), the page SHALL be reset to 1 after the filter is applied.

**Validates: Requirement 3.8**

---

### Property 11: Aging Stock View contains only isAging vehicles

*For any* vehicle dataset, `GET /api/vehicles/aging` SHALL return exactly the subset of vehicles where `isAging = true` — no non-aging vehicles included, no aging vehicles omitted.

**Validates: Requirements 5.1**

---

### Property 12: AgingVehicleCard renders all required fields

*For any* `VehicleWithComputed` object where `isAging = true`, rendering the AgingVehicleCard SHALL include the dealership name, make, model, year, trim, `daysInInventory`, and price.

**Validates: Requirement 5.2**

---

### Property 13: ActionStatusBadge shows most recent action

*For any* non-empty list of `VehicleAction` records for a given vehicle, the ActionStatusBadge SHALL display the `action` field from the record with the highest `createdAt` timestamp.

**Validates: Requirement 5.4**

---

### Property 14: Aging vehicles initially sorted by daysInInventory descending

*For any* array of aging vehicles with distinct `daysInInventory` values, the initial render of `AgingStockView` SHALL display vehicles in strictly non-increasing order of `daysInInventory`.

**Validates: Requirement 5.5**

---

### Property 15: VehicleAction persisted record contains all required fields

*For any* valid `CreateVehicleActionBody` payload (`vehicleId`, `userId`, `action`, and optional `notes`), the persisted record returned by `POST /api/vehicle-actions` SHALL contain all submitted fields plus a non-empty `id` and a `createdAt` timestamp.

**Validates: Requirement 6.3**

---

### Property 16: Action history displayed in descending createdAt order

*For any* list of `VehicleActionWithAuthor` records for a vehicle, the action history rendered in `VehicleActionPanel` SHALL display records in non-increasing order of `createdAt`.

**Validates: Requirements 6.6, 7.3**

---

### Property 17: Empty or whitespace action label is rejected

*For any* string composed entirely of whitespace characters (including the empty string), submitting it as the action label SHALL produce a client-side validation error and SHALL NOT dispatch a POST request to the API.

**Validates: Requirements 6.7, 7.4**

---

### Property 18: Panel pre-populates from most recent action

*For any* vehicle with a non-empty list of `VehicleAction` records, opening `VehicleActionPanel` SHALL pre-populate the action label field with the `action` value and the notes field with the `notes` value of the record that has the highest `createdAt` timestamp.

**Validates: Requirement 7.1**

---

### Property 19: Update preserves prior action history

*For any* existing history of `N` VehicleAction records for a vehicle, submitting a new action via `POST /api/vehicle-actions` SHALL result in `N + 1` records in the data store, with all prior `N` records unchanged.

**Validates: Requirement 7.2**

---

### Property 20: Character limits enforced on action label and notes

*For any* string of length `> 500` submitted as the action label, or any string of length `> 2000` submitted as notes, the API SHALL reject the request with an HTTP 400 response and SHALL NOT write to the data file.

**Validates: Requirement 7.6**

---

### Property 21: GET /api/vehicles returns correctly filtered and paginated results

*For any* combination of filter parameters (`dealership`, `make`, `model`, `age`) and `page` number, the API SHALL return exactly the vehicles from the full dataset that match all provided filters, sliced to 25 records at the correct offset, with `total` equal to the count of all matching records regardless of pagination.

**Validates: Requirements 8.1, 8.7**

---

### Property 22: GET /api/vehicle-actions filters correctly by vehicleId

*For any* dataset of `VehicleAction` records spanning multiple vehicleIds and any specific `vehicleId` filter, `GET /api/vehicle-actions?vehicleId=X` SHALL return exactly the records where `vehicleId = X` and no others.

**Validates: Requirement 8.4**

---

### Property 23: POST /api/vehicle-actions returns 400 for each missing required field

*For any* request body that omits at least one of `vehicleId`, `userId`, or `action`, the API SHALL return HTTP 400 with a JSON body containing a `field` key equal to the name of one of the missing fields and a `message` key.

**Validates: Requirements 8.6, 10.5, 10.6**

---

### Property 24: Out-of-range page returns empty data with correct total

*For any* page number `p` such that `(p - 1) * 25 >= total`, the API SHALL return `{ data: [], total: <correct count>, page: p, pageSize: 25 }`.

**Validates: Requirement 8.8**

---

### Property 25: Missing translation key returns the key itself

*For any* translation key string that does not exist in the active locale file, calling `t(key)` SHALL return the key string unchanged rather than throwing or returning an empty string.

**Validates: Requirement 9.3**

---

### Property 26: Logger emits all required structured fields

*For any* completed API request, the Logger SHALL emit a log entry containing non-empty values for: `method`, `path`, `status`, `durationMs`, `correlationId`, `ip`, and `timestamp`.

**Validates: Requirement 11.2**

---

### Property 27: Logger IP extraction follows priority order

*For any* combination of `x-forwarded-for`, `x-real-ip`, and socket address header presence, `extractIp` SHALL return the first available value in priority order: `x-forwarded-for` first value → `x-real-ip` → `'unknown'`.

**Validates: Requirement 11.3**

---

### Property 28: Correlation ID is unique per request and present in response header

*For any* two distinct API requests handled concurrently or sequentially, each SHALL receive a different value in the `X-Request-ID` response header, and that value SHALL appear in the log entry emitted for that request.

**Validates: Requirements 11.4, 11.5**

---

### Property 29: Log level matches response status class

*For any* HTTP response status code `s`, the Logger SHALL emit the entry at `error` level when `s >= 400` and at `info` level when `s < 400`.

**Validates: Requirement 11.6**

---

### Property 30: Logger failure does not affect API response

*For any* API request where the Logger transport throws an error on `emit`, the API route SHALL still return the correct response with the correct status code and body.

**Validates: Requirement 11.10**

---

### Property 31: Service layer routes requests to API_BASE_URL

*For any* value set as `API_BASE_URL`, all outbound HTTP requests made by the service layer SHALL use that value as the URL base prefix.

**Validates: Requirements 12.2, 12.3**

---

### Property 32: Service layer throws typed ApiError on non-2xx response

*For any* non-2xx HTTP status code returned by the API, the service function SHALL throw an `ApiError` instance with `status` equal to the response status code and a non-empty `message`.

**Validates: Requirement 12.5**

---

### Property 33: CSV export contains all filtered vehicles with required columns

*For any* array of `VehicleWithComputed` records (including the empty array), `generateCsv` SHALL return a string whose first line is the header row containing all 12 required column names, and whose subsequent lines (one per vehicle) contain the corresponding values for each vehicle in the input array.

**Validates: Requirements 14.2, 14.3, 14.5**

---

### Property 34: CSV filename includes correct export date

*For any* date `d` passed to `downloadCsv`, the generated filename SHALL be `inventory-export-YYYY-MM-DD.csv` where `YYYY-MM-DD` is the ISO 8601 date representation of `d`.

**Validates: Requirement 14.4**


---

## Testing Strategy

### Test Framework Setup

| Concern | Library |
|---|---|
| Unit + Property tests | **Vitest** (via `vitest --run` for single-pass execution) |
| Property-based testing | **fast-check** |
| React component tests | **@testing-library/react** + Vitest |
| API route tests | Vitest + `msw` for service-layer mocks |

### Dual Testing Approach

**Unit / example-based tests** cover:
- Auth flows (login, logout, redirect behaviors) — examples 1.2, 1.3, 1.5, 1.7
- Empty / error state rendering — examples 2.4, 5.3, 5.6, 5.7, 6.1, 6.4, 6.5
- Single-instance API behaviors — 8.3, 8.9
- CSV empty export — 14.5
- Locale fallback — 9.4
- Logger dev/prod format — 11.7, 11.8
- Integration checks — middleware redirects, response headers

**Property-based tests** cover Properties 1–34 listed above. Each property test uses fast-check arbitraries to generate inputs and runs a minimum of **100 iterations**.

### Property Test Tag Convention

Each property test is tagged with a comment in the format:

```typescript
// Feature: intelligent-inventory-dashboard, Property N: <property_text>
test('aging threshold correctness', () => {
  // Feature: intelligent-inventory-dashboard, Property 1: For any integer d, isAging=true iff d>90
  fc.assert(fc.property(fc.integer(), (d) => {
    const result = computeAgingFields(buildVehicle({ daysOverride: d }));
    return d > 90 ? result.isAging === true : result.isAging === false;
  }), { numRuns: 100 });
});
```

### Key Property Test Designs

**Property 1 & 2 — Aging computation** (`agingUtils.test.ts`)
- Arbitraries: `fc.integer()` for days; `fc.date({ min: pastDate, max: today })` for dates
- Assertion: threshold and whole-day difference

**Property 7 — Sort** (`sortUtils.test.ts`)
- Arbitraries: `fc.array(fc.record({ make: fc.string(), ... }), { minLength: 1 })`
- Assertion: sorted array satisfies `a[i][col] <= a[i+1][col]` for all `i`

**Property 8 — Filter conjunction** (`filterUtils.test.ts`)
- Arbitraries: `fc.array(vehicleArbitrary)` + `fc.record({ dealership: fc.option(fc.string()), ... })`
- Assertion: every result record satisfies all non-empty filter criteria

**Property 16 — Action history order** (`VehicleActionPanel.test.tsx`)
- Arbitraries: `fc.array(fc.record({ createdAt: fc.date().map(d => d.toISOString()), ... }))`
- Assertion: rendered rows appear in non-increasing `createdAt` order

**Property 33 — CSV generation** (`csvExport.test.ts`)
- Arbitraries: `fc.array(vehicleWithComputedArbitrary)`
- Assertion: first line matches header, row count = input length, all values present

### Smoke / Architecture Tests

The following are verified by static analysis, grep checks, or single-execution tests rather than property tests:

- No `console.log` in `/src/app/api/**` — grep check in CI
- No direct `fetch` calls in `/src/views/**` or `/src/components/**` — grep check in CI
- No `API_BASE_URL` reference outside `/src/services/**` — grep check in CI
- `next-intl` `defaultLocale` is `'en'` — config inspection test
- `middleware.ts` matcher covers `/manager/:path*` — config inspection test
- Logger exports a swappable transport interface — TypeScript compile check

### Integration Tests

| Test | Coverage |
|---|---|
| Unauthenticated request to `/manager/inventory` → 302 to `/login` | Req 1.1, 10.3 |
| Authenticated request to `/login` → 302 to `/manager/inventory` | Req 1.7 |
| `GET /api/vehicles` response includes `Content-Security-Policy` header | Req 10.2 |
| `GET /api/vehicles` response includes `X-Request-ID` header | Req 11.4 |
| `GET /api/dealerships` returns all dealership records | Req 8.3 |
| `POST /api/vehicle-actions` with non-existent vehicleId returns 404 | Req 8.9 |
| Navigating to unknown route renders `not-found.tsx` with "Go to Inventory" link | Error pages |
| Server component throwing renders `manager/error.tsx` with "Try again" button | Error pages |

### Unit Test Balance

Property tests handle broad input-space coverage. Unit tests are kept minimal and focus on concrete scenarios (empty states, error states, specific interactions). Avoid duplicating what property tests already cover.

