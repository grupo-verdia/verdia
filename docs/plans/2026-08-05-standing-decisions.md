# Standing decisions (2026-08-05)

Living notes (not ADRs). New durable notes go in `docs/plans/YYYY-MM-DD-…`.

## Stack

- `apps/web` — Next.js (TypeScript) BFF + UI; access gated by a **shared password** (`DEMO_PASSWORD`). Real auth later.
- `services/ai` — Python VLM prototype (`verdia_ai`); HTTP `/infer` deferred.
- **Data:** Supabase (Postgres metadata/predictions; Storage for images). Lat/lon columns; no PostGIS for MVP.

## Ingest

- **Nova captura** is the only ingest path (browser multi-select geotagged upload). No CLI ingest / sample-route replay.
- Missing/invalid GPS rejects that file. One captura → one trecho (default **500 m**).

## Deploy

- Web → **Vercel**; data → hosted **Supabase**. AI Render hosting deferred with the HTTP API. Runbook: `docs/DEPLOY.md`.

## PR CI gate

- GitHub Actions on PRs only, path-filtered; require aggregate job **`CI`** for branch protection.
- **Web:** ESLint (anti-slop) · tsc · Vitest · file ≤ 400 lines · function ≤ 150 (ratchet toward 50).
- **AI:** Ruff check + format · pytest · file ≤ 500 · function ≤ 60. No mypy in v1.
- Function-size counting differs by stack (ESLint skips blanks/comments; Python AST counts full span). Source of truth: `.github/workflows/ci.yml`.

## Abandoned (do not revive without a new plan)

- Hybrid CV (segmentação + frozen ordinal head), Colab→Render CPU train/serve, TAS500/forefield/cobertura label story.
