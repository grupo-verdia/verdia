# verdia

verdia classifies roadside grass height from a geotagged photo so Motiva can
prioritize mowing. Today that judgment is done by eye ("olhômetro").

We do not have Motiva's real data. Photos are generic geotagged laterals. We
do not assume a 360º camera. The app runs end-to-end: upload → persist →
classify → dashboard / map / planejamento.

## Motiva

[Motiva Infraestrutura de Mobilidade S.A.](https://www.motiva.com.br/)
(formerly Grupo CCR) runs highway, rail, and airport concessions.
verdia is only for roadside vegetation on rodovias. Classe is what the photo showed. Prazo until 30 cm is what the mowing queue uses.

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
  **classe is null after classification** when the roadside strip is not
  visible or has no grass. **classe is also null before classifiedAt**
  (still waiting). Under uncertainty the model still estimates height
  (lower confidence).
  This is an ordered scale, not three unrelated labels.
- **Captura** — a single geotagged, timestamped roadside photo. Without valid GPS,
  it is not a captura. One captura creates one trecho. Excel import still
  creates capturas from rows (classe already filled). There is no photo;
  the UI shows Sem imagem. Limpar on a card or on the captura page deletes
  that one (photo, captura, trecho). The Rodovias toolbar Limpar still
  clears the list in view.
- **Severidade** — follows classe (alta first). Planejamento sorts by prazo.
- **Prazo.** Days until projected height hits the 30 cm cut limit. Growth is
  an operational estimate until Motiva confirms: 0.4 cm/day from October to
  March (wet/growing season) and 0.2 cm/day from April to September. Height
  walks the calendar at each day's seasonal rate, from the photo up to today,
  then forward until 30 cm. Missing cm uses 20 for média and 5 for baixa.
  Alta is already over (0 days). Stored cm is used only when it still matches
  classe, because a field correction changes classe and leaves the old cm.
  No visible grass after classification has no prazo. Labels: Cortar agora
  (0), Esta semana (1-7), Em X dias (8-90), or Mais de 90 dias. Computed on
  read, not stored. Planejamento sorts by the real day count, then rodovia,
  then km. Visão geral lists trechos with 0 to 7 days.
- **Nova captura.** Web upload of geotagged photos. The operator queues
  files, then sends. Each valid file is saved first, then classified in
  the background. Close the tab: photos stay. Reopen the app: leftover
  photos classify without an extra click.
  No GPS means the photo is skipped, unless the operator types
  latitude/longitude. Files up to 10 MB are accepted; anything heavier
  than the request-body budget is re-encoded to a smaller JPEG in the
  browser (EXIF GPS is read from the original first). Classifies with Google AI Studio
  (`GOOGLE_API_KEY`) on Vercel; otherwise local Python Inference HTTP
  (`VLM_INFERENCE_URL`). No Google key and no local Python URL: the send
  is rejected. If classification fails later, the photo is already saved.

## Fronts (all in scope)

1. Hosted VLM (`services/ai` module + CLI + notebook).
2. Inference HTTP in `services/ai` (`POST /v1/classify`), optional local.
3. Nova captura (web upload → persist → classify in the background).
4. Dashboard.
5. Map of trechos (marker popup shows the photo next to the stats).
6. Observability: counters from persisted capturas (volume, confiança, falhas,
   overrides).
7. Planning: trechos ordered by prazo until 30 cm, highlighted on the map.

Not built: video frames + GPS sync, drift detection, route optimization, Supabase Auth.

## Data & modeling

VLM estimates roadside grass height. Code maps Motiva cm bands to
`baixa` | `média` | `alta` (or `null` for N/A).

## Architecture & stack (monorepo)

- `apps/web` — Next.js (TypeScript): dashboard, map, planning, observability, API
  routes. Access gated by a single shared password. Light and dark share the
  same layout tokens. Lists and map popups show the captura photo.
- `services/ai` — Python VLM (module + CLI + notebook). Optional Inference HTTP
  (`python -m verdia_ai serve`).
- Nova captura classifies via Google AI Studio, or local Python HTTP, after
  the photo is saved. No Google key and no local Python URL: the send is
  rejected. If classification fails later, the photo is already saved.
- Data: Supabase (Postgres + Storage). Required for the running web app
  (memory store is tests-only).
- Deploy: web on Vercel, data on Supabase.
