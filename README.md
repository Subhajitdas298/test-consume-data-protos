# test-consume-data-protos

React + TypeScript + MUI + Vite app that visualizes test data published by two
sibling services — [`test-publish-data-protos`](https://github.com/subhajitdas298/test-publish-data-protos)
(Spring MVC) and [`test-publish-data-protos-webflux`](https://github.com/subhajitdas298/test-publish-data-protos-webflux)
(Spring WebFlux) — using the generated TypeScript symbols from
[`@subhajitdas298/test-data-protos`](https://github.com/subhajitdas298/test-data-protos)
to decode the protobuf representation.

Both backends serve the identical dataset from their own public Azure Container
Apps URL:

| Backend | URL |
|---|---|
| Spring MVC | `https://data-protos.gentlepond-37bc0af9.eastus.azurecontainerapps.io` |
| Spring WebFlux | `https://data-protos-webflux.gentlepond-37bc0af9.eastus.azurecontainerapps.io` |

A toggle in the top bar (present on every screen) switches which backend the app
fetches from; switching it re-fetches immediately. Both backends expose the same
single endpoint, `GET /api/data`, that returns the dataset either as raw
protobuf binary or as JSON, chosen via the `Accept` header — the home screen has
a card per representation:

- **Binary (Protobuf)** (`/#/binary`) — decoded with `fromBinary(RootSchema, bytes)`.
- **JSON** (`/#/json`) — used directly, same `Root` shape, no decoding needed.

Both routes render an identical line chart (recharts) of the raw values for a
selected day/field, with drag-to-zoom via a Brush control — the two pages share
the same `DataVisualizer` component, `useRootData` hook, and `Page`/`TopBar`;
only the fetch function passed in differs. Which backend to hit is app-wide
state (`DataSourceContext`), shared by the top bar toggle and both routes.

Since the app fetches directly from the two Azure Container Apps URLs from
whatever origin it's hosted on, both backends have CORS enabled (`@CrossOrigin`)
for any origin — matching their existing fully-open, unauthenticated API design.

## Prerequisites

`@subhajitdas298/test-data-protos` is published to the **GitHub Packages npm
registry**, which requires authentication to install even though the package
itself is public. Create a GitHub personal access token with the
`read:packages` scope, then export it before installing:

```bash
export GITHUB_TOKEN=<your-personal-access-token>
```

The project's `.npmrc` picks it up automatically:

```
@subhajitdas298:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:5173. No local backend or dev proxy needed — the app
talks directly to the two Azure-hosted backends over the internet.

## Deployment (GitHub Pages)

[`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) builds
the app and deploys `dist/` to GitHub Pages on every push to `main` (including a
merged PR) and via manual `workflow_dispatch`. The app uses `HashRouter` and a
relative Vite `base` so it works correctly as a static site under a GitHub
Pages project path (no server-side rewrites needed for client-side routing).

This can't be fully wired up from this session — add this secret yourself in
**Settings → Secrets and variables → Actions → Secrets** so the workflow can
install `@subhajitdas298/test-data-protos` from GitHub Packages:

| Secret | Value |
|---|---|
| `PACKAGES_READ_TOKEN` | a GitHub PAT with `read:packages` scope |

Also enable Pages once in **Settings → Pages → Build and deployment → Source:
GitHub Actions** if it isn't already. After that, every push to `main` deploys
automatically.

## Tech stack

- React 19 + TypeScript, scaffolded with Vite
- React Router (`HashRouter`) for the two routes (`/binary`, `/json`) plus the
  home screen — hash-based so it works on static hosting without server rewrites
- MUI (Material UI) for the UI
- recharts for the zoomable line chart
- `@subhajitdas298/test-data-protos` + `@bufbuild/protobuf` for decoding the
  protobuf payload
