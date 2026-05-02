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
    "email": "string"
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

### `GET /api/measurement-types`

Return all known type+unit combinations derived from existing measurement data. Used to populate autocomplete dropdowns in `MeasurementForm`.

- **Auth required:** Yes
- **Response `200`:** `TypeSuggestion[]`
  ```json
  [
    {
      "type": "string",
      "units": ["string"]
    }
  ]
  ```
  Example:
  ```json
  [
    { "type": "height", "units": ["cm", "in"] },
    { "type": "weight", "units": ["kg", "lb"] }
  ]
  ```
  When the user selects a type, the frontend filters this list to suggest matching units.

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
- **Response `200`:**
  ```json
  {
    "created": 0,
    "skipped": 0,
    "errors": 0
  }
  ```
  `created` — rows successfully inserted. `skipped` — rows that were duplicates or otherwise not inserted. `errors` — rows that failed validation or processing.

---

## Users (Admin)

### `GET /api/users`

Return all registered users. Admin use only.

- **Auth required:** Yes
- **Response `200`:** `User[]`
  ```json
  [
    {
      "id": "uuid",
      "email": "string",
      "created_at": "ISO 8601 timestamp"
    }
  ]
  ```

---

### `POST /api/users`

Create a new user account.

- **Auth required:** Yes
- **Request body:**
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- **Response `200`:** `User`
  ```json
  {
    "id": "uuid",
    "email": "string",
    "created_at": "ISO 8601 timestamp"
  }
  ```
- **Response `409`** if email already exists.

---

### `DELETE /api/users/:id`

Delete a user account.

- **Auth required:** Yes
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

Person
  id          uuid
  name        string
  notes       string (optional)
  created_at  ISO 8601 timestamp

Measurement
  id          uuid
  person_id   → Person.id
  type        string   free text, e.g. "height", "weight"
  value       number
  unit        string   free text, e.g. "cm", "in", "kg", "lb"
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

TypeSuggestion
  type   string
  units  string[]
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
