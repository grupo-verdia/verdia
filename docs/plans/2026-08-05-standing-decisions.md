# Standing decisions (2026-08-05)

Durable notes go in `docs/plans/YYYY-MM-DD-…`.

## Stack

- `apps/web` — Next.js (TypeScript) BFF + UI; access gated by a **shared password** (`DEMO_PASSWORD`). Real auth later.
- `services/ai` — Python VLM (`verdia_ai`) + lean Inference HTTP (`python -m verdia_ai serve`).
- **Data:** Supabase (Postgres metadata/predictions; Storage for images). Lat/lon columns; no PostGIS for MVP.

## Ingest

- **Nova captura** is the only photo ingest path (browser multi-select geotagged upload). No CLI ingest / sample-route replay.
- Missing/invalid GPS rejects that file. One captura → one trecho (default **500 m**).
- Route: `POST /api/capturas/ingest` → Inference HTTP (`VLM_INFERENCE_URL`) or stub → captura store. Excel import remains for spreadsheet ops.
- Plan: `docs/plans/2026-08-14-nova-captura.md`.

## Deploy

- Web → **Vercel**; data → hosted **Supabase**. Runbook: `docs/DEPLOY.md`.

## PR CI gate

- GitHub Actions on PRs only, path-filtered; require aggregate job **`CI`** for branch protection.
- **Web:** ESLint (anti-slop) · tsc · Vitest · file ≤ 400 lines · function ≤ 150 (ratchet toward 50).
- **AI:** Ruff check + format · pytest · file ≤ 500 · function ≤ 60.
- Function-size counting differs by stack (ESLint skips blanks/comments; Python AST counts full span). Source of truth: `.github/workflows/ci.yml`.
