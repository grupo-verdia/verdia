# verdia

Academic Motiva demo: geotagged roadside photos → vegetation classe (`baixa` <
`média` < `alta`) → maintenance priority for **trechos**.

Monorepo layout:

| Path | Role |
|------|------|
| `apps/web` | Next.js (TypeScript) product + BFF, shared-password gate |
| `services/ml` | Python Inference API (segmentação + classificador ordinal) |

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
redirected to `/login`; the shared `DEMO_PASSWORD` unlocks the app.

Tests / typecheck:

```bash
cd apps/web
npm test
npm run typecheck
```

## Spec / tickets

Parent spec: GitHub issue #1. Tracer tickets `#2`–`#12` implement fronts from
`CONTEXT.md`.
