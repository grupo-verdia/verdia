# Zip frontend parity (option 1)

Date: 2026-08-12
Status: implemented

## Goal

Make `apps/web` look/behave like the zip prototype UI (AppNav white/purple,
dashboard copy, captura-map, rodovia cards, override form) while keeping
`lib/persistence` as the only store.

## Decisions

- Use zip `AppNav` instead of the dark `Sidebar` shell from the earlier
  operational-frontend plan.
- Do **not** import `verdia-store` / `verdia-domain` / simulador.
- Map zip fields: `classeFinal`/`aiClasse` → `classe`, `aiConfidence` → `confidence`.
- Additive override fields + `PATCH /api/capturas/[id]` + `DELETE /api/capturas`.
- Planejamento stays routable but is removed from the nav.
