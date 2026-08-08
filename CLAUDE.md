# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## API Change Workflow

When changing anything under `src/`:
1. Write/update tests first, before touching implementation
2. Implement the change
3. Add docstrings/comments — enough for someone new to understand each file and any non-trivial function
4. Run the test suite and confirm it passes before saying you're done
5. Update README.md if endpoints or behavior changed
6. Update PLAN.md to reflect scope completed/remaining

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
- **`measurementTypes.svelte.js`** — `store.types`: `MeasurementType[]` (`{ id, label, units: [{ id, label, abbreviation }] }`), admin-managed. Exposes CRUD helpers (`createType`, `renameType`, `removeType`, `addUnit`, `renameUnit`, `removeUnit`) that call the API and mutate the store in place.

Per-person measurement history is **not** in global state — it is fetched on demand and held in local component state inside `PersonDetail.svelte`.

### API (`src/lib/api.js`)

Single `request(method, path, body)` helper. All calls use `credentials: 'include'` (session cookie). Throws the parsed JSON body on non-OK responses. This file is the source of truth for the REST contract; the Java/Spring Boot backend implements it.

### Routes

| Path | Component | Purpose |
|---|---|---|
| `/` | `Dashboard.svelte` | `PersonCard` grid; inline quick-add form per card |
| `/person/:id` | `PersonDetail.svelte` | Full measurement history, `TrendChart`, delete person |
| `/import` | `Import.svelte` | CSV bulk import with column mapper |
| `/admin` | `Admin.svelte` | User management (create/delete); Measurement Types management (create/rename/delete type, create/edit/delete unit) |

### Key components

- **`MeasurementForm`** — used in both Dashboard (inline) and PersonDetail. Single `<select>` for unit, sourced from the `measurementTypes` store and grouped by type via `<optgroup>` (option text: `"<unit label> (<abbreviation>)"`). There is no separate type field — picking a unit sets the measurement's `type` to the parent type's label and `unit` to the chosen unit's abbreviation.
- **`TrendChart`** — D3 multi-line chart, time x-axis, one series per measurement type. Types with different units get separate y-axes (up to two); beyond two collapses to a normalized view.
- **`AutocompleteInput`** — unused free-text input with dropdown suggestions, kept in `src/components/ui/` in case free-text entry is needed elsewhere (e.g. Import column mapper).

### Utilities (`src/lib/`)

- `api.js` — all fetch calls
- `csv.js` — PapaParse + column mapping for import
- `format.js` — number display and date formatting

## Local Development Without the Backend

MSW (`msw` devDependency) intercepts `/api/*` fetch calls in the browser. Define handlers in `src/mocks/handlers.js` mirroring the REST contract with in-memory state.

## Data Model

**Users** log in; **People** are subjects being tracked (no login). Measurements have a free-text `type` (e.g. `"height"`) and `unit` (e.g. `"cm"`), copied at entry time from an admin-managed `MeasurementType.label` and `Unit.abbreviation`. `latestByType` on `PersonSummary` is a map from type string to the most recent measurement value/unit/date for that type.
