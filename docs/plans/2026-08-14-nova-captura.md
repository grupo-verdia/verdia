# Nova captura (2026-08-14)

Browser multi-select geotagged upload as the photo ingest path.

## Flow

1. **Nova captura** tab → select images (optional rodovia / KM / sentido / lat·lon manual).
2. Client reads EXIF GPS when present; otherwise uses manual latitude/longitude.
3. `POST /api/capturas/ingest` classifies via Inference HTTP (or stub) and persists.
4. UI keeps the image on screen and shows a report: AI phrase, classe, and priority.
5. Dashboard KPIs, ocorrências, mapa e rodovias refresh from the same store (`verdia:data-refresh`).

## AI

- `services/ai`: `uv run python -m verdia_ai serve` → `POST /v1/classify`.
- Web: `VLM_INFERENCE_URL=http://127.0.0.1:8000` in `.env.local`.
- Unset URL → local filename stub. HTTP failure → captura still saved with `inferenceError`.
- Live VLM needs `GOOGLE_API_KEY`; offline: `VLM_FAKE=1` on the AI process.
