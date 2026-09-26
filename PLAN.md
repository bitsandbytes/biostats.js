# Frontend Implementation Plan — biostats.js

A Svelte 5 + Vite app for tracking measurements per person over time.

**Users** log in and enter data. **People** are the subjects being tracked — they are not users and have no login. Measurements are a single flexible entity: a numeric value, a unit, and a type. Height and weight are just two examples of types.

The frontend defines the REST API contract. A separate Java/Spring Boot project implements it.

---

## Status

### Complete

All routes and components are implemented and working against a real backend (via Vite proxy) and against MSW mocks.

- Auth flow (login, logout, session restore via `GET /api/auth/me`)
- Dashboard — person cards with `latestByType`, inline quick-add measurement form
- PersonDetail — full measurement history, sortable table, D3 trend chart, delete person with confirmation
- Import — CSV parse, column mapper, preview, bulk POST
- Admin — user list, create user, delete user
- `GET /api/measurement-types` — returns measurement types with nested units (`{ id, label, units: [{ id, label, abbreviation }] }`)
- Measurement types + units are now full admin CRUD: `Admin.svelte` has a "Measurement Types" section (add/rename/delete type, add/edit/delete unit per type), backed by `POST|PUT|DELETE /api/measurement-types[/:id]` and `POST|PUT|DELETE /api/measurement-types/:id/units[/:unitId]`
- `MeasurementForm` now has a single `<select>` for unit, grouped by type via `<optgroup>`, displaying `"<label> (<abbreviation>)"`; picking a unit sets both the measurement's `type` (parent type's label) and `unit` (abbreviation) — there is no separate type field anymore
- Dev setup: Vite proxy to `https://localhost:8443` with `secure: false`; MSW activated by `VITE_API_BASE_URL=mock`
- Svelte 5 compatibility: all components use runes (`$props`, `$state`, `$derived`, `$effect`, `{@render}`), no Svelte 4 idioms remaining
- Favicon wired up (`public/` + `<link>` tags in `index.html`)
- `README.md` added (setup, commands, CSV import field requirements)
- Page title changed to "bioStats" (`index.html`)
- On the Import page (`src/routes/Import.svelte`), the `{#if error}` block now renders directly above the "Import X rows" `<Button>` at the bottom, so a failed import's error is immediately visible without scrolling up
- Import auto-creates unknown `MeasurementType`/`Unit` rows instead of rejecting or silently passing through free text — matching is case-insensitive (trim + lowercase compare) so `"Height"`/`"height"` resolve to one type. `POST /api/import` now returns `createdTypes`/`createdUnits` alongside `{ created, skipped, errors }`; `Import.svelte` displays them and refreshes the `measurementTypes` store when either is non-empty. Resolution logic lives in `src/mocks/importResolve.js` (unit-tested) and is called from the MSW `/api/import` handler; the real backend needs to implement the same rules — see `API_CONTRACT.md`
- **Import fixes — CSV column mapping / `measured_at` bug, and unit resolution matching by label** — code, unit tests, and manual end-to-end testing all done:
  1. **CSV column mapping / `measured_at` bug** (`src/lib/csv.js`, `src/routes/Import.svelte`, `src/lib/csv.test.js` — new):
     - `mapping` is now consistently keyed by canonical payload field (`name`/`type`/`value`/`unit`/`measured_at`) → chosen CSV header (was inconsistently inverted between the mapper UI and `applyMapping`).
     - New `guessMapping()` auto-maps headers case/whitespace/separator-insensitively with aliases, so a `date` header resolves to the `measured_at` field (previously the date `<select>` bound to a key the auto-mapper never wrote, so it looked unmapped).
     - `applyMapping()` now emits `measured_at`; it was emitting `date` (or nothing), so the backend rejected every row for a missing date.
     - Mapper table iterates `IMPORT_FIELDS` and binds `mapping[field.key]` directly (removed the tangled `onchange` spread).
     - Manually verified: a CSV with a `date`-named column auto-maps to `measured_at` and rows import with dates intact.
  2. **Import unit resolution matches by label too** (`src/mocks/importResolve.js`, `src/mocks/importResolve.test.js`, `src/mocks/handlers.js`, `API_CONTRACT.md`):
     - `resolveTypeAndUnit()` now matches a row's `unit` against an existing `Unit.abbreviation` **or** `Unit.label` (case-insensitive); an abbreviation hit wins if a label hit points at a different unit. So `"Pounds"` resolves to the seeded `lbs` unit instead of creating a duplicate.
     - MSW seed data: `Pounds` abbreviation `lb` → `lbs`, matching the `API_CONTRACT.md` canonical example.
     - `API_CONTRACT.md` import auto-creation step 2 rewritten to document the abbreviation-or-label rule; real Spring backend still needs the same change.
     - Manually verified: importing a CSV using `"Pounds"` as the unit resolves to the existing `lbs` unit, no duplicate created.
  - `npm test` (28 passing) and `npm run build` are green. README and this file updated.
