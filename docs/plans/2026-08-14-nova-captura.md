# Nova captura (2026-08-14)

Browser multi-select geotagged upload as the photo ingest path.

## Flow

1. **Nova captura** tab → select images (optional rodovia / KM / sentido).
2. Client reads EXIF GPS; files without valid lat/lon are rejected.
3. `POST /api/capturas/ingest` classifies (stub mirroring `services/ai` fake heuristics) and persists via the captura store.
4. Dashboard KPIs, ocorrências, mapa e rodovias refresh from the same store (`verdia:data-refresh`).

## AI

- Stub until Inference HTTP lands. Reserved env: `VLM_INFERENCE_URL`.
- Filename hints (`alta` / `media` / `baixa` / `na`) drive Motiva height bands in stub mode.
