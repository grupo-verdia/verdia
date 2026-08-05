# verdia — Context

verdia turns roadside vegetation photos into maintenance intelligence for **Motiva**
(a Brazilian highway operator). Instead of judging when a stretch needs mowing by the
human "olhômetro" (eyeballing), verdia classifies the state of the vegetation at the
edge of a highway from a geotagged photo and helps **prioritize maintenance**.

This repository is an **academic prototype / demo**. We have **no access to Motiva's
real data**, so we design for the real scenario but drive the demo with **public
datasets**. The image source is treated as **generic** (one geotagged lateral photo at
a time) — we do not assume a 360º camera.

## The problem (from the field work)

- **Rework:** low data volume and lack of intelligent planning.
- **High cost:** excessive spending on crew logistics.
- **No standardization:** analysis depends on the human "olhômetro".

verdia targets: cost optimization, technical standardization, operational efficiency.

## Glossary

Use these terms consistently in issues, code, tests, and docs.

- **Trecho** — a stretch/segment of highway with a maintenance **severidade**. In the
  product, each **captura** defines exactly one trecho (1:1): the photo stands for a
  length of roadside at its GPS point. Default length is **500 m** (Motiva’s current
  manual-analysis constant); the value may become configurable later.
- **Altura da grama / classe** — the ordinal vegetation-height class of a trecho:
  **baixa < média < alta**. This is an *ordered* scale, not three unrelated labels.
- **Captura** — a single geotagged, timestamped roadside photo (as if taken by a
  vehicle-mounted camera driving a stretch). Without valid GPS, it is not a captura.
  One captura creates one trecho.
- **Segmentação** — the "where" step: isolates the roadside vegetation region for
  classifier cleanup. It does **not** decide the class. (Visual overlay was dropped;
  VLM produces no mask.)
- **Classificador ordinal** — the "how much" step: takes the cleaned region and outputs
  baixa/média/alta. It is the **single source of truth** for the class.
- **Cobertura** — the fraction of "tall grass" pixels in the roadside region; used to
  derive the 3-class ground truth from binary-height source labels.
- **Severidade** — maintenance priority of a trecho, driven primarily by its classe
  (alta first).
- **Nova captura** — web-app flow to upload one or more geotagged photos (multi-select);
  each valid file becomes a **captura** (infer → persist → show on dashboard/map). Ingest
  is browser-only (no CLI). Uploads without valid GPS are rejected per file. **App↔AI
  HTTP integrate is deferred this week** (VLM prototype only).

## Fronts (all in scope)

1. **Classifier path (current):** hosted VLM prototype (`services/ai` module + CLI +
   notebook). Hand-trained hybrid CV + always-on `/infer` are deferred / removed for now
   (plan `docs/plans/2026-08-05-vlm-prototype.md`).
2. **Inference HTTP API** — deferred (reintroduce later in a new shape if needed).
3. **Nova captura** (web upload → API) — deferred until AI path lands.
4. **Dashboard** (results).
5. **Geospatial map** of trechos.
6. **Observability (lean):** basic counters + model accuracy.
7. **Heuristic planning:** trechos ordered by severidade, highlighted on the map.

Future vision (documented, not built now): video frame extraction + GPS sync, drift
detection, real route optimization, Supabase Auth.

## Data & modeling

- **Current:** VLM natural-language maintenance judgment (`baixa` | `média` | `alta`).
- **Abandoned:** TAS500 / forefield / DNIT cobertura-bin label story (old CV track).
- Narrative stays fixed; concrete labels adapt to available public data.

## Architecture & stack (monorepo)

- `apps/web` — **Next.js (TypeScript)**: dashboard, map, planning, observability, and
  API routes. Access gated by a **single shared password**.
- `services/ai` — **Python**: VLM grass classifier prototype (module + CLI + notebook).
  HTTP Inference API deferred.
- **Nova captura** (in `apps/web`) — deferred until AI HTTP lands.
- **Data:** **Supabase** (Postgres for metadata/predictions; Storage for images).
- **Deploy:** web on **Vercel**, data on **Supabase**. AI Render hosting deferred with
  the HTTP API.

## Decisions

Standing stack / ingest / CI notes: `docs/plans/2026-08-05-standing-decisions.md`.
New durable notes go in `docs/plans/YYYY-MM-DD-…` (not ADRs).
