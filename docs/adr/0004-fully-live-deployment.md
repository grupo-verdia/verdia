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
- **ML inference service** on a **hobby CPU container** (Render / Fly.io / Railway;
  exact provider chosen at implementation time). CPU inference is sufficient for demo
  volume — no GPU.

## Consequences

- A live link works even during a networked presentation; the ML service is always
  reachable.
- Cost stays low with hobby/free tiers; pick a provider with cheap always-on or
  scale-to-zero behavior at implementation time.
- Alternative considered: precomputing predictions into Supabase so the site works even
  if the ML service is offline. Not chosen (we opted for fully live), but remains a
  low-effort fallback for presentation robustness.
