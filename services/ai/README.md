# verdia AI: VLM prototype

Hosted Gemma VLM estimates roadside grass height; code maps Motiva cm bands to
`baixa` | `média` | `alta` (or `null` when height is N/A). Module + CLI + notebook.
HTTP Inference API is deferred.

## Local

```bash
uv sync
```

Needs `GOOGLE_API_KEY` for live Google AI Studio calls; optional `VLM_MODEL`,
`VLM_BASE_URL`. Offline stub: `VLM_FAKE=1` or `--fake`.

```bash
# Fake / CI-safe
VLM_FAKE=1 uv run python -m verdia_ai.classify path/to/photos --summary

# Live (default model: gemma-4-26b-a4b-it)
export GOOGLE_API_KEY=...
uv run python -m verdia_ai.classify path/to/photos

# Notebook (loads .env; VLM_FAKE=1 for stub)
uv sync --group dev
uv run jupyter notebook notebooks/demo_vlm_grass.ipynb
```

In Cursor, pick kernel **Python (verdia-ai)** (`services/ai/.venv`).

## Tests

```bash
uv run pytest
```
