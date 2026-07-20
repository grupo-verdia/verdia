# ADR-0004: Fully live deployment

Status: Accepted
Date: 2026-07-20

## Context

The demo is a pitch to Motiva. We want a shareable, always-working experience rather
than a fragile local-only run.

## Decision

Deploy **everything live**:

- **Web** on **Vercel**.
- **Data** on **Supabase** (hosted).
- **ML inference service** on **Render** (Free web service: Docker, sleeps after idle;
  cold starts accepted for this demo). CPU inference is sufficient for demo volume —
  no GPU.
- **Inference API auth:** live `POST /infer` is gated by a **shared secret** (header/token).
  `GET /health` stays public for host health checks. Deploy is **prepare-in-repo**; humans
  create Vercel / Supabase / Render projects and set secrets (agent does not flip switches).
- **Live E2E:** local **simulador de ingestão** pointed at live Render + Vercel/Supabase
  (presenters only need the dashboard URL).
- **Public URLs:** provider defaults (no custom domain).
- **Redeploy:** Git-connected auto-deploy on Vercel + Render; runbook in `docs/DEPLOY.md`.

See `docs/research/2026-07-20-hobby-ml-host-free-tiers.md` for the free-tier comparison
that led to Render over Railway (post-trial Free plan too weak) and Fly.io (trial only).

## Consequences

- A live link works even during a networked presentation; the ML service is deployed
  and reachable (may cold-start after idle).
- Cost stays at $0 on Render Free for typical demo traffic; 750 Free instance hours/mo
  and sleep-after-idle are acceptable constraints.
- Casual abuse of free ML compute is blocked by the shared secret; callers (simulador)
  must send the token.
- Alternative considered: precomputing predictions into Supabase so the site works even
  if the ML service is offline. Not chosen (we opted for fully live), but remains a
  low-effort fallback for presentation robustness.
- Alternatives considered for the ML host: Railway Hobby (~$5/mo, better DX), Cloud Run
  Always Free (more GCP ops), Fly.io (not free forever).
- Alternative considered for ML auth: leave `/infer` open on a public URL. Rejected for
  free-tier abuse risk on an academic demo.
