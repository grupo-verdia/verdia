# Web — next steps (VLM pivot)

Hand-trained CV / overlay path is abandoned. AI plan: `docs/plans/2026-08-05-vlm-prototype.md`. Companion: `services/ai/NEXT_STEPS.md`.

## Prep we can do now

- [x] Remove overlay from client, types, persistence, captura detail; migration drops overlay column.
- [x] Mark `simulate-ingest` deferred (AI HTTP `/infer` purged; CLI exits clearly).

## App team ownership

- Data model + visual CRUDs replacing spreadsheets.

## Still relevant (not blocked on VLM this week)

- Nova captura / GPS / pitch UI.
- Standing: shared-password gate; Nova captura is the only ingest path (GPS required; 1 captura = 1 trecho @ 500 m default); Supabase for UI persistence. Cross-cutting: `docs/plans/2026-08-05-standing-decisions.md`.
