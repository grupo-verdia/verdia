# CI (agent double-check)

PR checks are defined in ADR-0007 and `.github/workflows/ci.yml`.

**Branch protection:** require the aggregate job named `CI` (not the
path-filtered `Web` / `ML` jobs — those skip when their tree is untouched).

**Bugbot:** optional and manual — mention it on the PR yourself when you want a
review. Prefer after CI is green. Not required to merge.
