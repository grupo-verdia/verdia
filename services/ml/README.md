# verdia Inference API

Python service for segmentação + classificador ordinal. Always-on HTTP API;
CPU inference is enough for the demo.

## Pipeline (ADR-0001 Option A)

`POST /infer` runs the hybrid sequential path:

1. **Segmentação** (ExG + Otsu) — vegetation mask for classifier cleanup.
   Does **not** decide classe. No overlay is returned on the API contract.
2. **Classificador ordinal** — frozen feature stand-in (mean ExG on the cleaned
   vegetation region; CPU stand-in for DINOv2/SigLIP per ADR-0001 early path) +
   small CORAL head. **Single source of truth** for `classe`. Mask area / cobertura
   is not fused into the decision (Option B stays out of scope).

Model version: `hybrid-ordinal-0.1`. Option B (fuse cobertura into the classifier) is
not built. VLM will replace this dormant path; the `/infer` shape is classe + confidence
+ model_version only.

## Local

```bash
uv sync
uv run python -m verdia_ml
```

- Health: `GET /health` → `{"status":"ok"}` (always public)
- Infer: `POST /infer` (multipart) — fields `image`, `lat`, `lon`, `captured_at`
  → `{"classe":"baixa"|"média"|"alta","confidence":0.0–1.0,"model_version":"..."}`
- Default bind: `0.0.0.0:8000`
- Auth: when `INFERENCE_API_KEY` is set, callers must send `Authorization: Bearer <key>`.
  When unset, `/infer` stays open (local ergonomics).

### Example

```bash
curl -s -X POST http://127.0.0.1:8000/infer \
  -F "image=@captura.jpg" \
  -F "lat=-23.55" \
  -F "lon=-46.63" \
  -F "captured_at=2026-07-20T12:00:00.000Z"
```

With a key configured:

```bash
curl -s -X POST http://127.0.0.1:8000/infer \
  -H "Authorization: Bearer $INFERENCE_API_KEY" \
  -F "image=@captura.jpg" \
  -F "lat=-23.55" \
  -F "lon=-46.63" \
  -F "captured_at=2026-07-20T12:00:00.000Z"
```

## DNIT validation (ordinal-aware)

Provisional fixtures synthesize stand-in images from cobertura (no multi-GB DNIT
imagery in-repo). Report ordinal MAE + accuracy:

```bash
uv run python scripts/evaluate_dnit.py
```

Writes `data/eval_metrics.json` (shape for web `EVAL_METRICS_JSON`).

## Deploy (Render Free)

See [`docs/DEPLOY.md`](../../docs/DEPLOY.md). Dockerfile in this directory;
repo-root [`render.yaml`](../../render.yaml) for Git-connected Blueprint deploy.

## Datasets & labels (ADR-0002)

Public-dataset roles, licenses, cobertura → classe thresholds, and fixtures:

- Docs: [`data/README.md`](./data/README.md)
- Thresholds: `data/thresholds.json` (calibrated on DNIT validation fixtures)
- Prepare layout: `uv run python scripts/prepare_datasets.py`

## VLM prototype (Gemma 4)

Importable classifier in `verdia_ml.vlm` (not wired into `/infer` yet). Needs
`GOOGLE_API_KEY` for live Google AI Studio calls; optional `VLM_MODEL`,
`VLM_BASE_URL`. Offline: omit the key or set `VLM_FAKE=1`.

```bash
# Fake / CI-safe
VLM_FAKE=1 uv run python -m verdia_ml.classify path/to/photos --summary

# Live (model default: gemma-4-26b-a4b-it)
export GOOGLE_API_KEY=...
uv run python -m verdia_ml.classify path/to/photos
```

## Tests

```bash
uv run pytest
```
