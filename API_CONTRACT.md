# API Contract — biostats.js

The frontend is the source of truth for this contract. The Java/Spring Boot backend implements it.

All endpoints except `/api/auth/login` require a valid session cookie (`credentials: include`) or `Authorization: Bearer <token>` header. The frontend sends `credentials: 'include'` on every request via the shared `request()` helper in `src/lib/api.js`.

Non-2xx responses return a JSON error body. The frontend throws the parsed body directly.

---

## Auth

### `POST /api/auth/login`

Authenticate a user and establish a session.

- **Auth required:** No
- **Request body:**
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- **Response `200`:**
  ```json
  {
    "token": "string",
    "user": {
      "id": "uuid",
      "email": "string"
    }
  }
  ```

---

### `POST /api/auth/logout`

Invalidate the current session.

- **Auth required:** Yes
- **Request body:** none
- **Response:** `204 No Content`

---

### `GET /api/auth/me`

Return the currently authenticated user. Called on app load to restore session state.

- **Auth required:** Yes
- **Response `200`:**
  ```json
  {
    "id": "uuid",
    "email": "string",
    "admin": true
  }
  ```
- **Response `401`** if no valid session.

---

## People

### `GET /api/people`

Return all people with their latest measurement per type. Used to populate the Dashboard.

- **Auth required:** Yes
- **Response `200`:** `PersonSummary[]`
  ```json
  [
    {
      "id": "uuid",
      "name": "string",
      "latestByType": {
        "<type>": {
          "value": 0.0,
          "unit": "string",
          "measured_at": "YYYY-MM-DD"
        }
      }
    }
  ]
  ```
  `latestByType` is keyed by measurement type string (e.g. `"height"`, `"weight"`). Empty object `{}` if the person has no measurements. "Latest" means the entry with the greatest `measured_at` for that type.

---

### `POST /api/people`

Create a new person.

- **Auth required:** Yes
- **Request body:**
  ```json
  {
    "name": "string",
    "notes": "string"
  }
  ```
  `notes` is optional.
- **Response `200`:** `Person`
  ```json
  {
    "id": "uuid",
    "name": "string",
    "notes": "string",
    "created_at": "ISO 8601 timestamp"
  }
  ```

---

### `GET /api/people/:id`

Return a single person with their full measurement history. Used by the PersonDetail page.

- **Auth required:** Yes
- **Path parameter:** `id` — person UUID
- **Response `200`:** `PersonDetail`
  ```json
  {
    "id": "uuid",
    "name": "string",
    "notes": "string",
    "measurements": [
      {
        "id": "uuid",
        "type": "string",
        "value": 0.0,
        "unit": "string",
        "measured_at": "YYYY-MM-DD"
      }
    ]
  }
  ```
  `measurements` sorted by `measured_at` descending. `notes` may be null/absent if not set.
- **Response `404`** if person not found.

---

### `DELETE /api/people/:id`

Delete a person and cascade-delete all of their measurements.

- **Auth required:** Yes
- **Path parameter:** `id` — person UUID
- **Response:** `204 No Content`
- **Response `404`** if person not found.

---

## Measurements

### `POST /api/people/:id/measurements`

Add a measurement for a person.

- **Auth required:** Yes
- **Path parameter:** `id` — person UUID
- **Request body:**
  ```json
  {
    "type": "string",
    "value": 0.0,
    "unit": "string",
    "measured_at": "YYYY-MM-DD"
  }
  ```
  `type` and `unit` are free text (e.g. `"height"`, `"cm"`). `value` is a number. `measured_at` is a date string.
- **Response `200`:** `Measurement`
  ```json
  {
    "id": "uuid",
    "person_id": "uuid",
    "type": "string",
    "value": 0.0,
    "unit": "string",
    "measured_at": "YYYY-MM-DD",
    "created_at": "ISO 8601 timestamp"
  }
  ```
- **Response `404`** if person not found.

---

### `DELETE /api/people/:id/measurements/:entryId`

Delete a single measurement.

- **Auth required:** Yes
- **Path parameters:** `id` — person UUID, `entryId` — measurement UUID
- **Response:** `204 No Content`
- **Response `404`** if person or measurement not found.

---

## Measurement Types

