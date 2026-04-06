# Frontend Implementation Plan — biostats.js

A Svelte 5 + Vite app for tracking measurements per person over time.

**Users** log in and enter data. **People** are the subjects being tracked — they are not users and have no login. Measurements are a single flexible entity: a numeric value, a user-defined unit, and a user-defined type. Height and weight are just two examples of types.

The frontend defines the REST API contract. A separate Java/Spring Boot project implements it.

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
  type        string   (e.g. "height", "weight", "bmi" — user-defined, free text)
  value       number
  unit        string   (e.g. "cm", "in", "kg", "lb" — user-defined, free text)
  measured_at date
  created_at  timestamp
```

"Latest measurement of type X" = the Measurement row with the most recent `measured_at` for a given person and type. Different types may have their most recent entry on different dates.

---

## REST API Contract

The frontend is the source of truth for this contract. The Spring Boot backend implements it.

All endpoints require a valid session cookie or `Authorization: Bearer <token>` header except the auth endpoints.

### Auth
| Method | Path | Body | Response |
|---|---|---|---|
| `POST` | `/api/auth/login` | `{ email, password }` | `{ token, user }` |
| `POST` | `/api/auth/logout` | — | `204` |
| `GET` | `/api/auth/me` | — | `{ id, email }` |

### Users (admin operations)
| Method | Path | Body | Response |
|---|---|---|---|
| `GET` | `/api/users` | — | `User[]` |
| `POST` | `/api/users` | `{ email, password }` | `User` |
| `DELETE` | `/api/users/:id` | — | `204` |

### People
| Method | Path | Body | Response |
|---|---|---|---|
| `GET` | `/api/people` | — | `PersonSummary[]` (see below) |
| `POST` | `/api/people` | `{ name, notes? }` | `Person` |
| `GET` | `/api/people/:id` | — | `PersonDetail` (see below) |
| `DELETE` | `/api/people/:id` | — | `204` (cascades all measurements) |

**`PersonSummary`** (used on Dashboard — one card per person):
```json
{
  "id": "...",
  "name": "Jane Smith",
  "latestByType": {
    "height": { "value": 165.2, "unit": "cm", "measured_at": "2024-11-03" },
    "weight": { "value": 62.1,  "unit": "kg", "measured_at": "2025-01-10" }
  }
}
```
`latestByType` is a map of every type that has at least one measurement; keys are the type strings. Empty map if no measurements yet.

**`PersonDetail`** (used on PersonDetail page):
```json
{
  "id": "...",
  "name": "Jane Smith",
  "notes": "...",
  "measurements": [
    { "id": "...", "type": "height", "value": 165.2, "unit": "cm", "measured_at": "2024-11-03" },
    { "id": "...", "type": "weight", "value": 62.1,  "unit": "kg", "measured_at": "2025-01-10" }
  ]
}
```
Measurements returned sorted by `measured_at` descending.

### Measurements
| Method | Path | Body | Response |
|---|---|---|---|
| `POST` | `/api/people/:id/measurements` | `{ type, value, unit, measured_at }` | `Measurement` |
| `DELETE` | `/api/people/:id/measurements/:entryId` | — | `204` |

### Measurement Types (autocomplete support)
| Method | Path | Response |
|---|---|---|
| `GET` | `/api/measurement-types` | `TypeSuggestion[]` |

**`TypeSuggestion`**: known type+unit combinations derived from existing data — used to populate autocomplete dropdowns so users don't re-invent units.
```json
[
  { "type": "height", "units": ["cm", "in"] },
  { "type": "weight", "units": ["kg", "lb"] }
]
```

### Import
| Method | Path | Body | Response |
|---|---|---|---|
| `POST` | `/api/import` | `ImportPayload` (see below) | `{ created, skipped, errors }` |

**`ImportPayload`**:
```json
{
  "rows": [
    { "name": "Jane Smith", "type": "height", "value": 165.2, "unit": "cm", "measured_at": "2024-11-03" },
    { "name": "Jane Smith", "type": "weight", "value": 62.1,  "unit": "kg", "measured_at": "2025-01-10" }
  ]
}
```
Backend upserts persons by name and inserts measurement rows.

---

## Folder Structure

```
src/
├── main.js
├── App.svelte                     # Router outlet + auth gate
│
├── routes/
│   ├── Login.svelte
│   ├── Dashboard.svelte           # PersonSummary cards for all people
│   ├── PersonDetail.svelte        # Full history + add entries + chart
│   ├── Import.svelte              # CSV bulk import
│   └── Admin.svelte               # User management (create / delete users)
│
├── components/
│   ├── layout/
│   │   ├── AppShell.svelte
│   │   └── NavBar.svelte
│   ├── people/
│   │   ├── PersonCard.svelte           # Name, latest value per type, quick-add
│   │   ├── AddPersonModal.svelte
│   │   └── DeletePersonModal.svelte
│   ├── measurements/
│   │   ├── MeasurementForm.svelte      # type (autocomplete) + value + unit (autocomplete) + date
│   │   └── MeasurementTable.svelte     # sortable, grouped by type, delete per row
│   ├── charts/
│   │   └── TrendChart.svelte           # One line per type, time on x-axis
│   └── ui/
│       ├── Modal.svelte
│       ├── AutocompleteInput.svelte    # Text input with dropdown suggestions
│       ├── Button.svelte
│       └── EmptyState.svelte
│
├── stores/
│   ├── auth.svelte.js             # Current user session
│   ├── people.svelte.js           # PersonSummary[] for Dashboard
│   └── measurementTypes.svelte.js # TypeSuggestion[] for autocomplete
│
└── lib/
    ├── api.js                     # All fetch calls — single source of truth
    ├── csv.js                     # PapaParse + column mapping for import
    └── format.js                  # Number display, date formatting
