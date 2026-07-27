# test-consume-data-protos

React + TypeScript + MUI + Vite app that visualizes test data published by
[`test-publish-data-protos`](https://github.com/subhajitdas298/test-publish-data-protos),
using the generated TypeScript symbols from
[`@subhajitdas298/test-data-protos`](https://github.com/subhajitdas298/test-data-protos)
to decode the protobuf representation.

`test-publish-data-protos` exposes a single endpoint, `GET /api/data`, that
returns the same dataset in two representations chosen by the `Accept`
header: raw protobuf binary (`application/x-protobuf`) or JSON
(`application/json`). This app has a home screen with two cards, one per
representation:

- **Binary (Protobuf)** (`/binary`) — fetches the protobuf bytes and decodes
  them with `fromBinary(RootSchema, bytes)`.
- **JSON** (`/json`) — fetches the JSON representation and uses it directly
  (same shape, no decoding needed).

Both routes render an identical line chart (recharts) of the raw values for a
selected day/field, with drag-to-zoom via a Brush control — the two pages
share the same `DataVisualizer` component, `useRootData` hook, and `TopBar`;
only the fetch function passed in differs.

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

The dev server proxies `/api/*` to `http://localhost:8080` (see
`vite.config.ts`), so run the [`test-publish-data-protos`](https://github.com/subhajitdas298/test-publish-data-protos)
Spring Boot service locally on port 8080 (`./gradlew bootRun`) before loading
the page — this sidesteps CORS entirely since the browser only ever talks to
the Vite origin.

Open http://localhost:5173.

## Tech stack

- React 19 + TypeScript, scaffolded with Vite
- React Router for the two routes (`/binary`, `/json`) plus the home screen
- MUI (Material UI) for the UI
- recharts for the zoomable line chart
- `@subhajitdas298/test-data-protos` + `@bufbuild/protobuf` for decoding the
  protobuf payload
