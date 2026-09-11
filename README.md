# verdia

Also in [Portuguese](./README.pt-BR.md).

Motiva still judges roadside grass by eye ("olhômetro"). verdia takes a geotagged photo, estimates how tall the grass is, and says what to mow first.

[Motiva](https://www.motiva.com.br/) (formerly Grupo CCR) runs highway, rail, and airport concessions. This product is only the vegetation on the highway margin. Height class sets how urgent a stretch is. That order is what planning uses.

## What it does

You send photos from the browser, or you import an Excel sheet. Each photo needs GPS, from the file or typed in. No GPS, it is not a captura. Each captura stands for 500 m of roadside, the same length Motiva uses when someone does this by hand.

A vision model estimates height in centimeters. Code maps that onto Motiva's bands:

- below 10 cm: baixa
- 10-30 cm: média
- above 30 cm: alta

If the strip is missing from the photo, or there is no grass, classe stays empty after classification. While the photo is still waiting, classe is also empty. When the model is unsure, it still estimates height, with lower confidence. Maintenance priority follows classe. alta goes first. Empty classe after classification counts as baixa. A failed classify does not enter Planejamento.

If classification fails, the captura is still saved, with the error on it.

From there the operator can look at capturas, pin them on a map, group them by rodovia, fix a wrong class, and work a queue ordered by urgency, then highway, then km.

The UI is Portuguese.

- Visão geral shows capturas and what to mow first, including how many are still waiting.
- Nova captura is the browser upload. Photos are saved first, then classified. Close the tab: photos stay. Continue on Nova captura.
- The map shows a pin for each captura, colored by classe.
- Rodovias groups by highway, imports and exports Excel, and lets you correct a class.
- Planejamento is the mowing queue. It skips photos still waiting or whose classify failed.
- Observabilidade tracks confidence, the queue, failures, and corrections.

Video synced to GPS, drift detection, route optimization, and real user accounts are out. One shared password gets you in.

Product words (captura, trecho, classe, severidade, rodovia) are in [`CONTEXT.md`](./CONTEXT.md).

The operator app is `apps/web`. It is the same website on phones. Below ~700px, navigation is a bottom bar, not a separate app. The classifier is `services/ai`.

## Run locally

You need Node.js 22+, npm, Python 3.12+, [uv](https://docs.astral.sh/uv/), and a Supabase project. Cloud or `supabase start` both work. The web app will not start without `SUPABASE_URL` and `SUPABASE_SECRET_KEY`.

### Web

```bash
cd apps/web
cp .env.example .env.local
npm install
npm run dev
```

Put `DEMO_PASSWORD`, `SUPABASE_URL`, and `SUPABASE_SECRET_KEY` in `.env.local`. Apply the SQL in `supabase/migrations/` first, in timestamp order.

Open [http://localhost:3000](http://localhost:3000). You land on `/login`. The password in `DEMO_PASSWORD` lets you in.

### Classifier

For live Nova captura, put `GOOGLE_API_KEY` in `apps/web/.env.local`. Same key as `services/ai/.env` (copy from `services/ai/.env.example`). Hosted Nova captura on Vercel uses that key too. Do not set `VLM_INFERENCE_URL` on Vercel.

To classify with the local Python server instead, leave `GOOGLE_API_KEY` off the web process and point at it:

```bash
cd services/ai
uv sync
VLM_FAKE=1 uv run python -m verdia_ai serve
```

In `apps/web/.env.local`:

```bash
VLM_INFERENCE_URL=http://127.0.0.1:8000
```

`VLM_FAKE=1` is the stub. Drop it and export `GOOGLE_API_KEY` when you want a real call. Details: [`services/ai/README.md`](./services/ai/README.md).

Folder classify without the HTTP server:

```bash
cd services/ai
VLM_FAKE=1 uv run python -m verdia_ai.classify path/to/photos --summary
```



### Tests

```bash
cd apps/web
npm test
npm run lint
npm run typecheck

cd services/ai
uv run pytest
```

Web tests fake the database. The running app does not.

## Deploy

Web on Vercel, data on hosted Supabase. Nova captura on Vercel classifies with `GOOGLE_API_KEY`.
