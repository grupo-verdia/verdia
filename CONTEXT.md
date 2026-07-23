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

## Glossary (ubiquitous language)

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
- **Segmentação** — the "where" step: isolates the roadside vegetation region and
  produces the visual overlay. It does **not** decide the class. In the UI, the
  overlay defaults to a **blend** on the photo, with a toggle for original / mask.
- **Classificador ordinal** — the "how much" step: takes the cleaned region and outputs
  baixa/média/alta. It is the **single source of truth** for the class.
- **Cobertura** — the fraction of "tall grass" pixels in the roadside region; used to
  derive the 3-class ground truth from binary-height source labels.
- **Severidade** — maintenance priority of a trecho, driven primarily by its classe
  (alta first).
- **Nova captura** — web-app flow to upload one or more geotagged photos (multi-select);
  each valid file becomes a **captura** (infer → persist → show on dashboard/map). Ingest
  is browser-only (no CLI). Uploads without valid GPS are rejected per file.

## Fronts (all in scope)

1. **CV pipeline (hybrid, sequential):** segmentação → classificador ordinal.
   See ADR-0001.
2. **Inference API** (Python, always-on).
3. **Nova captura** (web upload → API).
4. **Dashboard** (results).
5. **Geospatial map** of trechos.
6. **Observability (lean):** basic counters + model accuracy.
7. **Heuristic planning:** trechos ordered by severidade, highlighted on the map.

Future vision (documented, not built now): video frame extraction + GPS sync, drift
detection, real route optimization, Supabase Auth.

## Data & modeling

- **Segmentation + height training:** TAS500 (built-in low/high grass at a 20 cm
  threshold).
- **Classifier reinforcement:** forefield_grassland (~15k mowed vs. grass images).
- **BR-realistic validation:** a hand-relabeled subset of the DNIT Brazilian-highway
  images (CC BY 4.0).
- **3 classes** derived by **cobertura** of tall grass, with thresholds calibrated on
  the DNIT set. See ADR-0002.
- Narrative stays fixed; concrete labels adapt to available public data.

## Architecture & stack (monorepo)

- `apps/web` — **Next.js (TypeScript)**: dashboard, map, planning, observability, and
  API routes. Access gated by a **single shared password**.
- `services/ml` — **Python**: training + inference service (segmentação + classificador
  ordinal).
- **Nova captura** (in `apps/web`).
- **Data:** **Supabase** (Postgres for metadata/predictions; Storage for images).
- **Deploy (fully live):** web on **Vercel**, data on **Supabase**, ML service on a
  hobby CPU container on **Render**. See ADR-0003 and ADR-0004.

## Decisions

See `docs/adr/` for the full rationale behind the key choices (including ADR-0005 Nova
captura, ADR-0006 Colab→CPU CV, ADR-0007 PR CI gate).
