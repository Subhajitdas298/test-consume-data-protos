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

## Deployment (Azure Storage static website)

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds the app
and uploads `dist/` to an Azure Storage static website on every push to `main`
(including a merged PR) and via manual `workflow_dispatch`.

It authenticates to Azure with OIDC (`azure/login`, no client secret stored in
GitHub) — same pattern as
[`test-publish-data-protos`](https://github.com/subhajitdas298/test-publish-data-protos)
and
[`test-publish-data-protos-webflux`](https://github.com/subhajitdas298/test-publish-data-protos-webflux).

The app uses `HashRouter` and a relative Vite `base`, so `index.html` doubles
as the static site's 404 document with no server-side rewrites needed —
routing is entirely client-side after the `#`.

### Azure resources you need to create once

Reuses the same resource group as the two backend services (`data-protos`),
so no new resource group or subscription is needed:

```bash
SUBSCRIPTION_ID=cfb23074-9c21-4bc5-aecb-4845d97a147e   # same subscription as the backends
RESOURCE_GROUP=data-protos                              # shared, already exists
LOCATION=eastus
STORAGE_ACCOUNT_NAME=<globally-unique-name>             # e.g. dataprotosstatic1234

az account set --subscription "$SUBSCRIPTION_ID"

# Storage account (Standard LRS — cheapest tier with static website support)
az storage account create \
  --name "$STORAGE_ACCOUNT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --sku Standard_LRS \
  --kind StorageV2

# Enable static website hosting. index.html doubles as the 404 document
# since the app uses HashRouter — there's never a real 404 to serve, all
# routing happens client-side after the hash.
az storage blob service-properties update \
  --account-name "$STORAGE_ACCOUNT_NAME" \
  --static-website \
  --index-document index.html \
  --404-document index.html

# Print the public URL once deployed
az storage account show \
  --name "$STORAGE_ACCOUNT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "primaryEndpoints.web" -o tsv
```

### Azure AD app registration for GitHub OIDC

```bash
APP_ID=$(az ad app create --display-name "gh-actions-test-consume-data-protos" --query appId -o tsv)
az ad sp create --id "$APP_ID"

az ad app federated-credential create --id "$APP_ID" --parameters '{
  "name": "github-main-branch",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:Subhajitdas298/test-consume-data-protos:ref:refs/heads/main",
  "audiences": ["api://AzureADTokenExchange"]
}'
```

> **Note:** if this GitHub account has the "use unique repository/owner ID in
> the subject claim" OIDC setting enabled (as it does for the two backend
> repos — see their READMEs), the actual subject GitHub sends is
> `repo:<owner>@<owner_id>/<repo>@<repo_id>:ref:refs/heads/main` instead of
> the plain form above — check the workflow's `azure/login` step for an
> `AADSTS700213` error to find the exact subject it presented, then add a
> second federated credential matching that subject.

```bash
# Let the CI identity write to the storage account's blobs, scoped to just
# this storage account (not the whole resource group)
STORAGE_ID=$(az storage account show --name "$STORAGE_ACCOUNT_NAME" --resource-group "$RESOURCE_GROUP" --query id -o tsv)
az role assignment create --assignee "$APP_ID" --role "Storage Blob Data Contributor" --scope "$STORAGE_ID"
```

### GitHub repo configuration

These can't be set via the GitHub tools available to this session (setting an
Actions secret requires client-side encryption with the repo's public key), so
add them yourself in the GitHub UI.

**Settings → Secrets and variables → Actions → Secrets:**

| Secret | Value |
|---|---|
| `AZURE_CLIENT_ID` | `$APP_ID` from above |
| `AZURE_TENANT_ID` | `86c9c0f2-9014-48a2-99e7-785b23ee2769` (same tenant as the backends) |
| `AZURE_SUBSCRIPTION_ID` | `cfb23074-9c21-4bc5-aecb-4845d97a147e` (same subscription as the backends) |
| `PACKAGES_READ_TOKEN` | a GitHub PAT with `read:packages` scope, so the workflow can install `@subhajitdas298/test-data-protos` |

**Settings → Secrets and variables → Actions → Variables:**

| Variable | Value |
|---|---|
| `AZURE_STORAGE_ACCOUNT_NAME` | the name you chose above |

Once those are set, any push to `main` (including a merged PR) triggers the
workflow and deploys to the storage account's static website URL.

## Tech stack

- React 19 + TypeScript, scaffolded with Vite
- React Router (`HashRouter`) for the two routes (`/binary`, `/json`) plus the
  home screen — hash-based so it works on static hosting without server rewrites
- MUI (Material UI) for the UI
- recharts for the zoomable line chart
- `@subhajitdas298/test-data-protos` + `@bufbuild/protobuf` for decoding the
  protobuf payload
