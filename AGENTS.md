# verdia

Motiva roadside vegetation product. A geotagged photo becomes a **captura**, the VLM estimates grass height, code maps that to **classe** (`baixa` < `média` < `alta`), and classe still names what the photo showed. Planejamento orders trechos by **prazo** until the 30 cm cut limit. Today Motiva does this by eye ("olhômetro").

We do not have Motiva's real data. Photos are generic geotagged laterals. Do not assume a 360 camera.

Glossary: `CONTEXT.md`. How to run: `README.md` (Portuguese: `README.pt-BR.md`). Next.js breaking changes: `apps/web/AGENTS.md`. CI: `.github/workflows/ci.yml`.

## Product

Flow: Nova captura saves then classifies. Excel import already has classe and no photo (the UI shows Sem imagem). Then dashboard, map, planejamento.

The operator app is the same website on phones. Below ~700px, navigation is a bottom bar, not a separate app. Light and dark share the same layout; the toggle is in the sidebar and on the phone top bar.

Screens (UI in Portuguese):

| Route | Label | Role |
| --- | --- | --- |
| `/` | Visão geral | Capturas, queue, and trechos to cut within 7 days |
| `/nova-captura` | Nova captura | Bulk geotagged photo upload. Classification starts after save |
| `/mapa` | Mapa | Markers by classe; popup shows photo + stats (no PostGIS) |
| `/rodovias` | Rodovias | Capturas by rodovia with photos, Excel import/export, classe correction |
| `/planejamento` | Planejamento | Queue by prazo until 30 cm, then rodovia, then km; list and map show photos |
| `/observabilidade` | Observabilidade | Confiança, fila, falhas, correções |

Not built: video frames + GPS sync, drift detection, route optimization, Supabase Auth.

## Domain

Use these terms in code, tests, and docs. Details live in `CONTEXT.md`.

- **Captura.** One geotagged, timestamped roadside photo. No valid GPS means it is not a captura. Prefer EXIF; the operator can type lat/lon. Excel import still creates capturas; those rows have no photo (Sem imagem).
- **Trecho.** Roadside stretch at that GPS point. One captura defines one trecho (1:1). Default length is 500 m (Motiva's manual-analysis constant).
- **Classe.** Ordered height scale, not three unrelated labels. Motiva bands: `h < 10 cm` → `baixa`; `10-30 cm` → `média`; `h > 30 cm` → `alta`. After classification, `classe` is `null` only when the roadside strip is not visible or has no grass. Before `classifiedAt`, null means still waiting. Under uncertainty the model still estimates height (lower confidence).
- **Severidade.** Follows classe (`alta` first). Null classe → `baixa`. Failed inference does not enter Planejamento.
- **Prazo.** Days until grass is projected to hit 30 cm. Growth is 0.3 cm/day from October to March and 0.1 cm/day from April to September. Missing cm uses 20 for média and 5 for baixa. Alta with no cm is already over. No visible grass after classification has no prazo. Planejamento sorts by this, then rodovia, then km.
- **Nova captura.** Browser only (no CLI). Operator queues a batch, then sends. Each valid file is saved first, then classified in the background. Closing the tab after upload keeps the photos. Continue on Nova captura if any are still waiting. Photos without GPS are skipped unless lat/lon are filled. Files up to 10 MB are accepted; heavy ones are re-encoded smaller in the browser before upload. Failed inference still keeps the captura with `inferenceError` set.
- **Rodovia.** Motiva catalog entry (code-seeded, e.g. SP-330). Optional on a captura, used by planilhas and planejamento.

## Stack

- `apps/web`: Next.js + TypeScript (Node 22, `npm`). Shared `DEMO_PASSWORD`. Memory store is tests-only.
- `services/ai`: Python 3.12 VLM (`uv`): module, CLI, notebook, optional `POST /v1/classify`.
- Classify for ingest: `GOOGLE_API_KEY` (Google AI Studio) → else `VLM_INFERENCE_URL` → else error (do not guess classe). Hosted Nova captura uses the Google key on the web app. Do not set `VLM_INFERENCE_URL` on Vercel.
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
Copy `services/ai/.env.example` → `.env` (`GOOGLE_API_KEY`) for the CLI and notebook.

## Conventions

- User-facing text is Portuguese. Code names (files, functions, types) stay English. Comments and internal docs follow the file you are in.
- Conventional Commits on every git commit.
- Keep docs in sync with the product. After any change, recheck `README.md`, `CONTEXT.md`, `AGENTS.md`, and related docs so they still match current behavior and do not point at files nor features that no longer exist.
- Keep web `.ts`/`.tsx` files ≤ 400 lines. Python files ≤ 500 lines, functions ≤ 60 lines (`scripts/ci/`).
- Tests stay focused. Web tests inject `createMemoryStore()`.
- This Next.js has breaking changes. Read `apps/web/AGENTS.md` and `node_modules/next/dist/docs/` before inventing APIs.
