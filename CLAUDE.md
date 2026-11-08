# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## API Change Workflow

When changing anything under `src/`:
1. Write/update tests first, before touching implementation
2. Implement the change
3. Add docstrings/comments — enough for someone new to understand each file and any non-trivial function
4. Run the test suite and confirm it passes before saying you're done
5. Update README.md if endpoints or behavior changed, and the matching page in `docs/` (developer docs site)
6. Update PLAN.md to reflect scope completed/remaining

## Commands

```bash
npm run dev      # Start dev server (Vite HMR)
npm run build    # Production build
npm run preview  # Preview production build
npm test         # Unit tests (vitest)
npm run docs:dev   # Developer docs site (VitePress, docs/) — docs:build / docs:preview too
```

## Environment

`VITE_API_BASE_URL` in `.env.local` sets the backend origin (e.g. `http://localhost:8080`). Empty (`VITE_API_BASE_URL=`) routes `/api/*` through the Vite dev proxy; `VITE_API_BASE_URL=mock` activates the MSW mock handlers (seeded with demo people from `src/mocks/seed.js`).

## Architecture

Svelte 5 + Vite SPA. `index.html` → `src/main.js` → `src/App.svelte`. Routing is a small hand-rolled router (`src/lib/router.js` + `src/stores/router.svelte.js`), not a library — `App.svelte` matches `router.path` with `{#if}`/`{:else if}` branches. No UI component library; no backend SDK.

**App.svelte** is the auth gate and router outlet. It calls `initSession()` on mount (hits `GET /api/auth/me`) and renders either `<Login>` or the `<AppShell>` + routes.

**Responsive layout:** `src/stores/viewport.svelte.js` exports `desktop` (a Svelte `MediaQuery`, ≥1024px). `AppShell` renders `Sidebar` as a persistent left column on desktop, and on narrower screens a top bar whose hamburger opens the same `Sidebar` in a slide-out drawer. Pages that differ structurally by size (Dashboard) branch on `desktop.current`; otherwise use `@media (min-width: 1024px)` in component CSS.

**Styling:** global tokens (colours, radii) and base element styles live in `src/app.css` (imported by `main.js`); components use `var(--…)` tokens, not hard-coded colours. Font is Figtree via `@fontsource/figtree` (self-hosted). Icons are inline SVGs in `src/components/ui/Icon.svelte` — add new ones to its `PATHS` map.

### Stores (`src/stores/*.svelte.js`)

Svelte 5 runes-based state, exported from `.svelte.js` modules:

- **`auth.svelte.js`** — `auth.session` (`null | { id, email, admin }`). Mutated by `initSession()`, `login()`, `logout()`.
- **`people.svelte.js`** — `PersonSummary[]` for the Dashboard. `addMeasurement()` folds the new measurement into `latestByType` and `recentByType` in place (via `applyMeasurement` in `src/lib/summary.js`) without a re-fetch.
- **`viewport.svelte.js`** — `desktop` breakpoint (see Responsive layout above).
- **`measurementTypes.svelte.js`** — `store.types`: `MeasurementType[]` (`{ id, label, units: [{ id, label, abbreviation }] }`), admin-managed. Exposes CRUD helpers (`createType`, `renameType`, `removeType`, `addUnit`, `renameUnit`, `removeUnit`) that call the API and mutate the store in place.

Per-person measurement history is **not** in global state — it is fetched on demand and held in local component state inside `PersonDetail.svelte`.

### API (`src/lib/api.js`)

