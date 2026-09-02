# Nova captura (2026-08-14)

Browser multi-select geotagged upload as the photo ingest path.

## Flow

1. **Nova captura** tab → select images (optional rodovia / KM / sentido / lat·lon manual).
2. Client reads EXIF GPS when present; otherwise uses manual latitude/longitude.
3. `POST /api/capturas/ingest` classifies via Google (`GOOGLE_API_KEY`), else
   Inference HTTP, else stub, then persists.
4. UI keeps the image on screen and shows a report: AI phrase, classe, and priority.
5. Dashboard KPIs, ocorrências, mapa e rodovias refresh from the same store (`verdia:data-refresh`).

## AI

- **Vercel / local web:** `GOOGLE_API_KEY` → Google AI Studio from the ingest route.
- **Local Python (optional):** `uv run python -m verdia_ai serve` → `POST /v1/classify`,
  with `VLM_INFERENCE_URL=http://127.0.0.1:8000` and no Google key on the web process.
- Unset both → filename stub. Live-call failure → captura still saved with `inferenceError`.
- Python CLI/notebook: `GOOGLE_API_KEY`; offline `VLM_FAKE=1`.
