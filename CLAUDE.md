# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (Vite HMR)
npm run build    # Production build
npm run preview  # Preview production build
```

## Environment

`VITE_API_BASE_URL` in `.env.local` sets the backend origin (e.g. `http://localhost:8080`). Set it to empty string (`VITE_API_BASE_URL=`) to use MSW mock handlers instead.

## Architecture

Svelte 5 + Vite SPA. `index.html` → `src/main.js` → `src/App.svelte`. Routing via `svelte-routing`. No UI component library; no backend SDK.

**App.svelte** is the auth gate and router outlet. It calls `initSession()` on mount (hits `GET /api/auth/me`) and renders either `<Login>` or the `<AppShell>` + routes.

### Stores (`src/stores/*.svelte.js`)

Svelte 5 runes-based state, exported from `.svelte.js` modules:

- **`auth.svelte.js`** — `auth.session` (`null | { id, email }`). Mutated by `initSession()`, `login()`, `logout()`.
- **`people.svelte.js`** — `PersonSummary[]` for the Dashboard. `addMeasurement()` updates `latestByType` in place without a re-fetch.
- **`measurementTypes.svelte.js`** — `TypeSuggestion[]` used for autocomplete. `suggestUnits(typeName)` returns known units for a type.

Per-person measurement history is **not** in global state — it is fetched on demand and held in local component state inside `PersonDetail.svelte`.

### API (`src/lib/api.js`)

Single `request(method, path, body)` helper. All calls use `credentials: 'include'` (session cookie). Throws the parsed JSON body on non-OK responses. This file is the source of truth for the REST contract; the Java/Spring Boot backend implements it.

### Routes

| Path | Component | Purpose |
|---|---|---|
| `/` | `Dashboard.svelte` | `PersonCard` grid; inline quick-add form per card |
| `/person/:id` | `PersonDetail.svelte` | Full measurement history, `TrendChart`, delete person |
| `/import` | `Import.svelte` | CSV bulk import with column mapper |
| `/admin` | `Admin.svelte` | User management (create/delete) |

### Key components

- **`MeasurementForm`** — used in both Dashboard (inline) and PersonDetail. Type and unit fields are `AutocompleteInput` drawing from the `measurementTypes` store; unit suggestions update when type changes.
- **`TrendChart`** — D3 multi-line chart, time x-axis, one series per measurement type. Types with different units get separate y-axes (up to two); beyond two collapses to a normalized view.
- **`AutocompleteInput`** — free-text input with dropdown suggestions; used for both type and unit fields.

### Utilities (`src/lib/`)

- `api.js` — all fetch calls
- `csv.js` — PapaParse + column mapping for import
- `format.js` — number display and date formatting

## Local Development Without the Backend

MSW (`msw` devDependency) intercepts `/api/*` fetch calls in the browser. Define handlers in `src/mocks/handlers.js` mirroring the REST contract with in-memory state.

## Data Model

**Users** log in; **People** are subjects being tracked (no login). Measurements have a free-text `type` (e.g. `"height"`) and `unit` (e.g. `"cm"`). `latestByType` on `PersonSummary` is a map from type string to the most recent measurement value/unit/date for that type.
