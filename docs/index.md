# biostats.js developer docs

biostats.js is the web frontend for **bioStats**, an app for tracking measurements (height, weight, heart rate, or any admin-defined type) for a set of people over time. It is a single-page app with no server of its own. It talks to the Java/Spring Boot backend, [biostats-service](https://bitsandbytes.github.io/biostats-service/), over a JSON REST API.

These pages are for developers working on the frontend. User-facing behaviour is summarised in the [README](https://github.com/bitsandbytes/biostats.js#readme).

::: info The frontend owns the API contract
[`API_CONTRACT.md`](https://github.com/bitsandbytes/biostats.js/blob/main/API_CONTRACT.md) in this repo is the source of truth for the REST API. The backend implements it. `src/lib/api.js` is the only module that makes HTTP calls.
:::

## Stack

| Concern | Choice |
|---|---|
| UI framework | Svelte 5 (runes: `$state`, `$derived`, `$props`, `$effect`) |
| Build / dev server | Vite 6 (`@sveltejs/vite-plugin-svelte`, `@vitejs/plugin-basic-ssl` for HTTPS in dev) |
| Routing | Hand-rolled: `src/lib/router.js` + `src/stores/router.svelte.js` |
| Charts | D3 7 (`TrendChart`), plain SVG polylines (`Sparkline`) |
| CSV | PapaParse |
| Font / icons | Figtree via `@fontsource/figtree` (self-hosted); inline SVG icons in `Icon.svelte` |
| Mock backend | MSW 2 (Mock Service Worker), in the browser |
| Tests | Vitest 4, `node` environment, `src/**/*.test.js` |
| Hosting | Static-assets-only Cloudflare Worker; backend on Render behind the same custom domain |

There is no UI component library and no backend SDK.

## Architecture

```text
 Browser
 ┌──────────────────────────────────────────────────────────────┐
 │ index.html → src/main.js → App.svelte (auth gate + router)    │
 │                              │                               │
 │        routes/*.svelte ──────┤ Dashboard, PersonDetail,       │
 │        components/*          │ Import, Admin, Login           │
 │                              ▼                               │
 │        stores/*.svelte.js   (auth, people, measurementTypes,  │
 │                              router, viewport)                │
 │                              │                               │
 │                              ▼                               │
 │        lib/api.js  ── request(): cookies, error shape,        │
 │                       401 → shared refresh → retry once       │
 └──────────────────────────────┬───────────────────────────────┘
                                │ fetch, credentials: 'include'
          VITE_API_BASE_URL     │ (compiled in at build time)
        ┌───────────────────────┼─────────────────────────┐
        ▼                       ▼                         ▼
  empty: same-origin      https://…: backend       mock: MSW handlers
  /api (Vite dev proxy)   origin directly          (src/mocks, in-page)
        │                       │
        └──────────► biostats-service (Spring Boot, Postgres)
```

- **`App.svelte`** calls `initSession()` on mount (`GET /api/auth/me`, which refreshes an expired token by itself). It then renders `<Login>` or `<AppShell>` with the route that matches `router.path`.
- **Stores** hold app-wide state as Svelte 5 runes in `.svelte.js` modules. A person's measurement history is not global; `PersonDetail.svelte` fetches it on demand.
- **`AppShell`** shows `Sidebar` as a fixed column at ≥1024px. On narrower screens it shows a top bar and a slide-out drawer, using the `desktop` media query in `stores/viewport.svelte.js`.
- **Pure logic lives in `src/lib/`** and is unit-tested: series grouping, summaries, CSV mapping, the import report, the router matcher, and formatting.

## Routes

| Path | Component | Purpose |
|---|---|---|
| `/` | `Dashboard.svelte` | Desktop: quick-add bar and `PeopleTable` (latest value and sparkline per type). Phone: `PersonCard` list with an inline add form |
| `/person/:id` | `PersonDetail.svelte` | Trend chart, time ranges, series tiles, CSV export, history, delete person |
| `/import` | `Import.svelte` | CSV bulk import with a column mapper and a per-row failure report |
| `/admin` | `Admin.svelte` | Users, and measurement types and units (admins only) |

## Source layout

```text
src/
├── main.js, App.svelte, app.css   entry, auth gate + router outlet, design tokens
├── routes/                        one component per page (+ Login)
├── components/
│   ├── layout/                    AppShell, Sidebar
│   ├── people/                    PeopleTable, PersonCard, Add/Delete person modals
│   ├── measurements/              MeasurementForm, MeasurementTable
│   ├── charts/                    TrendChart (D3), Sparkline
│   └── ui/                        Icon, Modal, Link, Button, EmptyState
├── stores/                        *.svelte.js rune stores
├── lib/                           api.js, apiBase.js and tested pure helpers
└── mocks/                         MSW handlers, seed data, mock sessions, import rules
public/                            favicons, mockServiceWorker.js
docs/                              this site (VitePress)
```

## Where next

- [Build & deploy](./build-and-deploy): run it locally, configuration, tests, the Cloudflare deployment.
- [Backend integration](./integration): base URLs, auth and token refresh, errors, CORS and cookies.
- [API reference (Swagger)](./api): the browsable OpenAPI spec.
- [Working on these docs](./contributing-docs).

This frontend has no database of its own, so there is no database page. The backend's database is documented in the [backend docs](https://bitsandbytes.github.io/biostats-service/database/). In mock mode, data lives in memory in the browser tab.
