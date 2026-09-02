# verdia

verdia classifies roadside grass height from a geotagged photo so Motiva can
prioritize mowing. Today that judgment is done by eye ("olhômetro").

We do not have Motiva's real data. Photos are generic geotagged laterals. We
do not assume a 360º camera. The app runs end-to-end: upload → classify →
persist → dashboard / map / planejamento.

## Motiva

[Motiva Infraestrutura de Mobilidade S.A.](https://www.motiva.com.br/)
(formerly Grupo CCR) runs highway, rail, and airport concessions.
verdia is only for roadside vegetation on rodovias: classe → severidade → planning.

[Sobre a Motiva](https://www.motiva.com.br/motiva/sobre-a-motiva/)

## Glossary

Use these terms in code, tests, and docs.

- **Trecho** — a stretch of highway with a maintenance **severidade**. Each
  **captura** defines exactly one trecho (1:1): the photo stands for a length of
  roadside at its GPS point. Default length is **500 m** (Motiva’s current
  manual-analysis constant).
- **Altura da grama / classe** — ordinal vegetation-height class:
  **baixa < média < alta**, from estimated height (Motiva bands):
  **h < 10 cm → baixa**, **10–30 cm → média**, **h > 30 cm → alta**.
  **classe is null** only when the roadside strip is not visible or has no grass.
  Under uncertainty the model still estimates height (lower confidence).
  This is an ordered scale, not three unrelated labels.
- **Captura** — a single geotagged, timestamped roadside photo. Without valid GPS,
  it is not a captura. One captura creates one trecho.
- **Severidade** — maintenance priority of a trecho, driven primarily by classe
  (alta first).
- **Nova captura** — web upload of one or more geotagged photos (multi-select).
  Each valid file becomes a captura (infer → persist → dashboard/map).
  Browser only (no CLI). Prefer EXIF GPS; if missing, the operator can enter
  latitude/longitude. Classifies with Google AI Studio (`GOOGLE_API_KEY`) on
  Vercel; otherwise local Python Inference HTTP (`VLM_INFERENCE_URL`) or a stub.

## Fronts (all in scope)

1. Hosted VLM (`services/ai` module + CLI + notebook).
2. Inference HTTP in `services/ai` (`POST /v1/classify`), optional local.
3. Nova captura (web upload → classify → persist).
4. Dashboard.
5. Map of trechos.
6. Observability: counters from persisted capturas (volume, confiança, falhas,
   overrides).
7. Planning: trechos ordered by severidade, highlighted on the map.

Not built: video frames + GPS sync, drift detection, route optimization, Supabase Auth.

## Data & modeling

VLM estimates roadside grass height. Code maps Motiva cm bands to
`baixa` | `média` | `alta` (or `null` for N/A).

## Architecture & stack (monorepo)

- `apps/web` — Next.js (TypeScript): dashboard, map, planning, observability, API
  routes. Access gated by a single shared password.
- `services/ai` — Python VLM (module + CLI + notebook). Optional Inference HTTP
  (`python -m verdia_ai serve`).
- Nova captura classifies via Google AI Studio, or local Python HTTP / stub.
- Data: Supabase (Postgres + Storage). Required for the running web app
  (memory store is tests-only).
- Deploy: web on Vercel, data on Supabase. Runbook: `docs/DEPLOY.md`.
