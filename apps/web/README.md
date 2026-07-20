# verdia web (`apps/web`)

Next.js (TypeScript) product surface: dashboard, map, planning, observability
(later tickets), gated by a single shared password.

## Local

```bash
cp .env.example .env.local   # set DEMO_PASSWORD
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm test
npm run typecheck
```

See the [repo README](../../README.md) for running the ML service alongside this app.
