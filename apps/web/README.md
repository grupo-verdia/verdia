# verdia web (`apps/web`)

Next.js (TypeScript) product surface: dashboard, map, planning, observability
(later tickets), gated by a single shared password.

## Local

```bash
cp .env.example .env.local   # set DEMO_PASSWORD
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Without Supabase env vars,
the BFF uses an **in-memory** store (fine for local demos; data resets on restart).

### Persist capturas (seed via BFF)

After logging in (cookie required for browser calls; curl can hit the API directly
in local/dev because the password gate runs in `proxy` — use a session cookie or
call from the logged-in browser):

```bash
curl -X POST http://localhost:3000/api/capturas \
  -H 'content-type: application/json' \
  -H "cookie: verdia_session=<token-from-login>" \
  -d '{
    "lat": -23.55,
    "lon": -46.63,
    "capturedAt": "2026-07-20T12:00:00.000Z",
    "classe": "alta",
    "confidence": 0.91,
    "modelVersion": "stub-0.1",
    "imageBase64": "'"$(printf 'fake' | base64)"'",
    "contentType": "image/jpeg"
  }'
```

The password-gated home dashboard lists capturas with their `classe`.

### Supabase

1. Apply [`supabase/migrations/20260720120000_capturas_trechos.sql`](../../supabase/migrations/20260720120000_capturas_trechos.sql).
2. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.

```bash
npm test
npm run typecheck
```

See the [repo README](../../README.md) for running the ML service alongside this app.
