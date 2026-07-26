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

### In Progress

Nothing actively in progress.

### Next Step to Pick Up From

Nothing queued. Pick from "Unresolved / Needs Decision" below or `Known Technical Debt`.

---

## Unresolved / Needs Decision

**1. Free-text measurements via Import — type/unit validation:**

`POST /api/import` rows contain free-text `type` and `unit` strings. Now that types are predefined, the backend needs a policy: reject rows whose type/unit combination isn't in the `measurement_types` table, or silently accept them? The frontend import UI doesn't validate this yet either.

**2. `svelte-routing` is a Svelte 4 library:**

We worked around the Svelte 4/5 interop issue (anchor node incompatibility) by switching from the `component={}` prop to the children pattern in `App.svelte`. The `let:params` slot-prop syntax on the PersonDetail route is also Svelte 4. This is stable but not idiomatic Svelte 5. Replacing `svelte-routing` with a Svelte 5-native router would eliminate the technical debt, but is not urgent.

**3. `AutocompleteInput` is now unused:**

`MeasurementForm` was the only consumer of `AutocompleteInput.svelte`. It's still in `src/components/ui/`. Either remove it or keep it if free-text type entry will be needed elsewhere (e.g. Import column mapper).

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
| `POST` | `/api/import` | `{ created, skipped, errors }` |

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
    └── handlers.js                # MSW — predefined measurementTypes seed data
```

---

## Known Technical Debt

- `svelte-routing` is Svelte 4; worked around but not replaced (see Unresolved #2)
- `let:params` on the PersonDetail `<Route>` is Svelte 4 slot-prop syntax, required by svelte-routing
- `TrendChart` uses a single y-axis; CLAUDE.md specifies dual y-axes for different units and a normalized fallback for >2 — not yet implemented