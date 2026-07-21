# Sample capturas for the simulador de ingestão

Minimal geotagged PNGs (64×64 smoke images) that replay a short São Paulo-shaped
route into the Inference API. Files must be Pillow-decodable (the Inference API
loads pixels with `image.load()`). Swap in real roadside frames by editing
`manifest.json` and adding image files.

| id | GPS (approx) | timestamp (UTC) |
|----|--------------|-----------------|
| `sp-01` | -23.5505, -46.6333 | 2026-07-20T12:00:00Z |
| `sp-02` | -23.5512, -46.6341 | 2026-07-20T12:01:00Z |
| `sp-03` | -23.5520, -46.6350 | 2026-07-20T12:02:00Z |

Run from `apps/web` (with ML on `:8000` and web on `:3000`):

```bash
npm run simulate-ingest
```

See the [web README](../../README.md#simulador-de-ingestão) for env vars and the full local demo loop.
