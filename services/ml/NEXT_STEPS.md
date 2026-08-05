# ML — next steps (VLM pivot)

Hand-trained CV track is abandoned. Focus: hosted VLM prototype. Plan: `docs/plans/2026-08-05-vlm-prototype.md`.

## This week (AI team)

- [x] Build `vlm` client module (AI Studio key, JSON schema / validate+retry).
- [x] Thin harness: folder of photos → JSON verdicts (CLI + notebook calling the module).
- [x] Notebook demo: `uv run jupyter notebook notebooks/demo_vlm_grass.ipynb` (samples in `notebooks/samples/`).
- [x] Drop overlay from `InferResponse` + tests.
- [x] Purge FastAPI `/infer` + ExG/CORAL/cobertura stand-ins (app, pipeline, segmentação, classificador, eval scripts, related tests). HTTP serve deferred.
- Shoulder-focus prompt + local Street View samples (keep iterating on demo quality).

## Later

- Field photos + measurement protocol.
- Reintroduce an HTTP Inference API in a new shape only after the VLM prototype looks right (not this week).
