# verdia

Academic Motiva demo: geotagged roadside photos → vegetation classe (`baixa` <
`média` < `alta`) → maintenance priority for **trechos**.

Monorepo layout:

| Path | Role |
|------|------|
| `apps/web` | Next.js (TypeScript) product + BFF, shared-password gate |
| `services/ai` | Python VLM grass classifier + Inference HTTP |

Domain glossary: [`CONTEXT.md`](./CONTEXT.md). Standing decisions / plans: [`docs/plans/`](./docs/plans/).


## Prerequisites

- Node.js 22+ and npm
- Python 3.12+ and [uv](https://docs.astral.sh/uv/)

## Run locally

### 1. AI VLM + Inference API (`services/ai`)

```bash
cd services/ai
uv sync
# Inference HTTP for the web app (fake mode needs no Google key)
VLM_FAKE=1 uv run python -m verdia_ai serve
```

In another terminal, point the web BFF at it (`apps/web/.env.local`):

```bash
VLM_INFERENCE_URL=http://127.0.0.1:8000
```

Live VLM: set `GOOGLE_API_KEY` and omit `VLM_FAKE`. CLI folder classify still works:

```bash
VLM_FAKE=1 uv run python -m verdia_ai.classify path/to/photos --summary
```

Details: [`services/ai/README.md`](./services/ai/README.md).

Tests:

```bash
cd services/ai
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

Tests / typecheck:

```bash
cd apps/web
npm test
npm run typecheck
```

## Fully live deploy

Shareable Motiva demo stack (Vercel + hosted Supabase). See
[`docs/DEPLOY.md`](./docs/DEPLOY.md).
