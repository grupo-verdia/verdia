# Fully live deploy (Vercel + Supabase + Render)

Prepare-in-repo runbook for issue #10 / ADR-0004. **Humans** create the cloud
projects and paste secrets; Git auto-deploy handles later pushes.

**Status (2026-08):** AI HTTP Inference API + Render Blueprint (`render.yaml` /
`services/ai/Dockerfile`) are **deferred** while the VLM prototype lives as CLI +
notebook only. Sections below keep the historical Vercel + Supabase + Render shape
for when an API returns.

## Stack

| Piece | Host | Notes |
|-------|------|--------|
| Web (`apps/web`) | **Vercel** | Root Directory = `apps/web`; password gate via `DEMO_PASSWORD` |
| Data | **Hosted Supabase** | Postgres + Storage; apply migrations in order |
| Inference API (`services/ai`) | **Render Free (deferred)** | Was Docker via `render.yaml`; reintroduce with a new API shape later |

Public URLs use provider defaults (`*.vercel.app`, `*.onrender.com`). No custom domain.

## 1. Supabase (data plane)

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

## 2. Render (Inference API) — deferred

HTTP `/infer` + Dockerfile + `render.yaml` were removed with the hand-CV path.
Reintroduce hosting only after the VLM prototype is wired into a new API shape.

~~Previous steps: Blueprint from `render.yaml`, set `INFERENCE_API_KEY`, health on
`GET /health`, auth on `POST /infer`.~~

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

## 4. Live E2E verification — deferred

`npm run simulate-ingest` exits until an Inference HTTP API returns. Presenters can
still use the Vercel URL + `DEMO_PASSWORD` for the web UI; seed capturas via BFF or
Supabase if needed.

## 5. Local development

- AI: VLM CLI / notebook (`services/ai/README.md`). No local `:8000` server.
- Web: see root [`README.md`](../README.md) and [`apps/web/.env.example`](../apps/web/.env.example).

## Env cheat sheet

| Variable | Where |
|----------|--------|
| `DEMO_PASSWORD` | Vercel + local web |
| `SUPABASE_URL` | Vercel (+ local if not using in-memory) |
| `SUPABASE_SECRET_KEY` | Vercel (+ local) |
| `GOOGLE_API_KEY` | Local AI VLM live calls (`services/ai`) |
| `INFERENCE_*` / `WEB_URL` | Historical simulador → live stack (deferred) |
