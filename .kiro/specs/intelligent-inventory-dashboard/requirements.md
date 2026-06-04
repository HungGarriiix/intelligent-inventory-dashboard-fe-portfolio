# Requirements Document

## Introduction

The Intelligent Inventory Dashboard is a web application for dealership managers to monitor, filter, and act on vehicle inventory across all dealerships in real time. The system surfaces aging stock automatically, provides a focused view of vehicles that have been in inventory for more than 90 days, and enables managers to log proposed actions against those vehicles with full audit tracking.

The application is built with Next.js (App Router) and TypeScript, backed by static JSON data files served through Next.js API routes. All UI strings are externalized for localization via next-intl.

---

## Glossary

- **Dashboard**: The Intelligent Inventory Dashboard application as a whole.
- **Manager**: An authenticated user with role `Manager` who has read and write access to all inventory data across all dealerships.
- **System**: The server-side logic responsible for computing derived vehicle state, including aging classification.
- **Inventory_List**: The paginated, filterable list of all vehicles across all dealerships, rendered at `/manager/inventory`.
- **Aging_Stock_View**: The focused view of vehicles where `isAging = true`, rendered at `/manager/aging-stock`.
- **Vehicle_Action_Panel**: The modal or side panel used to log or update a proposed action for an aging vehicle.
- **Vehicle**: A single vehicle record as defined by the Vehicle entity.
- **Dealership**: A dealership record as defined by the Dealership entity.
- **VehicleAction**: A logged action or proposed next step against a specific aging vehicle, as defined by the VehicleAction entity.
- **Aging_Stock**: Vehicles whose `dateAddedToInventory` is more than 90 days before the current date.
- **isAging**: A boolean field on Vehicle, computed by the System as `true` when days in inventory exceeds 90.
- **Days_In_Inventory**: The number of calendar days elapsed since `dateAddedToInventory`.
- **Filter_Bar**: The UI control set that allows a Manager to filter the Inventory_List by dealership, make, model, and age.
- **AgingBadge**: A visual indicator displayed inline on a Vehicle row when `isAging = true`.
- **ActionStatusBadge**: A visual indicator on the Aging_Stock_View showing the most recent action status for a Vehicle.
- **API**: The Next.js API routes serving vehicle, dealership, and vehicle-action data from static JSON files.
- **Middleware**: The Next.js `middleware.ts` that protects all `/manager` routes from unauthenticated access.
- **Service_Layer**: The `/src/services` abstraction that mediates all data fetching between the UI and the API, enabling backend swap without view changes.
- **Logger**: The `/src/lib/logger.ts` wrapper around the logging implementation, enabling output target swap without touching API routes.
- **Stats_Banner**: The summary bar at the top of the Inventory_List displaying aggregate counts (total vehicles, aging count, actioned count).
- **Correlation_ID**: A unique identifier generated per API request, returned in the `X-Request-ID` response header, used to correlate frontend calls with server-side logs.

---

## Requirements

### Requirement 1: User Authentication and Route Protection

**User Story:** As a Manager, I want protected access to the dashboard so that only authenticated users can view or modify inventory data.

#### Acceptance Criteria

1. WHEN an unauthenticated user navigates to any route under `/manager`, THE Middleware SHALL redirect the user to `/login`.
2. WHEN a Manager submits valid credentials on the login page, THE Dashboard SHALL authenticate the Manager and redirect to `/manager/inventory`.
3. IF a Manager submits invalid credentials, THEN THE Dashboard SHALL display an inline error message on the login page without redirecting.
4. WHILE a Manager is authenticated (within 8 hours since last authentication), THE Middleware SHALL allow access to all `/manager` routes without re-prompting for credentials.
5. WHEN a Manager logs out, THE Dashboard SHALL invalidate the session and redirect the Manager to `/login`.
6. WHEN a Manager's session has expired (older than 8 hours), THE Middleware SHALL invalidate the session and redirect the Manager to `/login`.
7. WHEN an authenticated Manager navigates to `/login`, THE Middleware SHALL redirect the Manager to `/manager/inventory`.

---

### Requirement 2: Inventory List Display

**User Story:** As a Manager, I want to see a paginated list of all vehicles across all dealerships so that I can get a complete picture of current stock.

#### Acceptance Criteria

