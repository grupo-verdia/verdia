# verdia

Academic Motiva demo: geotagged roadside photos → vegetation classe (`baixa` <
`média` < `alta`) → maintenance priority for **trechos**.

Monorepo layout:

| Path | Role |
|------|------|
| `apps/web` | Next.js (TypeScript) product + BFF, shared-password gate |
| `services/ml` | Python VLM grass classifier prototype (CLI + notebook; HTTP deferred) |

Domain glossary and ADRs: [`CONTEXT.md`](./CONTEXT.md), [`docs/adr/`](./docs/adr/).

## Prerequisites

- Node.js 22+ and npm
- Python 3.12+ and [uv](https://docs.astral.sh/uv/)

## Run locally

### 1. ML VLM prototype (`services/ml`)

```bash
cd services/ml
uv sync
VLM_FAKE=1 uv run python -m verdia_ml.classify path/to/photos --summary
```

HTTP Inference API serve is **deferred**. Details: [`services/ml/README.md`](./services/ml/README.md).

Tests:

```bash
cd services/ml
uv run pytest
```

### 2. Web app (`apps/web`)

```bash
cd apps/web
cp .env.example .env.local   # set DEMO_PASSWORD
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Unauthenticated requests are
redirected to `/login`; the shared `DEMO_PASSWORD` unlocks the app. The home
dashboard lists persisted **capturas** (in-memory by default; set Supabase env
vars after applying `supabase/migrations/`).

### 3. Simulador de ingestão

**Deferred** — needs the HTTP Inference API (`POST /infer`), which is not shipped
this week. The CLI exits with a clear message until a new API shape lands.

Tests / typecheck:

```bash
cd apps/web
npm test
npm run typecheck
```

## Fully live deploy

Shareable Motiva demo stack (Vercel + hosted Supabase); ML Render hosting is
deferred with the HTTP API. See [`docs/DEPLOY.md`](./docs/DEPLOY.md).

## Spec / tickets

Parent spec: GitHub issue #1. Tracer tickets `#2`–`#12` implement fronts from
`CONTEXT.md`.
