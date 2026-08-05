# ML — next steps (VLM pivot)

Hand-trained CV track is abandoned. Focus: hosted VLM prototype. Plan: `docs/plans/2026-08-05-vlm-prototype.md`.

## This week (AI team)

- Build `vlm` client module (AI Studio key, JSON schema / validate+retry).
- Thin harness: folder of photos → JSON verdicts (script and/or notebook calling the module).
- Drop overlay from `InferResponse` + tests; leave `/infer` dormant otherwise.
- Retire ExG/CORAL/cobertura from the live path (leave files or mark unused — don't rewrite history).

## Later

- Field photos + measurement protocol.
- Wire VLM into FastAPI `/infer` / Render only after the prototype looks right.
