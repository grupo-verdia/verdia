# verdia AI: VLM + Inference API

Hosted Gemma VLM estimates roadside grass height; code maps Motiva cm bands to
`baixa` | `média` | `alta` (or `null` when height is N/A). Module + CLI + notebook
+ optional local HTTP API. On Vercel, Nova captura calls Google AI Studio with
`GOOGLE_API_KEY` on the web app.

## Local

```bash
uv sync
```

Needs `GOOGLE_API_KEY` for live Google AI Studio calls; optional `VLM_MODEL`,
`VLM_BASE_URL`. Offline stub: `VLM_FAKE=1` or `--fake`.

### Inference HTTP (optional local)

The web app classifies with `GOOGLE_API_KEY` when set. Use this server only if
that key is **unset** on the web process:

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
