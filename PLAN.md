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
- Favicon wired up (`public/` + `<link>` tags in `index.html`). It now matches the app's logo mark (the white pulse line on a teal `--nav-mark` rounded square shown next to "bioStats"): `public/favicon.svg` is the source, and the PNG sizes and `favicon.ico` (16/32/48) were rendered from it with headless Chrome. The 16/32/48px versions use a heavier stroke so the line stays visible, and `apple-touch-icon.png` is full-bleed because iOS rounds the corners itself.
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

- **Import reports which rows failed and why:**
  - `POST /api/import` response gains `rowErrors: [{ row, field, message }]`. `row` is the 0-based index into the request's `rows` array. The validation rules are documented under "Row validation" in `API_CONTRACT.md`: name/type/unit are required, value must be a finite number, and the date must be a real `YYYY-MM-DD` date. Every failing rule on a row is reported, and invalid rows no longer create people, types or units.
  - `src/mocks/importValidate.js` (new, unit-tested) holds the rules; the MSW `/api/import` handler validates each row before inserting it.
  - `applyMapping()` now sends `null` for a blank or non-numeric value. Previously `Number('')` quietly imported a blank cell as `0`.
  - `src/lib/importReport.js` (new, unit-tested) provides `groupRowErrors()`, which groups problems per row alongside the row's original CSV text.
  - The Import page lists failed rows: row number, original values with bad cells highlighted, and the reasons. The result banner turns coral when any row failed, and hard-coded colours were replaced with tokens.
  - `npm test` (92 passing) and `npm run build` (no warnings) are green. Verified in headless Chrome in mock mode: a CSV with 2 good and 3 bad rows imported 2 and listed the 3 failures with the correct reasons, with no console errors.
- **Removed the unused `AutocompleteInput.svelte`.**
- **Import scrolls back to the top on completion** so the result banner and failed-rows table are visible, since the Import button is at the bottom below the preview. Scrolling is smooth unless the user prefers reduced motion. It doesn't scroll on a request failure, because that error shows next to the button. Verified in headless Chrome (scrollY 125 → 0).
- The router change and the redesign are committed (`1866aad`). The backend now implements `recentByType`, the import unit-label matching, and `rowErrors` with the per-row import validation rules.

- **Backend base URL for the Cloudflare deployment.** The frontend is deployed as a static-assets-only Cloudflare Worker, and the backend is on a different domain. The Worker has no runtime config, so the backend origin is set with the `VITE_API_BASE_URL` Cloudflare *build* variable and compiled in.
  - `src/lib/apiBase.js` (new, unit-tested): `resolveApiBase()` normalizes the value. It handles empty/mock as same-origin, strips trailing slashes, and throws on anything that isn't an absolute http(s) URL. `isMockMode()` is also defined there. Both `api.js` and `main.js` use it.
  - `vite.config.js` validates the value during `vite build`: a malformed value fails the build, an empty value or `mock` prints a warning, and otherwise the build prints `API base URL: …`.
  - `README.md` has a new "Deploying (Cloudflare)" section. `API_CONTRACT.md` has a new "Cross-origin deployment" section describing the CORS and cookie requirements for the backend.
  - `npm test` (100 passing) is green. Builds were verified with a valid URL (compiled in), with a scheme-less value (build fails), and with an empty value (warning).
  - **Not yet verified end-to-end**: this depends on the backend's CORS and cookie config.

- **Cross-origin session fixed by hosting**: the frontend (Cloudflare) and backend (Render) are now behind one custom domain, so the session cookie is first-party. Before, iOS/WebKit blocked it as a third-party cookie, and on a real iPhone every request after login got a 401.
- **Dashboard no longer hangs on "Loading…" when a request fails** (seen on iPhone while the cookie was being blocked):
  - `src/lib/api.js`: errors thrown by `request()` now carry `status`, so `{ ...body, status }` is thrown and a non-JSON error body becomes `{ status }`. Previously a non-JSON body made `res.json()` itself throw. A new `onUnauthorized(handler)` hook runs on any 401 except from `/api/auth/login` (wrong password) and `/api/auth/me` (the startup session check). A new `errorMessage(err, fallback)` helper gives a user-facing message, including one for network failures.
  - `src/stores/auth.svelte.js` registers the handler to clear `auth.session`, so an expired or missing session returns to `<Login>` from any page.
  - `Dashboard.svelte`: load failures show an error card with a Retry button instead of leaving "Loading…" up forever.
  - Tests in `src/lib/api.test.js` (new). `npm test` (108 passing) and `npm run build` are green. Verified in headless Chrome at 390×844 in mock mode with `/api/people` stubbed: 500 shows the error, Retry recovers, 401 returns to login, and there are no page errors.

