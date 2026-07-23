## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues (via `gh`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default triage vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout (`CONTEXT.md` + `docs/adr/` at repo root). See `docs/agents/domain.md`.

### CI

PR mechanical + anti-slop gate. See `docs/agents/ci.md` and ADR-0007.

## Learned User Preferences

- Use Conventional Commits for all git commits.

## Cursor Cloud specific instructions

Monorepo with two services (standard run/test commands live in `README.md`):

- `services/ml` — Python FastAPI Inference API (`uv`, Python 3.12). Run with `uv run python -m verdia_ml` (serves on `:8000`, health at `/health`); test with `uv run pytest`. `uv` installs to `~/.local/bin`.
- `apps/web` — Next.js + TypeScript (Node 22, `npm`). Run `npm run dev` (`:3000`); `npm test` / `npm run lint` / `npm run typecheck`. Copy `.env.example` → `.env.local` (needs `DEMO_PASSWORD`, default `verdia-demo`). This is a newer Next.js with breaking changes — see `apps/web/AGENTS.md`.
- `npm run simulate-ingest` (from `apps/web`, with env sourced) exercises the core flow end-to-end: login → ML inference → BFF persist. Needs both services running.

Non-obvious gotchas:

- Default persistence is in-memory. In Next.js dev the in-memory store is NOT shared between route handlers (`/api/*`, where ingestion writes) and React Server Components (dashboard/map/detail, which read), so ingested capturas do NOT appear in the UI without Supabase. `GET /api/capturas` still shows them. To see data in the UI, configure Supabase.
- Local Supabase (optional, for full UI demo): `supabase start` (needs Docker) applies `supabase/migrations/` and creates the `capturas` bucket, then set `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in `apps/web/.env.local` and restart `npm run dev`. `supabase init` (creates `supabase/config.toml`) is required once if not already present.
- Supabase local grant quirk: after `supabase start`, `service_role` lacks DML grants on the `public` tables (migrations don't grant), so ingestion fails with `permission denied for table trechos`. Fix by granting `select, insert, update, delete` on all public tables/sequences to `anon, authenticated, service_role` (via `docker exec supabase_db_<project> psql -U postgres`).
- Docker (needed only for Supabase) is configured for `fuse-overlayfs` with the containerd-snapshotter feature disabled. Start it with `sudo dockerd` (in a background/tmux session) and `sudo chmod 666 /var/run/docker.sock` for non-root access.