A measurement type is just a label (e.g. `"height"`). Units belong to exactly one type (e.g. `"cm"` and `"in"` belong to `"height"`) and each have their own label and abbreviation (e.g. label `"Centimeters"`, abbreviation `"cm"`). `MeasurementForm` renders a single unit `<select>` grouped by type (`<optgroup>` per type), displaying `"<label> (<abbreviation>)"` per option; picking a unit determines the measurement's `type` (the parent type's label) and `unit` (the chosen unit's abbreviation).

### `GET /api/measurement-types`

Return all measurement types with their nested units. Used to populate the grouped unit dropdown in `MeasurementForm` and to render the "Measurement Types" admin section.

- **Auth required:** Yes
- **Response `200`:** `MeasurementType[]`
  ```json
  [
    {
      "id": "uuid",
      "label": "string",
      "units": [
        { "id": "uuid", "label": "string", "abbreviation": "string" }
      ]
    }
  ]
  ```
  Example:
  ```json
  [
    {
      "id": "type-1",
      "label": "height",
      "units": [
        { "id": "unit-1", "label": "Centimeters", "abbreviation": "cm" },
        { "id": "unit-2", "label": "Inches", "abbreviation": "in" }
      ]
    },
    {
      "id": "type-2",
      "label": "weight",
      "units": [
        { "id": "unit-3", "label": "Kilograms", "abbreviation": "kg" },
        { "id": "unit-4", "label": "Pounds", "abbreviation": "lbs" }
      ]
    }
  ]
  ```

---

### `POST /api/measurement-types`

Create a new measurement type.

- **Auth required:** Yes (`ROLE_ADMIN`)
- **Request body:**
  ```json
  { "label": "string" }
  ```
- **Response `201`:** `MeasurementType` (`units: []`)
- **Response `403`** if the authenticated user is not an admin.
- **Response `409`** if a type with this label already exists.

---

### `PUT /api/measurement-types/:id`

Rename a measurement type.

- **Auth required:** Yes (`ROLE_ADMIN`)
- **Path parameter:** `id` — measurement type UUID
- **Request body:**
  ```json
  { "label": "string" }
  ```
- **Response `200`:** `MeasurementType`
- **Response `403`** if the authenticated user is not an admin.
- **Response `404`** if the type is not found.
- **Response `409`** if another type already has this label.

---

### `DELETE /api/measurement-types/:id`

Delete a measurement type and cascade-delete its units. Existing `Measurement` rows already recorded with this type's label are untouched (they keep their free-text `type`/`unit` values regardless of later admin changes).

- **Auth required:** Yes (`ROLE_ADMIN`)
- **Path parameter:** `id` — measurement type UUID
- **Response:** `204 No Content`
- **Response `403`** if the authenticated user is not an admin.
- **Response `404`** if the type is not found.

---

### `POST /api/measurement-types/:id/units`

Add a unit to a measurement type.

- **Auth required:** Yes (`ROLE_ADMIN`)
- **Path parameter:** `id` — measurement type UUID
- **Request body:**
  ```json
  { "label": "string", "abbreviation": "string" }
  ```
- **Response `201`:** `Unit`
  ```json
  { "id": "uuid", "label": "string", "abbreviation": "string" }
  ```
- **Response `403`** if the authenticated user is not an admin.
- **Response `404`** if the type is not found.
- **Response `409`** if the type already has a unit with this abbreviation.

---

### `PUT /api/measurement-types/:id/units/:unitId`

Update a unit's label or abbreviation.

- **Auth required:** Yes (`ROLE_ADMIN`)
- **Path parameters:** `id` — measurement type UUID, `unitId` — unit UUID
- **Request body:**
  ```json
  { "label": "string", "abbreviation": "string" }
  ```
- **Response `200`:** `Unit`
- **Response `403`** if the authenticated user is not an admin.
- **Response `404`** if the type or unit is not found.
- **Response `409`** if the type already has another unit with this abbreviation.

---

### `DELETE /api/measurement-types/:id/units/:unitId`

Delete a unit.

- **Auth required:** Yes (`ROLE_ADMIN`)
- **Path parameters:** `id` — measurement type UUID, `unitId` — unit UUID
- **Response:** `204 No Content`
- **Response `403`** if the authenticated user is not an admin.
- **Response `404`** if the type or unit is not found.

---

## Import

### `POST /api/import`

Bulk-import measurements from a parsed CSV. The backend upserts persons by name and inserts measurement rows.

- **Auth required:** Yes
- **Request body:** `ImportPayload`
  ```json
  {
    "rows": [
      {
        "name": "string",
        "type": "string",
        "value": 0.0,
        "unit": "string",
        "measured_at": "YYYY-MM-DD"
      }
    ]
  }
  ```
  Each row corresponds to one measurement for a named person. All fields are required per row.

  A row's `type` and `unit` do not need to already exist as a `MeasurementType`/`Unit` — see **Auto-creation of types and units** below.

- **Response `200`:**
  ```json
  {
    "created": 0,
    "skipped": 0,
    "errors": 0,
    "createdTypes": [
      { "id": "uuid", "label": "string" }
    ],
    "createdUnits": [
      {
        "id": "uuid",
        "label": "string",
        "abbreviation": "string",
        "typeId": "uuid",
        "typeLabel": "string"
      }
    ]
  }
  ```
  `created` — rows successfully inserted. `skipped` — rows that were duplicates or otherwise not inserted. `errors` — rows that failed validation or processing. `createdTypes` / `createdUnits` — the `MeasurementType`s and `Unit`s newly created *by this import call* (see below). Each appears at most once, even if matched by multiple rows. Omit or return empty arrays when nothing new was created.

#### Auto-creation of types and units

For each row, `type` and `unit` are resolved against existing `MeasurementType.label` and `Unit.abbreviation` / `Unit.label` **case-insensitively** (trim whitespace, then compare ignoring case), so `"Height"` and `"height"` resolve to the same type:

1. Look up a `MeasurementType` whose `label` matches the row's `type` (case-insensitive). If none exists, create one with `label` set to the row's `type` value as given (trimmed). That row is now the canonical casing for this type going forward.
2. Within that type, look up a `Unit` whose `abbreviation` **or** `label` matches the row's `unit` (case-insensitive on both). A CSV cell of `"pounds"` therefore resolves to a seeded unit with `label` `"Pounds"` / `abbreviation` `"lbs"` instead of creating a duplicate; an `abbreviation` hit is preferred when both a `label` and an `abbreviation` match different units. If nothing matches, create a unit with `abbreviation` set to the row's `unit` value as given (trimmed) and `label` set to that same value — the CSV has no separate unit label, so it's reused as a placeholder. Admins can rename it afterward in the Measurement Types admin section.
3. The `Measurement.type` / `Measurement.unit` actually stored on the row are the **canonical** resolved `label` / `abbreviation` (from step 1/2), not necessarily byte-identical to the CSV cell — this keeps `latestByType` keys consistent regardless of the casing used in any one import.

This auto-creation happens regardless of whether the importing user is an admin — `POST /api/import` itself is not admin-gated (unlike `POST /api/measurement-types` and `POST /api/measurement-types/:id/units`), and there's no way to pause mid-import for admin approval of a new type.

---

## Users (Admin)

### `GET /api/users`

Return all registered users. Admin use only.

- **Auth required:** Yes (`ROLE_ADMIN`)
- **Response `200`:** `User[]`
  ```json
  [
    {
      "id": "uuid",
      "email": "string",
      "created_at": "ISO 8601 timestamp",
      "admin": true
    }
  ]
  ```
- **Response `403`** if the authenticated user is not an admin.

---

### `POST /api/users`

Create a new user account.

- **Auth required:** Yes (`ROLE_ADMIN`)
- **Request body:**
  ```json
  {
    "email": "string",
    "password": "string",
    "admin": false
  }
  ```
  `admin` is optional; defaults to `false`.
- **Response `200`:** `User`
  ```json
  {
    "id": "uuid",
    "email": "string",
    "created_at": "ISO 8601 timestamp",
    "admin": false
  }
  ```
- **Response `403`** if the authenticated user is not an admin.
- **Response `409`** if email already exists.

---

### `DELETE /api/users/:id`

Delete a user account.

- **Auth required:** Yes (`ROLE_ADMIN`)
- **Path parameter:** `id` — user UUID
- **Response:** `204 No Content`
- **Response `404`** if user not found.

---

## Shared Types

```
User
  id          uuid
  email       string (unique)
  created_at  ISO 8601 timestamp
  admin       boolean

Person
  id          uuid
  name        string
  notes       string (optional)
  created_at  ISO 8601 timestamp

Measurement
  id          uuid
  person_id   → Person.id
  type        string   free text, copied from MeasurementType.label at entry time, e.g. "height", "weight"
  value       number
  unit        string   free text, copied from Unit.abbreviation at entry time, e.g. "cm", "in", "kg", "lbs"
  measured_at YYYY-MM-DD date string
  created_at  ISO 8601 timestamp

PersonSummary
  id          uuid
  name        string
  latestByType  map<string, { value, unit, measured_at }>

PersonDetail
  id            uuid
  name          string
  notes         string (optional)
  measurements  Measurement[]  sorted by measured_at desc

MeasurementType
  id     uuid
  label  string (unique)
  units  Unit[]

Unit
  id           uuid
  label        string          e.g. "Centimeters"
  abbreviation string          e.g. "cm" — unique within its parent type
```

---

## Error Responses

All non-2xx responses return a JSON body. The frontend throws the parsed body directly, so structure it for human readability:

```json
{
  "error": "string",
  "message": "string"
}
```