1. WHEN a Manager navigates to `/manager/inventory`, THE Inventory_List SHALL display all vehicles from all dealerships in a paginated table.
2. THE Inventory_List SHALL display the following fields for each Vehicle: dealership name, make, model, year, trim, color, mileage, price, condition, status, and Days_In_Inventory (computed as the whole number of days between dateAddedToInventory and the current date).
3. THE Inventory_List SHALL display 25 vehicles per page by default, with previous/next navigation buttons and a current page indicator.
4. WHEN the total number of vehicles is zero, THE Inventory_List SHALL display an empty state message indicating no vehicles are available.
5. WHEN a Vehicle has `isAging = true`, THE Inventory_List SHALL display an AgingBadge inline on that Vehicle's row.
6. WHEN the Inventory_List is rendered, THE AgingBadge SHALL be visible for all rows where `isAging = true` without requiring any user interaction.
7. THE Inventory_List page SHALL display a Stats_Banner above the table showing: total vehicle count across all dealerships, count of aging vehicles (`isAging = true`), and count of aging vehicles that have at least one VehicleAction logged.
8. WHEN a Manager clicks a sortable column header, THE Inventory_List SHALL re-sort all matching records by that column in ascending order. WHEN the Manager clicks the same column header again, THE Inventory_List SHALL re-sort in descending order.
9. THE following columns SHALL be sortable: make, model, year, mileage, price, and Days_In_Inventory.

---

### Requirement 3: Inventory Filtering

**User Story:** As a Manager, I want to filter the vehicle list by dealership, make, model, and age so that I can quickly locate relevant stock.

#### Acceptance Criteria

1. THE Filter_Bar SHALL provide filter controls for: dealership, make, model, and age (aging vs. non-aging).
2. WHEN a Manager applies a dealership filter, THE Inventory_List SHALL display only vehicles belonging to the selected Dealership.
3. WHEN a Manager applies a make filter, THE Inventory_List SHALL display only vehicles matching the selected make.
4. WHEN a Manager applies a model filter, THE Inventory_List SHALL display only vehicles matching the selected model.
5. WHEN a Manager applies an age filter set to "Aging", THE Inventory_List SHALL display only vehicles where `isAging = true`. WHEN a Manager applies an age filter set to "Non-Aging", THE Inventory_List SHALL display only vehicles where `isAging = false`.
6. WHEN a Manager applies multiple filters simultaneously, THE Inventory_List SHALL display only vehicles matching all active filter criteria (where an active filter is one with a non-empty, non-default selection).
7. WHEN a Manager clears all filters or on initial page load, THE Inventory_List SHALL display all vehicles across all dealerships.
8. WHEN a Manager applies any filter, THE Inventory_List SHALL reset to page one of the filtered results.
9. WHEN active filters produce no matching vehicles, THE Inventory_List SHALL display an empty state message indicating no vehicles match the current filters.

---

### Requirement 4: Aging Stock Identification

**User Story:** As a Manager, I want the system to automatically flag vehicles that have been in inventory for more than 90 days so that I can identify slow-moving stock without manual calculation.

#### Acceptance Criteria

1. THE System SHALL compute `isAging` as `true` for any Vehicle where `Days_In_Inventory` is greater than 90.
2. THE System SHALL compute `isAging` as `false` for any Vehicle where `Days_In_Inventory` is 90 or fewer.
3. THE System SHALL compute `Days_In_Inventory` as the number of whole calendar days elapsed between `dateAddedToInventory` and the current date in UTC at the time of the API request.
4. WHEN the API serves any response containing Vehicle records, THE API SHALL include the computed `isAging` value and `Days_In_Inventory` for each Vehicle.
5. IF a Vehicle record is missing `dateAddedToInventory`, THEN THE System SHALL treat `isAging` as `false` and `Days_In_Inventory` as 0 for that Vehicle.

---

### Requirement 5: Aging Stock View

**User Story:** As a Manager, I want a dedicated view of all aging vehicles so that I can focus on stock that requires action without distractions from the full inventory.

#### Acceptance Criteria

1. WHEN a Manager navigates to `/manager/aging-stock`, THE Aging_Stock_View SHALL display only vehicles where `isAging = true`.
2. THE Aging_Stock_View SHALL display the following fields for each aging Vehicle: dealership name, make, model, year, trim, Days_In_Inventory, price, and the most recent VehicleAction status (if any).
3. WHEN an aging Vehicle has no logged VehicleAction, THE Aging_Stock_View SHALL display a "No Action Recorded" text label in place of the action status.
4. WHEN an aging Vehicle has at least one logged VehicleAction, THE Aging_Stock_View SHALL display the ActionStatusBadge with the `action` field value of the VehicleAction with the highest `createdAt` timestamp.
5. WHEN the Aging_Stock_View is first rendered, THE Aging_Stock_View SHALL display vehicles sorted by Days_In_Inventory in descending order.
6. WHEN the API call to load aging vehicles fails, THE Aging_Stock_View SHALL display an error message and a retry control.
7. WHEN no vehicles have `isAging = true`, THE Aging_Stock_View SHALL display an empty state message indicating no aging vehicles are currently in inventory.

