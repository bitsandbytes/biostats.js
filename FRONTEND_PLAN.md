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
- `GET /api/measurement-types` — returns predefined types+units from the database; `MeasurementForm` uses `<select>` dropdowns (type, then unit filtered to that type)
- Dev setup: Vite proxy to `https://localhost:8443` with `secure: false`; MSW activated by `VITE_API_BASE_URL=mock`
- Svelte 5 compatibility: all components use runes (`$props`, `$state`, `$derived`, `$effect`, `{@render}`), no Svelte 4 idioms remaining
- Favicon wired up (`public/` + `<link>` tags in `index.html`)

### In Progress

Nothing actively in progress.

### Next Step to Pick Up From

**Manage measurement types in the Admin UI.** Types are now database-defined but there is no frontend interface to create, edit, or delete them. The natural next step is to add a "Measurement Types" section to `Admin.svelte` with:
- A list of existing types and their units
- A form to add a new type (name + initial units)
- Ability to add/remove units on an existing type
- Delete a type

This requires two new API endpoints (see "Unresolved / Needs Decision" below).

---

## Unresolved / Needs Decision

**1. Measurement types CRUD API — backend needs to implement:**

The frontend now treats `GET /api/measurement-types` as returning predefined database rows, not data derived from measurements. The backend needs:
- A `measurement_types` table (or equivalent) with `type` string and `units` string[]
- `POST /api/measurement-types` — create a type with initial units
- `PUT /api/measurement-types/:type` — update units for a type (or use finer-grained add/remove unit endpoints)
- `DELETE /api/measurement-types/:type` — remove a type

These endpoints are not yet in `API_CONTRACT.md`. Before implementing the Admin UI section, define and add them there first.

**2. Free-text measurements via Import — type/unit validation:**

`POST /api/import` rows contain free-text `type` and `unit` strings. Now that types are predefined, the backend needs a policy: reject rows whose type/unit combination isn't in the `measurement_types` table, or silently accept them? The frontend import UI doesn't validate this yet either.

**3. `svelte-routing` is a Svelte 4 library:**

We worked around the Svelte 4/5 interop issue (anchor node incompatibility) by switching from the `component={}` prop to the children pattern in `App.svelte`. The `let:params` slot-prop syntax on the PersonDetail route is also Svelte 4. This is stable but not idiomatic Svelte 5. Replacing `svelte-routing` with a Svelte 5-native router would eliminate the technical debt, but is not urgent.

**4. `AutocompleteInput` is now unused:**

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
  type        string   (references a MeasurementType)
  value       number
  unit        string   (one of the units defined for that type)
  measured_at date
  created_at  timestamp

MeasurementType           ← new, database-defined
  type        string (unique)
  units       string[]
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
| `GET` | `/api/measurement-types` | `TypeSuggestion[]` — predefined, database-managed |
| *(pending)* `POST` | `/api/measurement-types` | `TypeSuggestion` |
| *(pending)* `PUT` | `/api/measurement-types/:type` | `TypeSuggestion` |
| *(pending)* `DELETE` | `/api/measurement-types/:type` | `204` |

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

- `svelte-routing` is Svelte 4; worked around but not replaced (see Unresolved #3)
- `let:params` on the PersonDetail `<Route>` is Svelte 4 slot-prop syntax, required by svelte-routing
- `TrendChart` uses a single y-axis; CLAUDE.md specifies dual y-axes for different units and a normalized fallback for >2 — not yet implemented