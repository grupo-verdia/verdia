# verdia web (`apps/web`)

Next.js (TypeScript) product surface: dashboard, map, planning, observability,
gated by a single shared password.

## Local

```bash
cp .env.example .env.local   # set DEMO_PASSWORD, SUPABASE_URL, SUPABASE_SECRET_KEY
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The BFF requires Supabase
env vars. Apply migrations, then use **Nova captura** or **Rodovias e planilhas**
to add data.

Nova captura uses Google AI Studio when `GOOGLE_API_KEY` is set in `.env.local`.
Without it, classification falls back to the local Python URL or a filename stub.

### Mapa de trechos

Password-gated [`/mapa`](http://localhost:3000/mapa) plots each captura (no
PostGIS). Markers are colored by classe. [`/planejamento`](http://localhost:3000/planejamento)
is the maintenance queue (severidade, then rodovia, then KM) with ordem on the map.

### Supabase

1. Apply migrations under [`supabase/migrations/`](../../supabase/migrations/) in
   timestamp order.
2. Set `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in `.env.local` (Dashboard → API
   Keys → secret key `sb_secret_…`).

```bash
npm test
npm run typecheck
```

See the [repo README](../../README.md) for running the ML service alongside this app.
