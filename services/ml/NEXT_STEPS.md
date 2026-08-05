# ML — next steps (VLM pivot)

Hand-trained CV track is abandoned. Focus: hosted VLM prototype. Plan: `docs/plans/2026-08-05-vlm-prototype.md`.

## This week (AI team)

- Build `vlm` client module (AI Studio key, JSON schema / validate+retry).
- Thin harness: folder of photos → JSON verdicts (CLI + notebook calling the module).
- [x] Notebook demo: `uv run --with jupyter jupyter notebook notebooks/demo_vlm_grass.ipynb` (samples in `notebooks/samples/`).
- [x] Drop overlay from `InferResponse` + tests; leave `/infer` dormant otherwise.
- Retire ExG/CORAL/cobertura from the live path (leave files or mark unused — don't rewrite history).

## Later

- Field photos + measurement protocol.
- Wire VLM into FastAPI `/infer` / Render only after the prototype looks right.

## Later: prune dead CV

Inventory only (do not purge yet) — old ExG/CORAL path still behind `/infer`:

- `pyproject.toml` no longer pins torch / torchvision / opencv / sklearn; heavy CV deps are already gone from the lockfile.
- Remaining runtime weight for that path is mainly `numpy` + `pillow` (still needed for decode / VLM harness).
- Dormant modules still imported by live `/infer`: `segmentacao.py` (ExG+Otsu), `classificador.py` (frozen CORAL-style head on mean ExG), `pipeline.py` (wires them), `image_ops.py` (`excess_green`).
- Tests that only exercise the old path: `tests/test_segmentacao.py`, parts of `tests/test_pipeline.py` (and cobertura label tests if unused by VLM).
- `labels.py` still carries cobertura / height-training glossary tied to the abandoned hand-CV track.
- `scripts/prepare_datasets.py` + `data/README.md` describe segmentation/height dataset roles no longer on the critical path.
- README still documents ExG + ordinal CORAL as the product story — rewrite when `/infer` switches to VLM.
- Safe prune order later: stop calling `infer_captura` from `app.py` → drop segmentação/classificador tests → delete those modules → trim README/NEXT_STEPS.