```

---

## Component Hierarchy

```
App.svelte
├── Login.svelte                        (no session)
└── AppShell.svelte                     (authenticated)
    ├── NavBar.svelte
    └── <Route>
         ├── Dashboard.svelte
         │   ├── PersonCard × N
         │   │   ├── latestByType display (one row per known type)
         │   │   └── inline MeasurementForm  (quick-add, expands in place)
         │   └── AddPersonModal
         │
         ├── PersonDetail.svelte
         │   ├── MeasurementForm
         │   ├── MeasurementTable        (all types, sorted by date)
         │   ├── TrendChart
         │   └── DeletePersonModal
         │
         ├── Import.svelte
         │   └── column mapper + preview table
         │
         └── Admin.svelte
             └── user list + AddUserForm + delete buttons
```

---

## Routing

```svelte
<!-- App.svelte -->
<Router>
  {#if $session}
    <AppShell>
      <Route path="/"            component={Dashboard} />
      <Route path="/person/:id"  component={PersonDetail} />
      <Route path="/import"      component={Import} />
      <Route path="/admin"       component={Admin} />
    </AppShell>
  {:else}
    <Login />
  {/if}
</Router>
```

---

## State Management

Svelte 5 runes exported from `.svelte.js` modules. All server communication goes through `src/lib/api.js`.

### `src/stores/auth.svelte.js`
```js
let session = $state(null);   // null | { id, email, token }
export function setSession(s) { session = s; }
export { session };
```
Initialized on app load via `GET /api/auth/me`.

### `src/stores/people.svelte.js`
```js
let people = $state([]);   // PersonSummary[]

export async function loadPeople()       { people = await api.getPeople(); }
export async function addPerson(data)    { const p = await api.createPerson(data); people.push(p); }
export async function removePerson(id)   { await api.deletePerson(id); people = people.filter(p => p.id !== id); }
export async function addMeasurement(personId, data) {
  const m = await api.addMeasurement(personId, data);
  // update latestByType on the relevant PersonSummary in place
  const person = people.find(p => p.id === personId);
  const existing = person.latestByType[data.type];
  if (!existing || data.measured_at >= existing.measured_at) {
    person.latestByType[data.type] = { value: m.value, unit: m.unit, measured_at: m.measured_at };
  }
}
export { people };
```

### `src/stores/measurementTypes.svelte.js`
```js
let types = $state([]);   // TypeSuggestion[]

export async function loadTypes() { types = await api.getMeasurementTypes(); }
export function suggestUnits(typeName) {
  return types.find(t => t.type === typeName)?.units ?? [];
}
export { types };
```

Per-person measurement history is fetched on demand in `PersonDetail.svelte` and held in local component state only.

### `src/lib/api.js`
```js
const BASE = import.meta.env.VITE_API_BASE_URL;

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw await res.json();
  return res.status === 204 ? null : res.json();
}

