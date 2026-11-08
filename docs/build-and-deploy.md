# Build & deploy

## Prerequisites

- **Node.js** 20 or 22+ (Vite 6 supports `^18 || ^20 || >=22`; CI uses 24) and npm.
- To run against a real backend: [biostats-service](https://bitsandbytes.github.io/biostats-service/build-and-deploy/) running locally on `https://localhost:9443`. Without one, use [mock mode](#mock-mode).

```bash
npm install
```

## Configuration

The frontend has one setting, the backend origin. Vite **compiles it into the bundle at build time**. The deployed site is static files, so nothing can change it at runtime.

| Variable | Default | Values |
|---|---|---|
| `VITE_API_BASE_URL` | empty (committed `.env.local`) | **empty**: same-origin `/api/*`. In dev, the Vite proxy forwards these to `https://localhost:9443`.<br>**`mock`**: same-origin `/api/*`, answered in the browser by MSW.<br>**`https://…`** (or `http://…`): the backend origin, called directly. That origin then needs CORS with credentials (see [Backend integration](./integration#cors-and-cookies)). |

`src/lib/apiBase.js` normalises the value (trims it, strips trailing slashes) and rejects anything else. `vite.config.js` runs the same check during `vite build`:

- a malformed value (e.g. `api.example.com` without a scheme) **fails the build**;
- an empty value or `mock` prints a warning, because a static host has nothing that answers same-origin `/api/*`;
- otherwise the build log prints `API base URL: …`.

**Precedence** (highest first), per Vite's rules:

1. Environment variables already set when Vite starts, such as Cloudflare build variables or `VITE_API_BASE_URL=mock npm run dev`.
2. `.env.[mode].local`, then `.env.[mode]` (`mode` is `development` for `dev`, `production` for `build`).
3. `.env.local` (committed, empty), then `.env`.

::: warning Don't put secrets in `VITE_*` variables
Anything prefixed `VITE_` ends up in the public JavaScript bundle.
:::

## Run locally

```bash
npm run dev        # https://localhost:5173 (self-signed cert, accept it once)
```

The dev server uses HTTPS (`@vitejs/plugin-basic-ssl`), so `Secure` cookies from the backend work. With an empty `VITE_API_BASE_URL`, `/api/*` is proxied to `https://localhost:9443` with `secure: false`, so the backend's self-signed certificate is accepted. The browser only ever talks to the Vite origin, so no CORS setup is needed in dev.

### Mock mode

```bash
VITE_API_BASE_URL=mock npm run dev
```

MSW intercepts `/api/*` in the browser (`src/mocks/handlers.js`, worker script `public/mockServiceWorker.js`). It starts with four demo people and about eight months of readings (`src/mocks/seed.js`). Log in with the seeded user in `handlers.js`, whose password is `pw`.

- Data is in memory and resets on reload. Sessions are kept in `sessionStorage`, so a reload keeps you logged in.
- Sessions behave like the real backend's: access tokens expire after 15 minutes (`?accessttl=30` on the URL makes that 30 seconds), and refresh tokens rotate with reuse detection (`src/mocks/mockSession.js`).
- In the DevTools console, `mockAuth.expireAccessTokens()` forces the next request through refresh-and-retry, and `mockAuth.revokeAll()` makes the next refresh fail, which sends you to login.
- Import validation and type/unit auto-creation follow the contract's rules, in `src/mocks/importValidate.js` and `src/mocks/importResolve.js`. The backend must implement the same rules.

## Tests

```bash
npm test           # vitest run: src/**/*.test.js, node environment
```

The tests cover the logic modules in `src/lib/` and `src/mocks/`: the API client (error shape, 401 handling, token refresh), base URL parsing, chart series, summaries, CSV mapping, the import report and rules, the router, and the mock session store. Svelte components have no unit tests; check them in the browser, in mock mode or against a local backend.

The project works test-first. When changing anything under `src/`, update or add tests first and run `npm test` before calling the change done (see `CLAUDE.md`).

## Build artifacts

```bash
npm run build      # → dist/ (index.html, hashed assets, favicons)
npm run preview    # serve dist/ locally
```

`dist/` is self-contained static files. `dist/` also contains `mockServiceWorker.js`, but it is only registered when the build was made with `VITE_API_BASE_URL=mock`. There is no Docker image for the frontend. Containerising it for local integration testing is an open item in `PLAN.md`.

## Deploying (Cloudflare)

Production is a **static-assets-only Cloudflare Worker** built by Cloudflare Workers Builds from this repo. Its build settings live in the Cloudflare dashboard, not in a file in this repo. The backend runs on Render. Both are served behind **one custom domain**, so the session cookies are first-party. Before that, iOS/WebKit blocked the cookie as a third-party cookie and every request after login failed with a 401.

1. In Cloudflare, under **Workers Builds → Settings → Variables and secrets → Build**, set `VITE_API_BASE_URL` to the backend origin (e.g. `https://api.example.com`). It has to be a **build** variable, not a runtime variable, and it overrides the committed `.env.local`.
2. Build command: `npm run build`. Output directory: `dist`.
3. Configure the Worker to serve `index.html` for unknown paths (single-page-app fallback). Otherwise a hard refresh on `/import` or `/person/:id` returns 404.
4. Check that the build log contains `API base URL: https://…`. Changing the value requires a rebuild.

Backend settings that have to match this deployment are covered in [Backend integration](./integration#cors-and-cookies).

## CI

| Workflow | Trigger | What it does |
|---|---|---|
| `.github/workflows/release.yml` | Manual (`workflow_dispatch` with a version), or a merged PR | Gitflow release: `develop` → `main` using `hoangvvo/gitflow-workflow-action` |
| `.github/workflows/docs.yml` | Push or PR to `main`, manual | Builds this docs site and deploys it to GitHub Pages (PRs only build) |

No workflow runs `npm test` or `npm run build` on pull requests yet. Run both locally before merging.

## Deploy checklist

- [ ] `npm test` passes.
- [ ] `npm run build` passes with the production `VITE_API_BASE_URL` and prints the expected `API base URL`.
- [ ] The backend has already shipped any API changes this release depends on (compare with `API_CONTRACT.md`).
- [ ] The backend's `CORS_ALLOWED_ORIGINS` includes the frontend origin, and the cookie `SameSite` setting fits the domain setup.
- [ ] After deploying: log in, load the Dashboard, open a person, hard-refresh a deep link, and log out. Do it once on a phone too.