---

### Requirement 6: Vehicle Action Logging

**User Story:** As a Manager, I want to log a proposed action for an aging vehicle so that the team knows what is being planned for slow-moving stock.

#### Acceptance Criteria

1. WHEN a Manager selects an aging Vehicle from the Aging_Stock_View, THE Vehicle_Action_Panel SHALL open for that Vehicle.
2. THE Vehicle_Action_Panel SHALL allow the Manager to enter an action label (e.g., "Price Reduction Planned", "Auction Scheduled") and optional free-text notes.
3. WHEN a Manager submits a new VehicleAction, THE API SHALL persist the VehicleAction with the `vehicleId`, `userId` of the authenticated Manager, `action`, `notes`, and a `createdAt` timestamp.
4. WHEN a VehicleAction is successfully saved, THE Vehicle_Action_Panel SHALL close and THE Aging_Stock_View SHALL reflect the updated ActionStatusBadge for the Vehicle without a full page reload.
5. IF the VehicleAction submission fails, THEN THE Vehicle_Action_Panel SHALL display an inline error message and remain open so the Manager can retry.
6. THE Vehicle_Action_Panel SHALL display the history of all previously logged VehicleActions for the selected Vehicle, ordered by `createdAt` descending.
7. IF a Manager attempts to submit a VehicleAction with an empty action label, THEN THE Vehicle_Action_Panel SHALL display a validation error and SHALL NOT submit the request.

---

### Requirement 7: Vehicle Action Update

**User Story:** As a Manager, I want to update the action on an aging vehicle so that the team always has the most current plan on record.

#### Acceptance Criteria

1. WHEN a Manager opens the Vehicle_Action_Panel for a Vehicle that already has a VehicleAction, THE Vehicle_Action_Panel SHALL pre-populate the action label and notes fields with the `action` and `notes` values of the VehicleAction with the highest `createdAt` timestamp.
2. WHEN a Manager submits an updated VehicleAction, THE API SHALL persist a new VehicleAction record with a `createdAt` timestamp, preserving all prior VehicleAction records in history.
3. THE Vehicle_Action_Panel SHALL display the `createdAt` timestamp and the author's full name for each VehicleAction in the action history, ordered by `createdAt` descending.
4. IF a Manager attempts to submit an updated VehicleAction with an empty action label, THEN THE Vehicle_Action_Panel SHALL display a validation error and SHALL NOT submit the request.
5. IF the VehicleAction update submission fails, THEN THE Vehicle_Action_Panel SHALL display an inline error message and remain open so the Manager can retry.
6. THE action label field SHALL accept a maximum of 500 characters. THE notes field SHALL accept a maximum of 2000 characters.

---

### Requirement 8: API Data Layer

**User Story:** As a developer, I want well-defined API routes backed by static JSON files so that the frontend can fetch and mutate inventory data consistently.

#### Acceptance Criteria

1. THE API SHALL expose a `GET /api/vehicles` endpoint that returns a paginated list of Vehicle records, supporting query parameters for `dealership`, `make`, `model`, `age` (minimum days in inventory), and `page`.
2. THE API SHALL expose a `GET /api/vehicles/aging` endpoint that returns all Vehicle records where `isAging = true`.
3. THE API SHALL expose a `GET /api/dealerships` endpoint that returns all Dealership records.
4. THE API SHALL expose a `GET /api/vehicle-actions` endpoint that returns VehicleAction records, filterable by `vehicleId`.
5. THE API SHALL expose a `POST /api/vehicle-actions` endpoint that accepts and persists a new VehicleAction record, returning HTTP 201 with the created record on success.
6. WHEN a `POST /api/vehicle-actions` request body is missing any of the required fields (`vehicleId`, `userId`, `action`), THEN THE API SHALL return an HTTP 400 response with a JSON body containing a `field` key identifying the missing field and a `message` key with a human-readable description.
7. WHEN a `GET /api/vehicles` request includes a `page` query parameter, THE API SHALL return 25 records for the requested page and include a `total` count of all matching records in the response.
8. WHEN a `GET /api/vehicles` request includes an out-of-range `page` value, THE API SHALL return an empty `data` array with the correct `total` count.
9. WHEN a `POST /api/vehicle-actions` request references a `vehicleId` that does not exist in the vehicles data file, THEN THE API SHALL return an HTTP 404 response.

