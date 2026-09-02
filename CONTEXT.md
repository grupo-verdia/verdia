# verdia — Context

verdia turns roadside vegetation photos into maintenance intelligence for **Motiva**.
Instead of judging when a stretch needs mowing by the human "olhômetro" (eyeballing),
verdia classifies the state of the vegetation at the edge of a highway from a geotagged
photo and helps **prioritize maintenance**.

This repository is an **academic prototype / demo**. We have **no access to Motiva's
real data**, so we design for the real scenario but drive the demo with **public
datasets**. The image source is treated as **generic** (one geotagged lateral photo at
a time) — we do not assume a 360º camera.

## Motiva (customer context)

- **Website:** [https://www.motiva.com.br/](https://www.motiva.com.br/)
- **About:** [Sobre a Motiva](https://www.motiva.com.br/motiva/sobre-a-motiva/)
- **Who:** Motiva Infraestrutura de Mobilidade S.A. (formerly **Grupo CCR**). Brazil’s
  largest mobility-infrastructure company; publicly listed (B3: MOTV3). Purpose:
  *melhorar a vida das pessoas através da mobilidade*.
- **Businesses:** concessions in **rodovias**, urban rail (trens / metrôs / VLT), and
  aeroportos. ~37 concessions across 13 Brazilian states; ~5.000 km of administered
  highways carrying 2M+ vehicles/day.
- **Why verdia cares:** Motiva’s **Rodovias** platform owns roadside vegetation
  maintenance along concession stretches. verdia is scoped to that highway maintenance
  problem (classe → severidade → planning), not to rail or airports.

## The problem (from the field work)

- **Rework:** low data volume and lack of intelligent planning.
- **High cost:** excessive spending on crew logistics.
- **No standardization:** analysis depends on the human "olhômetro".

verdia targets: cost optimization, technical standardization, operational efficiency.

## Glossary

Use these terms consistently in code, tests, and docs.

- **Trecho** — a stretch/segment of highway with a maintenance **severidade**. In the
  product, each **captura** defines exactly one trecho (1:1): the photo stands for a
  length of roadside at its GPS point. Default length is **500 m** (Motiva’s current
  manual-analysis constant); the value may become configurable later.
- **Altura da grama / classe** — the ordinal vegetation-height class of a trecho:
  **baixa < média < alta**, mapped from estimated height (Motiva bands):
  **h < 10 cm → baixa**, **10–30 cm → média**, **h > 30 cm → alta**.
  **classe is null** (N/A) only when the roadside strip is not visible or has no grass;
  the model should still estimate height under uncertainty (lower confidence), not omit it.
  This is an *ordered* scale, not three unrelated labels.
- **Captura** — a single geotagged, timestamped roadside photo (as if taken by a
  vehicle-mounted camera driving a stretch). Without valid GPS, it is not a captura.
  One captura creates one trecho.
- **Severidade** — maintenance priority of a trecho, driven primarily by its classe
  (alta first).
- **Nova captura** — web-app flow to upload one or more geotagged photos (multi-select);
  each valid file becomes a **captura** (infer → persist → show on dashboard/map). Ingest
  is browser-only (no CLI). Prefer EXIF GPS; when missing, the operator can enter
  latitude/longitude manually. Classifies via Google AI Studio (`GOOGLE_API_KEY`)
  on Vercel; local Python Inference HTTP (`VLM_INFERENCE_URL`) or stub otherwise.

## Fronts (all in scope)

1. **Classifier path (current):** hosted VLM prototype (`services/ai` module + CLI +
   notebook). Plan: `docs/plans/2026-08-05-vlm-prototype.md`.
2. **Inference API** — lean HTTP in `services/ai` (`POST /v1/classify`).
3. **Nova captura** (web upload → classify → persist).
4. **Dashboard** (results).
5. **Geospatial map** of trechos.
6. **Observability (lean):** basic counters + model accuracy.
7. **Heuristic planning:** trechos ordered by severidade, highlighted on the map.

Future vision (documented, not built now): video frame extraction + GPS sync, drift
detection, real route optimization, Supabase Auth.

## Data & modeling

- **Current:** VLM estimates roadside grass height; code maps Motiva cm bands to
  `baixa` | `média` | `alta` (or `null` for N/A).
- Narrative stays fixed; concrete labels adapt to available public data.

## Architecture & stack (monorepo)

- `apps/web` — **Next.js (TypeScript)**: dashboard, map, planning, observability, and
  API routes. Access gated by a **single shared password**.
- `services/ai` — **Python**: VLM grass classifier prototype (module + CLI + notebook).
  Lean Inference HTTP (`python -m verdia_ai serve`).
- **Nova captura** (in `apps/web`) — geotagged upload → Google AI Studio (or local
  Python HTTP / stub) → persist.
- **Data:** **Supabase** (Postgres for metadata/predictions; Storage for images).
- **Deploy:** web on **Vercel**, data on **Supabase**.

## Decisions

Standing stack / ingest / CI notes: `docs/plans/2026-08-05-standing-decisions.md`.
