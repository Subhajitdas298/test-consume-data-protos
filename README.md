# test-consume-data-protos

React + TypeScript + MUI + Vite app that consumes protobuf-encoded test data
published by [`test-publish-data-protos`](https://github.com/subhajitdas298/test-publish-data-protos),
decoding it with the generated TypeScript symbols from
[`@subhajitdas298/test-data-protos`](https://github.com/subhajitdas298/test-data-protos).

The app fetches the `Root` protobuf message from `GET /api/data`, decodes it
with `fromBinary(RootSchema, bytes)`, computes per-day/per-field min/max/avg/count,
and renders it in an MUI table.

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
- MUI (Material UI) for the UI
- `@subhajitdas298/test-data-protos` + `@bufbuild/protobuf` for decoding the
  protobuf payload
