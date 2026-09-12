# verdia web (`apps/web`)

Operator app for Motiva roadside vegetation. Portuguese UI, shared
`DEMO_PASSWORD`. It is the same website on phones. Below ~700px, navigation
is a bottom bar, not a separate app. A geotagged photo becomes a captura,
gets a classe, and shows up on the dashboard, map, and planejamento.

Domain terms: [`CONTEXT.md`](../../CONTEXT.md). Repo runbook:
[`README.md`](../../README.md).

## Screens

| Route | Label |
|------|--------|
| `/` | Visão geral |
| `/nova-captura` | Nova captura (upload de fotos) |
| `/mapa` | Mapa (marcadores por classe; clique mostra a foto) |
| `/rodovias` | Rodovias (lista com foto, Excel + correção da classe) |
| `/planejamento` | Planejamento (severidade, depois rodovia, depois km) |
| `/observabilidade` | Observabilidade |

Nova captura prefers EXIF GPS. Type lat/lon if the file has none. Photos are
saved first, then classified. Close the tab: photos stay. Continue on Nova
captura. Excel import/export is on Rodovias. Imported rows have no photo (Sem imagem).
Classe correction is on the captura page.

## Local

```bash
cp .env.example .env.local   # DEMO_PASSWORD, SUPABASE_URL, SUPABASE_SECRET_KEY; optional GOOGLE_API_KEY
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The BFF requires Supabase
env vars. Apply migrations, then add data via **Nova captura** or **Rodovias**.

Classification: `GOOGLE_API_KEY` (Google AI Studio) → else `VLM_INFERENCE_URL`
(local Python). If neither is set, Nova captura fails. Failed inference still
saves the captura. Apply the SQL in `supabase/migrations/` in timestamp order.

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
