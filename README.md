# verdia

verdia classifies roadside grass height from a geotagged photo so Motiva can
prioritize mowing. Today that work is done by eye ("olhômetro").

[Motiva](https://www.motiva.com.br/) (formerly Grupo CCR) runs highway, rail, and
airport concessions. verdia is only for vegetação na margem de rodovias:
classe → severidade → planejamento.

We do not have Motiva's real data. Photos are generic geotagged laterals.
We do not assume a 360 camera.

Flow: upload or Excel import → classify → persist → dashboard / map /
planejamento. Glossary: [`CONTEXT.md`](./CONTEXT.md).

## Product

A **captura** is one geotagged, timestamped photo. No GPS, no captura (EXIF, or
the operator types lat/lon). Each captura defines one **trecho** of 500 m.

**Classe** is an ordered height scale from Motiva bands: below 10 cm `baixa`,
10-30 cm `média`, above 30 cm `alta`. Null only when the roadside strip is not
visible or has no grass. **Severidade** follows classe (`alta` first).

Screens (UI in Portuguese): **Visão geral**, **Nova captura**, **Mapa**,
**Rodovias e planilhas** (Excel + correção da classe), **Planejamento**,
**Observabilidade**.

Not built: video + GPS sync, drift detection, route optimization, Supabase Auth.

## Layout

| Path | Role |
|------|------|
| `apps/web` | Next.js (TypeScript) app + BFF, shared-password gate |
| `services/ai` | Python VLM grass classifier + optional Inference HTTP |

## Prerequisites

- Node.js 22+ and npm
- Python 3.12+ and [uv](https://docs.astral.sh/uv/)
- Supabase (hosted or `supabase start`) for the web app

## Run locally

### 1. AI VLM + Inference API (`services/ai`)

```bash
cd services/ai
uv sync
# Optional: Inference HTTP for the web app when GOOGLE_API_KEY is unset
VLM_FAKE=1 uv run python -m verdia_ai serve
```

For the live classifier in the web app (Vercel and local Nova captura), set
`GOOGLE_API_KEY` in `apps/web/.env.local` (and on Vercel). Same key as
`services/ai/.env`. Do not set `VLM_INFERENCE_URL` on Vercel.

To use the local Python server instead, omit `GOOGLE_API_KEY` on the web
process and point at it:

```bash
VLM_INFERENCE_URL=http://127.0.0.1:8000
```

Python CLI folder classify still works:

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
cp .env.example .env.local   # set DEMO_PASSWORD, SUPABASE_URL, SUPABASE_SECRET_KEY
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Unauthenticated requests go
to `/login`; the shared `DEMO_PASSWORD` unlocks the app. The home dashboard lists
persisted **capturas** from Supabase (apply `supabase/migrations/` first).
Without those env vars the app does not start a store.

Tests / typecheck:

```bash
cd apps/web
npm test
npm run typecheck
```

## Deploy

Vercel + hosted Supabase. Nova captura on Vercel classifies with `GOOGLE_API_KEY`.
