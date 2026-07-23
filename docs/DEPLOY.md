# Fully live deploy (Vercel + Supabase + Render)

Prepare-in-repo runbook for issue #10 / ADR-0004. **Humans** create the cloud
projects and paste secrets; Git auto-deploy handles later pushes.

## Stack

| Piece | Host | Notes |
|-------|------|--------|
| Web (`apps/web`) | **Vercel** | Root Directory = `apps/web`; password gate via `DEMO_PASSWORD` |
| Data | **Hosted Supabase** | Postgres + Storage; apply migrations in order |
| Inference API (`services/ml`) | **Render Free** | Docker via [`render.yaml`](../render.yaml); sleeps after idle (cold starts OK) |

Public URLs use provider defaults (`*.vercel.app`, `*.onrender.com`). No custom domain.

## 1. Supabase (data plane)

1. Create a Supabase project.
2. In the SQL editor (or CLI), apply migrations in order from [`supabase/migrations/`](../supabase/migrations/):
   - `20260720120000_capturas_trechos.sql`
   - `20260720140000_capturas_inference_error.sql`
   - `20260720160000_capturas_overlay.sql`
3. Confirm Storage bucket `capturas` exists (created by the first migration).
4. Copy **Project URL** and a **secret** key (`sb_secret_…`) from Settings → API Keys.
   Disable the legacy JWT `anon` / `service_role` keys once nothing depends on them.

## 2. Render (Inference API)

1. In [Render](https://render.com), **New → Blueprint** and connect this GitHub repo.
2. Render reads [`render.yaml`](../render.yaml): Free web service, Docker build from `services/ml`.
3. Set secret env var **`INFERENCE_API_KEY`** to a long random string (same value you will use locally for the simulador).
4. Deploy. Note the service URL, e.g. `https://verdia-ml.onrender.com`.
5. Check `GET /health` (public, no auth). `POST /infer` requires `Authorization: Bearer <INFERENCE_API_KEY>`.

Auto-deploy: later pushes to the connected branch rebuild the service.

## 3. Vercel (web)

1. **New Project** → import this repo.
2. Set **Root Directory** to `apps/web`.
3. Framework: Next.js (default).
4. Environment variables:

   | Name | Value |
   |------|--------|
   | `DEMO_PASSWORD` | Shared demo password |
   | `SUPABASE_URL` | From Supabase |
   | `SUPABASE_SECRET_KEY` | From Supabase secret key `sb_secret_…` (server-only; never expose to the browser) |

5. Deploy. Note the URL, e.g. `https://verdia-….vercel.app`.

The web app does **not** call the Inference API directly. Only the simulador (CLI) does.

Auto-deploy: later pushes to the connected branch redeploy the web app.

## 4. Live E2E verification (local simulador → live stack)

Presenters only need the Vercel URL + `DEMO_PASSWORD`. To prove captura → inference → dashboard against the **live** stack, run the simulador from your machine:

```bash
cd apps/web
export DEMO_PASSWORD='…'          # same as Vercel
export WEB_URL='https://….vercel.app'
export INFERENCE_URL='https://….onrender.com'
export INFERENCE_API_KEY='…'      # same as Render
npm run simulate-ingest
```

Then open `$WEB_URL/`, log in, and confirm the new capturas (and any `inferenceError` rows).

First request after Render idle may take ~1 minute (Free spin-up).

## 5. Local development (unchanged)

- Omit `INFERENCE_API_KEY` on the ML process to keep `POST /infer` open for local curl.
- Set the key on both ML and the simulador when you want to exercise auth locally.
- See root [`README.md`](../README.md) and [`apps/web/.env.example`](../apps/web/.env.example).

## Env cheat sheet

| Variable | Where |
|----------|--------|
| `DEMO_PASSWORD` | Vercel + local web / simulador |
| `SUPABASE_URL` | Vercel (+ local if not using in-memory) |
| `SUPABASE_SECRET_KEY` | Vercel (+ local) |
| `INFERENCE_API_KEY` | Render (+ local ML when testing auth; simulador when calling a keyed API) |
| `INFERENCE_URL` | Local simulador only (points at Render for live E2E) |
| `WEB_URL` | Local simulador only (points at Vercel for live E2E) |
