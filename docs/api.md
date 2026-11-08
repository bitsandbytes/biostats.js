# API reference (Swagger)

The REST API is implemented by the backend, which generates an OpenAPI 3 spec from its Spring controllers with springdoc. This site doesn't keep its own copy. Its Swagger page loads the spec that the backend's docs site publishes.

- <a href="/biostats.js/swagger/" target="_self"><strong>Open Swagger UI</strong></a>: this site's static Swagger UI.
- [Raw spec (`openapi.json`)](https://bitsandbytes.github.io/biostats-service/openapi/openapi.json), published by the backend's docs build.
- [Backend API reference page](https://bitsandbytes.github.io/biostats-service/api/): how the spec is generated and how to use it.

::: warning The contract is the source of truth
[`API_CONTRACT.md`](https://github.com/bitsandbytes/biostats.js/blob/main/API_CONTRACT.md) in this repo defines the API. The published spec reflects the backend's `main` branch, so it can lag behind the contract. For example, `POST /api/auth/refresh` is in the contract and in `src/lib/api.js` before it appears in the published spec. When they disagree, the contract wins, and the backend has work to do.
:::

## Live endpoints on a running backend

| URL | What |
|---|---|
| `https://localhost:9443/swagger-ui/index.html` | Interactive Swagger UI for the running app |
| `https://localhost:9443/v3/api-docs` | The live spec (JSON) |

Both are public (no login) and can be switched off with `API_DOCS_ENABLED=false` on the backend.

## Authorizing in Swagger UI

1. Expand `POST /api/auth/login`, click **Try it out**, send your email and password, and copy the `token` from the response.
2. Click **Authorize** at the top and paste the token as the Bearer token.
3. "Try it out" requests now send `Authorization: Bearer <token>`. Tokens expire after 15 minutes by default; log in again to get a new one. The refresh flow is cookie-based and meant for the browser app.

On this static page, "Try it out" sends requests to the spec's `servers` entry, `https://localhost:9443`. That only works when a backend is running on your machine and your browser has accepted its self-signed certificate. Open that URL once and accept the certificate first.

## How it's generated

1. The backend's `OpenApiDocsTest` boots the app against a Testcontainers Postgres, fetches `/v3/api-docs`, and writes `target/openapi/openapi.json`.
2. The backend's docs workflow copies it to its Pages site at `/biostats-service/openapi/openapi.json`.
3. `docs/public/swagger/index.html` in this repo loads that URL with a pinned `swagger-ui-dist`. Both sites are on `bitsandbytes.github.io`, and GitHub Pages sends `Access-Control-Allow-Origin: *`, so it also works from `npm run docs:dev`.

## Adding or changing an endpoint

1. Update `API_CONTRACT.md` first: method, path, auth, request and response bodies, and error statuses.
2. Write or update tests in this repo, then add the call to `src/lib/api.js` and a matching handler in `src/mocks/handlers.js`.
3. Implement it in the backend, with springdoc annotations for non-200 success codes. The spec, and this site's Swagger page, update when the backend's `main` branch deploys its docs.
4. If the change affects auth, errors or CORS, update [Backend integration](./integration) too.
