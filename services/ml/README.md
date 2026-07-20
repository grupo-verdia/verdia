# verdia Inference API

Python service for segmentação + classificador ordinal. Always-on HTTP API;
CPU inference is enough for the demo.

## Local

```bash
uv sync
uv run python -m verdia_ml
```

- Health: `GET /health` → `{"status":"ok"}` (always public)
- Infer: `POST /infer` (multipart) — fields `image`, `lat`, `lon`, `captured_at`
  → `{"classe":"baixa"|"média"|"alta","confidence":0.0–1.0,"model_version":"...","overlay_png_base64":"..."}`
- `overlay_png_base64` is the segmentação visualization (stub PNG today); classe remains the ordinal field
- Current baseline is a deterministic stub (`stub-0.1`); real CV lands in #12
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

## Deploy (Render Free)

See [`docs/DEPLOY.md`](../../docs/DEPLOY.md). Dockerfile in this directory;
repo-root [`render.yaml`](../../render.yaml) for Git-connected Blueprint deploy.

## Datasets & labels (ADR-0002)

Public-dataset roles, licenses, cobertura → classe thresholds, and fixtures:

- Docs: [`data/README.md`](./data/README.md)
- Thresholds: `data/thresholds.json` (calibrated on DNIT validation fixtures)
- Prepare layout: `uv run python scripts/prepare_datasets.py`

## Tests

```bash
uv run pytest
```
