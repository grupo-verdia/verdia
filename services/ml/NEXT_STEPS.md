# ML — next steps (VLM pivot)

Hand-trained CV track is abandoned. Focus: hosted VLM prototype. Plan: `docs/plans/2026-08-05-vlm-prototype.md`.

## This week (AI team)

- [x] Build `vlm` client module (AI Studio key, JSON schema / validate+retry).
- [x] Thin harness: folder of photos → JSON verdicts (`python -m verdia_ml.classify` / `scripts/classify_folder.py`).
- Drop overlay from `InferResponse` + tests; leave `/infer` dormant otherwise (web/overlay agent).
- Retire ExG/CORAL/cobertura from the live path (leave files or mark unused — don't rewrite history).

## Later

- Field photos + measurement protocol.
- Wire VLM into FastAPI `/infer` / Render only after the prototype looks right.
