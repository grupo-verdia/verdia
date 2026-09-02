# verdia AI: VLM + Inference API

Estimates roadside grass height in cm. Code maps Motiva bands to
`baixa` | `média` | `alta` (`null` when the strip is not visible or has no
grass): below 10 cm, 10-30 cm, above 30 cm.

This package is the VLM module, CLI, notebook, and optional local HTTP.
On Vercel (and typical local Nova captura), the **web app** calls Google AI
Studio with `GOOGLE_API_KEY`. Use this server only when that key is unset on
the web process.

Domain: [`CONTEXT.md`](../../CONTEXT.md). Web ingest: [`apps/web/README.md`](../../apps/web/README.md).

## Local

```bash
uv sync
```

Needs `GOOGLE_API_KEY` for live Google AI Studio calls; optional `VLM_MODEL`,
`VLM_BASE_URL`. Offline stub: `VLM_FAKE=1` or `--fake`.

### Inference HTTP (optional local)

```bash
# Fake / CI-safe (no Google key)
VLM_FAKE=1 uv run python -m verdia_ai serve

# Live
export GOOGLE_API_KEY=...
uv run python -m verdia_ai serve
```

Listens on `http://127.0.0.1:8000`. Health: `GET /health`. Classify:
`POST /v1/classify` with `{ image_base64, content_type, filename? }`.

In `apps/web/.env.local` set:

```bash
VLM_INFERENCE_URL=http://127.0.0.1:8000
```

Do not set `VLM_INFERENCE_URL` on Vercel.

### CLI folder classify

```bash
VLM_FAKE=1 uv run python -m verdia_ai.classify path/to/photos --summary
export GOOGLE_API_KEY=...
uv run python -m verdia_ai.classify path/to/photos
```

### Notebook

```bash
uv sync --group dev
uv run jupyter notebook notebooks/demo_vlm_grass.ipynb
```

In Cursor, pick kernel **Python (verdia-ai)** (`services/ai/.venv`).

## Tests

```bash
uv run pytest
```
