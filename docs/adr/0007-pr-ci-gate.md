# ADR-0007: PR CI gate (mechanical + anti-slop)

Status: Accepted
Date: 2026-07-21

## Context

PRs need a merge-blocking check for correctness and common AI-generated slop,
without relying on LLM taste inside CI.

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

**Function-size counting is intentionally not identical across stacks:** web ESLint
`max-lines-per-function` skips blank lines and comments; the ML checker
(`scripts/ci/check_python_function_size.py`) uses raw AST `lineno`/`end_lineno`
spans (blanks, comments, and docstrings inside the function count). Do not expect
parity when comparing a TS function to a Python one.

Require the aggregate **`CI`** job for branch protection (not the
path-skipped package jobs).

## Consequences

- Branch protection should require the job named **`CI`**.
- Function-line ratchet on web is intentional debt, recorded here.