- **iPhone: page left zoomed in and scrolled after login.** iOS (Safari and Chrome) zooms in when a field with text under 16px gets focus, and the zoom carried over to the People page.
  - `src/app.css`: `@media (pointer: coarse)` forces 16px on `input`/`select`/`textarea`. `!important` is needed because components set smaller sizes in their scoped styles. We deliberately didn't use `maximum-scale=1`, since it disables pinch-zoom on Android.
  - `Login.svelte` blurs the focused field and scrolls to the top after a successful login.
  - Verified in headless Chrome: a touch viewport gets 16px fields, desktop keeps 14.4/15.2px, and scrollY is 0 after login. **Still needs a check on a real iPhone.**

- **Login form input conveniences** (`Login.svelte`):
  - The email field uses `autocomplete="username"`, so password managers pair it with `current-password`. It also has `name` attributes, turns off autocapitalise, autocorrect and spellcheck, and its return key says "Next" and moves to the password field (it submits instead if the password is already filled in). The password field's return key says "Go".
  - Once "@" is typed, a `<datalist>` suggests common email domains, using `emailSuggestions()` in the new, tested `src/lib/emailSuggest.js`.
  - The password field has a show/hide toggle, with new `eye`/`eye-off` icons.
  - Fields have 44px touch targets. The email field gets focus on load on desktop only, so it doesn't pop up the phone keyboard. The email is trimmed before it's sent.
  - A 401 shows "Invalid email or password". Any other failure (server or network) shows its own message, so the user doesn't think they mistyped.
  - `npm test` (116 passing) and `npm run build` are green. Checked in headless Chrome at 390×844: the attributes render and the layout is correct.
  - **Passkeys not done**: they need backend WebAuthn endpoints. See Unresolved.

### In Progress

Nothing in progress.

### Next Step to Pick Up From

1. **Restrict person deletion to admins and the person's creator** (not urgent). Today any logged-in user can delete any person, and nothing records who created a person. This needs:
   - a `created_by` user id on `Person`, set by `POST /api/people`. Decide what import-created people get: the importing user is the natural choice.
   - `DELETE /api/people/:id` returning `403` unless the caller is an admin or the creator, documented in `API_CONTRACT.md` and matched in the MSW mock.
   - the delete button on `PersonDetail` shown only when allowed. That means either exposing `created_by` on `PersonDetail`/`PersonSummary`, or having the backend return a `canDelete` flag.

2. **Store every measurement in metric and display it in each user's preferred units.** Right now a measurement keeps whatever unit it was entered in, so a person's weight history can mix `kg` and `lbs`, and charts plot them as separate series. This is a significant change and will probably mean re-architecting how admin-managed types and units work, since a lot of effort went into letting users add arbitrary types and units. Open questions:
   - Every unit needs a conversion to a canonical base unit for its type: a factor, or an offset + factor for temperature.
   - What happens to user-added types that have no metric equivalent (e.g. `bpm`, a free-form score)? Does each type declare a base unit?
   - Add a per-user display preference (metric / imperial, or per type) on `User` / `GET /api/auth/me`.
   - Plan a data migration for existing measurements, and decide how import handles units it can't convert.
   - Work out the effect on `latestByType` / `recentByType`, CSV export (export in stored or display units?), `TrendChart` series grouping, and `MeasurementForm` (enter in the preferred unit, convert on save).

---

## Unresolved / Needs Decision

**0. Passkey sign-in.** This needs WebAuthn endpoints in `API_CONTRACT.md` and the backend: registration options and verification for a logged-in user, then authentication options and verification that start a session. On the frontend it needs `navigator.credentials` calls, `autocomplete="username webauthn"` with conditional mediation on the login email field, and a "Add a passkey" action for the signed-in user.

**0b. API_CONTRACT error-handling line.** The uncommitted contract edit says "The frontend throws the parsed body directly", which drops the `status` on thrown errors and the 401 → login redirect. It wasn't implemented: `api.js` still adds `status` and handles 401. That behaviour fixed the iPhone "Loading…" hang, and errors are required to carry the HTTP status. Revert that line, or decide otherwise.

**1. Containerize the frontend for local integration testing** (production is now a static Cloudflare Worker, see Complete; the runtime-config notes below only apply if a container is ever used for production):

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
| `POST` | `/api/import` | `{ created, skipped, errors, rowErrors, createdTypes, createdUnits }` — auto-creates unknown types/units (case-insensitive match) |

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
│   ├── importReport.js           # groupRowErrors — per-row import failures for the Import page (unit-tested)
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
    ├── importValidate.js          # per-row import validation → rowErrors (unit-tested)
    └── importResolve.js           # case-insensitive type/unit lookup (unit matches abbreviation or label) + auto-create, used by the /api/import handler
```

---

## Known Technical Debt

- Import and Admin pages were only re-coloured, not re-laid-out for phones; their wide tables scroll horizontally inside their cards.