export const getPeople              = ()           => request('GET',    '/api/people');
export const createPerson           = (data)       => request('POST',   '/api/people', data);
export const getPersonDetail        = (id)         => request('GET',    `/api/people/${id}`);
export const deletePerson           = (id)         => request('DELETE', `/api/people/${id}`);
export const addMeasurement         = (id, data)   => request('POST',   `/api/people/${id}/measurements`, data);
export const deleteMeasurement      = (id, eid)    => request('DELETE', `/api/people/${id}/measurements/${eid}`);
export const getMeasurementTypes    = ()           => request('GET',    '/api/measurement-types');
export const importData             = (payload)    => request('POST',   '/api/import', payload);
export const getUsers               = ()           => request('GET',    '/api/users');
export const createUser             = (data)       => request('POST',   '/api/users', data);
export const deleteUser             = (id)         => request('DELETE', `/api/users/${id}`);
```

---

## Key Interactions

### `MeasurementForm` — used in both Dashboard (inline) and PersonDetail
- **Type field**: `AutocompleteInput` — free text, suggests known types from `measurementTypes` store.
- **Unit field**: `AutocompleteInput` — free text, auto-populates suggestions based on the selected type (e.g., typing "height" suggests "cm", "in").
- **Value field**: number input.
- **Date field**: date picker, defaults to today.

### Dashboard — primary screen
- One `PersonCard` per person. Each card shows the person's name and one row per known type showing the latest value, unit, and date.
- **+ Add** button on each card expands an inline `MeasurementForm` in place — no navigation needed.
- After a successful POST, `latestByType` updates on that card immediately.

### PersonDetail — full history
- `MeasurementForm` at the top.
- `MeasurementTable` below: all measurements for this person, sortable, with a delete icon per row.
- `TrendChart` below the table: time x-axis, one line per type. Each type uses a distinct color. Types with different units get their own y-axis (up to two y-axes; more than two collapses to a normalized view).
- "Delete Person" at the bottom with confirmation modal.

### Import
- CSV drop zone. Minimum expected columns: `name`, `type`, `value`, `unit`, `date`.
- Column name mapper for non-standard headers.
- Preview first 10 rows.
- On confirm: POST to `/api/import`.

---

## Local Development Without the Backend

```bash
npm install -D msw
```

Set `VITE_API_BASE_URL=` (empty) in `.env.local`. MSW intercepts all `/api/*` fetch calls in the browser. Define handlers in `src/mocks/handlers.js` that mirror the contract above, using in-memory state. This lets frontend work proceed independently and serves as living API documentation for the backend team.

---

## Dependencies Summary

```bash
npm install svelte-routing d3 papaparse
npm install -D msw
```

No UI component library. No backend SDK. All server communication through `src/lib/api.js`.

---

## Implementation Order

1. `.env.local` + `src/lib/api.js` skeleton
2. MSW mock handlers for all endpoints
3. Auth flow — `auth.svelte.js` + `Login.svelte` + gate in `App.svelte`
4. `measurementTypes.svelte.js` + `AutocompleteInput.svelte`
5. Dashboard — `people.svelte.js` + `PersonCard` (read-only, then quick-add form)
6. `PersonDetail` — `MeasurementForm` + `MeasurementTable` + delete person
7. `TrendChart` — D3 multi-line, one series per type
8. `Import` — CSV parse + column mapper + POST
9. `Admin` — user list + create + delete
