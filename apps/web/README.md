# verdia web (`apps/web`)

Operator app for Motiva roadside vegetation. Portuguese UI, shared
`DEMO_PASSWORD`. A geotagged photo becomes a captura, gets a classe, and shows
up on the dashboard, map, and planejamento.

Domain terms: [`CONTEXT.md`](../../CONTEXT.md). Repo runbook:
[`README.md`](../../README.md).

## Screens

| Route | Label |
|------|--------|
| `/` | Visão geral |
| `/nova-captura` | Nova captura (upload de fotos) |
| `/mapa` | Mapa (marcadores por classe, sem PostGIS) |
| `/rodovias` | Rodovias e planilhas (Excel + correção da classe) |
| `/planejamento` | Planejamento (severidade, depois rodovia, depois km) |
| `/observabilidade` | Observabilidade |

Nova captura prefers EXIF GPS; if missing, the operator can type latitude and
longitude. **Rodovias e planilhas** is also how you import/export Excel and
override a classe.

## Local

```bash
cp .env.example .env.local   # set DEMO_PASSWORD, SUPABASE_URL, SUPABASE_SECRET_KEY
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The BFF requires Supabase
env vars. Apply migrations, then add data via **Nova captura** or **Rodovias e
planilhas**.

Classification: `GOOGLE_API_KEY` (Google AI Studio) → else `VLM_INFERENCE_URL`
(local Python). If neither is set, Nova captura fails. Failed inference still
saves the captura.

### Supabase

1. Apply migrations under [`supabase/migrations/`](../../supabase/migrations/) in
   timestamp order.
2. Set `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in `.env.local` (Dashboard → API
   Keys → secret key `sb_secret_…`).

```bash
npm test
npm run typecheck
```

The running app needs Supabase. Tests inject an in-memory store. To run the
Python classifier beside this app, see the [repo README](../../README.md).