Single `request(method, path, body)` helper. All calls use `credentials: 'include'` (access + refresh token cookies). On non-OK responses it throws the parsed JSON body with `status` added (`{ status }` if the body isn't JSON). On a 401 (except from login/refresh/logout) it calls `POST /api/auth/refresh` once — single-flighted, because refresh tokens rotate and parallel refreshes look like token reuse to the server — then retries the request once. Only when the refresh is refused (or the retry 401s again) does it call the `onUnauthorized` handler (never for `/api/auth/me`, which `initSession()` handles), which `auth.svelte.js` uses to clear the session (back to `<Login>`). `onSessionRefreshed` passes each refresh's `user` to the auth store. Use `errorMessage(err, fallback)` for user-facing error text. This file is the source of truth for the REST contract; the Java/Spring Boot backend implements it.

### Routes

| Path | Component | Purpose |
|---|---|---|
| `/` | `Dashboard.svelte` | Desktop: quick-add bar + `PeopleTable` (latest value + sparkline per type, column toggles, sort, Ctrl+K filter). Phone: `PersonCard` list with inline add form |
| `/person/:id` | `PersonDetail.svelte` | Person switcher, time ranges, `TrendChart`, series tiles, CSV export, delete person, history; side panel with `MeasurementForm` + recent entries |
| `/import` | `Import.svelte` | CSV bulk import with column mapper; lists rejected rows with reasons from `rowErrors` |
| `/admin` | `Admin.svelte` | User management (create/delete); Measurement Types management (create/rename/delete type, create/edit/delete unit) |

### Key components

- **`MeasurementForm`** — used in the Dashboard quick-add bar (`people` prop adds a Person select; `layout="bar"`), phone cards, and the PersonDetail panel (`layout="stacked"`). Single `<select>` for unit, sourced from the `measurementTypes` store and grouped by type via `<optgroup>` (option text: `"<unit label> (<abbreviation>)"`). There is no separate type field — picking a unit sets the measurement's `type` to the parent type's label and `unit` to the chosen unit's abbreviation. Calls `onsubmit(data, { personId })`; after saving it clears only the value.
- **`PeopleTable`** / **`Sparkline`** — desktop Dashboard table; sparklines draw `recentByType` values.
- **`TrendChart`** — D3 multi-line chart, time x-axis, hover crosshair + tooltip. Draws the series it's given with per-series `styles` (`axis`, `color`, `dashed`) from `seriesStyles()`; at most two units, one per y-axis (right-axis lines dashed). Series selection/toggling (max two units — adding a third drops the oldest) lives in `src/lib/chartSeries.js`.

### Utilities (`src/lib/`)

- `api.js` — all fetch calls
- `csv.js` — PapaParse + column mapping for import (blank/non-numeric `value` → `null`); `measurementsToCsv()` for export (re-importable)
- `importReport.js` — `groupRowErrors()`: groups `POST /api/import`'s `rowErrors` per row with the row's original CSV text, for the Import page
- `format.js` — number display and date formatting
- `summary.js` — `summarizeMeasurements()` / `applyMeasurement()`: `latestByType` + `recentByType` (reference implementation of the `GET /api/people` summary; also used by the MSW mock)
- `chartSeries.js` — series grouping (type+unit), selection toggling, axis/colour assignment, time ranges
- `sparkline.js` — polyline points for sparklines
- `display.js` — initials, avatar tones, per-type icon/tone, `capitalize`

## Local Development Without the Backend

MSW (`msw` devDependency) intercepts `/api/*` fetch calls in the browser. Define handlers in `src/mocks/handlers.js` mirroring the REST contract with in-memory state. Auth uses `src/mocks/mockSession.js` (expiring access tokens, rotating refresh tokens with reuse detection, carried in cookies and persisted to `sessionStorage`); `window.mockAuth.expireAccessTokens()` / `.revokeAll()` exercise the refresh path from the console. Import rules that the backend must also implement live in their own tested modules: `importValidate.js` (per-row validation → `rowErrors`) and `importResolve.js` (case-insensitive type/unit lookup + auto-create).

## Data Model

**Users** log in; **People** are subjects being tracked (no login). Measurements have a free-text `type` (e.g. `"height"`) and `unit` (e.g. `"cm"`), copied at entry time from an admin-managed `MeasurementType.label` and `Unit.abbreviation`. `latestByType` on `PersonSummary` is a map from type string to the most recent measurement value/unit/date for that type.
