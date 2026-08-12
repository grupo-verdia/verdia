# Operational frontend shell (UI-only from PR #44)

Date: 2026-08-12
Status: implemented on `feat/operational-frontend`

## Goal

Ship the operational web chrome from PR #44 on top of the additive Excel /
Planejamento stack from PR #47 — without `verdia-store`, simulador, or schema
rewrites.

## Keep

- AppShell + Sidebar + Brand + operational `globals.css`
- Dashboard KPIs + live map + recent list
- `/rodovias` tabular import/export UI
- Restyled Planejamento / Mapa / Observabilidade / Captura detail

## Do not bring from #44

- `verdia-store` / `verdia-domain`
- simulador + fixtures
- nested `apps/web/supabase/` or `CREATE TABLE capturas` migrations
- `planejamento-board` CSV client / `app-nav` duplicate

## Data sources

Existing `getCapturaStore()`, `listMotivaRodovias()`, `loadPlanTrechos()`, and
`/api/capturas` + `/api/rodovias` from main (post-#47).