- **Replaced `svelte-routing` with a hand-rolled Svelte 5-native router** (removes the Svelte 4 interop debt noted in the old Unresolved #2):
  - `src/lib/router.js` — pure `matchPath(pattern, path)` matcher (`:param` segments, trailing-slash-insensitive), unit-tested in `src/lib/router.test.js` (6 tests).
  - `src/stores/router.svelte.js` — `router.path` (`$state`) kept in sync with `popstate`; `navigate(to, { replace })` wraps `history.pushState`/`replaceState`. Guards all `window` access so the module still imports cleanly under vitest's `node` test environment.
  - `src/components/ui/Link.svelte` — replaces `svelte-routing`'s `Link`; renders a real `<a href>` (so ctrl/cmd/shift/middle-click still open a new tab) and calls `navigate()` on a plain left-click.
  - `App.svelte` — dropped the `<Router>`/`<Route>` wrapper (and the Svelte-4-only `let:params` slot prop) in favor of plain `{#if}`/`{:else if}` branches over `router.path`, matched with `matchPath('/person/:id', router.path)` for the one dynamic route.
  - `NavBar.svelte`, `PersonCard.svelte` now import `Link` from `src/components/ui/`; `PersonDetail.svelte` imports `navigate` from `src/stores/router.svelte.js`.
  - `svelte-routing` removed from `package.json` (`npm uninstall`).
  - `npm test` (34 passing) and `npm run build` are green. Verified via the Vite dev server (MSW mock mode) that `/`, `/import`, `/admin`, and `/person/:id` all return the app shell directly (confirms deep-link/hard-refresh still works, since this router still relies on Vite's dev-server SPA fallback, same as before). **Not verified by clicking through in an actual browser** — no `chromium-cli` or Playwright available in this environment; a manual click-through (person card → detail, navbar links, back/forward, hard refresh on `/import`) is still worth doing before/soon after merging.

- **Visual redesign + responsive layout** (mockups: "bioStats look & feel options" canvas on claude.ai — phone option A "Clinical Calm", desktop "Combined" boards):
  - Global look: `src/app.css` colour tokens (teal primary, coral for vital signs/destructive), Figtree font self-hosted via `@fontsource/figtree`, inline SVG icon set (`src/components/ui/Icon.svelte`). Fixes the Times New Roman default and the phone horizontal-scroll bug (old one-row navbar was wider than the screen).
  - Navigation: `NavBar.svelte` removed. `AppShell` + new `Sidebar.svelte` — persistent dark sidebar at ≥1024px (`src/stores/viewport.svelte.js`), top bar + hamburger slide-out drawer on phones (closes on navigate / Escape / backdrop).
  - Dashboard: desktop quick-add bar (Person/Unit/Value/Date, Enter saves, keeps person/unit/date for the next reading), column toggle chips, `PeopleTable` with latest value + sparkline per type, sortable Person/Last entry, name filter (`Ctrl/Cmd+K`), row "+ Add" pre-fills the bar. Phone: redesigned `PersonCard`s (avatar, per-type icon tiles, inline add).
  - PersonDetail: breadcrumb + person switcher, 1M/3M/6M/1Y/All ranges, CSV export (re-importable), delete-person icon button, rewritten `TrendChart` (true dual y-axes, right-axis dashed, hover crosshair/tooltip, responsive width), series tiles with sparklines that toggle chart lines (max two units), side panel with form + recent, history table capped at 10 rows with "Show all". Fixed a pre-existing bug where the history table's default "Date ↓" sort was actually ascending.
  - Login/Admin/Import/Modal restyled onto tokens; `Modal` is now an accessible dialog (Escape closes, fits phones) — clears the old a11y build warnings.
  - **API contract change:** `GET /api/people` `PersonSummary` gains `recentByType` (12 most recent per type, oldest first) for the sparklines — see `API_CONTRACT.md`. Implemented in the MSW mock via shared `src/lib/summary.js`; frontend tolerates its absence.
  - MSW mock mode now seeds four demo people with ~8 months of readings (`src/mocks/seed.js`).
  - New tested helpers: `summary.js`, `chartSeries.js`, `sparkline.js`, `display.js`, `measurementsToCsv` in `csv.js`. `npm test` (76 passing) and `npm run build` (no warnings) are green. Verified in headless Chrome at 1440×900 and 390×844 in mock mode: login, dashboard, row pre-fill, person page, chart tooltip, phone drawer; no horizontal overflow at phone width, no console errors beyond the expected pre-login 401.

### In Progress

Nothing in progress. The router replacement and the redesign are both **uncommitted** in the working tree.

### Next Step to Pick Up From

1. Click through the redesign by hand in a real browser (both widths), including adding/deleting measurements and the Import/Admin pages, then commit — ideally the router change and the redesign as separate commits.
2. **Backend:** implement `recentByType` on `GET /api/people` in the Spring Boot project (same rules as `summarizeMeasurements`, `RECENT_LIMIT = 12`). Until then the real backend shows the Dashboard without trend lines.
3. Mockup features deliberately left out of this pass (pick up if wanted): chart zoom/pan + range brush, PNG export, drag-and-drop CSV onto the person page, "compare selected people", keyboard shortcuts beyond Ctrl+K (↑/↓ switch person, N new measurement), and a phone-specific sticky "Add measurement" button.

---

## Unresolved / Needs Decision

**1. Import response has no per-row detail:**

`{ created, skipped, errors }` (now also `createdTypes`/`createdUnits`) reports counts/summaries only — if a row fails validation, nothing tells the user which row or why. May need a richer response shape (e.g. per-row error messages) if this becomes a problem in practice.

**2. `AutocompleteInput` is now unused:**

`MeasurementForm` was the only consumer of `AutocompleteInput.svelte`. It's still in `src/components/ui/`. Either remove it or keep it if free-text type entry will be needed elsewhere (e.g. Import column mapper).

**3. Containerize the frontend for testing and eventual production:**

The backend already builds to a Docker image; the frontend does not yet. Plan:
- Add a multi-stage `Dockerfile` — build stage (`node`, `npm ci && npm run build`) producing `dist/`, then a slim static-serving stage (nginx or similar) that copies `dist/` in.
- Decide same-origin vs. split-origin serving before writing the nginx config: if `/api/*` is proxied to the Spring Boot container from the same nginx (path-based routing), cookie/CORS behavior matches today's Vite-proxy dev setup and needs no `credentials`/`SameSite` changes. If frontend and backend are exposed on different origins, CORS + `SameSite=None; Secure` cookie config becomes required on the backend.
- Add a `docker-compose.yml` (frontend + backend containers) for local integration testing — this is the first milestone, ahead of any production hosting decision.
- Confirm `VITE_API_BASE_URL` build-time behavior inside the container (baked in at build time vs. runtime env substitution — Vite env vars are compile-time, so a runtime-configurable API base URL needs an entrypoint script that writes a small config file/`window.__ENV__` before nginx starts).
- Production hosting choice (split static/CDN vs. bundled container) is a later decision — see CLAUDE.md discussion; not blocking the containerization work itself.

---

## Data Model

```
User
  id          uuid
  email       string (unique)
  created_at  timestamp

Person
  id          uuid
  name        string
  notes       string (optional)
  created_at  timestamp

Measurement
  id          uuid
  person_id   → Person.id
  type        string   free text, copied from MeasurementType.label at entry time
  value       number
  unit        string   free text, copied from Unit.abbreviation at entry time
  measured_at date
  created_at  timestamp

MeasurementType           ← database-defined, admin-managed
  id          uuid
  label       string (unique)
  units       Unit[]

Unit                      ← belongs to exactly one MeasurementType
  id            uuid
  label         string     e.g. "Centimeters"
  abbreviation  string     e.g. "cm" (unique within its parent type)
```

---

## REST API Contract

See `API_CONTRACT.md` for the full contract. Summary:

### Auth
| Method | Path | Response |
|---|---|---|
| `POST` | `/api/auth/login` | `{ token, user }` |
| `POST` | `/api/auth/logout` | `204` |
| `GET` | `/api/auth/me` | `{ id, email }` |

### Users
| Method | Path | Response |
|---|---|---|
| `GET` | `/api/users` | `User[]` |
| `POST` | `/api/users` | `User` |
| `DELETE` | `/api/users/:id` | `204` |

### People
| Method | Path | Response |
|---|---|---|
| `GET` | `/api/people` | `PersonSummary[]` (with `latestByType` + `recentByType`) |
| `POST` | `/api/people` | `Person` |
| `GET` | `/api/people/:id` | `PersonDetail` |
| `DELETE` | `/api/people/:id` | `204` (cascades measurements) |

### Measurements
| Method | Path | Response |
|---|---|---|
| `POST` | `/api/people/:id/measurements` | `Measurement` |
| `DELETE` | `/api/people/:id/measurements/:entryId` | `204` |

### Measurement Types
| Method | Path | Response |
|---|---|---|
| `GET` | `/api/measurement-types` | `MeasurementType[]` — nested units, database-managed |
| `POST` | `/api/measurement-types` | `MeasurementType` (admin) |
| `PUT` | `/api/measurement-types/:id` | `MeasurementType` (admin) |
| `DELETE` | `/api/measurement-types/:id` | `204` (admin, cascades units) |
| `POST` | `/api/measurement-types/:id/units` | `Unit` (admin) |
| `PUT` | `/api/measurement-types/:id/units/:unitId` | `Unit` (admin) |
| `DELETE` | `/api/measurement-types/:id/units/:unitId` | `204` (admin) |

### Import
| Method | Path | Response |
|---|---|---|
| `POST` | `/api/import` | `{ created, skipped, errors, createdTypes, createdUnits }` — auto-creates unknown types/units (case-insensitive match) |

---

## Dev Setup

```bash
npm run dev    # Vite dev server — proxies /api/* to https://localhost:8443
npm run build
npm run preview
```

**`.env.local` options:**
- `VITE_API_BASE_URL=` (empty) — routes API calls through the Vite proxy to `https://localhost:8443`
- `VITE_API_BASE_URL=mock` — activates MSW; all `/api/*` calls are intercepted in the browser

The Vite proxy uses `secure: false` so the backend's self-signed cert is accepted. The browser never makes a direct TLS connection to the backend in dev.

---

## Folder Structure

```
src/
├── main.js
├── app.css                        # design tokens, Figtree font, base styles
├── App.svelte                     # Router outlet + auth gate
│
├── routes/
│   ├── Login.svelte
│   ├── Dashboard.svelte
│   ├── PersonDetail.svelte
│   ├── Import.svelte
│   └── Admin.svelte
│
├── components/
│   ├── layout/
│   │   ├── AppShell.svelte             # sidebar (desktop) / top bar + drawer (phone)
│   │   └── Sidebar.svelte              # nav links + account; used by both
│   ├── people/
│   │   ├── PeopleTable.svelte          # desktop dashboard table with sparklines
│   │   ├── PersonCard.svelte           # phone dashboard card
│   │   ├── AddPersonModal.svelte
│   │   └── DeletePersonModal.svelte
│   ├── measurements/
│   │   ├── MeasurementForm.svelte      # type <select> + value + unit <select> + date
│   │   └── MeasurementTable.svelte     # sortable, delete per row
│   ├── charts/
│   │   ├── TrendChart.svelte           # D3 dual-axis lines, hover tooltip
│   │   └── Sparkline.svelte            # tiny inline trend line
│   └── ui/
│       ├── Icon.svelte                 # inline SVG icon set
│       ├── Modal.svelte
│       ├── AutocompleteInput.svelte    # unused — kept or remove (see Unresolved #2)
│       ├── Link.svelte                 # in-app navigation <a>, replaces svelte-routing's Link
│       ├── Button.svelte
│       └── EmptyState.svelte
│
├── stores/
│   ├── auth.svelte.js             # Current user session
│   ├── people.svelte.js           # PersonSummary[] for Dashboard
│   ├── measurementTypes.svelte.js # TypeSuggestion[] for dropdowns
│   ├── router.svelte.js           # router.path ($state) + navigate(), synced with popstate
│   └── viewport.svelte.js         # `desktop` MediaQuery (≥1024px)
│
├── lib/
│   ├── api.js
│   ├── csv.js                    # PapaParse wrapper + guessMapping / applyMapping (unit-tested)
│   ├── format.js
│   ├── router.js                 # pure matchPath(pattern, path) route matcher (unit-tested)
│   ├── summary.js                # latestByType / recentByType (unit-tested)
│   ├── chartSeries.js            # chart series, toggling, axes, colours, ranges (unit-tested)
│   ├── sparkline.js              # sparkline polyline points (unit-tested)
│   └── display.js                # initials, avatar tones, type icons (unit-tested)
│
└── mocks/
    ├── browser.js
    ├── handlers.js                # MSW — predefined measurementTypes seed data
    ├── seed.js                    # demo people + ~8 months of measurements
    └── importResolve.js           # case-insensitive type/unit lookup (unit matches abbreviation or label) + auto-create, used by the /api/import handler
```

---

## Known Technical Debt

- Import and Admin pages were only re-coloured, not re-laid-out for phones; their wide tables scroll horizontally inside their cards.