---

### Requirement 9: Localization

**User Story:** As a developer, I want all UI strings externalized into translation files so that the Dashboard can support additional languages in the future with minimal code changes.

#### Acceptance Criteria

1. THE Dashboard SHALL render all user-visible UI strings (labels, headings, button text, column headers, and error messages) using next-intl translation keys resolved from `/messages/en.json`. API data values are excluded from this requirement.
2. THE Dashboard SHALL default to English (`en`) as the active locale, as configured in the next-intl configuration file.
3. WHERE a translation key is missing from the active locale file, THE Dashboard SHALL display the translation key string as a fallback.
4. IF the locale file fails to load, THE Dashboard SHALL fall back to English and SHALL NOT render a blank or crashed page.

---

### Requirement 10: Security

**User Story:** As a system operator, I want the application to enforce security controls so that inventory data and user sessions are protected from unauthorized access.

#### Acceptance Criteria

1. THE Dashboard SHALL enforce HTTPS for all traffic via the Nginx reverse proxy configuration.
2. THE Dashboard SHALL include the following HTTP security headers on all responses: `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, and `Referrer-Policy`.
3. WHEN an unauthenticated request is made to any route under `/manager`, THE Middleware SHALL redirect the request to `/login` with a 3xx HTTP response.
4. THE Dashboard SHALL store the following sensitive values exclusively in `.env.local`: session secret, any API keys, and credentials. `.env.local` SHALL be listed in `.gitignore`.
5. WHEN a `POST` API route receives a request, THE API SHALL validate the request body before writing to any data file; invalid requests SHALL be rejected with an error response and no write SHALL occur.
6. IF a `POST` API route receives a request with an invalid body, THEN THE API SHALL return an HTTP 400 response with a JSON error body and SHALL NOT modify any data file.

---

### Requirement 11: Observability

**User Story:** As a developer, I want structured logging, request tracing, and performance metrics on all API routes so that I can diagnose issues, trace requests back to their origin IP, and monitor system health in both local and production environments.

#### Acceptance Criteria

1. THE Dashboard SHALL include a Logger module at `/src/lib/logger.ts` that wraps the logging output target; all API routes SHALL use the Logger module exclusively and SHALL NOT call `console.log` directly.
2. WHEN any API route handles a request, THE Logger SHALL emit a structured log entry containing: HTTP method, request path, response status code, request duration in milliseconds, Correlation ID, and the client IP address.
3. THE Logger SHALL extract the client IP address in the following priority order: `x-forwarded-for` request header (first value if comma-separated), then `x-real-ip` header, then the socket remote address. IF none are available, THE Logger SHALL record the IP as `unknown`.
4. WHEN any API route handles a request, THE System SHALL generate a unique Correlation_ID for that request and return it in the `X-Request-ID` response header.
5. THE Logger SHALL include the Correlation_ID in every log entry emitted for a given request.
6. WHEN an API route returns a 4xx or 5xx response, THE Logger SHALL emit the log entry at error severity; all other responses SHALL be logged at info severity.
7. WHEN `NODE_ENV` is set to `development`, THE Logger SHALL output pretty-printed, human-readable log lines to stdout in the format: `[LEVEL] HH:mm:ss METHOD PATH STATUS DURATIONms | ip=IP | reqId=ID`.
8. WHEN `NODE_ENV` is set to `production`, THE Logger SHALL output compact structured JSON to stdout.
9. THE Logger module SHALL expose a swappable output interface so that the logging target (console, external service) can be changed by updating the Logger module only, without modifying any API route.
10. IF the Logger module fails to emit a log entry, THEN THE failure SHALL NOT affect the API route response — logging errors SHALL be silently suppressed.

---

### Requirement 12: Backend Abstraction and Swap Strategy

**User Story:** As a developer, I want all data fetching abstracted behind a service layer so that the static JSON backend can be replaced with a real backend (e.g., ASP.NET) without changing any view or component code.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a Service_Layer at `/src/services` with one service module per entity (vehicles, dealerships, vehicle-actions); all views and components SHALL fetch data exclusively through the Service_Layer and SHALL NOT call `fetch` directly.
2. THE Service_Layer SHALL read the `API_BASE_URL` environment variable to determine the base URL for all outbound API calls; IF `API_BASE_URL` is not set, THE Service_Layer SHALL default to `/api` (the internal Next.js routes).
3. WHEN `API_BASE_URL` is set to an external backend URL, THE Service_Layer SHALL route all requests to that URL without requiring changes to any view, component, or API route file.
4. EACH service module in the Service_Layer SHALL export typed functions matching the entity's API contract; the function signatures SHALL remain stable when the backend is swapped.
5. IF the Service_Layer receives a non-2xx response from the API, THEN it SHALL throw a typed error containing the HTTP status code and a message, which the calling view SHALL handle to display an appropriate error state.
6. THE Service_Layer SHALL be the only location where `API_BASE_URL` is read; no view, component, or page file SHALL reference `API_BASE_URL` directly.

---

### Requirement 13: Extensibility

**User Story:** As a developer, I want the application structure to be open for adding new features and screens without modifying existing common components, navigation, or filter infrastructure.

#### Acceptance Criteria

1. THE common components (Table, FilterBar, Badge, Modal, Pagination) SHALL accept all screen-specific configuration through props and SHALL NOT contain hard-coded references to any specific screen, route, or data entity.
2. THE Dashboard navigation SHALL be driven by a route configuration file at `/src/config/routes.ts`; adding a new screen SHALL require only adding a new entry to the route configuration, without modifying any navigation component.
3. THE Filter_Bar component SHALL accept a filter definition array as a prop; adding a new filter type to a screen SHALL require only passing a new filter definition, without modifying the Filter_Bar component itself.
4. WHEN a new screen is added under `/app/manager`, THE Middleware and manager layout SHALL automatically apply route protection and shared navigation to that screen without requiring changes to either file.
5. THE Stats_Banner component SHALL accept its metric definitions as props so that new summary statistics can be added to any screen without modifying the Stats_Banner component.
6. THE Service_Layer SHALL be structured so that adding a new entity service requires only creating a new service module file; no existing service module SHALL need to be modified.

---

### Requirement 14: Inventory Data Export

**User Story:** As a Manager, I want to export the currently filtered inventory list to a CSV file so that I can share or analyse the data outside the dashboard.

#### Acceptance Criteria

1. THE Inventory_List page SHALL display an "Export CSV" button that is always visible regardless of active filters.
2. WHEN a Manager clicks "Export CSV", THE Dashboard SHALL generate and download a CSV file containing all vehicle records matching the current active filters (not just the current page).
3. THE exported CSV SHALL include the following columns: dealership name, make, model, year, trim, color, mileage, price, condition, status, Days_In_Inventory, and isAging.
4. THE exported CSV file SHALL be named `inventory-export-{YYYY-MM-DD}.csv` where the date is the current date at the time of export.
5. IF the filtered result set is empty, THEN THE Dashboard SHALL still generate a valid CSV file containing only the header row.
6. WHEN a Manager clicks "Export CSV", THE Dashboard SHALL generate the file client-side without making an additional API request beyond what was already fetched for the current filtered view.

---

### Requirement 15: Vehicle Creation

**User Story:** As a Manager, I want to add a new vehicle to the inventory directly from the inventory screen so that newly acquired vehicles are immediately visible in the dashboard without editing data files.

#### Acceptance Criteria

1. THE Inventory_List page SHALL display an "Add Vehicle" button that is always visible.
2. WHEN a Manager clicks "Add Vehicle", THE Dashboard SHALL open a modal dialog with input fields for all required Vehicle properties.
3. THE Vehicle creation form SHALL include the following fields: dealership (required, dropdown of existing dealerships), make, model, year, VIN (exactly 17 characters), trim, color, mileage, price, condition (`New` / `Used` / `CPO`), status (default `Available`), and date added to inventory (default: today's date).
4. THE API SHALL expose a `POST /api/vehicles` endpoint that accepts a new Vehicle body, validates all required fields, persists the record to `vehicles.json`, and returns HTTP 201 with the created Vehicle (including computed `isAging` and `daysInInventory`).
5. WHEN a Vehicle is successfully created, THE dialog SHALL close and THE Inventory_List SHALL refresh to include the new Vehicle without a full page reload (via SWR cache invalidation).
6. IF the creation request fails, THE dialog SHALL display an inline error message and remain open so the Manager can retry.
7. WHEN a `POST /api/vehicles` request body contains any invalid or missing required field, THE API SHALL return HTTP 400 with a JSON body containing a `field` key identifying the invalid field and a `message` key with a human-readable description; no write SHALL occur.
8. WHEN a `POST /api/vehicles` request references a `dealershipId` that does not exist in the dealerships data file, THE API SHALL return HTTP 404.
