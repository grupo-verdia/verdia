# Vercel Nova captura → Google (2026-09-02)

Live demo classifies on Vercel by calling Google AI Studio from the web ingest
route. No Python host.

- Set `GOOGLE_API_KEY` on Vercel (same key as local `services/ai`).
- Optional: same key in `apps/web/.env.local` for local `npm run dev`.
- `VLM_INFERENCE_URL` remains for the local Python server; ignored when the
  Google key is set.
- Ingest `maxDuration` is 60s. Vercel Hobby may still cap lower.
