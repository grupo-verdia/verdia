# verdia

Academic Motiva demo: geotagged roadside photos → vegetation classe (`baixa` <
`média` < `alta`) → maintenance priority for **trechos**.

Monorepo layout:

| Path | Role |
|------|------|
| `apps/web` | Next.js (TypeScript) product + BFF, shared-password gate |
| `services/ml` | Python Inference API (segmentação + classificador ordinal) |
| `services/ml/data` | Public-dataset roles, cobertura thresholds, eval fixtures |

Domain glossary and ADRs: [`CONTEXT.md`](./CONTEXT.md), [`docs/adr/`](./docs/adr/).

## Prerequisites

- Node.js 22+ and npm
- Python 3.12+ and [uv](https://docs.astral.sh/uv/)

## Run locally

### 1. Inference API (`services/ml`)

```bash
cd services/ml
uv sync
uv run python -m verdia_ml
```

Health check: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

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

With both services running, replay the sample capturas (geotagged PNGs under
`apps/web/fixtures/capturas/`):

```bash
cd apps/web
set -a && source .env.local && set +a
npm run simulate-ingest
```

Successful predictions persist through the BFF and show on the dashboard. Failed
inferences are kept with an `inferenceError` signal (not silently dropped).

Tests / typecheck:

```bash
cd apps/web
npm test
npm run typecheck
```

## Spec / tickets

Parent spec: GitHub issue #1. Tracer tickets `#2`–`#12` implement fronts from
`CONTEXT.md`.
