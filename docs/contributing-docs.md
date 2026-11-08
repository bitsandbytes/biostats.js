# Working on these docs

The site is [VitePress](https://vitepress.dev/), built from `docs/` and published to GitHub Pages at `https://bitsandbytes.github.io/biostats.js/`.

## Local build and preview

```bash
npm install            # vitepress is a devDependency
npm run docs:dev       # live-reloading dev server, http://localhost:5173/biostats.js/
npm run docs:build     # production build → docs/.vitepress/dist (fails on dead internal links)
npm run docs:preview   # serve the built site, http://localhost:4173/biostats.js/
```

`docs/.vitepress/dist` and `docs/.vitepress/cache` are gitignored.

## Layout

| Path | What |
|---|---|
| `docs/.vitepress/config.mjs` | Title, `base: '/biostats.js/'`, nav, sidebar, search, edit links |
| `docs/*.md` | Pages. Add new ones to the sidebar in `config.mjs`. |
| `docs/public/` | Copied as-is: `favicon.svg`, `swagger/index.html` |

## Publishing

`.github/workflows/docs.yml`:

| Event | Result |
|---|---|
| Push to `main` | Build, then deploy to GitHub Pages |
| Pull request to `main` | Build only, so broken links fail the check |
| Manual (`workflow_dispatch`) | Build, then deploy |

Day-to-day work happens on `develop`. Docs go live when a release merges into `main`.

### One-time setup

1. In the GitHub repo, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
2. To deploy from a branch other than `main`, add it to the `github-pages` environment's deployment branch rules (**Settings → Environments → github-pages**).

::: danger Pages sites are public
The published site is public even if the repository is private. Never put secrets, passwords, connection strings, internal hostnames or real user data in these pages. Use placeholders such as `https://api.example.com` and `you@example.com`.
:::

## Conventions

- Write for developers working on the frontend. User-facing help belongs in the README or in the app itself.
- Base every statement on the code, and name the file (`src/lib/api.js`) so readers can check it.
- `API_CONTRACT.md` is the source of truth for the API. Link to it rather than copying endpoint details, and keep [Backend integration](./integration) in line with it.
- Update the docs in the same change as the code: auth, errors, configuration, deployment, or a new page or route.
- Link to the backend's docs site for anything the backend owns, such as its database, environment variables and Render setup.
