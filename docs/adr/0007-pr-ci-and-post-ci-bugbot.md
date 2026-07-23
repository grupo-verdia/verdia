# ADR-0007: PR CI gate (mechanical + anti-slop)

Status: Accepted
Date: 2026-07-21

## Context

Agent edits need a merge-blocking double-check for correctness and common AI
slop, without relying on LLM taste inside CI. Bugbot may still be used by
humans on PRs, but it is not part of the automated gate.

## Decision

Run **GitHub Actions on pull requests only**, path-filtered across the monorepo:

- **`apps/web`:** ESLint (anti-slop pack) · `tsc` · Vitest · file size ≤ 400 lines
  via `scripts/ci/check-file-size.mjs` (tests excluded). Function size enforced via
  ESLint at **150** lines for v1 (current baseline ~133; ratchet toward 50 later).
- **`services/ml`:** Ruff check + format · pytest · file size ≤ 500 · function
  size ≤ 60 (tests excluded). No mypy in v1.

Anti-slop on web includes: no inline `require()` / unjustified `import()`,
`no-explicit-any`, justified `eslint-disable` only, exhaustive `switch`, function
size caps (file size is the shared script above).

Require the aggregate **`CI`** job for branch protection (not the
path-skipped package jobs).

**Bugbot is manual:** humans mention it on the PR when they want a review. CI
does not trigger Bugbot. Bugbot is not a required check.

## Consequences

- Branch protection should require the job named **`CI`**.
- Function-line ratchet on web is intentional debt, recorded here.
- Prefer running Bugbot after CI is green so it does not nags about issues the
  mechanical gate already covers.
