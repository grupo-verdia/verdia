# CI (agent double-check)

PR checks are defined in ADR-0007 and `.github/workflows/ci.yml`.

**Branch protection:** require the aggregate job named `CI` (not the
path-filtered `Web` / `ML` jobs — those skip when their tree is untouched).

**Bugbot:** set the repo to run Bugbot only when mentioned. CI posts `bugbot run`
after green checks on ready (non-draft) PRs. Bugbot is informational, not required
to merge.
