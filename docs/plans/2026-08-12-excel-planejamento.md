# Excel + Planejamento (additive)

Date: 2026-08-12
Status: implemented on `feat/excel-planejamento-additive` (replaces intent of PR #44 without merging it)

## Goal

Show Planejamento columns (Ordem, Rodovia, KM, Altura, Severidade, Confiança) from spreadsheet import, without replacing the captura write path or AI workflow.

## Decisions

- Keep `getCapturaStore()` / `lib/persistence` as the only store (no `verdia-store`).
- Keep `POST /api/capturas` contract (image required, reject `trechoId`); only add optional `rodoviaId` / `km` / `sentido` / `alturaCm`.
- Motiva height bands stay **10 / 30 cm** (aligned with `services/ai`), not 30/60 placeholders from PR #44.
- Rodovia catalog is **code-seeded** (`lib/rodovias.ts`); no `rodovias` table yet.
- Remote Supabase already has the five main migrations — only additive ALTER on `capturas` (`20260812120000_capturas_planejamento_fields.sql`). Never `CREATE TABLE IF NOT EXISTS capturas`.
- Do **not** resurrect simulador / `/infer` client / AppShell rewrite / nested `apps/web/supabase/`.

## Apply on remote (`kscjyhkzopabouxryaxu`)

After merge, apply only:

`supabase/migrations/20260812120000_capturas_planejamento_fields.sql`

## Out of scope

PR #44 park/close; full operational shell; override audit trail; Inference HTTP.
