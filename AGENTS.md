## Project notes

- Domain glossary: `CONTEXT.md`
- Deploy: `docs/DEPLOY.md`
- PR CI gate: `.github/workflows/ci.yml`

## Learned User Preferences

- Use Conventional Commits for all git commits.

## Cursor Cloud specific instructions

Monorepo with two services (standard run/test commands live in `README.md`):

- `services/ai` — Python VLM prototype (`uv`, Python 3.12). Classify with `uv run python -m verdia_ai.classify …` (fake: `VLM_FAKE=1`); test with `uv run pytest`. Hosted Nova captura calls Google AI Studio (`GOOGLE_API_KEY` on the web app). Local `python -m verdia_ai serve` is optional. `uv` installs to `~/.local/bin`.
- `apps/web` — Next.js + TypeScript (Node 22, `npm`). Run `npm run dev` (`:3000`); `npm test` / `npm run lint` / `npm run typecheck`. Copy `.env.example` → `.env.local` (needs `DEMO_PASSWORD`, default `verdia-demo`). This is a newer Next.js with breaking changes. See `apps/web/AGENTS.md`.

Non-obvious gotchas:

- Default persistence is in-memory. In Next.js dev the in-memory store is NOT shared between route handlers (`/api/*`, where ingestion writes) and React Server Components (dashboard/map/detail, which read), so ingested capturas do NOT appear in the UI without Supabase. `GET /api/capturas` still shows them. To see data in the UI, configure Supabase.
- Local Supabase (optional, for full UI): `supabase start` (needs Docker) applies `supabase/migrations/` and creates the `capturas` bucket, then set `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in `apps/web/.env.local` and restart `npm run dev`. `supabase init` (creates `supabase/config.toml`) is required once if not already present.
- Supabase local grant quirk: after `supabase start`, `service_role` lacks DML grants on the `public` tables (migrations don't grant), so ingestion fails with `permission denied for table trechos`. Fix by granting `select, insert, update, delete` on all public tables/sequences to `anon, authenticated, service_role` (via `docker exec supabase_db_<project> psql -U postgres`).
- Docker (needed only for Supabase) is configured for `fuse-overlayfs` with the containerd-snapshotter feature disabled. Start it with `sudo dockerd` (in a background/tmux session) and `sudo chmod 666 /var/run/docker.sock` for non-root access.
