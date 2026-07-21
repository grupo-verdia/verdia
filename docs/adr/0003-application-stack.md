# ADR-0003: Application stack (monorepo)

Status: Accepted
Date: 2026-07-20

## Context

verdia is an academic demo that must also look like a credible product when pitched to
Motiva. Scope is a monorepo with an MVP focused on the classifier + minimal
visualization, designed to grow into the full platform.

## Decision

- `apps/web` — **Next.js (TypeScript)**: dashboard, geospatial map, heuristic planning,
  lean observability, and API routes (backend-for-frontend). Access gated by a **single
  shared password** (simple middleware). Real auth (Supabase Auth) is future vision.
- `services/ml` — **Python**: training + inference service (segmentação + classificador
  ordinal), exposed as an always-on API.
- **Nova captura** — browser multi-select upload of geotagged photos into the inference
  API (see ADR-0005). Supersedes the earlier CLI simulador.
- **Data:** **Supabase** — Postgres for capture metadata and predictions (path, GPS,
  timestamp, predicted classe, confidence, model version); Storage for images.

## Consequences

- Two languages, but a clean seam: TS for the product surface, Python for ML.
- Supabase removes local DB setup and provides Storage/Auth headroom.
- Geospatial needs are met with lat/lon columns; PostGIS is not required for the MVP.
