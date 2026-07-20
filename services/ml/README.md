# verdia Inference API

Python service for segmentação + classificador ordinal. Always-on HTTP API;
CPU inference is enough for the demo.

## Local

```bash
uv sync
uv run python -m verdia_ml
```

- Health: `GET /health` → `{"status":"ok"}`
- Default bind: `0.0.0.0:8000`

## Tests

```bash
uv run pytest
```
