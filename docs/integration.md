# Backend integration

How the frontend talks to [biostats-service](https://bitsandbytes.github.io/biostats-service/). The endpoint-by-endpoint contract is [`API_CONTRACT.md`](https://github.com/bitsandbytes/biostats.js/blob/main/API_CONTRACT.md). The backend's own [Connecting to the API](https://bitsandbytes.github.io/biostats-service/connecting/) page covers non-browser clients (Bearer tokens, curl and Python).

## Base URLs

| Environment | Frontend | API calls go to |
|---|---|---|
| Local dev, real backend | `https://localhost:5173` (`npm run dev`) | Same origin `/api/*`, proxied by Vite to `https://localhost:9443` |
| Local dev, mock | `https://localhost:5173` with `VITE_API_BASE_URL=mock` | Same origin `/api/*`, answered by MSW in the browser |
| Production | The custom domain on Cloudflare | `VITE_API_BASE_URL`, compiled in at build time. The backend is on Render behind the same custom domain. |

Every call goes through `request()` in `src/lib/api.js`. It prefixes `VITE_API_BASE_URL`, sends `Content-Type: application/json` and `credentials: 'include'`, and JSON-encodes the body. To add an endpoint, add a one-line export there next to the others, then update `API_CONTRACT.md` and the MSW handler.

## Authentication

A session is two `HttpOnly` cookies set by the backend. JavaScript never reads either token. The browser sends them automatically.

| | Access token | Refresh token |
|---|---|---|
| Cookie | `token`, `Path=/` | `refresh_token`, `Path=/api/auth` |
| Lifetime | 15 min by default (`JWT_EXPIRATION_MS`) | 7 days idle, 30 days absolute (`REFRESH_TOKEN_IDLE_MS`, `REFRESH_TOKEN_MAX_MS`) |
| Rotation | — | Every refresh issues a new one. Reusing an old one revokes the whole session. |

Lifecycle in the app:

1. **Start-up:** `initSession()` (`src/stores/auth.svelte.js`) calls `GET /api/auth/me`. A 401 there goes through refresh and retry like any other request. If that still ends in a 401, the app shows `<Login>` without an error.
2. **Login:** `POST /api/auth/login` with `{ email, password }` returns `{ token, user: { id, email, admin } }` and sets both cookies. The frontend ignores the `token` in the body; the cookie is what it uses.
3. **Expired access token:** `request()` handles it (see below). Pages never see the 401.
4. **Logout:** `POST /api/auth/logout` needs no valid access token, always returns `204`, revokes the session and clears both cookies.

### Refresh and retry in `request()`

```text
request(method, path, body)
  └─ send() ── 2xx ───────────────────────────────► result
        │
        └─ 401, path not login/refresh/logout
              └─ sharedRefresh()   one POST /api/auth/refresh, shared by every
                    │              request that got a 401 while it runs
                    ├─ 200 ─► send() again, once ─► result, or its error
                    │                               (a second 401 ends the session)
                    ├─ 401 ─► onUnauthorized() once ─► <Login>
                    └─ 5xx / network error ─► throw that error; the user stays logged in
```

- **Single-flight is required.** Refresh tokens rotate, so two parallel refreshes would present the same token twice. The backend treats that as theft and revokes the session. The Dashboard loads people and measurement types in parallel, so this happens in practice.
- **Retrying is safe** for every method: a 401 means the server rejected the request before acting on it.
- `onUnauthorized` (registered by the auth store) clears `auth.session`, so `App.svelte` switches to `<Login>` from any page. It never runs for `/api/auth/me`, login, refresh or logout.
- `onSessionRefreshed` passes the `user` from each refresh to the auth store, so changes such as the `admin` flag are picked up.

### Roles

`auth.session.admin` decides whether the Admin page and nav link appear. The backend enforces the same rule: `/api/users/**` and writes to `/api/measurement-types/**` return `403` for non-admins. Hiding the UI is only a convenience.

## Errors

The backend returns a JSON body on every non-2xx response:

```json
{ "error": "Not Found", "message": "Person not found" }
```

`request()` checks the status **before** parsing. It parses the error body defensively and always throws an object that carries the HTTP status:

| What came back | What `request()` throws |
|---|---|
| Non-2xx with a JSON body | `{ error, message, status }` |
| Non-2xx with HTML, text or an empty body (proxy errors, Render or Cloudflare pages) | `{ status }` |
| No response (offline, DNS, CORS failure) | fetch's own `TypeError` |

Show errors with `errorMessage(err, fallback)`. It uses the body's `message`, then `error`, then the fallback, and gives a network failure its own explanation.

| Status | Meaning | Frontend behaviour |
|---|---|---|
| `400` | Validation failed | Show `message` |
| `401` | Access token missing or expired; bad login; dead refresh token | Refresh and retry; a wrong password shows "Invalid email or password" |
| `403` | Not an admin | Show `message` |
| `404` | Resource doesn't exist | Show `message` |
| `409` | Duplicate email, type label, or unit abbreviation within a type | Show `message` |
| `500` / `502` / `503` / `504` | Server error, or the backend is waking up (Render cold start) | Show the error. Pages that load data offer Retry. |

`POST /api/import` also reports per-row failures in a `200` response (`rowErrors`). See the contract's *Row validation* section.

## CORS and cookies

You only need this when `VITE_API_BASE_URL` points at a **different origin** from the one serving the frontend. Settings on the backend:

- `CORS_ALLOWED_ORIGINS`: the frontend's exact origin (scheme, host and port). `*` doesn't work with credentials.
- Preflight `OPTIONS /api/**` answered without auth. Allowed methods `GET, POST, PUT, DELETE`, header `Content-Type`.
- Cookies are `Secure`. Their `SameSite` setting depends on how the domains relate:
  - **Same registrable domain** (`app.example.com` + `api.example.com`, or one domain with path routing): the cookies are first-party, `Lax`/`Strict` works, and every browser accepts them. **This is the production setup.**
  - **Different sites** (`*.workers.dev` + `*.onrender.com`): `SameSite=None` is required, and Safari (including every browser on iOS) and strict-mode Firefox still block the cookie. Avoid this setup.

## Examples

Check a running backend with curl (`-k` is only for the self-signed dev certificate). The cookie jar plays the browser's role:

```bash
BASE=https://localhost:9443
curl -sk -c jar -o /dev/null -w '%{http_code}\n' -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' -d '{"email":"you@example.com","password":"…"}'
curl -sk -b jar -w '\n%{http_code}\n' "$BASE/api/people"                     # uses the token cookie
curl -sk -b jar -c jar -w '\n%{http_code}\n' -X POST "$BASE/api/auth/refresh" # rotates refresh_token
```

In app code, call the exported functions instead of `fetch`. They already handle status checks, error parsing and refresh:

```js
import { getPeople, errorMessage } from '../lib/api.js';

try {
  people = await getPeople();
} catch (err) {
  // err.status is always set for HTTP errors; a 401 here means the session
  // is over and the app is already on its way to <Login>.
  loadError = errorMessage(err, 'Could not load people.');
}
```

If you have to call `fetch` directly, for example from a script, follow the same rules:

```js
const res = await fetch(`${BASE}/api/people`, { credentials: 'include' });
if (!res.ok) {
  const body = await res.json().catch(() => null); // HTML or empty error pages are fine
  throw { ...(body ?? {}), status: res.status };
}
const people = await res.json();
```

For Python and Bearer-token clients, see the [backend's examples](https://bitsandbytes.github.io/biostats-service/connecting/#examples).

## Limits and caveats

- **Cold starts:** after about an hour idle, the Render backend and its database take up to about a minute to wake up. The first requests can time out or return 502/503. Handling this gracefully (a splash screen, retries, a health check) is the next item in `PLAN.md`.
- **No request timeout:** `fetch` has no timeout today, so a hung connection leaves a page loading.
- **Bearer tokens** are for non-browser clients. The frontend relies on cookies only.
- **The contract leads the backend.** A contract change can land here before the backend implements it, so check the backend's status in `PLAN.md` before relying on a new endpoint in production.
