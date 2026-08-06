# verdia AI — VLM prototype

Hosted Gemma VLM classifier for roadside grass photos (`baixa` | `média` | `alta`).
Importable module + CLI + notebook. **HTTP Inference API is deferred.**

## Local

```bash
uv sync
```

Needs `GOOGLE_API_KEY` for live Google AI Studio calls; optional `VLM_MODEL`,
`VLM_BASE_URL`. Offline: omit the key or set `VLM_FAKE=1`.

```bash
# Fake / CI-safe
VLM_FAKE=1 uv run python -m verdia_ai.classify path/to/photos --summary

# Live (model default: gemma-4-26b-a4b-it)
export GOOGLE_API_KEY=...
uv run python -m verdia_ai.classify path/to/photos

# Notebook demo (loads services/ai/.env; fake if key missing)
uv sync --group dev
uv run jupyter notebook notebooks/demo_vlm_grass.ipynb
```

## Tests

```bash
uv run pytest
```
