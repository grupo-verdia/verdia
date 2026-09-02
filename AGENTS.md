# verdia

Motiva roadside vegetation product. A geotagged photo becomes a **captura**, the VLM estimates grass height, code maps that to **classe** (`baixa` < `média` < `alta`), and classe drives **trecho** **severidade** so operators can plan mowing. Today Motiva does this by eye ("olhômetro").

We do not have Motiva's real data. Photos are generic geotagged laterals. Do not assume a 360 camera.

Glossary: `CONTEXT.md`. How to run: `README.md`. Next.js breaking changes: `apps/web/AGENTS.md`. CI: `.github/workflows/ci.yml`.

## Product

Flow: upload or Excel import → classify → persist in Supabase → dashboard, map, planejamento.

Screens (UI in Portuguese):

| Route | Label | Role |
| --- | --- | --- |
| `/` | Visão geral | Classified capturas and maintenance priority |
| `/nova-captura` | Nova captura | Browser multi-upload of geotagged photos |
| `/mapa` | Mapa | Markers by classe (no PostGIS) |
| `/rodovias` | Rodovias e planilhas | Per-rodovia table, Excel import/export, classe overrides |
| `/planejamento` | Planejamento | Queue by severidade, then rodovia, then km |
| `/observabilidade` | Observabilidade | Volume, confiança, falhas, overrides |

Not built: video frames + GPS sync, drift detection, route optimization, Supabase Auth.

## Domain

Use these terms in code, tests, and docs. Details live in `CONTEXT.md`.

- **Captura.** One geotagged, timestamped roadside photo. No valid GPS means it is not a captura. Prefer EXIF; the operator can type lat/lon.
- **Trecho.** Roadside stretch at that GPS point. One captura defines one trecho (1:1). Default length is 500 m (Motiva's manual-analysis constant).
- **Classe.** Ordered height scale, not three unrelated labels. Motiva bands: `h < 10 cm` → `baixa`; `10-30 cm` → `média`; `h > 30 cm` → `alta`. `classe` is `null` only when the roadside strip is not visible or has no grass. Under uncertainty the model still estimates height (lower confidence).
- **Severidade.** Maintenance priority of a trecho, follows classe (`alta` first). Null classe → `baixa`.
- **Nova captura.** Browser only (no CLI). Each valid file: infer → persist. Failed inference still persists the captura with `inferenceError` set.
- **Rodovia.** Motiva catalog entry (code-seeded, e.g. SP-330). Optional on a captura, used by planilhas and planejamento.

## Stack

- `apps/web`: Next.js + TypeScript (Node 22, `npm`). Shared `DEMO_PASSWORD`. Memory store is tests-only.
- `services/ai`: Python 3.12 VLM (`uv`): module, CLI, notebook, optional `POST /v1/classify`.
- Classify for ingest: `GOOGLE_API_KEY` (Google AI Studio) → else `VLM_INFERENCE_URL` → else filename stub. Hosted Nova captura uses the Google key on the web app. Do not set `VLM_INFERENCE_URL` on Vercel.
- Data: Supabase (Postgres + `capturas` bucket). Required for the running web app.

## Commands

```bash
# web
cd apps/web && npm run dev          # :3000
cd apps/web && npm test && npm run lint && npm run typecheck

# ai
cd services/ai && VLM_FAKE=1 uv run python -m verdia_ai.classify path/to/photos --summary
cd services/ai && uv run pytest
# optional local HTTP when the web process has no GOOGLE_API_KEY
cd services/ai && VLM_FAKE=1 uv run python -m verdia_ai serve
```

Copy `apps/web/.env.example` → `.env.local` (`DEMO_PASSWORD`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`).

## Conventions

- User-facing text is Portuguese. Code names (files, functions, types) stay English. Comments and internal docs follow the file you are in.
- Conventional Commits on every git commit.
- Keep docs in sync with the product. After any change, recheck `README.md`, `CONTEXT.md`, `AGENTS.md`, and related docs so they still match current behavior and do not point at files nor features that no longer exist.
- Keep web `.ts`/`.tsx` files ≤ 400 lines. Python files ≤ 500 lines, functions ≤ 60 lines (`scripts/ci/`).
- Tests stay focused. Web tests inject `createMemoryStore()`.
- This Next.js has breaking changes. Read `apps/web/AGENTS.md` and `node_modules/next/dist/docs/` before inventing APIs.
