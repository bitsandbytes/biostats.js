# biostats.js

A Svelte 5 + Vite single-page app for tracking biometric measurements (height, weight, etc.) for a set of people, with CSV bulk import and trend charts.

## Requirements

- Node.js (with npm)
- A running instance of the Java/Spring Boot backend (see `API_CONTRACT.md`), or use the built-in mock server for frontend-only development

## Setup

```bash
npm install
```

Create a `.env.local` file to point the app at your backend:

```
VITE_API_BASE_URL=http://localhost:8080
```

To develop without a backend, set `VITE_API_BASE_URL=mock` to use the MSW mock handlers in `src/mocks/handlers.js` instead (an empty value routes `/api/*` through the Vite dev proxy to the backend). Mock mode starts with a few demo people and about eight months of measurements (`src/mocks/seed.js`); log in with the seeded user in `handlers.js` (password `pw`).

### Sessions and token refresh

The backend issues a short-lived access token (15 minutes by default) and a rotating refresh token, both as cookies. When a request gets a `401`, `src/lib/api.js` calls `POST /api/auth/refresh` once and retries the request; requests that fail together share one refresh. The app returns to the login screen only when the refresh itself is refused. See **Session lifetime and refresh** in `API_CONTRACT.md`.

Mock mode imitates this, keeping sessions in `sessionStorage` so a reload keeps you logged in. To try the refresh path by hand, open the DevTools console and run `mockAuth.expireAccessTokens()` (the next request refreshes and retries) or `mockAuth.revokeAll()` (the next refresh is refused and you are sent to login). Loading the app with `?accessttl=30` makes access tokens expire after 30 seconds.

## Commands

```bash
npm run dev      # Start dev server (Vite HMR)
npm run build    # Production build
npm run preview  # Preview production build
npm test         # Run unit tests (vitest)
```

## Deploying (Cloudflare)

The production site is a Cloudflare Worker that serves only static assets, so it has no runtime configuration. The backend origin is compiled into the bundle, which means it has to be set as a **build variable** (Workers Builds → Settings → Variables and secrets → *Build*), not as a Worker runtime variable:

```
VITE_API_BASE_URL=https://api.example.com
```

Build variables take priority over the committed `.env.local`. `npm run build` checks the value: anything other than empty, `mock`, or an absolute `http(s)://` URL fails the build. An empty value prints a warning, because a static host has nothing that answers same-origin `/api/*`. A trailing slash is fine. The build log prints `API base URL: …` so you can confirm what got compiled in. Changing the value requires a rebuild.

The backend runs on a different origin, so it has to allow this site via CORS with credentials, and its session cookie must be usable cross-origin. See **Cross-origin deployment** in `API_CONTRACT.md`.

## Using the app

The layout adapts to screen width (breakpoint 1024px):

- **Desktop** — a persistent dark sidebar (People, Import CSV, Admin, your account and log out).
  - **People** (`/`) is a table with one row per person and one column per measurement type, showing the latest value and a trend line of recent readings. The **Quick add** bar above it records a measurement for anyone; a row's **+ Add** pre-fills that person. Column chips hide/show types, the Person and Last entry headings sort, and `Ctrl/Cmd+K` focuses the name filter.
  - **Person detail** (`/person/:id`) has a two-axis trend chart (hover for values), time-range buttons (1M–All), a tile per measurement that toggles it on the chart (two units at a time, one per axis), CSV export, and the full history. The right-hand panel records new measurements.
- **Phone** — a top bar with a menu button that opens the same navigation as a slide-out drawer. People are shown as cards with an inline **Add** form; the person page stacks the same sections in one column.

Styling uses the Figtree font (bundled via `@fontsource/figtree`, no external requests) and the colour tokens in `src/app.css`.

## Architecture

See `CLAUDE.md` for a detailed overview of the app's structure, stores, and API layer.

## CSV Import

The `/import` route (`src/routes/Import.svelte`) lets you bulk-import measurements from a CSV file.

- The file must have a header row.
- Your columns can be named anything — the Import page lets you map each of your CSV's headers to the required fields below. Headers that match a field name, or a common alias, are mapped for you automatically (case-, whitespace- and separator-insensitive, so `Date`, `measured_at` and `Taken At` all map to the date field).
- Required fields:
  - `name` — the person's name
  - `type` — measurement type (e.g. `height`)
  - `value` — numeric measurement value
  - `unit` — unit abbreviation (e.g. `cm`)
  - `date` — when the measurement was taken (sent to the backend as `measured_at`)
- All five fields must be mapped before the import can be submitted. A preview of the first 10 parsed rows is shown before you import.
- `type` and `unit` values don't need to already exist — unknown ones are created automatically (matched case-insensitively, so `Height` and `height` are treated as the same type). A `unit` cell also matches an existing unit by its full label, not just its abbreviation, so `Pounds` resolves to the seeded `lbs` unit instead of creating a duplicate. Any newly created types/units are listed after the import completes.
- Invalid rows are skipped and the rest still import. After the import, any row that wasn't imported is listed with its row number (counting data rows, not the header), its original CSV values with the bad cells highlighted, and the reason(s): a missing name, type or unit, a blank or non-numeric value, or a date that isn't a real `YYYY-MM-DD` date.
