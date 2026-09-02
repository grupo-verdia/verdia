# Fully live deploy (Vercel + Supabase)

Create the Vercel and Supabase projects, set env vars, then push. Later commits
auto-deploy the web app.

On Vercel, Nova captura calls Google with `GOOGLE_API_KEY`. Do not set
`VLM_INFERENCE_URL` on Vercel. Python `serve` stays local (CLI / notebook).

## Stack

| Piece | Host | Notes |
|-------|------|--------|
| Web (`apps/web`) | **Vercel** | Root Directory = `apps/web`; password gate via `DEMO_PASSWORD` |
| Data | **Hosted Supabase** | Postgres + Storage; apply migrations in order |
| AI | **Google AI Studio** | Nova captura calls Google from the Vercel ingest route |

Public URL uses the provider default (`*.vercel.app`). No custom domain.

## 1. Supabase

1. Create a Supabase project.
2. In the SQL editor (or CLI), apply migrations in order from [`supabase/migrations/`](../supabase/migrations/):
   - `20260720120000_capturas_trechos.sql`
   - `20260720140000_capturas_inference_error.sql`
   - `20260720160000_capturas_overlay.sql`
   - `20260721100000_trechos_length_meters.sql`
   - `20260805140000_drop_capturas_overlay.sql`
3. Confirm Storage bucket `capturas` exists (created by the first migration).
4. Copy **Project URL** and a **secret** key (`sb_secret_…`) from Settings → API Keys.
   Disable the legacy JWT `anon` / `service_role` keys once nothing depends on them.

## 2. Vercel (web)

1. **New Project** → import this repo.
2. Set **Root Directory** to `apps/web`.
3. Framework: Next.js (default).
4. Environment variables:

   | Name | Value |
   |------|--------|
   | `DEMO_PASSWORD` | Shared password |
   | `SUPABASE_URL` | From Supabase |
   | `SUPABASE_SECRET_KEY` | From Supabase |
   | `GOOGLE_API_KEY` | Google AI Studio key (Nova captura live classify) |

5. Deploy. Note the URL, e.g. `https://verdia-….vercel.app`.

Auto-deploy: later pushes to the connected branch redeploy the web app.

## 3. Access

Use the Vercel URL + `DEMO_PASSWORD`. Capturas persist in Supabase.

## 4. Local development

- AI: Inference HTTP + CLI (`services/ai/README.md`).
- Web: see root [`README.md`](../README.md) and [`apps/web/.env.example`](../apps/web/.env.example).

## Env cheat sheet

| Variable | Where |
|----------|--------|
| `DEMO_PASSWORD` | Vercel + local web |
| `SUPABASE_URL` | Vercel + local web |
| `SUPABASE_SECRET_KEY` | Vercel (+ local) |
| `VLM_INFERENCE_URL` | Local web only → Python `serve` (ignored if `GOOGLE_API_KEY` is set) |
| `GOOGLE_API_KEY` | Vercel + local web (Nova captura); also local Python VLM |
| `VLM_FAKE` | Local Python offline stub (`1`) |
