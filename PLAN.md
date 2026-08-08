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

### In Progress

Nothing actively in progress.

### Next Step to Pick Up From

Pick from the Unresolved / Needs Decision items below — none are blocking, so ask the user which to prioritize (e.g. import validation policy, `svelte-routing` replacement, or containerization).

---

## Unresolved / Needs Decision

**1. Import response has no per-row detail:**

`{ created, skipped, errors }` (now also `createdTypes`/`createdUnits`) reports counts/summaries only — if a row fails validation, nothing tells the user which row or why. May need a richer response shape (e.g. per-row error messages) if this becomes a problem in practice.

**2. `svelte-routing` is a Svelte 4 library:**

We worked around the Svelte 4/5 interop issue (anchor node incompatibility) by switching from the `component={}` prop to the children pattern in `App.svelte`. The `let:params` slot-prop syntax on the PersonDetail route is also Svelte 4. This is stable but not idiomatic Svelte 5. Replacing `svelte-routing` with a Svelte 5-native router would eliminate the technical debt, but is not urgent.

**3. `AutocompleteInput` is now unused:**

`MeasurementForm` was the only consumer of `AutocompleteInput.svelte`. It's still in `src/components/ui/`. Either remove it or keep it if free-text type entry will be needed elsewhere (e.g. Import column mapper).

**4. Containerize the frontend for testing and eventual production:**

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
| `GET` | `/api/people` | `PersonSummary[]` |
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
│   │   ├── AppShell.svelte
│   │   └── NavBar.svelte
│   ├── people/
│   │   ├── PersonCard.svelte
│   │   ├── AddPersonModal.svelte
│   │   └── DeletePersonModal.svelte
│   ├── measurements/
│   │   ├── MeasurementForm.svelte      # type <select> + value + unit <select> + date
│   │   └── MeasurementTable.svelte     # sortable, delete per row
│   ├── charts/
│   │   └── TrendChart.svelte           # D3 multi-line, time x-axis
│   └── ui/
│       ├── Modal.svelte
│       ├── AutocompleteInput.svelte    # unused — kept or remove (see Unresolved #4)
│       ├── Button.svelte
│       └── EmptyState.svelte
│
├── stores/
│   ├── auth.svelte.js             # Current user session
│   ├── people.svelte.js           # PersonSummary[] for Dashboard
│   └── measurementTypes.svelte.js # TypeSuggestion[] for dropdowns
│
├── lib/
│   ├── api.js
│   ├── csv.js
│   └── format.js
│
└── mocks/
    ├── browser.js
    ├── handlers.js                # MSW — predefined measurementTypes seed data
    └── importResolve.js           # case-insensitive type/unit lookup + auto-create, used by the /api/import handler
```

---

## Known Technical Debt

- `svelte-routing` is Svelte 4; worked around but not replaced (see Unresolved #2)
- `let:params` on the PersonDetail `<Route>` is Svelte 4 slot-prop syntax, required by svelte-routing
- `TrendChart` uses a single y-axis; CLAUDE.md specifies dual y-axes for different units and a normalized fallback for >2 — not yet implemented